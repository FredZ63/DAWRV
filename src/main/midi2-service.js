/**
 * MIDI 2.0 Service
 * Handles MIDI 2.0 device communication, discovery, and control
 */

const { EventEmitter } = require('events');

class MIDI2Service extends EventEmitter {
    constructor() {
        super();
        this.devices = new Map();
        this.inputs = new Map();
        this.outputs = new Map();
        this.isInitialized = false;
        this.supported = false;
        
        // Check for MIDI 2.0 support
        this.checkSupport();
    }
    
    /**
     * Check if MIDI 2.0 is supported
     */
    checkSupport() {
        try {
            // Try to use Web MIDI API (MIDI 1.0) as fallback
            // For true MIDI 2.0, we'd need native libraries
            if (typeof navigator !== 'undefined' && navigator.requestMIDIAccess) {
                this.supported = true;
                this.midiType = 'webmidi'; // Web MIDI API (MIDI 1.0 compatible)
            } else {
                // Try to use node-midi or similar (would need to be installed)
                try {
                    // This would require: npm install midi
                    // const Midi = require('midi');
                    // this.supported = true;
                    // this.midiType = 'native';
                    this.supported = false;
                    this.midiType = 'none';
                } catch (e) {
                    this.supported = false;
                    this.midiType = 'none';
                }
            }
        } catch (e) {
            console.warn('MIDI support check failed:', e);
            this.supported = false;
            this.midiType = 'none';
        }
    }
    
