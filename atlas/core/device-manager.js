/**
 * ATLAS Device Manager
 * Handles MIDI device discovery, connection, and communication
 */

let midi = null;
let midiLoadError = null;
try {
    // Optional dependency (native). If unavailable, ATLAS can still boot (UI + DB),
    // but device discovery/IO will be disabled.
    midi = require('midi');
} catch (err) {
    midiLoadError = err;
    midi = null;
}

class DeviceManager {
    constructor() {
        this.available = Boolean(midi);
        this.input = this.available ? new midi.Input() : null;
        this.output = this.available ? new midi.Output() : null;
        this.devices = [];
        this.connectedDevices = new Map();
        // deviceId -> Set<handler(deltaTime, message[])>
        this.messageHandlers = new Map();
    }
    
    /**
     * Discover all MIDI devices
     */
    discoverDevices() {
        try {
            if (!this.available) {
                return {
                    success: false,
                    error: `MIDI backend not available. Install the native 'midi' module to enable device discovery. (${midiLoadError?.message || 'missing module'})`,
                    devices: []
                };
            }

            const devices = [];
            
            // Get input ports
            const inputCount = this.input.getPortCount();
            for (let i = 0; i < inputCount; i++) {
                const name = this.input.getPortName(i);
                devices.push({
                    id: `input-${i}`,
                    name: name,
                    type: 'input',
                    portIndex: i,
                    manufacturer: this.guessManufacturer(name),
                    model: this.guessModel(name)
                });
            }
            
            // Get output ports
            const outputCount = this.output.getPortCount();
            for (let i = 0; i < outputCount; i++) {
                const name = this.output.getPortName(i);
                devices.push({
                    id: `output-${i}`,
                    name: name,
                    type: 'output',
                    portIndex: i,
                    manufacturer: this.guessManufacturer(name),
                    model: this.guessModel(name)
                });
            }
            
            this.devices = devices;
            
            console.log(`🎹 Found ${devices.length} MIDI devices`);
            devices.forEach(d => console.log(`   - ${d.name} (${d.type})`));
            
            return { success: true, devices };
        } catch (error) {
            console.error('❌ Device discovery error:', error);
            return { success: false, error: error.message, devices: [] };
        }
    }
    
    /**
     * Guess manufacturer from device name
     */
    guessManufacturer(name) {
        const n = String(name || '');
        const upper = n.toUpperCase();

        // iConnectivity interfaces (iConnectMIDI)
        if (
            upper.includes('ICONNECT') ||
            upper.includes('ICONNECTMIDI') ||
            upper.includes('I CONNECT') ||
            upper.includes('I-CONNECT')
        ) {
            return 'iConnectivity';
        }

        // Universal Audio (Volt / Apollo / UAD)
        if (
            upper.includes('UNIVERSAL AUDIO') ||
            upper.includes('UNIVERSALAUDIO') ||
            upper.includes(' UAD') ||
            upper.includes('UAD ') ||
            upper.includes('APOLLO') ||
            upper.includes('VOLT')
        ) {
            return 'Universal Audio';
        }

        // Device-family heuristics (names often omit manufacturer, e.g. "JUNO-X")
        if (
            upper.includes('JUNO') ||
            upper.includes('FANTOM') ||
            upper.includes('JUPITER') ||
            upper.includes('TR-') ||
            upper.includes('MC-') ||
            upper.includes('SP-') ||
            upper.includes('RD-') ||
            upper.includes('AIRA') ||
            upper.includes('ROLAND')
        ) {
            return 'Roland';
        }
        if (upper.includes('KORG') || upper.includes('MINILOGUE') || upper.includes('PROLOGUE') || upper.includes('WAVESTATION') || upper.includes('POLYSIX')) {
            return 'Korg';
        }
        if (upper.includes('MOOG') || upper.includes('SUB') && upper.includes('PHATTY')) {
            return 'Moog';
        }
        if (upper.includes('NOVATION') || upper.includes('BASS STATION') || upper.includes('PEAK') || upper.includes('SUMMIT') || upper.includes('LAUNCHKEY')) {
            return 'Novation';
        }
        if (upper.includes('ARTURIA') || upper.includes('KEYLAB') || upper.includes('MINILAB') || upper.includes('MICROFREAK') || upper.includes('MINIFREAK')) {
            return 'Arturia';
        }
        if (upper.includes('BEHRINGER') || upper.includes('DEEPMIND') || upper.includes('NEUTRON') || upper.includes('MODEL D')) {
            return 'Behringer';
        }
        if (upper.includes('YAMAHA') || upper.includes('MONTAGE') || upper.includes('MODX') || upper.includes('DX')) {
            return 'Yamaha';
        }

        // Kurzweil
        if (
            upper.includes('KURZWEIL') ||
            upper.includes('K2000') ||
            upper.includes('K2500') ||
            upper.includes('K2600') ||
            upper.includes('PC3') ||
            upper.includes('FORTE')
        ) {
            return 'Kurzweil';
        }

        const manufacturers = {
            'Prophet': 'Sequential',
            'Moog': 'Moog',
            'Korg': 'Korg',
            'Roland': 'Roland',
            'Novation': 'Novation',
            'Arturia': 'Arturia',
            'Behringer': 'Behringer',
            'Yamaha': 'Yamaha',
            'Nord': 'Nord',
            'Dave Smith': 'Sequential'
        };
        
        for (const [key, value] of Object.entries(manufacturers)) {
            if (n.includes(key)) {
                return value;
            }
        }
        
        return 'Unknown';
    }
    
