/**
 * MIDI 2.0 Manager (Renderer)
 * Provides high-level MIDI 2.0 control for RHEA
 */

class MIDI2Manager {
    constructor() {
        this.devices = [];
        this.initialized = false;
        this.activeDevices = new Map();
    }
    
    /**
     * Initialize MIDI 2.0 service
     */
    async initialize() {
        if (this.initialized) {
            return { success: true };
        }
        
        try {
            if (!window.midi2) {
                console.warn('⚠️  MIDI 2.0 API not available (window.midi2 is undefined)');
                console.warn('   This is normal if MIDI 2.0 is not needed');
                return { success: false, error: 'MIDI 2.0 API not available' };
            }
            
            console.log('🎹 Attempting to initialize MIDI 2.0...');
            const result = await window.midi2.initialize();
            
            if (result && result.success) {
                this.initialized = true;
                console.log('🎹 MIDI 2.0 initialized:', result.message);
            } else {
                console.warn('⚠️  MIDI 2.0 initialization returned:', result);
            }
            return result || { success: false, error: 'Unknown error' };
        } catch (error) {
            console.error('❌ MIDI 2.0 initialization error:', error);
            console.error('   Error details:', error.message, error.stack);
            // Don't throw - just return error result
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Discover MIDI devices
     */
    async discoverDevices() {
        try {
            const result = await window.midi2.discoverDevices();
            if (result.success) {
                this.devices = result.devices;
                console.log(`🎹 Found ${this.devices.length} MIDI devices`);
            }
            return result;
        } catch (error) {
            console.error('Device discovery error:', error);
            return { success: false, error: error.message, devices: [] };
        }
    }
    
    /**
     * Open device for communication
     */
    async openDevice(deviceId, type = 'output') {
        try {
            let result;
            if (type === 'input') {
                result = await window.midi2.openInput(deviceId);
            } else {
                result = await window.midi2.openOutput(deviceId);
            }
            
            if (result.success) {
                this.activeDevices.set(deviceId, {
                    deviceId,
                    type,
                    ...result[type]
                });
            }
            return result;
        } catch (error) {
            console.error('Open device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send precise parameter value
     */
    async sendPreciseValue(deviceId, parameter, value, options = {}) {
        try {
            // Parse value from voice command
            const parsedValue = this.parseValue(value, options);
            
            const result = await window.midi2.sendPreciseValue(
                deviceId,
                parameter,
                parsedValue.value,
                {
                    ...options,
                    unit: parsedValue.unit
                }
            );
            
            return result;
        } catch (error) {
            console.error('Send precise value error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Parse value from voice command
     * Supports: "75.3%", "0.753", "75.3 percent", etc.
     */
    parseValue(value, options = {}) {
        if (typeof value === 'number') {
            return {
                value: value,
                unit: value <= 1 ? 'normalized' : 'percentage'
            };
        }
        
        const str = String(value).toLowerCase().trim();
        
        // Check for percentage
        if (str.includes('%') || str.includes('percent')) {
            const num = parseFloat(str.replace(/[^0-9.]/g, ''));
            return {
                value: num,
                unit: 'percentage'
            };
        }
        
        // Check for normalized (0-1)
        const num = parseFloat(str);
        if (!isNaN(num)) {
            return {
                value: num,
                unit: num <= 1 ? 'normalized' : 'percentage'
            };
        }
        
        // Default to percentage
        return {
            value: 0,
            unit: 'percentage'
        };
    }
    
    /**
     * Query device property
     */
    async queryProperty(deviceId, property) {
        try {
            const result = await window.midi2.queryProperty(deviceId, property);
            return result;
        } catch (error) {
            console.error('Query property error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get device state
     */
    async getDeviceState(deviceId) {
        try {
            const result = await window.midi2.getDeviceState(deviceId);
            return result;
        } catch (error) {
            console.error('Get device state error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Close device
     */
    async closeDevice(deviceId, type = 'output') {
        try {
            let result;
            if (type === 'input') {
                result = await window.midi2.closeInput(deviceId);
            } else {
                result = await window.midi2.closeOutput(deviceId);
            }
            
            if (result.success) {
                this.activeDevices.delete(deviceId);
            }
            return result;
        } catch (error) {
            console.error('Close device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get all devices
     */
    getDevices() {
        return this.devices;
    }
    
    /**
     * Get active devices
     */
    getActiveDevices() {
        return Array.from(this.activeDevices.values());
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.MIDI2Manager = MIDI2Manager;
}

