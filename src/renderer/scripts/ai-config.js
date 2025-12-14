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
        // Don't create button - it's now in the premium UI grid
        // Just ensure the modal is ready
        console.log('✅ AI Config Manager initialized');
    }
    
    show() {
        // Alias for showConfigModal() - used by button handlers
        this.showConfigModal();
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
                    <option value="gemini">Google Gemini 3 (Latest)</option>
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
                <select id="ai-model" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <!-- OpenAI Models -->
                    <optgroup label="🆕 OpenAI - GPT-5.1 (Latest! Nov 2025)" id="openai-models">
                        <option value="gpt-5.1">GPT-5.1 (Latest & Best)</option>
                        <option value="gpt-5.1-instant">GPT-5.1 Instant (Quick Responses)</option>
                        <option value="gpt-5.1-thinking">GPT-5.1 Thinking (Deep Reasoning)</option>
                        <option value="gpt-5.1-pro">GPT-5.1 Pro (Maximum Capability)</option>
                    </optgroup>
                    <optgroup label="🟢 OpenAI - GPT-4o (Previous Gen)">
                        <option value="gpt-4o">GPT-4o (Great Quality)</option>
                        <option value="gpt-4o-2024-11-20">GPT-4o (Nov 2024)</option>
                        <option value="gpt-4o-2024-08-06">GPT-4o (Aug 2024)</option>
                        <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
                        <option value="gpt-4o-mini-2024-07-18">GPT-4o Mini (Jul 2024)</option>
                    </optgroup>
                    <optgroup label="🔵 OpenAI - GPT-4 Turbo">
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-4-turbo-2024-04-09">GPT-4 Turbo (Apr 2024)</option>
                    </optgroup>
                    <optgroup label="🟣 OpenAI - GPT-4">
                        <option value="gpt-4">GPT-4 (Original)</option>
                        <option value="gpt-4-32k">GPT-4 32K (Large Context)</option>
                    </optgroup>
                    <optgroup label="⚡ OpenAI - GPT-3.5 (Budget)">
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                    </optgroup>
                    <optgroup label="🧠 OpenAI - o1 Reasoning">
                        <option value="o1-preview">o1 Preview (Complex Reasoning)</option>
                        <option value="o1-mini">o1 Mini (Fast Reasoning)</option>
                    </optgroup>
                    <!-- Anthropic Models -->
                    <optgroup label="🟠 Anthropic - Claude 3.5" id="anthropic-models" style="display:none;">
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Latest)</option>
                        <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Jun 2024)</option>
                        <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</option>
                    </optgroup>
                    <optgroup label="🔴 Anthropic - Claude 3">
                        <option value="claude-3-opus-20240229">Claude 3 Opus (Most Capable)</option>
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Balanced)</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</option>
                    </optgroup>
                    <!-- Google Models -->
                    <optgroup label="🆕 Google - Gemini 3 (Latest! Nov 2025)" id="gemini-models" style="display:none;">
                        <option value="gemini-3">Gemini 3 (Latest & Best)</option>
                        <option value="gemini-3-pro">Gemini 3 Pro (Maximum Capability)</option>
                        <option value="gemini-3-flash">Gemini 3 Flash (Fast)</option>
                        <option value="gemini-3-agent">Gemini 3 Agent (Complex Tasks)</option>
                    </optgroup>
                    <optgroup label="🔷 Google - Gemini 2.0">
                        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                    </optgroup>
                    <optgroup label="🔷 Google - Gemini 1.5 (Previous Gen)">
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                    </optgroup>
                    <!-- Local Models -->
                    <optgroup label="🏠 Local LLM" id="local-models" style="display:none;">
                        <option value="llama3">Llama 3 (Ollama)</option>
                        <option value="llama3:70b">Llama 3 70B (Ollama)</option>
                        <option value="mistral">Mistral (Ollama)</option>
                        <option value="mixtral">Mixtral (Ollama)</option>
                        <option value="codellama">Code Llama (Ollama)</option>
                        <option value="phi3">Phi-3 (Ollama)</option>
                        <option value="custom">Custom Model (type below)</option>
                    </optgroup>
                </select>
                <input type="text" id="ai-model-custom" placeholder="Or type custom model name..." style="width: 100%; padding: 10px; margin-top: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #aaa; font-size: 12px;">
                <small style="color: #888; display: block; margin-top: 5px;" id="model-description">Best quality and speed for most tasks</small>
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
        
        // Model descriptions
        const modelDescriptions = {
            // OpenAI GPT-5.1 (NEW! Nov 2025)
            'gpt-5.1': '🆕 Latest & best! Enhanced reasoning & personality',
            'gpt-5.1-instant': '⚡ Quick responses, great for fast tasks',
            'gpt-5.1-thinking': '🧠 Deep reasoning for complex problems',
            'gpt-5.1-pro': '🏆 Maximum capability, best quality',
            // OpenAI GPT-4o
            'gpt-4o': 'Great quality and speed for most tasks',
            'gpt-4o-2024-11-20': 'GPT-4o with improvements',
            'gpt-4o-2024-08-06': 'Structured outputs, reliable JSON',
            'gpt-4o-mini': '⚡ Fast & cheap - great for simple tasks',
            'gpt-4o-mini-2024-07-18': 'Original mini release',
            // GPT-4 Turbo
            'gpt-4-turbo': '128K context, vision capable',
            'gpt-4-turbo-2024-04-09': 'Latest turbo with vision',
            // GPT-4
            'gpt-4': 'Original GPT-4, very capable',
            'gpt-4-32k': '32K context window',
            // GPT-3.5
            'gpt-3.5-turbo': '💰 Cheapest option, good for simple tasks',
            'gpt-3.5-turbo-16k': '16K context window',
            // o1 Reasoning
            'o1-preview': '🧠 Advanced reasoning, complex problems',
            'o1-mini': '🧠 Fast reasoning model',
            // Claude
            'claude-3-5-sonnet-20241022': 'Best Claude model, excellent coding',
            'claude-3-5-sonnet-20240620': 'Previous Sonnet version',
            'claude-3-5-haiku-20241022': '⚡ Fast Claude, good for quick tasks',
            'claude-3-opus-20240229': 'Most capable Claude 3',
            'claude-3-sonnet-20240229': 'Balanced performance',
            'claude-3-haiku-20240307': 'Fastest Claude 3',
            // Gemini 3 (NEW! Nov 2025)
            'gemini-3': '🆕 Latest Google AI! Enhanced coding & reasoning',
            'gemini-3-pro': '🏆 Maximum capability Google AI',
            'gemini-3-flash': '⚡ Fast Gemini 3 responses',
            'gemini-3-agent': '🤖 Autonomous tasks (emails, booking, etc)',
            // Gemini 2.0/1.5
            'gemini-2.0-flash-exp': 'Gemini 2.0, experimental',
            'gemini-1.5-pro': 'Great Gemini, 1M context',
            'gemini-1.5-flash': '⚡ Fast Gemini 1.5',
            // Local
            'llama3': 'Meta Llama 3 8B - good all-around',
            'llama3:70b': 'Meta Llama 3 70B - very capable',
            'mistral': 'Mistral 7B - fast and efficient',
            'mixtral': 'Mixtral 8x7B - mixture of experts',
            'codellama': 'Code Llama - optimized for code',
            'phi3': 'Microsoft Phi-3 - small but capable',
            'custom': 'Enter your own model name below'
        };
        
        // Update model description on selection
        document.getElementById('ai-model').onchange = (e) => {
            const model = e.target.value;
            const desc = document.getElementById('model-description');
            desc.textContent = modelDescriptions[model] || 'Select a model';
        };
        
        // Update API key hint and model options based on provider
        document.getElementById('ai-provider').onchange = (e) => {
            const provider = e.target.value;
            const hint = document.getElementById('api-key-hint');
            const help = document.getElementById('api-key-help');
            const modelSelect = document.getElementById('ai-model');
            
            // Update API key hints
            if (provider === 'openai') {
                hint.textContent = 'OpenAI keys start with "sk-"';
                help.textContent = 'Get your key at platform.openai.com/account/api-keys';
                help.href = 'https://platform.openai.com/account/api-keys';
                help.target = '_blank';
                // Set default model to latest GPT-5.1
                modelSelect.value = 'gpt-5.1';
            } else if (provider === 'anthropic') {
                hint.textContent = 'Anthropic keys start with "sk-ant-"';
                help.textContent = 'Get your key at console.anthropic.com';
                help.href = 'https://console.anthropic.com/';
                help.target = '_blank';
                // Set default Claude model
                modelSelect.value = 'claude-3-5-sonnet-20241022';
            } else if (provider === 'gemini') {
                hint.textContent = 'Google AI API keys start with "AI"';
                help.textContent = 'Get your key at aistudio.google.com/app/apikey';
                help.href = 'https://aistudio.google.com/app/apikey';
                help.target = '_blank';
                // Set default to latest Gemini 3
                modelSelect.value = 'gemini-3';
            } else {
                hint.textContent = 'For local LLM, leave empty';
                help.textContent = 'Local LLM setup guide';
                help.href = '#';
                help.onclick = (e) => {
                    e.preventDefault();
                    alert('For local LLM:\n1. Install Ollama (ollama.ai) or LM Studio\n2. Download a model: ollama pull llama3\n3. Leave API key empty\n4. Set Base URL: http://localhost:11434/v1');
                };
                // Set default local model
                modelSelect.value = 'llama3';
            }
            
            // Update description
            const desc = document.getElementById('model-description');
            desc.textContent = modelDescriptions[modelSelect.value] || 'Select a model';
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
            } else if (provider === 'gemini' && apiKey && !apiKey.startsWith('AI')) {
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
        
        // Handle model selection - check if it's in the dropdown
        const modelSelect = document.getElementById('ai-model');
        const modelCustom = document.getElementById('ai-model-custom');
        const savedModel = config.model || 'gpt-4o';
        
        // Try to select the model in dropdown
        const optionExists = Array.from(modelSelect.options).some(opt => opt.value === savedModel);
        if (optionExists) {
            modelSelect.value = savedModel;
            modelCustom.value = '';
        } else {
            // Model not in dropdown - use custom field
            modelSelect.value = 'custom';
            modelCustom.value = savedModel;
        }
        
        // Update description
        const desc = document.getElementById('model-description');
        if (desc) {
            desc.textContent = this.getModelDescription(savedModel);
        }
        
        document.getElementById('ai-base-url').value = config.baseURL || '';
        document.getElementById('ai-temperature').value = config.temperature || 0.7;
        document.getElementById('temp-value').textContent = config.temperature || 0.7;
        document.getElementById('ai-enable-memory').checked = config.enableMemory !== false;
        document.getElementById('ai-enable-tools').checked = config.enableTools !== false;
        document.getElementById('ai-fallback').checked = config.fallbackToKeyword !== false;
        document.getElementById('ai-retry-rate-limit').checked = config.retryOnRateLimit !== false;
    }
    
    getModelDescription(model) {
        const descriptions = {
            // GPT-5.1 (Latest!)
            'gpt-5.1': '🆕 Latest & best! Enhanced reasoning & personality',
            'gpt-5.1-instant': '⚡ Quick responses, great for fast tasks',
            'gpt-5.1-thinking': '🧠 Deep reasoning for complex problems',
            'gpt-5.1-pro': '🏆 Maximum capability, best quality',
            // GPT-4o
            'gpt-4o': 'Great quality and speed for most tasks',
            'gpt-4o-mini': '⚡ Fast & cheap - great for simple tasks',
            'gpt-4-turbo': '128K context, vision capable',
            'gpt-4': 'Original GPT-4, very capable',
            'gpt-3.5-turbo': '💰 Cheapest option, good for simple tasks',
            'o1-preview': '🧠 Advanced reasoning, complex problems',
            'o1-mini': '🧠 Fast reasoning model',
            // Claude
            'claude-3-5-sonnet-20241022': 'Best Claude model, excellent coding',
            // Gemini 3 (Latest!)
            'gemini-3': '🆕 Latest Google AI! Enhanced coding & reasoning',
            'gemini-3-pro': '🏆 Maximum capability Google AI',
            'gemini-1.5-pro': 'Great Gemini, 1M context'
        };
        return descriptions[model] || 'Custom model';
    }
    
    async saveConfig() {
        // Get model - use custom input if dropdown is set to 'custom' or if custom has value
        let selectedModel = document.getElementById('ai-model').value;
        const customModel = document.getElementById('ai-model-custom').value.trim();
        
        if (selectedModel === 'custom' && customModel) {
            selectedModel = customModel;
        } else if (customModel && customModel !== '') {
            // User typed a custom model - use that instead
            selectedModel = customModel;
        }
        
        const config = {
            provider: document.getElementById('ai-provider').value,
            apiKey: document.getElementById('ai-api-key').value || null,
            model: selectedModel || 'gpt-4o',
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
        
        // Get model - use custom input if available
        let model = document.getElementById('ai-model').value;
        const customModel = document.getElementById('ai-model-custom').value.trim();
        if (customModel && customModel !== '') {
            model = customModel;
        } else if (model === 'custom') {
            model = 'gpt-4o'; // Fallback if custom selected but no value
        }
        
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
        
        if (provider === 'gemini' && apiKey && !apiKey.trim().startsWith('AI')) {
            statusEl.style.background = 'rgba(244, 67, 54, 0.2)';
            statusEl.style.color = '#f44336';
            statusEl.textContent = '❌ Invalid Gemini API key format. Must start with "AI"';
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
                } else if (provider === 'gemini') {
                    errorMsg = '❌ Invalid Gemini API key. Please check:\n• Key starts with "AI"\n• Key is complete (not truncated)\n• Key is from https://aistudio.google.com/app/apikey';
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

