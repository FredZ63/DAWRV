/**
 * Audio Settings UI Component
 * Provides a professional settings panel for audio device selection
 */

class AudioSettingsUI {
    constructor(audioConfig) {
        this.audioConfig = audioConfig;
        this.container = null;
        this.isOpen = false;
    }

    /**
     * Initialize the audio settings UI
     */
    async init() {
        // Create the settings panel
        this.createPanel();
        
        // Load devices
        await this.refreshDevices();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Audio Settings UI initialized');
    }

    /**
     * Create the settings panel HTML
     */
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'audio-settings-panel';
        panel.className = 'settings-panel';
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="settings-overlay" id="audio-settings-overlay"></div>
            <div class="settings-modal">
                <div class="settings-header">
                    <h2>🎤 Audio Settings</h2>
                    <button class="close-btn" id="close-audio-settings">✕</button>
                </div>
                
                <div class="settings-content">
                    <!-- Microphone Selection -->
                    <div class="setting-group">
                        <label for="input-device">
                            <span class="setting-label">🎙️ Microphone</span>
                            <span class="setting-desc">Select your input device</span>
                        </label>
                        <select id="input-device" class="device-select">
                            <option value="">Loading devices...</option>
                        </select>
                    </div>

                    <!-- Speaker Selection -->
                    <div class="setting-group">
                        <label for="output-device">
                            <span class="setting-label">🔊 Speakers/Headphones</span>
                            <span class="setting-desc">Select your output device</span>
                        </label>
                        <select id="output-device" class="device-select">
                            <option value="">Loading devices...</option>
                        </select>
                    </div>

                    <!-- Microphone Test -->
                    <div class="setting-group">
                        <label>
                            <span class="setting-label">🎚️ Microphone Test</span>
                            <span class="setting-desc">Test your microphone level</span>
                        </label>
                        <button id="test-mic-btn" class="test-btn">🎤 Test Microphone</button>
                        <div class="mic-level-container" id="mic-level-container" style="display: none;">
                            <div class="mic-level-bar">
                                <div class="mic-level-fill" id="mic-level-fill"></div>
                            </div>
                            <span class="mic-level-text" id="mic-level-text">0%</span>
                        </div>
                    </div>

                    <!-- Microphone Sensitivity -->
                    <div class="setting-group">
                        <label for="mic-sensitivity">
                            <span class="setting-label">📊 Microphone Sensitivity</span>
                            <span class="setting-desc">Adjust detection threshold (lower = more sensitive)</span>
                        </label>
                        <div class="slider-container">
                            <input type="range" id="mic-sensitivity" min="1" max="100" value="50" class="slider">
                            <span class="slider-value" id="sensitivity-value">50</span>
                        </div>
                    </div>

                    <!-- Audio Processing Options -->
                    <div class="setting-group">
                        <label>
                            <span class="setting-label">⚙️ Audio Processing</span>
                            <span class="setting-desc">Enable audio enhancements</span>
                        </label>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-gain-control" checked>
                                <span>Auto Gain Control</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="noise-suppression" checked>
                                <span>Noise Suppression</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="echo-cancellation" checked>
                                <span>Echo Cancellation</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <button id="refresh-devices-btn" class="secondary-btn">🔄 Refresh Devices</button>
                    <button id="save-audio-settings" class="primary-btn">💾 Save Settings</button>
                </div>

                <div class="settings-note">
                    💡 <strong>Note:</strong> Voice listening must be restarted for device changes to take effect.
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.container = panel;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        document.getElementById('close-audio-settings').addEventListener('click', () => {
            this.close();
        });

        // Overlay click to close
        document.getElementById('audio-settings-overlay').addEventListener('click', () => {
            this.close();
        });

        // Save button
        document.getElementById('save-audio-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Refresh devices button
        document.getElementById('refresh-devices-btn').addEventListener('click', () => {
            this.refreshDevices();
        });

        // Test mic button
        const testBtn = document.getElementById('test-mic-btn');
        testBtn.addEventListener('click', () => {
            if (this.audioConfig.isTestingMic) {
                this.stopMicTest();
            } else {
                this.startMicTest();
            }
        });

        // Sensitivity slider
        document.getElementById('mic-sensitivity').addEventListener('input', (e) => {
            document.getElementById('sensitivity-value').textContent = e.target.value;
        });
    }

