/**
 * ATLAS Manager - Main Controller
 * Coordinates patch database, device management, and MIDI I/O
 * Supports both MIDI 1.0 and MIDI 2.0
 */

const PatchDatabase = require('./patch-database.js');
const MIDIIOManager = require('./midi-io.js');

class AtlasManager {
    constructor() {
        this.database = new PatchDatabase();
        this.midiIO = new MIDIIOManager();
        this.initialized = false;
        this.currentDevice = null;
    }
    
    /**
     * Initialize ATLAS
     */
    async initialize() {
        if (this.initialized) {
            return { success: true, message: 'ATLAS already initialized' };
        }
        
        console.log('🏔️  Initializing ATLAS - Automatic Transfer and Librarian for Audio Synthesizers');
        console.log('   "Holding Your Patch Universe"');
        console.log('');
        
        try {
            // Initialize database
            const dbResult = await this.database.initialize();
            if (!dbResult.success) {
                throw new Error('Database initialization failed: ' + dbResult.error);
            }
            
            // Initialize MIDI I/O
            const midiResult = await this.midiIO.initialize();
            if (!midiResult.success) {
                throw new Error('MIDI initialization failed: ' + midiResult.error);
            }
            
            console.log('');
            console.log('✅ ATLAS initialized successfully');
            console.log(`   Protocol: ${midiResult.protocol.toUpperCase()}`);
            
            if (midiResult.protocol === 'midi2') {
                console.log('   🎯 MIDI 2.0 Enhanced Features Active:');
                console.log('      • Query patches directly from devices');
                console.log('      • 32-bit parameter precision');
                console.log('      • Bidirectional communication');
                console.log('      • Automatic device discovery');
            } else {
                console.log('   ℹ️  MIDI 1.0 Mode (Standard Compatibility)');
                console.log('      • SysEx patch transfer');
                console.log('      • Manual patch management');
                console.log('      • Wide device compatibility');
            }
            
            this.initialized = true;
            
            return { 
                success: true, 
                message: 'ATLAS initialized',
                protocol: midiResult.protocol,
                capabilities: midiResult.capabilities
            };
        } catch (error) {
            console.error('❌ ATLAS initialization error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Discover devices
     */
    async discoverDevices() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        return await this.midiIO.discoverDevices();
    }
    
    /**
     * Connect to device
     */
    async connectDevice(deviceId) {
        try {
            // Open both input and output
            const outputResult = await this.midiIO.openDevice(deviceId, 'output');
            const inputResult = await this.midiIO.openDevice(deviceId, 'input');
            
            if (outputResult.success) {
                this.currentDevice = deviceId;
                console.log(`✅ Connected to device: ${deviceId}`);
            }
            
            return { 
                success: outputResult.success && inputResult.success,
                device: deviceId
            };
        } catch (error) {
            console.error('❌ Connect device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Disconnect from device
     */
    async disconnectDevice(deviceId) {
        try {
            await this.midiIO.closeDevice(deviceId, 'output');
            await this.midiIO.closeDevice(deviceId, 'input');
            
            if (this.currentDevice === deviceId) {
                this.currentDevice = null;
            }
            
            console.log(`✅ Disconnected from device: ${deviceId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Disconnect device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Save patch to library
     */
    async savePatch(patchData) {
        return this.database.savePatch(patchData);
    }
    
    /**
     * Load patch from library
     */
    async loadPatch(patchId) {
        const result = this.database.getPatch(patchId);
        
        if (result.success) {
            // Update last used timestamp
            this.database.updateLastUsed(patchId);
        }
        
        return result;
    }
    
    /**
     * Send patch to device
     */
    async sendPatchToDevice(deviceId, patchId, options = {}) {
        try {
            // Get patch from database
            const patchResult = await this.loadPatch(patchId);
            
            if (!patchResult.success) {
                return patchResult;
            }
            
            console.log(`📤 Sending patch "${patchResult.patch.name}" to device...`);
            
            // Send via MIDI
            const sendResult = await this.midiIO.sendPatch(
                deviceId, 
                patchResult.patch,
                options
            );
            
            if (sendResult.success) {
                console.log(`✅ Patch sent successfully (${sendResult.protocol || 'unknown protocol'})`);
            }
            
            return sendResult;
        } catch (error) {
            console.error('❌ Send patch to device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Read current patch from device (MIDI 2.0 only)
     */
    async readPatchFromDevice(deviceId, saveToDB = true) {
        try {
            console.log('📥 Reading current patch from device...');
            
            const result = await this.midiIO.queryCurrentPatch(deviceId);
            
            if (!result.success) {
                return result;
            }
            
            if (saveToDB) {
                // Save to database
                const deviceInfo = await this.midiIO.getDeviceInfo(deviceId);
                
                const patchData = {
                    name: result.patch.name || 'Imported Patch',
                    device: deviceInfo.device?.name || 'Unknown Device',
                    manufacturer: deviceInfo.device?.manufacturer,
                    category: 'Imported',
                    tags: ['imported', 'midi2'],
                    parameters: result.patch,
                    sysex: null // MIDI 2.0 doesn't use SysEx for parameters
                };
                
                const saveResult = await this.savePatch(patchData);
                
                if (saveResult.success) {
                    console.log(`✅ Patch imported and saved: ${patchData.name}`);
                    return { 
                        success: true, 
                        patch: patchData,
                        patchId: saveResult.id
                    };
                }
            }
            
            return result;
        } catch (error) {
            console.error('❌ Read patch from device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Search patches
     */
    async searchPatches(query) {
        return this.database.searchPatches(query);
    }
    
    /**
     * Delete patch
     */
    async deletePatch(patchId) {
        return this.database.deletePatch(patchId);
    }
    
    /**
     * Export patches
     */
    async exportPatches(deviceName = null) {
        return this.database.exportPatches(deviceName);
    }
    
    /**
     * Import patches
     */
    async importPatches(exportData) {
        return this.database.importPatches(exportData);
    }
    
    /**
     * Backup all patches for a device
     */
    async backupDevice(deviceId) {
        try {
            const deviceInfo = await this.midiIO.getDeviceInfo(deviceId);
            
            if (!deviceInfo.success) {
                return deviceInfo;
            }
            
            const deviceName = deviceInfo.device.name;
            
            console.log(`💾 Backing up all patches from ${deviceName}...`);
            
            // Export patches for this device
            const exportResult = await this.exportPatches(deviceName);
            
            if (!exportResult.success) {
                return exportResult;
            }
            
            const filename = `atlas-backup-${deviceName.replace(/\s+/g, '-')}-${Date.now()}.json`;
            
            return {
                success: true,
                filename,
                data: exportResult.data,
                count: exportResult.data.patches.length
            };
        } catch (error) {
            console.error('❌ Backup device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get protocol information
     */
    getProtocolInfo() {
        return this.midiIO.getProtocolInfo();
    }
    
    /**
     * Get statistics
     */
    async getStatistics() {
        try {
            const allPatches = await this.searchPatches({ limit: null });
            const categories = await this.database.getCategories();
            const devices = await this.database.getDevicesWithPatches();
            const protocolInfo = this.getProtocolInfo();
            
            return {
                success: true,
                stats: {
                    totalPatches: allPatches.count,
                    categories: categories.categories.length,
                    devices: devices.devices.length,
                    protocol: protocolInfo.current,
                    midi2Available: protocolInfo.available.midi2
                }
            };
        } catch (error) {
            console.error('❌ Get statistics error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Shutdown ATLAS
     */
    async shutdown() {
        console.log('🔌 Shutting down ATLAS...');
        
        await this.midiIO.closeAll();
        this.database.close();
        
        this.initialized = false;
        console.log('✅ ATLAS shutdown complete');
        
        return { success: true };
    }
}

module.exports = AtlasManager;
