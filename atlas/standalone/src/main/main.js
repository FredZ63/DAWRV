/**
 * ATLAS - Electron Main Process
 * Handles backend logic, MIDI I/O, and database
 */

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

// Import ATLAS core modules
const AtlasManager = require('../../core/atlas-manager.js');

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
        backgroundColor: '#0a0a0f',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../../shared/assets/icon.png'),
        titleBarStyle: 'hiddenInset', // macOS modern look
        trafficLightPosition: { x: 15, y: 15 }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

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
    const isMac = process.platform === 'darwin';
    
    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
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
                isMac ? { role: 'close' } : { role: 'quit' }
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
                ...(isMac ? [
                    { role: 'delete' },
                    { role: 'selectAll' },
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
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
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
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
        console.log('🏔️  Initializing ATLAS Core...');
        
        atlasManager = new AtlasManager();
        const result = await atlasManager.initialize();
        
        if (result.success) {
            console.log('✅ ATLAS core initialized');
            console.log(`   Protocol: ${result.protocol}`);
            
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

// Read patch from device (MIDI 2.0)
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

// Get categories
ipcMain.handle('atlas-get-categories', async () => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', categories: [] };
    }
    return await atlasManager.database.getCategories();
});

// Get devices with patches
ipcMain.handle('atlas-get-devices-with-patches', async () => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', devices: [] };
    }
    return await atlasManager.database.getDevicesWithPatches();
});

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(async () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🏔️  ATLAS - MIDI Patch Librarian');
    console.log('  "Holding Your Patch Universe"');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    createMainWindow();
    
    // Initialize ATLAS core after window is ready
    mainWindow.webContents.on('did-finish-load', async () => {
        console.log('📱 Window loaded, initializing backend...');
        await initializeAtlas();
    });
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
    console.log('');
    console.log('🔌 Shutting down ATLAS...');
    
    if (atlasManager) {
        await atlasManager.shutdown();
    }
    
    console.log('✅ ATLAS shutdown complete');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});