    /**
     * Refresh device list
     */
    async refreshDevices() {
        const devices = await this.audioConfig.getAvailableDevices();
        
        // Populate input devices
        const inputSelect = document.getElementById('input-device');
        inputSelect.innerHTML = '';
        
        if (devices.input.length === 0) {
            inputSelect.innerHTML = '<option value="">No microphones found</option>';
        } else {
            devices.input.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.label + (device.isDefault ? ' (Default)' : '');
                if (device.id === this.audioConfig.config.inputDeviceId) {
                    option.selected = true;
                }
                inputSelect.appendChild(option);
            });
        }

        // Populate output devices
        const outputSelect = document.getElementById('output-device');
        outputSelect.innerHTML = '';
        
        if (devices.output.length === 0) {
            outputSelect.innerHTML = '<option value="">No speakers found</option>';
        } else {
            devices.output.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.label + (device.isDefault ? ' (Default)' : '');
                if (device.id === this.audioConfig.config.outputDeviceId) {
                    option.selected = true;
                }
                outputSelect.appendChild(option);
            });
        }

        console.log('🔄 Devices refreshed');
    }

    /**
     * Start microphone test
     */
    async startMicTest() {
        const deviceId = document.getElementById('input-device').value;
        const testBtn = document.getElementById('test-mic-btn');
        const levelContainer = document.getElementById('mic-level-container');
        const levelFill = document.getElementById('mic-level-fill');
        const levelText = document.getElementById('mic-level-text');

        testBtn.textContent = '🛑 Stop Test';
        testBtn.classList.add('testing');
        levelContainer.style.display = 'flex';

        await this.audioConfig.startMicTest(deviceId, (level) => {
            levelFill.style.width = `${level}%`;
            levelText.textContent = `${Math.round(level)}%`;
            
            // Color code the level
            if (level < 10) {
                levelFill.style.background = '#666';
            } else if (level < 30) {
                levelFill.style.background = '#4a9eff';
            } else if (level < 70) {
                levelFill.style.background = '#4CAF50';
            } else {
                levelFill.style.background = '#ff9800';
            }
        });
    }

    /**
     * Stop microphone test
     */
    stopMicTest() {
        this.audioConfig.stopMicTest();
        
        const testBtn = document.getElementById('test-mic-btn');
        const levelContainer = document.getElementById('mic-level-container');
        
        testBtn.textContent = '🎤 Test Microphone';
        testBtn.classList.remove('testing');
        levelContainer.style.display = 'none';
    }

    /**
     * Save settings
     */
    async saveSettings() {
        const config = {
            inputDeviceId: document.getElementById('input-device').value,
            outputDeviceId: document.getElementById('output-device').value,
            micSensitivity: parseInt(document.getElementById('mic-sensitivity').value),
            autoGainControl: document.getElementById('auto-gain-control').checked,
            noiseSuppression: document.getElementById('noise-suppression').checked,
            echoCancellation: document.getElementById('echo-cancellation').checked
        };

        const result = await this.audioConfig.applySettings();
        
        if (result.success) {
            // Show success message
            alert('✅ Audio settings saved!\n\nPlease restart voice listening for changes to take effect.');
            this.close();
        } else {
            alert('❌ Failed to save audio settings. Please try again.');
        }
    }

    /**
     * Open the settings panel
     */
    open() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isOpen = true;
            
            // Load current settings
            this.loadCurrentSettings();
        }
    }

    /**
     * Close the settings panel
     */
    close() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isOpen = false;
            
            // Stop mic test if running
            if (this.audioConfig.isTestingMic) {
                this.stopMicTest();
            }
        }
    }

    /**
     * Load current settings into UI
     */
    loadCurrentSettings() {
        const config = this.audioConfig.config;
        
        document.getElementById('mic-sensitivity').value = config.micSensitivity;
        document.getElementById('sensitivity-value').textContent = config.micSensitivity;
        document.getElementById('auto-gain-control').checked = config.autoGainControl;
        document.getElementById('noise-suppression').checked = config.noiseSuppression;
        document.getElementById('echo-cancellation').checked = config.echoCancellation;
    }
}

// Export for use in other modules
window.AudioSettingsUI = AudioSettingsUI;

