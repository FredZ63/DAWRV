/**
 * ATLAS MIDI I/O Manager
 * Unified interface supporting both MIDI 1.0 and MIDI 2.0
 * Automatically detects and uses best available protocol
 */

class MIDIIOManager {
    constructor() {
        this.protocol = null; // 'midi1' or 'midi2'
        this.midi1Manager = null;
        this.midi2Manager = null;
        this.activeManager = null;
        this.initialized = false;
    }
    
    /**
     * Initialize MIDI I/O with automatic protocol detection
     */
    async initialize() {
        if (this.initialized) {
            return { success: true, protocol: this.protocol };
        }
        
        console.log('🎹 Initializing ATLAS MIDI I/O...');
        
        // Try MIDI 2.0 first (if available)
        const midi2Available = await this.tryMIDI2();
        
        if (midi2Available) {
            this.protocol = 'midi2';
            this.activeManager = this.midi2Manager;
            console.log('✅ MIDI 2.0 protocol enabled');
            console.log('   🎯 Enhanced features available:');
            console.log('      • Bidirectional patch queries');
            console.log('      • 32-bit parameter precision');
            console.log('      • Automatic device discovery');
            console.log('      • Property Exchange support');
        } else {
            // Fallback to MIDI 1.0
            await this.initializeMIDI1();
            this.protocol = 'midi1';
            this.activeManager = this.midi1Manager;
            console.log('✅ MIDI 1.0 protocol enabled (fallback mode)');
            console.log('   ℹ️  MIDI 2.0 devices will work in compatibility mode');
        }
        
        this.initialized = true;
        
        return { 
            success: true, 
            protocol: this.protocol,
            capabilities: this.getCapabilities()
        };
    }
    
    /**
     * Try to initialize MIDI 2.0
     */
    async tryMIDI2() {
        try {
            // Check if window.midi2 is available (from main process)
            if (typeof window !== 'undefined' && window.midi2) {
                const result = await window.midi2.initialize();
                if (result && result.success) {
                    this.midi2Manager = window.midi2;
                    return true;
                }
            }
            
            // Check if we have Node.js MIDI 2.0 library
            // (Future: implement native MIDI 2.0 library integration)
            
            return false;
        } catch (error) {
            console.warn('⚠️  MIDI 2.0 not available:', error.message);
            return false;
        }
    }
    
    /**
     * Initialize MIDI 1.0
     */
    async initializeMIDI1() {
        const DeviceManager = require('./device-manager.js');
        this.midi1Manager = new DeviceManager();
        return { success: true };
    }
    
    /**
     * Get protocol capabilities
     */
    getCapabilities() {
        if (this.protocol === 'midi2') {
            return {
                protocol: 'MIDI 2.0',
                bidirectional: true,
                resolution: '32-bit',
                propertyExchange: true,
                perNoteControl: true,
                queryDeviceState: true,
                preciseParameters: true,
                autoDiscovery: true
            };
        } else {
            return {
                protocol: 'MIDI 1.0',
                bidirectional: false,
                resolution: '7-bit (14-bit for some)',
                propertyExchange: false,
                perNoteControl: false,
                queryDeviceState: false,
                preciseParameters: false,
                autoDiscovery: false
            };
        }
    }
    
    /**
     * Discover devices (works with both protocols)
     */
    async discoverDevices() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            if (this.protocol === 'midi2') {
                // MIDI 2.0: Enhanced discovery with device capabilities
                const result = await this.midi2Manager.discoverDevices();
                
                if (result.success) {
                    // Enhance device info with MIDI 2.0 capabilities
                    const enhancedDevices = result.devices.map(device => ({
                        ...device,
                        protocol: 'MIDI 2.0',
                        capabilities: {
                            bidirectional: true,
                            propertyExchange: true,
                            highResolution: true
                        }
                    }));
                    
                    console.log(`🎹 Found ${enhancedDevices.length} MIDI 2.0 devices`);
                    return { success: true, devices: enhancedDevices, protocol: 'midi2' };
                }
            } else {
                // MIDI 1.0: Basic discovery
                const result = this.midi1Manager.discoverDevices();
                
                if (result.success) {
                    const devices = result.devices.map(device => ({
                        ...device,
                        protocol: 'MIDI 1.0',
                        capabilities: {
                            bidirectional: false,
                            propertyExchange: false,
                            highResolution: false
                        }
                    }));
                    
                    return { success: true, devices, protocol: 'midi1' };
                }
            }
            
