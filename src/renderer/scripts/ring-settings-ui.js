/**
 * Ring Settings UI Component
 * Provides controls for transport ring brightness and pulse speed
 */

class RingSettingsUI {
    constructor() {
        this.container = null;
        this.isOpen = false;
        this.settings = this.loadSettings();
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const defaults = {
            playingBrightness: 1.0,
            playingPulseSpeed: 2.0,
            recordingBrightness: 1.0,
            recordingPulseSpeed: 0.8,
            stoppedBrightness: 0.9
        };
        
        try {
            const saved = localStorage.getItem('rhea_ring_settings');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch {
            return defaults;
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('rhea_ring_settings', JSON.stringify(this.settings));
        this.applySettings();
    }

    /**
     * Apply settings to avatar
     */
    applySettings() {
        const avatar = document.querySelector('.rhea-avatar');
        if (!avatar) return;
        
        avatar.style.setProperty('--playing-brightness', this.settings.playingBrightness);
        avatar.style.setProperty('--playing-pulse-speed', this.settings.playingPulseSpeed + 's');
        avatar.style.setProperty('--recording-brightness', this.settings.recordingBrightness);
        avatar.style.setProperty('--recording-pulse-speed', this.settings.recordingPulseSpeed + 's');
        avatar.style.setProperty('--stopped-brightness', this.settings.stoppedBrightness);
        
        console.log('✅ Ring settings applied:', this.settings);
    }

    /**
     * Initialize the ring settings UI
     */
    async init() {
        this.createPanel();
        this.setupEventListeners();
        this.applySettings(); // Apply saved settings immediately
        console.log('✅ Ring Settings UI initialized');
    }

    /**
     * Create the settings panel HTML
     */
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'ring-settings-panel';
        panel.className = 'settings-panel';
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="settings-overlay" id="ring-settings-overlay"></div>
            <div class="settings-modal">
                <div class="settings-header">
                    <h2>💫 Transport Ring Settings</h2>
                    <button class="close-btn" id="close-ring-settings">✕</button>
                </div>
                
                <div class="settings-content">
                    <!-- Playing (Green) Settings -->
                    <div class="setting-section">
                        <h3>🟢 Playing (Green Ring)</h3>
                        
                        <div class="setting-group">
                            <label for="playing-brightness">
                                <span class="setting-label">💡 Brightness</span>
                                <span class="setting-desc">How bright the green ring glows</span>
                            </label>
                            <div class="slider-container">
                                <input type="range" id="playing-brightness" min="0.3" max="2.0" step="0.1" value="${this.settings.playingBrightness}" class="slider">
                                <span class="slider-value" id="playing-brightness-value">${this.settings.playingBrightness}x</span>
                            </div>
                        </div>

                        <div class="setting-group">
                            <label for="playing-pulse-speed">
                                <span class="setting-label">⚡ Pulse Speed</span>
                                <span class="setting-desc">How fast the ring pulses (lower = faster)</span>
                            </label>
                            <div class="slider-container">
                                <input type="range" id="playing-pulse-speed" min="0.5" max="5.0" step="0.1" value="${this.settings.playingPulseSpeed}" class="slider">
                                <span class="slider-value" id="playing-pulse-speed-value">${this.settings.playingPulseSpeed}s</span>
                            </div>
                        </div>
                    </div>

                    <!-- Recording (Red) Settings -->
                    <div class="setting-section">
                        <h3>🔴 Recording (Red Ring)</h3>
                        
                        <div class="setting-group">
                            <label for="recording-brightness">
                                <span class="setting-label">💡 Brightness</span>
                                <span class="setting-desc">How bright the red ring glows</span>
                            </label>
                            <div class="slider-container">
                                <input type="range" id="recording-brightness" min="0.3" max="2.0" step="0.1" value="${this.settings.recordingBrightness}" class="slider">
                                <span class="slider-value" id="recording-brightness-value">${this.settings.recordingBrightness}x</span>
                            </div>
                        </div>

                        <div class="setting-group">
                            <label for="recording-pulse-speed">
                                <span class="setting-label">⚡ Pulse Speed</span>
                                <span class="setting-desc">How fast the ring pulses (lower = faster)</span>
                            </label>
                            <div class="slider-container">
                                <input type="range" id="recording-pulse-speed" min="0.3" max="3.0" step="0.1" value="${this.settings.recordingPulseSpeed}" class="slider">
                                <span class="slider-value" id="recording-pulse-speed-value">${this.settings.recordingPulseSpeed}s</span>
                            </div>
                        </div>
                    </div>

                    <!-- Stopped (White) Settings -->
                    <div class="setting-section">
                        <h3>⚪ Stopped/Paused (White Ring)</h3>
                        
                        <div class="setting-group">
                            <label for="stopped-brightness">
                                <span class="setting-label">💡 Brightness</span>
                                <span class="setting-desc">How bright the white ring glows</span>
                            </label>
                            <div class="slider-container">
                                <input type="range" id="stopped-brightness" min="0.3" max="2.0" step="0.1" value="${this.settings.stoppedBrightness}" class="slider">
                                <span class="slider-value" id="stopped-brightness-value">${this.settings.stoppedBrightness}x</span>
                            </div>
                        </div>
                    </div>

                    <!-- Reset Button -->
                    <div class="setting-group">
                        <button id="reset-ring-settings" class="secondary-btn">
                            🔄 Reset to Defaults
                        </button>
                    </div>

                    <!-- Test Buttons -->
                    <div class="setting-section">
                        <h3>🧪 Test Your Settings</h3>
                        <div class="test-buttons">
                            <button class="test-btn" data-test="stopped">⚪ Test White (Stopped)</button>
                            <button class="test-btn" data-test="playing">🟢 Test Green (Playing)</button>
                            <button class="test-btn" data-test="recording">🔴 Test Red (Recording)</button>
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <button class="primary-btn" id="save-ring-settings">💾 Save Settings</button>
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
        const closeBtn = document.getElementById('close-ring-settings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Overlay click
        const overlay = document.getElementById('ring-settings-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }

        // Sliders
        this.setupSlider('playing-brightness', (value) => {
            this.settings.playingBrightness = parseFloat(value);
        });

        this.setupSlider('playing-pulse-speed', (value) => {
            this.settings.playingPulseSpeed = parseFloat(value);
        });

        this.setupSlider('recording-brightness', (value) => {
            this.settings.recordingBrightness = parseFloat(value);
        });

        this.setupSlider('recording-pulse-speed', (value) => {
            this.settings.recordingPulseSpeed = parseFloat(value);
        });

        this.setupSlider('stopped-brightness', (value) => {
            this.settings.stoppedBrightness = parseFloat(value);
        });

        // Save button
        const saveBtn = document.getElementById('save-ring-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
                this.showSuccess();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('reset-ring-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }

        // Test buttons
        document.querySelectorAll('[data-test]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const state = e.target.dataset.test;
                if (window.rhea) {
                    window.rhea.updateTransportState(state);
                }
            });
        });
    }

    /**
     * Setup a slider with live preview
     */
    setupSlider(id, onChange) {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(id + '-value');
        
        if (!slider || !valueDisplay) return;

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const suffix = id.includes('speed') ? 's' : 'x';
            valueDisplay.textContent = value + suffix;
            onChange(value);
            this.applySettings(); // Live preview
        });
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.settings = {
            playingBrightness: 1.0,
            playingPulseSpeed: 2.0,
            recordingBrightness: 1.0,
            recordingPulseSpeed: 0.8,
            stoppedBrightness: 0.9
        };

        // Update sliders
        document.getElementById('playing-brightness').value = this.settings.playingBrightness;
        document.getElementById('playing-brightness-value').textContent = this.settings.playingBrightness + 'x';
        
        document.getElementById('playing-pulse-speed').value = this.settings.playingPulseSpeed;
        document.getElementById('playing-pulse-speed-value').textContent = this.settings.playingPulseSpeed + 's';
        
        document.getElementById('recording-brightness').value = this.settings.recordingBrightness;
        document.getElementById('recording-brightness-value').textContent = this.settings.recordingBrightness + 'x';
        
        document.getElementById('recording-pulse-speed').value = this.settings.recordingPulseSpeed;
        document.getElementById('recording-pulse-speed-value').textContent = this.settings.recordingPulseSpeed + 's';
        
        document.getElementById('stopped-brightness').value = this.settings.stoppedBrightness;
        document.getElementById('stopped-brightness-value').textContent = this.settings.stoppedBrightness + 'x';

        this.applySettings();
    }

    /**
     * Show success message
     */
    showSuccess() {
        const saveBtn = document.getElementById('save-ring-settings');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✅ Saved!';
            saveBtn.style.background = '#4caf50';
            
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
            }, 2000);
        }
    }

    /**
     * Open the settings panel
     */
    open() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isOpen = true;
        }
    }

    /**
     * Close the settings panel
     */
    close() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isOpen = false;
        }
    }
}

// Export for use in other scripts
window.RingSettingsUI = RingSettingsUI;



