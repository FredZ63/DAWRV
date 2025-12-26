/**
 * ATLAS Device Manager
 * Handles MIDI device discovery, connection, and communication
 */

const midi = require('midi');

class DeviceManager {
    constructor() {
        this.input = new midi.Input();
        this.output = new midi.Output();
        this.devices = [];
        this.connectedDevices = new Map();
        this.messageHandlers = new Map();
    }
    
    /**
     * Discover all MIDI devices
     */
    discoverDevices() {
        try {
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
            if (name.includes(key)) {
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
        this.messageHandlers.set(deviceId, handler);
    }
    
    /**
     * Handle incoming MIDI message
     */
    handleMessage(deviceId, deltaTime, message) {
        const handler = this.messageHandlers.get(deviceId);
        
        if (handler) {
            handler(deltaTime, message);
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
        for (const deviceId of this.connectedDevices.keys()) {
            this.closeDevice(deviceId);
        }
        
        console.log('✅ All MIDI connections closed');
    }
}

module.exports = DeviceManager;
