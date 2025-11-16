/**
 * AI Configuration UI and Management
 * Provides a UI for configuring RHEA's AI agent
 */

class AIConfigManager {
    constructor(rheaController) {
        this.rhea = rheaController;
        this.configModal = null;
        this.init();
    }
    
    init() {
        // Create config button in UI (if not exists)
        this.createConfigButton();
    }
    
    createConfigButton() {
        // Add AI config button to the RHEA panel
        const rheaPanel = document.querySelector('.rhea-panel');
        if (!rheaPanel) return;
        
        // Check if button already exists
        if (document.getElementById('ai-config-btn')) return;
        
        const configBtn = document.createElement('button');
        configBtn.id = 'ai-config-btn';
        configBtn.className = 'ai-config-btn';
        configBtn.innerHTML = '🤖 AI Settings';
        configBtn.style.cssText = `
            margin: 10px auto;
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            display: block;
            transition: transform 0.2s;
        `;
        configBtn.onmouseover = () => configBtn.style.transform = 'scale(1.05)';
        configBtn.onmouseout = () => configBtn.style.transform = 'scale(1)';
        configBtn.onclick = () => this.showConfigModal();
        
        // Insert after voice controls
        const voiceControls = document.querySelector('.voice-controls');
        if (voiceControls) {
            voiceControls.parentNode.insertBefore(configBtn, voiceControls.nextSibling);
        }
    }
    