    /**
     * Guess model from device name
     */
    guessModel(name) {
        // Extract model name (simplified)
        const match = name.match(/([A-Z][a-z]+\s*\d+|[A-Z][a-z]+\s+[A-Z][a-z]+)/);
        return match ? match[0] : name;
    }
    
    /**
     * Open device for communication
     */
    openDevice(deviceId, type = 'output') {
        try {
            if (!this.available) {
                return {
                    success: false,
                    error: `MIDI backend not available. Install the native 'midi' module to open devices. (${midiLoadError?.message || 'missing module'})`
                };
            }

            // Idempotent open: don't replace an existing open port (prevents leaks when monitoring inputs + connecting devices).
            if (this.connectedDevices.has(deviceId)) {
                const existing = this.connectedDevices.get(deviceId);
                return { success: true, device: existing.device };
            }

            const device = this.devices.find(d => d.id === deviceId);
            
            if (!device) {
                return { success: false, error: 'Device not found' };
            }
            
            if (type === 'input') {
                const input = new midi.Input();
                input.openPort(device.portIndex);
                
                // Set up message handler
                input.on('message', (deltaTime, message) => {
                    this.handleMessage(deviceId, deltaTime, message);
                });
                
                this.connectedDevices.set(deviceId, {
                    device,
                    connection: input,
                    type: 'input'
                });
                
                console.log(`✅ Opened input device: ${device.name}`);
            } else {
                const output = new midi.Output();
                output.openPort(device.portIndex);
                
                this.connectedDevices.set(deviceId, {
                    device,
                    connection: output,
                    type: 'output'
                });
                
                console.log(`✅ Opened output device: ${device.name}`);
            }
            
            return { success: true, device };
        } catch (error) {
            console.error('❌ Open device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Close device
     */
    closeDevice(deviceId) {
        try {
            if (!this.available) {
                return {
                    success: false,
                    error: `MIDI backend not available. (${midiLoadError?.message || 'missing module'})`
                };
            }

            const connected = this.connectedDevices.get(deviceId);
            
            if (!connected) {
                return { success: false, error: 'Device not connected' };
            }
            
            connected.connection.closePort();
            this.connectedDevices.delete(deviceId);
            this.messageHandlers.delete(deviceId);
            
            console.log(`✅ Closed device: ${connected.device.name}`);
            
            return { success: true };
        } catch (error) {
            console.error('❌ Close device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send MIDI message
     */
    sendMessage(deviceId, message) {
        try {
            if (!this.available) {
                return {
                    success: false,
                    error: `MIDI backend not available. Install the native 'midi' module to send messages. (${midiLoadError?.message || 'missing module'})`
                };
            }

            const connected = this.connectedDevices.get(deviceId);
            
            if (!connected) {
                return { success: false, error: 'Device not connected' };
            }
            
            if (connected.type !== 'output') {
                return { success: false, error: 'Device is not an output' };
            }
            
            connected.connection.sendMessage(message);
            
            return { success: true };
        } catch (error) {
            console.error('❌ Send message error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Register message handler for device
     */
    onMessage(deviceId, handler) {
        if (!handler) return;
        if (!this.messageHandlers.has(deviceId)) this.messageHandlers.set(deviceId, new Set());
        this.messageHandlers.get(deviceId).add(handler);
    }

    /**
     * Remove a previously registered message handler
     */
    offMessage(deviceId, handler) {
        try {
            const set = this.messageHandlers.get(deviceId);
            if (!set) return;
            set.delete(handler);
            if (set.size === 0) this.messageHandlers.delete(deviceId);
        } catch {
            // ignore
        }
    }
    
    /**
     * Handle incoming MIDI message
     */
    handleMessage(deviceId, deltaTime, message) {
        const handlers = this.messageHandlers.get(deviceId);
        if (handlers && handlers.size) {
            for (const h of handlers) {
                try { h(deltaTime, message); } catch { /* ignore */ }
            }
        }
        
        // Check if it's a SysEx message
        if (message[0] === 0xF0) {
            console.log(`🎹 Received SysEx from ${deviceId}: ${message.length} bytes`);
        }
    }
    
    /**
     * Get connected devices
     */
    getConnectedDevices() {
        return Array.from(this.connectedDevices.values()).map(c => c.device);
    }
    
    /**
     * Check if device is connected
     */
    isConnected(deviceId) {
        return this.connectedDevices.has(deviceId);
    }
    
    /**
     * Get device info
     */
    getDeviceInfo(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        
        if (!device) {
            return { success: false, error: 'Device not found' };
        }
        
        const connected = this.connectedDevices.has(deviceId);
        
        return {
            success: true,
            device: {
                ...device,
                connected
            }
        };
    }
    
    /**
     * Close all connections
     */
    closeAll() {
        if (!this.available) {
            console.log('ℹ️  MIDI backend not available; no connections to close.');
            return;
        }

        for (const deviceId of this.connectedDevices.keys()) {
            this.closeDevice(deviceId);
        }
        
        console.log('✅ All MIDI connections closed');
    }
}

module.exports = DeviceManager;
