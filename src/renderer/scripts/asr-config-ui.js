/**
 * DAWRV Advanced ASR Configuration UI
 * =====================================
 * Frontend interface for the advanced speech recognition system.
 */

class ASRConfigUI {
    constructor(rheaController) {
        this.rhea = rheaController;
        this.modal = null;
        this.isASRRunning = false;
        
        // Current config
        this.config = {
            speechEngine: 'local',  // 'local' or 'openai'
            modelSize: 'base',
            mode: 'command',
            confidenceThreshold: 0.85,
            activeProfile: 'default',
            enableVAD: true,
            vadAggressiveness: 3,
            openaiSTTKey: ''
        };
        
        // Track fallback state to prevent retry loops
        this._fallbackInProgress = false;
        
        // Load saved config
        this.loadConfig();
    }
    
    loadConfig() {
        try {
            const saved = localStorage.getItem('dawrv_asr_config');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (err) {
            console.error('Error loading ASR config:', err);
        }
    }
    
    saveConfig() {
        try {
            localStorage.setItem('dawrv_asr_config', JSON.stringify(this.config));
        } catch (err) {
            console.error('Error saving ASR config:', err);
        }
    }
    
    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.updateStatus();
            return;
        }
        this.createModal();
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'asr-config-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 30px;
            border-radius: 20px;
            max-width: 800px;
            width: 95%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(102, 126, 234, 0.2);
        `;
        
        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="color: #fff; margin: 0;">
                    🎤 Advanced Speech Recognition
                </h2>
                <div id="asr-status-badge" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    ⏹️ Stopped
                </div>
            </div>
            
            <!-- Quick Controls -->
            <div style="display: flex; gap: 12px; margin-bottom: 25px;">
                <button id="asr-start-btn" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #4CAF50, #45a049); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ▶️ Start Listening
                </button>
                <button id="asr-stop-btn" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #f44336, #d32f2f); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;" disabled>
                    ⏹️ Stop
                </button>
            </div>
            
            <!-- ========== SPEECH ENGINE SELECTION ========== -->
            <div style="margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, rgba(0, 150, 136, 0.15), rgba(0, 188, 212, 0.15)); border: 2px solid rgba(0, 188, 212, 0.4); border-radius: 12px;">
                <h3 style="color: #00BCD4; margin: 0 0 15px 0; font-size: 16px;">🔊 Speech Recognition Engine</h3>
                
                <div style="display: flex; gap: 12px; margin-bottom: 15px; flex-wrap: wrap;">
                    <!-- Local Whisper Option -->
                    <label id="engine-local-label" style="flex: 1; display: flex; flex-direction: column; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; border: 2px solid #4CAF50; position: relative;">
                        <div style="position: absolute; top: 8px; right: 8px; background: #4CAF50; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;">ACTIVE</div>
                        <input type="radio" name="speech-engine" value="local" checked style="position: absolute; opacity: 0;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 24px;">💻</span>
                            <div>
                                <div style="color: #fff; font-weight: bold;">Local Whisper</div>
                                <div style="color: #4CAF50; font-size: 11px;">FREE • Offline</div>
                            </div>
                        </div>
                        <div style="color: #aaa; font-size: 11px; line-height: 1.4;">
                            ✓ No internet required<br>
                            ✓ Privacy - audio stays local<br>
                            ✓ No usage costs<br>
                            ⚡ ~2-3 second processing
                        </div>
                    </label>
                    
                    <!-- Deepgram Streaming Option -->
                    <label id="engine-deepgram-label" style="flex: 1; display: flex; flex-direction: column; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; border: 2px solid transparent; position: relative; opacity: 0.85;">
                        <input type="radio" name="speech-engine" value="deepgram" style="position: absolute; opacity: 0;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 24px;">🚀</span>
                            <div>
                                <div style="color: #fff; font-weight: bold;">Deepgram Streaming</div>
                                <div style="color: #00BCD4; font-size: 11px;">Low-latency • Cloud</div>
                            </div>
                        </div>
                        <div style="color: #aaa; font-size: 11px; line-height: 1.4;">
                            ⚡ ~200–500ms feel<br>
                            🎯 Great accuracy on commands<br>
                            🌐 Requires internet<br>
                            🔑 Uses Deepgram API key
                        </div>
                    </label>

                    <!-- AssemblyAI Option (RECOMMENDED) -->
                    <label id="engine-assemblyai-label" style="flex: 1; display: flex; flex-direction: column; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; border: 2px solid transparent; position: relative; opacity: 0.85;">
                        <input type="radio" name="speech-engine" value="assemblyai" style="position: absolute; opacity: 0;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 24px;">⭐</span>
                            <div>
                                <div style="color: #fff; font-weight: bold;">AssemblyAI</div>
                                <div style="color: #FF6B35; font-size: 11px;">RECOMMENDED • Reliable</div>
                            </div>
                        </div>
                        <div style="color: #aaa; font-size: 11px; line-height: 1.4;">
                            ⚡ ~300-500ms latency<br>
                            🎯 Excellent accuracy<br>
                            ✅ Very reliable API<br>
                            🔑 Free tier available
                        </div>
                    </label>

                    <!-- Gemini 2.5 Audio Option -->
                    <label id="engine-gemini-label" style="flex: 1; display: flex; flex-direction: column; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; border: 2px solid transparent; position: relative; opacity: 0.85;">
                        <input type="radio" name="speech-engine" value="gemini" style="position: absolute; opacity: 0;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 24px;">✨</span>
                            <div>
                                <div style="color: #fff; font-weight: bold;">Gemini 2.5 Audio</div>
                                <div style="color: #9C27B0; font-size: 11px;">Natural • Cloud</div>
                            </div>
                        </div>
                        <div style="color: #aaa; font-size: 11px; line-height: 1.4;">
                            🎤 Natural-sounding audio<br>
                            🎯 High accuracy<br>
                            🌐 Requires internet<br>
                            🔑 Uses Gemini API key
                        </div>
                    </label>

                    <!-- OpenAI API Option -->
                    <label id="engine-openai-label" style="flex: 1; display: flex; flex-direction: column; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; border: 2px solid transparent; position: relative; opacity: 0.8;">
                        <input type="radio" name="speech-engine" value="openai" style="position: absolute; opacity: 0;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 24px;">☁️</span>
                            <div>
                                <div style="color: #fff; font-weight: bold;">OpenAI Whisper API</div>
                                <div style="color: #FF9800; font-size: 11px;">$0.006/min • Cloud</div>
                            </div>
                        </div>
                        <div style="color: #aaa; font-size: 11px; line-height: 1.4;">
                            ⚡ Ultra-fast (~0.5 sec)<br>
                            🎯 Higher accuracy<br>
                            🌐 Requires internet<br>
                            💳 Uses OpenAI API key
                        </div>
                    </label>
                </div>
                
                <!-- Deepgram Key Input (shown when Deepgram selected) -->
                <div id="deepgram-stt-config" style="display: none; margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px; font-size: 13px;">
                        🔑 Deepgram API Key <span style="color: #888;">(stored locally)</span>
                    </label>
                    <div style="display: flex; gap: 10px;">
                        <input type="password" id="deepgram-stt-key" placeholder="dg_..." style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-family: monospace;">
                        <button id="save-deepgram-stt" style="padding: 12px 20px; background: linear-gradient(135deg, #00BCD4, #0097A7); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: bold;">
                            Save
                        </button>
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: #888;">
                        Tip: you can also set it via environment variable <code style="color:#80DEEA;">DEEPGRAM_API_KEY</code>.
                    </div>
                </div>

                <!-- AssemblyAI Key Input (shown when AssemblyAI selected) -->
                <div id="assemblyai-stt-config" style="display: none; margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px; font-size: 13px;">
                        🔑 AssemblyAI API Key <span style="color: #888;">(stored locally)</span>
                    </label>
                    <div style="display: flex; gap: 10px;">
                        <input type="password" id="assemblyai-stt-key" placeholder="Your API key..." style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-family: monospace;">
                        <button id="save-assemblyai-stt" style="padding: 12px 20px; background: linear-gradient(135deg, #FF6B35, #E85A4F); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: bold;">
                            Save
                        </button>
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: #888;">
                        Get your free API key at <a href="https://www.assemblyai.com/app/account" target="_blank" style="color: #FF6B35;">assemblyai.com</a>
                        <br>
                        Free tier: 5 hours/month • Tip: you can also set it via environment variable <code style="color:#80DEEA;">ASSEMBLYAI_API_KEY</code>.
                    </div>
                </div>

                <!-- Gemini Key Input (shown when Gemini selected) -->
                <div id="gemini-stt-config" style="display: none; margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px; font-size: 13px;">
                        🔑 Gemini API Key <span style="color: #888;">(stored locally)</span>
                    </label>
                    <div style="display: flex; gap: 10px;">
                        <input type="password" id="gemini-stt-key" placeholder="AI..." style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-family: monospace;">
                        <button id="save-gemini-stt" style="padding: 12px 20px; background: linear-gradient(135deg, #9C27B0, #7B1FA2); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: bold;">
                            Save
                        </button>
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: #888;">
                        Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #9C27B0;">aistudio.google.com</a>
                        <br>
                        Tip: you can also set it via environment variable <code style="color:#80DEEA;">GEMINI_API_KEY</code>.
                    </div>
                </div>

                <!-- OpenAI API Key Input (shown when OpenAI selected) -->
                <div id="openai-stt-config" style="display: none; margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px; font-size: 13px;">
                        🔑 OpenAI API Key <span style="color: #888;">(same as TTS)</span>
                    </label>
                    <div style="display: flex; gap: 10px;">
                        <input type="password" id="openai-stt-key" placeholder="sk-..." style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-family: monospace;">
                        <button id="test-openai-stt" style="padding: 12px 20px; background: linear-gradient(135deg, #00BCD4, #0097A7); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: bold;">
                            Test
                        </button>
                    </div>
                    <div id="openai-stt-status" style="margin-top: 10px; font-size: 12px; color: #888;"></div>
                </div>
                
                <div style="margin-top: 12px; padding: 10px; background: rgba(0, 188, 212, 0.1); border-left: 3px solid #00BCD4; border-radius: 4px;">
                    <p style="color: #80DEEA; margin: 0; font-size: 12px;">
                        💡 <strong>Tip:</strong> For the fastest “human” feel, use <strong>Deepgram Streaming</strong>. Local Whisper is great for privacy/offline.
                    </p>
                </div>
            </div>
            
            <!-- Model Selection -->
            <div id="whisper-model-section" style="margin-bottom: 20px; padding: 20px; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 12px;">
                <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 16px;">🧠 Whisper Model</h3>
                <select id="asr-model-select" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-size: 14px;">
                    <option value="tiny">Tiny - Fastest (39M params) ⚡</option>
                    <option value="base" selected>Base - Balanced (74M params) ⭐</option>
                    <option value="small">Small - Better accuracy (244M params)</option>
                    <option value="medium">Medium - High quality (769M params)</option>
                    <option value="large">Large - Best quality (1.5B params) 🏆</option>
                </select>
                <div id="whisper-model-disabled-note" style="display:none; margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; border-left: 3px solid #00BCD4;">
                    <div style="color:#80DEEA; font-size: 12px;">
                        ℹ️ <strong>Deepgram/OpenAI selected:</strong> Whisper model size is <strong>Local Whisper only</strong> and does not apply here.
                    </div>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 15px;">
                    <div style="flex: 1; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; text-align: center;">
                        <div style="color: #aaa; font-size: 11px;">Latency</div>
                        <div id="model-latency" style="color: #4CAF50; font-weight: bold;">~80ms</div>
                    </div>
                    <div style="flex: 1; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; text-align: center;">
                        <div style="color: #aaa; font-size: 11px;">Accuracy</div>
                        <div id="model-accuracy" style="color: #2196F3; font-weight: bold;">Good</div>
                    </div>
                    <div style="flex: 1; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; text-align: center;">
                        <div style="color: #aaa; font-size: 11px;">VRAM</div>
                        <div id="model-vram" style="color: #FF9800; font-weight: bold;">~1GB</div>
                    </div>
                </div>
            </div>
            
            <!-- Mode Selection -->
            <div style="margin-bottom: 20px; padding: 20px; background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 12px;">
                <h3 style="color: #4CAF50; margin: 0 0 15px 0; font-size: 16px;">📝 Recognition Mode</h3>
                <div style="display: flex; gap: 12px;">
                    <label style="flex: 1; display: flex; align-items: center; gap: 10px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px; cursor: pointer; border: 2px solid transparent;" id="mode-command-label">
                        <input type="radio" name="asr-mode" value="command" checked style="width: 18px; height: 18px;">
                        <div>
                            <div style="color: #fff; font-weight: bold;">Command Mode</div>
                            <div style="color: #aaa; font-size: 12px;">Interpret as DAW actions</div>
                        </div>
                    </label>
                    <label style="flex: 1; display: flex; align-items: center; gap: 10px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px; cursor: pointer; border: 2px solid transparent;" id="mode-dictation-label">
                        <input type="radio" name="asr-mode" value="dictation" style="width: 18px; height: 18px;">
                        <div>
                            <div style="color: #fff; font-weight: bold;">Dictation Mode</div>
                            <div style="color: #aaa; font-size: 12px;">Transcribe exactly (names, notes)</div>
                        </div>
                    </label>
                </div>
                <div style="margin-top: 12px; padding: 10px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px;">
                    <p style="color: #81D4FA; margin: 0; font-size: 12px;">
                        💡 Say <strong>"dictation mode"</strong> or <strong>"command mode"</strong> to switch by voice!
                    </p>
                </div>
            </div>
            
            <!-- Confidence Settings -->
            <div style="margin-bottom: 20px; padding: 20px; background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 12px;">
                <h3 style="color: #FF9800; margin: 0 0 15px 0; font-size: 16px;">🎯 Confidence Behavior</h3>
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px;">
                        Execute Threshold: <span id="conf-exec-value" style="color: #4CAF50; font-weight: bold;">85%</span>
                    </label>
                    <input type="range" id="conf-execute" min="70" max="95" value="85" style="width: 100%; accent-color: #4CAF50;">
                    <div style="display: flex; justify-content: space-between; color: #888; font-size: 11px;">
                        <span>Execute immediately</span>
                        <span>Strict</span>
                    </div>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px;">
                        Confirm Threshold: <span id="conf-confirm-value" style="color: #FF9800; font-weight: bold;">55%</span>
                    </label>
                    <input type="range" id="conf-confirm" min="40" max="70" value="55" style="width: 100%; accent-color: #FF9800;">
                    <div style="display: flex; justify-content: space-between; color: #888; font-size: 11px;">
                        <span>Request confirmation</span>
                        <span>Below = ask repeat</span>
                    </div>
                </div>
                <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                    <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">Confidence Actions:</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span style="padding: 5px 10px; background: rgba(76, 175, 80, 0.3); border-radius: 15px; color: #4CAF50; font-size: 11px;">
                            >85%: Execute
                        </span>
                        <span style="padding: 5px 10px; background: rgba(255, 152, 0, 0.3); border-radius: 15px; color: #FF9800; font-size: 11px;">
                            55-85%: Confirm
                        </span>
                        <span style="padding: 5px 10px; background: rgba(244, 67, 54, 0.3); border-radius: 15px; color: #f44336; font-size: 11px;">
                            <55%: Repeat
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Voice Profiles & Calibration -->
            <div style="margin-bottom: 20px; padding: 20px; background: rgba(156, 39, 176, 0.1); border: 1px solid rgba(156, 39, 176, 0.3); border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: #BA68C8; margin: 0; font-size: 16px;">👤 Voice Profile & Calibration</h3>
                </div>
                <select id="asr-profile-select" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-size: 14px; margin-bottom: 15px;">
                    <option value="default">Default Profile</option>
                </select>
                
                <!-- Calibration Button -->
                <button id="calibrate-voice-btn" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #9C27B0, #7B1FA2); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
                    🎤 Calibrate Your Voice
                </button>
                
                <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                    <p style="color: #aaa; font-size: 12px; margin: 0;">
                        <strong style="color: #BA68C8;">Why Calibrate?</strong><br>
                        Train RHEA to recognize YOUR voice by speaking sample DAW commands. 
                        This improves accuracy for your accent, speech patterns, and studio environment.
                    </p>
                </div>
            </div>
            
            <!-- Vocabulary -->
            <div style="margin-bottom: 20px; padding: 20px; background: rgba(0, 188, 212, 0.1); border: 1px solid rgba(0, 188, 212, 0.3); border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: #00BCD4; margin: 0; font-size: 16px;">📚 Custom Vocabulary</h3>
                    <button id="edit-vocab-btn" style="padding: 6px 12px; background: rgba(0, 188, 212, 0.3); border: 1px solid rgba(0, 188, 212, 0.5); border-radius: 6px; color: #00BCD4; cursor: pointer; font-size: 12px;">
                        ✏️ Edit Vocabulary
                    </button>
                </div>
                <div id="vocab-stats" style="display: flex; gap: 15px;">
                    <div style="flex: 1; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; text-align: center;">
                        <div style="color: #00BCD4; font-size: 24px; font-weight: bold;" id="vocab-terms-count">328</div>
                        <div style="color: #aaa; font-size: 11px;">DAW Terms</div>
                    </div>
                    <div style="flex: 1; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; text-align: center;">
                        <div style="color: #00BCD4; font-size: 24px; font-weight: bold;" id="vocab-aliases-count">17</div>
                        <div style="color: #aaa; font-size: 11px;">Aliases</div>
                    </div>
                    <div style="flex: 1; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; text-align: center;">
                        <div style="color: #00BCD4; font-size: 24px; font-weight: bold;" id="vocab-plugins-count">58</div>
                        <div style="color: #aaa; font-size: 11px;">Plugins</div>
                    </div>
                </div>
            </div>
            
            <!-- Live Transcript -->
            <div style="margin-bottom: 20px; padding: 20px; background: rgba(33, 33, 33, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;">
                <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 16px;">📝 Live Transcript</h3>
                <div id="live-transcript" style="min-height: 60px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; font-family: 'SF Mono', monospace; color: #aaa; font-size: 13px;">
                    <span style="opacity: 0.5;">Waiting for speech...</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <div style="color: #888; font-size: 11px;">
                        Confidence: <span id="live-confidence" style="color: #4CAF50;">--</span>
                    </div>
                    <div style="color: #888; font-size: 11px;">
                        Latency: <span id="live-latency" style="color: #2196F3;">--</span>
                    </div>
                </div>
            </div>
            
            <!-- Actions -->
            <div style="display: flex; gap: 12px;">
                <button id="asr-save-btn" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #4CAF50, #45a049); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer; font-size: 14px;">
                    💾 Save Settings
                </button>
                <button id="asr-close-btn" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #666, #555); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer; font-size: 14px;">
                    Close
                </button>
            </div>
        `;
        
