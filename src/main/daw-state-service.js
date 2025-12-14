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
        this._lastPosSec = null;
        this._lastPosTs = 0;
        this._posIdleTimer = null;
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
        if (this._posIdleTimer) {
            try { clearTimeout(this._posIdleTimer); } catch {}
            this._posIdleTimer = null;
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

            // Some OSC patterns send /play with an argument (0/1) rather than separate /stop.
            if (address === '/play') {
                if (typeof args[0] === 'number') t.playing = args[0] !== 0;
                else t.playing = true;
                changed = true;
            }
            else if (address === '/stop') {
                t.playing = false;
                t.recording = false;
                changed = true;
                if (this._posIdleTimer) {
                    try { clearTimeout(this._posIdleTimer); } catch {}
                    this._posIdleTimer = null;
                }
            }
            // Some OSC patterns send /record with an argument (0/1)
            else if (address === '/record') {
                if (typeof args[0] === 'number') t.recording = args[0] !== 0;
                else t.recording = true;
                if (t.recording) t.playing = true;
                changed = true;
            }
            // Optional: /pause (0/1) – treat pause as not playing for our purposes
            else if (address === '/pause') {
                if (typeof args[0] === 'number') {
                    const paused = args[0] !== 0;
                    if (paused) t.playing = false;
                    changed = true;
                }
            }
            else if (address === '/repeat') { // loop toggle feedback (0/1)
                if (typeof args[0] === 'number') { t.loopEnabled = args[0] !== 0; changed = true; }
            } else if (address === '/time/pos' || address === '/time' || address === '/time/str') {
                // Prefer numeric seconds if present
                const sec = typeof args[0] === 'number' ? args[0] : null;
                if (sec !== null) {
                    t.positionSeconds = sec;
                    changed = true;

                    // Heuristic: some OSC configs don't send /play consistently, but do send /time/pos
                    // while playing. If position is moving, infer playing=true.
                    const now = Date.now();
                    const last = this._lastPosSec;
                    this._lastPosSec = sec;
                    this._lastPosTs = now;

                    if (last !== null && Math.abs(sec - last) > 0.0005) {
                        if (!t.playing) {
                            t.playing = true;
                            changed = true;
                        }
                    }

                    // If we stop receiving /time/pos updates (or they stop changing), assume stopped
                    // after a short idle timeout (unless recording).
                    if (this._posIdleTimer) {
                        try { clearTimeout(this._posIdleTimer); } catch {}
                    }
                    this._posIdleTimer = setTimeout(() => {
                        try {
                            const cur = this.lastState.transport;
                            if (cur.recording) return;
                            const idleMs = Date.now() - (this._lastPosTs || 0);
                            if (idleMs >= 450 && cur.playing) {
                                this.lastState.transport = { ...cur, playing: false };
                                this.emit('state', { transport: this.lastState.transport, _ts: Date.now() });
                            }
                        } catch {
                            // ignore
                        }
                    }, 500);
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


