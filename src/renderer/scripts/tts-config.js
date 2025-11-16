/**
 * TTS Configuration UI Manager
 * Provides UI for configuring high-quality TTS providers
 */

class TTSConfigManager {
    constructor(rheaController) {
        this.rhea = rheaController;
        this.modal = null;
        this.init();
    }
    
    init() {
        this.createConfigButton();
    }
    
    createConfigButton() {
        const rheaPanel = document.querySelector('.rhea-panel');
        if (!rheaPanel) return;
        
        if (document.getElementById('tts-config-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'tts-config-btn';
        btn.className = 'tts-config-btn';
        btn.innerHTML = '🎤 Voice Settings';
        btn.style.cssText = `
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
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.onclick = () => this.showModal();
        
        // Insert after AI config button or knowledge base button
        const kbBtn = document.getElementById('kb-import-btn');
        const aiBtn = document.getElementById('ai-config-btn');
        const insertAfter = kbBtn || aiBtn;
        if (insertAfter) {
            insertAfter.parentNode.insertBefore(btn, insertAfter.nextSibling);
        }
    }
    
    showModal() {
        if (!this.modal) {
            this.createModal();
        }
        
        this.populateForm();
        this.modal.style.display = 'flex';
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'tts-config-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10002;
            justify-content: center;
            align-items: center;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
            padding: 30px;
            border-radius: 16px;
            max-width: 700px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;
        
        content.innerHTML = `
            <h2 style="color: #fff; margin-top: 0; margin-bottom: 20px;">🎤 RHEA Voice Settings</h2>
            
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 8px;">
                <strong style="color: #667eea;">💡 Upgrade to High-Quality Voices</strong>
                <p style="color: #aaa; margin: 10px 0 0 0; font-size: 13px;">
                    Browser TTS is limited. Upgrade to ElevenLabs, Coqui, or other providers for 
                    much more natural, human-like voices.
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">TTS Provider</label>
                <select id="tts-provider" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <option value="browser">Browser TTS (Default - Free)</option>
                    <option value="elevenlabs">ElevenLabs (Best Quality ⭐)</option>
                    <option value="coqui">Coqui TTS (Free, Local)</option>
                    <option value="piper">Piper TTS (Free, Fast, Local)</option>
                    <option value="polly">Amazon Polly (Good Quality, Cheap)</option>
                    <option value="google">Google Cloud TTS (Good Quality)</option>
                </select>
            </div>
            
            <!-- ElevenLabs Settings -->
            <div id="elevenlabs-settings" style="display: none; margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">ElevenLabs API Key</label>
                <input type="password" id="elevenlabs-api-key" placeholder="Enter your ElevenLabs API key" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                <small style="color: #aaa; display: block; margin-top: 5px;">
                    Get your key at <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" style="color: #667eea;">elevenlabs.io</a>
                </small>
                <label style="color: #fff; display: block; margin-top: 15px; margin-bottom: 8px; font-weight: bold;">Voice</label>
                <select id="elevenlabs-voice" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Default)</option>
                    <option value="pNInz6obpgDQGcFmaJgB">Adam</option>
                    <option value="EXAVITQu4vr4xnSDxMaL">Bella</option>
                    <option value="ErXwobaYiN019PkySvjV">Antoni</option>
                    <option value="MF3mGyEYCl7XYWbV9V6O">Elli</option>
                    <option value="TxGEqnHWrfWFTfGW9XjX">Josh</option>
                    <option value="VR6AewLTigWG4xSOukaG">Arnold</option>
                    <option value="pMsXgVXv3BLzUgSXRplE">Sam</option>
                </select>
                <small style="color: #aaa; display: block; margin-top: 5px;">
                    <a href="#" id="elevenlabs-load-voices" style="color: #667eea;">Load your custom voices</a>
                </small>
            </div>
            
            <!-- Coqui/Piper Settings -->
            <div id="local-tts-settings" style="display: none; margin-bottom: 20px; padding: 15px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px;">
                <strong style="color: #ffc107;">⚠️ Local TTS Setup Required</strong>
                <p style="color: #aaa; margin: 10px 0 0 0; font-size: 13px;">
                    Coqui and Piper require a backend service. See <code>TTS_SETUP.md</code> for installation instructions.
                </p>
            </div>
            
            <!-- Amazon Polly Settings -->
            <div id="polly-settings" style="display: none; margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">AWS Credentials</label>
                <input type="text" id="polly-access-key" placeholder="AWS Access Key ID" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; margin-bottom: 10px;">
                <input type="password" id="polly-secret-key" placeholder="AWS Secret Access Key" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                <small style="color: #aaa; display: block; margin-top: 5px;">
                    Get credentials from <a href="https://console.aws.amazon.com/iam/" target="_blank" style="color: #667eea;">AWS IAM Console</a>
                </small>
            </div>
            
            <!-- Google Cloud Settings -->
            <div id="google-settings" style="display: none; margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Google Cloud API Key</label>
                <input type="password" id="google-api-key" placeholder="Enter your Google Cloud API key" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                <small style="color: #aaa; display: block; margin-top: 5px;">
                    Get your key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #667eea;">Google Cloud Console</a>
                </small>
            </div>
            
            <!-- Test Section -->
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Test Voice</label>
                <input type="text" id="tts-test-text" value="Hello, I am RHEA, your voice assistant." style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; margin-bottom: 10px;">
                <button id="tts-test-btn" style="width: 100%; padding: 12px; background: #2196F3; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Test Voice</button>
            </div>
            
            <!-- Status -->
            <div id="tts-status" style="margin-bottom: 20px; padding: 10px; border-radius: 8px; display: none;"></div>
            
            <!-- Actions -->
            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button id="tts-save-btn" style="flex: 1; padding: 12px; background: #4CAF50; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Save</button>
                <button id="tts-close-btn" style="flex: 1; padding: 12px; background: #666; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Close</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('tts-provider').onchange = (e) => this.updateProviderSettings(e.target.value);
        document.getElementById('tts-save-btn').onclick = () => this.saveConfig();
        document.getElementById('tts-test-btn').onclick = () => this.testVoice();
        document.getElementById('tts-close-btn').onclick = () => this.closeModal();
        document.getElementById('elevenlabs-load-voices').onclick = (e) => {
            e.preventDefault();
            this.loadElevenLabsVoices();
        };
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };
        
        this.modal = modal;
    }
    
