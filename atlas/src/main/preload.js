/**
 * ATLAS - Preload Script
 * Exposes safe APIs to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');
let appVersion = '1.0.0-beta.1';
try {
    // preload.js is at atlas/src/main/preload.js
    // ../../package.json resolves to atlas/package.json (and works inside app.asar when packaged)
    appVersion = require('../../package.json').version || appVersion;
} catch {
    // ignore and keep fallback
}

// Expose ATLAS API to renderer
contextBridge.exposeInMainWorld('atlas', {
    // Core initialization
    initialize: () => ipcRenderer.invoke('atlas-initialize'),
    getProtocolInfo: () => ipcRenderer.invoke('atlas-get-protocol-info'),
    getStatistics: () => ipcRenderer.invoke('atlas-get-statistics'),
    getCategories: () => ipcRenderer.invoke('atlas-get-categories'),
    
    // Device management
    discoverDevices: () => ipcRenderer.invoke('atlas-discover-devices'),
    connectDevice: (deviceId, options) => ipcRenderer.invoke('atlas-connect-device', deviceId, options),
    disconnectDevice: (deviceId) => ipcRenderer.invoke('atlas-disconnect-device', deviceId),
    deviceImportStart: (deviceId, options) => ipcRenderer.invoke('atlas-device-import-start', deviceId, options),
    deviceImportStop: (deviceId) => ipcRenderer.invoke('atlas-device-import-stop', deviceId),
    deviceImportSave: (deviceId, options) => ipcRenderer.invoke('atlas-device-import-save', deviceId, options),
    deviceImportUsbBackup: (deviceId, options) => ipcRenderer.invoke('atlas-device-import-usb-backup', deviceId, options),
    deviceImportJunoXSvd: (deviceId, options) => ipcRenderer.invoke('atlas-device-import-junox-svd', deviceId, options),
    
    // Patch operations
    savePatch: (patchData) => ipcRenderer.invoke('atlas-save-patch', patchData),
    loadPatch: (patchId) => ipcRenderer.invoke('atlas-load-patch', patchId),
    sendPatch: (deviceId, patchId, options) => ipcRenderer.invoke('atlas-send-patch', deviceId, patchId, options),
    auditionPatch: (deviceId, patchId, options) => ipcRenderer.invoke('atlas-audition-patch', deviceId, patchId, options),
    readPatch: (deviceId, saveToDB) => ipcRenderer.invoke('atlas-read-patch', deviceId, saveToDB),
    searchPatches: (query) => ipcRenderer.invoke('atlas-search-patches', query),
    deletePatch: (patchId) => ipcRenderer.invoke('atlas-delete-patch', patchId),
    clearLibrary: () => ipcRenderer.invoke('atlas-clear-library'),
    revealPath: (filePath) => ipcRenderer.invoke('atlas-shell-reveal-path', filePath),
    openPath: (filePath) => ipcRenderer.invoke('atlas-shell-open-path', filePath),

    // Patch Sets (Bundles)
    patchSetsCreate: (data) => ipcRenderer.invoke('atlas-patch-sets-create', data),
    patchSetsList: (deviceName) => ipcRenderer.invoke('atlas-patch-sets-list', deviceName),
    patchSetsItems: (setId) => ipcRenderer.invoke('atlas-patch-sets-items', setId),
    patchSetsAdd: (setId, patchIds) => ipcRenderer.invoke('atlas-patch-sets-add', setId, patchIds),
    patchSetsRemove: (setId, patchId) => ipcRenderer.invoke('atlas-patch-sets-remove', setId, patchId),
    patchSetsUpdate: (setId, data) => ipcRenderer.invoke('atlas-patch-sets-update', setId, data),
    patchSetsDelete: (setId) => ipcRenderer.invoke('atlas-patch-sets-delete', setId),
    patchSetsReorder: (setId, orderedPatchIds) => ipcRenderer.invoke('atlas-patch-sets-reorder', setId, orderedPatchIds),
    patchSetsExport: (setId) => ipcRenderer.invoke('atlas-patch-sets-export', setId),
    patchSetsImport: (deviceName) => ipcRenderer.invoke('atlas-patch-sets-import', deviceName),
    
    // Import/Export
    exportPatches: (deviceName) => ipcRenderer.invoke('atlas-export-patches', deviceName),
    importPatches: (exportData) => ipcRenderer.invoke('atlas-import-patches', exportData),
    backupDevice: (deviceId) => ipcRenderer.invoke('atlas-backup-device', deviceId),
    
    // Events from main process
    onInitialized: (callback) => ipcRenderer.on('atlas-initialized', (event, data) => callback(data)),
    onDeviceConnected: (callback) => ipcRenderer.on('device-connected', (event, device) => callback(device)),
    onDeviceDisconnected: (callback) => ipcRenderer.on('device-disconnected', (event, deviceId) => callback(deviceId)),
    onPatchSaved: (callback) => ipcRenderer.on('patch-saved', (event, patch) => callback(patch)),
    onMidiActivity: (callback) => ipcRenderer.on('atlas-midi-activity', (event, payload) => callback(payload)),
    onDeviceImportProgress: (callback) => ipcRenderer.on('atlas-device-import-progress', (event, payload) => callback(payload)),
    
    // Menu events
    onMenuNewPatch: (callback) => ipcRenderer.on('menu-new-patch', () => callback()),
    onMenuImportPatches: (callback) => ipcRenderer.on('menu-import-patches', () => callback()),
    onMenuExportPatches: (callback) => ipcRenderer.on('menu-export-patches', () => callback()),
    onMenuDiscoverDevices: (callback) => ipcRenderer.on('menu-discover-devices', () => callback()),
    onMenuRefreshDevices: (callback) => ipcRenderer.on('menu-refresh-devices', () => callback()),
    onMenuBackupDevice: (callback) => ipcRenderer.on('menu-backup-device', () => callback()),
    onMenuConnectReaper: (callback) => ipcRenderer.on('menu-connect-reaper', () => callback()),
    onMenuConnectAbleton: (callback) => ipcRenderer.on('menu-connect-ableton', () => callback()),
    onMenuConnectLogic: (callback) => ipcRenderer.on('menu-connect-logic', () => callback()),
    onMenuDisconnectDAW: (callback) => ipcRenderer.on('menu-disconnect-daw', () => callback()),
    
    // System info
    platform: process.platform,
    version: appVersion,
    
    // Plugin operations
    discoverPlugins: () => ipcRenderer.invoke('atlas-discover-plugins'),
    extractPluginPresets: (pluginId, options) => ipcRenderer.invoke('atlas-extract-plugin-presets', pluginId, options),
    getPlugins: () => ipcRenderer.invoke('atlas-get-plugins'),
    pluginsSetManufacturer: (pluginId, manufacturer) => ipcRenderer.invoke('atlas-plugins-set-manufacturer', pluginId, manufacturer),
    pluginsEnrichVendors: (options = {}) => ipcRenderer.invoke('atlas-plugins-enrich-vendors', options),

    // Knowledge / Copilot (local-first)
    knowledgeImportFiles: () => ipcRenderer.invoke('atlas-knowledge-import-files'),
    knowledgeSaveDoc: (doc) => ipcRenderer.invoke('atlas-knowledge-save-doc', doc),
    knowledgeListDocs: (limit) => ipcRenderer.invoke('atlas-knowledge-list-docs', limit),
    knowledgeDeleteDoc: (docId) => ipcRenderer.invoke('atlas-knowledge-delete-doc', docId),
    knowledgeSearch: (q, limit) => ipcRenderer.invoke('atlas-knowledge-search', q, limit),
    copilotAsk: (question, context) => ipcRenderer.invoke('atlas-copilot-ask', question, context)
});

// Expose DAW bridge API (for optional DAW integration)
contextBridge.exposeInMainWorld('dawBridge', {
    // Will be implemented for each DAW
    connect: (dawType, config) => ipcRenderer.invoke('daw-bridge-connect', dawType, config),
    disconnect: () => ipcRenderer.invoke('daw-bridge-disconnect'),
    getStatus: () => ipcRenderer.invoke('daw-bridge-get-status'),
    sendCommand: (command, params) => ipcRenderer.invoke('daw-bridge-send-command', command, params),
    
    // Events from DAW
    onDAWConnected: (callback) => ipcRenderer.on('daw-connected', (event, dawInfo) => callback(dawInfo)),
    onDAWDisconnected: (callback) => ipcRenderer.on('daw-disconnected', () => callback()),
    onProjectChanged: (callback) => ipcRenderer.on('daw-project-changed', (event, projectInfo) => callback(projectInfo)),
    onTrackChanged: (callback) => ipcRenderer.on('daw-track-changed', (event, trackInfo) => callback(trackInfo))
});