    /**
     * Initialize MIDI service
     */
    async initialize() {
        if (this.isInitialized) {
            return { success: true, message: 'Already initialized' };
        }
        
        try {
            if (this.midiType === 'webmidi' && typeof navigator !== 'undefined') {
                // Web MIDI API (works in renderer, not main process)
                // For main process, we'll use a different approach
                this.isInitialized = true;
                return { success: true, message: 'Web MIDI API available (MIDI 1.0 compatible)' };
            } else {
                // For now, return a mock implementation
                // In production, this would use native MIDI 2.0 libraries
                this.isInitialized = true;
                this.supported = true; // Enable for development
                return { 
                    success: true, 
                    message: 'MIDI service initialized (development mode)',
                    note: 'Install native MIDI 2.0 library for full support'
                };
            }
        } catch (error) {
            console.error('MIDI initialization failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Discover MIDI devices
     */
    async discoverDevices() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        const devices = [];
        
        // Mock device discovery for development
        // In production, this would query actual MIDI devices
        devices.push({
            id: 'mock-device-1',
            name: 'MIDI 2.0 Controller (Mock)',
            manufacturer: 'DAWRV',
            type: 'controller',
            midi2: true,
            inputs: 1,
            outputs: 1,
            capabilities: {
                propertyExchange: true,
                perNoteControllers: true,
                highResolution: true
            }
        });
        
        // Store devices
        devices.forEach(device => {
            this.devices.set(device.id, device);
        });
        
        this.emit('devices-discovered', devices);
        return devices;
    }
    
    /**
     * Open MIDI input
     */
    async openInput(deviceId) {
        if (!this.devices.has(deviceId)) {
            throw new Error(`Device ${deviceId} not found`);
        }
        
        const device = this.devices.get(deviceId);
        const input = {
            id: `input-${deviceId}`,
            deviceId: deviceId,
            device: device,
            isOpen: true,
            onMessage: null
        };
        
        this.inputs.set(deviceId, input);
        this.emit('input-opened', input);
        
        return input;
    }
    
    /**
     * Open MIDI output
     */
    async openOutput(deviceId) {
        if (!this.devices.has(deviceId)) {
            throw new Error(`Device ${deviceId} not found`);
        }
        
        const device = this.devices.get(deviceId);
        const output = {
            id: `output-${deviceId}`,
            deviceId: deviceId,
            device: device,
            isOpen: true
        };
        
        this.outputs.set(deviceId, output);
        this.emit('output-opened', output);
        
        return output;
    }
    
    /**
     * Send MIDI 2.0 message with high resolution
     */
    async sendMessage(deviceId, message) {
        const output = this.outputs.get(deviceId);
        if (!output || !output.isOpen) {
            throw new Error(`Output ${deviceId} not open`);
        }
        
        // Convert message to MIDI 2.0 format
        const midi2Message = this.convertToMIDI2(message);
        
        // In production, this would send actual MIDI 2.0 message
        // For now, we'll emit an event
        this.emit('message-sent', {
            deviceId,
            message: midi2Message,
            original: message
        });
        
        return { success: true, message: midi2Message };
    }
    
    /**
     * Convert standard MIDI message to MIDI 2.0 format
     */
    convertToMIDI2(message) {
        // MIDI 2.0 uses 32-bit values instead of 7-bit/14-bit
        const midi2 = {
            ...message,
            timestamp: Date.now(),
            version: 2.0
        };
        
        // Convert 7-bit values to 32-bit
        if (message.type === 'cc' && message.value !== undefined) {
            // Convert 0-127 to 0-4294967295 (32-bit)
            midi2.value = Math.round((message.value / 127) * 4294967295);
            midi2.resolution = 32;
        } else if (message.type === 'note' && message.velocity !== undefined) {
            midi2.velocity = Math.round((message.velocity / 127) * 4294967295);
            midi2.resolution = 32;
        }
        
        return midi2;
    }
    
    /**
     * Send precise parameter value (32-bit)
     */
    async sendPreciseValue(deviceId, parameter, value, options = {}) {
        // value can be:
        // - Percentage: 0-100 (e.g., 75.3)
        // - Normalized: 0-1 (e.g., 0.753)
        // - Raw: 0-4294967295 (32-bit)
        
        let normalizedValue;
        
        if (options.unit === 'percentage') {
            normalizedValue = value / 100;
        } else if (options.unit === 'normalized') {
            normalizedValue = value;
        } else {
            // Assume percentage if value <= 100
            normalizedValue = value <= 100 ? value / 100 : value / 4294967295;
        }
        
        // Clamp to 0-1
        normalizedValue = Math.max(0, Math.min(1, normalizedValue));
        
        // Convert to 32-bit
        const midi2Value = Math.round(normalizedValue * 4294967295);
        
        const message = {
            type: 'cc',
            channel: options.channel || 0,
            controller: parameter,
            value: midi2Value,
            resolution: 32,
            timestamp: Date.now()
        };
        
        return await this.sendMessage(deviceId, message);
    }
    
    /**
     * Query device property (Property Exchange)
     */
    async queryProperty(deviceId, property) {
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }
        
        // Mock property query
        // In production, this would use MIDI 2.0 Property Exchange
        const properties = {
            'current-value': { value: 0, timestamp: Date.now() },
            'min-value': { value: 0 },
            'max-value': { value: 4294967295 },
            'resolution': { value: 32 },
            'capabilities': device.capabilities || {}
        };
        
        return properties[property] || null;
    }
    
    /**
     * Get device state
     */
    async getDeviceState(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }
        
        const input = this.inputs.get(deviceId);
        const output = this.outputs.get(deviceId);
        
        return {
            device: device,
            input: input ? { isOpen: input.isOpen } : null,
            output: output ? { isOpen: output.isOpen } : null,
            timestamp: Date.now()
        };
    }
    
    /**
     * Close input
     */
    async closeInput(deviceId) {
        const input = this.inputs.get(deviceId);
        if (input) {
            input.isOpen = false;
            this.inputs.delete(deviceId);
            this.emit('input-closed', deviceId);
        }
    }
    
    /**
     * Close output
     */
    async closeOutput(deviceId) {
        const output = this.outputs.get(deviceId);
        if (output) {
            output.isOpen = false;
            this.outputs.delete(deviceId);
            this.emit('output-closed', deviceId);
        }
    }
    
    /**
     * Shutdown service
     */
    async shutdown() {
        // Close all inputs and outputs
        for (const deviceId of this.inputs.keys()) {
            await this.closeInput(deviceId);
        }
        for (const deviceId of this.outputs.keys()) {
            await this.closeOutput(deviceId);
        }
        
        this.devices.clear();
        this.isInitialized = false;
        this.emit('shutdown');
    }
}

module.exports = MIDI2Service;

