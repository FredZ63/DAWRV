const dgram = require('dgram');
const EventEmitter = require('events');

/**
 * DAWStateService
 * Listens for REAPER OSC feedback and emits normalized DAW state updates.
 * Default port 8001 (configure in REAPER: Preferences > Control/OSC/web).
 */
class DAWStateService extends EventEmitter {
    constructor(options = {}) {
        super();
        this.port = options.port || 8001;
        this.host = options.host || '0.0.0.0';
        this.server = null;
        this.lastState = {
            transport: {
                playing: false,
                recording: false,
                loopEnabled: false,
                positionSeconds: 0,
            }
        };
    }

    start() {
        if (this.server) return;
        this.server = dgram.createSocket('udp4');
        this.server.on('message', (msg) => this._onMessage(msg));
        this.server.on('error', (err) => {
            this.emit('error', err);
        });
        this.server.bind(this.port, this.host, () => {
            this.emit('ready', { port: this.port, host: this.host });
        });
    }

    stop() {
        if (this.server) {
            try { this.server.close(); } catch {}
            this.server = null;
        }
    }

    _onMessage(buffer) {
        // Minimal OSC decoder for typical REAPER feedback paths we care about:
        // /play, /stop, /record, /repeat, /time/pos (seconds)
        try {
            const { address, args } = this._parseOSC(buffer);
            if (!address) return;

            const t = { ...this.lastState.transport };
            let changed = false;

            if (address === '/play') { t.playing = true; changed = true; }
            else if (address === '/stop') { t.playing = false; t.recording = false; changed = true; }
            else if (address === '/record') { t.recording = true; t.playing = true; changed = true; }
            else if (address === '/repeat') { // loop toggle feedback (0/1)
                if (typeof args[0] === 'number') { t.loopEnabled = args[0] !== 0; changed = true; }
            } else if (address === '/time/pos' || address === '/time' || address === '/time/str') {
                // Prefer numeric seconds if present
                const sec = typeof args[0] === 'number' ? args[0] : null;
                if (sec !== null) {
                    t.positionSeconds = sec;
                    changed = true;
                }
            }

            if (changed) {
                this.lastState.transport = t;
                this.emit('state', { transport: t, _ts: Date.now() });
            }
        } catch {
            // ignore malformed packets
        }
    }

    _parseOSC(buffer) {
        // Very small OSC parser: address (null-terminated, 4-byte padded),
        // type tag string (starts with ','), followed by arguments.
        const readPaddedString = (buf, offset) => {
            let end = offset;
            while (end < buf.length && buf[end] !== 0) end++;
            const str = buf.slice(offset, end).toString('utf8');
            // 4-byte padding
            let next = end + 1;
            while (next % 4 !== 0) next++;
            return { str, next };
        };

        let offset = 0;
        const addr = readPaddedString(buffer, offset);
        const address = addr.str;
        offset = addr.next;
        if (!address || address[0] !== '/') return {};

        const tag = readPaddedString(buffer, offset);
        let types = tag.str;
        offset = tag.next;

        const args = [];
        if (types && types[0] === ',') {
            types = types.slice(1);
            for (const t of types) {
                if (t === 'i') {
                    if (offset + 4 > buffer.length) break;
                    args.push(buffer.readInt32BE(offset));
                    offset += 4;
                } else if (t === 'f') {
                    if (offset + 4 > buffer.length) break;
                    args.push(buffer.readFloatBE(offset));
                    offset += 4;
                } else if (t === 's') {
                    const s = readPaddedString(buffer, offset);
                    args.push(s.str);
                    offset = s.next;
                } else {
                    // unsupported type, bail
                    break;
                }
            }
        }
        return { address, args };
    }
}

module.exports = DAWStateService;


