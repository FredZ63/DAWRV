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
    executeGotoBar: async (bar) => {
        console.log('🔌 [PRELOAD] executeGotoBar called:', bar);
        try {
            const result = await ipcRenderer.invoke('execute-goto-bar', bar);
            console.log('🔌 [PRELOAD] executeGotoBar result:', result);
            return result;
        } catch (error) {
            console.error('🔌 [PRELOAD] executeGotoBar error:', error);
            return { success: false, error: error.message };
        }
    },
    executeTrackCommand: async (command, trackNumber, value) => {
        console.log('🔌 [PRELOAD] executeTrackCommand called:', command, trackNumber, value);
        try {
            const result = await ipcRenderer.invoke('execute-track-command', command, trackNumber, value);
            console.log('🔌 [PRELOAD] executeTrackCommand result:', result);
            return result;
        } catch (error) {
            console.error('🔌 [PRELOAD] executeTrackCommand error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Screen Awareness
    screenAwarenessStart: (options) => ipcRenderer.invoke('screen-awareness-start', options),
    screenAwarenessStop: () => ipcRenderer.invoke('screen-awareness-stop'),
    screenAwarenessCheckPermission: () => ipcRenderer.invoke('screen-awareness-check-permission'),
    screenAwarenessRequestPermission: () => ipcRenderer.invoke('screen-awareness-request-permission'),
    screenAwarenessSetEnabled: (enabled) => ipcRenderer.invoke('screen-awareness-set-enabled', enabled),
    screenAwarenessSetHoverDelay: (delayMs) => ipcRenderer.invoke('screen-awareness-set-hover-delay', delayMs),
    screenAwarenessGetActiveControl: () => ipcRenderer.invoke('screen-awareness-get-active-control'),
    screenAwarenessGetDescription: () => ipcRenderer.invoke('screen-awareness-get-description'),
    screenAwarenessGetValue: () => ipcRenderer.invoke('screen-awareness-get-value'),
    screenAwarenessClear: () => ipcRenderer.invoke('screen-awareness-clear'),
    
    // Screen Awareness Events
    onScreenElementDetected: (callback) => ipcRenderer.on('screen-element-detected', (event, element) => callback(element)),
    onScreenControlActivated: (callback) => ipcRenderer.on('screen-control-activated', (element) => callback(element)),
    
    // ReaScript Service
    reaScriptStart: () => ipcRenderer.invoke('reascript-start'),
    reaScriptStop: () => ipcRenderer.invoke('reascript-stop'),
    reaScriptSetPollRate: (pollRate) => ipcRenderer.invoke('reascript-set-poll-rate', pollRate),
    onReaScriptControlTouched: (callback) => ipcRenderer.on('reascript-control-touched', (event, controlInfo) => callback(controlInfo)),
    
    // Smart Learning-Based Control Detection
    onControlDetectedSmart: (callback) => ipcRenderer.on('control-detected-smart', (event, identification) => callback(identification)),
    sendControlClicked: (controlInfo) => ipcRenderer.send('control-clicked', controlInfo),
    
    // Voice Feedback Control (prevents microphone picking up RHEA's voice)
    signalSpeaking: (isSpeaking) => ipcRenderer.invoke('signal-speaking', isSpeaking),
    
    // ========================================
    // Voice Engine Switching (Whisper vs ASR)
    // ========================================
    startWhisperEngine: () => ipcRenderer.invoke('voice-engine-start-whisper'),
    startASREngine: (config) => ipcRenderer.invoke('voice-engine-start-asr', config),
    stopAllVoiceEngines: () => ipcRenderer.invoke('voice-engine-stop-all'),
    getActiveVoiceEngine: () => ipcRenderer.invoke('voice-engine-get-active'),
    onVoiceEngineChanged: (callback) => ipcRenderer.on('voice-engine-changed', (event, engine) => callback(engine)),
    
    // Advanced ASR (Automatic Speech Recognition) Service
    startASR: (config) => ipcRenderer.invoke('asr-start', config),
    stopASR: () => ipcRenderer.invoke('asr-stop'),
    pauseASR: () => ipcRenderer.invoke('asr-pause'),
    resumeASR: () => ipcRenderer.invoke('asr-resume'),
    getASRStatus: () => ipcRenderer.invoke('asr-get-status'),
    setASRMode: (mode) => ipcRenderer.invoke('asr-set-mode', mode),
    setASRModel: (modelSize) => ipcRenderer.invoke('asr-set-model', modelSize),
    updateASRConfig: (config) => ipcRenderer.invoke('asr-update-config', config),
    getASRVocabulary: () => ipcRenderer.invoke('asr-get-vocabulary'),
    updateASRVocabulary: (vocab) => ipcRenderer.invoke('asr-update-vocabulary', vocab),
    getASRProfiles: () => ipcRenderer.invoke('asr-get-profiles'),
    setASRActiveProfile: (profileName) => ipcRenderer.invoke('asr-set-active-profile', profileName),
    
    // ASR Events
    onASRTranscript: (callback) => ipcRenderer.on('asr-transcript', (event, data) => callback(data)),
    onASRStarted: (callback) => ipcRenderer.on('asr-started', () => callback()),
    onASRStopped: (callback) => ipcRenderer.on('asr-stopped', (event, code) => callback(code)),
    onASRError: (callback) => ipcRenderer.on('asr-error', (event, error) => callback(error)),
    onASRModeChanged: (callback) => ipcRenderer.on('asr-mode-changed', (event, mode) => callback(mode))
});

contextBridge.exposeInMainWorld('plugins', {
    // Simple single call that gets everything at once
    getAll: () => ipcRenderer.invoke('get-all-plugins')
});

// Overlay API
contextBridge.exposeInMainWorld('overlay', {
    toggle: () => ipcRenderer.send('overlay-toggle'),
    show: () => ipcRenderer.send('overlay-show'),
    close: () => ipcRenderer.send('overlay-close'),
    updateSpeech: (text) => ipcRenderer.send('overlay-update-speech', text),
    updateListening: (isListening) => ipcRenderer.send('overlay-update-listening', isListening),
    updateScreenAwareness: (isEnabled) => ipcRenderer.send('overlay-update-screen-awareness', isEnabled),
    updateControl: (controlInfo) => ipcRenderer.send('overlay-update-control', controlInfo),
    updateTransportState: (state) => ipcRenderer.send('overlay-update-transport', state)
});
