/**
 * Audio Settings Configuration Manager
 * Handles microphone/speaker device selection and audio settings
 */

class AudioConfigManager {
    constructor() {
        this.config = this.loadConfig();
        this.availableDevices = {
            input: [],
            output: []
        };
        this.testStream = null;
        this.isTestingMic = false;
    }

    /**
     * Load audio config from localStorage
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('rhea_audio_config');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load audio config:', e);
        }

        // Default config
        return {
            inputDeviceId: 'default',
            outputDeviceId: 'default',
            micSensitivity: 50, // 0-100 scale (maps to VAD threshold)
            autoGainControl: true,
            noiseSuppression: true,
            echoCancellation: true
        };
    }

    /**
     * Save audio config to localStorage
     */
    saveConfig(config) {
        try {
            this.config = { ...this.config, ...config };
            localStorage.setItem('rhea_audio_config', JSON.stringify(this.config));
            console.log('✅ Audio config saved:', this.config);
            return true;
        } catch (e) {
            console.error('Failed to save audio config:', e);
            return false;
        }
    }

    /**
     * Get list of available audio devices
     */
    async getAvailableDevices() {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            this.availableDevices.input = devices
                .filter(d => d.kind === 'audioinput')
                .map(d => ({
                    id: d.deviceId,
                    label: d.label || `Microphone ${d.deviceId.substring(0, 8)}`,
                    isDefault: d.deviceId === 'default'
                }));
            
            this.availableDevices.output = devices
                .filter(d => d.kind === 'audiooutput')
                .map(d => ({
                    id: d.deviceId,
                    label: d.label || `Speaker ${d.deviceId.substring(0, 8)}`,
                    isDefault: d.deviceId === 'default'
                }));
            
            console.log('📊 Available input devices:', this.availableDevices.input);
            console.log('📊 Available output devices:', this.availableDevices.output);
            
            return this.availableDevices;
        } catch (error) {
            console.error('❌ Failed to enumerate devices:', error);
            return { input: [], output: [] };
        }
    }

    /**
     * Test microphone - get audio level for visual feedback
     */
    async startMicTest(deviceId, callback) {
        try {
            this.isTestingMic = true;
            
            const constraints = {
                audio: {
                    deviceId: deviceId === 'default' ? undefined : { exact: deviceId },
                    autoGainControl: this.config.autoGainControl,
                    noiseSuppression: this.config.noiseSuppression,
                    echoCancellation: this.config.echoCancellation
                }
            };
            
            this.testStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(this.testStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const updateLevel = () => {
                if (!this.isTestingMic) {
                    audioContext.close();
                    return;
                }
                
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                const level = Math.min(100, (average / 255) * 100);
                
                if (callback) {
                    callback(level);
                }
                
                requestAnimationFrame(updateLevel);
            };
            
            updateLevel();
            
            console.log('🎤 Mic test started for device:', deviceId);
            return true;
        } catch (error) {
            console.error('❌ Failed to start mic test:', error);
            this.stopMicTest();
            return false;
        }
    }

    /**
     * Stop microphone test
     */
    stopMicTest() {
        this.isTestingMic = false;
        if (this.testStream) {
            this.testStream.getTracks().forEach(track => track.stop());
            this.testStream = null;
        }
        console.log('🛑 Mic test stopped');
    }

    /**
     * Apply settings to voice listener
     * Note: This requires restarting the voice listener to take effect
     */
    async applySettings() {
        // Save config
        this.saveConfig(this.config);
        
        // Notify user to restart voice listening
        return {
            success: true,
            message: 'Settings saved. Please restart voice listening for changes to take effect.'
        };
    }
}

// Export for use in other modules
window.AudioConfigManager = AudioConfigManager;


