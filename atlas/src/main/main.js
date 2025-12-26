/**
 * ATLAS - Main Process
 * Standalone Electron application for MIDI patch management
 */

const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Import ATLAS core modules
// NOTE: This file lives at atlas/src/main/main.js, while core lives at atlas/core/.
// So we need to go up two levels (to atlas/) before importing core modules.
const AtlasManager = require('../../core/atlas-manager.js');

// Global references
let mainWindow = null;
let atlasManager = null;

/**
 * Create main window
 */
function createMainWindow() {
    const iconCandidates = [
        // Future/packaged locations (keep these safe via existsSync)
        path.join(__dirname, '../../shared/assets/icon.png'),
        path.join(__dirname, '../../assets/icon.png')
    ].filter(p => fs.existsSync(p));

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
        ...(iconCandidates[0] ? { icon: iconCandidates[0] } : {})
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

            // Forward incoming MIDI activity to renderer (for "signal/handshake" indicator)
            try {
                atlasManager.setMidiActivityCallback((payload) => {
                    if (mainWindow && payload) {
                        mainWindow.webContents.send('atlas-midi-activity', payload);
                    }
                });
            } catch {
                // ignore
            }

            // Forward device import progress to renderer
            try {
                atlasManager.setDeviceImportCallback((payload) => {
                    if (mainWindow && payload) {
                        mainWindow.webContents.send('atlas-device-import-progress', payload);
                    }
                });
            } catch {
                // ignore
            }
            
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
ipcMain.handle('atlas-connect-device', async (event, deviceId, options = {}) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.connectDevice(deviceId, options);
});

// Device import (capture SysEx dumps)
ipcMain.handle('atlas-device-import-start', async (event, deviceId, options = {}) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.startDeviceImport(deviceId, options);
});

ipcMain.handle('atlas-device-import-stop', async (event, deviceId) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.stopDeviceImport(deviceId);
});

ipcMain.handle('atlas-device-import-save', async (event, deviceId, options = {}) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.saveDeviceImport(deviceId, options);
});

// Device import (USB backup folder)
ipcMain.handle('atlas-device-import-usb-backup', async (event, deviceId, options = {}) => {
    try {
        if (!mainWindow) return { success: false, error: 'No window available' };
        if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };

        const res = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Device USB Backup Folder',
            properties: ['openDirectory']
        });
        if (res.canceled || !res.filePaths?.[0]) return { success: true, canceled: true };

        const sourceDir = res.filePaths[0];
        const deviceName = String(options.deviceName || deviceId);
        const safeName = deviceName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 60) || 'device';
        const home = process.env.HOME || process.env.USERPROFILE;
        const destRoot = home
            ? path.join(home, '.dawrv', 'atlas', 'device-backups', safeName, String(Date.now()))
            : path.join(app.getPath('userData'), 'device-backups', safeName, String(Date.now()));

        fs.mkdirSync(destRoot, { recursive: true });
        // Node 16+ supports fs.cpSync
        fs.cpSync(sourceDir, destRoot, { recursive: true });

        // Register as a Knowledge doc so it's discoverable + manageable (local-first).
        try {
            const title = `${deviceName} USB Backup (${new Date().toLocaleString()})`;
            const content = [
                `Imported USB backup folder for: ${deviceName}`,
                `Source: ${sourceDir}`,
                `Stored at: ${destRoot}`,
                '',
                'Note: ATLAS may not be able to parse vendor backup formats yet, but this keeps your backups tracked and recoverable.',
                'We can add device-specific parsers over time (Roland/Korg/etc).'
            ].join('\n');

            await atlasManager.saveKnowledgeDoc({
                title,
                source: destRoot,
                docType: 'device-backup',
                tags: ['backup', 'device', safeName],
                content,
                pluginName: null,
                manufacturer: options.manufacturer || null
            });
        } catch {
            // ignore
        }

        return { success: true, sourceDir, destRoot };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

