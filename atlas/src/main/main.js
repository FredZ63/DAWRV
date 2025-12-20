/**
 * ATLAS - Main Process
 * Standalone Electron application for MIDI patch management
 */

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

// Import ATLAS core modules
const AtlasManager = require('../core/atlas-manager.js');

// Global references
let mainWindow = null;
let atlasManager = null;

/**
 * Create main window
 */
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'ATLAS - MIDI Patch Librarian',
        backgroundColor: '#1a1a1a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../../assets/icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // Create application menu
    createMenu();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    console.log('🏔️  ATLAS window created');
}

/**
 * Create application menu
 */
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Patch',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow.webContents.send('menu-new-patch')
                },
                {
                    label: 'Import Patches...',
                    accelerator: 'CmdOrCtrl+I',
                    click: () => mainWindow.webContents.send('menu-import-patches')
                },
                {
                    label: 'Export Patches...',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => mainWindow.webContents.send('menu-export-patches')
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'Device',
            submenu: [
                {
                    label: 'Discover Devices',
                    accelerator: 'CmdOrCtrl+D',
                    click: () => mainWindow.webContents.send('menu-discover-devices')
                },
                {
                    label: 'Refresh Connections',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => mainWindow.webContents.send('menu-refresh-devices')
                },
                { type: 'separator' },
                {
                    label: 'Backup Current Device',
                    accelerator: 'CmdOrCtrl+B',
                    click: () => mainWindow.webContents.send('menu-backup-device')
                }
            ]
        },
        {
            label: 'DAW',
            submenu: [
                {
                    label: 'Connect to REAPER',
                    click: () => mainWindow.webContents.send('menu-connect-reaper')
                },
                {
                    label: 'Connect to Ableton Live',
                    click: () => mainWindow.webContents.send('menu-connect-ableton')
                },
                {
                    label: 'Connect to Logic Pro',
                    click: () => mainWindow.webContents.send('menu-connect-logic')
                },
                { type: 'separator' },
                {
                    label: 'Disconnect DAW',
                    click: () => mainWindow.webContents.send('menu-disconnect-daw')
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => mainWindow.webContents.send('menu-help-docs')
                },
                {
                    label: 'MIDI 2.0 Info',
                    click: () => mainWindow.webContents.send('menu-help-midi2')
                },
                { type: 'separator' },
                {
                    label: 'About ATLAS',
                    click: () => mainWindow.webContents.send('menu-about')
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * Initialize ATLAS core
 */
async function initializeAtlas() {
    try {
        atlasManager = new AtlasManager();
        const result = await atlasManager.initialize();
        
        if (result.success) {
            console.log('✅ ATLAS core initialized');
            
            // Send initialization status to renderer
            if (mainWindow) {
                mainWindow.webContents.send('atlas-initialized', result);
            }
        } else {
            console.error('❌ ATLAS initialization failed:', result.error);
        }
        
        return result;
    } catch (error) {
        console.error('❌ ATLAS initialization error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// IPC Handlers - ATLAS Core Operations
// ============================================

// Initialize ATLAS
ipcMain.handle('atlas-initialize', async () => {
    return await initializeAtlas();
});

// Get protocol info
ipcMain.handle('atlas-get-protocol-info', async () => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return { success: true, info: atlasManager.getProtocolInfo() };
});

// Discover devices
ipcMain.handle('atlas-discover-devices', async () => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', devices: [] };
    }
    return await atlasManager.discoverDevices();
});

// Connect device
ipcMain.handle('atlas-connect-device', async (event, deviceId) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.connectDevice(deviceId);
});

// Disconnect device
ipcMain.handle('atlas-disconnect-device', async (event, deviceId) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.disconnectDevice(deviceId);
});

// Save patch
ipcMain.handle('atlas-save-patch', async (event, patchData) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.savePatch(patchData);
});

// Load patch
ipcMain.handle('atlas-load-patch', async (event, patchId) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.loadPatch(patchId);
});

// Send patch to device
ipcMain.handle('atlas-send-patch', async (event, deviceId, patchId, options) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.sendPatchToDevice(deviceId, patchId, options);
});

// Read patch from device
ipcMain.handle('atlas-read-patch', async (event, deviceId, saveToDB) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.readPatchFromDevice(deviceId, saveToDB);
});

// Search patches
ipcMain.handle('atlas-search-patches', async (event, query) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', patches: [] };
    }
    return await atlasManager.searchPatches(query);
});

// Delete patch
ipcMain.handle('atlas-delete-patch', async (event, patchId) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.deletePatch(patchId);
});

// Export patches
ipcMain.handle('atlas-export-patches', async (event, deviceName) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.exportPatches(deviceName);
});

// Import patches
ipcMain.handle('atlas-import-patches', async (event, exportData) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.importPatches(exportData);
});

// Backup device
ipcMain.handle('atlas-backup-device', async (event, deviceId) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.backupDevice(deviceId);
});

// Get statistics
ipcMain.handle('atlas-get-statistics', async () => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.getStatistics();
});

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(async () => {
    console.log('🏔️  ATLAS - Automatic Transfer and Librarian for Audio Synthesizers');
    console.log('   "Holding Your Patch Universe"');
    console.log('');
    
    createMainWindow();
    
    // Initialize ATLAS core after a brief delay
    setTimeout(async () => {
        await initializeAtlas();
    }, 1000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

app.on('before-quit', async () => {
    console.log('🔌 Shutting down ATLAS...');
    
    if (atlasManager) {
        await atlasManager.shutdown();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});
