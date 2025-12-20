/**
 * ATLAS - Preload Script
 * Exposes safe APIs to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose ATLAS API to renderer
contextBridge.exposeInMainWorld('atlas', {
    // Core initialization
    initialize: () => ipcRenderer.invoke('atlas-initialize'),
    getProtocolInfo: () => ipcRenderer.invoke('atlas-get-protocol-info'),
    getStatistics: () => ipcRenderer.invoke('atlas-get-statistics'),
    
    // Device management
    discoverDevices: () => ipcRenderer.invoke('atlas-discover-devices'),
    connectDevice: (deviceId) => ipcRenderer.invoke('atlas-connect-device', deviceId),
    disconnectDevice: (deviceId) => ipcRenderer.invoke('atlas-disconnect-device', deviceId),
    
    // Patch operations
    savePatch: (patchData) => ipcRenderer.invoke('atlas-save-patch', patchData),
    loadPatch: (patchId) => ipcRenderer.invoke('atlas-load-patch', patchId),
    sendPatch: (deviceId, patchId, options) => ipcRenderer.invoke('atlas-send-patch', deviceId, patchId, options),
    readPatch: (deviceId, saveToDB) => ipcRenderer.invoke('atlas-read-patch', deviceId, saveToDB),
    searchPatches: (query) => ipcRenderer.invoke('atlas-search-patches', query),
    deletePatch: (patchId) => ipcRenderer.invoke('atlas-delete-patch', patchId),
    
    // Import/Export
    exportPatches: (deviceName) => ipcRenderer.invoke('atlas-export-patches', deviceName),
    importPatches: (exportData) => ipcRenderer.invoke('atlas-import-patches', exportData),
    backupDevice: (deviceId) => ipcRenderer.invoke('atlas-backup-device', deviceId),
    
    // Events from main process
    onInitialized: (callback) => ipcRenderer.on('atlas-initialized', (event, data) => callback(data)),
    onDeviceConnected: (callback) => ipcRenderer.on('device-connected', (event, device) => callback(device)),
    onDeviceDisconnected: (callback) => ipcRenderer.on('device-disconnected', (event, deviceId) => callback(deviceId)),
    onPatchSaved: (callback) => ipcRenderer.on('patch-saved', (event, patch) => callback(patch)),
    
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
    version: '1.0.0'
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