function extractStringsFromBuffer(buf, { minLen = 4, max = 2500 } = {}) {
    // Best-effort "strings" extraction for unknown binary formats.
    const results = new Set();
    const add = (s) => {
        const t = String(s || '').trim();
        if (t.length >= minLen && t.length <= 80) results.add(t);
    };

    // ASCII-ish sequences
    let cur = '';
    for (let i = 0; i < buf.length; i++) {
        const b = buf[i];
        if (b >= 0x20 && b <= 0x7E) {
            cur += String.fromCharCode(b);
            if (cur.length > 120) cur = cur.slice(-120);
        } else {
            if (cur.length >= minLen) add(cur);
            cur = '';
        }
        if (results.size >= max) break;
    }
    if (cur.length >= minLen) add(cur);

    // UTF-16LE-ish sequences (printable char followed by 0x00)
    let u = '';
    for (let i = 0; i + 1 < buf.length; i += 2) {
        const lo = buf[i];
        const hi = buf[i + 1];
        if (hi === 0x00 && lo >= 0x20 && lo <= 0x7E) {
            u += String.fromCharCode(lo);
            if (u.length > 120) u = u.slice(-120);
        } else {
            if (u.length >= minLen) add(u);
            u = '';
        }
        if (results.size >= max) break;
    }
    if (u.length >= minLen) add(u);

    // Return top strings (stable-ish)
    return Array.from(results).sort((a, b) => b.length - a.length).slice(0, max);
}

function expandUserPath(p) {
    const s = String(p || '');
    if (!s) return s;
    if (s.startsWith('~/')) {
        const home = process.env.HOME || process.env.USERPROFILE || '';
        return home ? path.join(home, s.slice(2)) : s;
    }
    return s;
}

