const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dawrv', {
    voice: {
        startListening: () => ipcRenderer.invoke('start-voice-listening'),
        stopListening: () => ipcRenderer.invoke('stop-voice-listening'),
        onTranscript: (callback) => ipcRenderer.on('voice-transcript', (event, data) => callback(data)),
        onEngineReady: (callback) => ipcRenderer.on('voice-engine-ready', () => callback()),
        onError: (callback) => ipcRenderer.on('voice-engine-error', (event, error) => callback(error)),
        onCommand: (callback) => ipcRenderer.on('voice-command', (event, command) => callback(command)),
        onReaperLog: (callback) => ipcRenderer.on('reaper-action-log', (event, message) => callback(message)),
        onDawState: (callback) => ipcRenderer.on('daw-state-update', (event, state) => callback(state))
    },
    daw: {
        sendCommand: (command, params) => ipcRenderer.invoke('send-daw-command', command, params)
    },
    platform: process.platform,
    version: '1.0.0'
});

contextBridge.exposeInMainWorld('midi2', {
    initialize: () => ipcRenderer.invoke('midi2-initialize'),
    discoverDevices: () => ipcRenderer.invoke('midi2-discover-devices'),
    openInput: (deviceId) => ipcRenderer.invoke('midi2-open-input', deviceId),
    openOutput: (deviceId) => ipcRenderer.invoke('midi2-open-output', deviceId),
    sendPreciseValue: (deviceId, parameter, value, options) => 
        ipcRenderer.invoke('midi2-send-precise-value', deviceId, parameter, value, options),
    queryProperty: (deviceId, property) => 
        ipcRenderer.invoke('midi2-query-property', deviceId, property),
    getDeviceState: (deviceId) => 
        ipcRenderer.invoke('midi2-get-device-state', deviceId),
    closeInput: (deviceId) => ipcRenderer.invoke('midi2-close-input', deviceId),
    closeOutput: (deviceId) => ipcRenderer.invoke('midi2-close-output', deviceId),
    onDevicesDiscovered: (callback) => 
        ipcRenderer.on('midi2-devices-discovered', (event, devices) => callback(devices)),
    onMessageSent: (callback) => 
        ipcRenderer.on('midi2-message-sent', (event, data) => callback(data))
});

contextBridge.exposeInMainWorld('api', {
    executeReaperAction: (actionId) => {
        console.log('🔌 [PRELOAD] executeReaperAction called with:', actionId);
        console.log('🔌 [PRELOAD] actionId type:', typeof actionId);
        const result = ipcRenderer.invoke('execute-reaper-action', actionId.toString());
        console.log('🔌 [PRELOAD] IPC invoke returned promise');
        result.then(
            (res) => {
                console.log('🔌 [PRELOAD] IPC result resolved:', res);
            },
            (err) => {
                console.error('🔌 [PRELOAD] IPC result rejected:', err);
            }
        );
        return result;
    },
    executeTempoCommand: (command, value) => {
        console.log('🔌 [PRELOAD] executeTempoCommand called:', command, value);
        const result = ipcRenderer.invoke('execute-tempo-command', command, value);
        console.log('🔌 [PRELOAD] executeTempoCommand IPC invoke returned promise');
        result.then(
            (res) => {
                console.log('🔌 [PRELOAD] executeTempoCommand result:', res);
            },
            (err) => {
                console.error('🔌 [PRELOAD] executeTempoCommand error:', err);
            }
        );
        return result;
    },
    executeMeasureCommand: (command, value, value2) => {
        console.log('🔌 [PRELOAD] executeMeasureCommand called:', command, value, value2);
        const result = ipcRenderer.invoke('execute-measure-command', command, value, value2);
        result.then(
            (res) => console.log('🔌 [PRELOAD] executeMeasureCommand result:', res),
            (err) => console.error('🔌 [PRELOAD] executeMeasureCommand error:', err)
        );
        return result;
    },
    executeGotoBar: (bar) => {
        console.log('🔌 [PRELOAD] executeGotoBar called:', bar);
        return ipcRenderer.invoke('execute-goto-bar', bar);
    }
});

contextBridge.exposeInMainWorld('plugins', {
    // Simple single call that gets everything at once
    getAll: () => ipcRenderer.invoke('get-all-plugins')
});