    updateProviderSettings(provider) {
        // Hide all settings
        document.getElementById('elevenlabs-settings').style.display = 'none';
        document.getElementById('local-tts-settings').style.display = 'none';
        document.getElementById('polly-settings').style.display = 'none';
        document.getElementById('google-settings').style.display = 'none';
        
        // Show relevant settings
        if (provider === 'elevenlabs') {
            document.getElementById('elevenlabs-settings').style.display = 'block';
        } else if (provider === 'coqui' || provider === 'piper') {
            document.getElementById('local-tts-settings').style.display = 'block';
        } else if (provider === 'polly') {
            document.getElementById('polly-settings').style.display = 'block';
        } else if (provider === 'google') {
            document.getElementById('google-settings').style.display = 'block';
        }
    }
    
    populateForm() {
        const config = this.rhea.loadTTSConfig();
        
        document.getElementById('tts-provider').value = config.provider || 'browser';
        document.getElementById('elevenlabs-api-key').value = config.elevenlabs?.apiKey || '';
        document.getElementById('elevenlabs-voice').value = config.elevenlabs?.voiceId || '21m00Tcm4TlvDq8ikWAM';
        document.getElementById('polly-access-key').value = config.polly?.accessKey || '';
        document.getElementById('polly-secret-key').value = config.polly?.secretKey || '';
        document.getElementById('google-api-key').value = config.google?.apiKey || '';
        
        this.updateProviderSettings(config.provider || 'browser');
    }
    
    async saveConfig() {
        const provider = document.getElementById('tts-provider').value;
        const config = {
            provider: provider
        };
        
        if (provider === 'elevenlabs') {
            config.apiKey = document.getElementById('elevenlabs-api-key').value || null;
            config.elevenlabs = {
                apiKey: document.getElementById('elevenlabs-api-key').value || null,
                voiceId: document.getElementById('elevenlabs-voice').value
            };
        } else if (provider === 'polly') {
            config.polly = {
                accessKey: document.getElementById('polly-access-key').value || null,
                secretKey: document.getElementById('polly-secret-key').value || null
            };
        } else if (provider === 'google') {
            config.apiKey = document.getElementById('google-api-key').value || null;
            config.google = {
                apiKey: document.getElementById('google-api-key').value || null
            };
        }
        
        this.rhea.saveTTSConfig(config);
        this.showStatus('✅ Configuration saved!', 'success');
        
        // Reinitialize TTS
        setTimeout(() => {
            this.rhea.initTTS();
            this.showStatus('✅ TTS Provider reinitialized!', 'success');
        }, 500);
    }
    
    async testVoice() {
        const text = document.getElementById('tts-test-text').value || 'Hello, I am RHEA, your voice assistant.';
        
        this.showStatus('🔄 Testing voice...', 'info');
        
        try {
            await this.rhea.speak(text);
            this.showStatus('✅ Voice test complete!', 'success');
        } catch (error) {
            this.showStatus(`❌ Test failed: ${error.message}`, 'error');
        }
    }
    
    async loadElevenLabsVoices() {
        const apiKey = document.getElementById('elevenlabs-api-key').value;
        if (!apiKey) {
            this.showStatus('❌ Please enter API key first', 'error');
            return;
        }
        
        this.showStatus('🔄 Loading voices...', 'info');
        
        try {
            if (typeof TTSProvider !== 'undefined') {
                const tempProvider = new TTSProvider({ provider: 'elevenlabs', apiKey });
                const voices = await tempProvider.getElevenLabsVoices();
                
                const select = document.getElementById('elevenlabs-voice');
                select.innerHTML = '<option value="">Select a voice...</option>';
                
                voices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.voice_id;
                    option.textContent = `${voice.name}${voice.labels ? ' - ' + voice.labels.description : ''}`;
                    select.appendChild(option);
                });
                
                this.showStatus(`✅ Loaded ${voices.length} voices!`, 'success');
            }
        } catch (error) {
            this.showStatus(`❌ Failed to load voices: ${error.message}`, 'error');
        }
    }
    
    showStatus(message, type) {
        const statusEl = document.getElementById('tts-status');
        statusEl.style.display = 'block';
        statusEl.style.background = type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 
                                    type === 'error' ? 'rgba(244, 67, 54, 0.2)' : 
                                    'rgba(255, 193, 7, 0.2)';
        statusEl.style.color = type === 'success' ? '#4CAF50' : 
                               type === 'error' ? '#f44336' : '#ffc107';
        statusEl.textContent = message;
        
        if (type !== 'info') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}

