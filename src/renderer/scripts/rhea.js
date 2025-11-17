class RHEAController {
    constructor() {
        this.status = 'ready';
        this.isListening = false;
        this.recognition = null;
        this.mixerVisible = false; // Track mixer visibility state
        this.reaperActions = {
            // Transport
            'play': 1007,
            'stop': 1016,
            'record': 1013,
            'pause': 1008,
            // Use "Go to start of project" action to ensure a reliable rewind
            'rewind': 40042,
            'fastforward': 1015,
            'gotostart': 1016, // Stop also goes to start
            'gotoend': 40073,
            'loop': 1068,
            
            // Editing
            'undo': 40029,
            'redo': 40030,
            'cut': 40001,
            'copy': 40003,
            'paste': 40004,
            'delete': 40005,
            'selectall': 40296,
            
            // Project
            'save': 40026,
            'saveas': 40022,
            'newproject': 40023,
            'openproject': 40025,
            
            // Tracks - Basic
            'newtrack': 40001,
            'deletetrack': 40005,
            'nexttrack': 40285,
            'previoustrack': 40286,
            
            // Track Control - Global (affects selected track)
            'mute': 6,
            'unmute': 7,
            'solo': 8,
            'unsolo': 9,
            'armtrack': 40294,  // Toggle record arm for selected track
            'unarmtrack': 40294, // Same action, it's a toggle
            
            // Track Control - Specific (with track number)
            'selecttrack': 'track_select',  // Custom - select specific track by number
            'mutetrack': 'track_mute',      // Custom - mute specific track
            'unmutetrack': 'track_unmute',  // Custom - unmute specific track
            'solotrack': 'track_solo',      // Custom - solo specific track
            'unsolotrack': 'track_unsolo',  // Custom - unsolo specific track
            'armtracknum': 'track_arm',     // Custom - arm specific track
            'settrackvolume': 'track_volume', // Custom - set track volume
            'settrackpan': 'track_pan',     // Custom - set track pan
            
            // Navigation
            'zoomout': 1012,
            'zoomin': 1011,
            'zoomall': 40031,
            
            // Time Selection
            'selecttime': 40020,
            'clearselection': 40021,
            
            // Markers
            'addmarker': 40157,
            'nextmarker': 40161,
            'previousmarker': 40162,
            
            // Tempo (will use custom script, placeholder IDs)
            'settempo': 'tempo_set',  // Custom - uses script
            'increasetempo': 'tempo_increase',  // Custom - uses script
            'decreasetempo': 'tempo_decrease',  // Custom - uses script
            'gettempo': 'tempo_get',  // Custom - uses script
            
            // Mixer Controls - Use specific show/hide actions
            'showmixer': 40083,  // View: Toggle mixer visible (from View menu ⌘M)
            'hidemixer': 40083,  // Toggle (REAPER only has toggle, not separate show/hide)
            'togglemixer': 40083,  // View: Toggle mixer visible
            'mixerwindow': 40083,
            'openmixer': 40083,
            'closemixer': 40083,
            
            // Master Track Controls
            'mastermute': 'master_mute',  // Custom - mute master track
            'masterunmute': 'master_unmute',  // Custom - unmute master track
            'togglemastermute': 'master_mute_toggle',  // Custom - toggle master mute
            'setmastervolume': 'master_volume',  // Custom - set master volume to X%
            'mastervolumeup': 40036,  // Master track: increase volume by 1 dB
            'mastervolumedown': 40037,  // Master track: decrease volume by 1 dB
            'resetmastervolume': 'master_volume_reset',  // Custom - reset to 0dB
            
            // All Tracks Controls
            'resetallfaders': 'reset_all_faders',  // Custom - reset all track volumes
            'muteall': 40339,  // Track: Mute all tracks
            'unmuteall': 40340,  // Track: Unmute all tracks
            'unsololall': 40340,  // Track: Unsolo all tracks
            'unarmall': 40491,  // Track: Unarm all tracks for recording
            
            // Mixer View Options
            'showmcp': 40075,  // View: Toggle show mixer control panel
            'hidemcp': 40075,
            'togglemcp': 40075,
            'showtcp': 40074,  // View: Toggle show track control panel
            'hidetcp': 40074,
            'toggletcp': 40074,
            
            // Meta commands
            'help': 'show_help'  // Show available commands
        };
        
        // Voice recognition configuration
        this.config = {
            sensitivity: 0.6, // Command matching threshold (0-1)
            phraseTimeout: 6, // Max seconds to listen for a phrase
            enableFuzzyMatching: true,
            autoRestart: true
        };
        
        // Command deduplication
        this.lastProcessedCommand = null;
        this.lastProcessedTime = 0;
        this.commandCooldown = 1000; // Don't process same command within 1 second (prevents accidental duplicates)
        this.isProcessingCommand = false; // Prevent concurrent processing
        this.commandHistory = []; // Track recent commands to prevent rapid repeats
        
        // Feedback suppression
        this.isSpeaking = false; // Track when RHEA is speaking
        this.speechEndTime = 0; // Track when speech ended
        this.speechCooldown = 500; // Ignore commands for 0.5 seconds after speech ends (very fast, minimal feedback risk)
        this.silentMode = false; // If true, skip verbal feedback for faster workflow
        
        // Subscribe to DAW state updates (transport position, playing, etc.)
        try {
            if (window.dawrv?.voice?.onDawState) {
                window.dawrv.voice.onDawState((state) => {
                    if (this.aiAgent && state?.transport) {
                        this.aiAgent.updateDAWContext({
                            isPlaying: !!state.transport.playing,
                            isRecording: !!state.transport.recording,
                            loopEnabled: !!state.transport.loopEnabled,
                            positionSeconds: state.transport.positionSeconds || 0,
                            lastActionTime: Date.now()
                        });
                    }
                });
            }
        } catch (_) {}
        
        // Voice configuration for human-like speech
        this.voiceConfig = {
            // Preferred voices (macOS high-quality voices)
            preferredVoices: [
                'Samantha',           // Enhanced female voice (best quality)
                'Alex',               // Enhanced male voice (best quality)
                'Victoria',           // High-quality female voice
                'Siri Female',        // Siri voice
                'Siri Male',          // Siri voice
                'Karen',              // Australian female
                'Moira',              // Irish female
                'Tessa',              // South African female
                'Veena',              // Indian English female
                'Fiona',              // Scottish female
            ],
            rate: 0.95,              // Slightly slower for more natural (0.1-10, default 1)
            pitch: 1.0,              // Natural pitch (0-2, default 1)
            volume: 0.9,             // Slightly quieter (0-1, default 1)
            selectedVoice: null      // Will be set on first use
        };
        
        // Initialize voice on first use
        this.initVoice();
        
        this.rheaResponsePhrases = [ // Full phrases RHEA says that shouldn't trigger commands
            'starting playback', 'stopping playback', 'recording started', 'undoing last action',
            'saving project', 'creating new track', 'reaper api not available', 'failed to execute command',
            'command failed', 'reaper not connected', 'pausing playback', 'rewinding to start',
            'going to end', 'toggling loop', 'redoing last action', 'cutting selection', 'copying selection',
            'pasting', 'deleting selection', 'selecting all', 'creating new project', 'opening project',
            'deleting track', 'muting track', 'unmuting track', 'soloing track', 'unsoloing track',
            'moving to next track', 'moving to previous track', 'zooming in', 'zooming out',
            'zooming to fit all', 'adding marker', 'moving to next marker', 'moving to previous marker',
            // Mixer commands
            'toggling mixer', 'opening mixer', 'closing mixer', 'toggling mixer window', 'muted master', 'unmuted master', 'master muted',
            'master unmuted', 'master volume increased', 'master volume decreased', 'muted all tracks',
            'unmuted all tracks', 'toggling metronome', 'metronome toggled', 'toggling click',
            // Tempo commands
            'tempo set', 'tempo increased', 'tempo decreased', 'setting tempo',
            // Bar commands
            'moved to bar', 'playing from bar', 'looping bars', 'moved to marker',
            // Track commands
            'selected track', 'muted track', 'unmuted track', 'soloed track', 'unsoloed track',
            'setting track volume', 'track volume set', 'panning track', 'track panned',
            // Common error phrases
            'not found', 'command not found', 'plugin not found', 'action not found'
        ];
        
        // Load saved config from localStorage
        this.loadConfig();
        
        // Initialize AI Agent
        this.initAIAgent();
        
        // Initialize AI Config Manager
        this.aiConfigManager = null;
        
        // Initialize Knowledge Base UI Manager
        this.knowledgeUIManager = null;
        
        // Initialize MIDI 2.0 Manager
        this.midi2Manager = null;
        this.initMIDI2();
        
        // Initialize Plugin Discovery (with delay to ensure IPC is ready)
        this.pluginDiscovery = null;
        // Delay plugin discovery initialization to ensure IPC handlers are registered
        // Increased delay to ensure main process has finished setting up
        setTimeout(() => {
            console.log('🔌 Attempting to initialize plugin discovery...');
            this.initPluginDiscovery();
        }, 2000);
        
        // Initialize TTS Provider
        this.ttsProvider = null;
        this.initTTS();
        
        // Initialize TTS Config Manager
        this.ttsConfigManager = null;
        
        this.initElements();
        // this.initSpeechRecognition(); // Disabled - using manual input
        this.initListeners();
        
        // Initialize AI config UI after a short delay (ensure DOM is ready)
        setTimeout(() => {
            console.log('🔧 Initializing RHEA UI managers...');
            
            if (typeof AIConfigManager !== 'undefined') {
                this.aiConfigManager = new AIConfigManager(this);
                window.aiConfigManager = this.aiConfigManager; // Expose to window
                console.log('✅ AI Config Manager initialized');
            }
            if (typeof KnowledgeUIManager !== 'undefined') {
                this.knowledgeUIManager = new KnowledgeUIManager(this);
                window.knowledgeUI = this.knowledgeUIManager; // Expose to window
                console.log('✅ Knowledge UI Manager initialized');
            }
            if (typeof TTSConfigManager !== 'undefined') {
                this.ttsConfigManager = new TTSConfigManager(this);
                window.ttsConfigUI = this.ttsConfigManager; // Expose to window
                console.log('✅ TTS Config Manager initialized');
            }
            
            // Dispatch event to notify that managers are ready
            window.dispatchEvent(new CustomEvent('rhea-managers-ready'));
            console.log('🎉 All RHEA managers ready!');
        }, 500); // Reduced from 1000ms to 500ms
    }
    
    /**
     * Initialize MIDI 2.0 Manager
     */
    async initMIDI2() {
        try {
            if (typeof MIDI2Manager !== 'undefined' && window.midi2) {
                this.midi2Manager = new MIDI2Manager();
                const result = await this.midi2Manager.initialize();
                if (result.success) {
                    console.log('🎹 MIDI 2.0 Manager initialized');
                    // Auto-discover devices
                    await this.midi2Manager.discoverDevices();
                }
            } else {
                console.log('⚠️  MIDI 2.0 not available');
            }
        } catch (error) {
            console.error('Failed to initialize MIDI 2.0:', error);
        }
    }
    
    /**
     * Initialize Plugin Discovery
     * Gracefully handles failures - doesn't break the app if plugins don't work
     */
    async initPluginDiscovery() {
        try {
            if (typeof PluginDiscovery === 'undefined') {
                console.log('⚠️  PluginDiscovery class not available - skipping');
                return;
            }
            
            if (!window.plugins) {
                console.log('⚠️  window.plugins API not available - skipping plugin discovery');
                return;
            }
            
            this.pluginDiscovery = new PluginDiscovery();
            const result = await this.pluginDiscovery.initialize();
            
            if (result && result.success) {
                console.log('🔌 Plugin Discovery initialized:', result.message);
            } else {
                const errorMsg = result?.error || 'Unknown error';
                console.warn('⚠️  Plugin Discovery initialization failed (non-critical):', errorMsg);
                console.warn('⚠️  Plugin features will be disabled, but app will continue working');
                this.pluginDiscovery = null; // Clear it so we don't try to use it
            }
        } catch (error) {
            console.warn('⚠️  Plugin Discovery error (non-critical):', error.message);
            console.warn('⚠️  App will continue without plugin discovery features');
            this.pluginDiscovery = null; // Clear it so we don't try to use it
        }
    }
    
    /**
     * Initialize TTS Provider
     */
    async initTTS() {
        try {
            if (typeof TTSProvider !== 'undefined') {
                // Load TTS config from localStorage
                const ttsConfig = this.loadTTSConfig();
                
                this.ttsProvider = new TTSProvider(ttsConfig);
                const result = await this.ttsProvider.initialize();
                
                if (result.success) {
                    console.log('🎤 TTS Provider initialized:', ttsConfig.provider);
                } else {
                    console.warn('TTS Provider initialization failed:', result.error);
                    // Fallback to browser TTS
                    this.ttsProvider = null;
                }
            } else {
                console.log('⚠️  TTS Provider not available, using browser TTS');
            }
        } catch (error) {
            console.error('Failed to initialize TTS Provider:', error);
            this.ttsProvider = null;
        }
    }
    
    /**
     * Load TTS configuration from localStorage
     */
    loadTTSConfig() {
        try {
            const saved = localStorage.getItem('rhea_tts_config');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load TTS config:', e);
        }
        
        // Default config (browser TTS)
        return {
            provider: 'browser', // 'browser', 'elevenlabs', 'coqui', 'piper', 'polly', 'google'
            apiKey: null,
            voiceId: null
        };
    }
    
    /**
     * Save TTS configuration to localStorage
     */
    saveTTSConfig(config) {
        try {
            localStorage.setItem('rhea_tts_config', JSON.stringify(config));
            // Reinitialize TTS provider
            this.initTTS();
            console.log('✅ TTS config saved');
        } catch (e) {
            console.error('Failed to save TTS config:', e);
        }
    }
    
    /**
     * Initialize AI Agent
     */
    initAIAgent() {
        try {
            // Check if AIAgent is available (loaded in HTML)
            if (typeof AIAgent !== 'undefined') {
                // Load AI config from localStorage
                const aiConfig = this.loadAIConfig();
                
                // Initialize knowledge base if available
                let knowledgeBase = null;
                if (typeof KnowledgeBase !== 'undefined') {
                    knowledgeBase = new KnowledgeBase({
                        embeddingAPIKey: aiConfig.apiKey,
                        embeddingProvider: aiConfig.provider === 'local' ? 'local' : 'openai',
                        embeddingRetryOnRateLimit: true,
                        embeddingMaxRetries: 2,
                        embeddingRetryDelay: 1000,
                        embeddingUseCache: true // Cache to reduce API calls
                    });
                }
                
                this.aiAgent = new AIAgent({
                    ...aiConfig,
                    knowledgeBase: knowledgeBase
                });
                this.useAI = aiConfig.apiKey || aiConfig.provider === 'local';
                
                console.log('🤖 AI Agent initialized:', {
                    provider: aiConfig.provider,
                    model: aiConfig.model,
                    enabled: this.useAI,
                    knowledgeBase: knowledgeBase ? 'enabled' : 'disabled'
                });
            } else {
                console.log('⚠️  AIAgent not available, using keyword matching');
                this.aiAgent = null;
                this.useAI = false;
            }
        } catch (error) {
            console.error('❌ Failed to initialize AI Agent:', error);
            this.aiAgent = null;
            this.useAI = false;
        }
    }
    
    /**
     * Load AI configuration from localStorage
     */
    loadAIConfig() {
        try {
            const saved = localStorage.getItem('rhea_ai_config');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load AI config:', e);
        }
        
        // Default config
        return {
            provider: 'openai', // 'openai', 'anthropic', 'local'
            apiKey: null,
            model: 'gpt-4o-mini',
            baseURL: null,
            temperature: 0.7,
            maxTokens: 500,
            enableMemory: true,
            maxContextLength: 10,
            enableTools: true,
            fallbackToKeyword: true
        };
    }
    
    /**
     * Save AI configuration to localStorage
     */
    saveAIConfig(config) {
        try {
            localStorage.setItem('rhea_ai_config', JSON.stringify(config));
            // Reinitialize AI agent with new config
            if (this.aiAgent) {
                this.aiAgent.updateConfig(config);
            } else {
                this.initAIAgent();
            }
            console.log('✅ AI config saved');
        } catch (e) {
            console.error('Failed to save AI config:', e);
        }
    }
    
    loadConfig() {
        try {
            const saved = localStorage.getItem('rhea_config');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load config:', e);
        }
    }
    
    saveConfig() {
        try {
            localStorage.setItem('rhea_config', JSON.stringify(this.config));
        } catch (e) {
            console.warn('Failed to save config:', e);
        }
    }
    
    updateConfig(key, value) {
        if (this.config.hasOwnProperty(key)) {
            this.config[key] = value;
            this.saveConfig();
            return true;
        }
        return false;
    }

    initElements() {
        this.statusIndicator = document.getElementById('rhea-status');
        this.statusText = document.getElementById('status-text');
        this.audioViz = document.getElementById('audio-viz');
        this.voiceToggle = document.getElementById('voice-toggle');
        console.log('Elements initialized');
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                console.log('Heard:', transcript);
                this.processCommand(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error !== 'no-speech') {
                    this.updateStatus('error', 'Voice error: ' + event.error);
                }
            };
            
            this.recognition.onend = () => {
                if (this.isListening) {
                    this.recognition.start();
                }
            };
            
            console.log('Speech recognition initialized');
        } else {
            console.error('Speech recognition not supported');
        }
    }

    initListeners() {
        if (this.voiceToggle) {
            this.voiceToggle.addEventListener('click', () => {
                console.log('Voice button clicked!');
                this.toggleVoice();
            });
        }

        // Quick command buttons
        document.querySelectorAll('.quick-cmd').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cmd = e.target.dataset.command;
                this.executeQuick(cmd);
            });
        });
        
        // Manual command input
        const manualInput = document.getElementById('manual-command');
        const sendButton = document.getElementById('send-command');
        console.log('*** Setting up manual command input ***');
        console.log('Manual input element:', manualInput);
        console.log('Send button element:', sendButton);
        
        if (sendButton && manualInput) {
            console.log('*** Adding click listener to send button ***');
            sendButton.addEventListener('click', () => {
                const command = manualInput.value.trim();
                console.log('*** Send button clicked! Command:', command);
                console.log('*** Current isProcessingCommand:', this.isProcessingCommand);
                if (command) {
                    // Force reset flag if stuck before processing
                    if (this.isProcessingCommand) {
                        console.log('⚠️  Flag stuck before manual command - resetting');
                        this.isProcessingCommand = false;
                    }
                    console.log('*** Processing manual command:', command);
                    this.processCommand(command);
                    manualInput.value = '';
                } else {
                    console.log('*** No command entered ***');
                }
            });
            
            manualInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('*** Enter key pressed, clicking send button ***');
                    sendButton.click();
                }
            });
        } else {
            console.error('*** ERROR: sendButton or manualInput not found! ***');
            console.error('sendButton:', sendButton);
            console.error('manualInput:', manualInput);
        }

        // Initialize voice engine status - not listening initially
        this.updateVoiceEngineStatus('ready', 'Click "Start Listening" to begin');
        this.updateStatus('ready', 'Ready - Click to start listening');
        
        // Listen for voice engine ready
        if (window.dawrv && window.dawrv.voice) {
            window.dawrv.voice.onEngineReady(() => {
                console.log('✅ Voice engine ready');
                this.updateVoiceEngineStatus('ready', 'Ready - Click to start listening');
                this.updateStatus('ready', 'Ready - Click to start listening');
            });
            
            window.dawrv.voice.onError((error) => {
                console.error('Voice engine error:', error);
                // Only show error if it's not a warning or info message
                const errorLower = error.toLowerCase();
                const isWarning = errorLower.includes('warning') || 
                                 errorLower.includes('upgrade') || 
                                 errorLower.includes('version') ||
                                 errorLower.includes('consider');
                
                if (!isWarning) {
                    this.updateVoiceEngineStatus('error', `Error: ${error}`);
                    this.updateStatus('error', 'Voice engine error');
                } else {
                    // Just log warnings, don't show as errors
                    console.warn('Voice engine warning (ignored):', error);
                }
            });
        }
    }

    async toggleVoice() {
        if (!this.isListening) {
            // Try to start via IPC first (Python listener)
            if (window.dawrv && window.dawrv.voice) {
                try {
                    console.log('📞 ========================================');
                    console.log('📞 Calling IPC startListening...');
                    console.log('📞 window.dawrv exists:', !!window.dawrv);
                    console.log('📞 window.dawrv.voice exists:', !!(window.dawrv && window.dawrv.voice));
                    console.log('📞 window.dawrv.voice.startListening exists:', !!(window.dawrv && window.dawrv.voice && window.dawrv.voice.startListening));
                    
                    const result = await window.dawrv.voice.startListening();
                    
                    console.log('📞 ========================================');
                    console.log('📞 IPC result received');
                    console.log('📞 IPC result:', result);
                    console.log('📞 Result type:', typeof result);
                    console.log('📞 Result is null?', result === null);
                    console.log('📞 Result is undefined?', result === undefined);
                    if (result) {
                        console.log('📞 Result.success:', result.success);
                        console.log('📞 Result.error:', result.error);
                        console.log('📞 Full result JSON:', JSON.stringify(result, null, 2));
                    }
                    console.log('📞 ========================================');
                    
                    if (result && result.success) {
                        console.log('✅ IPC startListening succeeded');
                        this.startListening();
                    } else {
                        console.error('❌ ========================================');
                        console.error('❌ Failed to start voice listening via IPC');
                        console.error('❌ Full result object:', JSON.stringify(result, null, 2));
                        console.error('❌ Result type:', typeof result);
                        console.error('❌ Result.success:', result ? result.success : 'result is null/undefined');
                        console.error('❌ Error message:', result ? result.error : 'No result returned');
                        console.error('❌ This means the Python voice listener failed to start.');
                        console.error('❌ Check the main process console (terminal) for detailed error messages.');
                        console.error('❌ ========================================');
                        // Fallback to browser speech recognition
                        this.startListening();
                    }
                } catch (error) {
                    console.error('❌ ========================================');
                    console.error('❌ EXCEPTION in voice listening IPC call');
                    console.error('❌ Error:', error);
                    console.error('❌ Error message:', error.message);
                    console.error('❌ Error stack:', error.stack);
                    console.error('❌ ========================================');
                    // Fallback to browser speech recognition
                    this.startListening();
                }
            } else {
                this.startListening();
            }
        } else {
            // Stop listening
            if (window.dawrv && window.dawrv.voice) {
                try {
                    await window.dawrv.voice.stopListening();
                } catch (error) {
                    console.error('Error stopping voice listening:', error);
                }
            }
            this.stopListening();
        }
    }

    startListening() {
        console.log('Starting to listen');
        this.isListening = true;
        this.updateStatus('listening', 'Listening...');
        this.updateVoiceEngineStatus('listening', 'Listening...');
        
        if (this.voiceToggle) {
            this.voiceToggle.classList.add('active');
            const btnText = this.voiceToggle.querySelector('.btn-text');
            const btnIcon = this.voiceToggle.querySelector('.btn-icon');
            if (btnText) btnText.textContent = 'Stop Listening';
            if (btnIcon) btnIcon.textContent = '🔴';
        }
        
        if (this.audioViz) {
            this.audioViz.classList.add('active');
        }
        
        // Try browser speech recognition as fallback (if available)
        if (this.recognition) {
            try {
                this.recognition.start();
                console.log('Browser speech recognition started (fallback)');
            } catch (error) {
                // Ignore - Python listener is primary
                console.log('Browser recognition not available, using Python listener');
            }
        } else {
            console.log('Using Python voice listener');
        }
    }

    stopListening() {
        console.log('Stopping listening');
        this.isListening = false;
        this.updateStatus('ready', 'Ready to assist');
        this.updateVoiceEngineStatus('ready', 'Voice engine ready');
        
        if (this.voiceToggle) {
            this.voiceToggle.classList.remove('active');
            const btnText = this.voiceToggle.querySelector('.btn-text');
            const btnIcon = this.voiceToggle.querySelector('.btn-icon');
            if (btnText) btnText.textContent = 'Start Listening';
            if (btnIcon) btnIcon.textContent = '🎤';
        }
        
        if (this.audioViz) {
            this.audioViz.classList.remove('active');
        }
        
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping recognition:', error);
            }
        }
    }

    updateStatus(status, message) {
        this.status = status;
        if (this.statusText) {
            this.statusText.textContent = message;
        }
        if (this.statusIndicator) {
            this.statusIndicator.className = 'status-indicator ' + status;
        }
        
        const avatar = document.querySelector('.rhea-avatar');
        if (avatar) {
            avatar.className = 'rhea-avatar ' + status;
        }
    }
    
    updateVoiceEngineStatus(status, message) {
        const statusEl = document.getElementById('voice-engine-status');
        if (statusEl) {
            const icons = {
                'starting': '🟡',
                'ready': '🟢',
                'error': '🔴',
                'listening': '🔵'
            };
            const icon = icons[status] || '⚪';
            statusEl.textContent = `${icon} ${message}`;
        }
    }

    // Enhanced command matching with fuzzy logic
    matchCommand(text) {
        const lower = text.toLowerCase().trim();
        
        // Command patterns with variations - ORDER MATTERS (more specific first)
        // Check longer phrases first to avoid partial matches
        const commandPatterns = [
            {
                name: 'stop',
                keywords: ['stop playback', 'stop playing', 'stop the playback', 'halt playback'],
                action: 'stop',
                response: 'Stopping playback',
                priority: 10
            },
            {
                name: 'play',
                keywords: ['start playback', 'start playing', 'play the', 'begin playback'],
                action: 'play',
                response: 'Starting playback',
                priority: 10
            },
            {
                name: 'newtrack',
                keywords: ['new track', 'add track', 'create track', 'new channel', 'add channel'],
                action: 'newtrack',
                response: 'Creating new track',
                priority: 9
            },
            {
                name: 'stop',
                keywords: ['stop', 'halt', 'pause', 'end'],
                action: 'stop',
                response: 'Stopping playback',
                priority: 5
            },
            {
                name: 'play',
                keywords: ['play', 'start', 'begin', 'resume', 'continue'],
                action: 'play',
                response: 'Starting playback',
                priority: 5
            },
            {
                name: 'record',
                keywords: ['record', 'recording', 'capture', 'tape'],
                action: 'record',
                response: 'Recording started',
                priority: 5
            },
            {
                name: 'undo',
                keywords: ['undo', 'reverse', 'back', 'cancel'],
                action: 'undo',
                response: 'Undoing last action',
                priority: 5
            },
            {
                name: 'save',
                keywords: ['save', 'store', 'keep'],
                action: 'save',
                response: 'Saving project',
                priority: 5
            },
            // Transport commands
            {
                name: 'pause',
                keywords: ['pause', 'pause playback', 'pause the playback'],
                action: 'pause',
                response: 'Pausing playback',
                priority: 8
            },
            {
                name: 'rewind',
                keywords: ['rewind', 'go back', 'back to start', 'go to start', 'start over'],
                action: 'rewind',
                response: 'Rewinding to start',
                priority: 8
            },
            {
                name: 'gotoend',
                keywords: ['go to end', 'end of project', 'jump to end', 'skip to end'],
                action: 'gotoend',
                response: 'Going to end',
                priority: 8
            },
            {
                name: 'loop',
                keywords: ['loop', 'toggle loop', 'enable loop', 'repeat', 'cycle'],
                action: 'loop',
                response: 'Toggling loop',
                priority: 7
            },
            // Editing commands
            {
                name: 'redo',
                keywords: ['redo', 'repeat', 'do again'],
                action: 'redo',
                response: 'Redoing last action',
                priority: 6
            },
            {
                name: 'cut',
                keywords: ['cut', 'cut selection', 'remove selection'],
                action: 'cut',
                response: 'Cutting selection',
                priority: 6
            },
            {
                name: 'copy',
                keywords: ['copy', 'copy selection'],
                action: 'copy',
                response: 'Copying selection',
                priority: 6
            },
            {
                name: 'paste',
                keywords: ['paste', 'paste here', 'insert'],
                action: 'paste',
                response: 'Pasting',
                priority: 6
            },
            {
                name: 'delete',
                keywords: ['delete', 'remove', 'clear selection'],
                action: 'delete',
                response: 'Deleting selection',
                priority: 6
            },
            {
                name: 'selectall',
                keywords: ['select all', 'select everything', 'select all items'],
                action: 'selectall',
                response: 'Selecting all',
                priority: 6
            },
            // Project commands
            {
                name: 'saveas',
                keywords: ['save as', 'save project as', 'save copy'],
                action: 'saveas',
                response: 'Saving project as',
                priority: 6
            },
            {
                name: 'newproject',
                keywords: ['new project', 'create project', 'start new project'],
                action: 'newproject',
                response: 'Creating new project',
                priority: 7
            },
            {
                name: 'openproject',
                keywords: ['open project', 'load project', 'open file'],
                action: 'openproject',
                response: 'Opening project',
                priority: 7
            },
            // Track commands
            {
                name: 'deletetrack',
                keywords: ['delete track', 'remove track', 'delete current track'],
                action: 'deletetrack',
                response: 'Deleting track',
                priority: 7
            },
            {
                name: 'mute',
                keywords: ['mute', 'mute track', 'silence', 'turn off'],
                action: 'mute',
                response: 'Muting track',
                priority: 7
            },
            {
                name: 'unmute',
                keywords: ['unmute', 'unmute track', 'turn on', 'enable track'],
                action: 'unmute',
                response: 'Unmuting track',
                priority: 7
            },
            {
                name: 'solo',
                keywords: ['solo', 'solo track', 'isolate', 'solo this'],
                action: 'solo',
                response: 'Soloing track',
                priority: 7
            },
            {
                name: 'unsolo',
                keywords: ['unsolo', 'unsolo track', 'unisolate', 'unsolo all'],
                action: 'unsolo',
                response: 'Unsoloing track',
                priority: 7
            },
            // Navigation commands
            {
                name: 'nexttrack',
                keywords: ['next track', 'go to next track', 'select next track'],
                action: 'nexttrack',
                response: 'Moving to next track',
                priority: 7
            },
            {
                name: 'previoustrack',
                keywords: ['previous track', 'go to previous track', 'select previous track', 'last track'],
                action: 'previoustrack',
                response: 'Moving to previous track',
                priority: 7
            },
            {
                name: 'zoomin',
                keywords: ['zoom in', 'zoom closer', 'magnify', 'increase zoom'],
                action: 'zoomin',
                response: 'Zooming in',
                priority: 6
            },
            {
                name: 'zoomout',
                keywords: ['zoom out', 'zoom away', 'decrease zoom', 'zoom back'],
                action: 'zoomout',
                response: 'Zooming out',
                priority: 6
            },
            {
                name: 'zoomall',
                keywords: ['zoom all', 'fit to screen', 'show all', 'zoom to fit'],
                action: 'zoomall',
                response: 'Zooming to fit all',
                priority: 6
            },
            // Marker commands
            {
                name: 'addmarker',
                keywords: ['add marker', 'place marker', 'set marker', 'mark here'],
                action: 'addmarker',
                response: 'Adding marker',
                priority: 7
            },
            {
                name: 'nextmarker',
                keywords: ['next marker', 'go to next marker', 'jump to next marker'],
                action: 'nextmarker',
                response: 'Moving to next marker',
                priority: 7
            },
            {
                name: 'previousmarker',
                keywords: ['previous marker', 'go to previous marker', 'jump to previous marker', 'last marker'],
                action: 'previousmarker',
                response: 'Moving to previous marker',
                priority: 7
            },
            // MIDI 2.0 precise control commands
            {
                name: 'setvolume',
                keywords: ['set volume to', 'volume to', 'set volume', 'volume at'],
                action: 'setvolume',
                response: 'Setting volume',
                priority: 8,
                supportsPrecise: true
            },
            {
                name: 'setreverb',
                keywords: ['set reverb to', 'reverb to', 'set reverb', 'reverb at'],
                action: 'setreverb',
                response: 'Setting reverb',
                priority: 8,
                supportsPrecise: true
            },
            {
                name: 'setpan',
                keywords: ['set pan to', 'pan to', 'set pan', 'pan at'],
                action: 'setpan',
                response: 'Setting pan',
                priority: 8,
                supportsPrecise: true
            },
            // Plugin discovery commands
            {
                name: 'listplugins',
                keywords: ['list plugins', 'show plugins', 'what plugins', 'all plugins', 'available plugins', 'plugins installed'],
                action: 'listplugins',
                response: 'Listing plugins',
                priority: 8
            },
            {
                name: 'searchplugins',
                keywords: ['search plugin', 'find plugin', 'look for plugin', 'show plugin', 'search for plugin'],
                action: 'searchplugins',
                response: 'Searching plugins',
                priority: 8
            },
            {
                name: 'plugininfo',
                keywords: ['plugin info', 'plugin information', 'tell me about plugin', 'what is plugin', 'info about plugin'],
                action: 'plugininfo',
                response: 'Getting plugin information',
                priority: 8
            },
            {
                name: 'plugincounts',
                keywords: ['plugin count', 'how many plugins', 'plugin statistics', 'plugin stats'],
                action: 'plugincounts',
                response: 'Getting plugin counts',
                priority: 7
            },
            // Tempo/BPM commands
            {
                name: 'settempo',
                keywords: ['set tempo to', 'change tempo to', 'adjust tempo to', 'tempo to', 'bpm to', 'set bpm to', 'change bpm to'],
                action: 'settempo',
                response: 'Setting tempo',
                priority: 9,
                supportsPrecise: true
            },
            {
                name: 'increasetempo',
                keywords: ['increase tempo', 'speed up tempo', 'tempo up', 'faster tempo', 'increase bpm', 'speed up bpm'],
                action: 'increasetempo',
                response: 'Increasing tempo',
                priority: 8
            },
            {
                name: 'decreasetempo',
                keywords: ['decrease tempo', 'slow down tempo', 'tempo down', 'slower tempo', 'decrease bpm', 'slow down bpm'],
                action: 'decreasetempo',
                response: 'Decreasing tempo',
                priority: 8
            },
            {
                name: 'gettempo',
                keywords: ['what tempo', 'current tempo', 'what bpm', 'current bpm', 'show tempo', 'show bpm'],
                action: 'gettempo',
                response: 'Getting tempo',
                priority: 8
            },
            // Bars/measures commands
            {
                name: 'gotobar',
                keywords: ['go to bar', 'goto bar', 'bar number', 'go to measure', 'measure number'],
                action: 'gotobar',
                response: 'Going to bar',
                priority: 8
            },
            {
                name: 'playfrombar',
                keywords: ['play from bar', 'start at bar', 'start from bar', 'play bar'],
                action: 'playfrombar',
                response: 'Playing from bar',
                priority: 8
            },
            {
                name: 'loopbars',
                keywords: ['loop bars', 'loop between bars', 'loop from bar', 'loop measures', 'loop measure', 'loop from measure'],
                action: 'loopbars',
                response: 'Looping bars',
                priority: 8
            },
            // Marker commands
            {
                name: 'gotomarker',
                keywords: ['go to marker', 'jump to marker', 'marker number'],
                action: 'gotomarker',
                response: 'Going to marker',
                priority: 8
            },
            // Loop from selection / clear loop
            {
                name: 'setloopfromselection',
                keywords: ['set loop from selection', 'loop selection', 'use time selection as loop'],
                action: 'setloopfromselection',
                response: 'Loop set from selection',
                priority: 8
            },
            {
                name: 'clearloop',
                keywords: ['clear loop', 'remove loop', 'disable loop'],
                action: 'clearloop',
                response: 'Loop cleared',
                priority: 8
            },
            // Toggle metronome and pre-roll/count-in
            {
                name: 'toggleclick',
                keywords: ['toggle metronome', 'toggle click', 'metronome on', 'metronome off'],
                action: 'toggleclick',
                response: 'Toggling metronome',
                priority: 8
            },
            {
                name: 'togglepreroll',
                keywords: ['toggle pre roll', 'toggle pre-roll', 'pre roll on', 'pre roll off'],
                action: 'togglepreroll',
                response: 'Toggling pre-roll',
                priority: 7
            },
            {
                name: 'togglecountin',
                keywords: ['toggle count in', 'toggle count-in', 'count in on', 'count in off'],
                action: 'togglecountin',
                response: 'Toggling count-in',
                priority: 7
            },
            // Nudge cursor
            {
                name: 'nudgebars',
                keywords: ['nudge bar', 'nudge bars', 'move cursor bars', 'shift bars'],
                action: 'nudgebars',
                response: 'Nudging bars',
                priority: 7
            },
            {
                name: 'nudgebeats',
                keywords: ['nudge beat', 'nudge beats', 'move cursor beats', 'shift beats'],
                action: 'nudgebeats',
                response: 'Nudging beats',
                priority: 7
            },
            // Track Control Commands
            {
                name: 'selecttrack',
                keywords: ['select track', 'go to track', 'switch to track', 'choose track'],
                action: 'selecttrack',
                response: 'Selecting track',
                priority: 8
            },
            {
                name: 'mutetrack',
                keywords: ['mute track', 'silence track', 'turn off track'],
                action: 'mutetrack',
                response: 'Muting track',
                priority: 8
            },
            {
                name: 'unmutetrack',
                keywords: ['unmute track', 'turn on track', 'enable track'],
                action: 'unmutetrack',
                response: 'Unmuting track',
                priority: 8
            },
            {
                name: 'solotrack',
                keywords: ['solo track', 'solo only track', 'isolate track'],
                action: 'solotrack',
                response: 'Soloing track',
                priority: 8
            },
            {
                name: 'unsolotrack',
                keywords: ['unsolo track', 'unsolo', 'remove solo track'],
                action: 'unsolotrack',
                response: 'Unsoloing track',
                priority: 8
            },
            {
                name: 'armtracknum',
                keywords: ['arm track', 'record arm track', 'enable recording track', 'record enable track'],
                action: 'armtracknum',
                response: 'Arming track',
                priority: 8
            },
            {
                name: 'settrackvolume',
                keywords: ['set track volume', 'track volume', 'volume track', 'set volume track'],
                action: 'settrackvolume',
                response: 'Setting track volume',
                priority: 8
            },
            {
                name: 'settrackpan',
                keywords: ['pan track', 'set track pan', 'track pan', 'pan track left', 'pan track right', 'pan track center'],
                action: 'settrackpan',
                response: 'Panning track',
                priority: 8
            },
            // Mixer Control Commands
            {
                name: 'showmixer',
                keywords: ['show mixer', 'open mixer', 'display mixer', 'view mixer', 'mixer window', 'show me the mixer', 'open the mixer', 'display the mixer'],
                action: 'showmixer',
                response: 'Opening mixer',
                priority: 8
            },
            {
                name: 'hidemixer',
                keywords: ['hide mixer', 'close mixer', 'hide the mixer', 'close the mixer'],
                action: 'hidemixer',
                response: 'Closing mixer',
                priority: 8
            },
            {
                name: 'togglemixer',
                keywords: ['toggle mixer', 'toggle the mixer'],
                action: 'togglemixer',
                response: 'Toggling mixer',
                priority: 7
            },
            {
                name: 'mastermute',
                keywords: ['mute master', 'master mute', 'mute main output', 'silence master'],
                action: 'mastermute',
                response: 'Muting master',
                priority: 8
            },
            {
                name: 'masterunmute',
                keywords: ['unmute master', 'master unmute', 'unmute main output', 'enable master'],
                action: 'masterunmute',
                response: 'Unmuting master',
                priority: 8
            },
            {
                name: 'togglemastermute',
                keywords: ['toggle master mute', 'toggle mute master'],
                action: 'togglemastermute',
                response: 'Toggling master mute',
                priority: 8
            },
            {
                name: 'setmastervolume',
                keywords: ['set master volume', 'master volume', 'volume master', 'main volume', 'set main volume'],
                action: 'setmastervolume',
                response: 'Setting master volume',
                priority: 8
            },
            {
                name: 'mastervolumeup',
                keywords: ['master volume up', 'increase master volume', 'master louder', 'main volume up'],
                action: 'mastervolumeup',
                response: 'Increasing master volume',
                priority: 8
            },
            {
                name: 'mastervolumedown',
                keywords: ['master volume down', 'decrease master volume', 'master quieter', 'main volume down'],
                action: 'mastervolumedown',
                response: 'Decreasing master volume',
                priority: 8
            },
            {
                name: 'resetmastervolume',
                keywords: ['reset master volume', 'master volume reset', 'reset main volume'],
                action: 'resetmastervolume',
                response: 'Resetting master volume',
                priority: 8
            },
            {
                name: 'resetallfaders',
                keywords: ['reset all faders', 'reset all volumes', 'reset faders', 'default volumes'],
                action: 'resetallfaders',
                response: 'Resetting all faders',
                priority: 8
            },
            {
                name: 'muteall',
                keywords: ['mute all', 'mute all tracks', 'silence all', 'mute everything'],
                action: 'muteall',
                response: 'Muting all tracks',
                priority: 8
            },
            {
                name: 'unmuteall',
                keywords: ['unmute all', 'unmute all tracks', 'enable all', 'unmute everything'],
                action: 'unmuteall',
                response: 'Unmuting all tracks',
                priority: 8
            },
            {
                name: 'unsoloall',
                keywords: ['unsolo all', 'unsolo all tracks', 'unsolo everything'],
                action: 'unsololall',
                response: 'Unsoloing all tracks',
                priority: 8
            },
            {
                name: 'unarmall',
                keywords: ['unarm all', 'unarm all tracks', 'disable recording all', 'unarm everything'],
                action: 'unarmall',
                response: 'Unarming all tracks',
                priority: 8
            },
            {
                name: 'showmcp',
                keywords: ['show mcp', 'show mixer control panel', 'toggle mcp'],
                action: 'showmcp',
                response: 'Toggling mixer control panel',
                priority: 8
            },
            {
                name: 'showtcp',
                keywords: ['show tcp', 'show track control panel', 'toggle tcp'],
                action: 'showtcp',
                response: 'Toggling track control panel',
                priority: 8
            }
        ];
        
        // Check for exact matches - prioritize longer/more specific phrases first
        // Sort by priority (higher first), then by keyword length (longer first)
        const sortedPatterns = commandPatterns.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return Math.max(...b.keywords.map(k => k.length)) - Math.max(...a.keywords.map(k => k.length));
        });
        
        for (const cmdData of sortedPatterns) {
            for (const keyword of cmdData.keywords) {
                // Use word boundary matching for single words to avoid partial matches
                if (keyword.split(' ').length === 1) {
                    // Single word - use word boundary regex
                    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                    if (regex.test(lower)) {
                        return {
                            action: cmdData.action,
                            response: cmdData.response,
                            confidence: 1.0
                        };
                    }
                } else {
                    // Multi-word phrase - use simple includes
                    if (lower.includes(keyword)) {
                        return {
                            action: cmdData.action,
                            response: cmdData.response,
                            confidence: 1.0
                        };
                    }
                }
            }
        }
        
        // Fuzzy matching for partial matches
        let bestMatch = null;
        let bestScore = 0;
        
        for (const cmdData of commandPatterns) {
            for (const keyword of cmdData.keywords) {
                // Fuzzy matching (if enabled)
                if (this.config.enableFuzzyMatching && lower.length >= keyword.length * 0.6) {
                    const similarity = this.calculateSimilarity(lower, keyword);
                    const threshold = this.config.sensitivity;
                    if (similarity > bestScore && similarity > threshold) {
                        bestScore = similarity;
                        bestMatch = {
                            action: cmdData.action,
                            response: cmdData.response,
                            confidence: similarity
                        };
                    }
                }
            }
        }
        
        // Provide helpful feedback for unrecognized commands
        const helpfulResponses = [
            'I didn\'t catch that. Try commands like play, stop, or set tempo',
            'Not sure what you meant. Say "help" for available commands',
            'Could you rephrase that? I understand commands like record, mute, or go to bar'
        ];
        const randomHelp = helpfulResponses[Math.floor(Math.random() * helpfulResponses.length)];
        return bestMatch || { action: null, response: randomHelp, confidence: 0 };
    }
    
    /**
     * Extract precise value from voice command
     * Handles: "set volume to 75.3 percent", "volume at 0.753", etc.
     */
    extractPreciseValue(text) {
        const lower = text.toLowerCase();
        
        // Pattern: number with optional decimal, optional "percent" or "%"
        const patterns = [
            /(\d+\.?\d*)\s*percent/i,
            /(\d+\.?\d*)\s*%/i,
            /to\s+(\d+\.?\d*)/i,
            /at\s+(\d+\.?\d*)/i,
            /(\d+\.?\d*)/i
        ];
        
        for (const pattern of patterns) {
            const match = lower.match(pattern);
            if (match) {
                const value = parseFloat(match[1]);
                if (!isNaN(value)) {
                    // Determine if it's percentage (0-100) or normalized (0-1)
                    const isPercentage = lower.includes('percent') || 
                                        lower.includes('%') || 
                                        (value > 1 && value <= 100);
                    
                    return {
                        value: value,
                        unit: isPercentage ? 'percentage' : 'normalized',
                        raw: match[0]
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Extract BPM/tempo value from text
     */
    extractBPMValue(text) {
        const lower = text.toLowerCase();
        
        // Patterns for BPM values
        const patterns = [
            /(\d+\.?\d*)\s*bpm/i,  // "120 BPM"
            /(\d+\.?\d*)\s*beats\s*per\s*minute/i,  // "120 beats per minute"
            /tempo\s+to\s+(\d+\.?\d*)/i,  // "tempo to 120"
            /tempo\s+at\s+(\d+\.?\d*)/i,  // "tempo at 120"
            /set\s+tempo\s+to\s+(\d+\.?\d*)/i,  // "set tempo to 120"
            /change\s+tempo\s+to\s+(\d+\.?\d*)/i,  // "change tempo to 120"
            /adjust\s+tempo\s+to\s+(\d+\.?\d*)/i,  // "adjust tempo to 120"
            /(\d+\.?\d*)/i  // Just a number (if in tempo context)
        ];
        
        for (const pattern of patterns) {
            const match = lower.match(pattern);
            if (match) {
                const value = parseFloat(match[1]);
                if (!isNaN(value) && value > 0 && value <= 300) {  // Valid BPM range
                    return {
                        value: value,
                        unit: 'bpm',
                        raw: match[0]
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Extract single bar/measure number from text
     */
    extractBarValue(text) {
        // Try numeric first
        const numberAfterKeyword = text.match(/(?:bar|measure)\s*(\d+)/i);
        if (numberAfterKeyword) {
            const value = parseInt(numberAfterKeyword[1], 10);
            if (!isNaN(value) && value > 0) return value;
        }
        const anyNumber = text.match(/(\d+)/);
        if (anyNumber) {
            const value = parseInt(anyNumber[1], 10);
            if (!isNaN(value) && value > 0) return value;
        }
        // Fallback: parse number words (e.g., "seven", "twenty three")
        const wordValue = this.parseNumberWords(text);
        if (wordValue && wordValue > 0) return wordValue;
        return null;
    }
    
    /**
     * Extract track number from voice command
     * Examples: "select track 3", "mute track one", "track 5"
     */
    extractTrackNumber(text) {
        const lower = text.toLowerCase();
        
        // Try numeric after "track" keyword
        const trackMatch = lower.match(/track\s*(\d+)/i);
        if (trackMatch) {
            const num = parseInt(trackMatch[1], 10);
            if (!isNaN(num) && num > 0 && num <= 128) return num;
        }
        
        // Try just any number in track context
        const anyNumber = lower.match(/(\d+)/);
        if (anyNumber) {
            const num = parseInt(anyNumber[1], 10);
            if (!isNaN(num) && num > 0 && num <= 128) return num;
        }
        
        // Try word numbers (one, two, three, etc.)
        const wordNumber = this.parseNumberWords(lower);
        if (wordNumber && wordNumber > 0 && wordNumber <= 128) return wordNumber;
        
        return null;
    }
    
    /**
     * Extract volume percentage from voice command
     * Examples: "75 percent", "50%", "volume to 80"
     */
    extractVolumeValue(text) {
        const lower = text.toLowerCase();
        
        // Pattern matching for volume
        const patterns = [
            /(\d+\.?\d*)\s*percent/i,       // "75 percent"
            /(\d+\.?\d*)\s*%/i,             // "75%"
            /volume\s+to\s+(\d+\.?\d*)/i,   // "volume to 75"
            /set\s+volume\s+(\d+\.?\d*)/i,  // "set volume 75"
            /(\d+\.?\d*)/i                  // Just a number
        ];
        
        for (const pattern of patterns) {
            const match = lower.match(pattern);
            if (match) {
                const value = parseFloat(match[1]);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                    return value;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Extract pan direction from voice command
     * Examples: "pan left", "pan right", "pan center", "pan 50% left"
     */
    extractPanValue(text) {
        const lower = text.toLowerCase();
        
        // Directional pan
        if (/\b(center|centre|middle)\b/i.test(lower)) {
            return { direction: 'center', value: 0 };
        }
        if (/\bleft\b/i.test(lower)) {
            // Check for percentage: "pan 50% left"
            const percentMatch = lower.match(/(\d+\.?\d*)\s*%?\s*left/i);
            if (percentMatch) {
                const percent = parseFloat(percentMatch[1]);
                return { direction: 'left', value: -Math.min(100, percent) };
            }
            return { direction: 'left', value: -100 };
        }
        if (/\bright\b/i.test(lower)) {
            // Check for percentage: "pan 50% right"
            const percentMatch = lower.match(/(\d+\.?\d*)\s*%?\s*right/i);
            if (percentMatch) {
                const percent = parseFloat(percentMatch[1]);
                return { direction: 'right', value: Math.min(100, percent) };
            }
            return { direction: 'right', value: 100 };
        }
        
        return null;
    }
    
    /**
     * Extract bar range from text
     */
    extractBarRange(text) {
        // Numeric range
        const rangeMatch = text.match(/(?:bar|measure)\s*(\d+)\s*(?:to|-|through)\s*(\d+)/i) ||
                           text.match(/(\d+)\s*(?:to|-|through)\s*(\d+)/i);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0) {
                return { start, end };
            }
        }
        // Word range (e.g., "bars seven to ten")
        const wordRange = text.match(/(?:bar|measure)s?\s+([a-z\s-]+?)\s*(?:to|-|through)\s*([a-z\s-]+)/i);
        if (wordRange) {
            const start = this.parseNumberWords(wordRange[1]);
            const end = this.parseNumberWords(wordRange[2]);
            if (start && end && start > 0 && end > 0) return { start, end };
        }
        return null;
    }
    
    /**
     * Parse simple number words into integers (supports up to 999)
     */
    parseNumberWords(fragment) {
        if (!fragment) return null;
        const words = fragment.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
        if (words.length === 0) return null;
        
        const units = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'for': 4, 'five': 5, 'six': 6, 'seven': 7,
            'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
            'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19
        };
        const tens = {
            'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
            'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
        };
        
        let total = 0;
        let current = 0;
        for (const w of words) {
            if (units.hasOwnProperty(w)) {
                current += units[w];
            } else if (tens.hasOwnProperty(w)) {
                current += tens[w];
            } else if (w === 'hundred') {
                if (current === 0) current = 1;
                current *= 100;
            } else if (w === 'and') {
                continue;
            } else {
                // unknown word, reset possible parse
                // ignore unrelated words like 'bar', 'measure'
            }
        }
        total += current;
        return total > 0 ? total : null;
    }
    
    /**
     * Process tempo/BPM commands
     */
    async processTempoCommand(action, text) {
        try {
            switch (action) {
                case 'settempo':
                    // Extract BPM value
                    const bpmInfo = this.extractBPMValue(text);
                    if (!bpmInfo) {
                        return { 
                            success: false, 
                            error: 'Please specify a tempo value (e.g., "set tempo to 120 BPM")' 
                        };
                    }
                    
                    const bpm = Math.round(bpmInfo.value);
                    if (bpm < 1 || bpm > 300) {
                        return { 
                            success: false, 
                            error: `Tempo must be between 1 and 300 BPM (you said ${bpm})` 
                        };
                    }
                    
                    // Execute tempo change via REAPER bridge
                    const result = await this.executeTempoCommand('set', bpm);
                    if (result.success) {
                        return { 
                            success: true, 
                            message: this.generateResponse('settempo', { bpm })
                        };
                    }
                    return result;
                    
                case 'increasetempo':
                    // Extract amount (default 5 BPM)
                    const increaseAmount = this.extractBPMValue(text)?.value || 5;
                    const increaseBPM = Math.round(increaseAmount);
                    
                    const increaseResult = await this.executeTempoCommand('increase', increaseBPM);
                    if (increaseResult.success) {
                        return { 
                            success: true, 
                            message: `Tempo increased by ${increaseBPM} BPM` 
                        };
                    }
                    return increaseResult;
                    
                case 'decreasetempo':
                    // Extract amount (default 5 BPM)
                    const decreaseAmount = this.extractBPMValue(text)?.value || 5;
                    const decreaseBPM = Math.round(decreaseAmount);
                    
                    const decreaseResult = await this.executeTempoCommand('decrease', decreaseBPM);
                    if (decreaseResult.success) {
                        return { 
                            success: true, 
                            message: `Tempo decreased by ${decreaseBPM} BPM` 
                        };
                    }
                    return decreaseResult;
                    
                case 'gettempo':
                    const getResult = await this.executeTempoCommand('get');
                    if (getResult.success) {
                        return { 
                            success: true, 
                            message: `Current tempo is ${getResult.tempo} BPM` 
                        };
                    }
                    return getResult;
                    
                default:
                    return { success: false, error: `Unknown tempo command: ${action}` };
            }
        } catch (error) {
            console.error('Tempo command error:', error);
            return { success: false, error: error.message || 'Tempo command failed' };
        }
    }
    
    /**
     * Execute tempo command via REAPER bridge (using IPC to main process)
     */
    async executeTempoCommand(command, value = null) {
        try {
            console.log('🎵 [RHEA] executeTempoCommand called:', command, value);
            console.log('🎵 [RHEA] window.api exists?', !!window.api);
            console.log('🎵 [RHEA] window.api.executeTempoCommand exists?', !!(window.api && window.api.executeTempoCommand));
            
            // Use IPC to call main process, which will use Python bridge
            if (!window.api || !window.api.executeTempoCommand) {
                console.error('❌ [RHEA] Tempo control API not available');
                return { 
                    success: false, 
                    error: 'Tempo control API not available' 
                };
            }
            
            console.log('🎵 [RHEA] Calling window.api.executeTempoCommand...');
            const result = await window.api.executeTempoCommand(command, value);
            console.log('🎵 [RHEA] executeTempoCommand result:', result);
            return result;
        } catch (error) {
            console.error('❌ [RHEA] Tempo command IPC error:', error);
            console.error('❌ [RHEA] Error details:', error.message, error.stack);
            return { success: false, error: error.message || 'Tempo command failed' };
        }
    }
    
    /**
     * Process bar/measure commands
     */
    async processBarCommand(action, text) {
        try {
            if (!window.api || !window.api.executeMeasureCommand) {
                return { success: false, error: 'Measure control API not available' };
            }
            
            if (action === 'gotobar') {
                const value = this.extractBarValue(text);
                if (!value) {
                    return { success: false, error: 'Please tell me which bar to go to' };
                }
                // Prefer Web API path for reliability
                const result = await (window.api.executeGotoBar ? window.api.executeGotoBar(value) : window.api.executeMeasureCommand('goto', value));
                return result.success ? { 
                    success: true, 
                    message: this.generateResponse('gotobar', { bar: value }),
                    context: { transportPosition: `Bar ${value}` }
                } : result;
            }
            
            if (action === 'playfrombar') {
                const value = this.extractBarValue(text);
                if (!value) {
                    return { success: false, error: 'Please tell me which bar to play from' };
                }
                // Go to bar first, then play
                let result = await (window.api.executeGotoBar ? window.api.executeGotoBar(value) : window.api.executeMeasureCommand('goto', value));
                if (result && result.success && window.api && window.api.executeReaperAction) {
                    try { await window.api.executeReaperAction(this.reaperActions['play']); } catch (_) {}
                }
                return result.success ? { 
                    success: true, 
                    message: this.generateResponse('playfrombar', { bar: value }),
                    context: { transportPosition: `Bar ${value}` }
                } : result;
            }
            
            if (action === 'loopbars') {
                const range = this.extractBarRange(text);
                if (!range) {
                    return { success: false, error: 'Please specify loop start and end bars' };
                }
                const result = await window.api.executeMeasureCommand('loop', range.start, range.end);
                return result.success ? { 
                    success: true, 
                    message: this.generateResponse('loopbars', { bar: range.start, barEnd: range.end }),
                    context: { transportPosition: `Bars ${range.start}-${range.end}` }
                } : result;
            }
            
            if (action === 'gotomarker') {
                const value = this.extractBarValue(text); // reuse extractor for numbers
                if (!value) {
                    return { success: false, error: 'Please tell me which marker number to go to' };
                }
                const result = await window.api.executeMeasureCommand('marker', value);
                return result.success ? { 
                    success: true, 
                    message: this.generateResponse('gotomarker', { marker: value }),
                    context: { transportPosition: `Marker ${value}` }
                } : result;
            }
            
            if (action === 'setloopfromselection') {
                const result = await window.api.executeMeasureCommand('loop_from_selection');
                return result.success ? { 
                    success: true, 
                    message: 'Loop set from selection'
                } : result;
            }
            
            if (action === 'clearloop') {
                const result = await window.api.executeMeasureCommand('clear_loop');
                return result.success ? { 
                    success: true, 
                    message: 'Loop cleared'
                } : result;
            }
            
            if (action === 'toggleclick') {
                const result = await window.api.executeMeasureCommand('toggle_click');
                return result.success ? { 
                    success: true, 
                    message: 'Toggling metronome'
                } : result;
            }
            
            if (action === 'togglepreroll') {
                const result = await window.api.executeMeasureCommand('toggle_preroll');
                return result.success ? { 
                    success: true, 
                    message: 'Toggling pre-roll'
                } : result;
            }
            
            if (action === 'togglecountin') {
                const result = await window.api.executeMeasureCommand('toggle_countin');
                return result.success ? { 
                    success: true, 
                    message: 'Toggling count-in'
                } : result;
            }
            
            if (action === 'nudgebars') {
                // Extract signed amount: e.g., "forward/back by 2 bars"
                const sign = /back|left|previous/i.test(text) ? -1 : 1;
                const numberMatch = text.match(/(\d+)/);
                const amount = (numberMatch ? parseInt(numberMatch[1], 10) : 1) * sign;
                const result = await window.api.executeMeasureCommand('nudge_bars', amount);
                return result.success ? { 
                    success: true, 
                    message: `Nudging ${amount > 0 ? 'forward' : 'back'} ${Math.abs(amount)} bar${Math.abs(amount) > 1 ? 's' : ''}`
                } : result;
            }
            
            if (action === 'nudgebeats') {
                const sign = /back|left|previous/i.test(text) ? -1 : 1;
                const numberMatch = text.match(/(\d+)/);
                const amount = (numberMatch ? parseInt(numberMatch[1], 10) : 1) * sign;
                const result = await window.api.executeMeasureCommand('nudge_beats', amount);
                return result.success ? { 
                    success: true, 
                    message: `Nudging ${amount > 0 ? 'forward' : 'back'} ${Math.abs(amount)} beat${Math.abs(amount) > 1 ? 's' : ''}`
                } : result;
            }
            
            return { success: false, error: `Unknown bar command: ${action}` };
        } catch (error) {
            console.error('Bar command error:', error);
            return { success: false, error: error.message || 'Measure command failed' };
        }
    }
    
    /**
     * Detect if a query is conversational (vs command-oriented)
     */
    isConversationalQuery(text) {
        const lower = text.toLowerCase().trim();
        
        // Conversational patterns (questions, greetings, troubleshooting, meta-queries)
        const conversationalPatterns = [
            // Questions about RHEA's state or capability
            /\b(are you|can you|do you|did you|will you|would you)\b/i,
            /\b(what('s| is)?|why|how|when|where)\b.*\b(you|wrong|happened|happen|working|listening|hearing|understanding)\b/i,
            
            // Greetings and politeness - match anywhere, not just start
            /\b(hi|hello|hey|howdy|greetings)\b/i,
            /\b(thank you|thanks|thank ya|thx|appreciate it|much appreciated)\b/i,
            /\b(please|excuse me|pardon me)\b/i,
            /\b(good morning|good afternoon|good evening|good night)\b/i,
            /\b(goodbye|bye|see ya|later|catch you later)\b/i,
            
            // Meta queries (about RHEA or commands)
            /\b(help|what can you do|show me|tell me about|explain)\b/i,
            
            // Trouble shooting
            /\b(not working|didn't work|nothing happened|no change|issue|problem|error)\b/i,
            /\b(listen|hear|understand|recognize)\b/i,
            
            // Status checks
            /\b(status|ready|available|online)\b/i,
            
            // Confirmation and clarification
            /\b(okay|ok|sure|yes|yeah|yep|no|nope|right|correct|exactly|absolutely)\b/i,
            
            // Compliments and feedback
            /\b(great|good job|nice|well done|perfect|awesome|excellent)\b/i
        ];
        
        // Check if any conversational pattern matches
        const isConversational = conversationalPatterns.some(pattern => pattern.test(lower));
        
        // Also check if it's NOT a command-like pattern
        // Commands usually start with verbs like "play", "stop", "set", "go", etc.
        const commandVerbs = /^(play|stop|pause|record|rewind|go|set|change|adjust|increase|decrease|mute|solo|loop|add|create|delete|remove|save|open|zoom|toggle|nudge)/i;
        const seemsLikeCommand = commandVerbs.test(lower);
        
        // Return true only if it's conversational AND doesn't seem like a command
        return isConversational && !seemsLikeCommand;
    }
    
    /**
     * Process track control commands
     */
    async processTrackCommand(action, text) {
        try {
            if (!window.api || !window.api.executeTrackCommand) {
                return { success: false, error: 'Track control API not available' };
            }
            
            const trackNum = this.extractTrackNumber(text);
            
            if (action === 'selecttrack') {
                if (!trackNum) {
                    return { success: false, error: 'Please tell me which track to select' };
                }
                const result = await window.api.executeTrackCommand('select', trackNum);
                return result.success ? {
                    success: true,
                    message: `Selected track ${trackNum}`,
                    context: { selectedTrack: trackNum }
                } : result;
            }
            
            if (action === 'mutetrack') {
                if (!trackNum) {
                    return { success: false, error: 'Please tell me which track to mute' };
                }
                const result = await window.api.executeTrackCommand('mute', trackNum);
                return result.success ? {
                    success: true,
                    message: `Muted track ${trackNum}`,
                    context: { mutedTrack: trackNum }
                } : result;
            }
            
            if (action === 'unmutetrack') {
                if (!trackNum) {
                    return { success: false, error: 'Please tell me which track to unmute' };
                }
                const result = await window.api.executeTrackCommand('unmute', trackNum);
                return result.success ? {
                    success: true,
                    message: `Unmuted track ${trackNum}`,
                    context: { unmutedTrack: trackNum }
                } : result;
            }
            
            if (action === 'solotrack') {
                if (!trackNum) {
                    return { success: false, error: 'Please tell me which track to solo' };
                }
                const result = await window.api.executeTrackCommand('solo', trackNum);
                return result.success ? {
                    success: true,
                    message: `Soloed track ${trackNum}`,
                    context: { soloedTrack: trackNum }
                } : result;
            }
            
            if (action === 'unsolotrack') {
                if (!trackNum) {
                    return { success: false, error: 'Please tell me which track to unsolo' };
                }
                const result = await window.api.executeTrackCommand('unsolo', trackNum);
                return result.success ? {
                    success: true,
                    message: `Unsoloed track ${trackNum}`,
                    context: { unsoloedTrack: trackNum }
                } : result;
            }
            
            if (action === 'armtracknum') {
                if (!trackNum) {
                    return { success: false, error: 'Please tell me which track to arm' };
                }
                const result = await window.api.executeTrackCommand('arm', trackNum);
                return result.success ? {
                    success: true,
                    message: `Armed track ${trackNum}`,
                    context: { armedTrack: trackNum }
                } : result;
            }
            
            if (action === 'settrackvolume') {
                if (!trackNum) {
                    return { success: false, error: 'Please tell me which track' };
                }
                const volume = this.extractVolumeValue(text);
                if (volume === null) {
                    return { success: false, error: 'Please specify volume percentage (0-100)' };
                }
                const result = await window.api.executeTrackCommand('volume', trackNum, volume);
                return result.success ? {
                    success: true,
                    message: `Set track ${trackNum} volume to ${volume}%`,
                    context: { trackVolume: volume }
                } : result;
            }
            
            if (action === 'settrackpan') {
                if (!trackNum) {
                    return { success: false, error: 'Please tell me which track' };
                }
                const panInfo = this.extractPanValue(text);
                if (!panInfo) {
                    return { success: false, error: 'Please specify pan direction (left/right/center)' };
                }
                const result = await window.api.executeTrackCommand('pan', trackNum, panInfo.value);
                return result.success ? {
                    success: true,
                    message: `Panned track ${trackNum} ${panInfo.direction}`,
                    context: { trackPan: panInfo.direction }
                } : result;
            }
            
            return { success: false, error: `Unknown track command: ${action}` };
        } catch (error) {
            console.error('Track command error:', error);
            return { success: false, error: error.message || 'Track command failed' };
        }
    }
    
    /**
     * Process mixer control commands
     */
    async processMixerCommand(action, text) {
        console.log('🎛️ ========================================');
        console.log('🎛️ processMixerCommand called!');
        console.log('🎛️ Action:', action);
        console.log('🎛️ Text:', text);
        console.log('🎛️ ========================================');
        
        try {
            // Mixer Visibility Commands with smart show/hide
            if (action === 'showmixer' || action === 'hidemixer' || action === 'togglemixer' || 
                action === 'mixerwindow' || action === 'openmixer' || action === 'closemixer') {
                console.log('🎛️ Matched mixer visibility command:', action);
                console.log('🎛️ Current mixer state:', this.mixerVisible ? 'visible' : 'hidden');
                
                if (!window.api || !window.api.executeReaperAction) {
                    console.error('❌ executeReaperAction not available!');
                    return { success: false, error: 'REAPER action API not available' };
                }
                
                // Determine if we need to toggle based on current state
                let shouldToggle = false;
                let actionMessage = 'Mixer window';
                
                // Smart show/close: Only toggle if needed
                if (action === 'showmixer' || action === 'openmixer') {
                    // SHOW: Only toggle if currently hidden
                    if (!this.mixerVisible) {
                        shouldToggle = true;
                        this.mixerVisible = true;
                        actionMessage = 'Opening mixer';
                    } else {
                        console.log('🎛️ Mixer already visible');
                        return { success: true, message: 'Mixer already open', context: {} };
                    }
                } else if (action === 'hidemixer' || action === 'closemixer') {
                    // CLOSE: Only toggle if currently visible
                    console.log('🎛️ Close mixer command detected');
                    console.log('🎛️ Current mixerVisible state:', this.mixerVisible);
                    if (this.mixerVisible) {
                        shouldToggle = true;
                        this.mixerVisible = false;
                        actionMessage = 'Closing mixer';
                        console.log('🎛️ Will toggle to close mixer');
                    } else {
                        console.log('🎛️ Mixer state says already hidden - but forcing toggle anyway to ensure closure');
                        // Force toggle even if state says hidden - in case state is wrong
                        shouldToggle = true;
                        this.mixerVisible = false;
                        actionMessage = 'Closing mixer';
                    }
                } else {
                    // TOGGLE: Always flip
                    shouldToggle = true;
                    this.mixerVisible = !this.mixerVisible;
                    actionMessage = this.mixerVisible ? 'Opening mixer' : 'Closing mixer';
                }
                
                if (shouldToggle) {
                    console.log('🎛️ Toggling mixer (action 40083 - View: Toggle mixer visible)');
                    const result = await window.api.executeReaperAction(40083);
                    console.log('🎛️ Result:', result);
                    
                    return result.success ? {
                        success: true,
                        message: actionMessage,
                        context: { mixerVisible: this.mixerVisible }
                    } : result;
                }
            }
            
            if (action === 'showmcp' || action === 'hidemcp' || action === 'togglemcp') {
                const actionId = this.reaperActions[action] || 40075;
                const result = await window.api.executeReaperAction(actionId);
                return result.success ? {
                    success: true,
                    message: 'Toggled mixer control panel',
                    context: {}
                } : result;
            }
            
            if (action === 'showtcp' || action === 'hidetcp' || action === 'toggletcp') {
                const actionId = this.reaperActions[action] || 40074;
                const result = await window.api.executeReaperAction(actionId);
                return result.success ? {
                    success: true,
                    message: 'Toggled track control panel',
                    context: {}
                } : result;
            }
            
            // Master Track Controls (via OSC)
            if (action === 'master_mute' || action === 'mastermute') {
                // Mute master track (track 0 in OSC)
                const result = await window.api.executeTrackCommand('mute', 0);
                return result.success ? {
                    success: true,
                    message: 'Master muted',
                    context: { masterMuted: true }
                } : result;
            }
            
            if (action === 'master_unmute' || action === 'masterunmute') {
                // Unmute master track (track 0 in OSC)
                const result = await window.api.executeTrackCommand('unmute', 0);
                return result.success ? {
                    success: true,
                    message: 'Master unmuted',
                    context: { masterMuted: false }
                } : result;
            }
            
            if (action === 'master_mute_toggle' || action === 'togglemastermute') {
                // Toggle master mute (check current state if possible, or just toggle)
                // For now, we'll use the mute command (OSC will toggle if needed)
                const result = await window.api.executeTrackCommand('mute', 0);
                return result.success ? {
                    success: true,
                    message: 'Master mute toggled',
                    context: {}
                } : result;
            }
            
            if (action === 'master_volume' || action === 'setmastervolume') {
                // Set master volume to X%
                const volumePercent = this.extractVolumeValue(text);
                if (volumePercent === null) {
                    return { success: false, error: 'Please specify a volume percentage (e.g., "50%")' };
                }
                const result = await window.api.executeTrackCommand('volume', 0, volumePercent);
                return result.success ? {
                    success: true,
                    message: `Master volume set to ${volumePercent}%`,
                    context: { masterVolume: volumePercent }
                } : result;
            }
            
            if (action === 'master_volume_reset' || action === 'resetmastervolume') {
                // Reset master volume to 0dB (100% = 1.0 normalized = 0dB)
                const result = await window.api.executeTrackCommand('volume', 0, 100);
                return result.success ? {
                    success: true,
                    message: 'Master volume reset to 0dB',
                    context: { masterVolume: 100 }
                } : result;
            }
            
            if (action === 'reset_all_faders' || action === 'resetallfaders') {
                // Reset all track volumes to 0dB
                // We'll need to iterate through all tracks
                // For now, let's just provide a message (requires DAW state knowledge)
                return { 
                    success: false, 
                    error: 'Reset all faders is not yet implemented. Please reset each track individually.' 
                };
            }
            
            // Global Track Control Actions (use REAPER action IDs)
            if (action === 'muteall') {
                const actionId = this.reaperActions['muteall'] || 40339;
                const result = await window.api.executeReaperAction(actionId);
                return result.success ? {
                    success: true,
                    message: 'Muted all tracks',
                    context: {}
                } : result;
            }
            
            if (action === 'unmuteall') {
                const actionId = this.reaperActions['unmuteall'] || 40340;
                const result = await window.api.executeReaperAction(actionId);
                return result.success ? {
                    success: true,
                    message: 'Unmuted all tracks',
                    context: {}
                } : result;
            }
            
            if (action === 'unsololall') {
                const actionId = this.reaperActions['unsololall'] || 40340;
                const result = await window.api.executeReaperAction(actionId);
                return result.success ? {
                    success: true,
                    message: 'Unsoloed all tracks',
                    context: {}
                } : result;
            }
            
            if (action === 'unarmall') {
                const actionId = this.reaperActions['unarmall'] || 40491;
                const result = await window.api.executeReaperAction(actionId);
                return result.success ? {
                    success: true,
                    message: 'Unarmed all tracks',
                    context: {}
                } : result;
            }
            
            // Master volume up/down (use REAPER action IDs)
            if (action === 'mastervolumeup') {
                const actionId = this.reaperActions['mastervolumeup'] || 40036;
                const result = await window.api.executeReaperAction(actionId);
                return result.success ? {
                    success: true,
                    message: 'Master volume increased',
                    context: {}
                } : result;
            }
            
            if (action === 'mastervolumedown') {
                const actionId = this.reaperActions['mastervolumedown'] || 40037;
                const result = await window.api.executeReaperAction(actionId);
                return result.success ? {
                    success: true,
                    message: 'Master volume decreased',
                    context: {}
                } : result;
            }
            
            return { success: false, error: 'Unknown mixer command' };
            
        } catch (error) {
            console.error('Mixer command error:', error);
            return { success: false, error: error.message || 'Mixer command failed' };
        }
    }
    
    /**
     * Process plugin discovery commands
     */
    async processPluginCommand(action, text, aiResponse) {
        if (!this.pluginDiscovery) {
            return { 
                success: false, 
                error: 'Plugin discovery is not available. Plugin features are disabled.' 
            };
        }

        try {
            switch (action) {
                case 'listplugins':
                    const allPlugins = await this.pluginDiscovery.getAllPlugins();
                    const count = allPlugins.length;
                    if (count === 0) {
                        return { success: true, message: 'No plugins found' };
                    }
                    // List first 10 plugins
                    const pluginList = allPlugins.slice(0, 10).map(p => p.displayName || p.name).join(', ');
                    const moreText = count > 10 ? ` and ${count - 10} more` : '';
                    return { 
                        success: true, 
                        message: `Found ${count} plugins. Here are some: ${pluginList}${moreText}` 
                    };

                case 'searchplugins':
                    // Extract search query from text or AI response
                    let query = '';
                    if (aiResponse && aiResponse.parameters && aiResponse.parameters.query) {
                        query = aiResponse.parameters.query;
                    } else {
                        // Try to extract from text
                        const queryMatch = text.match(/(?:search|find|look for|show).*?(?:plugin|effect|instrument)?\s+(.+)/i);
                        query = queryMatch ? queryMatch[1].trim() : text.replace(/^(?:search|find|look for|show).*?(?:plugin|effect|instrument)?\s*/i, '').trim();
                    }
                    
                    if (!query) {
                        return { success: false, error: 'Please specify what plugin to search for' };
                    }
                    
                    const results = await this.pluginDiscovery.searchPlugins(query);
                    if (results.length === 0) {
                        return { success: true, message: `No plugins found matching "${query}"` };
                    }
                    const resultList = results.slice(0, 5).map(p => p.displayName || p.name).join(', ');
                    const moreResults = results.length > 5 ? ` and ${results.length - 5} more` : '';
                    return { 
                        success: true, 
                        message: `Found ${results.length} plugin${results.length > 1 ? 's' : ''} matching "${query}": ${resultList}${moreResults}` 
                    };

                case 'plugininfo':
                    // Extract plugin name from text or AI response
                    let pluginName = '';
                    if (aiResponse && aiResponse.parameters && aiResponse.parameters.pluginName) {
                        pluginName = aiResponse.parameters.pluginName;
                    } else {
                        // Try to extract from text
                        const nameMatch = text.match(/(?:info|information|about|tell me about).*?(?:plugin|effect|instrument)?\s+(.+)/i);
                        pluginName = nameMatch ? nameMatch[1].trim() : text.replace(/^(?:info|information|about|tell me about).*?(?:plugin|effect|instrument)?\s*/i, '').trim();
                    }
                    
                    if (!pluginName) {
                        return { success: false, error: 'Please specify which plugin to get information about' };
                    }
                    
                    const plugin = await this.pluginDiscovery.getPluginInfo(pluginName);
                    if (!plugin) {
                        return { success: true, message: `Plugin "${pluginName}" not found` };
                    }
                    return { 
                        success: true, 
                        message: `${plugin.displayName || plugin.name} is a ${plugin.type.toUpperCase()} plugin located at ${plugin.path}` 
                    };

                case 'plugincounts':
                    const counts = await this.pluginDiscovery.getCounts();
                    if (!counts || counts.total === 0) {
                        return { success: true, message: 'No plugins found' };
                    }
                    const countText = [
                        counts.counts.au > 0 ? `${counts.counts.au} AU` : '',
                        counts.counts.vst > 0 ? `${counts.counts.vst} VST` : '',
                        counts.counts.vst3 > 0 ? `${counts.counts.vst3} VST3` : '',
                        counts.counts.js > 0 ? `${counts.counts.js} JS` : ''
                    ].filter(Boolean).join(', ');
                    return { 
                        success: true, 
                        message: `Found ${counts.total} total plugins: ${countText}` 
                    };

                default:
                    return { success: false, error: `Unknown plugin command: ${action}` };
            }
        } catch (error) {
            console.error('Plugin command error:', error);
            return { success: false, error: error.message || 'Plugin command failed' };
        }
    }

    async processMIDI2Command(action, text) {
        if (!this.midi2Manager) {
            console.log('⚠️  MIDI 2.0 not available');
            return { success: false, error: 'MIDI 2.0 not initialized' };
        }
        
        // Extract precise value
        const valueInfo = this.extractPreciseValue(text);
        if (!valueInfo) {
            return { success: false, error: 'Could not extract value from command' };
        }
        
        // Map action to MIDI parameter
        const parameterMap = {
            'setvolume': 7, // Volume CC
            'setreverb': 91, // Reverb CC
            'setpan': 10 // Pan CC
        };
        
        const parameter = parameterMap[action];
        if (!parameter) {
            return { success: false, error: `Unknown parameter for action: ${action}` };
        }
        
        // Get first available device (or use default)
        const devices = this.midi2Manager.getDevices();
        if (devices.length === 0) {
            return { success: false, error: 'No MIDI devices found' };
        }
        
        const deviceId = devices[0].id;
        
        // Open device if not already open
        if (!this.midi2Manager.activeDevices.has(deviceId)) {
            await this.midi2Manager.openDevice(deviceId, 'output');
        }
        
        // Send precise value
        const result = await this.midi2Manager.sendPreciseValue(
            deviceId,
            parameter,
            valueInfo.value,
            { unit: valueInfo.unit }
        );
        
        return result;
    }
    
    /**
     * Generate natural, context-aware response text for an action
     */
    generateResponse(action, context = {}) {
        // Multiple response variations for each action (randomly selected for variety)
        const responseVariations = {
            // Transport - Short and professional
            'play': ['Playing', 'Rolling', 'Let\'s hear it'],
            'stop': ['Stopped', 'Stopping', 'Got it'],
            'pause': ['Paused', 'Taking a break', 'Hold on'],
            'record': ['Recording', 'We\'re rolling', 'Capturing audio'],
            'rewind': ['Back to the top', 'Rewinding', 'From the start'],
            'gotoend': ['Jumping to the end', 'End of project', 'Going to the end'],
            'loop': ['Loop toggled', 'Looping', 'Loop mode'],
            
            // Editing - Confirmatory
            'undo': ['Undone', 'Undoing', 'Step back'],
            'redo': ['Redone', 'Redoing', 'Step forward'],
            'cut': ['Cut', 'Cutting selection'],
            'copy': ['Copied', 'Copying selection'],
            'paste': ['Pasted', 'Pasting'],
            'delete': ['Deleted', 'Removing selection'],
            
            // Project - Clear status updates
            'save': ['Project saved', 'Saved', 'Saving project'],
            'saveas': ['Save as', 'Saving project as'],
            'newproject': ['New project', 'Creating new project'],
            'openproject': ['Opening project', 'Loading project'],
            
            // Tracks - Action-focused
            'newtrack': ['New track added', 'Track created', 'Adding track'],
            'deletetrack': ['Track deleted', 'Removing track'],
            'mute': ['Track muted', 'Muting'],
            'unmute': ['Track unmuted', 'Unmuting'],
            'solo': ['Track soloed', 'Soloing'],
            'unsolo': ['Solo off', 'Unsoloing'],
            'nexttrack': ['Next track', 'Moving down'],
            'previoustrack': ['Previous track', 'Moving up'],
            
            // Navigation - Spatial awareness
            'zoomin': ['Zooming in', 'Closer view'],
            'zoomout': ['Zooming out', 'Wider view'],
            'zoomall': ['Fit to window', 'Full view'],
            
            // Markers - Location-aware
            'addmarker': ['Marker added', 'Adding marker'],
            'nextmarker': ['Next marker', 'Jumping forward'],
            'previousmarker': ['Previous marker', 'Jumping back'],
            
            // Bar navigation - Include bar number if available
            'gotobar': context.bar ? [`Bar ${context.bar}`] : ['Moving to bar'],
            'playfrombar': context.bar ? [`Playing from bar ${context.bar}`] : ['Playing from bar'],
            'loopbars': context.bar && context.barEnd ? 
                [`Looping bars ${context.bar} to ${context.barEnd}`] : 
                ['Setting loop range'],
            'gotomarker': context.marker ? [`Marker ${context.marker}`] : ['Going to marker'],
            
            // Loop control
            'setloopfromselection': ['Loop set', 'Loop from selection'],
            'clearloop': ['Loop cleared', 'Loop off'],
            
            // Metronome & Pre-roll
            'toggleclick': ['Click toggled', 'Metronome', 'Click track'],
            'togglepreroll': ['Pre-roll toggled', 'Count-in'],
            'togglecountin': ['Count-in toggled', 'Pre-roll'],
            
            // Tempo - Include BPM if available
            'settempo': context.bpm ? [`${context.bpm} BPM`] : ['Tempo set'],
            'increasetempo': context.bpm ? [`Increased to ${context.bpm}`] : ['Tempo up'],
            'decreasetempo': context.bpm ? [`Decreased to ${context.bpm}`] : ['Tempo down'],
            'gettempo': context.bpm ? [`Current tempo is ${context.bpm} BPM`] : ['Getting tempo'],
            
            // Nudge
            'nudgebars': context.amount ? 
                [`Nudged ${Math.abs(context.amount)} ${context.amount > 0 ? 'forward' : 'back'}`] : 
                ['Nudging'],
            'nudgebeats': context.amount ? 
                [`Nudged ${Math.abs(context.amount)} ${context.amount > 0 ? 'forward' : 'back'}`] : 
                ['Nudging'],
            
            // Meta commands
            'help': [
                'I can help with transport like play and stop, navigation like go to bar, tempo control, markers, looping, and more',
                'Try commands like: play, stop, record, set tempo to 120, go to bar 5, loop bars 1 to 8, add marker',
                'Available commands include transport controls, tempo changes, bar navigation, markers, metronome toggle, and more'
            ],
        };
        
        // Get variations for this action
        const variations = responseVariations[action];
        
        if (variations && variations.length > 0) {
            // Randomly select a variation for natural feel
            const randomIndex = Math.floor(Math.random() * variations.length);
            return variations[randomIndex];
        }
        
        // Fallback for unknown actions
        return `Executing ${action}`;
    }
    
    // Simple similarity calculation (Levenshtein-like)
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        // Check if shorter is contained in longer
        if (longer.includes(shorter)) {
            return shorter.length / longer.length;
        }
        
        // Simple character overlap
        let matches = 0;
        for (let i = 0; i < shorter.length; i++) {
            if (longer.includes(shorter[i])) {
                matches++;
            }
        }
        
        return matches / longer.length;
    }

    async processCommand(transcript) {
        // CRITICAL: Log immediately when function is called
        console.log('*** processCommand CALLED ***', transcript);
        console.log('*** transcript type:', typeof transcript);
        console.log('*** transcript value:', transcript);
        
        // Prevent duplicate processing
        const now = Date.now();
        const normalizedCommand = transcript.toLowerCase().trim();
        
        // FILTER: Ignore very short transcripts (likely false triggers from noise)
        if (normalizedCommand.length < 3) {
            console.log('🔇 Ignoring very short transcript (likely noise):', transcript);
            return;
        }
        
        // FILTER: Ignore transcripts that are just single letters or numbers
        if (/^[a-z0-9]$/i.test(normalizedCommand)) {
            console.log('🔇 Ignoring single character transcript:', transcript);
            return;
        }
        
        // FILTER: Ignore common ambient sound transcriptions
        const ambientNoises = ['uh', 'um', 'ah', 'oh', 'mm', 'hm', 'shh', 'psh', 'tsk', 'hmm', 'uhh', 'umm'];
        if (ambientNoises.includes(normalizedCommand)) {
            console.log('🔇 Ignoring ambient noise:', transcript);
            return;
        }
        
        // FEEDBACK SUPPRESSION: Ignore commands that match RHEA's response phrases
        // Check if the command is similar to any RHEA response phrase
        for (const phrase of this.rheaResponsePhrases) {
            // Check if command contains the full phrase or phrase contains the command
            // Use similarity check to catch variations
            if (normalizedCommand.includes(phrase) || phrase.includes(normalizedCommand)) {
                // Calculate similarity to avoid false positives
                const similarity = this.calculateSimilarity(normalizedCommand, phrase);
                if (similarity > 0.6) { // 60% similarity threshold
                    console.log('🔇 Ignoring RHEA response phrase:', transcript);
                    console.log('   Matched phrase:', phrase);
                    console.log('   Similarity:', (similarity * 100).toFixed(1) + '%');
                    return;
                }
            }
        }
        
        // FEEDBACK SUPPRESSION: Ignore commands while RHEA is speaking
        if (this.isSpeaking) {
            console.log('🔇 Ignoring command while RHEA is speaking:', transcript);
            return;
        }
        
        // FEEDBACK SUPPRESSION: Ignore commands shortly after speech ends (prevent feedback loop)
        if ((now - this.speechEndTime) < this.speechCooldown) {
            console.log('🔇 Ignoring command during speech cooldown:', transcript);
            console.log('   Time since speech ended:', now - this.speechEndTime, 'ms');
            console.log('   Cooldown period:', this.speechCooldown, 'ms');
            return;
        }
        
        // Check if we're already processing a command - SKIP if so (don't force reset)
        if (this.isProcessingCommand) {
            console.log('⏸️  Already processing a command, skipping:', transcript);
            console.log('⏸️  isProcessingCommand flag is:', this.isProcessingCommand);
            return; // IMPORTANT: Actually skip, don't process duplicates
        }
        
        // Check if this is a duplicate command (same text within cooldown period)
        if (this.lastProcessedCommand === normalizedCommand && 
            (now - this.lastProcessedTime) < this.commandCooldown) {
            console.log('⏸️  Duplicate command ignored (within cooldown):', transcript);
            console.log('   Last command:', this.lastProcessedCommand);
            console.log('   Time since last:', now - this.lastProcessedTime, 'ms');
            console.log('   Cooldown period:', this.commandCooldown, 'ms');
            return;
        }
        
        // Check command history for rapid repeats (even if slightly different)
        const recentCommands = this.commandHistory.filter(cmd => (now - cmd.time) < 2000);
        const similarRecent = recentCommands.find(cmd => {
            const similarity = this.calculateSimilarity(normalizedCommand, cmd.command);
            return similarity > 0.8; // 80% similarity = likely the same command
        });
        
        if (similarRecent) {
            console.log('⏸️  Similar command recently processed, ignoring:', transcript);
            console.log('   Similar to:', similarRecent.command);
            console.log('   Time since:', now - similarRecent.time, 'ms');
            return;
        }
        
        // Add to history (keep last 10)
        this.commandHistory.push({ command: normalizedCommand, time: now });
        if (this.commandHistory.length > 10) {
            this.commandHistory.shift();
        }
        
        // Mark as processing
        console.log('✅ Setting isProcessingCommand = true');
        this.isProcessingCommand = true;
        this.lastProcessedCommand = normalizedCommand;
        this.lastProcessedTime = now;
        
        // Use try/finally to ALWAYS reset the flag
        try {
        
        // SIMPLE, ALWAYS-VISIBLE LOGS
        console.log('========================================');
        console.log('PROCESSING COMMAND:', transcript);
        console.log('========================================');
        this.logCommand(transcript);
        
        // Immediately show processing status
        this.updateStatus('processing', 'Processing...');
        
        // OPTIMIZATION: Try keyword matching FIRST for instant response
        // Only use AI as fallback for unrecognized commands
        let match = null;
        let aiResponse = null;
        let aiFallbackMessage = null;
        
        console.log('🔍 Trying keyword matching first (for instant response)...');
        match = this.matchCommand(transcript);
        
        // If keyword matching found a command, skip AI completely
        if (match && match.action) {
            console.log('✅ Keyword match found! Skipping AI for instant execution');
            console.log('   Action:', match.action, 'Confidence: HIGH (keyword match)');
        } else if (this.useAI && this.aiAgent) {
            // Only use AI if keyword matching failed
            try {
                console.log('🤖 No keyword match - trying AI agent as fallback...');
                aiResponse = await this.aiAgent.processInput(transcript, this.reaperActions);
                
                if (aiResponse && aiResponse.action) {
                    // AI found an action
                    match = {
                        action: aiResponse.action,
                        response: aiResponse.text || this.generateResponse(aiResponse.action),
                        confidence: aiResponse.confidence || 0.8
                    };
                    console.log('🤖 AI determined action:', match.action, 'Confidence:', match.confidence);
                    console.log('🤖 AI reasoning:', aiResponse.reasoning);
                } else if (aiResponse && aiResponse.text) {
                    // AI provided conversational response (no action)
                    console.log('💬 AI conversational response:', aiResponse.text);
                    
                    // Check if this is truly conversational (questions, greetings, troubleshooting)
                    const isConversational = this.isConversationalQuery(transcript);
                    
                    if (isConversational) {
                        // Pure conversation - speak directly and exit
                        console.log('💬 Pure conversational query detected - speaking AI response');
                        this.speak(aiResponse.text);
                        this.updateStatus('ready', aiResponse.text);
                        this.logResult(transcript, 'success');
                        this.isProcessingCommand = false;
                        return;
                    } else {
                        // Possible command - save AI response but try keyword matching as fallback
                        console.log('🤖 AI response (no action, will fallback to keywords):', aiResponse.text);
                        aiFallbackMessage = aiResponse.text;
                    }
                }
            } catch (error) {
                console.error('❌ AI processing failed, falling back to keyword matching:', error);
                
                // If API key is invalid, disable AI temporarily
                if (error.message && error.message.includes('Invalid API key')) {
                    console.warn('⚠️  Invalid API key - disabling AI, using keyword matching only');
                    this.useAI = false; // Temporarily disable to avoid repeated errors
                }
                
                // If rate limited, inform user (but don't speak if fallback is working)
                if (error.message && error.message.includes('Rate limit')) {
                    console.log('⏳ Rate limit detected - using keyword matching as fallback');
                    // Only speak if fallback is disabled (otherwise it's handled silently)
                    if (!this.aiAgent?.config?.fallbackToKeyword) {
                        this.speak('Rate limit reached. Using keyword matching.');
                    }
                }
                
                // Fall through - match is already null if AI failed
            }
        }
        
        // match already set from keyword matching above or AI
        // No need for duplicate matchCommand() call here
        
        const { action, response } = match;
        
        // If still no actionable match, use AI fallback message or default response
        if (!action) {
            const fallback = aiFallbackMessage || response || 'Command not recognized';
            console.log('⚠️  No actionable command found. Using fallback message:', fallback);
            this.speak(fallback);
            this.updateStatus('ready', fallback);
            this.logResult(transcript, 'error');
            this.isProcessingCommand = false;
            return;
        }
        
        console.log('MATCH RESULT - Action:', action, 'Response:', response);
        console.log('window.api exists?', !!window.api);
        console.log('reaperActions[action]:', action ? this.reaperActions[action] : 'NO ACTION');
        
        // Check if this is a help command
        if (action === 'help') {
            const helpMessage = this.generateResponse('help');
            this.speak(helpMessage);
            this.updateStatus('ready', helpMessage);
            this.logResult(transcript, 'success');
            this.isProcessingCommand = false;
            return;
        }
        
        // Check if this is a plugin command
        const pluginActions = ['listplugins', 'searchplugins', 'plugininfo', 'plugincounts'];
        const isPluginCommand = pluginActions.includes(action);
        
        // Check if this is a tempo command
        const tempoActions = ['settempo', 'increasetempo', 'decreasetempo', 'gettempo'];
        const isTempoCommand = tempoActions.includes(action);
        
        // Check if this is a bar/measure command
        const barActions = ['gotobar', 'playfrombar', 'loopbars', 'gotomarker', 'setloopfromselection', 'clearloop', 'toggleclick', 'togglepreroll', 'togglecountin', 'nudgebars', 'nudgebeats'];
        const isBarCommand = barActions.includes(action);
        
        // Check if this is a track control command
        const trackActions = ['selecttrack', 'mutetrack', 'unmutetrack', 'solotrack', 'unsolotrack', 'armtracknum', 'settrackvolume', 'settrackpan'];
        const isTrackCommand = trackActions.includes(action);
        
        // Check if this is a mixer control command
        const mixerActions = ['mastermute', 'masterunmute', 'togglemastermute', 'setmastervolume', 'resetmastervolume', 'resetallfaders', 'master_mute', 'master_unmute', 'master_mute_toggle', 'master_volume', 'master_volume_reset', 'reset_all_faders'];
        const isMixerCommand = mixerActions.includes(action);
        
        // Check if this is a MIDI 2.0 precise value command
        const midi2Actions = ['setvolume', 'setreverb', 'setpan'];
        const isMIDI2Command = midi2Actions.includes(action);
        
        const willExecute = action && (this.reaperActions[action] || isMIDI2Command || isPluginCommand || isTempoCommand || isBarCommand || isTrackCommand || isMixerCommand);
        console.log('WILL EXECUTE?', willExecute);
        console.log('IS PLUGIN COMMAND?', isPluginCommand);
        console.log('IS TEMPO COMMAND?', isTempoCommand);
        console.log('IS BAR COMMAND?', isBarCommand);
        console.log('IS TRACK COMMAND?', isTrackCommand);
        console.log('IS MIXER COMMAND?', isMixerCommand);
        console.log('IS MIDI 2.0 COMMAND?', isMIDI2Command);
        
        // Handle plugin commands
        if (isPluginCommand) {
            try {
                console.log('🔌 Processing plugin command:', action);
                const result = await this.processPluginCommand(action, transcript, aiResponse);
                if (result.success) {
                    this.speak(result.message || response);
                    this.updateStatus('ready', result.message || response);
                    this.logResult(transcript, 'success');
                } else {
                    this.speak(result.error || 'Plugin command failed');
                    this.updateStatus('error', result.error || 'Plugin command failed');
                    this.logResult(transcript, 'error');
                }
            } catch (error) {
                console.error('Plugin command error:', error);
                this.speak('Plugin command failed');
                this.updateStatus('error', 'Plugin command failed');
                this.logResult(transcript, 'error');
            } finally {
                this.isProcessingCommand = false;
            }
            return;
        }
        
        // Handle tempo commands
        if (isTempoCommand) {
            try {
                console.log('🎵 Processing tempo command:', action);
                const result = await this.processTempoCommand(action, transcript);
                if (result.success) {
                    this.speak(result.message || response);
                    this.updateStatus('ready', result.message || response);
                    this.logResult(transcript, 'success');
                } else {
                    this.speak(result.error || 'Tempo command failed');
                    this.updateStatus('error', result.error || 'Tempo command failed');
                    this.logResult(transcript, 'error');
                }
            } catch (error) {
                console.error('Tempo command error:', error);
                this.speak('Tempo command failed');
                this.updateStatus('error', 'Tempo command failed');
                this.logResult(transcript, 'error');
            } finally {
                this.isProcessingCommand = false;
            }
            return;
        }
        
        // Handle bar/measure commands
        if (isBarCommand) {
            try {
                console.log('📏 Processing bar command:', action);
                const result = await this.processBarCommand(action, transcript);
                if (result.success) {
                    this.speak(result.message || response);
                    this.updateStatus('ready', result.message || response);
                    if (this.aiAgent && result.context) {
                        this.aiAgent.updateDAWContext(result.context);
                    }
                    this.logResult(transcript, 'success');
                } else {
                    this.speak(result.error || 'Measure command failed');
                    this.updateStatus('error', result.error || 'Measure command failed');
                    this.logResult(transcript, 'error');
                }
            } catch (error) {
                console.error('Measure command error:', error);
                this.speak('Measure command failed');
                this.updateStatus('error', 'Measure command failed');
                this.logResult(transcript, 'error');
            } finally {
                this.isProcessingCommand = false;
            }
            return;
        }
        
        // Handle track control commands
        if (isTrackCommand) {
            try {
                console.log('🎚️ Processing track command:', action);
                const result = await this.processTrackCommand(action, transcript);
                if (result.success) {
                    this.speak(result.message || response);
                    this.updateStatus('ready', result.message || response);
                    if (this.aiAgent && result.context) {
                        this.aiAgent.updateDAWContext(result.context);
                    }
                    this.logResult(transcript, 'success');
                } else {
                    this.speak(result.error || 'Track command failed');
                    this.updateStatus('error', result.error || 'Track command failed');
                    this.logResult(transcript, 'error');
                }
            } catch (error) {
                console.error('Track command error:', error);
                this.speak('Track command failed');
                this.updateStatus('error', 'Track command failed');
                this.logResult(transcript, 'error');
            } finally {
                this.isProcessingCommand = false;
            }
            return;
        }
        
        // Handle mixer control commands
        if (isMixerCommand) {
            try {
                console.log('🎛️ Processing mixer command:', action);
                const result = await this.processMixerCommand(action, transcript);
                if (result.success) {
                    this.speak(result.message || response);
                    this.updateStatus('ready', result.message || response);
                    if (this.aiAgent && result.context) {
                        this.aiAgent.updateDAWContext(result.context);
                    }
                    this.logResult(transcript, 'success');
                } else {
                    this.speak(result.error || 'Mixer command failed');
                    this.updateStatus('error', result.error || 'Mixer command failed');
                    this.logResult(transcript, 'error');
                }
            } catch (error) {
                console.error('Mixer command error:', error);
                this.speak('Mixer command failed');
                this.updateStatus('error', 'Mixer command failed');
                this.logResult(transcript, 'error');
            } finally {
                this.isProcessingCommand = false;
            }
            return;
        }
        
        // Handle MIDI 2.0 precise value commands
        if (isMIDI2Command) {
            try {
                console.log('🎹 Processing MIDI 2.0 command:', action);
                const result = await this.processMIDI2Command(action, transcript);
                if (result.success) {
                    const valueInfo = this.extractPreciseValue(transcript);
                    const valueText = valueInfo ? `${valueInfo.value}${valueInfo.unit === 'percentage' ? '%' : ''}` : '';
                    this.speak(`${response} ${valueText}`);
                    this.updateStatus('ready', `${response} ${valueText}`);
                    this.logResult(transcript, 'success');
                } else {
                    this.speak(`Failed to set ${action}: ${result.error}`);
                    this.updateStatus('error', result.error);
                    this.logResult(transcript, 'error');
                }
            } catch (error) {
                console.error('MIDI 2.0 command error:', error);
                this.speak('MIDI command failed');
                this.updateStatus('error', 'MIDI command failed');
                this.logResult(transcript, 'error');
            } finally {
                this.isProcessingCommand = false;
            }
            return;
        }
        
        if (action && this.reaperActions[action]) {
            console.log('>>> ENTERING EXECUTION BLOCK <<<');
            console.log('Action ID:', this.reaperActions[action]);
            
            if (!window.api) {
                console.error('ERROR: window.api does NOT exist!');
                this.speak('REAPER API not available');
                // Reset flag before returning
                setTimeout(() => {
                    this.isProcessingCommand = false;
                }, 100);
                return;
            }
            
            if (window.api && window.api.executeReaperAction) {
                console.log('>>> CALLING executeReaperAction <<<');
                try {
                    const actionId = this.reaperActions[action];
                    console.log('🎯 Executing REAPER action:', action, '→ Action ID:', actionId);
                    console.log('   window.api exists:', !!window.api);
                    
                    // Update AI agent context with action
                    if (this.aiAgent) {
                        this.aiAgent.updateDAWContext({
                            lastAction: action,
                            lastActionTime: Date.now()
                        });
                    }
                    console.log('   window.api.executeReaperAction exists:', !!(window.api && window.api.executeReaperAction));
                    
                    // Execute command without waiting for speech response
                    console.log('📞 ========================================');
                    console.log('📞 [RENDERER] Calling window.api.executeReaperAction');
                    console.log('📞 [RENDERER] Action ID:', actionId);
                    console.log('📞 [RENDERER] Action ID type:', typeof actionId);
                    console.log('📞 [RENDERER] window.api:', window.api);
                    console.log('📞 [RENDERER] window.api.executeReaperAction:', window.api ? window.api.executeReaperAction : 'N/A');
                    
                    const callStartTime = Date.now();
                    const result = await window.api.executeReaperAction(actionId);
                    const callDuration = Date.now() - callStartTime;
                    
                    console.log('📞 [RENDERER] IPC call completed in', callDuration, 'ms');
                    console.log('📞 [RENDERER] REAPER action result:', result);
                    console.log('📞 ========================================');
                    console.log('   Result type:', typeof result);
                    console.log('   Result.success:', result ? result.success : 'result is null/undefined');
                    
                    // Update UI immediately
                    if (result && result.success) {
                        console.log('✅ REAPER action executed successfully');
                        this.logResult(transcript, 'success');
                        this.updateStatus('responding', response);
                        
                        // Speak response without blocking
                        this.speak(response);
                    } else {
                        console.error('❌ REAPER action failed:', result);
                        this.logResult(transcript, 'error');
                        this.updateStatus('error', 'Command failed');
                        this.speak('Failed to execute command');
                    }
                } catch (error) {
                    console.error('❌ REAPER command error:', error);
                    console.error('   Error message:', error.message);
                    console.error('   Error stack:', error.stack);
                    this.logResult(transcript, 'error');
                    this.updateStatus('error', 'Command error');
                    this.speak('Command failed');
                }
            } else {
                // REAPER API not available, but command recognized
                console.error('❌ window.api.executeReaperAction is NOT available!');
                console.error('   window.api:', window.api);
                this.logResult(transcript, 'success');
                this.updateStatus('responding', response);
                this.speak(response + ' (REAPER not connected)');
            }
        } else {
            // Command not recognized or action not in reaperActions
            if (!action) {
                console.log('❓ Command not recognized:', transcript);
            } else {
                console.error('❌ Action not found in reaperActions:', action);
                console.error('   Available actions:', Object.keys(this.reaperActions));
            }
            this.logResult(transcript, 'error');
            this.updateStatus('ready', 'Command not recognized');
            // Don't speak for unrecognized commands to avoid interrupting
        }

        } finally {
            // ALWAYS reset processing flag - this runs no matter what
            setTimeout(() => {
                console.log('✅ Resetting isProcessingCommand = false (finally block)');
                this.isProcessingCommand = false;
                if (this.isListening) {
                    this.updateStatus('listening', 'Listening...');
                } else {
                    this.updateStatus('ready', 'Ready to assist');
                }
            }, 800);
        }
    }

    initVoice() {
        // Initialize and select the best available voice
        if (!window.speechSynthesis) return;
        
        // Wait for voices to load
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            
            if (voices.length === 0) {
                // Voices not loaded yet, try again
                setTimeout(loadVoices, 100);
                return;
            }
            
            // Find the best available voice
            for (const preferredName of this.voiceConfig.preferredVoices) {
                const voice = voices.find(v => 
                    v.name.includes(preferredName) || 
                    v.name.toLowerCase().includes(preferredName.toLowerCase())
                );
                
                if (voice) {
                    this.voiceConfig.selectedVoice = voice;
                    console.log('🎤 RHEA voice selected:', voice.name, `(${voice.lang})`);
                    return;
                }
            }
            
            // Fallback: use first enhanced/premium voice, or default
            const enhancedVoice = voices.find(v => 
                v.name.includes('Enhanced') || 
                v.name.includes('Premium') ||
                v.name.includes('Siri')
            );
            
            this.voiceConfig.selectedVoice = enhancedVoice || voices[0];
            console.log('🎤 RHEA voice selected (fallback):', this.voiceConfig.selectedVoice.name);
        };
        
        // Load voices (may need to wait)
        if (window.speechSynthesis.getVoices().length > 0) {
            loadVoices();
        } else {
            window.speechSynthesis.onvoiceschanged = loadVoices;
            loadVoices(); // Try immediately too
        }
    }
    
    async speak(text) {
        if (!text || text.trim() === '') return;
        
        // SPEED OPTIMIZATION: Skip verbal feedback for standard commands
        // Only speak for errors, confirmations, or conversational responses
        const silentMessages = [
            'starting playback', 'stopping playback', 'recording started', 'pausing playback',
            'opening mixer', 'closing mixer', 'toggling mixer', 'muting track', 'unmuting track',
            'soloing track', 'unsoloing track', 'zooming in', 'zooming out', 'rewinding',
            'going to end', 'toggling loop', 'undoing', 'redoing', 'cutting', 'copying', 'pasting'
        ];
        
        const textLower = text.toLowerCase();
        if (silentMessages.some(msg => textLower.includes(msg))) {
            console.log('RHEA says (silent mode):', text);
            // Update status but don't speak for instant response
            this.speechEndTime = Date.now(); // Set to now so cooldown is minimal
            return;
        }
        
        console.log('RHEA says:', text);
        
        // Mark as speaking to prevent feedback loops
        this.isSpeaking = true;
        
        // Cancel any ongoing speech immediately
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        try {
            // Use TTS Provider if available, otherwise fallback to browser TTS
            if (this.ttsProvider && this.ttsProvider.currentProvider !== 'browser') {
                // Use high-quality TTS provider
                await this.ttsProvider.speak(text, {
                    rate: this.voiceConfig.rate,
                    pitch: this.voiceConfig.pitch,
                    volume: this.voiceConfig.volume
                });
                
                // Update speaking state
                const avatar = document.querySelector('.rhea-avatar');
                if (avatar) avatar.classList.add('speaking');
                console.log('🔊 RHEA started speaking (TTS Provider)');
                
                // Wait for speech to actually finish before resetting flag
                // Estimate speech duration based on text length (rough estimate: 180 words per minute = 333ms per word average)
                const wordCount = text.split(' ').length;
                const estimatedDuration = Math.max(600, wordCount * 250); // At least 0.6 seconds, 250ms per word
                
                setTimeout(() => {
                    this.isSpeaking = false;
                    this.speechEndTime = Date.now();
                    if (avatar) avatar.classList.remove('speaking');
                    console.log('🔇 RHEA finished speaking - cooldown period started');
                    console.log(`   Cooldown active for ${this.speechCooldown}ms`);
                }, estimatedDuration);
            } else {
                // Fallback to browser TTS
                this.speakBrowser(text);
            }
        } catch (error) {
            console.error('TTS Provider error, falling back to browser TTS:', error);
            this.speakBrowser(text);
        }
    }
    
    speakBrowser(text) {
        if (!window.speechSynthesis) return;
        
        // Use a small delay to ensure cancellation completes
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Use selected high-quality voice
            if (this.voiceConfig.selectedVoice) {
                utterance.voice = this.voiceConfig.selectedVoice;
                utterance.lang = this.voiceConfig.selectedVoice.lang || 'en-US';
            } else {
                // Fallback: try to find a good voice
                const voices = window.speechSynthesis.getVoices();
                const bestVoice = voices.find(v => 
                    v.name.includes('Enhanced') || 
                    v.name.includes('Samantha') ||
                    v.name.includes('Alex')
                ) || voices.find(v => v.lang.startsWith('en'));
                
                if (bestVoice) {
                    utterance.voice = bestVoice;
                    utterance.lang = bestVoice.lang;
                }
            }
            
            // Optimized parameters for human-like speech
            utterance.rate = this.voiceConfig.rate;   // Slightly slower = more natural
            utterance.pitch = this.voiceConfig.pitch;   // Natural pitch
            utterance.volume = this.voiceConfig.volume; // Comfortable volume
            
            // Add natural pauses and emphasis using SSML-like techniques
            // (Some browsers support SSML, but we'll use text manipulation for compatibility)
            let processedText = text;
            
            // Add slight pauses after commas and periods
            processedText = processedText.replace(/,/g, ', ');
            processedText = processedText.replace(/\./g, '. ');
            
            utterance.text = processedText;
            
            utterance.onstart = () => {
                const avatar = document.querySelector('.rhea-avatar');
                if (avatar) avatar.classList.add('speaking');
                console.log('🔊 RHEA started speaking - commands will be ignored');
                console.log('   Voice:', utterance.voice ? utterance.voice.name : 'default');
            };
            
            utterance.onend = () => {
                const avatar = document.querySelector('.rhea-avatar');
                if (avatar) avatar.classList.remove('speaking');
                this.isSpeaking = false;
                this.speechEndTime = Date.now();
                console.log('🔇 RHEA finished speaking - cooldown period started');
            };
            
            utterance.onerror = (e) => {
                console.warn('Speech synthesis error:', e);
                this.isSpeaking = false;
                this.speechEndTime = Date.now();
            };
            
            window.speechSynthesis.speak(utterance);
        }, 100);
    }
    
    // Method to change voice settings
    setVoiceSettings(settings) {
        if (settings.rate !== undefined) this.voiceConfig.rate = Math.max(0.1, Math.min(10, settings.rate));
        if (settings.pitch !== undefined) this.voiceConfig.pitch = Math.max(0, Math.min(2, settings.pitch));
        if (settings.volume !== undefined) this.voiceConfig.volume = Math.max(0, Math.min(1, settings.volume));
        if (settings.voiceName) {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.name.includes(settings.voiceName));
            if (voice) {
                this.voiceConfig.selectedVoice = voice;
                console.log('🎤 Voice changed to:', voice.name);
            }
        }
    }
    
    // Get available voices for selection
    getAvailableVoices() {
        if (!window.speechSynthesis) return [];
        return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    }

    executeQuick(command) {
        console.log('⚡ Quick command:', command);
        // Force reset flag before processing (same as manual input)
        if (this.isProcessingCommand) {
            console.log('⚠️  Flag stuck before quick command - resetting');
            this.isProcessingCommand = false;
        }
        // Process it the same way as voice commands
        this.processCommand(command);
    }

    logCommand(cmd) {
        const log = document.getElementById('command-log');
        if (!log) return;
        
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = '<span class="timestamp">' + time + '</span>' +
                         '<span class="command">"' + cmd + '"</span>' +
                         '<span class="result processing">⏳ Processing</span>';
        
        log.insertBefore(entry, log.firstChild);
        
        while (log.children.length > 50) {
            log.removeChild(log.lastChild);
        }
    }

    logResult(cmd, status) {
        const log = document.getElementById('command-log');
        if (!log || !log.firstElementChild) return;
        
        const resultSpan = log.firstElementChild.querySelector('.result');
        if (resultSpan) {
            if (status === 'success') {
                resultSpan.innerHTML = '✓ Executed';
                resultSpan.className = 'result success';
            } else {
                resultSpan.innerHTML = '✗ Failed';
                resultSpan.className = 'result error';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 ========================================');
    console.log('🚀 INITIALIZING RHEA');
    console.log('🚀 window.dawrv exists:', !!window.dawrv);
    console.log('🚀 window.api exists:', !!window.api);
    console.log('🚀 window.api:', window.api);
    if (window.api) {
        console.log('🚀 window.api.executeReaperAction exists:', !!window.api.executeReaperAction);
        console.log('🚀 window.api.executeReaperAction:', window.api.executeReaperAction);
    }
    console.log('🚀 ========================================');
    
    window.rhea = new RHEAController();
    console.log('✅ RHEA ready!');
    
    // Check again after initialization
    setTimeout(() => {
        console.log('🔍 POST-INIT CHECK (1 second later):');
        console.log('🔍 window.api exists:', !!window.api);
        console.log('🔍 window.api:', window.api);
        if (window.api) {
            console.log('🔍 window.api.executeReaperAction:', window.api.executeReaperAction);
        } else {
            console.error('❌ CRITICAL: window.api does NOT exist!');
            console.error('❌ This means REAPER commands will NOT work!');
        }
    }, 1000);
    
    // Listen for voice commands from Python listener
    if (window.dawrv) {
        window.dawrv.voice.onEngineReady(() => {
            console.log('Voice engine ready');
        });
    }
    
    // Listen for voice commands via IPC - only when listening is active
    if (window.dawrv && window.dawrv.voice) {
        window.dawrv.voice.onCommand((command) => {
            console.log('🎤 Voice command received:', command);
            console.log('   isListening:', window.rhea ? window.rhea.isListening : 'rhea not found');
            // Process command - removed isListening check temporarily for debugging
            if (window.rhea) {
                console.log('✅ Processing voice command');
                window.rhea.processCommand(command);
            } else {
                console.log('❌ RHEA controller not found');
            }
        });
        
        // Listen for REAPER action logs from main process (for debugging)
        if (window.dawrv.voice.onReaperLog) {
            window.dawrv.voice.onReaperLog((message) => {
                console.log('📋 [MAIN PROCESS LOG]:', message);
            });
        }
    }
});
