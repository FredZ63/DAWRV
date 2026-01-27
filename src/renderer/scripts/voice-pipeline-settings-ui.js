/**
 * Voice Pipeline Settings UI
 * ==========================
 * Settings panel for voice pipeline configuration:
 * - VAD thresholds
 * - Confidence thresholds
 * - HUD settings
 * - REAPER connection
 * - Test runner
 */

class VoicePipelineSettingsUI {
    constructor(integration, options = {}) {
        this.integration = integration;
        this.healthCheck = null;
        this.options = {
            containerId: options.containerId || 'voice-pipeline-settings',
            ...options
        };
        
        this.settings = this.loadSettings();
        
        console.log('⚙️ Voice Pipeline Settings UI initialized');
    }
    
    /**
     * Create and show the settings modal
     */
    show() {
        this.createModal();
    }
    
    /**
     * Hide the settings modal
     */
    hide() {
        const modal = document.getElementById('voice-pipeline-settings-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Create the settings modal
     */
    createModal() {
        // Remove existing
        this.hide();
        
        const modal = document.createElement('div');
        modal.id = 'voice-pipeline-settings-modal';
        modal.className = 'vps-modal';
        
        modal.innerHTML = `
            <div class="vps-modal-backdrop" onclick="window.voicePipelineSettings?.hide()"></div>
            <div class="vps-modal-content">
                <div class="vps-modal-header">
                    <h2>🎙️ Voice Pipeline Settings</h2>
                    <button class="vps-close-btn" onclick="window.voicePipelineSettings?.hide()">×</button>
                </div>
                
                <div class="vps-modal-body">
                    <!-- Tabs -->
                    <div class="vps-tabs">
                        <button class="vps-tab active" data-tab="general">General</button>
                        <button class="vps-tab" data-tab="vad">VAD</button>
                        <button class="vps-tab" data-tab="hud">HUD</button>
                        <button class="vps-tab" data-tab="reaper">REAPER</button>
                        <button class="vps-tab" data-tab="test">Test</button>
                    </div>
                    
                    <!-- General Tab -->
                    <div class="vps-tab-content active" id="tab-general">
                        <div class="vps-section">
                            <h3>Confidence Thresholds</h3>
                            
                            <div class="vps-field">
                                <label for="confidence-threshold">
                                    Minimum Confidence
                                    <span class="vps-value" id="confidence-threshold-value">${this.settings.confidenceThreshold * 100}%</span>
                                </label>
                                <input type="range" id="confidence-threshold" 
                                    min="30" max="95" step="5" 
                                    value="${this.settings.confidenceThreshold * 100}">
                                <p class="vps-hint">Below this, commands are rejected.</p>
                            </div>
                            
                            <div class="vps-field">
                                <label for="confirmation-threshold">
                                    Confirmation Threshold
                                    <span class="vps-value" id="confirmation-threshold-value">${this.settings.confirmationThreshold * 100}%</span>
                                </label>
                                <input type="range" id="confirmation-threshold" 
                                    min="50" max="99" step="5" 
                                    value="${this.settings.confirmationThreshold * 100}">
                                <p class="vps-hint">Below this, ask for confirmation before executing.</p>
                            </div>
                        </div>
                        
                        <div class="vps-section">
                            <h3>Cancel Window</h3>
                            
                            <div class="vps-field">
                                <label for="cancel-window">
                                    Cancel Window Duration
                                    <span class="vps-value" id="cancel-window-value">${this.settings.cancelWindowMs}ms</span>
                                </label>
                                <input type="range" id="cancel-window" 
                                    min="0" max="2000" step="100" 
                                    value="${this.settings.cancelWindowMs}">
                                <p class="vps-hint">Time to say "cancel" before execution.</p>
                            </div>
                            
                            <div class="vps-field vps-toggle">
                                <label>
                                    <input type="checkbox" id="enable-cancel-window" 
                                        ${this.settings.enableCancelWindow ? 'checked' : ''}>
                                    <span>Enable Cancel Window</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="vps-section">
                            <h3>Features</h3>
                            
                            <div class="vps-field vps-toggle">
                                <label>
                                    <input type="checkbox" id="enable-barge-in" 
                                        ${this.settings.enableBargeIn ? 'checked' : ''}>
                                    <span>Enable Barge-In (interrupt TTS by speaking)</span>
                                </label>
                            </div>
                            
                            <div class="vps-field vps-toggle">
                                <label>
                                    <input type="checkbox" id="enable-two-pass" 
                                        ${this.settings.enableTwoPassASR ? 'checked' : ''}>
                                    <span>Enable Two-Pass ASR (interim + final)</span>
                                </label>
                            </div>
                            
                            <div class="vps-field vps-toggle">
                                <label>
                                    <input type="checkbox" id="wake-word-required" 
                                        ${this.settings.wakeWordRequired ? 'checked' : ''}>
                                    <span>Require Wake Word ("Hey RHEA")</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- VAD Tab -->
                    <div class="vps-tab-content" id="tab-vad">
                        <div class="vps-section">
                            <h3>Voice Activity Detection</h3>
                            
                            <div class="vps-field">
                                <label for="vad-threshold">
                                    RMS Threshold
                                    <span class="vps-value" id="vad-threshold-value">${this.settings.vad?.rmsThreshold || 320}</span>
                                </label>
                                <input type="range" id="vad-threshold" 
                                    min="100" max="1000" step="20" 
                                    value="${this.settings.vad?.rmsThreshold || 320}">
                                <p class="vps-hint">Lower = more sensitive, higher = less false triggers.</p>
                            </div>
                            
                            <div class="vps-field">
                                <label for="end-utterance">
                                    End Utterance Silence
                                    <span class="vps-value" id="end-utterance-value">${this.settings.vad?.endUtteranceSilenceMs || 700}ms</span>
                                </label>
                                <input type="range" id="end-utterance" 
                                    min="300" max="2000" step="100" 
                                    value="${this.settings.vad?.endUtteranceSilenceMs || 700}">
                                <p class="vps-hint">How long to wait after speech stops. Lower = faster, may cut off.</p>
                            </div>
                            
                            <div class="vps-field">
                                <label for="min-speech">
                                    Minimum Speech Duration
                                    <span class="vps-value" id="min-speech-value">${this.settings.vad?.minSpeechDurationMs || 150}ms</span>
                                </label>
                                <input type="range" id="min-speech" 
                                    min="50" max="500" step="25" 
                                    value="${this.settings.vad?.minSpeechDurationMs || 150}">
                                <p class="vps-hint">Ignore sounds shorter than this.</p>
                            </div>
                        </div>
                        
                        <div class="vps-section">
                            <h3>Audio Level Monitor</h3>
                            <div class="vps-level-meter">
                                <div class="vps-level-bar" id="vps-level-bar"></div>
                                <div class="vps-level-threshold" id="vps-level-threshold" style="left: 32%;"></div>
                            </div>
                            <div class="vps-level-labels">
                                <span>0</span>
                                <span>Threshold</span>
                                <span>1000</span>
                            </div>
                            <p class="vps-hint">Speak to test. Green = speech detected.</p>
                        </div>
                    </div>
                    
                    <!-- HUD Tab -->
                    <div class="vps-tab-content" id="tab-hud">
                        <div class="vps-section">
                            <h3>Command HUD</h3>
                            
                            <div class="vps-field vps-toggle">
                                <label>
                                    <input type="checkbox" id="hud-enabled" 
                                        ${this.settings.hud?.enabled !== false ? 'checked' : ''}>
                                    <span>Show Command HUD</span>
                                </label>
                            </div>
                            
                            <div class="vps-field">
                                <label for="hud-position">Position</label>
                                <select id="hud-position">
                                    <option value="top-right" ${this.settings.hud?.position === 'top-right' ? 'selected' : ''}>Top Right</option>
                                    <option value="top-left" ${this.settings.hud?.position === 'top-left' ? 'selected' : ''}>Top Left</option>
                                    <option value="bottom-right" ${this.settings.hud?.position === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
                                    <option value="bottom-left" ${this.settings.hud?.position === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
                                </select>
                            </div>
                            
                            <div class="vps-field vps-toggle">
                                <label>
                                    <input type="checkbox" id="hud-metrics" 
                                        ${this.settings.hud?.showMetrics !== false ? 'checked' : ''}>
                                    <span>Show Metrics</span>
                                </label>
                            </div>
                            
                            <div class="vps-field vps-toggle">
                                <label>
                                    <input type="checkbox" id="hud-log" 
                                        ${this.settings.hud?.showLog ? 'checked' : ''}>
                                    <span>Show Log</span>
                                </label>
                            </div>
                            
                            <div class="vps-field vps-toggle">
                                <label>
                                    <input type="checkbox" id="hud-compact" 
                                        ${this.settings.hud?.compact ? 'checked' : ''}>
                                    <span>Compact Mode</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- REAPER Tab -->
                    <div class="vps-tab-content" id="tab-reaper">
                        <div class="vps-section">
                            <h3>REAPER Connection</h3>
                            
                            <div class="vps-status-box" id="reaper-status">
                                <div class="vps-status-icon">⏳</div>
                                <div class="vps-status-text">Checking connection...</div>
                            </div>
                            
                            <button class="vps-btn" onclick="window.voicePipelineSettings?.runHealthCheck()">
                                🔄 Run Health Check
                            </button>
                        </div>
                        
                        <div class="vps-section">
                            <h3>Connection Settings</h3>
                            
                            <div class="vps-field">
                                <label for="reaper-port">HTTP Port</label>
                                <input type="number" id="reaper-port" value="${this.settings.reaper?.httpPort || 8080}">
                            </div>
                            
                            <div class="vps-troubleshooting" id="reaper-troubleshooting" style="display: none;">
                                <h4>Troubleshooting Steps:</h4>
                                <ol id="troubleshooting-steps"></ol>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Test Tab -->
                    <div class="vps-tab-content" id="tab-test">
                        <div class="vps-section">
                            <h3>Test Voice Commands</h3>
                            
                            <div class="vps-test-input">
                                <input type="text" id="test-command" placeholder="Type a command to test...">
                                <button class="vps-btn" onclick="window.voicePipelineSettings?.testCommand()">
                                    🧪 Test
                                </button>
                            </div>
                            
                            <div class="vps-test-result" id="test-result" style="display: none;">
                                <h4>Result:</h4>
                                <pre id="test-result-json"></pre>
                            </div>
                        </div>
                        
                        <div class="vps-section">
                            <h3>Test Suite</h3>
                            
                            <div class="vps-test-summary" id="test-summary">
                                <span>0 tests loaded</span>
                            </div>
                            
                            <button class="vps-btn" onclick="window.voicePipelineSettings?.runTests()">
                                ▶️ Run All Tests
                            </button>
                            
                            <div class="vps-test-results" id="test-suite-results" style="display: none;">
                                <div class="vps-test-stats" id="test-stats"></div>
                            </div>
                        </div>
                        
                        <div class="vps-section">
                            <h3>Logs</h3>
                            
                            <div class="vps-log-stats" id="log-stats">
                                Loading...
                            </div>
                            
                            <div class="vps-log-actions">
                                <button class="vps-btn" onclick="window.voicePipelineSettings?.exportLogs('json')">
                                    📥 Export JSON
                                </button>
                                <button class="vps-btn" onclick="window.voicePipelineSettings?.exportLogs('csv')">
                                    📥 Export CSV
                                </button>
                                <button class="vps-btn vps-btn-danger" onclick="window.voicePipelineSettings?.clearLogs()">
                                    🗑️ Clear Logs
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="vps-modal-footer">
                    <button class="vps-btn" onclick="window.voicePipelineSettings?.resetDefaults()">
                        Reset to Defaults
                    </button>
                    <button class="vps-btn vps-btn-primary" onclick="window.voicePipelineSettings?.saveAndClose()">
                        Save & Close
                    </button>
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Add to document
        document.body.appendChild(modal);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Run initial checks
        this.updateTestSummary();
        this.updateLogStats();
        this.runHealthCheck();
    }
    
    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('vps-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'vps-styles';
        style.textContent = `
            .vps-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .vps-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
            }
            
            .vps-modal-content {
                position: relative;
                width: 90%;
                max-width: 600px;
                max-height: 85vh;
                background: #1a1a2e;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .vps-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .vps-modal-header h2 {
                margin: 0;
                font-size: 18px;
                color: #fff;
            }
            
            .vps-close-btn {
                background: none;
                border: none;
                color: #888;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .vps-close-btn:hover { color: #fff; }
            
            .vps-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }
            
            .vps-tabs {
                display: flex;
                background: rgba(0, 0, 0, 0.2);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .vps-tab {
                flex: 1;
                padding: 12px;
                background: none;
                border: none;
                color: #888;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .vps-tab:hover { color: #fff; background: rgba(255, 255, 255, 0.05); }
            .vps-tab.active {
                color: #667eea;
                background: rgba(102, 126, 234, 0.1);
                border-bottom: 2px solid #667eea;
            }
            
            .vps-tab-content {
                display: none;
                padding: 16px 20px;
            }
            .vps-tab-content.active { display: block; }
            
            .vps-section {
                margin-bottom: 24px;
            }
            
            .vps-section h3 {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .vps-field {
                margin-bottom: 16px;
            }
            
            .vps-field label {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 6px;
                font-size: 13px;
                color: #ccc;
            }
            
            .vps-value {
                color: #667eea;
                font-weight: 600;
            }
            
            .vps-field input[type="range"] {
                width: 100%;
                height: 6px;
                -webkit-appearance: none;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
            }
            
            .vps-field input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: #667eea;
                border-radius: 50%;
                cursor: pointer;
            }
            
            .vps-field input[type="text"],
            .vps-field input[type="number"],
            .vps-field select {
                width: 100%;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #fff;
                font-size: 13px;
            }
            
            .vps-hint {
                margin: 4px 0 0 0;
                font-size: 11px;
                color: #666;
            }
            
            .vps-toggle label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }
            
            .vps-toggle input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: #667eea;
            }
            
            .vps-btn {
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #fff;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .vps-btn:hover { background: rgba(255, 255, 255, 0.15); }
            .vps-btn-primary { background: #667eea; border-color: #667eea; }
            .vps-btn-primary:hover { background: #5a6fd6; }
            .vps-btn-danger { background: rgba(244, 67, 54, 0.3); border-color: rgba(244, 67, 54, 0.5); color: #ef5350; }
            .vps-btn-danger:hover { background: rgba(244, 67, 54, 0.4); }
            
            .vps-modal-footer {
                display: flex;
                justify-content: space-between;
                padding: 16px 20px;
                background: rgba(255, 255, 255, 0.02);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .vps-status-box {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                margin-bottom: 16px;
            }
            
            .vps-status-icon { font-size: 24px; }
            .vps-status-text { font-size: 14px; color: #ccc; }
            
            .vps-status-box.success { background: rgba(76, 175, 80, 0.2); }
            .vps-status-box.error { background: rgba(244, 67, 54, 0.2); }
            .vps-status-box.warning { background: rgba(255, 152, 0, 0.2); }
            
            .vps-level-meter {
                position: relative;
                height: 20px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .vps-level-bar {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #4caf50, #ffc107, #f44336);
                transition: width 0.1s;
            }
            
            .vps-level-threshold {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 2px;
                background: #fff;
            }
            
            .vps-level-labels {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #666;
                margin-top: 4px;
            }
            
            .vps-test-input {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .vps-test-input input {
                flex: 1;
            }
            
            .vps-test-result {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                padding: 12px;
                margin-top: 12px;
            }
            
            .vps-test-result h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: #888;
            }
            
            .vps-test-result pre {
                margin: 0;
                font-size: 11px;
                color: #ccc;
                white-space: pre-wrap;
                word-break: break-word;
            }
            
            .vps-test-summary {
                padding: 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                margin-bottom: 12px;
                font-size: 13px;
                color: #ccc;
            }
            
            .vps-log-stats {
                padding: 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                margin-bottom: 12px;
                font-size: 12px;
                color: #ccc;
            }
            
            .vps-log-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .vps-troubleshooting {
                background: rgba(255, 152, 0, 0.1);
                border: 1px solid rgba(255, 152, 0, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin-top: 12px;
            }
            
            .vps-troubleshooting h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: #ffa726;
            }
            
            .vps-troubleshooting ol {
                margin: 0;
                padding-left: 20px;
                font-size: 12px;
                color: #ccc;
            }
            
            .vps-troubleshooting li {
                margin-bottom: 4px;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.vps-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.vps-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.vps-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            };
        });
        
        // Slider value updates
        const sliders = {
            'confidence-threshold': (v) => v + '%',
            'confirmation-threshold': (v) => v + '%',
            'cancel-window': (v) => v + 'ms',
            'vad-threshold': (v) => v,
            'end-utterance': (v) => v + 'ms',
            'min-speech': (v) => v + 'ms'
        };
        
        Object.entries(sliders).forEach(([id, format]) => {
            const el = document.getElementById(id);
            if (el) {
                el.oninput = (e) => {
                    const valueEl = document.getElementById(id + '-value');
                    if (valueEl) {
                        valueEl.textContent = format(e.target.value);
                    }
                    this.updateThresholdIndicator();
                };
            }
        });
        
        // Test command on Enter
        const testInput = document.getElementById('test-command');
        if (testInput) {
            testInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.testCommand();
                }
            };
        }
    }
    
    /**
     * Update VAD threshold indicator
     */
    updateThresholdIndicator() {
        const threshold = document.getElementById('vad-threshold')?.value || 320;
        const indicator = document.getElementById('vps-level-threshold');
        if (indicator) {
            indicator.style.left = (threshold / 1000 * 100) + '%';
        }
    }
    
    /**
     * Run REAPER health check
     */
    async runHealthCheck() {
        const statusBox = document.getElementById('reaper-status');
        const troubleshooting = document.getElementById('reaper-troubleshooting');
        const steps = document.getElementById('troubleshooting-steps');
        
        if (!statusBox) return;
        
        statusBox.className = 'vps-status-box';
        statusBox.querySelector('.vps-status-icon').textContent = '⏳';
        statusBox.querySelector('.vps-status-text').textContent = 'Checking connection...';
        
        try {
            if (!this.healthCheck) {
                this.healthCheck = new ReaperHealthCheck();
            }
            
            const status = await this.healthCheck.runFullCheck();
            const summary = this.healthCheck.getSummary();
            
            statusBox.className = 'vps-status-box ' + summary.severity;
            statusBox.querySelector('.vps-status-icon').textContent = 
                summary.ok ? '✅' : (summary.severity === 'warning' ? '⚠️' : '❌');
            statusBox.querySelector('.vps-status-text').textContent = summary.message;
            
            if (!summary.ok) {
                const troubleSteps = this.healthCheck.getTroubleshootingSteps();
                if (troubleSteps.length > 0 && troubleshooting && steps) {
                    steps.innerHTML = troubleSteps.map(s => 
                        `<li><strong>${s.issue}:</strong> ${s.fix}</li>`
                    ).join('');
                    troubleshooting.style.display = 'block';
                }
            } else {
                if (troubleshooting) troubleshooting.style.display = 'none';
            }
            
        } catch (e) {
            statusBox.className = 'vps-status-box error';
            statusBox.querySelector('.vps-status-icon').textContent = '❌';
            statusBox.querySelector('.vps-status-text').textContent = 'Check failed: ' + e.message;
        }
    }
    
    /**
     * Test a single command
     */
    testCommand() {
        const input = document.getElementById('test-command');
        const resultBox = document.getElementById('test-result');
        const resultJson = document.getElementById('test-result-json');
        
        if (!input || !input.value.trim()) return;
        
        const text = input.value.trim();
        
        // Use the pipeline's intent parser
        if (this.integration?.pipeline) {
            const lower = text.toLowerCase();
            let intent = null;
            
            // Try parsing
            intent = this.integration.pipeline.parseTransportIntent?.(lower) ||
                     this.integration.pipeline.parseNavigationIntent?.(lower) ||
                     this.integration.pipeline.parseTrackIntent?.(lower) ||
                     this.integration.pipeline.parseMixerIntent?.(lower);
            
            const result = {
                input: text,
                intent: intent || { error: 'No intent matched' },
                timestamp: new Date().toISOString()
            };
            
            if (resultBox && resultJson) {
                resultBox.style.display = 'block';
                resultJson.textContent = JSON.stringify(result, null, 2);
            }
        } else {
            if (resultBox && resultJson) {
                resultBox.style.display = 'block';
                resultJson.textContent = 'Pipeline not initialized';
            }
        }
    }
    
    /**
     * Run test suite
     */
    async runTests() {
        const resultsBox = document.getElementById('test-suite-results');
        const statsBox = document.getElementById('test-stats');
        
        if (!this.integration?.harness) {
            alert('Test harness not available');
            return;
        }
        
        if (resultsBox) resultsBox.style.display = 'block';
        if (statsBox) statsBox.textContent = 'Running tests...';
        
        try {
            const results = await this.integration.harness.runAllTests();
            
            if (statsBox) {
                const s = results.summary;
                statsBox.innerHTML = `
                    <div>✅ Passed: ${s.passed}/${s.total} (${s.passRate}%)</div>
                    <div>❌ Failed: ${s.failed}</div>
                    <div>📊 Avg WER: ${s.avgWER.toFixed(1)}%</div>
                    <div>📊 Intent Accuracy: ${s.intentAccuracy.toFixed(1)}%</div>
                `;
            }
        } catch (e) {
            if (statsBox) statsBox.textContent = 'Test run failed: ' + e.message;
        }
    }
    
    /**
     * Update test summary
     */
    updateTestSummary() {
        const summary = document.getElementById('test-summary');
        if (summary && this.integration?.harness) {
            const count = this.integration.harness.getTestCases().length;
            summary.textContent = `${count} tests loaded`;
        }
    }
    
    /**
     * Update log stats
     */
    updateLogStats() {
        const statsBox = document.getElementById('log-stats');
        if (statsBox && this.integration?.logger) {
            const stats = this.integration.logger.getStats();
            statsBox.innerHTML = `
                <div>📝 Total: ${stats.totalTranscripts} transcripts, ${stats.totalExecutions} executions</div>
                <div>✅ Success Rate: ${stats.successRate}</div>
                <div>⏱️ Avg Latency: ${stats.avgLatencyMs}ms</div>
                <div>📊 Sessions: ${stats.sessionCount}</div>
            `;
        }
    }
    
    /**
     * Export logs
     */
    exportLogs(format) {
        if (this.integration?.logger) {
            this.integration.logger.download(format);
        }
    }
    
    /**
     * Clear logs
     */
    clearLogs() {
        if (confirm('Are you sure you want to clear all logs?')) {
            if (this.integration?.logger) {
                this.integration.logger.clear();
                this.updateLogStats();
            }
        }
    }
    
    /**
     * Load settings from storage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('dawrv_voice_pipeline_settings');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        
        return {
            confidenceThreshold: 0.70,
            confirmationThreshold: 0.85,
            cancelWindowMs: 500,
            enableCancelWindow: true,
            enableBargeIn: true,
            enableTwoPassASR: true,
            wakeWordRequired: false,
            vad: {
                rmsThreshold: 320,
                endUtteranceSilenceMs: 700,
                minSpeechDurationMs: 150
            },
            hud: {
                enabled: true,
                position: 'top-right',
                showMetrics: true,
                showLog: false,
                compact: false
            },
            reaper: {
                httpPort: 8080
            }
        };
    }
    
    /**
     * Save settings
     */
    saveSettings() {
        const settings = {
            confidenceThreshold: parseInt(document.getElementById('confidence-threshold')?.value || 70) / 100,
            confirmationThreshold: parseInt(document.getElementById('confirmation-threshold')?.value || 85) / 100,
            cancelWindowMs: parseInt(document.getElementById('cancel-window')?.value || 500),
            enableCancelWindow: document.getElementById('enable-cancel-window')?.checked ?? true,
            enableBargeIn: document.getElementById('enable-barge-in')?.checked ?? true,
            enableTwoPassASR: document.getElementById('enable-two-pass')?.checked ?? true,
            wakeWordRequired: document.getElementById('wake-word-required')?.checked ?? false,
            vad: {
                rmsThreshold: parseInt(document.getElementById('vad-threshold')?.value || 320),
                endUtteranceSilenceMs: parseInt(document.getElementById('end-utterance')?.value || 700),
                minSpeechDurationMs: parseInt(document.getElementById('min-speech')?.value || 150)
            },
            hud: {
                enabled: document.getElementById('hud-enabled')?.checked ?? true,
                position: document.getElementById('hud-position')?.value || 'top-right',
                showMetrics: document.getElementById('hud-metrics')?.checked ?? true,
                showLog: document.getElementById('hud-log')?.checked ?? false,
                compact: document.getElementById('hud-compact')?.checked ?? false
            },
            reaper: {
                httpPort: parseInt(document.getElementById('reaper-port')?.value || 8080)
            }
        };
        
        localStorage.setItem('dawrv_voice_pipeline_settings', JSON.stringify(settings));
        this.settings = settings;
        
        // Apply settings to pipeline
        this.applySettings(settings);
        
        console.log('⚙️ Settings saved:', settings);
        return settings;
    }
    
    /**
     * Apply settings to pipeline
     */
    applySettings(settings) {
        if (!this.integration) return;
        
        // Update pipeline config
        if (this.integration.pipeline) {
            this.integration.pipeline.config.confidenceThreshold = settings.confidenceThreshold;
            this.integration.pipeline.config.confirmationThreshold = settings.confirmationThreshold;
            this.integration.pipeline.config.cancelWindowMs = settings.cancelWindowMs;
            this.integration.pipeline.config.enableCancelWindow = settings.enableCancelWindow;
            this.integration.pipeline.config.enableBargeIn = settings.enableBargeIn;
            this.integration.pipeline.config.enableTwoPassASR = settings.enableTwoPassASR;
            this.integration.pipeline.config.wakeWordRequired = settings.wakeWordRequired;
        }
        
        // Update HUD
        if (this.integration.hud) {
            if (settings.hud.enabled) {
                this.integration.hud.show();
                this.integration.hud.setPosition(settings.hud.position);
            } else {
                this.integration.hud.hide();
            }
        }
    }
    
    /**
     * Reset to defaults
     */
    resetDefaults() {
        if (confirm('Reset all settings to defaults?')) {
            localStorage.removeItem('dawrv_voice_pipeline_settings');
            this.settings = this.loadSettings();
            this.hide();
            this.show();
        }
    }
    
    /**
     * Save and close
     */
    saveAndClose() {
        this.saveSettings();
        this.hide();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoicePipelineSettingsUI;
}

if (typeof window !== 'undefined') {
    window.VoicePipelineSettingsUI = VoicePipelineSettingsUI;
}