    showConfigModal() {
        // Create modal if it doesn't exist
        if (!this.configModal) {
            this.createModal();
        }
        
        // Load current config
        const config = this.rhea.loadAIConfig();
        this.populateForm(config);
        
        // Show modal
        this.configModal.style.display = 'flex';
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'ai-config-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
            padding: 30px;
            border-radius: 16px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;
        
        content.innerHTML = `
            <h2 style="color: #fff; margin-top: 0; margin-bottom: 20px;">🤖 RHEA AI Agent Configuration</h2>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Provider</label>
                <select id="ai-provider" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="local">Local LLM (Ollama, LM Studio)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">API Key</label>
                <input type="password" id="ai-api-key" placeholder="Enter your API key (stored locally)" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                <small style="color: #aaa; display: block; margin-top: 5px;">
                    <span id="api-key-hint">For local LLM, leave empty</span>
                    <br>
                    <a href="#" id="api-key-help" style="color: #4CAF50; text-decoration: none; font-size: 12px;">Where do I get my API key?</a>
                </small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Model</label>
                <input type="text" id="ai-model" placeholder="gpt-4o-mini, claude-3-haiku, llama3, etc." style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Base URL (Optional)</label>
                <input type="text" id="ai-base-url" placeholder="http://localhost:11434/v1 (for local LLM)" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                <small style="color: #aaa; display: block; margin-top: 5px;">For custom endpoints or local LLMs</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Temperature: <span id="temp-value">0.7</span></label>
                <input type="range" id="ai-temperature" min="0" max="1" step="0.1" value="0.7" style="width: 100%;">
                <small style="color: #aaa; display: block; margin-top: 5px;">Lower = more focused, Higher = more creative</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px;">
                    <input type="checkbox" id="ai-enable-memory" checked> Enable Conversation Memory
                </label>
                <small style="color: #aaa; display: block; margin-top: 5px;">Remember previous interactions</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px;">
                    <input type="checkbox" id="ai-enable-tools" checked> Enable Tool Calling
                </label>
                <small style="color: #aaa; display: block; margin-top: 5px;">Allow AI to call REAPER actions</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px;">
                    <input type="checkbox" id="ai-fallback" checked> Fallback to Keyword Matching
                </label>
                <small style="color: #aaa; display: block; margin-top: 5px;">Use keyword matching if AI fails (recommended)</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px;">
                    <input type="checkbox" id="ai-retry-rate-limit" checked> Retry on Rate Limit
                </label>
                <small style="color: #aaa; display: block; margin-top: 5px;">Automatically retry when rate limited (with backoff)</small>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px;">
                <strong style="color: #ffc107;">💡 Rate Limit Tips:</strong>
                <ul style="color: #aaa; margin: 10px 0 0 20px; font-size: 12px;">
                    <li>Free tier: ~3 requests/minute</li>
                    <li>Paid tier: Higher limits based on plan</li>
                    <li>System auto-retries with exponential backoff</li>
                    <li>Falls back to keyword matching when rate limited</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button id="ai-save-btn" style="flex: 1; padding: 12px; background: #4CAF50; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Save</button>
                <button id="ai-test-btn" style="flex: 1; padding: 12px; background: #2196F3; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Test Connection</button>
                <button id="ai-close-btn" style="flex: 1; padding: 12px; background: #666; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Close</button>
            </div>
            
            <div id="ai-status" style="margin-top: 20px; padding: 10px; border-radius: 8px; display: none;"></div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('ai-save-btn').onclick = () => this.saveConfig();
        document.getElementById('ai-test-btn').onclick = () => this.testConnection();
        document.getElementById('ai-close-btn').onclick = () => this.closeModal();
        document.getElementById('ai-temperature').oninput = (e) => {
            document.getElementById('temp-value').textContent = e.target.value;
        };
        
        // Update API key hint based on provider
        document.getElementById('ai-provider').onchange = (e) => {
            const provider = e.target.value;
            const hint = document.getElementById('api-key-hint');
            const help = document.getElementById('api-key-help');
            
            if (provider === 'openai') {
                hint.textContent = 'OpenAI keys start with "sk-"';
                help.textContent = 'Get your key at platform.openai.com/account/api-keys';
                help.href = 'https://platform.openai.com/account/api-keys';
                help.target = '_blank';
            } else if (provider === 'anthropic') {
                hint.textContent = 'Anthropic keys start with "sk-ant-"';
                help.textContent = 'Get your key at console.anthropic.com';
                help.href = 'https://console.anthropic.com/';
                help.target = '_blank';
            } else {
                hint.textContent = 'For local LLM, leave empty';
                help.textContent = 'Local LLM setup guide';
                help.href = '#';
                help.onclick = (e) => {
                    e.preventDefault();
                    alert('For local LLM:\n1. Install Ollama (ollama.ai) or LM Studio\n2. Download a model: ollama pull llama3\n3. Leave API key empty\n4. Set Base URL: http://localhost:11434/v1');
                };
            }
        };
        
        // Validate API key format on input
        document.getElementById('ai-api-key').oninput = (e) => {
            const provider = document.getElementById('ai-provider').value;
            const apiKey = e.target.value.trim();
            const input = e.target;
            
            if (provider === 'openai' && apiKey && !apiKey.startsWith('sk-')) {
                input.style.borderColor = '#f44336';
            } else if (provider === 'anthropic' && apiKey && !apiKey.startsWith('sk-ant-')) {
                input.style.borderColor = '#f44336';
            } else {
                input.style.borderColor = 'rgba(255,255,255,0.2)';
            }
        };
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };
        
        this.configModal = modal;
    }
    
    populateForm(config) {
        document.getElementById('ai-provider').value = config.provider || 'openai';
        document.getElementById('ai-api-key').value = config.apiKey || '';
        document.getElementById('ai-model').value = config.model || 'gpt-4o-mini';
        document.getElementById('ai-base-url').value = config.baseURL || '';
        document.getElementById('ai-temperature').value = config.temperature || 0.7;
        document.getElementById('temp-value').textContent = config.temperature || 0.7;
        document.getElementById('ai-enable-memory').checked = config.enableMemory !== false;
        document.getElementById('ai-enable-tools').checked = config.enableTools !== false;
        document.getElementById('ai-fallback').checked = config.fallbackToKeyword !== false;
        document.getElementById('ai-retry-rate-limit').checked = config.retryOnRateLimit !== false;
    }
    
    async saveConfig() {
        const config = {
            provider: document.getElementById('ai-provider').value,
            apiKey: document.getElementById('ai-api-key').value || null,
            model: document.getElementById('ai-model').value || 'gpt-4o-mini',
            baseURL: document.getElementById('ai-base-url').value || null,
            temperature: parseFloat(document.getElementById('ai-temperature').value),
            enableMemory: document.getElementById('ai-enable-memory').checked,
            enableTools: document.getElementById('ai-enable-tools').checked,
            fallbackToKeyword: document.getElementById('ai-fallback').checked,
            retryOnRateLimit: document.getElementById('ai-retry-rate-limit').checked,
            maxRetries: 2,
            retryDelay: 1000,
            exponentialBackoff: true
        };
        
        this.rhea.saveAIConfig(config);
        this.showStatus('✅ Configuration saved!', 'success');
        
        // Reinitialize AI agent
        setTimeout(() => {
            this.rhea.initAIAgent();
            this.showStatus('✅ AI Agent reinitialized!', 'success');
        }, 500);
    }
    
    async testConnection() {
        const statusEl = document.getElementById('ai-status');
        statusEl.style.display = 'block';
        statusEl.style.background = 'rgba(255, 193, 7, 0.2)';
        statusEl.style.color = '#ffc107';
        statusEl.textContent = '🔄 Testing connection...';
        
        const provider = document.getElementById('ai-provider').value;
        const apiKey = document.getElementById('ai-api-key').value || null;
        const model = document.getElementById('ai-model').value || 'gpt-4o-mini';
        const baseURL = document.getElementById('ai-base-url').value || null;
        
        // Validate API key before testing
        if (provider !== 'local' && (!apiKey || apiKey.trim() === '')) {
            statusEl.style.background = 'rgba(244, 67, 54, 0.2)';
            statusEl.style.color = '#f44336';
            statusEl.textContent = '❌ API key is required for cloud providers';
            return;
        }
        
        // Validate API key format
        if (provider === 'openai' && apiKey && !apiKey.trim().startsWith('sk-')) {
            statusEl.style.background = 'rgba(244, 67, 54, 0.2)';
            statusEl.style.color = '#f44336';
            statusEl.textContent = '❌ Invalid OpenAI API key format. Must start with "sk-"';
            return;
        }
        
        if (provider === 'anthropic' && apiKey && !apiKey.trim().startsWith('sk-ant-')) {
            statusEl.style.background = 'rgba(244, 67, 54, 0.2)';
            statusEl.style.color = '#f44336';
            statusEl.textContent = '❌ Invalid Anthropic API key format. Must start with "sk-ant-"';
            return;
        }
        
        const config = {
            provider: provider,
            apiKey: apiKey ? apiKey.trim() : null,
            model: model,
            baseURL: baseURL || null,
        };
        
        try {
            // Create temporary AI agent for testing
            if (typeof AIAgent !== 'undefined') {
                const testAgent = new AIAgent({ ...config, maxTokens: 50 });
                const response = await testAgent.processInput('Hello', {});
                
                statusEl.style.background = 'rgba(76, 175, 80, 0.2)';
                statusEl.style.color = '#4CAF50';
                statusEl.textContent = `✅ Connection successful! Response: "${response.text.substring(0, 50)}..."`;
            } else {
                throw new Error('AIAgent not loaded');
            }
        } catch (error) {
            statusEl.style.background = 'rgba(244, 67, 54, 0.2)';
            statusEl.style.color = '#f44336';
            
            // Provide helpful error messages
            let errorMsg = error.message;
            if (errorMsg.includes('401') || errorMsg.includes('Invalid API key') || errorMsg.includes('invalid_api_key')) {
                if (provider === 'openai') {
                    errorMsg = '❌ Invalid OpenAI API key. Please check:\n• Key starts with "sk-"\n• Key is complete (not truncated)\n• Key is from https://platform.openai.com/account/api-keys';
                } else if (provider === 'anthropic') {
                    errorMsg = '❌ Invalid Anthropic API key. Please check:\n• Key starts with "sk-ant-"\n• Key is complete (not truncated)\n• Key is from https://console.anthropic.com/';
                }
            } else if (errorMsg.includes('429')) {
                errorMsg = '❌ Rate limit exceeded. Please try again later or check your usage limits.';
            } else if (errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch')) {
                errorMsg = '❌ Network error. Check your internet connection and try again.';
            }
            
            statusEl.textContent = errorMsg;
            statusEl.style.whiteSpace = 'pre-line'; // Allow line breaks
        }
    }
    
    showStatus(message, type) {
        const statusEl = document.getElementById('ai-status');
        statusEl.style.display = 'block';
        statusEl.style.background = type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
        statusEl.style.color = type === 'success' ? '#4CAF50' : '#f44336';
        statusEl.textContent = message;
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
    
    closeModal() {
        if (this.configModal) {
            this.configModal.style.display = 'none';
        }
    }
}

