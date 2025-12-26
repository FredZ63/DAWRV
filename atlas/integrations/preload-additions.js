/**
 * ATLAS Preload Additions
 * Add this to your existing preload.js
 */

// Add to your existing contextBridge.exposeInMainWorld calls:

contextBridge.exposeInMainWorld('atlas', {
    // Initialization
    initialize: () => ipcRenderer.invoke('atlas-initialize'),
    
    // Device Management
    discoverDevices: () => ipcRenderer.invoke('atlas-discover-devices'),
    connectDevice: (deviceId) => ipcRenderer.invoke('atlas-connect-device', deviceId),
    disconnectDevice: (deviceId) => ipcRenderer.invoke('atlas-disconnect-device', deviceId),
    
    // Patch Management
    savePatch: (patchData) => ipcRenderer.invoke('atlas-save-patch', patchData),
    loadPatch: (patchId) => ipcRenderer.invoke('atlas-load-patch', patchId),
    sendPatch: (deviceId, patchId, options) => ipcRenderer.invoke('atlas-send-patch', deviceId, patchId, options),
    readPatch: (deviceId, saveToDB) => ipcRenderer.invoke('atlas-read-patch', deviceId, saveToDB),
    
    // Search & Organization
    searchPatches: (query) => ipcRenderer.invoke('atlas-search-patches', query),
    deletePatch: (patchId) => ipcRenderer.invoke('atlas-delete-patch', patchId),
    
    // Import/Export
    exportPatches: (deviceName) => ipcRenderer.invoke('atlas-export-patches', deviceName),
    importPatches: (exportData) => ipcRenderer.invoke('atlas-import-patches', exportData),
    backupDevice: (deviceId) => ipcRenderer.invoke('atlas-backup-device', deviceId),
    
    // Info
    getProtocolInfo: () => ipcRenderer.invoke('atlas-get-protocol-info'),
    getStatistics: () => ipcRenderer.invoke('atlas-get-statistics'),
    
    // Lifecycle
    shutdown: () => ipcRenderer.invoke('atlas-shutdown')
});
