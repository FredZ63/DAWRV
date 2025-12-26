/**
 * macOS MIDI 2.0 Manager (Probe-only)
 *
 * This manager currently:
 * - Detects MIDI 2.0-capable endpoints via a small Swift/CoreMIDI probe.
 *
 * It does NOT yet:
 * - Open UMP ports
 * - Send/receive UMP packets
 * - Implement MIDI-CI / Property Exchange
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class MacOSMIDI2Manager {
    constructor() {
        this.available = process.platform === 'darwin';
        this.reason = this.available ? null : 'Not on macOS';
        this._endpoints = [];
    }

    _runProbe() {
        const probePath = path.join(__dirname, 'midi2', 'macos', 'atlas-midi2-probe.swift');
        if (!fs.existsSync(probePath)) {
            return { success: false, error: 'MIDI 2.0 probe script missing' };
        }
        const res = spawnSync('/usr/bin/swift', [probePath], { encoding: 'utf8' });
        if (res.error) return { success: false, error: res.error.message };
        if (res.status !== 0) {
            return { success: false, error: (res.stderr || '').trim() || `probe failed (${res.status})` };
        }
        try {
            const parsed = JSON.parse(res.stdout);
            return parsed;
        } catch (e) {
            return { success: false, error: `Invalid probe JSON: ${e.message}` };
        }
    }

    async initialize() {
        if (!this.available) return { success: false, error: this.reason };
        const info = this._runProbe();
        if (!info || !info.success) {
            this.reason = info?.error || 'Probe failed';
            return { success: false, error: this.reason };
        }
        this._endpoints = Array.isArray(info.endpoints) ? info.endpoints : [];

        const midi2Count = this._endpoints.filter(e => e && e.supportsMIDI2).length;
        if (midi2Count === 0) {
            this.available = false;
            this.reason = 'No MIDI 2.0 (UMP) endpoints detected by CoreMIDI';
            return { success: false, error: this.reason, endpoints: this._endpoints };
        }

        return { success: true, endpoints: this._endpoints };
    }

    async discoverDevices() {
        const endpoints = this._endpoints || [];
        const devices = endpoints.map((e, idx) => ({
            id: `midi2-${e.kind}-${e.uniqueID ?? idx}`,
            name: e.displayName || e.name || 'MIDI Endpoint',
            kind: e.kind,
            manufacturer: e.manufacturer || 'Unknown',
            model: e.model || null,
            protocol: e.supportsMIDI2 ? 'midi2' : 'midi1',
            supportsMIDI2: Boolean(e.supportsMIDI2),
            uniqueID: e.uniqueID ?? null
        }));
        return { success: true, devices, protocol: 'midi2' };
    }
}

module.exports = MacOSMIDI2Manager;


