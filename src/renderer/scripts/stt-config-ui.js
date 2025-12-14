/**
 * Speech-to-Text Configuration UI
 * Allows users to select and configure their preferred STT engine
 */

class STTConfigUI {
    constructor() {
        this.modal = null;
        this.providers = {
            'browser': {
                name: 'Browser (Built-in)',
                description: 'Free, instant, no API key needed. Good for basic commands.',
                requiresKey: false,
                icon: '🌐',
                quality: 2,
                speed: 5,
                cost: 'Free'
            },
            'whisper': {
                name: 'OpenAI Whisper',
                description: 'Best accuracy, handles accents perfectly. Uses your OpenAI API key.',
                requiresKey: true,
                keyName: 'OpenAI API Key',
                icon: '🤖',
                quality: 5,
                speed: 3,
                cost: '$0.006/min'
            },
            'deepgram': {
                name: 'Deepgram',
                description: 'Fastest response time (~100ms). Perfect for real-time commands.',
                requiresKey: true,
                keyName: 'Deepgram API Key',
                icon: '⚡',
                quality: 5,
                speed: 5,
                cost: '$0.0043/min'
            },
            'assemblyai': {
                name: 'AssemblyAI',
                description: 'Excellent accuracy with real-time streaming support.',
                requiresKey: true,
                keyName: 'AssemblyAI API Key',
                icon: '🎯',
                quality: 4,
                speed: 4,
                cost: '$0.015/min'
            },
            'vosk': {
                name: 'Vosk (Offline)',
                description: 'Runs 100% locally. No internet needed, completely free.',
                requiresKey: false,
                icon: '💻',
                quality: 3,
                speed: 4,
                cost: 'Free',
                note: 'Requires local model download (~50MB)'
            },
            'azure': {
                name: 'Azure Speech',
                description: 'Microsoft Azure cognitive services. Very accurate.',
                requiresKey: true,
                keyName: 'Azure Speech Key',
                extraField: 'region',
                icon: '☁️',
                quality: 4,
                speed: 4,
                cost: '$1/hour'
            }
        };
        
        this.currentProvider = 'browser';
        this.settings = {};
        
        this.loadSettings();
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('dawrv_stt_settings');
            if (saved) {
                this.settings = JSON.parse(saved);
                this.currentProvider = this.settings.provider || 'browser';
            }
        } catch (e) {
            console.error('Error loading STT settings:', e);
        }
    }
    
    saveSettings() {
        try {
            this.settings.provider = this.currentProvider;
            localStorage.setItem('dawrv_stt_settings', JSON.stringify(this.settings));
            console.log('🎤 STT settings saved:', this.currentProvider);
        } catch (e) {
            console.error('Error saving STT settings:', e);
        }
    }
    
    show() {
        if (this.modal) {
            this.modal.remove();
        }
        
        this.modal = document.createElement('div');
        this.modal.className = 'stt-config-modal';
        this.modal.innerHTML = this.renderContent();
        
        document.body.appendChild(this.modal);
        this.attachEventListeners();
    }
    
    hide() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
    
    renderContent() {
        return `
            <div class="stt-config-overlay" data-action="close"></div>
            <div class="stt-config-panel">
                <div class="stt-config-header">
                    <h2>🎤 Speech Recognition Settings</h2>
                    <button class="stt-close-btn" data-action="close">×</button>
                </div>
                
                <div class="stt-config-body">
                    <div class="stt-section">
                        <h3>Select Speech-to-Text Engine</h3>
                        <p class="stt-description">Choose the engine that powers RHEA's voice recognition</p>
                        
                        <div class="stt-providers-grid">
                            ${Object.entries(this.providers).map(([id, provider]) => `
                                <div class="stt-provider-card ${this.currentProvider === id ? 'selected' : ''}" 
                                     data-provider="${id}">
                                    <div class="stt-provider-header">
                                        <span class="stt-provider-icon">${provider.icon}</span>
                                        <span class="stt-provider-name">${provider.name}</span>
                                        ${this.currentProvider === id ? '<span class="stt-active-badge">Active</span>' : ''}
                                    </div>
                                    <p class="stt-provider-desc">${provider.description}</p>
                                    <div class="stt-provider-stats">
                                        <div class="stt-stat">
                                            <span class="stt-stat-label">Accuracy</span>
                                            <div class="stt-stat-bar">
                                                <div class="stt-stat-fill" style="width: ${provider.quality * 20}%"></div>
                                            </div>
                                        </div>
                                        <div class="stt-stat">
                                            <span class="stt-stat-label">Speed</span>
                                            <div class="stt-stat-bar">
                                                <div class="stt-stat-fill speed" style="width: ${provider.speed * 20}%"></div>
                                            </div>
                                        </div>
                                        <div class="stt-stat-cost">
                                            <span class="stt-cost-label">Cost:</span>
                                            <span class="stt-cost-value">${provider.cost}</span>
                                        </div>
                                    </div>
                                    ${provider.note ? `<p class="stt-provider-note">ℹ️ ${provider.note}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="stt-section stt-api-section" id="stt-api-section" style="display: none;">
                        <h3>API Configuration</h3>
                        <div id="stt-api-fields"></div>
                    </div>
                    
                    <div class="stt-section">
                        <h3>Voice Recognition Options</h3>
                        <div class="stt-options">
                            <label class="stt-option">
                                <input type="checkbox" id="stt-continuous" 
                                       ${this.settings.continuous !== false ? 'checked' : ''}>
                                <span>Continuous listening (auto-restart after command)</span>
                            </label>
                            <label class="stt-option">
                                <input type="checkbox" id="stt-interim" 
                                       ${this.settings.interimResults !== false ? 'checked' : ''}>
                                <span>Show interim results (real-time transcription)</span>
                            </label>
                            <label class="stt-option">
                                <input type="checkbox" id="stt-wake-word" 
                                       ${this.settings.wakeWordEnabled ? 'checked' : ''}>
                                <span>Wake word: "Hey RHEA" (hands-free activation)</span>
                            </label>
                        </div>
                        
                        <div class="stt-sensitivity">
                            <label>
                                <span>Silence Detection Timeout</span>
                                <input type="range" id="stt-silence-timeout" 
                                       min="500" max="3000" step="100"
                                       value="${this.settings.silenceTimeout || 1500}">
                                <span id="stt-silence-value">${(this.settings.silenceTimeout || 1500) / 1000}s</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="stt-section">
                        <h3>Test Voice Recognition</h3>
                        <div class="stt-test-area">
                            <button id="stt-test-btn" class="stt-test-button">
                                <span class="stt-test-icon">🎤</span>
                                <span>Test Recognition</span>
                            </button>
                            <div id="stt-test-result" class="stt-test-result"></div>
                        </div>
                    </div>
                </div>
                
                <div class="stt-config-footer">
                    <button class="stt-btn secondary" data-action="close">Cancel</button>
                    <button class="stt-btn primary" data-action="save">Save Settings</button>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Close buttons
        this.modal.querySelectorAll('[data-action="close"]').forEach(el => {
            el.addEventListener('click', () => this.hide());
        });
        
        // Save button
        this.modal.querySelector('[data-action="save"]').addEventListener('click', () => {
            this.saveAllSettings();
            this.hide();
        });
        
        // Provider selection
        this.modal.querySelectorAll('.stt-provider-card').forEach(card => {
            card.addEventListener('click', () => {
                const provider = card.dataset.provider;
                this.selectProvider(provider);
            });
        });
        
        // Options
        this.modal.querySelector('#stt-continuous')?.addEventListener('change', (e) => {
            this.settings.continuous = e.target.checked;
        });
        
        this.modal.querySelector('#stt-interim')?.addEventListener('change', (e) => {
            this.settings.interimResults = e.target.checked;
        });
        
        this.modal.querySelector('#stt-wake-word')?.addEventListener('change', (e) => {
            this.settings.wakeWordEnabled = e.target.checked;
        });
        
        // Silence timeout slider
        const silenceSlider = this.modal.querySelector('#stt-silence-timeout');
        const silenceValue = this.modal.querySelector('#stt-silence-value');
        silenceSlider?.addEventListener('input', (e) => {
            this.settings.silenceTimeout = parseInt(e.target.value);
            silenceValue.textContent = (e.target.value / 1000) + 's';
        });
        
        // Test button
        this.modal.querySelector('#stt-test-btn')?.addEventListener('click', () => {
            this.testRecognition();
        });
    }
    
    selectProvider(providerId) {
        this.currentProvider = providerId;
        const provider = this.providers[providerId];
        
        // Update UI
        this.modal.querySelectorAll('.stt-provider-card').forEach(card => {
            card.classList.remove('selected');
            card.querySelector('.stt-active-badge')?.remove();
        });
        
        const selectedCard = this.modal.querySelector(`[data-provider="${providerId}"]`);
        selectedCard.classList.add('selected');
        selectedCard.querySelector('.stt-provider-header').insertAdjacentHTML(
            'beforeend', 
            '<span class="stt-active-badge">Active</span>'
        );
        
        // Show/hide API section
        const apiSection = this.modal.querySelector('#stt-api-section');
        const apiFields = this.modal.querySelector('#stt-api-fields');
        
        if (provider.requiresKey) {
            apiSection.style.display = 'block';
            apiFields.innerHTML = this.renderApiFields(providerId, provider);
            this.attachApiFieldListeners();
        } else {
            apiSection.style.display = 'none';
        }
    }
    
    renderApiFields(providerId, provider) {
        let html = `
            <div class="stt-api-field">
                <label>${provider.keyName || 'API Key'}</label>
                <input type="password" 
                       id="stt-api-key" 
                       placeholder="Enter your ${provider.keyName || 'API key'}"
                       value="${this.settings[`${providerId}_key`] || ''}">
                <button class="stt-show-key-btn" data-target="stt-api-key">👁️</button>
            </div>
        `;
        
        if (provider.extraField === 'region') {
            html += `
                <div class="stt-api-field">
                    <label>Region</label>
                    <select id="stt-region">
                        <option value="eastus" ${this.settings.azure_region === 'eastus' ? 'selected' : ''}>East US</option>
                        <option value="westus" ${this.settings.azure_region === 'westus' ? 'selected' : ''}>West US</option>
                        <option value="westeurope" ${this.settings.azure_region === 'westeurope' ? 'selected' : ''}>West Europe</option>
                        <option value="eastasia" ${this.settings.azure_region === 'eastasia' ? 'selected' : ''}>East Asia</option>
                    </select>
                </div>
            `;
        }
        
        // Add links to get API keys
        html += `
            <div class="stt-api-help">
                ${this.getApiKeyHelp(providerId)}
            </div>
        `;
        
        return html;
    }
    
    getApiKeyHelp(providerId) {
        const links = {
            'whisper': '<a href="https://platform.openai.com/api-keys" target="_blank">Get OpenAI API Key →</a>',
            'deepgram': '<a href="https://console.deepgram.com/" target="_blank">Get Deepgram API Key →</a>',
            'assemblyai': '<a href="https://www.assemblyai.com/dashboard/signup" target="_blank">Get AssemblyAI API Key →</a>',
            'azure': '<a href="https://azure.microsoft.com/en-us/products/cognitive-services/speech-services" target="_blank">Get Azure Speech Key →</a>'
        };
        return links[providerId] || '';
    }
    
    attachApiFieldListeners() {
        // Show/hide password
        this.modal.querySelectorAll('.stt-show-key-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = this.modal.querySelector(`#${btn.dataset.target}`);
                input.type = input.type === 'password' ? 'text' : 'password';
            });
        });
        
        // Save API key on change
        this.modal.querySelector('#stt-api-key')?.addEventListener('change', (e) => {
            this.settings[`${this.currentProvider}_key`] = e.target.value;
        });
        
        // Save region on change
        this.modal.querySelector('#stt-region')?.addEventListener('change', (e) => {
            this.settings.azure_region = e.target.value;
        });
    }
    
    saveAllSettings() {
        // Gather all settings
        this.settings.provider = this.currentProvider;
        this.settings.continuous = this.modal.querySelector('#stt-continuous')?.checked;
        this.settings.interimResults = this.modal.querySelector('#stt-interim')?.checked;
        this.settings.wakeWordEnabled = this.modal.querySelector('#stt-wake-word')?.checked;
        this.settings.silenceTimeout = parseInt(this.modal.querySelector('#stt-silence-timeout')?.value || 1500);
        
        // Save API key if present
        const apiKey = this.modal.querySelector('#stt-api-key')?.value;
        if (apiKey) {
            this.settings[`${this.currentProvider}_key`] = apiKey;
        }
        
        this.saveSettings();
        
        // Notify STT service of changes
        if (window.STTService) {
            window.STTService.configure(this.settings);
        }
        
        // Show confirmation
        this.showToast('✅ Speech recognition settings saved!');
    }
    
    async testRecognition() {
        const testBtn = this.modal.querySelector('#stt-test-btn');
        const resultDiv = this.modal.querySelector('#stt-test-result');
        
        testBtn.disabled = true;
        testBtn.innerHTML = '<span class="stt-test-icon">🔴</span><span>Listening...</span>';
        resultDiv.innerHTML = '<div class="stt-listening-indicator">Speak now...</div>';
        resultDiv.className = 'stt-test-result listening';
        
        try {
            // Use browser speech recognition for quick test
            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const confidence = Math.round(event.results[0][0].confidence * 100);
                
                resultDiv.innerHTML = `
                    <div class="stt-result-text">"${transcript}"</div>
                    <div class="stt-result-confidence">Confidence: ${confidence}%</div>
                `;
                resultDiv.className = 'stt-test-result success';
            };
            
            recognition.onerror = (event) => {
                resultDiv.innerHTML = `<div class="stt-result-error">Error: ${event.error}</div>`;
                resultDiv.className = 'stt-test-result error';
            };
            
            recognition.onend = () => {
                testBtn.disabled = false;
                testBtn.innerHTML = '<span class="stt-test-icon">🎤</span><span>Test Recognition</span>';
            };
            
            recognition.start();
            
            // Auto-stop after 5 seconds
            setTimeout(() => {
                if (recognition) {
                    recognition.stop();
                }
            }, 5000);
            
        } catch (error) {
            resultDiv.innerHTML = `<div class="stt-result-error">Speech recognition not available in this browser</div>`;
            resultDiv.className = 'stt-test-result error';
            testBtn.disabled = false;
            testBtn.innerHTML = '<span class="stt-test-icon">🎤</span><span>Test Recognition</span>';
        }
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'stt-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Add styles
const sttStyles = document.createElement('style');
sttStyles.textContent = `
    .stt-config-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .stt-config-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
    }
    
    .stt-config-panel {
        position: relative;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    
    .stt-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .stt-config-header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #fff;
    }
    
    .stt-close-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }
    
    .stt-close-btn:hover {
        color: #fff;
    }
    
    .stt-config-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
    }
    
    .stt-section {
        margin-bottom: 32px;
    }
    
    .stt-section h3 {
        margin: 0 0 8px 0;
        font-size: 1.1rem;
        color: #fff;
    }
    
    .stt-description {
        color: #888;
        margin: 0 0 16px 0;
        font-size: 0.9rem;
    }
    
    .stt-providers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
    }
    
    .stt-provider-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .stt-provider-card:hover {
        border-color: rgba(74, 158, 255, 0.5);
        background: rgba(74, 158, 255, 0.1);
    }
    
    .stt-provider-card.selected {
        border-color: #4a9eff;
        background: rgba(74, 158, 255, 0.15);
    }
    
    .stt-provider-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
    }
    
    .stt-provider-icon {
        font-size: 1.5rem;
    }
    
    .stt-provider-name {
        font-weight: 600;
        color: #fff;
        flex: 1;
    }
    
    .stt-active-badge {
        background: #4a9eff;
        color: #fff;
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: 500;
    }
    
    .stt-provider-desc {
        color: #aaa;
        font-size: 0.85rem;
        margin: 0 0 12px 0;
        line-height: 1.4;
    }
    
    .stt-provider-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .stt-stat {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .stt-stat-label {
        font-size: 0.75rem;
        color: #888;
        width: 60px;
    }
    
    .stt-stat-bar {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
    }
    
    .stt-stat-fill {
        height: 100%;
        background: linear-gradient(90deg, #4a9eff, #6c63ff);
        border-radius: 3px;
        transition: width 0.3s ease;
    }
    
    .stt-stat-fill.speed {
        background: linear-gradient(90deg, #00ff88, #00d4ff);
    }
    
    .stt-stat-cost {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        margin-top: 4px;
    }
    
    .stt-cost-label {
        color: #888;
    }
    
    .stt-cost-value {
        color: #00ff88;
        font-weight: 500;
    }
    
    .stt-provider-note {
        font-size: 0.75rem;
        color: #f0ad4e;
        margin: 8px 0 0 0;
    }
    
    .stt-api-section {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        padding: 20px;
    }
    
    .stt-api-field {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
    }
    
    .stt-api-field label {
        color: #aaa;
        font-size: 0.9rem;
        width: 120px;
    }
    
    .stt-api-field input,
    .stt-api-field select {
        flex: 1;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #fff;
        font-size: 0.9rem;
    }
    
    .stt-show-key-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 8px;
    }
    
    .stt-api-help {
        margin-top: 8px;
    }
    
    .stt-api-help a {
        color: #4a9eff;
        text-decoration: none;
        font-size: 0.85rem;
    }
    
    .stt-api-help a:hover {
        text-decoration: underline;
    }
    
    .stt-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .stt-option {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ccc;
        cursor: pointer;
    }
    
    .stt-option input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: #4a9eff;
    }
    
    .stt-sensitivity {
        margin-top: 20px;
    }
    
    .stt-sensitivity label {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #ccc;
    }
    
    .stt-sensitivity input[type="range"] {
        flex: 1;
        accent-color: #4a9eff;
    }
    
    .stt-test-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }
    
    .stt-test-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #4a9eff, #6c63ff);
        border: none;
        border-radius: 25px;
        color: #fff;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .stt-test-button:hover {
        transform: scale(1.05);
        box-shadow: 0 5px 20px rgba(74, 158, 255, 0.4);
    }
    
    .stt-test-button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    .stt-test-icon {
        font-size: 1.2rem;
    }
    
    .stt-test-result {
        min-height: 60px;
        padding: 16px 24px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        text-align: center;
        width: 100%;
        max-width: 400px;
    }
    
    .stt-test-result.listening {
        border: 2px solid #f0ad4e;
        animation: pulse 1s infinite;
    }
    
    .stt-test-result.success {
        border: 2px solid #00ff88;
    }
    
    .stt-test-result.error {
        border: 2px solid #ff4444;
    }
    
    .stt-result-text {
        color: #fff;
        font-size: 1.1rem;
        margin-bottom: 8px;
    }
    
    .stt-result-confidence {
        color: #00ff88;
        font-size: 0.85rem;
    }
    
    .stt-result-error {
        color: #ff4444;
    }
    
    .stt-listening-indicator {
        color: #f0ad4e;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
    
    .stt-config-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .stt-btn {
        padding: 10px 24px;
        border-radius: 8px;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .stt-btn.secondary {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #ccc;
    }
    
    .stt-btn.secondary:hover {
        border-color: rgba(255, 255, 255, 0.4);
        color: #fff;
    }
    
    .stt-btn.primary {
        background: linear-gradient(135deg, #4a9eff, #6c63ff);
        border: none;
        color: #fff;
    }
    
    .stt-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(74, 158, 255, 0.4);
    }
    
    .stt-toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #1a1a2e;
        color: #fff;
        padding: 12px 24px;
        border-radius: 25px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        transition: transform 0.3s ease;
    }
    
    .stt-toast.show {
        transform: translateX(-50%) translateY(0);
    }
`;
document.head.appendChild(sttStyles);

// Export
window.STTConfigUI = new STTConfigUI();

console.log('🎤 STT Config UI loaded');