ipcMain.handle('atlas-device-import-junox-svd', async (event, deviceId, options = {}) => {
    try {
        if (!mainWindow) return { success: false, error: 'No window available' };
        if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };

        let sourceFile = options.sourceFile ? expandUserPath(options.sourceFile) : '';
        if (sourceFile) {
            const stat = fs.existsSync(sourceFile) ? fs.statSync(sourceFile) : null;
            if (!stat || !stat.isFile()) return { success: false, error: 'SVD file path is invalid' };
            if (!sourceFile.toLowerCase().endsWith('.svd')) return { success: false, error: 'File must be .svd' };
            if (stat.size > 200 * 1024 * 1024) return { success: false, error: 'File too large (>200MB)' };
        } else {
            const res = await dialog.showOpenDialog(mainWindow, {
                title: 'Select JUNO-X backup.svd',
                properties: ['openFile'],
                filters: [
                    { name: 'JUNO-X Backup', extensions: ['svd'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (res.canceled || !res.filePaths?.[0]) return { success: true, canceled: true };
            sourceFile = res.filePaths[0];
        }

        const deviceName = String(options.deviceName || deviceId || 'JUNO-X');
        const safeName = deviceName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 60) || 'juno-x';
        const home = process.env.HOME || process.env.USERPROFILE;
        const destRoot = home
            ? path.join(home, '.dawrv', 'atlas', 'device-backups', safeName, String(Date.now()))
            : path.join(app.getPath('userData'), 'device-backups', safeName, String(Date.now()));
        fs.mkdirSync(destRoot, { recursive: true });

        const destFile = path.join(destRoot, path.basename(sourceFile));
        fs.copyFileSync(sourceFile, destFile);

        const buf = fs.readFileSync(destFile);
        const sha = crypto.createHash('sha256').update(buf).digest('hex');
        const strings = extractStringsFromBuffer(buf, { minLen: 4, max: 1200 });

        // Register as Knowledge doc for search/citations
        try {
            const title = `${deviceName} backup.svd (${new Date().toLocaleString()})`;
            const content = [
                `Imported JUNO-X backup file: ${path.basename(sourceFile)}`,
                `Device: ${deviceName}`,
                `Source: ${sourceFile}`,
                `Stored at: ${destFile}`,
                `SHA256: ${sha}`,
                `Size: ${buf.length} bytes`,
                '',
                'Extracted text (best-effort):',
                ...strings.slice(0, 300).map(s => `- ${s}`)
            ].join('\n');

            await atlasManager.saveKnowledgeDoc({
                title,
                source: destFile,
                docType: 'device-backup',
                tags: ['backup', 'device', 'juno-x', 'svd', safeName],
                content,
                pluginName: null,
                manufacturer: options.manufacturer || 'Roland'
            });
        } catch {
            // ignore
        }

        return { success: true, sourceFile, destFile, destRoot, sha256: sha, stringsFound: strings.length };
    } catch (e) {
        return { success: false, error: e.message };
    }
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

// Audition patch inline (send + short note)
ipcMain.handle('atlas-audition-patch', async (event, deviceId, patchId, options) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.auditionPatch(deviceId, patchId, options);
});

// ============================================
// IPC Handlers - OS Shell helpers (macOS/Win)
// ============================================

ipcMain.handle('atlas-shell-reveal-path', async (event, filePath) => {
    try {
        const { shell } = require('electron');
        const p = String(filePath || '').trim();
        if (!p) return { success: false, error: 'Missing path' };
        shell.showItemInFolder(p);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('atlas-shell-open-path', async (event, filePath) => {
    try {
        const { shell } = require('electron');
        const p = String(filePath || '').trim();
        if (!p) return { success: false, error: 'Missing path' };
        const res = await shell.openPath(p);
        if (res) return { success: false, error: res };
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
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

// Patch Sets (Bundles)
ipcMain.handle('atlas-patch-sets-create', async (event, data) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.createPatchSet(data);
});

ipcMain.handle('atlas-patch-sets-list', async (event, deviceName) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized', sets: [] };
    return await atlasManager.listPatchSets(deviceName);
});

ipcMain.handle('atlas-patch-sets-items', async (event, setId) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized', patches: [] };
    return await atlasManager.getPatchSetItems(setId);
});

ipcMain.handle('atlas-patch-sets-add', async (event, setId, patchIds) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.addPatchesToSet(setId, patchIds);
});

ipcMain.handle('atlas-patch-sets-remove', async (event, setId, patchId) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.removePatchFromSet(setId, patchId);
});

ipcMain.handle('atlas-patch-sets-update', async (event, setId, data) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.updatePatchSet(setId, data);
});

ipcMain.handle('atlas-patch-sets-delete', async (event, setId) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.deletePatchSet(setId);
});

ipcMain.handle('atlas-patch-sets-reorder', async (event, setId, orderedPatchIds) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.reorderPatchSetItems(setId, orderedPatchIds);
});

ipcMain.handle('atlas-patch-sets-export', async (event, setId) => {
    try {
        if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
        if (!mainWindow) return { success: false, error: 'No window available' };

        const exp = await atlasManager.exportPatchSet(setId);
        if (!exp.success) return exp;

        const setName = String(exp.data?.set?.name || 'patch-set').replace(/[^a-z0-9._-]+/gi, '-').slice(0, 80) || 'patch-set';
        const deviceName = String(exp.data?.set?.device || 'device').replace(/[^a-z0-9._-]+/gi, '-').slice(0, 60) || 'device';
        const defaultPath = path.join(app.getPath('downloads'), `ATLAS-${deviceName}-${setName}.atlas-set.json`);

        const res = await dialog.showSaveDialog(mainWindow, {
            title: 'Export ATLAS Set (Bundle)',
            defaultPath,
            filters: [
                { name: 'ATLAS Set', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (res.canceled || !res.filePath) return { success: true, canceled: true };

        fs.writeFileSync(res.filePath, JSON.stringify(exp.data, null, 2), 'utf8');
        return { success: true, filePath: res.filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('atlas-patch-sets-import', async (event, deviceName) => {
    try {
        if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
        if (!mainWindow) return { success: false, error: 'No window available' };

        const res = await dialog.showOpenDialog(mainWindow, {
            title: 'Import ATLAS Set (Bundle)',
            properties: ['openFile'],
            filters: [
                { name: 'ATLAS Set', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (res.canceled || !res.filePaths?.[0]) return { success: true, canceled: true };

        const filePath = res.filePaths[0];
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);

        const target = String(deviceName || '').trim();
        const imp = await atlasManager.importPatchSet(data, { deviceName: target || (data?.set?.device || '') });
        if (!imp.success) return imp;

        return { success: true, filePath, ...imp };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Delete patch
ipcMain.handle('atlas-delete-patch', async (event, patchId) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.deletePatch(patchId);
});

// Clear library (delete all patches)
ipcMain.handle('atlas-clear-library', async () => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.clearLibrary();
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
    return await atlasManager.getCategories();
});

// ============================================
// IPC Handlers - Plugin Operations
// ============================================

// Discover plugins
ipcMain.handle('atlas-discover-plugins', async () => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', plugins: [] };
    }
    const result = await atlasManager.discoverPlugins();
    if (!result.success || !Array.isArray(result.plugins)) return result;

    // Phase 1: cache plugin icons locally (macOS bundles often include .icns)
    try {
        const { nativeImage } = require('electron');
        const home = process.env.HOME || process.env.USERPROFILE;
        const iconDir = home ? path.join(home, '.dawrv', 'atlas', 'plugin-icons') : null;
        if (iconDir) fs.mkdirSync(iconDir, { recursive: true });

        for (const plugin of result.plugins) {
            if (!iconDir) break;
            if (plugin.iconPath) continue;
            const src = plugin.iconSourcePath;
            if (!src || !fs.existsSync(src)) continue;

            const img = nativeImage.createFromPath(src);
            if (!img || img.isEmpty()) continue;

            const pngPath = path.join(iconDir, `${plugin.id}.png`);
            fs.writeFileSync(pngPath, img.toPNG());
            plugin.iconPath = pngPath;

            // Persist to DB so icons survive restarts
            try {
                atlasManager.database.savePlugin({ ...plugin, iconPath: pngPath });
            } catch (e) {
                // ignore
            }
        }
    } catch (e) {
        // If nativeImage isn't available (non-electron usage), skip.
    }

    return result;
});

// Extract presets from plugin
ipcMain.handle('atlas-extract-plugin-presets', async (event, pluginId, options = {}) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', presets: [] };
    }
    return await atlasManager.extractPluginPresets(pluginId, options);
});

// Get all plugins
ipcMain.handle('atlas-get-plugins', async () => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', plugins: [] };
    }
    const result = await atlasManager.getPlugins();
    if (!result.success || !Array.isArray(result.plugins)) return result;

    // Opportunistic icon caching on read (so icons appear even if user didn't rescan)
    try {
        const { nativeImage } = require('electron');
        const home = process.env.HOME || process.env.USERPROFILE;
        const iconDir = home ? path.join(home, '.dawrv', 'atlas', 'plugin-icons') : null;
        if (iconDir) fs.mkdirSync(iconDir, { recursive: true });

        const findBundleIcon = (bundlePath) => {
            try {
                const resources = path.join(bundlePath, 'Contents', 'Resources');
                if (!fs.existsSync(resources)) return null;
                const files = fs.readdirSync(resources, { withFileTypes: true })
                    .filter(d => d.isFile())
                    .map(d => d.name);
                const pick = (arr) => arr.find(n => n.toLowerCase().includes('icon')) || arr[0];
                const icns = files.filter(n => n.toLowerCase().endsWith('.icns'));
                const png = files.filter(n => n.toLowerCase().endsWith('.png'));
                const tif = files.filter(n => n.toLowerCase().endsWith('.tiff') || n.toLowerCase().endsWith('.tif'));
                const chosen = icns.length ? pick(icns) : (png.length ? pick(png) : (tif.length ? pick(tif) : null));
                return chosen ? path.join(resources, chosen) : null;
            } catch {
                return null;
            }
        };

        for (const plugin of result.plugins) {
            if (!iconDir) break;
            if (plugin.iconPath) continue;
            if (process.platform !== 'darwin') break;
            const src = plugin.path ? findBundleIcon(plugin.path) : null;
            if (!src || !fs.existsSync(src)) continue;

            const img = nativeImage.createFromPath(src);
            if (!img || img.isEmpty()) continue;

            const pngPath = path.join(iconDir, `${plugin.id}.png`);
            fs.writeFileSync(pngPath, img.toPNG());
            plugin.iconPath = pngPath;

            try {
                atlasManager.database.savePlugin({ ...plugin, iconPath: pngPath });
            } catch {
                // ignore
            }
        }
    } catch {
        // ignore
    }

    return result;
});

// Manual vendor override (local-first)
ipcMain.handle('atlas-plugins-set-manufacturer', async (event, pluginId, manufacturer) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.setPluginManufacturer(pluginId, manufacturer);
});

// Optional: online enrichment for unknown plugin vendors (opt-in)
ipcMain.handle('atlas-plugins-enrich-vendors', async (event, options = {}) => {
    if (!atlasManager) return { success: false, error: 'ATLAS not initialized' };
    return await atlasManager.enrichUnknownPluginManufacturers(options);
});

// ============================================
// IPC Handlers - Knowledge / Copilot (local-first)
// ============================================

ipcMain.handle('atlas-knowledge-save-doc', async (event, doc) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.saveKnowledgeDoc(doc);
});

ipcMain.handle('atlas-knowledge-list-docs', async (event, limit = 200) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', docs: [] };
    }
    return await atlasManager.listKnowledgeDocs(limit);
});

ipcMain.handle('atlas-knowledge-delete-doc', async (event, docId) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.deleteKnowledgeDoc(docId);
});

ipcMain.handle('atlas-knowledge-search', async (event, q, limit = 5) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized', results: [] };
    }
    return await atlasManager.searchKnowledge(q, limit);
});

ipcMain.handle('atlas-copilot-ask', async (event, question, context = {}) => {
    if (!atlasManager) {
        return { success: false, error: 'ATLAS not initialized' };
    }
    return await atlasManager.askCopilot(question, context);
});

ipcMain.handle('atlas-knowledge-import-files', async () => {
    if (!mainWindow) {
        return { success: false, error: 'No window available', files: [] };
    }

    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Knowledge Files',
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Text', extensions: ['txt', 'md', 'markdown', 'html', 'htm', 'json', 'xml'] },
            { name: 'PDF', extensions: ['pdf'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled) return { success: true, files: [] };

    const files = [];
    for (const filePath of result.filePaths.slice(0, 25)) {
        try {
            const stat = fs.statSync(filePath);
            // 25MB safety cap per file (manual PDFs can be larger)
            if (stat.size > 25 * 1024 * 1024) {
                files.push({ path: filePath, name: path.basename(filePath), error: 'File too large (>25MB)' });
                continue;
            }

            const ext = path.extname(filePath).toLowerCase();
            let content = '';
            if (ext === '.pdf') {
                // Best-effort: extract readable strings for search/citations (local-first, no heavy deps)
                const buf = fs.readFileSync(filePath);
                const sha = crypto.createHash('sha256').update(buf).digest('hex');
                const strings = extractStringsFromBuffer(buf, { minLen: 4, max: 2000 });
                content = [
                    `Imported PDF manual: ${path.basename(filePath)}`,
                    `Source: ${filePath}`,
                    `SHA256: ${sha}`,
                    `Size: ${buf.length} bytes`,
                    '',
                    'Extracted text (best-effort):',
                    ...strings.slice(0, 600).map(s => `- ${s}`)
                ].join('\n');
            } else {
                content = fs.readFileSync(filePath, 'utf8');
            }
            files.push({
                path: filePath,
                name: path.basename(filePath),
                content
            });
        } catch (e) {
            files.push({ path: filePath, name: path.basename(filePath), error: e.message });
        }
    }

    return { success: true, files };
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
