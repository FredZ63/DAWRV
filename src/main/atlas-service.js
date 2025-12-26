/**
 * ATLAS Main Process Service
 * Integrates with DAWRV's Electron main process
 */

const { ipcMain } = require('electron');
const AtlasManager = require('../../atlas/core/atlas-manager.js');

class AtlasService {
    constructor() {
        this.atlas = new AtlasManager();
        this.initialized = false;
    }
    
    /**
     * Register IPC handlers
     */
    registerIPCHandlers() {
        // Initialize ATLAS
        ipcMain.handle('atlas-initialize', async () => {
            console.log('🏔️  [ATLAS SERVICE] Initialize requested');
            const result = await this.atlas.initialize();
            this.initialized = result.success;
            return result;
        });
        
        // Discover devices
        ipcMain.handle('atlas-discover-devices', async () => {
            console.log('🏔️  [ATLAS SERVICE] Discover devices requested');
            return await this.atlas.discoverDevices();
        });
        
        // Connect to device
        ipcMain.handle('atlas-connect-device', async (event, deviceId) => {
            console.log('🏔️  [ATLAS SERVICE] Connect device requested:', deviceId);
            return await this.atlas.connectDevice(deviceId);
        });
        
        // Disconnect from device
        ipcMain.handle('atlas-disconnect-device', async (event, deviceId) => {
            console.log('🏔️  [ATLAS SERVICE] Disconnect device requested:', deviceId);
            return await this.atlas.disconnectDevice(deviceId);
        });
        
        // Save patch
        ipcMain.handle('atlas-save-patch', async (event, patchData) => {
            console.log('🏔️  [ATLAS SERVICE] Save patch requested:', patchData.name);
            return await this.atlas.savePatch(patchData);
        });
        
        // Load patch
        ipcMain.handle('atlas-load-patch', async (event, patchId) => {
            console.log('🏔️  [ATLAS SERVICE] Load patch requested:', patchId);
            return await this.atlas.loadPatch(patchId);
        });
        
        // Send patch to device
        ipcMain.handle('atlas-send-patch', async (event, deviceId, patchId, options) => {
            console.log('🏔️  [ATLAS SERVICE] Send patch to device:', deviceId, patchId);
            return await this.atlas.sendPatchToDevice(deviceId, patchId, options);
        });
        
        // Read patch from device (MIDI 2.0)
        ipcMain.handle('atlas-read-patch', async (event, deviceId, saveToDB) => {
            console.log('🏔️  [ATLAS SERVICE] Read patch from device:', deviceId);
            return await this.atlas.readPatchFromDevice(deviceId, saveToDB);
        });
        
        // Search patches
        ipcMain.handle('atlas-search-patches', async (event, query) => {
            console.log('🏔️  [ATLAS SERVICE] Search patches:', query);
            return await this.atlas.searchPatches(query);
        });
        
        // Delete patch
        ipcMain.handle('atlas-delete-patch', async (event, patchId) => {
            console.log('🏔️  [ATLAS SERVICE] Delete patch:', patchId);
            return await this.atlas.deletePatch(patchId);
        });
        
        // Export patches
        ipcMain.handle('atlas-export-patches', async (event, deviceName) => {
            console.log('🏔️  [ATLAS SERVICE] Export patches:', deviceName || 'all');
            return await this.atlas.exportPatches(deviceName);
        });
        
        // Import patches
        ipcMain.handle('atlas-import-patches', async (event, exportData) => {
            console.log('🏔️  [ATLAS SERVICE] Import patches');
            return await this.atlas.importPatches(exportData);
        });
        
        // Backup device
        ipcMain.handle('atlas-backup-device', async (event, deviceId) => {
            console.log('🏔️  [ATLAS SERVICE] Backup device:', deviceId);
            return await this.atlas.backupDevice(deviceId);
        });
        
        // Get protocol info
        ipcMain.handle('atlas-get-protocol-info', async () => {
            return this.atlas.getProtocolInfo();
        });
        
        // Get statistics
        ipcMain.handle('atlas-get-statistics', async () => {
            return await this.atlas.getStatistics();
        });
        
        // Shutdown
        ipcMain.handle('atlas-shutdown', async () => {
            console.log('🏔️  [ATLAS SERVICE] Shutdown requested');
            return await this.atlas.shutdown();
        });
        
        console.log('✅ ATLAS IPC handlers registered');
    }
    
    /**
     * Auto-initialize on startup
     */
    async autoInitialize() {
        try {
            console.log('🏔️  [ATLAS SERVICE] Auto-initializing...');
            const result = await this.atlas.initialize();
            this.initialized = result.success;
            
            if (result.success) {
                console.log('✅ ATLAS Service ready');
            } else {
                console.warn('⚠️  ATLAS Service initialization failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('❌ ATLAS Service auto-initialize error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Cleanup on app quit
     */
    async cleanup() {
        if (this.initialized) {
            console.log('🏔️  [ATLAS SERVICE] Cleaning up...');
            await this.atlas.shutdown();
        }
    }
}

module.exports = AtlasService;