        this.modal.appendChild(content);
        document.body.appendChild(this.modal);
        
        this.setupEventListeners();
        this.populateForm();
        this.updateStatus();
    }
    
    setupEventListeners() {
        // Close modal
        document.getElementById('asr-close-btn').addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        
        // Start/Stop
        document.getElementById('asr-start-btn').addEventListener('click', () => this.startASR());
        document.getElementById('asr-stop-btn').addEventListener('click', () => this.stopASR());
        
        // Listen for provider fallback events (Deepgram -> local due to auth failure)
        if (window.api && window.api.onASRProviderFallback) {
            window.api.onASRProviderFallback((info) => {
                console.warn('🛟 ASR provider fallback:', info);
                // Update config to match the fallback
                if (info.to === 'local' && this.config.speechEngine === 'deepgram') {
                    this._fallbackInProgress = true;
                    this.config.speechEngine = 'local';
                    this.saveConfig();
                    // Update UI to reflect local is now active
                    const localRadio = document.querySelector('input[name="speech-engine"][value="local"]');
                    if (localRadio) {
                        localRadio.checked = true;
                        this.updateEngineUI();
                    }
                    this.showToast(`⚠️ Deepgram auth failed — switched to Local ASR`, 'warning');
                    // Keep isASRRunning = true since fallback will restart ASR automatically
                    this.isASRRunning = true;
                    this.updateStatus();
                    // Clear flag after a short delay (fallback restart happens ~500ms later)
                    setTimeout(() => {
                        this._fallbackInProgress = false;
                    }, 2000);
                }
            });
        }
        
        // Listen for ASR stop events to update running state
        if (window.api && window.api.onASRStopped) {
            window.api.onASRStopped((code) => {
                // Only update if we're not in a fallback restart (code 1 = error, but fallback will restart)
                // If code is 0, it's a clean stop
                if (code === 0) {
                    this.isASRRunning = false;
                    this.updateStatus();
                }
            });
        }
        
        // ========== Speech Engine Selection ==========
        document.querySelectorAll('input[name="speech-engine"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.config.speechEngine = e.target.value;
                // Clear fallback flag when user manually changes engine (they may have fixed API key)
                this._fallbackInProgress = false;
                this.updateEngineUI();
                this.saveConfig();
            });
        });
        
        // OpenAI STT test button
        const testBtn = document.getElementById('test-openai-stt');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testOpenAISTT());
        }

        // Deepgram key save button (optional)
        const saveDeepgramBtn = document.getElementById('save-deepgram-stt');
        if (saveDeepgramBtn) {
            saveDeepgramBtn.addEventListener('click', () => {
                const keyInput = document.getElementById('deepgram-stt-key');
                const key = (keyInput?.value || '').trim();
                this.config.deepgramApiKey = key;
                this.saveConfig();
                // Persist to backend config too (so it can pass env into the Python process)
                if (window.api && window.api.updateASRConfig) {
                    window.api.updateASRConfig(this.config);
                }
                this.showToast(key ? '✅ Deepgram key saved' : '✅ Deepgram key cleared');
            });
        }
        
        // AssemblyAI key save button
        const saveAssemblyAIBtn = document.getElementById('save-assemblyai-stt');
        if (saveAssemblyAIBtn) {
            saveAssemblyAIBtn.addEventListener('click', () => {
                const keyInput = document.getElementById('assemblyai-stt-key');
                const key = (keyInput?.value || '').trim();
                this.config.assemblyaiApiKey = key;
                this.saveConfig();
                // Persist to backend config too
                if (window.api && window.api.updateASRConfig) {
                    window.api.updateASRConfig(this.config);
                }
                this.showToast(key ? '✅ AssemblyAI key saved' : '✅ AssemblyAI key cleared');
            });
        }
        
        // Gemini key save button
        const saveGeminiBtn = document.getElementById('save-gemini-stt');
        if (saveGeminiBtn) {
            saveGeminiBtn.addEventListener('click', () => {
                const keyInput = document.getElementById('gemini-stt-key');
                const key = (keyInput?.value || '').trim();
                this.config.geminiApiKey = key;
                this.saveConfig();
                // Persist to backend config too
                if (window.api && window.api.updateASRConfig) {
                    window.api.updateASRConfig(this.config);
                }
                this.showToast(key ? '✅ Gemini key saved' : '✅ Gemini key cleared');
            });
        }
        
        // Model selection
        document.getElementById('asr-model-select').addEventListener('change', (e) => {
            this.config.modelSize = e.target.value;
            this.updateModelInfo();
        });
        
        // Mode selection
        document.querySelectorAll('input[name="asr-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.config.mode = e.target.value;
                this.updateModeLabels();
            });
        });
        
        // Confidence sliders
        document.getElementById('conf-execute').addEventListener('input', (e) => {
            document.getElementById('conf-exec-value').textContent = `${e.target.value}%`;
            this.config.confidenceThreshold = e.target.value / 100;
        });
        
        document.getElementById('conf-confirm').addEventListener('input', (e) => {
            document.getElementById('conf-confirm-value').textContent = `${e.target.value}%`;
        });
        
        // Save
        document.getElementById('asr-save-btn').addEventListener('click', () => this.saveSettings());
        
        // Edit vocabulary
        document.getElementById('edit-vocab-btn').addEventListener('click', () => this.showVocabEditor());
        
        // Calibrate voice
        document.getElementById('calibrate-voice-btn').addEventListener('click', () => this.startCalibration());
    }
    
    updateEngineUI() {
        const localLabel = document.getElementById('engine-local-label');
        const deepgramLabel = document.getElementById('engine-deepgram-label');
        const assemblyaiLabel = document.getElementById('engine-assemblyai-label');
        const geminiLabel = document.getElementById('engine-gemini-label');
        const openaiLabel = document.getElementById('engine-openai-label');
        const deepgramConfig = document.getElementById('deepgram-stt-config');
        const assemblyaiConfig = document.getElementById('assemblyai-stt-config');
        const geminiConfig = document.getElementById('gemini-stt-config');
        const openaiConfig = document.getElementById('openai-stt-config');
        const modelSelect = document.getElementById('asr-model-select');
        const modelSection = document.getElementById('whisper-model-section');
        const modelNote = document.getElementById('whisper-model-disabled-note');
        
        const engine = this.config.speechEngine || 'local';

        // Whisper model selection only applies to local whisper.
        const isLocal = engine === 'local';
        if (modelSelect) modelSelect.disabled = !isLocal;
        if (modelSection) modelSection.style.opacity = isLocal ? '1' : '0.55';
        if (modelNote) modelNote.style.display = isLocal ? 'none' : 'block';

        // Reset badges
        localLabel.querySelector('.active-badge')?.remove();
        deepgramLabel?.querySelector('.active-badge')?.remove();
        assemblyaiLabel?.querySelector('.active-badge')?.remove();
        geminiLabel?.querySelector('.active-badge')?.remove();
        openaiLabel.querySelector('.active-badge')?.remove();

        // Hide configs by default
        if (deepgramConfig) deepgramConfig.style.display = 'none';
        if (assemblyaiConfig) assemblyaiConfig.style.display = 'none';
        if (geminiConfig) geminiConfig.style.display = 'none';
        openaiConfig.style.display = 'none';

        if (engine === 'openai') {
            // OpenAI selected
            localLabel.style.border = '2px solid transparent';
            localLabel.style.opacity = '0.8';
            localLabel.querySelector('div[style*="ACTIVE"]')?.remove(); // legacy badge
            
            if (deepgramLabel) {
                deepgramLabel.style.border = '2px solid transparent';
                deepgramLabel.style.opacity = '0.85';
            }

            openaiLabel.style.border = '2px solid #FF9800';
            openaiLabel.style.opacity = '1';
            const badge = document.createElement('div');
            badge.className = 'active-badge';
            badge.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #FF9800; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;';
            badge.textContent = 'ACTIVE';
            openaiLabel.appendChild(badge);

            openaiConfig.style.display = 'block';
            
            // Load existing API key from AI config
            const aiConfig = JSON.parse(localStorage.getItem('rhea_ai_config') || '{}');
            if (aiConfig.openaiKey) {
                document.getElementById('openai-stt-key').value = aiConfig.openaiKey;
            }
        } else if (engine === 'deepgram') {
            // Deepgram selected
            localLabel.style.border = '2px solid transparent';
            localLabel.style.opacity = '0.8';
            localLabel.querySelector('div[style*="ACTIVE"]')?.remove(); // legacy badge

            if (deepgramLabel) {
                deepgramLabel.style.border = '2px solid #00BCD4';
                deepgramLabel.style.opacity = '1';
                const badge = document.createElement('div');
                badge.className = 'active-badge';
                badge.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #00BCD4; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;';
                badge.textContent = 'ACTIVE';
                deepgramLabel.appendChild(badge);
            }

            openaiLabel.style.border = '2px solid transparent';
            openaiLabel.style.opacity = '0.8';

            if (deepgramConfig) {
                deepgramConfig.style.display = 'block';
                const keyInput = document.getElementById('deepgram-stt-key');
                if (keyInput && this.config.deepgramApiKey) {
                    keyInput.value = this.config.deepgramApiKey;
                }
            }
            if (assemblyaiLabel) {
                assemblyaiLabel.style.border = '2px solid transparent';
                assemblyaiLabel.style.opacity = '0.85';
            }
            if (geminiLabel) {
                geminiLabel.style.border = '2px solid transparent';
                geminiLabel.style.opacity = '0.85';
            }
        } else if (engine === 'assemblyai') {
            // AssemblyAI selected
            localLabel.style.border = '2px solid transparent';
            localLabel.style.opacity = '0.8';
            localLabel.querySelector('div[style*="ACTIVE"]')?.remove();
            
            if (deepgramLabel) {
                deepgramLabel.style.border = '2px solid transparent';
                deepgramLabel.style.opacity = '0.85';
            }
            
            if (assemblyaiLabel) {
                assemblyaiLabel.style.border = '2px solid #FF6B35';
                assemblyaiLabel.style.opacity = '1';
                const badge = document.createElement('div');
                badge.className = 'active-badge';
                badge.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #FF6B35; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;';
                badge.textContent = 'ACTIVE';
                assemblyaiLabel.appendChild(badge);
            }
            
            if (geminiLabel) {
                geminiLabel.style.border = '2px solid transparent';
                geminiLabel.style.opacity = '0.85';
            }
            
            openaiLabel.style.border = '2px solid transparent';
            openaiLabel.style.opacity = '0.8';
            
            if (assemblyaiConfig) {
                assemblyaiConfig.style.display = 'block';
                const keyInput = document.getElementById('assemblyai-stt-key');
                if (keyInput && this.config.assemblyaiApiKey) {
                    keyInput.value = this.config.assemblyaiApiKey;
                }
            }
            
            if (deepgramConfig) deepgramConfig.style.display = 'none';
            if (geminiConfig) geminiConfig.style.display = 'none';
            openaiConfig.style.display = 'none';
        } else if (engine === 'gemini') {
            // Gemini selected
            localLabel.style.border = '2px solid transparent';
            localLabel.style.opacity = '0.8';
            localLabel.querySelector('div[style*="ACTIVE"]')?.remove();
            
            if (deepgramLabel) {
                deepgramLabel.style.border = '2px solid transparent';
                deepgramLabel.style.opacity = '0.85';
            }
            
            if (geminiLabel) {
                geminiLabel.style.border = '2px solid #9C27B0';
                geminiLabel.style.opacity = '1';
                const badge = document.createElement('div');
                badge.className = 'active-badge';
                badge.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #9C27B0; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;';
                badge.textContent = 'ACTIVE';
                geminiLabel.appendChild(badge);
            }
            
            openaiLabel.style.border = '2px solid transparent';
            openaiLabel.style.opacity = '0.8';
            
            if (geminiConfig) {
                geminiConfig.style.display = 'block';
                const keyInput = document.getElementById('gemini-stt-key');
                if (keyInput && this.config.geminiApiKey) {
                    keyInput.value = this.config.geminiApiKey;
                }
            }
            
            if (deepgramConfig) deepgramConfig.style.display = 'none';
            openaiConfig.style.display = 'none';
        } else {
            // Local selected
            openaiLabel.style.border = '2px solid transparent';
            openaiLabel.style.opacity = '0.8';
            if (deepgramLabel) {
                deepgramLabel.style.border = '2px solid transparent';
                deepgramLabel.style.opacity = '0.85';
            }
            if (geminiLabel) {
                geminiLabel.style.border = '2px solid transparent';
                geminiLabel.style.opacity = '0.85';
            }

            localLabel.style.border = '2px solid #4CAF50';
            localLabel.style.opacity = '1';

            if (deepgramConfig) deepgramConfig.style.display = 'none';
            if (assemblyaiConfig) assemblyaiConfig.style.display = 'none';
            if (geminiConfig) geminiConfig.style.display = 'none';
            openaiConfig.style.display = 'none';
        }
    }
    
    async testOpenAISTT() {
        const statusEl = document.getElementById('openai-stt-status');
        const keyInput = document.getElementById('openai-stt-key');
        const apiKey = keyInput.value.trim();
        
        if (!apiKey) {
            statusEl.innerHTML = '<span style="color: #f44336;">❌ Please enter an API key</span>';
            return;
        }
        
        statusEl.innerHTML = '<span style="color: #2196F3;">🔄 Testing...</span>';
        
        try {
            // Test by making a simple models API call
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            
            if (response.ok) {
                statusEl.innerHTML = '<span style="color: #4CAF50;">✅ API key valid! OpenAI STT ready.</span>';
                
                // Save the key
                const aiConfig = JSON.parse(localStorage.getItem('rhea_ai_config') || '{}');
                aiConfig.openaiKey = apiKey;
                localStorage.setItem('rhea_ai_config', JSON.stringify(aiConfig));
                
                this.config.openaiSTTKey = apiKey;
                this.saveConfig();
            } else {
                const error = await response.json();
                statusEl.innerHTML = `<span style="color: #f44336;">❌ Invalid key: ${error.error?.message || 'Unknown error'}</span>`;
            }
        } catch (err) {
            statusEl.innerHTML = `<span style="color: #f44336;">❌ Error: ${err.message}</span>`;
        }
    }
    
    startCalibration() {
        // Initialize calibration UI if needed
        if (!this.calibrationUI) {
            if (typeof VoiceCalibrationUI !== 'undefined') {
                this.calibrationUI = new VoiceCalibrationUI(this.rhea);
            }
        }
        
        if (this.calibrationUI) {
            this.calibrationUI.show();
        } else {
            this.showToast('Calibration UI not available', 'error');
        }
    }
    
    populateForm() {
        // Speech engine selection
        const engineRadio = document.querySelector(`input[name="speech-engine"][value="${this.config.speechEngine || 'local'}"]`);
        if (engineRadio) {
            engineRadio.checked = true;
            this.updateEngineUI();
        }
        
        document.getElementById('asr-model-select').value = this.config.modelSize;
        document.querySelector(`input[name="asr-mode"][value="${this.config.mode}"]`).checked = true;
        document.getElementById('conf-execute').value = this.config.confidenceThreshold * 100;
        document.getElementById('conf-exec-value').textContent = `${Math.round(this.config.confidenceThreshold * 100)}%`;
        
        this.updateModelInfo();
        this.updateModeLabels();
        this.loadVocabStats();
    }
    
    updateModelInfo() {
        const modelInfo = {
            'tiny': { latency: '~50ms', accuracy: 'Basic', vram: '~400MB' },
            'base': { latency: '~80ms', accuracy: 'Good', vram: '~1GB' },
            'small': { latency: '~150ms', accuracy: 'Better', vram: '~2GB' },
            'medium': { latency: '~300ms', accuracy: 'High', vram: '~5GB' },
            'large': { latency: '~500ms', accuracy: 'Best', vram: '~10GB' }
        };
        
        const info = modelInfo[this.config.modelSize] || modelInfo['base'];
        document.getElementById('model-latency').textContent = info.latency;
        document.getElementById('model-accuracy').textContent = info.accuracy;
        document.getElementById('model-vram').textContent = info.vram;
    }
    
    updateModeLabels() {
        const commandLabel = document.getElementById('mode-command-label');
        const dictationLabel = document.getElementById('mode-dictation-label');
        
        commandLabel.style.borderColor = this.config.mode === 'command' ? '#4CAF50' : 'transparent';
        dictationLabel.style.borderColor = this.config.mode === 'dictation' ? '#4CAF50' : 'transparent';
    }
    
    loadVocabStats() {
        // Try to get vocab from IPC if available
        if (window.api && window.api.getASRVocabulary) {
            window.api.getASRVocabulary().then(vocab => {
                if (vocab && vocab.categories) {
                    let totalTerms = 0;
                    Object.values(vocab.categories).forEach(terms => {
                        totalTerms += terms.length;
                    });
                    document.getElementById('vocab-terms-count').textContent = totalTerms;
                    document.getElementById('vocab-aliases-count').textContent = Object.keys(vocab.aliases || {}).length;
                    document.getElementById('vocab-plugins-count').textContent = (vocab.categories.plugin_names || []).length;
                }
            }).catch(() => {
                // Use defaults
            });
        }
    }
    
    updateStatus() {
        const badge = document.getElementById('asr-status-badge');
        const startBtn = document.getElementById('asr-start-btn');
        const stopBtn = document.getElementById('asr-stop-btn');
        
        if (this.isASRRunning) {
            badge.textContent = '🎤 Listening';
            badge.style.background = 'rgba(76, 175, 80, 0.3)';
            badge.style.color = '#4CAF50';
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            badge.textContent = '⏹️ Stopped';
            badge.style.background = 'rgba(255, 255, 255, 0.1)';
            badge.style.color = '#888';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }
    
    async startASR() {
        // Prevent retry loops: if already running or fallback in progress, don't start again
        if (this.isASRRunning || this._fallbackInProgress) {
            console.log('⚠️ ASR already running or fallback in progress — skipping start request');
            return;
        }
        
        const startBtn = document.getElementById('asr-start-btn');
        startBtn.textContent = '⏳ Starting (switching from Whisper)...';
        startBtn.disabled = true;
        
        try {
            // Use the new unified voice engine API (kills Whisper automatically!)
            if (window.api && window.api.startASREngine) {
                console.log('🔄 Switching to ASR mode (will kill Whisper listener)...');
                const result = await window.api.startASREngine(this.config);
                if (result.success) {
                    this.isASRRunning = true;
                    this.updateStatus();
                    this.showToast('✅ ASR started! (Whisper disabled)');
                    
                    // Notify RHEA that ASR is now the active voice engine
                    window.dispatchEvent(new CustomEvent('voice-engine-changed', { detail: 'asr' }));
                } else {
                    this.showToast(`❌ ${result.error}`, 'error');
                    startBtn.disabled = false;
                }
            } else if (window.api && window.api.startASR) {
                // Legacy fallback
                const result = await window.api.startASR(this.config);
                if (result.success) {
                    this.isASRRunning = true;
                    this.updateStatus();
                    this.showToast('✅ ASR started!');
                } else {
                    this.showToast(`❌ ${result.error}`, 'error');
                    startBtn.disabled = false;
                }
            } else {
                // Fallback: emit event for rhea.js to handle
                window.dispatchEvent(new CustomEvent('asr-start', { detail: this.config }));
                this.isASRRunning = true;
                this.updateStatus();
                this.showToast('✅ ASR started!');
            }
        } catch (err) {
            this.showToast(`❌ ${err.message}`, 'error');
            startBtn.disabled = false;
        }
        
        if (!this.isASRRunning) {
            startBtn.innerHTML = '▶️ Start Listening';
        }
    }
    
    async stopASR() {
        try {
            if (window.api && window.api.stopASR) {
                await window.api.stopASR();
            } else {
                window.dispatchEvent(new CustomEvent('asr-stop'));
            }
            this.isASRRunning = false;
            this.updateStatus();
            this.showToast('⏹️ ASR stopped');
            
            // Notify RHEA that no voice engine is active
            window.dispatchEvent(new CustomEvent('voice-engine-changed', { detail: null }));
        } catch (err) {
            this.showToast(`❌ ${err.message}`, 'error');
        }
    }
    
    async switchToWhisper() {
        // Helper to switch back to Whisper mode
        try {
            if (window.api && window.api.startWhisperEngine) {
                await window.api.startWhisperEngine();
                this.isASRRunning = false;
                this.updateStatus();
                this.showToast('🎤 Switched to Whisper mode');
                window.dispatchEvent(new CustomEvent('voice-engine-changed', { detail: 'whisper' }));
            }
        } catch (err) {
            console.error('Error switching to Whisper:', err);
        }
    }
    
    saveSettings() {
        this.config.modelSize = document.getElementById('asr-model-select').value;
        this.config.mode = document.querySelector('input[name="asr-mode"]:checked').value;
        this.config.confidenceThreshold = document.getElementById('conf-execute').value / 100;
        
        this.saveConfig();
        
        // Notify backend
        if (window.api && window.api.updateASRConfig) {
            window.api.updateASRConfig(this.config);
        }
        
        this.showToast('✅ Settings saved!');
    }
    
    showVocabEditor() {
        // Simple vocab editor modal
        const editor = document.createElement('div');
        editor.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        editor.innerHTML = `
            <div style="background: #1a1a2e; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="color: #00BCD4; margin: 0 0 20px 0;">📚 Custom Vocabulary Editor</h3>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #fff; margin: 0 0 10px 0;">Add Custom Alias</h4>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="alias-phrase" placeholder="Your phrase (e.g., 'punch me in')" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                        <input type="text" id="alias-action" placeholder="Action (e.g., 'punch_in')" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                        <button id="add-alias-btn" style="padding: 10px 20px; background: #00BCD4; border: none; border-radius: 8px; color: white; cursor: pointer;">Add</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #fff; margin: 0 0 10px 0;">Add Boost Word</h4>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="boost-word" placeholder="Word to boost (e.g., 'Kontakt')" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                        <button id="add-boost-btn" style="padding: 10px 20px; background: #4CAF50; border: none; border-radius: 8px; color: white; cursor: pointer;">Add</button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button id="vocab-save-btn" style="flex: 1; padding: 12px; background: #4CAF50; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Save Changes</button>
                    <button id="vocab-close-btn" style="flex: 1; padding: 12px; background: #666; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(editor);
        
        document.getElementById('vocab-close-btn').addEventListener('click', () => {
            editor.remove();
        });
        
        document.getElementById('add-alias-btn').addEventListener('click', () => {
            const phrase = document.getElementById('alias-phrase').value.trim();
            const action = document.getElementById('alias-action').value.trim();
            if (phrase && action) {
                this.showToast(`Added alias: "${phrase}" → ${action}`);
                document.getElementById('alias-phrase').value = '';
                document.getElementById('alias-action').value = '';
            }
        });
        
        document.getElementById('add-boost-btn').addEventListener('click', () => {
            const word = document.getElementById('boost-word').value.trim();
            if (word) {
                this.showToast(`Added boost word: "${word}"`);
                document.getElementById('boost-word').value = '';
            }
        });
        
        document.getElementById('vocab-save-btn').addEventListener('click', () => {
            this.showToast('✅ Vocabulary saved!');
            editor.remove();
        });
    }
    
    createProfile() {
        const name = prompt('Enter profile name:');
        if (name && name.trim()) {
            const select = document.getElementById('asr-profile-select');
            const option = document.createElement('option');
            option.value = name.trim().toLowerCase().replace(/\s+/g, '_');
            option.textContent = name.trim();
            select.appendChild(option);
            select.value = option.value;
            this.showToast(`✅ Profile "${name}" created!`);
        }
    }
    
    updateLiveTranscript(text, confidence) {
        const transcript = document.getElementById('live-transcript');
        const confSpan = document.getElementById('live-confidence');
        
        if (transcript) {
            transcript.innerHTML = `<span style="color: #fff;">${text}</span>`;
        }
        
        if (confSpan && confidence !== undefined) {
            confSpan.textContent = `${Math.round(confidence * 100)}%`;
            confSpan.style.color = confidence > 0.85 ? '#4CAF50' : confidence > 0.55 ? '#FF9800' : '#f44336';
        }
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10002;
            animation: fadeInUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ASRConfigUI;
}

