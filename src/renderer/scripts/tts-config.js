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
        
        // Don't create button - it's now in the premium UI grid
        console.log('✅ TTS Config Manager initialized');
    }
    
    show() {
        // Alias for showModal() - used by button handlers
        this.showModal();
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
            
            <!-- Voice Feedback Toggle -->
            <div style="margin-bottom: 25px; padding: 15px; background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #4CAF50;">🗣️ Voice Feedback</strong>
                        <p style="color: #aaa; margin: 5px 0 0 0; font-size: 13px;">
                            Enable RHEA to speak confirmations for all commands
                        </p>
                    </div>
                    <label style="position: relative; display: inline-block; width: 60px; height: 34px;">
                        <input type="checkbox" id="voice-feedback-toggle" style="opacity: 0; width: 0; height: 0;">
                        <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px;">
                            <span style="position: absolute; content: ''; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                        </span>
                    </label>
                </div>
            </div>

            <!-- Wake Phrase / Playback Safety -->
            <div style="margin-bottom: 25px; padding: 15px; background: rgba(102, 126, 234, 0.12); border: 1px solid rgba(102, 126, 234, 0.35); border-radius: 8px;">
                <div style="margin-bottom: 12px;">
                    <strong style="color: #8aa0ff; font-size: 16px;">🔔 Wake Phrase Safety</strong>
                    <p style="color: #aaa; margin: 5px 0 0 0; font-size: 13px;">
                        Prevent music playback from triggering commands by requiring a wake phrase.
                    </p>
                </div>

                <label style="color: #fff; display: block; margin-bottom: 6px; font-weight: 500;">Wake Mode:</label>
                <select id="wake-mode-select" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; cursor: pointer; margin-bottom: 12px;">
                    <option value="always">Always require wake phrase (recommended)</option>
                    <option value="playback">Require wake phrase only during playback</option>
                    <option value="auto">Auto (headset-aware)</option>
                    <option value="off">Off (not recommended)</option>
                </select>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label style="color: #fff; font-weight: 500;">Wake Session Duration:</label>
                    <span id="wake-session-ms-value" style="color: #8aa0ff; font-weight: 600;">6.0s</span>
                </div>
                <input id="wake-session-ms-slider" type="range" min="1000" max="15000" step="500" value="6000" style="width: 100%; cursor: pointer;">
                <p style="color: #aaa; margin: 8px 0 0 0; font-size: 12px;">
                    After saying “hey rhea …”, you can speak follow-up commands without repeating the wake phrase during this window.
                </p>
            </div>
            
            <!-- Screen Awareness Section -->
            <div style="margin-bottom: 25px; padding: 15px; background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 8px;">
                <div style="margin-bottom: 15px;">
                    <strong style="color: #FF9800; font-size: 16px;">🖱️ Screen Awareness</strong>
                    <p style="color: #aaa; margin: 5px 0 0 0; font-size: 13px;">
                        RHEA can "see" what you're pointing at in REAPER and announce it!
                    </p>
                </div>
                
                <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; cursor: pointer;">
                    <input type="checkbox" id="screenAwarenessEnabled" style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="color: #fff;">Enable Screen Awareness</span>
                </label>
                
                <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; margin-left: 28px; cursor: pointer;">
                    <input type="checkbox" id="screenAwarenessAutoAnnounce" style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="color: #fff;">Auto-announce on hover</span>
                </label>
                
                <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; margin-left: 28px; cursor: pointer;">
                    <input type="checkbox" id="screenAwarenessVisualOnly" style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="color: #fff;">Visual feedback only (no speech)</span>
                </label>
                
                <div style="margin-left: 28px;">
                    <label style="color: #fff; display: block; margin-bottom: 6px; font-weight: 500;">Hover Delay:</label>
                    <select id="screenAwarenessHoverDelay" style="width: calc(100% - 28px); padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; cursor: pointer;">
                        <option value="300">Fast (300ms)</option>
                        <option value="500" selected>Normal (500ms)</option>
                        <option value="1000">Slow (1000ms)</option>
                        <option value="1500">Very Slow (1500ms)</option>
                    </select>
                </div>
                
                <div style="margin-top: 12px; padding: 10px; background: rgba(33, 150, 243, 0.15); border-left: 3px solid #2196F3; border-radius: 4px;">
                    <p style="color: #81D4FA; margin: 0; font-size: 12px;">
                        ℹ️ <strong>Requires macOS Accessibility permission</strong> (one-time setup). 
                        System will prompt you on first enable.
                    </p>
                </div>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 8px;">
                <strong style="color: #4CAF50;">✅ OpenAI TTS Required</strong>
                <p style="color: #aaa; margin: 10px 0 0 0; font-size: 13px;">
                    RHEA uses OpenAI TTS for natural, consistent voice output. 
                    Your OpenAI API key from AI Config is used automatically.
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">TTS Provider</label>
                <select id="tts-provider" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <option value="openai">OpenAI TTS - ChatGPT Voices ⭐ (Required)</option>
                    <option value="elevenlabs">ElevenLabs (Premium Quality)</option>
                    <option value="coqui">Coqui TTS (Free, Local)</option>
                    <option value="piper">Piper TTS (Free, Fast, Local)</option>
                    <option value="polly">Amazon Polly (Good Quality, Cheap)</option>
                    <option value="google">Google Cloud TTS (Good Quality)</option>
                </select>
            </div>
            
            <!-- OpenAI TTS Settings -->
            <div id="openai-settings" style="display: none; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, rgba(16,163,127,0.2), rgba(16,163,127,0.05)); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid rgba(16,163,127,0.3);">
                    <strong style="color: #10a37f;">🎤 OpenAI TTS - ChatGPT-Quality Voices</strong>
                    <p style="color: #aaa; margin: 10px 0 0 0; font-size: 13px;">
                        Uses the same natural-sounding voices as ChatGPT. Uses your existing OpenAI API key.
                    </p>
                </div>
                <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Voice</label>
                <select id="openai-voice" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <option value="nova">Nova ⭐ - Friendly, upbeat (recommended)</option>
                    <option value="shimmer">Shimmer - Soft, gentle</option>
                    <option value="alloy">Alloy - Neutral, balanced</option>
                    <option value="echo">Echo - Warm, conversational</option>
                    <option value="fable">Fable - British, expressive</option>
                    <option value="onyx">Onyx - Deep, authoritative</option>
                </select>
                <label style="color: #fff; display: block; margin-top: 15px; margin-bottom: 8px; font-weight: bold;">Model Quality</label>
                <select id="openai-model" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <option value="tts-1">Standard (tts-1) - Fast, ~$0.015/1K chars</option>
                    <option value="tts-1-hd">HD (tts-1-hd) - Best quality, ~$0.030/1K chars</option>
                </select>
                <small style="color: #aaa; display: block; margin-top: 10px;">
                    💡 Uses your OpenAI API key from AI Config. Cost: ~$0.015 per 1,000 characters.
                </small>
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
            
            <!-- Voice Speed Section -->
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(156, 39, 176, 0.1); border: 1px solid rgba(156, 39, 176, 0.3); border-radius: 8px;">
                <strong style="color: #BA68C8;">⚡ Voice Speed</strong>
                <p style="color: #aaa; margin: 5px 0 15px 0; font-size: 13px;">
                    Adjust how fast RHEA speaks
                </p>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #888; font-size: 12px;">Slow</span>
                    <input type="range" id="voice-speed-slider" min="0.5" max="1.5" step="0.05" value="0.85" 
                        style="flex: 1; height: 6px; cursor: pointer; accent-color: #BA68C8;">
                    <span style="color: #888; font-size: 12px;">Fast</span>
                </div>
                <div style="text-align: center; margin-top: 8px;">
                    <span id="voice-speed-value" style="color: #BA68C8; font-weight: bold;">0.85x</span>
                </div>
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
        
        // Voice feedback toggle event
        const toggle = document.getElementById('voice-feedback-toggle');
        toggle.onchange = () => this.toggleVoiceFeedback(toggle.checked);

        // Wake mode + wake session events
        const wakeModeSelect = document.getElementById('wake-mode-select');
        const wakeSessionSlider = document.getElementById('wake-session-ms-slider');
        if (wakeModeSelect) {
            wakeModeSelect.onchange = () => this.updateWakeSettings();
        }
        if (wakeSessionSlider) {
            wakeSessionSlider.oninput = () => {
                const ms = parseInt(wakeSessionSlider.value, 10) || 6000;
                const label = document.getElementById('wake-session-ms-value');
                if (label) label.textContent = `${(ms / 1000).toFixed(1)}s`;
            };
            wakeSessionSlider.onchange = () => this.updateWakeSettings();
        }
        
        // Voice speed slider event
        const speedSlider = document.getElementById('voice-speed-slider');
        const speedValue = document.getElementById('voice-speed-value');
        if (speedSlider) {
            speedSlider.oninput = () => {
                const speed = parseFloat(speedSlider.value);
                speedValue.textContent = `${speed.toFixed(2)}x`;
                // Live update RHEA's voice speed
                if (this.rhea && this.rhea.setVoiceSettings) {
                    this.rhea.setVoiceSettings({ rate: speed });
                }
            };
        }
        
        // Screen Awareness event listeners
        const screenAwarenessEnabled = document.getElementById('screenAwarenessEnabled');
        const screenAwarenessAutoAnnounce = document.getElementById('screenAwarenessAutoAnnounce');
        const screenAwarenessVisualOnly = document.getElementById('screenAwarenessVisualOnly');
        const screenAwarenessHoverDelay = document.getElementById('screenAwarenessHoverDelay');

        if (screenAwarenessEnabled) {
            screenAwarenessEnabled.onchange = (e) => {
                if (window.rhea && window.rhea.screenAwareness) {
                    window.rhea.screenAwareness.setEnabled(e.target.checked);
                }
            };
        }

        if (screenAwarenessAutoAnnounce) {
            screenAwarenessAutoAnnounce.onchange = (e) => {
                if (window.rhea && window.rhea.screenAwareness) {
                    window.rhea.screenAwareness.setAutoAnnounce(e.target.checked);
                }
            };
        }

        if (screenAwarenessVisualOnly) {
            screenAwarenessVisualOnly.onchange = (e) => {
                if (window.rhea && window.rhea.screenAwareness) {
                    window.rhea.screenAwareness.setVisualOnly(e.target.checked);
                }
            };
        }

        if (screenAwarenessHoverDelay) {
            screenAwarenessHoverDelay.onchange = (e) => {
                if (window.rhea && window.rhea.screenAwareness) {
                    window.rhea.screenAwareness.setHoverDelay(parseInt(e.target.value, 10));
                }
            };
        }
        
        // Add CSS for toggle switch animation
        const style = document.createElement('style');
        style.textContent = `
            #voice-feedback-toggle:checked + span {
                background-color: #4CAF50 !important;
            }
            #voice-feedback-toggle:checked + span span {
                transform: translateX(26px);
            }
        `;
        document.head.appendChild(style);
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };
        
        this.modal = modal;
    }
    
    updateProviderSettings(provider) {
        // Hide all settings
        document.getElementById('openai-settings').style.display = 'none';
        document.getElementById('elevenlabs-settings').style.display = 'none';
        document.getElementById('local-tts-settings').style.display = 'none';
        document.getElementById('polly-settings').style.display = 'none';
        document.getElementById('google-settings').style.display = 'none';
        
        // Show relevant settings
        if (provider === 'openai') {
            document.getElementById('openai-settings').style.display = 'block';
        } else if (provider === 'elevenlabs') {
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
        
        // Load voice feedback setting (default: true - RHEA speaks)
        const voiceFeedbackEnabled = localStorage.getItem('voiceFeedbackEnabled') !== 'false';
        document.getElementById('voice-feedback-toggle').checked = voiceFeedbackEnabled;

        // Load wake settings
        const wakeMode = localStorage.getItem('rhea_wake_mode') || 'always';
        const wakeModeSelect = document.getElementById('wake-mode-select');
        if (wakeModeSelect) wakeModeSelect.value = wakeMode;

        const wakeMsRaw = localStorage.getItem('rhea_wake_session_ms');
        const wakeMs = wakeMsRaw ? parseInt(wakeMsRaw, 10) : 6000;
        const wakeSessionSlider = document.getElementById('wake-session-ms-slider');
        const wakeSessionValue = document.getElementById('wake-session-ms-value');
        if (wakeSessionSlider) wakeSessionSlider.value = String(Number.isFinite(wakeMs) ? wakeMs : 6000);
        if (wakeSessionValue) wakeSessionValue.textContent = `${(((Number.isFinite(wakeMs) ? wakeMs : 6000)) / 1000).toFixed(1)}s`;
        
        // Load Screen Awareness settings
        try {
            const screenAwarenessSettings = JSON.parse(localStorage.getItem('screenAwarenessSettings') || '{}');
            const enabledCheckbox = document.getElementById('screenAwarenessEnabled');
            const autoAnnounceCheckbox = document.getElementById('screenAwarenessAutoAnnounce');
            const visualOnlyCheckbox = document.getElementById('screenAwarenessVisualOnly');
            const hoverDelaySelect = document.getElementById('screenAwarenessHoverDelay');

            // Default to TRUE if not explicitly set (enabled by default)
            if (enabledCheckbox) enabledCheckbox.checked = screenAwarenessSettings.enabled !== undefined ? screenAwarenessSettings.enabled : true;
            if (autoAnnounceCheckbox) autoAnnounceCheckbox.checked = screenAwarenessSettings.autoAnnounce !== false;
            if (visualOnlyCheckbox) visualOnlyCheckbox.checked = screenAwarenessSettings.visualOnly || false;
            if (hoverDelaySelect) hoverDelaySelect.value = screenAwarenessSettings.hoverDelay || 500;
        } catch (e) {
            console.warn('Failed to load screen awareness settings:', e);
        }
        
        document.getElementById('tts-provider').value = config.provider || 'openai';
        document.getElementById('openai-voice').value = config.openai?.voice || 'nova';
        document.getElementById('openai-model').value = config.openai?.model || 'tts-1';
        document.getElementById('elevenlabs-api-key').value = config.elevenlabs?.apiKey || '';
        document.getElementById('elevenlabs-voice').value = config.elevenlabs?.voiceId || '21m00Tcm4TlvDq8ikWAM';
        document.getElementById('polly-access-key').value = config.polly?.accessKey || '';
        document.getElementById('polly-secret-key').value = config.polly?.secretKey || '';
        document.getElementById('google-api-key').value = config.google?.apiKey || '';
        
        // Load voice speed
        const savedSpeed = localStorage.getItem('rhea_voice_speed');
        const speed = savedSpeed ? parseFloat(savedSpeed) : 0.85; // Default to 0.85 (slightly slower)
        const speedSlider = document.getElementById('voice-speed-slider');
        const speedValue = document.getElementById('voice-speed-value');
        if (speedSlider) {
            speedSlider.value = speed;
            speedValue.textContent = `${speed.toFixed(2)}x`;
            // Apply to RHEA
            if (this.rhea && this.rhea.setVoiceSettings) {
                this.rhea.setVoiceSettings({ rate: speed });
            }
        }
        
        this.updateProviderSettings(config.provider || 'openai');
    }

    updateWakeSettings() {
        const wakeModeSelect = document.getElementById('wake-mode-select');
        const wakeSessionSlider = document.getElementById('wake-session-ms-slider');
        if (!wakeModeSelect || !wakeSessionSlider) return;

        const mode = wakeModeSelect.value || 'always';
        const ms = parseInt(wakeSessionSlider.value, 10) || 6000;

        // Persist
        localStorage.setItem('rhea_wake_mode', mode);
        localStorage.setItem('rhea_wake_session_ms', String(ms));

        // Apply immediately
        if (this.rhea && typeof this.rhea.setWakeSettings === 'function') {
            this.rhea.setWakeSettings({ mode, wakeSessionDurationMs: ms });
        } else if (this.rhea) {
            // Fallback: apply directly if method isn't available yet
            this.rhea.wakeMode = mode;
            this.rhea.wakeSessionDurationMs = ms;
        }

        this.showStatus(`✅ Wake mode: ${mode} • Session: ${(ms / 1000).toFixed(1)}s`, 'success');
        console.log('🔔 Wake settings updated:', { mode, ms });
    }
    
    async saveConfig() {
        const provider = document.getElementById('tts-provider').value;
        const config = {
            provider: provider
        };
        
        if (provider === 'openai') {
            // Get OpenAI API key from AI config (shared)
            const aiConfig = localStorage.getItem('rhea_ai_config');
            let openaiKey = null;
            if (aiConfig) {
                try {
                    const parsed = JSON.parse(aiConfig);
                    openaiKey = parsed.apiKey;
                } catch (e) {}
            }
            config.apiKey = openaiKey;
            config.openai = {
                voice: document.getElementById('openai-voice').value || 'nova',
                model: document.getElementById('openai-model').value || 'tts-1',
                speed: 1.0
            };
        } else if (provider === 'elevenlabs') {
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
        
        // Save voice speed
        const speedSlider = document.getElementById('voice-speed-slider');
        if (speedSlider) {
            localStorage.setItem('rhea_voice_speed', speedSlider.value);
        }
        
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
        if (!apiKey || apiKey.trim() === '') {
            this.showStatus('❌ Please enter a valid API key first', 'error');
            return;
        }
        
        this.showStatus('🔄 Loading voices...', 'info');
        
        try {
            if (typeof TTSProvider !== 'undefined') {
                const tempProvider = new TTSProvider({ provider: 'elevenlabs', apiKey });
                const voices = await tempProvider.getElevenLabsVoices();
                
                // Check if we got any voices back
                if (!voices || voices.length === 0) {
                    this.showStatus('❌ No voices returned. Check your API key.', 'error');
                    return;
                }
                
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
            console.error('ElevenLabs voice loading error:', error);
            
            // Provide user-friendly error messages
            let errorMsg = 'Failed to load voices';
            if (error.message && error.message.includes('401')) {
                errorMsg = 'Invalid API key. Please check your ElevenLabs API key.';
            } else if (error.message && error.message.includes('403')) {
                errorMsg = 'API key does not have permission. Check your ElevenLabs account.';
            } else if (error.message && error.message.includes('429')) {
                errorMsg = 'Rate limit exceeded. Please wait and try again.';
            } else if (error.message) {
                errorMsg = `Error: ${error.message}`;
            }
            
            this.showStatus(`❌ ${errorMsg}`, 'error');
        }
    }
    
    toggleVoiceFeedback(enabled) {
        // Save setting to localStorage
        localStorage.setItem('voiceFeedbackEnabled', enabled ? 'true' : 'false');
        
        // Update RHEA's voice feedback setting
        if (this.rhea) {
            this.rhea.voiceFeedbackEnabled = enabled;
        }
        
        // Show confirmation
        this.showStatus(
            enabled ? '✅ Voice feedback enabled - RHEA will speak confirmations' : '🔇 Voice feedback disabled - Silent mode',
            'success'
        );
        
        console.log('🗣️ Voice feedback:', enabled ? 'ENABLED' : 'DISABLED');
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

// Ensure the class is always accessible globally (some Electron contexts can be finicky about globals)
try {
    window.TTSConfigManager = TTSConfigManager;
} catch (_) {}

