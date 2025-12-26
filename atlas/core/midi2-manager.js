/**
 * ATLAS MIDI 2.0 Manager (Stub)
 *
 * Real MIDI 2.0 support requires a UMP-capable backend (OS API bridge).
 * On macOS, that typically means a native bridge to CoreMIDI's UMP endpoints.
 *
 * This stub exists so the rest of ATLAS can be "MIDI 2.0 ready" without
 * pretending MIDI 2.0 is available when it isn't.
 */
class MIDI2Manager {
    constructor() {
        // Prefer macOS probe backend when available (macOS-only target for now)
        if (process.platform === 'darwin') {
            try {
                // eslint-disable-next-line global-require
                const MacOSMIDI2Manager = require('./midi2/macos-midi2-manager.js');
                const impl = new MacOSMIDI2Manager();
                return impl;
            } catch {
                // fallthrough to stub
            }
        }

        this.available = false;
        this.reason = 'MIDI 2.0 backend not installed (UMP transport unavailable)';
    }

    async initialize() {
        return { success: false, error: this.reason };
    }

    async discoverDevices() {
        return { success: false, error: this.reason, devices: [] };
    }

    async openDevice(deviceId, type = 'output') {
        return { success: false, error: this.reason, deviceId, type };
    }

    async closeDevice(deviceId, type = 'output') {
        return { success: false, error: this.reason, deviceId, type };
    }

    onMessage(deviceId, handler) {
        return { success: false, error: this.reason, deviceId };
    }

    sendMessage(deviceId, message) {
        return { success: false, error: this.reason, deviceId };
    }

    async sendSysEx(deviceId, message) {
        return { success: false, error: this.reason, deviceId };
    }

    async sendPreciseValue(deviceId, param, value, options = {}) {
        return { success: false, error: this.reason, deviceId };
    }

    async getDeviceState(deviceId) {
        return { success: false, error: this.reason, deviceId };
    }

    async queryProperty(deviceId, property) {
        return { success: false, error: this.reason, deviceId, property };
    }
}

module.exports = MIDI2Manager;