            return { success: false, error: 'Device discovery failed', devices: [] };
        } catch (error) {
            console.error('❌ Device discovery error:', error);
            return { success: false, error: error.message, devices: [] };
        }
    }
    
    /**
     * Open device (auto-detects best method)
     */
    async openDevice(deviceId, type = 'output') {
        if (this.protocol === 'midi2') {
            return await this.midi2Manager.openDevice(deviceId, type);
        } else {
            return this.midi1Manager.openDevice(deviceId, type);
        }
    }
    
    /**
     * Close device
     */
    async closeDevice(deviceId, type = 'output') {
        if (this.protocol === 'midi2') {
            return await this.midi2Manager.closeDevice(deviceId, type);
        } else {
            return this.midi1Manager.closeDevice(deviceId);
        }
    }
    
    /**
     * Send patch to device
     * Automatically uses best available method
     */
    async sendPatch(deviceId, patchData, options = {}) {
        try {
            if (this.protocol === 'midi2') {
                // MIDI 2.0: Use precise parameter values
                console.log('📤 Sending patch via MIDI 2.0 (32-bit precision)');
                
                if (patchData.parameters) {
                    for (const [param, value] of Object.entries(patchData.parameters)) {
                        await this.midi2Manager.sendPreciseValue(
                            deviceId,
                            param,
                            value,
                            options
                        );
                    }
                }
                
                // Also send SysEx if available
                if (patchData.sysex) {
                    return await this.sendSysEx(deviceId, patchData.sysex);
                }
                
                return { success: true, protocol: 'midi2' };
            } else {
                // MIDI 1.0: Use SysEx
                console.log('📤 Sending patch via MIDI 1.0 (SysEx)');
                
                if (!patchData.sysex) {
                    return { success: false, error: 'No SysEx data available' };
                }
                
                return await this.sendSysEx(deviceId, patchData.sysex);
            }
        } catch (error) {
            console.error('❌ Send patch error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Query current patch from device (MIDI 2.0 only)
     */
    async queryCurrentPatch(deviceId) {
        if (this.protocol !== 'midi2') {
            return { 
                success: false, 
                error: 'Patch querying requires MIDI 2.0',
                note: 'Please use manual patch dump or upgrade to MIDI 2.0 device'
            };
        }
        
        try {
            console.log('🔍 Querying current patch from device (MIDI 2.0)...');
            
            const state = await this.midi2Manager.getDeviceState(deviceId);
            
            if (state.success) {
                console.log('✅ Patch state retrieved successfully');
                return { 
                    success: true, 
                    patch: state.data,
                    protocol: 'midi2'
                };
            }
            
            return state;
        } catch (error) {
            console.error('❌ Query patch error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send SysEx message
     */
    async sendSysEx(deviceId, sysexData) {
        try {
            let message;
            
            // Convert sysex data to array if needed
            if (typeof sysexData === 'string') {
                // Hex string format: "F0 43 12 ... F7"
                message = sysexData.split(' ').map(byte => parseInt(byte, 16));
            } else if (Buffer.isBuffer(sysexData)) {
                message = Array.from(sysexData);
            } else if (Array.isArray(sysexData)) {
                message = sysexData;
            } else {
                return { success: false, error: 'Invalid SysEx format' };
            }
            
            // Validate SysEx message
            if (message[0] !== 0xF0 || message[message.length - 1] !== 0xF7) {
                return { success: false, error: 'Invalid SysEx message (must start with F0 and end with F7)' };
            }
            
            console.log(`📤 Sending SysEx: ${message.length} bytes`);
            
            if (this.protocol === 'midi2') {
                // MIDI 2.0 can send SysEx too
                return await this.midi2Manager.sendSysEx(deviceId, message);
            } else {
                return this.midi1Manager.sendMessage(deviceId, message);
            }
        } catch (error) {
            console.error('❌ Send SysEx error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Request patch dump from device
     */
    async requestPatchDump(deviceId, patchNumber = null) {
        try {
            console.log('📥 Requesting patch dump from device...');
            
            // Note: This requires device-specific SysEx commands
            // Will be implemented in device-specific templates
            
            return { 
                success: false, 
                error: 'Patch dump request not implemented yet',
                note: 'Will be implemented in device-specific templates'
            };
        } catch (error) {
            console.error('❌ Request patch dump error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get device property (MIDI 2.0 only)
     */
    async getDeviceProperty(deviceId, property) {
        if (this.protocol !== 'midi2') {
            return { 
                success: false, 
                error: 'Property queries require MIDI 2.0'
            };
        }
        
        try {
            return await this.midi2Manager.queryProperty(deviceId, property);
        } catch (error) {
            console.error('❌ Get property error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get protocol info
     */
    getProtocolInfo() {
        return {
            current: this.protocol,
            capabilities: this.getCapabilities(),
            available: {
                midi1: true,
                midi2: this.midi2Manager !== null
            }
        };
    }
    
    /**
     * Close all connections
     */
    async closeAll() {
        if (this.protocol === 'midi2') {
            // MIDI 2.0 cleanup
            console.log('🔌 Closing MIDI 2.0 connections...');
        } else if (this.midi1Manager) {
            this.midi1Manager.closeAll();
        }
        
        this.initialized = false;
        console.log('✅ ATLAS MIDI I/O closed');
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MIDIIOManager;
}

if (typeof window !== 'undefined') {
    window.MIDIIOManager = MIDIIOManager;
}
