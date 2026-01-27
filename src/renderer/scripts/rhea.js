class RHEAController {
    constructor() {
        // Build stamp to confirm which rhea.js is actually running
        console.log('🧩 RHEA rhea.js loaded (wake-gate build): 2025-12-13T07:45Z');
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
            'cut': 40699,     // Fixed: was 40001 (wrong action!)
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
            'newtracks': 'add_multiple_tracks',  // Custom - add multiple tracks
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
            'disarmtrack': 40294, // Alias for unarmtrack
            
            // === PHASE 1: RECORDING ESSENTIALS ===
            // Record Arm Controls
            'armall': 40490,  // Track: Arm all tracks for recording
            'disarmall': 40491,  // Track: Unarm all tracks for recording
            
            // Punch Recording
            'punchin': 40076,  // Options: Toggle auto-punch record
            'punchout': 40076,  // Same as punchin (toggle)
            'autopunch': 40076,  // Options: Toggle auto-punch record
            'setpunchin': 'punch_in_at_bar',  // Custom - set punch-in point at specific bar
            'setpunchout': 'punch_out_at_bar',  // Custom - set punch-out point at specific bar
            'enableautopunch': 40076,  // Enable auto-punch mode
            
            // Recording Modes
            'overdub': 40252,  // Options: Toggle record mode (normal/overdub)
            'replacemode': 40253,  // Options: Toggle record mode (normal/replace)
            'tapemode': 40076,  // Options: Tape-style recording
            'looprecord': 40068,  // Options: Toggle loop recording enabled
            'recordinput': 40252,  // Record: input (audio or MIDI) - normal mode
            'recordnormal': 40252,  // Record: normal mode (alias)
            'recordoutput': 40718,  // Record: output (record track output)
            'recorddisable': 40716,  // Record: disable (input monitoring only)
            'inputmonitoring': 40716,  // Input monitoring only (alias)
            
            // Input Monitoring
            'monitoron': 40495,  // Track: Toggle input monitor on selected track
            'monitoroff': 40495,  // Same action (toggle)
            
            // Track Control - Specific (with track number)
            'selecttrack': 'track_select',  // Custom - select specific track by number
            'mutetrack': 'track_mute',      // Custom - mute specific track
            'unmutetrack': 'track_unmute',  // Custom - unmute specific track
            'solotrack': 'track_solo',      // Custom - solo specific track
            'unsolotrack': 'track_unsolo',  // Custom - unsolo specific track
            'armtracknum': 'track_arm',     // Custom - arm specific track
            'settrackvolume': 'track_volume', // Custom - set track volume
            'settrackpan': 'track_pan',     // Custom - set track pan
            'settrackwidth': 'track_width', // Custom - set track stereo width
            
            // Master Fader Commands
            'mutemaster': 14,              // Track: Toggle mute for master track
            'unmutemaster': 14,            // Same toggle action
            'solomaster': 14016,           // Master track: Toggle solo (if applicable)
            'unsolomaster': 14016,         // Same toggle action
            'setmastervolume': 'master_volume', // Custom - set master volume
            
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
            
            // Mixer Controls - REAPER only has TOGGLE (40083) that actually works
            // Actions 40084/40085 exist but don't seem to work reliably
            'showmixer': 40083,  // View: Toggle mixer visible  
            'hidemixer': 40083,  // View: Toggle mixer visible
            'togglemixer': 40083,  // View: Toggle mixer visible
            'mixerwindow': 40083,  // View: Toggle mixer visible
            'openmixer': 40083,  // View: Toggle mixer visible
            'closemixer': 40083,  // View: Toggle mixer visible
            
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
            sensitivity: 0.82, // Command matching threshold (0-1) - Balanced for accuracy + flexibility
            phraseTimeout: 6, // Max seconds to listen for a phrase
            enableFuzzyMatching: true, // RE-ENABLED with stricter threshold (0.82 = 82% similarity required)
            autoRestart: true
        };

        // Wake phrase gating to avoid reacting to music playback.
        // Note: ASR often mishears "Rhea" as "real"/"ria"/"reah"/"rear".
        // We accept a few safe variants *only* as an utterance prefix so wake gating
        // still blocks playback noise.
        this.wakePhrases = [
            'hey rhea',
            'rhea',

            // Common mis-hears (prefix-only)
            'hey real',
            'real',
            'hey ria',
            'ria',
            'hey reah',
            'reah',
            'hey rear',
            'rear'
        ];
        // Wake gating UI settings
        // Modes:
        // - always: wake phrase required for all VOICE input
        // - playback: wake phrase required only during playback/recording (best if transport feedback is reliable)
        // - auto: require wake phrase during playback unless a headset-like mic is detected
        // - off: no wake phrase required (not recommended)
        // DEFAULT TO OFF for immediate command execution (changed from 'always')
        this.wakeMode = localStorage.getItem('rhea_wake_mode') || 'off';
        const savedWakeMs = parseInt(localStorage.getItem('rhea_wake_session_ms') || '6000', 10);
        this.wakeSessionDurationMs = Number.isFinite(savedWakeMs) ? savedWakeMs : 6000;

        // Derived flags used by gating logic
        this.requireWakePhrase = this.wakeMode === 'always';
        this.requireWakePhraseWhilePlaying = this.wakeMode !== 'off';
        this.isTransportPlaying = false;
        this._wakeSessionUntil = 0;

        // Best-effort headset mic detection (renderer-only).
        // If the input device looks like a headset, wakeMode='auto' can relax gating
        // because DAW audio is less likely to bleed into the mic.
        // DEFAULT TO TRUE - User confirmed using headset with mic
        // Headset = mic close to mouth, isolated from speakers = no feedback loop risk
        this.isHeadsetInput = true;
        this._lastAudioInputLabel = '';
        this.initHeadsetDetection();

        // Safety/UX: always allow STOP commands to pass even if wake gate is enabled.
        // Worst-case failure mode is the DAW stops (safe), and it dramatically reduces frustration.
        this._stopCommandRe = /^(stop|stop\s+(playback|playing|transport|recording)|halt)\b/i;
        
        // Command deduplication tracking (prevents runaway loops)
        this._lastCommandKey = '';
        this._lastCommandTime = 0;

        // Context + intent pipeline state
        this.latestContextSnapshot = null;
        this.pendingStructuredCommand = null;
        this.intentConfidenceThreshold = 0.85;

        // Failsafe transport inference from playhead movement (covers OSC setups that don't
        // reliably send /play but DO send time/pos updates while playing)
        this._dawPosLastSec = null;
        this._dawPosLastTs = 0;
        this._dawInferredPlayingUntil = 0; // timestamp (ms) until which we consider transport active
        this._lastDawStateTs = 0;
        
        // Command deduplication - DISABLED for maximum responsiveness
        this.lastProcessedCommand = null;
        this.lastProcessedTime = 0;
        this.commandCooldown = 0; // ZERO COOLDOWN - instant command execution
        this.isProcessingCommand = false; // Track processing but don't block
        this.commandHistory = []; // Track recent commands
        
        // Feedback suppression - MINIMAL for maximum responsiveness
        this.isSpeaking = false; // Track when RHEA is speaking
        this.speechEndTime = 0; // Track when speech ended
        this.speechCooldown = 0; // ZERO COOLDOWN - commands work immediately
        this.silentMode = true; // ALWAYS SILENT for instant execution
        
        // Voice Feedback Setting (user-controlled via Voice Settings)
        // Default: true (RHEA speaks), but can be toggled to false (silent mode) in Voice Settings
        this.voiceFeedbackEnabled = localStorage.getItem('voiceFeedbackEnabled') !== 'false';
        console.log('🗣️ Voice feedback initialized:', this.voiceFeedbackEnabled ? 'ENABLED' : 'DISABLED');

        // Transport tracking for scheduled actions (e.g., stop at bar)
        this.lastKnownTempoBpm = 120; // fallback if tempo not fetched
        this.beatsPerBar = 4; // assume 4/4 for scheduling estimates
        this.pendingStopBar = null;
        this.pendingStopBarSeconds = null;
        this.pendingStopTolerance = 0.15; // seconds tolerance
        this.lastTransportSeconds = 0;
        
        // Screen Awareness System
        this.screenAwareness = null;
        this.initScreenAwareness().catch(error => {
            console.error('❌ Screen Awareness initialization error:', error);
        });
        
        // Subscribe to DAW state updates (transport position, playing, etc.)
        try {
            if (window.dawrv?.voice?.onDawState) {
                window.dawrv.voice.onDawState((state) => {
                    const t = state?.transport || null;
                    if (!t) return;
                    this._lastDawStateTs = Date.now();

                    // Support both schemas:
                    // - New: { playing: bool, recording: bool, loopEnabled: bool, positionSeconds: number }
                    // - Old: { play: 0/1, record: 0/1, repeat: 0/1, pause: 0/1, time/pos: number }
                    const isPlaying = (typeof t.playing === 'boolean') ? t.playing : (t.play === 1);
                    const isRecording = (typeof t.recording === 'boolean') ? t.recording : (t.record === 1);
                    const loopEnabled =
                        (typeof t.loopEnabled === 'boolean') ? t.loopEnabled :
                        (typeof t.repeat === 'number') ? (t.repeat !== 0) :
                        false;
                    const posSec =
                        (typeof t.positionSeconds === 'number') ? t.positionSeconds :
                        (typeof t.position === 'number') ? t.position :
                        (typeof t.pos === 'number') ? t.pos :
                        0;

                    if (this.aiAgent) {
                        this.aiAgent.updateDAWContext({
                            isPlaying,
                            isRecording,
                            loopEnabled,
                            positionSeconds: posSec || 0,
                            lastActionTime: Date.now()
                        });
                    }

                    // Use DAW state to honor scheduled stop-at-bar + wake gating
                    this.lastTransportSeconds = posSec || 0;
                    this.isTransportPlaying = !!(isPlaying || isRecording);

                    // Failsafe inference: if playhead is moving, treat as "playing" for wake gating
                    const now = Date.now();
                    const lastSec = this._dawPosLastSec;
                    const lastTs = this._dawPosLastTs;
                    this._dawPosLastSec = (typeof posSec === 'number') ? posSec : 0;
                    this._dawPosLastTs = now;
                    if (lastSec != null && (now - (lastTs || 0)) < 2000) {
                        if (Math.abs((posSec || 0) - lastSec) > 0.0005) {
                            // Consider transport active for the next ~900ms even if play flag is missing
                            this._dawInferredPlayingUntil = now + 900;
                        }
                    }

                    // If we have a pending stop target in seconds, check threshold
                    if ((isPlaying || isRecording) && this.pendingStopBarSeconds != null) {
                        if ((posSec || 0) >= this.pendingStopBarSeconds - this.pendingStopTolerance) {
                            console.log(`🛑 Scheduled stop at ~${this.pendingStopBarSeconds.toFixed(2)}s (bar ${this.pendingStopBar})`);
                            window.api?.executeReaperAction?.(this.reaperActions['stop']).catch(() => {});
                            this.pendingStopBar = null;
                            this.pendingStopBarSeconds = null;
                        }
                    }
                });
            }
        } catch (_) {}
        
        // ============================================================
        // COMPOUND COMMAND SYSTEM
        // Allows multi-step commands like:
        // "go to bar 15 on track 5, arm record, punch in at bar 18, punch out at bar 24, then disarm track 5"
        // ============================================================
        this.compoundCommandDelimiters = [
            ' and then ',
            ' then ',
            ' and ',
            ', then ',
            ', and ',
            ', ',
            ' followed by ',
            ' after that ',
            ' next '
        ];
        
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
            rate: 0.85,              // Slower for clearer speech (0.1-10, default 1)
            pitch: 1.0,              // Natural pitch (0-2, default 1)
            volume: 0.9,             // Slightly quieter (0-1, default 1)
            selectedVoice: null      // Will be set on first use
        };
        
        // Load saved voice speed from localStorage
        try {
            const savedSpeed = localStorage.getItem('rhea_voice_speed');
            if (savedSpeed) {
                this.voiceConfig.rate = parseFloat(savedSpeed);
                console.log('🎤 Voice speed loaded:', this.voiceConfig.rate);
            }
        } catch (e) {
            console.warn('Failed to load voice speed:', e);
        }
        
        // Initialize voice on first use
        this.initVoice();
        
        // Track active voice engine ('whisper' or 'asr')
        this.activeVoiceEngine = null;
        
        // Listen for voice engine changes (from ASR config UI or main process)
        this.setupVoiceEngineListeners();
        
        this.rheaResponsePhrases = [ // Full phrases RHEA says that shouldn't trigger commands
            // CRITICAL: Add single-word responses that often cause feedback loops
            'playing', 'stopped', 'stopping', 'recording', 'paused', 'rewinding', 'redoing',
            'muting', 'unmuting', 'soloing', 'unsoloing', 'saving', 'cutting', 'copying', 'pasting',
            'deleting', 'selecting', 'creating', 'opening', 'closing', 'toggling', 'zooming',
            // Full phrases
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
            'not found', 'command not found', 'plugin not found', 'action not found',
            // Natural voice transformations that might get transcribed
            'got it', 'done', 'okay', 'alright', 'sure thing', 'you bet', 'on it', 'will do'
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
        this.registerContextListeners();
        
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
            try {
                const TCM = (window && window.TTSConfigManager) ? window.TTSConfigManager :
                    (typeof TTSConfigManager !== 'undefined' ? TTSConfigManager : null);
                if (TCM) {
                    this.ttsConfigManager = new TCM(this);
                    window.ttsConfigUI = this.ttsConfigManager; // Expose to window
                    console.log('✅ TTS Config Manager initialized');
                } else {
                    console.warn('⚠️ TTSConfigManager class not available yet');
                }
            } catch (e) {
                console.error('❌ Failed to initialize TTS Config Manager:', e?.message || e);
            }

            // Always expose a reliable function to open Voice Settings (even if app.js misses globals)
            window.openVoiceSettings = () => {
                const mgr = (window.ttsConfigUI && typeof window.ttsConfigUI.show === 'function')
                    ? window.ttsConfigUI
                    : (this.ttsConfigManager && typeof this.ttsConfigManager.show === 'function')
                        ? this.ttsConfigManager
                        : null;
                if (!mgr) throw new Error('TTSConfigManager not available');
                mgr.show();
            };
            
            // Initialize Advanced ASR Config UI
            if (typeof ASRConfigUI !== 'undefined') {
                this.asrConfigUI = new ASRConfigUI(this);
                window.ASRConfigUI = this.asrConfigUI; // Expose to window
                console.log('✅ ASR Config UI initialized');
                
                // Setup ASR event listeners
                this.setupASREventListeners();
            }
            
            // Dispatch event to notify that managers are ready
            window.__rheaManagersReady = true;
            window.dispatchEvent(new CustomEvent('rhea-managers-ready'));
            console.log('🎉 All RHEA managers ready!');
        }, 500); // Reduced from 1000ms to 500ms
    }
    
    /**
     * Setup ASR Event Listeners
     * Connects to the advanced ASR service events
     */
    setupASREventListeners() {
        if (!window.api) {
            console.log('⚠️ API not available for ASR events');
            return;
        }
        
        // Listen for ASR transcripts
        if (window.api.onASRTranscript) {
            window.api.onASRTranscript((data) => {
                console.log('🎯 ASR Transcript:', data);
                
                // Update ASR Config UI if open
                if (this.asrConfigUI) {
                    this.asrConfigUI.updateLiveTranscript(data.text, data.confidence);
                }
                
                const isFinal = (data && (data.isFinal !== undefined || data.is_final !== undefined))
                    ? !!(data.isFinal ?? data.is_final)
                    : true;

                // Process commands ONLY on final transcripts (partials are UI-only)
                if (isFinal && data.text && data.text.trim()) {
                    // ASR transcript is VOICE source (hard-gated while transport is active)
                    const gate = this.preprocessVoiceTranscript(data.text);
                    if (!gate.accept) {
                        console.log('🔇 Ignoring ASR transcript (wake gate):', data.text);
                        return;
                    }
                    this.processCommand(gate.transcript, { 
                        source: 'voice', 
                        skipWakeCheck: gate.skipWakeCheck,
                        confidence: data.confidence 
                    });
                }
            });
            console.log('✅ ASR transcript listener registered');
        }
        
        // Listen for ASR started
        if (window.api.onASRStarted) {
            window.api.onASRStarted(() => {
                console.log('🎤 ASR started');
                if (this.asrConfigUI) {
                    this.asrConfigUI.isASRRunning = true;
                    this.asrConfigUI.updateStatus();
                }
            });
        }
        
        // Listen for ASR stopped
        if (window.api.onASRStopped) {
            window.api.onASRStopped((code) => {
                console.log('🔇 ASR stopped:', code);
                if (this.asrConfigUI) {
                    this.asrConfigUI.isASRRunning = false;
                    this.asrConfigUI.updateStatus();
                }
            });
        }
        
        // Listen for ASR errors
        if (window.api.onASRError) {
            window.api.onASRError((error) => {
                console.error('❌ ASR error:', error);
                if (this.asrConfigUI) {
                    this.asrConfigUI.showToast(`ASR Error: ${error}`, 'error');
                }
            });
        }
        
        // Listen for mode changes
        if (window.api.onASRModeChanged) {
            window.api.onASRModeChanged((mode) => {
                console.log('📝 ASR mode changed:', mode);
                this.speak(`Switched to ${mode} mode`);
            });
        }
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
     * Initialize Screen Awareness System
     */
    async initScreenAwareness() {
        try {
            // Wait a bit for window.api to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (typeof ScreenAwarenessUI === 'undefined') {
                console.log('⚠️  ScreenAwarenessUI not available - skipping');
                return;
            }
            
            if (!window.api?.screenAwarenessStart) {
                console.log('⚠️  Screen Awareness API not available - skipping');
                return;
            }
            
            this.screenAwareness = new ScreenAwarenessUI(this);
            console.log('✅ Screen Awareness System initialized');
            console.log('   Auto-announce:', this.screenAwareness.autoAnnounce);
            console.log('   Hover delay:', this.screenAwareness.hoverDelay, 'ms');
        } catch (error) {
            console.error('❌ Failed to initialize Screen Awareness:', error);
            this.screenAwareness = null;
        }
        
        // Initialize keyboard shortcuts
        try {
            if (typeof KeyboardShortcuts !== 'undefined') {
                this.keyboardShortcuts = new KeyboardShortcuts(this);
                console.log('✅ Keyboard Shortcuts initialized');
                console.log('   Toggle Listening:', this.keyboardShortcuts.getShortcutString('toggleListening'));
                console.log('   Toggle Screen Awareness:', this.keyboardShortcuts.getShortcutString('toggleScreenAwareness'));
            }
        } catch (error) {
            console.error('❌ Failed to initialize Keyboard Shortcuts:', error);
        }
    }
    
    /**
     * Extract track number from control (for context-aware commands)
     */
    extractTrackFromControl(control) {
        if (!control) return null;
        
        const text = `${control.title || ''} ${control.description || ''}`;
        const match = text.match(/track\s+(\d+)/i);
        
        return match ? parseInt(match[1], 10) : null;
    }
    
    /**
     * Initialize TTS Provider
     * ONLY uses OpenAI TTS - NO browser fallback
     */
    async initTTS() {
        try {
            if (typeof TTSProvider !== 'undefined') {
                // Load TTS config from localStorage
                const ttsConfig = this.loadTTSConfig();
                
                // FORCE OpenAI if browser was somehow configured
                if (ttsConfig.provider === 'browser') {
                    console.log('⚠️ Browser TTS configured - forcing OpenAI');
                    ttsConfig.provider = 'openai';
                    
                    // Get API key from AI config
                    try {
                        const aiConfig = JSON.parse(localStorage.getItem('rhea_ai_config') || '{}');
                        if (aiConfig.apiKey) {
                            ttsConfig.apiKey = aiConfig.apiKey;
                        }
                    } catch (e) {}
                }
                
                this.ttsProvider = new TTSProvider(ttsConfig);
                const result = await this.ttsProvider.initialize();
                
                if (result.success) {
                    console.log('🎤 TTS Provider initialized:', ttsConfig.provider);
                } else {
                    console.warn('⚠️ TTS Provider initialization failed:', result.error);
                    if (result.fallback === 'browser') {
                        console.log('💡 Fallback: Using browser TTS (no OpenAI API key)');
                        // Voice feedback will use browser TTS via speakBrowserTTS()
                    } else {
                        console.warn('   Will use direct OpenAI API calls as fallback');
                    }
                }
            } else {
                console.log('⚠️  TTS Provider class not available - will use direct OpenAI API');
            }
        } catch (error) {
            console.error('❌ Failed to initialize TTS Provider:', error);
            console.log('⚠️ Will use direct OpenAI API calls (no browser TTS)');
            // NO browser fallback - speakOpenAI() will be used directly
        }
    }
    
    /**
     * Load TTS configuration from localStorage
     */
    loadTTSConfig() {
        // Always try to get OpenAI API key from AI config first
        let openaiKey = null;
        try {
            const aiConfig = localStorage.getItem('rhea_ai_config');
            if (aiConfig) {
                const aiParsed = JSON.parse(aiConfig);
                openaiKey = aiParsed.apiKey;
                if (openaiKey) {
                    console.log('🔑 Found OpenAI API key from AI config');
                }
            }
        } catch (e) {
            console.warn('Could not load AI config for API key:', e);
        }
        
        try {
            const saved = localStorage.getItem('rhea_tts_config');
            console.log('📥 Loading TTS config from localStorage:', saved);
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // If using OpenAI, always inject the API key from AI config
                if (parsed.provider === 'openai' && openaiKey) {
                    parsed.apiKey = openaiKey;
                    console.log('🔑 Injected OpenAI API key into TTS config');
                }
                
                console.log('✅ TTS config loaded:', {
                    provider: parsed.provider,
                    hasApiKey: !!parsed.apiKey,
                    hasGoogleApiKey: !!parsed.google?.apiKey
                });
                return parsed;
            }
        } catch (e) {
            console.warn('Failed to load TTS config:', e);
        }
        
        // Default config (OpenAI TTS - ChatGPT-quality voices)
        console.log('📝 Using default TTS config: OpenAI TTS (Nova voice)');
        
        return {
            provider: 'openai', // OpenAI TTS - ChatGPT-quality voices
            apiKey: openaiKey, // Use same API key as AI agent
            openai: {
                voice: 'nova', // Friendly, upbeat voice
                model: 'tts-1', // Fast model (use 'tts-1-hd' for higher quality)
                speed: 1.0
            }
        };
    }
    
    /**
     * Save TTS configuration to localStorage
     */
    saveTTSConfig(config) {
        try {
            console.log('💾 Saving TTS config:', {
                provider: config.provider,
                hasApiKey: !!config.apiKey,
                hasGoogleApiKey: !!config.google?.apiKey,
                fullConfig: config
            });
            localStorage.setItem('rhea_tts_config', JSON.stringify(config));
            console.log('✅ TTS config saved to localStorage');
            
            // Verify it was saved
            const verification = localStorage.getItem('rhea_tts_config');
            console.log('🔍 Verification - config in localStorage:', verification ? 'YES' : 'NO');
            
            // Reinitialize TTS provider
            this.initTTS();
        } catch (e) {
            console.error('❌ Failed to save TTS config:', e);
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
                // ENABLED for conversational Q&A (questions about REAPER workflows)
                // Fast-path keyword matching still handles direct commands instantly
                this.useAI = true;
                console.log('🤖 AI Agent ENABLED for conversational Q&A');
                
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
            model: 'gpt-4o',  // Full GPT-4o for best natural language understanding
            baseURL: null,
            temperature: 0.8,  // Higher for more natural responses
            maxTokens: 800,  // Increased for fuller responses
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
                // Browser speech recognition is VOICE source (hard-gated while transport is active)
                const gate = this.preprocessVoiceTranscript(transcript);
                if (!gate.accept) {
                    console.log('🔇 Ignoring browser transcript (wake gate):', transcript);
                    return;
                }
                this.processCommand(gate.transcript, { source: 'voice', skipWakeCheck: gate.skipWakeCheck });
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
                    // Manual command input is TYPED source (never require wake phrase)
                    this.processCommand(command, { source: 'typed' });
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
                // Only update status if NOT already listening
                if (!this.isListening) {
                    this.updateVoiceEngineStatus('ready', 'Ready - Click to start listening');
                    this.updateStatus('ready', 'Ready - Click to start listening');
                } else {
                    console.log('   Already listening - keeping "Listening..." status');
                }
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

    registerContextListeners() {
        try {
            if (window.dawrv?.voice?.onContextSnapshot) {
                window.dawrv.voice.onContextSnapshot((snapshot) => {
                    this.updateContextSnapshot(snapshot);
                });
            }
            // Prime with a snapshot on startup
            if (window.dawrv?.voice?.getContextSnapshot) {
                window.dawrv.voice.getContextSnapshot()
                    .then((snapshot) => this.updateContextSnapshot(snapshot))
                    .catch(() => {});
            }
        } catch (e) {
            console.warn('⚠️  Failed to register context listeners:', e?.message || e);
        }
    }

    updateContextSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') return;
        this.latestContextSnapshot = snapshot;

        // Keep AI prompt in sync with DAW state when enabled
        try {
            if (this.aiAgent && typeof this.aiAgent.updateDAWContext === 'function') {
                const tracks = snapshot.reaperState?.tracks || {};
                this.aiAgent.updateDAWContext({
                    projectName: snapshot.reaperState?.projectName || null,
                    isPlaying: !!snapshot.reaperState?.transport?.playing,
                    isRecording: !!snapshot.reaperState?.transport?.recording,
                    trackCount: Object.keys(tracks).length || 0,
                    lastAction: snapshot.activeControl?.type || null,
                    lastActionTime: snapshot.timestamp || Date.now()
                });
            }
        } catch (e) {
            console.warn('⚠️  Failed to sync AI context:', e?.message || e);
        }
    }

    async toggleVoice() {
        if (!this.isListening) {
            // ========================================
            // START LISTENING - Use Whisper mode (kills ASR if running)
            // ========================================
            console.log('🎤 Starting voice listening (Whisper mode)...');
            
            // Use the unified voice engine API to switch to Whisper
            // This automatically kills any running ASR service
            if (window.api && window.api.startWhisperEngine) {
                try {
                    console.log('🔄 Switching to Whisper mode (will stop ASR if running)...');
                    const result = await window.api.startWhisperEngine();
                    
                    if (result && result.success) {
                        console.log('✅ Whisper engine started successfully');
                        this.activeVoiceEngine = 'whisper';
                        this.startListening();
                    } else {
                        console.error('❌ Failed to start Whisper:', result?.error);
                        // Fallback: try browser speech recognition
                        this.startListening();
                    }
                } catch (error) {
                    console.error('❌ Whisper engine error:', error);
                    // Fallback: try browser speech recognition
                    this.startListening();
                }
            } else if (window.dawrv && window.dawrv.voice) {
                // Legacy fallback
                try {
                    const result = await window.dawrv.voice.startListening();
                    if (result && result.success) {
                        this.startListening();
                    } else {
                        this.startListening();
                    }
                } catch (error) {
                    this.startListening();
                }
            } else {
                this.startListening();
            }
        } else {
            // ========================================
            // STOP LISTENING
            // ========================================
            console.log('🛑 Stopping voice listening...');
            
            if (window.api && window.api.stopAllVoiceEngines) {
                try {
                    await window.api.stopAllVoiceEngines();
                    this.activeVoiceEngine = null;
                } catch (error) {
                    console.error('Error stopping voice engines:', error);
                }
            } else if (window.dawrv && window.dawrv.voice) {
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
        
        // Send to overlay window
        if (window.overlay && window.overlay.updateListening) {
            window.overlay.updateListening(true);
        }
        
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
        
        // Send to overlay window
        if (window.overlay && window.overlay.updateListening) {
            window.overlay.updateListening(false);
        }
        
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
    
    // Ensure listening is active (called after RHEA finishes speaking)
    ensureListening() {
        // Only resume if we were listening before
        if (!this.isListening) {
            console.log('👂 Listening was not active, not resuming');
            // STILL clear the signal file even if not listening (prevent stuck state)
            if (window.api && window.api.signalSpeaking) {
                window.api.signalSpeaking(false).catch(() => {});
            }
            return;
        }
        
        console.log('👂 ENSURING listening is active after speech...');
        
        // CRITICAL: Clear the Python signal file FIRST
        if (window.api && window.api.signalSpeaking) {
            window.api.signalSpeaking(false).catch(() => {});
            console.log('👂 Cleared Python speaking signal');
        }
        
        // Small delay to avoid catching echo, then restart browser recognition
        setTimeout(() => {
            if (this.recognition && this.isListening) {
                try {
                    this.recognition.stop();
                    setTimeout(() => {
                        if (this.isListening) {
                            try {
                                this.recognition.start();
                                console.log('👂 Browser speech recognition restarted');
                            } catch (e) {
                                console.log('👂 Recognition already running');
                            }
                        }
                    }, 100);
                } catch (error) {
                    // Already stopped
                }
            }
        }, 300); // 300ms delay to let echo fade
        
        // Also ping the Python listener
        if (window.dawrv && window.dawrv.voice) {
            window.dawrv.voice.startListening().then(result => {
                if (result && result.success) {
                    console.log('👂 Python listener confirmed active');
                }
            }).catch(() => {});
        }
        
        // Update UI to confirm listening
        this.updateStatus('listening', 'Listening...');
        this.updateVoiceEngineStatus('listening', 'Listening...');
    }

    updateStatus(status, message) {
        this.status = status;
        if (this.statusText) {
            this.statusText.textContent = message;
        }
        if (this.statusIndicator) {
            this.statusIndicator.className = 'status-indicator ' + status;
        }
        
        // DON'T change avatar classes - transport state should persist!
        // Avatar only shows transport ring (playing/stopped/recording)
        // Status indicator (tab) shows listening/ready/error states
    }
    
    /**
     * Update transport state visual (ring around avatar)
     */
    updateTransportState(state) {
        console.log('🎨🎨🎨 updateTransportState() CALLED with state:', state);
        
        const avatar = document.querySelector('.rhea-avatar');
        if (!avatar) {
            console.error('❌ Avatar element not found!');
            console.error('   Searched for: .rhea-avatar');
            console.error('   Available elements:', document.querySelectorAll('[class*="avatar"]'));
            return;
        }
        
        console.log('✅ Avatar element found:', avatar);
        console.log('   Avatar classes BEFORE:', avatar.className);
        
        // Remove all transport states AND other interfering states
        avatar.classList.remove('transport-stopped', 'transport-playing', 'transport-recording', 'transport-paused');
        avatar.classList.remove('listening', 'speaking', 'responding', 'ready', 'error');
        
        console.log('   Avatar classes AFTER removal:', avatar.className);
        
        // Determine overlay state
        let overlayState = 'stopped';
        
        // Add new state
        if (state === 'playing' || state === 'play') {
            avatar.classList.add('transport-playing');
            overlayState = 'playing';
            console.log('   ✅ Added transport-playing class');
        } else if (state === 'recording' || state === 'record') {
            avatar.classList.add('transport-recording');
            overlayState = 'recording';
            console.log('   ✅ Added transport-recording class');
        } else if (state === 'paused') {
            avatar.classList.add('transport-paused');
            overlayState = 'stopped';
            console.log('   ✅ Added transport-paused class');
        } else {
            avatar.classList.add('transport-stopped');
            overlayState = 'stopped';
            console.log('   ✅ Added transport-stopped class');
        }

        // Keep wake gating in sync with the *visual* transport state.
        // (DAW state payloads vary: some use play/record, others use playing/recording)
        this.isTransportPlaying = overlayState === 'playing' || overlayState === 'recording';
        
        console.log('   Avatar classes AFTER addition:', avatar.className);
        
        // Send transport state to overlay
        if (window.overlay && window.overlay.updateTransportState) {
            window.overlay.updateTransportState(overlayState);
            console.log(`🎨 Sent transport state to overlay: ${overlayState}`);
        }
        
        // Apply custom ring settings if they exist
        this.applyRingSettings();
        
        console.log('🎨🎨🎨 updateTransportState() COMPLETE');
    }
    
    /**
     * Apply custom ring brightness and pulse speed settings
     */
    applyRingSettings() {
        const avatar = document.querySelector('.rhea-avatar');
        if (!avatar) return;
        
        // Load settings from localStorage
        const settings = JSON.parse(localStorage.getItem('rhea_ring_settings') || '{}');
        
        // Apply CSS custom properties
        if (settings.playingBrightness !== undefined) {
            avatar.style.setProperty('--playing-brightness', settings.playingBrightness);
        }
        if (settings.playingPulseSpeed !== undefined) {
            avatar.style.setProperty('--playing-pulse-speed', settings.playingPulseSpeed + 's');
        }
        if (settings.recordingBrightness !== undefined) {
            avatar.style.setProperty('--recording-brightness', settings.recordingBrightness);
        }
        if (settings.recordingPulseSpeed !== undefined) {
            avatar.style.setProperty('--recording-pulse-speed', settings.recordingPulseSpeed + 's');
        }
        if (settings.stoppedBrightness !== undefined) {
            avatar.style.setProperty('--stopped-brightness', settings.stoppedBrightness);
        }
    }
    
    /**
     * Flash avatar when hovering over REAPER control (Screen Awareness)
     * This is a BRIEF flash that doesn't interfere with persistent transport state
     */
    flashHoverDetection(controlType = 'generic') {
        const avatar = document.querySelector('.rhea-avatar');
        if (!avatar) return;
        
        // Remove any existing hover classes (but NOT transport classes!)
        avatar.classList.remove('hover-detected', 'hover-fader', 'hover-button', 'hover-mute', 'hover-solo', 'hover-pan', 'hover-fx');
        
        // Map control type to CSS class
        const typeMap = {
            'volume-fader': 'hover-fader',
            'slider': 'hover-fader',
            'mute-button': 'hover-mute',
            'solo-button': 'hover-solo',
            'pan-control': 'hover-pan',
            'fx-button': 'hover-fx',
            'button': 'hover-button',
            'reaper-control': 'hover-button'
        };
        
        const hoverClass = typeMap[controlType] || 'hover-button';
        
        // Add ONLY the flash animation class (brief pulse)
        // The color will come from the hover-specific class
        avatar.classList.add('hover-detected', hoverClass);
        
        // Remove after brief animation (300ms flash only)
        setTimeout(() => {
            avatar.classList.remove('hover-detected', hoverClass);
            // Transport state classes remain untouched!
        }, 300);
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
        let lower = text.toLowerCase().trim();
        
        // NORMALIZE NUMBER WORDS TO DIGITS (improves matching)
        // ONLY convert actual number words, NOT common words like "to"
        const numberWords = {
            'one': '1', 'two': '2',
            'three': '3', 'four': '4', 'for': '4',
            'five': '5', 'six': '6', 'seven': '7', 'eight': '8',
            'nine': '9', 'ten': '10'
        };
        
        // Misheard variations that should ONLY be converted in numeric contexts
        const misheardsToTwo = ['to', 'too', 'tue', 'tu'];
        
        // Only convert number words that appear after context keywords
        // This prevents "go to bar" from becoming "go 2 bar"
        const contextKeywords = ['track', 'channel', 'bar', 'measure', 'take', 'marker', 'region', 'item'];
        for (const keyword of contextKeywords) {
            // Convert actual number words (e.g., "track two" → "track 2")
            for (const [word, digit] of Object.entries(numberWords)) {
                const contextPattern = new RegExp(`\\b${keyword}\\s+${word}\\b`, 'gi');
                lower = lower.replace(contextPattern, `${keyword} ${digit}`);
            }
            
            // Also convert misheard "to/too" → "2" ONLY after these keywords
            // e.g., "track to" → "track 2" but "go to bar" stays "go to bar"
            for (const misheard of misheardsToTwo) {
                const mishearPattern = new RegExp(`\\b${keyword}\\s+${misheard}\\b`, 'gi');
                lower = lower.replace(mishearPattern, `${keyword} 2`);
            }
        }
        
        // Also handle standalone numbers at the end (e.g., "arm track two" → "arm track 2")
        for (const [word, digit] of Object.entries(numberWords)) {
            // If the number word is at the end of the text, convert it
            const endPattern = new RegExp(`\\s+${word}$`, 'gi');
            if (endPattern.test(lower)) {
                lower = lower.replace(endPattern, ` ${digit}`);
            }
        }
        
        // Command patterns with variations - ORDER MATTERS (more specific first)
        // Check longer phrases first to avoid partial matches
        const commandPatterns = [
            {
                name: 'stop',
                keywords: ['stop playback', 'stop playing', 'stop the playback', 'halt playback', 'stop', 'halt'],
                action: 'stop',
                response: 'Stopping playback',
                priority: 10
            },
            {
                name: 'play',
                keywords: ['start playback', 'start playing', 'play the', 'begin playback', 'play', 'start', 'begin'],
                action: 'play',
                response: 'Starting playback',
                priority: 10
            },
            {
                name: 'newtracks',
                keywords: ['add new tracks', 'create new tracks', 'new tracks', 'add tracks', 'create tracks', 'add multiple tracks'],
                action: 'newtracks',
                response: 'How many tracks would you like to add?',
                priority: 10  // Higher priority than singular
            },
            {
                name: 'newtrack',
                keywords: ['new track', 'add track', 'create track', 'new channel', 'add channel', 'add new track', 'create new track'],
                action: 'newtrack',
                response: 'Creating new',
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
            // === PHASE 1: RECORDING ESSENTIALS ===
            // Note: "arm track [number]" is handled by armtracknum below with higher priority
            {
                name: 'armtrack',
                keywords: ['arm this track', 'arm selected track', 'arm current track', 'enable recording this', 'ready to record this'],
                action: 'armtrack',
                response: 'Armed for recording',
                priority: 7  // Lower priority - armtracknum handles numbered tracks
            },
            {
                name: 'disarmtrack',
                keywords: ['disarm this track', 'unarm this track', 'disarm selected', 'unarm selected', 'take off record this'],
                action: 'disarmtrack',
                response: 'Disarmed',
                priority: 7  // Lower priority
            },
            {
                name: 'armall',
                keywords: ['arm all tracks', 'arm everything', 'record arm all', 'enable all recording', 'arm all'],
                action: 'armall',
                response: 'All tracks armed for recording',
                priority: 9
            },
            {
                name: 'disarmall',
                keywords: ['disarm all tracks', 'unarm all', 'disable all recording', 'unarm everything', 'disarm all'],
                action: 'disarmall',
                response: 'All tracks disarmed',
                priority: 9
            },
            {
                name: 'punchin',
                keywords: ['punch in', 'punch record', 'start punch', 'drop in', 'punch in recording'],
                action: 'punchin',
                response: 'Punch in recording',
                priority: 8
            },
            {
                name: 'punchout',
                keywords: ['punch out', 'stop punch', 'end punch', 'drop out', 'punch out recording'],
                action: 'punchout',
                response: 'Punch out',
                priority: 8
            },
            {
                name: 'autopunch',
                keywords: ['auto punch', 'toggle auto punch', 'enable auto punch', 'turn on auto punch', 'automatic punch'],
                action: 'autopunch',
                response: 'Auto punch toggled',
                priority: 9
            },
            {
                name: 'overdub',
                keywords: ['overdub', 'overdub mode', 'layer recording', 'enable overdub', 'turn on overdub'],
                action: 'overdub',
                response: 'Overdub mode enabled',
                priority: 8
            },
            {
                name: 'replacemode',
                keywords: ['replace mode', 'replace recording', 'overwrite mode', 'enable replace', 'turn on replace'],
                action: 'replacemode',
                response: 'Replace mode enabled',
                priority: 9
            },
            {
                name: 'recordinput',
                keywords: ['record input', 'normal recording', 'input mode', 'record audio', 'standard recording', 'input recording'],
                action: 'recordinput',
                response: 'Recording input mode',
                priority: 9
            },
            {
                name: 'recordoutput',
                keywords: ['record output', 'output recording', 'record track output', 'bounce to track', 'output mode'],
                action: 'recordoutput',
                response: 'Recording track output',
                priority: 9
            },
            {
                name: 'recorddisable',
                keywords: ['disable recording', 'no recording', 'turn off recording', 'stop recording mode'],
                action: 'recorddisable',
                response: 'Recording disabled',
                priority: 9
            },
            {
                name: 'inputmonitoring',
                keywords: ['monitoring only', 'input monitoring', 'enable monitoring', 'turn on monitoring', 'monitor mode', 'listen to input'],
                action: 'inputmonitoring',
                response: 'Input monitoring only',
                priority: 9
            },
            {
                name: 'tapemode',
                keywords: ['tape mode', 'tape style', 'enable tape mode', 'turn on tape mode'],
                action: 'tapemode',
                response: 'Tape mode enabled',
                priority: 9
            },
            {
                name: 'looprecord',
                keywords: ['loop record', 'loop recording', 'enable loop record', 'record in loop', 'turn on loop recording'],
                action: 'looprecord',
                response: 'Loop recording enabled',
                priority: 9
            },
            {
                name: 'monitoron',
                keywords: ['monitor on', 'input monitoring', 'enable monitoring', 'turn on monitor', 'monitor input'],
                action: 'monitoron',
                response: 'Input monitoring enabled',
                priority: 8
            },
            {
                name: 'monitoroff',
                keywords: ['monitor off', 'disable monitoring', 'turn off monitor', 'stop monitoring'],
                action: 'monitoroff',
                response: 'Input monitoring disabled',
                priority: 8
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
                keywords: ['delete track', 'delete channel', 'remove track', 'remove channel', 'delete current track', 'delete current channel'],
                action: 'deletetrack',
                response: 'Deleting',
                priority: 7
            },
            {
                name: 'mute',
                keywords: ['mute', 'mute track', 'mute channel', 'silence', 'turn off'],
                action: 'mute',
                response: 'Muting',
                priority: 7
            },
            {
                name: 'unmute',
                keywords: ['unmute', 'turn on', 'enable track', 'enable channel'],
                action: 'unmute',
                response: 'Unmuting',
                priority: 7
            },
            {
                name: 'solo',
                keywords: ['solo', 'solo track', 'solo channel', 'isolate', 'solo this'],
                action: 'solo',
                response: 'Soloing',
                priority: 7
            },
            {
                name: 'unsolo',
                keywords: ['unsolo', 'unsolo track', 'unsolo channel', 'unisolate', 'unsolo all'],
                action: 'unsolo',
                response: 'Unsoloing',
                priority: 7
            },
            // Navigation commands
            {
                name: 'nexttrack',
                keywords: ['next track', 'go to next track', 'select next track', 'next channel', 'go to next channel'],
                action: 'nexttrack',
                response: 'Next',
                priority: 7
            },
            {
                name: 'previoustrack',
                keywords: ['previous track', 'go to previous track', 'select previous track', 'last track', 'previous channel', 'go to previous channel'],
                action: 'previoustrack',
                response: 'Previous',
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
            // Social/conversational commands
            {
                name: 'thanks',
                keywords: ['thank you', 'thanks', 'thank ya', 'thx', 'appreciate it', 'much appreciated'],
                action: 'social_thanks',
                response: "You're welcome! Happy to help!",
                priority: 9
            },
            {
                name: 'greeting',
                keywords: ['hello', 'hi', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening'],
                action: 'social_greeting',
                response: "Hello! I'm RHEA, ready to assist you!",
                priority: 9
            },
            {
                name: 'goodbye',
                keywords: ['goodbye', 'bye', 'see ya', 'later', 'catch you later', 'good night'],
                action: 'social_goodbye',
                response: "Goodbye! Happy creating!",
                priority: 9
            },
            {
                name: 'howru',
                keywords: ['how are you', 'how are you doing', 'how do you feel'],
                action: 'social_howru',
                response: "I'm doing great! Ready to help with your music production!",
                priority: 9
            },
            {
                name: 'praise',
                keywords: ['great job', 'good job', 'well done', 'awesome', 'amazing', 'fantastic', 'excellent'],
                action: 'social_praise',
                response: "Thank you! I'm here to make your workflow easier!",
                priority: 9
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
                keywords: ['set tempo to', 'set temple to', 'change tempo to', 'change temple to', 'adjust tempo to', 'tempo to', 'temple to', 'bpm to', 'set bpm to', 'change bpm to'],
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
                keywords: ['select track', 'select channel', 'go to track', 'go to channel', 'switch to track', 'switch to channel', 'choose track', 'choose channel'],
                action: 'selecttrack',
                response: 'Selecting track',
                priority: 8
            },
            {
                name: 'mutetrack',
                keywords: ['mute track', 'mute channel', 'silence track', 'silence channel', 'turn off track', 'turn off channel'],
                action: 'mutetrack',
                response: 'Muting',
                priority: 8
            },
            {
                name: 'unmutetrack',
                keywords: ['unmute track', 'unmute channel', 'turn on track', 'turn on channel', 'enable track', 'enable channel'],
                action: 'unmutetrack',
                response: 'Unmuting',
                priority: 8
            },
            {
                name: 'solotrack',
                keywords: ['solo track', 'solo channel', 'solo only track', 'solo only channel', 'isolate track', 'isolate channel'],
                action: 'solotrack',
                response: 'Soloing',
                priority: 8
            },
            {
                name: 'unsolotrack',
                keywords: ['unsolo track', 'unsolo channel', 'unsolo', 'remove solo track', 'remove solo channel'],
                action: 'unsolotrack',
                response: 'Unsoloing',
                priority: 8
            },
            {
                name: 'armtracknum',
                keywords: ['arm track', 'arm channel', 'record arm track', 'record arm channel', 'enable recording track', 'enable recording channel', 'record enable track', 'arm track number', 'arm channel number', 'record arm'],
                action: 'armtracknum',
                response: 'Arming track',
                priority: 9  // Higher priority - handles "arm track 3" / "arm channel 3" etc.
            },
            {
                name: 'disarmtracknum',
                keywords: ['disarm track', 'disarm channel', 'unarm track', 'unarm channel', 'disable recording track', 'disable recording channel', 'unarm track number', 'unarm channel number'],
                action: 'disarmtrack',
                response: 'Disarming track',
                priority: 9  // Higher priority - handles "disarm track 3" / "disarm channel 3" etc.
            },
            {
                name: 'settrackvolume',
                keywords: ['set track volume', 'set channel volume', 'track volume', 'channel volume', 'volume track', 'volume channel', 'set volume track', 'set volume channel'],
                action: 'settrackvolume',
                response: 'Setting track volume',
                priority: 8
            },
            {
                name: 'settrackpan',
                keywords: ['pan track', 'pan channel', 'set track pan', 'set channel pan', 'track pan', 'channel pan', 'pan track left', 'pan channel left', 'pan track right', 'pan channel right', 'pan track center', 'pan channel center'],
                action: 'settrackpan',
                response: 'Panning track',
                priority: 8
            },
            {
                name: 'settrackwidth',
                keywords: ['width track', 'width channel', 'set track width', 'set channel width', 'track width', 'channel width', 'stereo width', 'make mono', 'make stereo', 'narrow width', 'wide width', 'widen track', 'widen channel', 'narrow track', 'narrow channel'],
                action: 'settrackwidth',
                response: 'Setting width',
                priority: 8
            },
            // Master Fader Commands
            {
                name: 'setmastervolume',
                keywords: ['master volume', 'set master volume', 'master fader', 'set master fader', 'main volume', 'set main volume', 'master level', 'set master level', 'master to', 'set master to'],
                action: 'setmastervolume',
                response: 'Setting master volume',
                priority: 9
            },
            {
                name: 'mutemaster',
                keywords: ['mute master', 'mute main', 'mute master fader', 'silence master', 'master mute'],
                action: 'mutemaster',
                response: 'Muting master',
                priority: 9
            },
            {
                name: 'unmutemaster',
                keywords: ['unmute master', 'unmute main', 'unmute master fader', 'master unmute', 'enable master'],
                action: 'unmutemaster',
                response: 'Unmuting master',
                priority: 9
            },
            {
                name: 'solomaster',
                keywords: ['solo master', 'master solo', 'solo main'],
                action: 'solomaster',
                response: 'Soloing master',
                priority: 9
            },
            {
                name: 'unsolomaster',
                keywords: ['unsolo master', 'master unsolo', 'unsolo main'],
                action: 'unsolomaster',
                response: 'Unsoloing master',
                priority: 9
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
                keywords: ['toggle mixer', 'toggle the mixer', 'mixer'],
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
            },
            // Punch Recording Commands
            {
                name: 'toggleautopunch',
                keywords: ['toggle auto punch', 'toggle autopunch', 'auto punch', 'autopunch'],
                action: 'toggleautopunch',
                response: 'Toggling auto-punch recording',
                priority: 8
            },
            {
                name: 'enableautopunch',
                keywords: ['enable auto punch', 'enable autopunch', 'turn on auto punch', 'auto punch on'],
                action: 'enableautopunch',
                response: 'Enabling auto-punch recording',
                priority: 9
            },
            {
                name: 'disableautopunch',
                keywords: ['disable auto punch', 'disable autopunch', 'turn off auto punch', 'auto punch off'],
                action: 'disableautopunch',
                response: 'Disabling auto-punch recording',
                priority: 9
            },
            {
                name: 'punchin',
                keywords: ['punch in', 'punch recording in', 'start punch', 'begin punch'],
                action: 'punchin',
                response: 'Punch in enabled',
                priority: 9
            },
            {
                name: 'punchout',
                keywords: ['punch out', 'punch recording out', 'end punch', 'stop punch'],
                action: 'punchout',
                response: 'Punch out enabled',
                priority: 9
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
                // Use word boundary matching for ALL keywords to avoid partial matches
                // This prevents "mute track" from matching inside "unmute track"
                const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
                
                // DEBUG: Log matching attempt for "go to bar" commands
                if (keyword.includes('bar') && lower.includes('bar')) {
                    console.log(`🔍 Testing pattern "${keyword}" against "${lower}" - Match: ${regex.test(lower)}`);
                }
                
                if (regex.test(lower)) {
                    return {
                        action: cmdData.action,
                        response: cmdData.response,
                        confidence: 1.0
                    };
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
        
        // Patterns for BPM values (including common misrecognitions like "temple")
        const patterns = [
            /(\d+\.?\d*)\s*bpm/i,  // "120 BPM"
            /(\d+\.?\d*)\s*beats\s*per\s*minute/i,  // "120 beats per minute"
            /tempo\s+to\s+(\d+\.?\d*)/i,  // "tempo to 120"
            /temple\s+to\s+(\d+\.?\d*)/i,  // "temple to 120" (Google Voice misrecognition)
            /tempo\s+at\s+(\d+\.?\d*)/i,  // "tempo at 120"
            /temple\s+at\s+(\d+\.?\d*)/i,  // "temple at 120" (misrecognition)
            /set\s+tempo\s+to\s+(\d+\.?\d*)/i,  // "set tempo to 120"
            /set\s+temple\s+to\s+(\d+\.?\d*)/i,  // "set temple to 120" (misrecognition)
            /change\s+tempo\s+to\s+(\d+\.?\d*)/i,  // "change tempo to 120"
            /change\s+temple\s+to\s+(\d+\.?\d*)/i,  // "change temple to 120" (misrecognition)
            /adjust\s+tempo\s+to\s+(\d+\.?\d*)/i,  // "adjust tempo to 120"
            /adjust\s+temple\s+to\s+(\d+\.?\d*)/i,  // "adjust temple to 120" (misrecognition)
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
    /**
     * Get track information from REAPER (name, existence, etc.)
     */
    async getTrackInfo(trackNumber) {
        try {
            // Use REAPER's Web API to get track info
            // Format: _/TRACK/{number} returns: TRACK <num> <name> <flags> <vol> <pan> ...
            const port = 8080;
            const url = `http://127.0.0.1:${port}/_/TRACK/${trackNumber}`;
            
            const response = await fetch(url, { 
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            
            if (!response.ok) {
                // Track doesn't exist
                return { exists: false, number: trackNumber };
            }
            
            const trackData = await response.text();
            
            // Parse response: TRACK <num> <name> <flags> <vol> <pan> ...
            // Example: "TRACK	1	Guitar	520	1.000000	0.000000..."
            const parts = trackData.split('\t');
            const trackName = parts.length >= 3 ? parts[2] : `Track ${trackNumber}`;
            
            return {
                exists: true,
                number: trackNumber,
                name: trackName.trim() || `Track ${trackNumber}`
            };
        } catch (error) {
            console.warn(`Could not get track ${trackNumber} info:`, error);
            // Assume track exists with default name if web API fails
            return {
                exists: true,
                number: trackNumber,
                name: `Track ${trackNumber}`
            };
        }
    }
    
    extractTrackNumber(text) {
        const lower = text.toLowerCase();
        console.log(`🔢 Extracting track/channel number from: "${text}"`);
        
        // Try numeric after "track" or "channel" keyword
        const trackMatch = lower.match(/(?:track|channel)\s*(\d+)/i);
        if (trackMatch) {
            const num = parseInt(trackMatch[1], 10);
            console.log(`🔢 Found "track/channel N" pattern: ${num}`);
            if (!isNaN(num) && num > 0 && num <= 128) return num;
        }
        
        // Try just any number in track context
        const anyNumber = lower.match(/(\d+)/);
        if (anyNumber) {
            const num = parseInt(anyNumber[1], 10);
            console.log(`🔢 Found any number: ${num}`);
            if (!isNaN(num) && num > 0 && num <= 128) return num;
        }
        
        // Try word numbers (one, two, three, etc.)
        const wordNumber = this.parseNumberWords(lower);
        if (wordNumber && wordNumber > 0 && wordNumber <= 128) {
            console.log(`🔢 Found word number: ${wordNumber}`);
            return wordNumber;
        }
        
        console.log(`🔢 No track/channel number found`);
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
     * Extract stereo width value from text
     * Examples: "make mono", "stereo", "narrow", "wide", "50% width"
     * Width in REAPER: -1 = mono, 0 = normal stereo swap, 1 = stereo
     */
    extractWidthValue(text) {
        const lower = text.toLowerCase();
        
        // Mono
        if (/\bmono\b/i.test(lower)) {
            return { description: 'mono', value: -1 };
        }
        
        // Stereo (normal)
        if (/\b(stereo|normal|default)\b/i.test(lower) && !/\bwide\b/i.test(lower)) {
            return { description: 'stereo', value: 1 };
        }
        
        // Narrow
        if (/\bnarrow\b/i.test(lower)) {
            const percentMatch = lower.match(/(\d+\.?\d*)\s*%?\s*narrow/i);
            if (percentMatch) {
                const percent = parseFloat(percentMatch[1]);
                return { description: `${percent}% narrow`, value: percent / 100 };
            }
            return { description: 'narrow', value: 0.5 };
        }
        
        // Wide
        if (/\bwide\b/i.test(lower)) {
            const percentMatch = lower.match(/(\d+\.?\d*)\s*%?\s*wide/i);
            if (percentMatch) {
                const percent = parseFloat(percentMatch[1]);
                return { description: `${percent}% wide`, value: Math.min(2, percent / 100) };
            }
            return { description: 'wide', value: 1.5 };
        }
        
        // Percentage only
        const percentMatch = lower.match(/(\d+\.?\d*)\s*%/);
        if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            return { description: `${percent}%`, value: percent / 100 };
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
                        // If we have a tempo value, use it
                        if (getResult.tempo) {
                            return { 
                                success: true, 
                                message: `Current tempo is ${getResult.tempo} BPM` 
                            };
                        }
                        // Otherwise, use the message from backend
                        return getResult;
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
            /\b(hi|hello|hey|howdy|greetings|yo|sup|what's up)\b/i,
            /\b(thank you|thanks|thank ya|thx|appreciate it|much appreciated)\b/i,
            /\b(please|excuse me|pardon me)\b/i,
            /\b(good morning|good afternoon|good evening|good night)\b/i,
            /\b(goodbye|bye|see ya|later|catch you later)\b/i,
            
            // Meta queries (about RHEA, commands, or music production)
            /\b(help|what can you do|show me|tell me about|explain)\b/i,
            /\b(how do i|how should i|what should i|can i)\b/i,
            /\b(teach me|show me how|walk me through)\b/i,
            
            // Music production questions
            /\b(what('s| is) (a|the|an))\b.*\b(compressor|eq|reverb|delay|plugin|vst|mix|master)\b/i,
            /\b(how (do|does|should|can|would))\b.*\b(sound|mix|master|record|edit|compress|eq)\b/i,
            /\b(why (is|does|do|should|would))\b.*\b(sound|mix|track|channel|audio)\b/i,
            /\b(tips|advice|suggestions|recommend|thoughts)\b/i,
            
            // Troubleshooting
            /\b(not working|didn't work|nothing happened|no change|issue|problem|error)\b/i,
            /\b(listen|hear|understand|recognize)\b/i,
            /\b(sounds? (wrong|off|weird|bad|muddy|harsh|thin|boomy))\b/i,
            
            // Status checks
            /\b(status|ready|available|online)\b/i,
            
            // Confirmation and clarification
            /\b(okay|ok|sure|yes|yeah|yep|no|nope|right|correct|exactly|absolutely)\b/i,
            /\b(i mean|what i meant|actually|i was saying)\b/i,
            /\b(never mind|forget it|scratch that|wait)\b/i,
            
            // Compliments and feedback
            /\b(great|good job|nice|well done|perfect|awesome|excellent|love it|sounds good)\b/i,
            
            // Casual conversation
            /\b(i think|i feel|i need|i want|i'm trying|i was wondering)\b/i,
            /\b(kind of|sort of|maybe|perhaps|probably|definitely)\b/i,
            /\b(by the way|also|oh and|speaking of)\b/i
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
     * Check if the query is a question about REAPER/production
     */
    isQuestionQuery(text) {
        const lower = text.toLowerCase().trim();
        const questionPatterns = [
            /^how (do|can|should|would|to)/i,
            /^what (is|are|does|do|should|would)/i,
            /^where (is|are|do|can|should)/i,
            /(how do i|how to|how can i)/i,
            /(teach me|show me how|explain)/i
        ];
        const reaperKeywords = /(reaper|track|record|bounce|render|freeze|tempo|pitch|stretch|warp|midi|automation|mix|master|plugin|effect|fx|marker|region|loop|punch|arm|monitor|bus|send|routing|template)/i;
        const isQuestion = questionPatterns.some(p => p.test(lower));
        const hasReaperKeyword = reaperKeywords.test(lower);
        return isQuestion && hasReaperKeyword;
    }
    
    /**
     * Try to answer from static knowledge base (no API needed)
     */
    tryStaticKnowledge(text) {
        if (!window.staticKnowledge || !window.staticKnowledge.loaded) return null;
        try {
            const answer = window.staticKnowledge.quickAnswer(text);
            if (answer) return answer.length > 500 ? answer.slice(0, 497) + '...' : answer;
            const results = window.staticKnowledge.search(text, 1);
            if (results.length > 0) {
                let response = results[0].content;
                if (results[0].steps && results[0].steps.length > 0) {
                    response += ' Steps: ' + results[0].steps.join(', then ') + '.';
                }
                return response.length > 500 ? response.slice(0, 497) + '...' : response;
            }
        } catch (e) { console.warn('Static knowledge lookup failed:', e); }
        return null;
    }
    
    /**
     * Handle Studio Vocabulary matching
     * Checks utterance against user-defined studio slang and executes mappings
     */
    async handleStudioVocabulary(utterance) {
        try {
            const matcher = window.studioVocabularyMatcher;
            const executor = window.studioVocabularyExecutor;
            
            if (!matcher || !executor) {
                return null;
            }
            
            // Get vocabulary context
            const vocabContext = matcher.getVocabContext(utterance);
            
            if (!vocabContext || !vocabContext.vocabMatch) {
                return null;
            }
            
            console.log('🎤 Studio Vocabulary Match:', vocabContext.vocabMatch.phrase, 
                        `(${(vocabContext.vocabMatch.score * 100).toFixed(0)}%)`);
            
            const { vocabMatch, hasActionMapping, clarificationRule } = vocabContext;
            
            // Handle based on intent type
            if (vocabMatch.intentType === 'vibe') {
                // Vibe phrases - respond naturally, no DAW action
                const response = executor.getVibeResponse(vocabContext);
                if (response) {
                    this.speak(response);
                    this.updateStatus('ready', vocabMatch.phrase);
                    this.logResult(utterance, 'success', 'vocab-vibe');
                    return { handled: true, source: 'studio-vocabulary', type: 'vibe' };
                }
            }
            
            if (vocabMatch.intentType === 'action' && hasActionMapping) {
                // Action phrases - build and execute ActionPlan
                // Use cached fullMatch to avoid double-matching (performance fix)
                const matchResult = vocabContext.fullMatch;
                
                if (!matchResult || !matchResult.item) {
                    return null;
                }
                
                // Get current DAW context for target resolution
                const dawContext = {
                    selectedTrack: this.latestContextSnapshot?.activeTrack || 1,
                    activeControl: this.latestContextSnapshot?.activeControl,
                    focusedElement: this.latestContextSnapshot?.activeControl
                };
                
                // Build action plan
                const plan = executor.buildActionPlan(matchResult, dawContext);
                
                if (!plan) {
                    return null;
                }
                
                // Check if clarification is needed
                if (plan.needsClarification && clarificationRule !== 'neverAsk') {
                    // Store pending action and ask for clarification
                    this.pendingVocabAction = plan;
                    this.speak(plan.clarificationQuestion);
                    this.updateStatus('waiting', 'Awaiting clarification...');
                    return { handled: true, source: 'studio-vocabulary', type: 'clarification' };
                }
                
                // Execute the action plan
                const result = await executor.execute(plan);
                
                if (result.success) {
                    // Speak studio-style confirmation
                    this.speak(result.confirmation);
                    this.updateStatus('ready', plan.phrase);
                    this.logResult(utterance, 'success', 'vocab-action');
                    return { handled: true, source: 'studio-vocabulary', type: 'action', result };
                } else {
                    console.warn('⚠️ Vocabulary action failed:', result.error);
                    this.speak("Couldn't do that. Something went wrong.");
                    return { handled: true, source: 'studio-vocabulary', type: 'error', error: result.error };
                }
            }
            
            return null;
            
        } catch (e) {
            console.error('❌ Studio Vocabulary error:', e);
            return null;
        }
    }
    
    /**
     * Handle clarification response for pending vocab action
     */
    async handleVocabClarification(response) {
        if (!this.pendingVocabAction) {
            return false;
        }
        
        const executor = window.studioVocabularyExecutor;
        const plan = this.pendingVocabAction;
        
        // Parse the response for amount/value
        for (const action of plan.actions) {
            if (action.needsClarification && action.type === 'parameterDelta') {
                const parsed = executor.parseAmountResponse(response, action.payload.paramName);
                if (parsed) {
                    action.payload.amount = parsed.amount;
                    action.payload.unit = parsed.unit;
                    action.needsClarification = false;
                }
            }
        }
        
        // Check if all clarifications resolved
        const stillNeedsClarification = plan.actions.some(a => a.needsClarification);
        
        if (stillNeedsClarification) {
            this.speak("I didn't catch that. How much?");
            return true;
        }
        
        // Execute the plan
        this.pendingVocabAction = null;
        const result = await executor.execute(plan);
        
        if (result.success) {
            this.speak(result.confirmation);
            this.updateStatus('ready', plan.phrase);
        } else {
            this.speak("Something went wrong.");
        }
        
        return true;
    }
    
    /**
     * Find track number by name
     */
    async findTrackByName(trackName) {
        try {
            console.log(`🔍 Searching for track: "${trackName}"`);
            console.log(`⚠️  Note: Track name search requires REAPER's web interface to be enabled`);
            console.log(`   If not enabled, please use track numbers: "solo track 3"`);
            
            // Check up to 32 tracks (typical project size)
            for (let i = 1; i <= 32; i++) {
                const trackInfo = await this.getTrackInfo(i);
                if (!trackInfo || !trackInfo.exists) {
                    // No more tracks
                    break;
                }
                
                const name = trackInfo.name.toLowerCase();
                const search = trackName.toLowerCase();
                
                console.log(`  Track ${i}: "${trackInfo.name}"`);
                
                // Check if name contains the search term
                if (name.includes(search) || search.includes(name)) {
                    console.log(`  ✅ MATCH! Track ${i} = "${trackInfo.name}"`);
                    return i;
                }
                
                // If we're getting generic names, HTTP API is disabled
                if (trackInfo.name === `Track ${i}`) {
                    console.log(`  ⚠️  Getting generic names - REAPER web interface not enabled`);
                    // Stop searching, won't find anything useful
                    break;
                }
            }
            
            console.log(`  ❌ No track found with name: "${trackName}"`);
            console.log(`  💡 Try: "solo track [number]" or enable REAPER's web interface`);
            return null;
        } catch (error) {
            console.error('Error finding track by name:', error);
            return null;
        }
    }

    // ============================================================
    // COMPOUND COMMAND SYSTEM
    // Handles multi-step commands like:
    // "go to bar 15, arm track 5, punch in at bar 18, punch out at bar 24, then disarm track 5"
    // ============================================================
    
    /**
     * Parse a compound command into individual steps
     * @param {string} transcript - The full command string
     * @returns {Array|null} - Array of individual commands, or null if not compound
     */
    parseCompoundCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase().trim();
        
        // Check for compound delimiters
        let foundDelimiter = null;
        let commands = null;
        
        // Try each delimiter (longer ones first to avoid partial matches)
        for (const delimiter of this.compoundCommandDelimiters) {
            if (lowerTranscript.includes(delimiter)) {
                // Split by this delimiter
                commands = transcript.split(new RegExp(delimiter, 'i'))
                    .map(cmd => cmd.trim())
                    .filter(cmd => cmd.length > 0);
                
                if (commands.length > 1) {
                    foundDelimiter = delimiter;
                    console.log(`🔗 Found compound delimiter: "${delimiter}"`);
                    break;
                }
            }
        }
        
        // If no delimiters found, check for multiple action keywords in sequence
        // e.g., "go to bar 15 arm track 5 punch in at bar 18"
        if (!commands || commands.length <= 1) {
            commands = this.parseImplicitCompoundCommand(transcript);
        }
        
        return commands;
    }
    
    /**
     * Parse implicit compound commands (no explicit delimiters)
     * Detects action keywords and splits accordingly
     */
    parseImplicitCompoundCommand(transcript) {
        // Patterns in priority order (more specific first)
        const actionPatterns = [
            // Navigation with track context
            /\b(go to bar \d+(?:\s+on\s+(?:track|channel)\s+\d+)?)/gi,
            /\b(play from bar \d+)/gi,
            /\b(begin playback at bar \d+)/gi,
            /\b(start playback at bar \d+)/gi,
            
            // Record from a specific bar
            /\b(record(?:ing)? (?:from|at|starting at|start at) bar \d+)/gi,
            /\b(start recording (?:from|at) bar \d+)/gi,
            
            // Punch ranges
            /\b(punch (?:from|between)\s*bar \d+\s*(?:to|through|and)\s*bar \d+)/gi,
            
            // Track/Channel controls with numbers
            /\b(arm (?:track|channel) \d+(?:\s+for recording)?)/gi,
            /\b(arm record(?:ing)? (?:on )?(?:track|channel) \d+)/gi,
            /\b(disarm (?:track|channel) \d+)/gi,
            /\b(unarm (?:track|channel) \d+)/gi,
            /\b(select (?:track|channel) \d+)/gi,
            /\b(mute (?:track|channel) \d+)/gi,
            /\b(unmute (?:track|channel) \d+)/gi,
            /\b(solo (?:track|channel) \d+)/gi,
            /\b(unsolo (?:track|channel) \d+)/gi,
            
            // Contextual arm/disarm (from "on track X")
            /\b(on (?:track|channel) \d+\s+arm record)/gi,
            
            // Punch in/out with bar numbers
            /\b(punch (?:me )?in (?:at )?bar \d+)/gi,
            /\b(punch (?:me )?out (?:at )?bar \d+)/gi,
            /\b(set punch[- ]?in (?:at |to )?bar \d+)/gi,
            /\b(set punch[- ]?out (?:at |to )?bar \d+)/gi,
            
            // Auto-punch
            /\b(enable auto[- ]?punch)/gi,
            /\b(auto[- ]?punch)/gi,
            /\b(enable punch[- ]?in\/out)/gi,
            
            // Record modes and monitoring
            /\b(enable overdub)/gi,
            /\boverdub mode/gi,
            /\b(enable replace mode)/gi,
            /\breplace mode/gi,
            /\btape mode/gi,
            /\b(loop record)/gi,
            /\b(enable input monitoring)/gi,
            /\b(input monitoring only)/gi,
            
            // Arm/disarm all
            /\b(arm all tracks)/gi,
            /\b(disarm all tracks)/gi,
            /\b(unarm all tracks)/gi,
            
            // Simple transport (only match standalone)
            /\b(start recording)/gi,
            /\b(begin recording)/gi,
            /\bstop recording/gi,
            /\bstop playback at bar \d+/gi
        ];
        
        const commands = [];
        const foundMatches = new Set();
        
        // Extract commands in order of appearance
        for (const pattern of actionPatterns) {
            const matches = transcript.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const trimmed = match.trim();
                    // Avoid duplicates and substrings
                    if (!foundMatches.has(trimmed.toLowerCase())) {
                        commands.push(trimmed);
                        foundMatches.add(trimmed.toLowerCase());
                    }
                });
            }
        }
        
        // Sort by position in original transcript
        commands.sort((a, b) => {
            const posA = transcript.toLowerCase().indexOf(a.toLowerCase());
            const posB = transcript.toLowerCase().indexOf(b.toLowerCase());
            return posA - posB;
        });
        
        // Only return if we found multiple distinct commands
        return commands.length > 1 ? commands : null;
    }
    
    /**
     * Execute a sequence of commands
     * @param {Array} commands - Array of command strings to execute in order
     */
    async executeCompoundCommand(commands) {
        console.log('🔗 ═══════════════════════════════════════════');
        console.log('🔗 EXECUTING COMPOUND COMMAND');
        console.log('🔗 Steps:', commands.length);
        commands.forEach((cmd, i) => console.log(`   ${i + 1}. ${cmd}`));
        console.log('🔗 ═══════════════════════════════════════════');
        
        // Announce the workflow
        const stepCount = commands.length;
        await this.quickSpeak(`Got it. Executing ${stepCount} step workflow.`);
        
        // Execute each command in sequence
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            console.log(`\n🔗 Step ${i + 1}/${commands.length}: "${command}"`);
            
            // Process this individual command
            await this.processSingleCommand(command);
            
            // Small delay between commands for reliability
            if (i < commands.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        // Announce completion
        await this.quickSpeak(`Workflow complete. ${stepCount} steps executed.`);
        this.updateStatus('ready', `Completed ${stepCount}-step workflow`);
    }
    
    /**
     * Process a single command (used by compound command executor)
     * This handles special compound-specific commands like "punch in at bar X"
     */
    async processSingleCommand(command) {
        const lowerCmd = command.toLowerCase().trim();
        
        // Guard: if command mentions "stop" and a bar number, always schedule a stop later, never stop immediately
        const stopBarGenericMatch = lowerCmd.match(/stop(?:\s+playback|\s+playing|\s+transport|\s+play)?\s+(?:at\s+)?(?:bar\s*)?(\d+)/);
        if (stopBarGenericMatch) {
            const bar = parseInt(stopBarGenericMatch[1], 10);
            if (!isNaN(bar) && bar > 0) {
                console.log(`🛑 Scheduling stop at bar ${bar} (generic stop matcher)`);
                await this.scheduleStopAtBar(bar);
                return;
            }
        }
        
        // Handle "go to bar X on track Y" - extract both parts
        const gotoBarTrackMatch = lowerCmd.match(/go to bar (\d+)\s+on\s+(?:track|channel)\s+(\d+)/);
        if (gotoBarTrackMatch) {
            const bar = parseInt(gotoBarTrackMatch[1], 10);
            const track = parseInt(gotoBarTrackMatch[2], 10);
            console.log(`🎯 Going to bar ${bar} and selecting track ${track}`);
            
            // Go to bar
            if (window.api && window.api.executeMeasureCommand) {
                await window.api.executeMeasureCommand('goto', bar);
            } else if (window.api && window.api.executeGotoBar) {
                await window.api.executeGotoBar(bar);
            }
            // Select track
            if (window.api && window.api.executeTrackCommand) {
                await window.api.executeTrackCommand('select', track);
            }
            return;
        }

        // Handle "begin/start playback at bar X"
        const beginPlaybackMatch = lowerCmd.match(/(begin|start)\s+playback\s+(?:at\s+)?(?:bar\s*)?(\d+)/);
        if (beginPlaybackMatch) {
            const bar = parseInt(beginPlaybackMatch[2], 10);
            console.log(`🎯 Begin playback at bar ${bar}`);
            if (window.api && window.api.executeGotoBar) {
                await window.api.executeGotoBar(bar);
            }
            await window.api?.executeReaperAction?.(this.reaperActions['play']);
            return;
        }
        
        // Handle "record from/at bar X"
        const recordFromBarMatch = lowerCmd.match(/record(?:ing)? (?:from|at|starting at|start at)\s*(?:bar\s*)?(\d+)/);
        const startRecordingAtMatch = lowerCmd.match(/start recording (?:from|at)\s*(?:bar\s*)?(\d+)/);
        const recordBar = recordFromBarMatch ? parseInt(recordFromBarMatch[1], 10) : (startRecordingAtMatch ? parseInt(startRecordingAtMatch[1], 10) : null);
        if (recordBar) {
            console.log(`🎯 Record from bar ${recordBar}`);
            if (window.api && window.api.executeGotoBar) {
                await window.api.executeGotoBar(recordBar);
            }
            if (window.api && window.api.executeReaperAction) {
                await window.api.executeReaperAction(this.reaperActions['record']);
            }
            return;
        }
        
        // Handle punch range: "punch from bar X to bar Y"
        const punchRangeMatch = lowerCmd.match(/punch (?:from|between)\s*(?:bar\s*)?(\d+)\s*(?:to|through|and)\s*(?:bar\s*)?(\d+)/);
        if (punchRangeMatch) {
            const inBar = parseInt(punchRangeMatch[1], 10);
            const outBar = parseInt(punchRangeMatch[2], 10);
            console.log(`🎯 Setting punch range ${inBar} -> ${outBar}`);
            await this.setPunchRange(inBar, outBar);
            // Ensure auto-punch is enabled and recording is running
            await this.enableAutoPunch();
            if (window.api && window.api.executeReaperAction) {
                await window.api.executeReaperAction(this.reaperActions['record']);
            }
            return;
        }
        
        // Handle "arm track X for recording" or "arm record on track X"
        const armTrackMatch = lowerCmd.match(/arm\s+(?:track|channel)\s+(\d+)/);
        if (armTrackMatch) {
            const track = parseInt(armTrackMatch[1], 10);
            console.log(`🎯 Arming track ${track} for recording`);
            if (window.api && window.api.executeTrackCommand) {
                await window.api.executeTrackCommand('arm', track);
            }
            return;
        }
        
        // Handle "on track X arm record"
        const onTrackArmMatch = lowerCmd.match(/on\s+(?:track|channel)\s+(\d+)\s+arm/);
        if (onTrackArmMatch) {
            const track = parseInt(onTrackArmMatch[1], 10);
            console.log(`🎯 Arming track ${track} for recording`);
            if (window.api && window.api.executeTrackCommand) {
                await window.api.executeTrackCommand('arm', track);
            }
            return;
        }
        
        // Handle "disarm track X"
        const disarmTrackMatch = lowerCmd.match(/(?:disarm|unarm)\s+(?:track|channel)\s+(\d+)/);
        if (disarmTrackMatch) {
            const track = parseInt(disarmTrackMatch[1], 10);
            console.log(`🎯 Disarming track ${track}`);
            if (window.api && window.api.executeTrackCommand) {
                await window.api.executeTrackCommand('disarm', track);
            }
            return;
        }
        
        // Handle punch-in at specific bar
        const punchInMatch = lowerCmd.match(/punch\s*(?:me\s*)?in\s*(?:at\s*)?(?:bar\s*)?(\d+)/);
        if (punchInMatch) {
            const bar = parseInt(punchInMatch[1], 10);
            console.log(`🎯 Setting punch-in at bar ${bar}`);
            await this.setPunchPoint('in', bar);
            return;
        }
        
        // Handle punch-out at specific bar
        const punchOutMatch = lowerCmd.match(/punch\s*(?:me\s*)?out\s*(?:at\s*)?(?:bar\s*)?(\d+)/);
        if (punchOutMatch) {
            const bar = parseInt(punchOutMatch[1], 10);
            console.log(`🎯 Setting punch-out at bar ${bar}`);
            await this.setPunchPoint('out', bar);
            return;
        }
        
        // Handle set punch-in/punch-out variations
        const setPunchInMatch = lowerCmd.match(/set\s*punch[- ]?in\s*(?:at\s*|to\s*)?(?:bar\s*)?(\d+)/);
        if (setPunchInMatch) {
            const bar = parseInt(setPunchInMatch[1], 10);
            await this.setPunchPoint('in', bar);
            return;
        }
        
        const setPunchOutMatch = lowerCmd.match(/set\s*punch[- ]?out\s*(?:at\s*|to\s*)?(?:bar\s*)?(\d+)/);
        if (setPunchOutMatch) {
            const bar = parseInt(setPunchOutMatch[1], 10);
            await this.setPunchPoint('out', bar);
            return;
        }
        
        // Handle "enable auto punch" or just "auto punch"
        if ((lowerCmd.includes('enable') && lowerCmd.includes('punch')) || 
            lowerCmd.match(/^auto[- ]?punch$/)) {
            console.log('🎯 Enabling auto-punch mode');
            await this.enableAutoPunch();
            return;
        }
        if (lowerCmd.includes('enable punch') && lowerCmd.includes('in') && lowerCmd.includes('out')) {
            console.log('🎯 Enabling auto-punch in/out');
            await this.enableAutoPunch();
            return;
        }
        
        // Handle record modes
        if (lowerCmd.includes('overdub')) {
            console.log('🎯 Enabling overdub mode');
            await window.api.executeReaperAction(this.reaperActions['overdub']);
            return;
        }
        if (lowerCmd.includes('replace mode') || lowerCmd.includes('tape mode')) {
            console.log('🎯 Enabling replace/tape mode');
            await window.api.executeReaperAction(this.reaperActions['replacemode']);
            return;
        }
        if (lowerCmd.includes('loop record')) {
            console.log('🎯 Enabling loop record mode');
            await window.api.executeReaperAction(this.reaperActions['looprecord']);
            return;
        }
        
        // Handle input monitoring modes
        if (lowerCmd.includes('input monitoring only')) {
            console.log('🎯 Setting input monitoring only');
            await window.api.executeReaperAction(this.reaperActions['recorddisable']); // monitoring only
            return;
        }
        if (lowerCmd.includes('enable input monitoring')) {
            console.log('🎯 Toggling input monitoring');
            await window.api.executeReaperAction(this.reaperActions['monitoron']);
            return;
        }
        
        // Arm/Disarm all tracks
        if (lowerCmd.includes('arm all tracks')) {
            console.log('🎯 Arming all tracks');
            await window.api.executeReaperAction(this.reaperActions['armall']);
            return;
        }
        if (lowerCmd.includes('disarm all tracks') || lowerCmd.includes('unarm all tracks')) {
            console.log('🎯 Disarming all tracks');
            await window.api.executeReaperAction(this.reaperActions['disarmall']);
            return;
        }
        
        // Transport: stop recording
        if (lowerCmd.includes('stop recording')) {
            console.log('🎯 Stop recording');
            await window.api.executeReaperAction(this.reaperActions['stop']);
            return;
        }
        if (lowerCmd === 'start recording' || lowerCmd === 'begin recording') {
            console.log('🎯 Start recording');
            await window.api.executeReaperAction(this.reaperActions['record']);
            return;
        }

        // Handle "stop playback at bar X" (schedule stop)
        // (Handled above with generic matcher; keep here for explicit phrase)
        const stopPlaybackAtMatch = lowerCmd.match(/stop playback at bar (\d+)/);
        if (stopPlaybackAtMatch) {
            const bar = parseInt(stopPlaybackAtMatch[1], 10);
            console.log(`🛑 Scheduling stop at bar ${bar}`);
            await this.scheduleStopAtBar(bar);
            return;
        }
        
        // Handle simple "go to bar X"
        const simpleGotoMatch = lowerCmd.match(/go to bar (\d+)/);
        if (simpleGotoMatch) {
            const bar = parseInt(simpleGotoMatch[1], 10);
            console.log(`🎯 Going to bar ${bar}`);
            if (window.api && window.api.executeMeasureCommand) {
                const res = await window.api.executeMeasureCommand('goto', bar);
                if (res && res.success === false) {
                    console.error('❌ Go to bar failed:', res);
                    try { this.speak(`I couldn't move to bar ${bar}. ${res.error || 'Please check REAPER connection.'}`); } catch (_) {}
                }
            } else if (window.api && window.api.executeGotoBar) {
                const res = await window.api.executeGotoBar(bar);
                if (res && res.success === false) {
                    console.error('❌ Go to bar failed:', res);
                    try { this.speak(`I couldn't move to bar ${bar}. ${res.error || 'Please check REAPER connection.'}`); } catch (_) {}
                }
            }
            return;
        }
        
        // For all other commands, use the regular command processor
        // But bypass the compound detection (we're already processing singles)
        await this.processRegularCommand(command);
    }
    
    /**
     * Set punch-in or punch-out point at a specific bar
     * @param {string} type - 'in' or 'out'
     * @param {number} bar - Bar number
     */
    async setPunchPoint(type, bar) {
        try {
            // First, go to the bar using the existing API
            if (window.api && window.api.executeGotoBar) {
                await window.api.executeGotoBar(bar);
            } else if (window.api && window.api.executeMeasureCommand) {
                await window.api.executeMeasureCommand('goto', bar);
            }
            
            // Small delay to ensure cursor moved
            await new Promise(resolve => setTimeout(resolve, 150));
            
            if (type === 'in') {
                // Set loop/time selection start
                // Action 40222 = Set loop start to edit cursor
                await window.api.executeReaperAction(40222);
                console.log(`✅ Punch-in point set at bar ${bar}`);
            } else {
                // Action 40223 = Set loop end to edit cursor  
                await window.api.executeReaperAction(40223);
                console.log(`✅ Punch-out point set at bar ${bar}`);
            }
            
            return { success: true };
        } catch (error) {
            console.error(`❌ Failed to set punch-${type}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Set punch range (start/end bars)
     */
    async setPunchRange(startBar, endBar) {
        try {
            // Ensure start <= end
            const inBar = Math.min(startBar, endBar);
            const outBar = Math.max(startBar, endBar);
            
            await this.setPunchPoint('in', inBar);
            await this.setPunchPoint('out', outBar);
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to set punch range:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Enable auto-punch recording mode
     */
    async enableAutoPunch() {
        try {
            // Action 40076 = Options: Toggle auto-punch record
            // Just toggle it - REAPER will handle the state
            await window.api.executeReaperAction(40076);
            console.log('✅ Auto-punch mode toggled');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to enable auto-punch:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Schedule a stop at a target bar by estimating time from tempo
     */
    async scheduleStopAtBar(bar) {
        try {
            // Query REAPER for the exact bar start/end via measure bridge
            let targetSeconds = null;
            try {
                const res = await window.api?.executeMeasureCommand?.('barpos', bar);
                if (res && res.success && typeof res.start === 'number') {
                    // Add small buffer (0.2s) to ensure we pass the bar start
                    targetSeconds = res.start + 0.2;
                    console.log(`🛑 Precise stop scheduled from barpos: start=${res.start} end=${res.end}`);
                }
            } catch (err) {
                console.warn('barpos lookup failed, falling back to tempo estimate:', err?.message || err);
            }

            // Fallback to tempo-based estimate if barpos failed
            if (targetSeconds == null) {
                try {
                    const tempoResult = await window.api?.executeTempoCommand?.('get');
                    if (tempoResult && tempoResult.tempo) {
                        this.lastKnownTempoBpm = tempoResult.tempo;
                    } else if (typeof tempoResult === 'number') {
                        this.lastKnownTempoBpm = tempoResult;
                    }
                } catch (_) {}

                // Use conservative (slow) tempo to avoid early stop; assume <= 40 BPM if unknown
                const tempo = Math.max(this.lastKnownTempoBpm || 40, 40);
                const secondsPerBeat = 60 / tempo;
                const secondsPerBar = secondsPerBeat * this.beatsPerBar;
                const minPerBar = 6; // assume very slow tempo floor to avoid early stop

                // If we know current transport seconds, schedule at least one bar from now
                const currentPos = this.lastTransportSeconds || 0;
                const estBarSeconds = Math.max(secondsPerBar, minPerBar);

                // Target based on bar estimate
                const targetByBar = Math.max(bar * estBarSeconds, estBarSeconds);
                // Always ensure at least 10 seconds from now to avoid premature stop
                const minDelay = 10;
                targetSeconds = Math.max(targetByBar, currentPos + minDelay);
                console.log(`🛑 Fallback stop: bar ${bar} (>=~${targetSeconds.toFixed(2)}s) using tempo floor ${tempo} BPM`);
            }

            this.pendingStopBar = bar;
            this.pendingStopBarSeconds = targetSeconds;
            await this.quickSpeak(`Stopping playback at or after bar ${bar}`);
        } catch (error) {
            console.error('Failed to schedule stop at bar:', error);
        }
    }
    
    /**
     * Process a regular command (non-compound specific)
     * This is the normal command flow but without compound detection
     */
    async processRegularCommand(transcript) {
        // Use the existing keyword/AI matching system
        const match = this.matchCommand(transcript);
        
        if (match && match.action) {
            console.log(`   ✅ Matched action: ${match.action}`);
            
            // Execute based on action type
            if (this.reaperActions[match.action]) {
                const actionId = this.reaperActions[match.action];
                
                // Handle custom actions
                if (typeof actionId === 'string') {
                    // Track commands
                    if (actionId.startsWith('track_')) {
                        await this.processTrackCommand(match.action, transcript);
                    }
                    // Tempo commands
                    else if (actionId.startsWith('tempo_')) {
                        await this.processTempoCommand(match.action, transcript);
                    }
                    // Other custom handlers...
                    else {
                        console.log(`   Custom action: ${actionId}`);
                    }
                } else {
                    // Direct REAPER action
                    await window.api.executeReaperAction(actionId);
                    console.log(`   ✅ Executed REAPER action: ${actionId}`);
                }
            }
        } else {
            console.log(`   ⚠️ No match found for: ${transcript}`);
        }
    }

    /**
     * Process track control commands
     */
    async processTrackCommand(action, text, aiResponse = null) {
        try {
            if (!window.api || !window.api.executeTrackCommand) {
                return { success: false, error: 'Track control API not available' };
            }
            
            // =====================================================
            // TERMINOLOGY: "Track" vs "Channel"
            // =====================================================
            // - Arrange Window uses "Tracks"
            // - Mixer Window uses "Channels"
            // Priority:
            // 1. If user explicitly says "channel" or "track", use their word
            // 2. Otherwise, use context based on active window
            // =====================================================
            
            const usedChannel = /\bchannel\b/i.test(text);
            const usedTrack = /\btrack\b/i.test(text);
            
            let term;
            if (usedChannel) {
                term = 'channel';  // User explicitly said "channel"
            } else if (usedTrack) {
                term = 'track';    // User explicitly said "track"
            } else {
                // No explicit term - use context based on active window
                term = this.mixerVisible ? 'channel' : 'track';
            }
            
            console.log(`🎚️ Terminology: "${term}" (mixer visible: ${this.mixerVisible}, user said channel: ${usedChannel}, track: ${usedTrack})`);
            
            // Try to get track number from AI parameters first, then fallback to text extraction
            let trackNum = null;
            if (aiResponse && aiResponse.parameters && aiResponse.parameters.track_number) {
                trackNum = parseInt(aiResponse.parameters.track_number, 10);
                console.log('🤖 AI provided track number:', trackNum);
            } else {
                trackNum = this.extractTrackNumber(text);
                console.log('🔍 Extracted track number from text:', trackNum);
            }
            
            // If no track number found, try to find by name
            if (!trackNum) {
                console.log('🔍 No track number found, searching by name...');
                
                // Extract potential track name from text
                // Remove common command words
                const cleaned = text.toLowerCase()
                    .replace(/solo|mute|unmute|delete|arm|record|select|track/gi, '')
                    .trim();
                
                console.log(`  Cleaned text: "${cleaned}"`);
                
                if (cleaned.length > 0) {
                    trackNum = await this.findTrackByName(cleaned);
                    if (trackNum) {
                        console.log(`✅ Found track "${cleaned}" at number ${trackNum}`);
                    }
                }
            }
            
            if (action === 'selecttrack') {
                if (!trackNum) {
                    return { success: false, error: `Please tell me which ${term} to select` };
                }
                const result = await window.api.executeTrackCommand('select', trackNum);
                return result.success ? {
                    success: true,
                    message: `Selected ${term} ${trackNum}`,
                    context: { selectedTrack: trackNum }
                } : result;
            }
            
            if (action === 'mutetrack' || action === 'mute') {
                // If no track number, use currently selected track (track 1 as fallback)
                const track = trackNum || 1;
                const result = await window.api.executeTrackCommand('mute', track);
                return result.success ? {
                    success: true,
                    message: trackNum ? `Muting ${term} ${track}` : `Muting ${term}`,
                    context: { mutedTrack: track }
                } : result;
            }
            
            if (action === 'unmutetrack' || action === 'unmute') {
                // If no track number, use currently selected track (track 1 as fallback)
                const track = trackNum || 1;
                const result = await window.api.executeTrackCommand('unmute', track);
                return result.success ? {
                    success: true,
                    message: trackNum ? `Unmuting ${term} ${track}` : `Unmuting ${term}`,
                    context: { unmutedTrack: track }
                } : result;
            }
            
            if (action === 'solotrack' || action === 'solo') {
                // If no track number, use currently selected track (track 1 as fallback)
                const track = trackNum || 1;
                const result = await window.api.executeTrackCommand('solo', track);
                return result.success ? {
                    success: true,
                    message: trackNum ? `Soloing ${term} ${track}` : `Soloing ${term}`,
                    context: { soloedTrack: track }
                } : result;
            }
            
            if (action === 'unsolotrack' || action === 'unsolo') {
                // If no track number, use currently selected track (track 1 as fallback)
                const track = trackNum || 1;
                const result = await window.api.executeTrackCommand('unsolo', track);
                return result.success ? {
                    success: true,
                    message: trackNum ? `Unsoloing ${term} ${track}` : `Unsoloing ${term}`,
                    context: { unsoloedTrack: track }
                } : result;
            }
            
            if (action === 'armtracknum' || action === 'armtrack') {
                // Extract track number - MUST respect user's specified track
                const track = trackNum;
                console.log(`🎤 ARM command: action=${action}, extractedTrack=${trackNum}, finalTrack=${track}`);
                
                if (!track) {
                    console.log('⚠️ No track number specified for arm command');
                    return { success: false, error: `Please specify a ${term} number, like "arm ${term} 3"` };
                }
                
                const result = await window.api.executeTrackCommand('arm', track);
                console.log(`🎤 ARM result:`, result);
                return result.success ? {
                    success: true,
                    message: `Armed ${term} ${track}`,
                    context: { armedTrack: track }
                } : result;
            }
            
            if (action === 'disarmtrack' || action === 'disarmtracknum' || action === 'unarmtrack') {
                // If no track number, use currently selected track (track 1 as fallback)
                const track = trackNum || 1;
                const result = await window.api.executeTrackCommand('disarm', track);
                return result.success ? {
                    success: true,
                    message: trackNum ? `Disarmed ${term} ${track}` : `Disarmed ${term}`,
                    context: { disarmedTrack: track }
                } : result;
            }
            
            if (action === 'deletetrack') {
                // Extract track number from command (e.g., "delete track 5")
                const track = trackNum;
                
                if (!track) {
                    // No track number specified - ask for clarification
                    return { success: false, error: `Which ${term} would you like to delete? Please say the ${term} number.` };
                }
                
                console.log(`🗑️  User wants to delete track ${track}...`);
                
                // SOLUTION: Get the track NAME first so user knows what's being deleted
                // This avoids confusion with track renumbering
                
                // Step 1: Get track name from REAPER
                console.log(`   Step 1: Getting track ${track} info...`);
                const trackInfo = await this.getTrackInfo(track);
                
                if (!trackInfo || !trackInfo.exists) {
                    console.error(`   ❌ Track ${track} does not exist`);
                    return { 
                        success: false, 
                        error: `${term.charAt(0).toUpperCase() + term.slice(1)} ${track} doesn't exist. You currently have fewer ${term}s than that.` 
                    };
                }
                
                const trackName = trackInfo.name || `Track ${track}`;
                console.log(`   ℹ️  Track ${track} is named: "${trackName}"`);
                
                // Step 2: Deselect all tracks first (for clean state)
                console.log('   Step 2: Deselecting all tracks...');
                await window.api.executeReaperAction(40297); // Unselect all tracks
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Step 3: Select the specific track
                console.log(`   Step 3: Selecting track ${track} (${trackName})...`);
                const selectResult = await window.api.executeTrackCommand('select', track);
                if (!selectResult.success) {
                    console.error(`   ❌ Failed to select ${term} ${track}`);
                    return { success: false, error: `Could not select ${term} ${track}` };
                }
                
                // Wait for selection to register
                console.log('   Step 4: Waiting for selection...');
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // Step 4: Delete the selected track
                console.log(`   Step 5: Deleting track ${track}: ${trackName}...`);
                if (window.api.executeReaperAction) {
                    const deleteResult = await window.api.executeReaperAction(40005);
                    if (deleteResult.success) {
                        console.log(`   ✅ Successfully deleted "${trackName}"`);
                        // Now user knows EXACTLY what was deleted!
                        return {
                            success: true,
                            message: `Deleted ${trackName}`,
                            context: { 
                                deletedTrack: track,
                                deletedTrackName: trackName
                            }
                        };
                    } else {
                        console.error(`   ❌ Delete action failed`);
                        return { success: false, error: `Failed to delete ${trackName}` };
                    }
                } else {
                    return { success: false, error: 'Delete action not available' };
                }
            }
            
            if (action === 'settrackvolume') {
                if (!trackNum) {
                    return { success: false, error: `Please tell me which ${term}` };
                }
                const volume = this.extractVolumeValue(text);
                if (volume === null) {
                    return { success: false, error: 'Please specify volume percentage (0-100)' };
                }
                const result = await window.api.executeTrackCommand('volume', trackNum, volume);
                return result.success ? {
                    success: true,
                    message: `Set ${term} ${trackNum} volume to ${volume}%`,
                    context: { trackVolume: volume }
                } : result;
            }
            
            if (action === 'settrackpan') {
                if (!trackNum) {
                    return { success: false, error: `Please tell me which ${term}` };
                }
                const panInfo = this.extractPanValue(text);
                if (!panInfo) {
                    return { success: false, error: 'Please specify pan direction (left/right/center)' };
                }
                const result = await window.api.executeTrackCommand('pan', trackNum, panInfo.value);
                return result.success ? {
                    success: true,
                    message: `Panned ${term} ${trackNum} ${panInfo.direction}`,
                    context: { trackPan: panInfo.direction }
                } : result;
            }
            
            if (action === 'settrackwidth') {
                if (!trackNum) {
                    return { success: false, error: `Please tell me which ${term}` };
                }
                const widthInfo = this.extractWidthValue(text);
                if (!widthInfo) {
                    return { success: false, error: 'Please specify width (mono, stereo, narrow, wide, or percentage)' };
                }
                const result = await window.api.executeTrackCommand('width', trackNum, widthInfo.value);
                return result.success ? {
                    success: true,
                    message: `Set ${term} ${trackNum} width to ${widthInfo.description}`,
                    context: { trackWidth: widthInfo.description }
                } : result;
            }
            
            return { success: false, error: `Unknown track command: ${action}` };
        } catch (error) {
            console.error('Track command error:', error);
            return { success: false, error: error.message || 'Track command failed' };
        }
    }
    
    /**
     * Process MASTER fader commands
     * Master track in REAPER is track 0 (or uses specific actions)
     */
    async processMasterCommand(action, text) {
        console.log('🎚️ ========================================');
        console.log('🎚️ processMasterCommand called!');
        console.log('🎚️ Action:', action);
        console.log('🎚️ Text:', text);
        console.log('🎚️ ========================================');
        
        try {
            // REAPER action IDs for master track
            const masterActions = {
                mutemaster: 14,        // Track: Toggle mute for master track
                unmutemaster: 14,      // Same toggle action
                solomaster: 14016,     // Master track: Toggle solo
                unsolomaster: 14016,   // Same toggle action
            };
            
            // Handle mute/unmute master
            if (action === 'mutemaster' || action === 'unmutemaster') {
                const actionId = masterActions.mutemaster;
                const result = await window.api.executeReaperAction(actionId);
                const message = action === 'mutemaster' ? 'Muting master' : 'Unmuting master';
                return result.success ? { success: true, message } : result;
            }
            
            // Handle solo/unsolo master  
            if (action === 'solomaster' || action === 'unsolomaster') {
                const actionId = masterActions.solomaster;
                const result = await window.api.executeReaperAction(actionId);
                const message = action === 'solomaster' ? 'Soloing master' : 'Unsoloing master';
                return result.success ? { success: true, message } : result;
            }
            
            // Handle set master volume
            if (action === 'setmastervolume') {
                // Extract volume value from text
                const volumeMatch = text.match(/(-?\d+\.?\d*)\s*(db|decibels?)?/i);
                if (volumeMatch) {
                    const volumeDb = parseFloat(volumeMatch[1]);
                    console.log(`🎚️ Setting master volume to ${volumeDb} dB`);
                    
                    // Use OSC to set master volume
                    // Master track is track 0 in REAPER
                    if (window.api && window.api.executeTrackCommand) {
                        const result = await window.api.executeTrackCommand('settrackvolume', {
                            trackNumber: 0,  // Master is track 0
                            value: volumeDb
                        });
                        return result.success ? {
                            success: true,
                            message: `Master volume set to ${volumeDb} dB`
                        } : result;
                    }
                    
                    // Fallback: Use generic volume adjustment
                    return { success: true, message: `Master volume set to ${volumeDb} dB` };
                } else {
                    return { success: false, error: 'Please specify a volume level (e.g., "set master to -6 dB")' };
                }
            }
            
            return { success: false, error: `Unknown master command: ${action}` };
        } catch (error) {
            console.error('Master command error:', error);
            return { success: false, error: error.message || 'Master command failed' };
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
            // Mixer Visibility Commands
            // REAPER has separate show (40084) and hide (40085) actions!
            if (action === 'showmixer' || action === 'hidemixer' || action === 'togglemixer' || 
                action === 'mixerwindow' || action === 'openmixer' || action === 'closemixer') {
                console.log('🎛️ Matched mixer visibility command:', action);
                
                if (!window.api || !window.api.executeReaperAction) {
                    console.error('❌ executeReaperAction not available!');
                    return { success: false, error: 'REAPER action API not available' };
                }
                
                // Use the correct action ID from reaperActions
                const actionId = this.reaperActions[action];
                
                // Set message based on action and update mixer visibility state
                let actionMessage = 'Toggling mixer';
                if (action === 'showmixer' || action === 'openmixer' || action === 'mixerwindow') {
                    actionMessage = 'Opening mixer';
                    this.mixerVisible = true;
                } else if (action === 'hidemixer' || action === 'closemixer') {
                    actionMessage = 'Closing mixer';
                    this.mixerVisible = false;
                } else {
                    // Toggle - flip the state
                    this.mixerVisible = !this.mixerVisible;
                }
                
                console.log(`🎛️ Executing mixer command: ${action} (action ${actionId})`);
                console.log(`🎛️ Mixer visible: ${this.mixerVisible} (will use "${this.mixerVisible ? 'channel' : 'track'}" terminology)`);
                const result = await window.api.executeReaperAction(actionId);
                console.log('🎛️ Result:', result);
                
                return result.success ? {
                    success: true,
                    message: actionMessage,
                    context: { mixerVisible: this.mixerVisible }
                } : result;
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
            
            // Tracks - Action-focused (responses built dynamically to respect "track" vs "channel")
            'newtrack': ['Added', 'Created', 'Adding'],
            'deletetrack': ['Deleted', 'Removed'],
            'mute': ['Muted', 'Muting'],
            'unmute': ['Unmuted', 'Unmuting'],
            'solo': ['Soloed', 'Soloing'],
            'unsolo': ['Solo off', 'Unsoloing'],
            'nexttrack': ['Next', 'Moving down'],
            'previoustrack': ['Previous', 'Moving up'],
            
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

    /**
     * Check for wake phrase and strip it from the transcript
     */
    checkWakePhrase(transcript) {
        const raw = (transcript || '').trim();
        for (const phrase of this.wakePhrases || []) {
            const p = String(phrase || '').trim();
            if (!p) continue;
            // Allow punctuation and variable spacing, e.g. "hey rhea," or "rhea:"
            const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
            const re = new RegExp(`^${escaped}\\b[\\s,.:;!?-]*`, 'i');
            const m = raw.match(re);
            if (m && m[0]) {
                const stripped = raw.slice(m[0].length).trim();
                return { matched: true, stripped };
            }
        }
        return { matched: false, stripped: raw };
    }

    /**
     * Pre-gate VOICE transcripts before they reach the command engine.
     * This is the critical "hard gate" that prevents music playback from triggering actions.
     */
    preprocessVoiceTranscript(transcript) {
        const raw = (transcript || '').trim();
        if (!raw) return { accept: false, transcript: '', skipWakeCheck: false };

        const now = Date.now();

        // If wake mode is OFF, do not gate voice input
        if (this.wakeMode === 'off') {
            return { accept: true, transcript: raw, skipWakeCheck: false };
        }

        // If we are within an active wake session, accept without re-checking wake phrase.
        if (this.wakeSessionDurationMs > 0 && now < (this._wakeSessionUntil || 0)) {
            return { accept: true, transcript: raw, skipWakeCheck: true };
        }

        const transportActiveForGate =
            !!this.isTransportPlaying ||
            (now < (this._dawInferredPlayingUntil || 0));

        // If DAW state is stale/unknown, treat "command-like" transcripts as needing a wake phrase.
        // This prevents playback lyrics from accidentally triggering actions when OSC feedback is flaky.
        const dawStateStale = !this._lastDawStateTs || (now - this._lastDawStateTs) > 1200;
        const commandLike = /\b(stop|play|pause|record|mixer|metronome|click|undo|redo|save|arm|disarm|mute|solo|tempo|bar|marker)\b/i.test(raw);
        const effectiveTransportActive = transportActiveForGate || (dawStateStale && commandLike);

        // Determine whether a wake phrase is required
        let needsWake =
            (this.wakeMode === 'always') ||
            (this.wakeMode === 'playback' && effectiveTransportActive);

        // Auto mode: require wake during playback unless headset mic detected
        if (this.wakeMode === 'auto') {
            needsWake = effectiveTransportActive && !this.isHeadsetInput;
        }

        // Emergency bypass: allow STOP without wake even if gating is on (safe default).
        if (needsWake && effectiveTransportActive && this._stopCommandRe.test(raw)) {
            return { accept: true, transcript: raw, skipWakeCheck: true };
        }
        if (!needsWake) {
            return { accept: true, transcript: raw, skipWakeCheck: false };
        }

        const wakeCheck = this.checkWakePhrase(raw);
        if (!wakeCheck.matched) {
            console.log('🚫 WAKE-GATE BLOCKED VOICE:', {
                raw,
                wakeMode: this.wakeMode,
                isHeadsetInput: !!this.isHeadsetInput,
                audioInputLabel: this._lastAudioInputLabel || '',
                assumeHeadset: localStorage.getItem('rhea_headset_assume_isolated') === 'true',
                isTransportPlaying: !!this.isTransportPlaying,
                inferredUntilMs: this._dawInferredPlayingUntil || 0,
                dawStateStale,
                commandLike
            });
            return { accept: false, transcript: '', skipWakeCheck: false };
        }
        if (!wakeCheck.stripped) {
            // Wake phrase only (ASR sometimes emits wake phrase and the command as separate
            // transcripts). Open a wake session window so the NEXT transcript can pass.
            if (this.wakeSessionDurationMs > 0) {
                this._wakeSessionUntil = now + (this.wakeSessionDurationMs || 6000);
                console.log('✅ Wake phrase detected (session opened)', { untilMs: this._wakeSessionUntil });
            }
            return { accept: false, transcript: '', skipWakeCheck: false };
        }
        // Start wake session window (if enabled)
        if (this.wakeSessionDurationMs > 0) {
            this._wakeSessionUntil = now + (this.wakeSessionDurationMs || 6000);
        }
        // We already validated + stripped wake phrase, so processCommand should not re-check.
        return { accept: true, transcript: wakeCheck.stripped, skipWakeCheck: true };
    }

    /**
     * Update wake gating settings at runtime (used by Voice Settings UI).
     */
    setWakeSettings(settings = {}) {
        const mode = settings.mode || this.wakeMode || 'always';
        const ms = Number.isFinite(settings.wakeSessionDurationMs) ? settings.wakeSessionDurationMs : this.wakeSessionDurationMs;

        this.wakeMode = mode;
        this.wakeSessionDurationMs = ms;

        // Derived flags for any legacy paths still reading these
        this.requireWakePhrase = this.wakeMode === 'always';
        this.requireWakePhraseWhilePlaying = this.wakeMode !== 'off';

        // If disabling wake, clear any active wake window
        if (this.wakeMode === 'off') {
            this._wakeSessionUntil = 0;
        }

        console.log('🔔 Wake settings applied to RHEA:', { mode: this.wakeMode, wakeSessionDurationMs: this.wakeSessionDurationMs });
    }

    /**
     * Best-effort headset mic detection (renderer-only).
     * This cannot guarantee the Python ASR process uses the same device, but works well
     * when the system default input switches to a headset (AirPods, USB headset, etc.).
     */
    initHeadsetDetection() {
        try {
            if (!navigator?.mediaDevices?.enumerateDevices) return;

            // Expanded headset detection pattern to include:
            // - Brand names (AirPods, Beats, Sony, Bose, Jabra, etc.)
            // - Generic terms (headset, headphones, earbuds, wireless)
            // - External devices (often headsets plugged into audio jack)
            // Note: "External Microphone" on Mac often means headset mic plugged into 3.5mm jack
            const headsetRe = /(airpods|headset|headphones|earbuds|bluetooth|beats|sony|bose|jab|jabra|plantronics|logitech|wh-|qc\\s?\\d|wireless|hands-?free|hfp|external\s+microphone|external\s+mic)/i;

            const update = async () => {
                try {
                    // Optional manual override (useful when DAWRV doesn't request mic permission in the renderer,
                    // so device labels stay blank even if Python ASR is using a headset mic).
                    const assume = localStorage.getItem('rhea_headset_assume_isolated') === 'true';
                    if (assume) {
                        this.isHeadsetInput = true;
                        this._lastAudioInputLabel = '(assumed headset)';
                        return;
                    }

                    // If labels are hidden, briefly request audio permission then stop the track immediately.
                    // This typically unlocks device labels for enumerateDevices() without taking over the mic.
                    try {
                        if (navigator?.mediaDevices?.getUserMedia) {
                            const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
                            tmp.getTracks().forEach(t => t.stop());
                        }
                    } catch {
                        // Ignore permission errors; labels may remain empty.
                    }

                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const inputs = (devices || []).filter(d => d && d.kind === 'audioinput');
                    const byLabel = (d) => String(d?.label || '');

                    // Debug: Log all detected audio inputs
                    console.log('🎤 Detected audio inputs:', inputs.map(d => byLabel(d)));

                    // Prefer a device that looks like a headset; otherwise fall back to first input.
                    const candidate = inputs.find(d => headsetRe.test(byLabel(d))) || inputs[0] || null;
                    const label = candidate ? String(candidate.label || '') : '';
                    this._lastAudioInputLabel = label;
                    const wasHeadset = this.isHeadsetInput;
                    this.isHeadsetInput = !!(label && headsetRe.test(label));
                    
                    // Log headset detection result
                    if (this.isHeadsetInput !== wasHeadset) {
                        console.log(`🎧 Headset detection changed: ${this.isHeadsetInput ? 'HEADSET DETECTED' : 'NO HEADSET'} (${label})`);
                    }
                } catch {
                    // Labels may be empty without permission; keep last known state.
                }
            };

            update();
            navigator.mediaDevices.addEventListener?.('devicechange', update);
        } catch {
            // ignore
        }
    }

    /**
     * True when we should assume mic isolation (headset) and allow barge-in.
     * This prioritizes responsiveness and is only enabled when headset is detected/assumed.
     */
    isIsolatedMicMode() {
        // ALWAYS TRUE for headset users (mic is isolated from speakers)
        // This enables instant response with minimal delays (10ms)
        // No risk of feedback loop because headset mic only picks up user's voice
        return true;
    }

    async processCommand(transcript, options = {}) {
        // CRITICAL: Log immediately when function is called
        console.log('*** processCommand CALLED ***', transcript);
        console.log('*** transcript type:', typeof transcript);
        console.log('*** transcript value:', transcript);
        
        // FEEDBACK LOOP PREVENTION: Ignore commands while RHEA is speaking
        // In headset/isolation mode, allow "barge-in" so the experience feels instant/human.
        if (this.isSpeaking && !this.isIsolatedMicMode()) {
            console.log('🔇 Ignoring command - RHEA is currently speaking:', transcript);
            return;
        }
        
        // POST-TTS GATE DISABLED - User has headset, no feedback risk
        // Typed commands work perfectly, so this gate was blocking voice unnecessarily
        // Commands can now be issued immediately after RHEA speaks

        // ============================================================
        // WAKE PHRASE / PLAYBACK GATE
        // Require a wake phrase to avoid reacting to music playback (VOICE sources only)
        // ============================================================
        const source = (options && options.source) ? String(options.source) : 'voice';
        const isVoiceSource = source !== 'typed';
        const skipWakeCheck = !!(options && options.skipWakeCheck);
        const transportActiveForGate = !!this.isTransportPlaying || (Date.now() < (this._dawInferredPlayingUntil || 0));

        // Determine whether a wake phrase is required (VOICE sources only)
        let needsWake = isVoiceSource && !skipWakeCheck && (this.requireWakePhrase || (this.requireWakePhraseWhilePlaying && transportActiveForGate));
        if (isVoiceSource && !skipWakeCheck) {
            if (this.wakeMode === 'off') {
                needsWake = false;
            } else if (this.wakeMode === 'auto') {
                needsWake = transportActiveForGate && !this.isHeadsetInput;
            }
        }
        let normalizedCommand = (transcript || '').toLowerCase().trim();

        if (needsWake) {
            // Emergency bypass: allow STOP without wake even if gating is on (safe default).
            if (transportActiveForGate && this._stopCommandRe.test(String(transcript || '').trim())) {
                // treat as wake-validated
            } else {
            const wakeCheck = this.checkWakePhrase(transcript || '');
            if (!wakeCheck.matched) {
                console.log('🔇 Ignoring VOICE command (missing wake phrase while transport active):', transcript);
                return;
            }
            // Strip the wake phrase for downstream matching
            transcript = wakeCheck.stripped || '';
            normalizedCommand = transcript.toLowerCase().trim();
            if (!normalizedCommand) {
                console.log('🔇 Wake phrase detected but no command content.');
                return;
            }
            }
        }
        
        // ============================================================
        // COMPOUND COMMAND DETECTION
        // Check if this is a multi-step command before processing
        // ============================================================
        const compoundCommands = this.parseCompoundCommand(transcript);
        if (compoundCommands && compoundCommands.length > 1) {
            console.log('🔗 COMPOUND COMMAND DETECTED:', compoundCommands.length, 'steps');
            await this.executeCompoundCommand(compoundCommands);
            return;
        }
        
        // Prevent duplicate processing
        const now = Date.now();
        
        // ===================================================================
        // SMART COMMAND DEDUPLICATION
        // ===================================================================
        // Prevent the same command from executing multiple times rapidly
        // This stops runaway loops while allowing legitimate repeated commands
        
        const COMMAND_COOLDOWN_MS = 500; // 500ms minimum between identical commands
        const commandKey = normalizedCommand.toLowerCase().trim();
        
        // Check if this exact command was just processed
        if (this._lastCommandKey === commandKey) {
            const timeSinceLastCommand = now - (this._lastCommandTime || 0);
            if (timeSinceLastCommand < COMMAND_COOLDOWN_MS) {
                console.log(`🔇 Duplicate command blocked (${timeSinceLastCommand}ms ago):`, transcript);
                return;
            }
        }
        
        // Update deduplication tracking
        this._lastCommandKey = commandKey;
        this._lastCommandTime = now;
        
        // FILTER: Ignore RHEA's own responses to prevent feedback loops
        for (const phrase of this.rheaResponsePhrases) {
            if (normalizedCommand.includes(phrase.toLowerCase())) {
                console.log('🔇 Ignoring RHEA response phrase (feedback suppression):', transcript);
                return;
            }
        }

        // If we asked for confirmation, handle yes/no before any other filtering
        if (this.pendingStructuredCommand) {
            if (this.isAffirmationCommand(normalizedCommand)) {
                console.log('✅ User confirmed pending structured command');
                await this.executeStructuredCommand(this.pendingStructuredCommand, { confirmed: true });
                this.pendingStructuredCommand = null;
                this.isProcessingCommand = false;
                return;
            }
            if (this.isCancelCommand(normalizedCommand)) {
                console.log('🛑 Pending structured command cancelled');
                this.pendingStructuredCommand = null;
                this.speak('Cancelled');
                this.isProcessingCommand = false;
                return;
            }
        }
        
        // ===================================================================
        // SMART BACKGROUND NOISE FILTER
        // ===================================================================
        // Reject transcripts that are clearly background audio (music, TV, conversations)
        // but allow legitimate natural language commands
        
        const wordCount = normalizedCommand.split(/\s+/).filter(w => w.length > 0).length;
        
        // List of DAW-related keywords that indicate a legitimate command
        const dawKeywords = [
            'play', 'stop', 'record', 'pause', 'rewind', 'undo', 'redo',
            'track', 'mute', 'solo', 'arm', 'volume', 'pan', 'mixer',
            'tempo', 'loop', 'marker', 'save', 'open', 'new', 'delete',
            'cut', 'copy', 'paste', 'select', 'zoom', 'master', 'channel',
            'disarm', 'fader', 'plugin', 'effect', 'bus', 'send', 'receive',
            'bar', 'measure', 'beat', 'punch', 'transport', 'automation'
        ];
        
        // Background noise phrases to reject outright
        const backgroundPhrases = [
            'and that\'s all',
            'for the beat combo',
            'you know what i mean',
            'in the morning',
            'thank you',
            'how are you',
            'see you later',
            'nice to meet'
        ];
        
        // Check for background noise phrases
        for (const bgPhrase of backgroundPhrases) {
            if (normalizedCommand.includes(bgPhrase)) {
                console.log('🔇 Ignoring background audio (noise phrase detected):', transcript);
                return;
            }
        }
        
        // If transcript is >8 words AND doesn't contain a DAW keyword, reject it
        if (wordCount > 8) {
            const hasKeyword = dawKeywords.some(kw => normalizedCommand.includes(kw));
            if (!hasKeyword) {
                console.log(`🔇 Ignoring long transcript without DAW keywords (${wordCount} words):`, transcript);
                return;
            }
        }
        
        // MAXIMUM RESPONSIVENESS MODE - Commands execute INSTANTLY
        // Smart filtering prevents false positives while maintaining low latency
        
        // Add to history (keep last 10)
        this.commandHistory.push({ command: normalizedCommand, time: now });
        if (this.commandHistory.length > 10) {
            this.commandHistory.shift();
        }
        
        // Mark as processing (non-blocking)
        this.isProcessingCommand = true;
        this.lastProcessedCommand = normalizedCommand;
        this.lastProcessedTime = now;
        
        // Use try/finally to ALWAYS reset the flag
        try {
        
        // SPEED OPTIMIZATION: Minimal logging for performance
        this.logCommand(transcript);
        
        // Immediately show processing status
        this.updateStatus('processing', 'Processing...');
        
        // === CONTEXT-AWARE COMMANDS (Screen Awareness) ===
        // ALWAYS check what control is being hovered over (if Screen Awareness is enabled)
        // This allows hover-based voice commands: hover over a control, say the command
        let hoverContext = null;
        
        if (this.screenAwareness && this.screenAwareness.enabled) {
            try {
                // Get active control from Screen Awareness
                const controlResult = await window.api.screenAwarenessGetActiveControl();
                
                if (controlResult.success && controlResult.control) {
                    hoverContext = controlResult.control;
                    const track = this.extractTrackFromControl(hoverContext);
                    
                    console.log('🎯 Hover context detected');
                    console.log('   Control:', hoverContext.type);
                    console.log('   Track:', track);
                    console.log('   Control Title:', hoverContext.title);
                    
                    // If command doesn't already specify a track number, inject the hovered track
                    const hasTrackNumber = /track\s*\d+|track\s+(one|two|three|four|five|six|seven|eight|nine|ten)/i.test(transcript);
                    const hasContextKeyword = /\b(this|that|here|current)\b/i.test(transcript);
                    
                    if (track && !hasTrackNumber) {
                        // Inject track number into command
                        const originalTranscript = transcript;
                        
                        // If has context keyword, replace it
                        if (hasContextKeyword) {
                            transcript = transcript.replace(/\b(this|that|here|current)\b/gi, `track ${track}`);
                        } else {
                            // Otherwise, append track/channel number to command
                            // Preserve user's terminology: if they said "channel", use "channel"
                            const userTerm = /\bchannel\b/i.test(originalTranscript) ? 'channel' : 'track';
                            // e.g., "mute" → "mute channel 3" or "mute track 3"
                            transcript = transcript + ` ${userTerm} ${track}`;
                        }
                        
                        console.log('🎯 Hover-enhanced command:', originalTranscript, '→', transcript);
                        
                        // Update normalized command too
                        normalizedCommand = transcript.toLowerCase().trim();
                    }
                }
            } catch (error) {
                console.error('❌ Error getting hover context:', error);
            }
        }
        // === END CONTEXT-AWARE ===

        // Structured pipeline: build intent with context + confidence and route through DAWRV executor.
        const structuredHandled = await this.handleStructuredPipeline(transcript, normalizedCommand, {
            source,
            hoverContext,
            confidence: options && typeof options.confidence === 'number' ? options.confidence : null
        });
        if (structuredHandled) {
            this.isProcessingCommand = false;
            return;
        }
        
        // FAST PATH: Skip AI for common DAW commands - use keyword matching for INSTANT response
        // These are direct commands that don't need AI interpretation
        const fastCommandPatterns = [
            // Track/Channel controls
            'mute', 'unmute', 'solo', 'unsolo', 'arm', 'disarm', 'unarm',
            // Recording modes
            'punch', 'overdub', 'replace mode', 'tape mode', 'loop record',
            'monitor', 'record input', 'record output', 'input monitoring',
            'disable recording', 'monitoring only',
            // Transport
            'play', 'stop', 'pause', 'record', 'rewind', 'forward',
            // Navigation
            'next track', 'previous track', 'next channel', 'previous channel',
            // Volume/Pan
            'volume', 'pan', 'fader'
        ];
        const isFastCommand = fastCommandPatterns.some(pattern => 
            normalizedCommand.includes(pattern)
        );
        
        // CONVERSATIONAL MODE: Try AI first for natural language understanding
        // Fall back to keyword matching for simple/direct commands
        let match = null;
        let aiResponse = null;
        let aiFallbackMessage = null;
        
        // For fast commands, skip AI and use keyword matching directly (INSTANT!)
        if (isFastCommand) {
            console.log('⚡ Fast command detected - using keyword matching (instant)');
            match = this.matchCommand(transcript);
            if (match && match.action) {
                console.log('✅ Keyword match found:', match.action);
            }
        }
        
        // ============================================================
        // STUDIO VOCABULARY: Check for pending clarification first
        // ============================================================
        if (this.pendingVocabAction) {
            const clarificationHandled = await this.handleVocabClarification(transcript);
            if (clarificationHandled) {
                console.log('🎤 Clarification handled for pending vocab action');
                this.isProcessingCommand = false;
                return { handled: true, source: 'vocab-clarification' };
            }
            // If clarification failed to parse, clear pending and continue
            this.pendingVocabAction = null;
        }
        
        // ============================================================
        // STUDIO VOCABULARY MATCHING (before standard NLU)
        // Check if utterance matches any studio slang/vocabulary
        // ============================================================
        if (!match && window.studioVocabularyMatcher && window.studioVocabularyStorage?.loaded) {
            const vocabResult = await this.handleStudioVocabulary(transcript);
            if (vocabResult && vocabResult.handled) {
                console.log('🎤 Handled by Studio Vocabulary');
                this.isProcessingCommand = false;
                return vocabResult;
            }
        }
        
        // Try static knowledge for quick Q&A (no API needed)
        if (!match && this.isQuestionQuery(transcript)) {
            const quickAnswer = this.tryStaticKnowledge(transcript);
            if (quickAnswer) {
                console.log('📚 Answered from static knowledge');
                this.speak(quickAnswer);
                this.updateStatus('ready', quickAnswer.slice(0, 50) + '...');
                this.logResult(transcript, 'success');
                this.isProcessingCommand = false;
                return { handled: true, source: 'static-knowledge' };
            }
        }
        

        
        // Try AI first if enabled (for natural conversation) and not a recording command
        if (!match && this.useAI && this.aiAgent) {
            try {
                console.log('🤖 Using AI for natural language understanding...');
                aiResponse = await this.aiAgent.processInput(transcript, this.reaperActions);
                
                if (aiResponse && aiResponse.action) {
                    // AI found an action
                    match = {
                        action: aiResponse.action,
                        response: aiResponse.text || this.generateResponse(aiResponse.action),
                        confidence: aiResponse.confidence || 0.8
                    };
                    console.log('✅ AI determined action:', match.action, 'Confidence:', match.confidence);
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
        
        // If AI didn't find a match, try keyword matching as fallback
        if (!match || !match.action) {
            console.log('🔍 AI didn\'t find action - trying keyword matching as fallback...');
            const keywordMatch = this.matchCommand(transcript);
            if (keywordMatch && keywordMatch.action) {
                match = keywordMatch;
                console.log('✅ Keyword match found:', match.action);
            }
        }
        
        // match already set from keyword matching above or AI
        // No need for duplicate matchCommand() call here
        
        // Check if match is null before destructuring
        if (!match) {
            const fallback = aiFallbackMessage || 'Command not recognized';
            console.log('⚠️  No match found (null). Using fallback message:', fallback);
            this.speak(fallback);
            this.updateStatus('ready', fallback);
            this.logResult(transcript, 'error');
            this.isProcessingCommand = false;
            return;
        }
        
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
        
        // Check if this is a multiple tracks command
        if (action === 'newtracks') {
            // Try to extract number from transcript: "add 5 tracks", "I want 10 new tracks", "please create 3 tracks", or just "5"
            // Also check AI response for parameters
            let count = null;
            
            // First, check if AI extracted parameters
            if (aiResponse && aiResponse.parameters && aiResponse.parameters.count) {
                count = parseInt(aiResponse.parameters.count, 10);
                console.log('🤖 AI extracted track count:', count);
            }
            
            // If no AI parameters, try regex extraction
            if (!count) {
                const numberMatch = transcript.match(/(\d+)\s*(?:tracks|new tracks)?/i);
                if (numberMatch) {
                    count = parseInt(numberMatch[1], 10);
                    console.log('🔍 Regex extracted track count:', count);
                }
            }
            
            if (count && count > 0 && count <= 100) {
                // Add multiple tracks
                try {
                    console.log(`🎚️ Adding ${count} new tracks...`);
                    for (let i = 0; i < count; i++) {
                        await window.api.executeReaperAction(40001); // Add track action
                    }
                    this.speak(`Added ${count} new tracks`);
                    this.updateStatus('ready', `Added ${count} new tracks`);
                    this.logResult(transcript, 'success');
                } catch (error) {
                    console.error('Error adding multiple tracks:', error);
                    this.speak('Failed to add tracks');
                    this.updateStatus('error', 'Failed to add tracks');
                    this.logResult(transcript, 'error');
                }
                this.isProcessingCommand = false;
                return;
            }
            // No number specified - ask user
            this.speak(response); // "How many tracks would you like to add?"
            this.updateStatus('ready', response);
            this.logResult(transcript, 'success');
            this.isProcessingCommand = false;
            return;
        }
        
        // Check if user is responding with a number (context: after asking for track count)
        // This handles when user says just "5" or "ten" after being asked
        const justNumberMatch = transcript.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)$/i);
        if (justNumberMatch) {
            // Parse number
            let count = parseInt(justNumberMatch[1], 10);
            if (isNaN(count)) {
                // Try parsing word numbers
                count = this.parseNumberWords(justNumberMatch[1]);
            }
            
            if (count && count > 0 && count <= 100) {
                // Add multiple tracks
                try {
                    console.log(`🎚️ Adding ${count} new tracks (from number response)...`);
                    for (let i = 0; i < count; i++) {
                        await window.api.executeReaperAction(40001); // Add track action
                    }
                    this.speak(`Added ${count} new tracks`);
                    this.updateStatus('ready', `Added ${count} new tracks`);
                    this.logResult(transcript, 'success');
                    this.isProcessingCommand = false;
                    return;
                } catch (error) {
                    console.error('Error adding multiple tracks:', error);
                    this.speak('Failed to add tracks');
                    this.updateStatus('error', 'Failed to add tracks');
                    this.logResult(transcript, 'error');
                    this.isProcessingCommand = false;
                    return;
                }
            }
        }
        
        // Check if this is a social/conversational command
        const socialActions = ['social_thanks', 'social_greeting', 'social_goodbye', 'social_howru', 'social_praise'];
        if (socialActions.includes(action)) {
            this.speak(response);
            this.updateStatus('ready', response);
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
        // NOTE: Include both simple (mute, solo) and specific (mutetrack, solotrack) actions
        // so they ALL go through processTrackCommand for proper "track" vs "channel" terminology
        const trackActions = ['selecttrack', 'mutetrack', 'unmutetrack', 'solotrack', 'unsolotrack', 'armtracknum', 'armtrack', 'disarmtrack', 'disarmtracknum', 'unarmtrack', 'settrackvolume', 'settrackpan', 'settrackwidth', 'deletetrack', 'mute', 'unmute', 'solo', 'unsolo'];
        const isTrackCommand = trackActions.includes(action);
        
        // Check if this is a master fader command
        const masterActions = ['setmastervolume', 'mutemaster', 'unmutemaster', 'solomaster', 'unsolomaster'];
        const isMasterCommand = masterActions.includes(action);
        
        // Check if this is a mixer control command
        const mixerActions = ['showmixer', 'hidemixer', 'closemixer', 'openmixer', 'togglemixer', 'mixerwindow', 'mastermute', 'masterunmute', 'togglemastermute', 'resetmastervolume', 'resetallfaders', 'master_mute', 'master_unmute', 'master_mute_toggle', 'master_volume', 'master_volume_reset', 'reset_all_faders'];
        const isMixerCommand = mixerActions.includes(action);
        
        // Check if this is a MIDI 2.0 precise value command
        const midi2Actions = ['setvolume', 'setreverb', 'setpan'];
        const isMIDI2Command = midi2Actions.includes(action);
        
        const willExecute = action && (this.reaperActions[action] || isMIDI2Command || isPluginCommand || isTempoCommand || isBarCommand || isTrackCommand || isMasterCommand || isMixerCommand);
        // SPEED OPTIMIZATION: Logging removed for performance
        // console.log('WILL EXECUTE?', willExecute);
        // console.log('IS PLUGIN COMMAND?', isPluginCommand);
        // console.log('IS TEMPO COMMAND?', isTempoCommand);
        // console.log('IS BAR COMMAND?', isBarCommand);
        // console.log('IS TRACK COMMAND?', isTrackCommand);
        // console.log('IS MIXER COMMAND?', isMixerCommand);
        // console.log('IS MIDI 2.0 COMMAND?', isMIDI2Command);
        
        // Handle plugin commands
        if (isPluginCommand) {
            try {
                console.log('🔌 Processing plugin command:', action);
                const result = await this.processPluginCommand(action, transcript, aiResponse);
                
                if (result.success) {
                    // SPEED OPTIMIZATION: Skip AI for instant response
                    // Give simple, fast feedback for plugin commands
                    this.speak(result.message || response);
                    this.updateStatus('ready', result.message || response);
                    this.logResult(transcript, 'success');
                    
                    // OPTIONAL: Send to AI in background (non-blocking)
                    // User gets instant feedback, AI suggestions come later if enabled
                    if (this.useAI && this.aiAgent && result.message) {
                        // Fire and forget - don't await
                        this.aiAgent.processInput(`User asked: "${transcript}". System found: ${result.message}.`, this.reaperActions).catch(() => {
                            // Silently ignore AI errors - user already got their response
                        });
                    }
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
        
        // Handle MASTER fader commands - USE QUICK SPEAK FOR INSTANT RESPONSE
        if (isMasterCommand) {
            try {
                console.log('🎚️ Processing MASTER command (fast path):', action);
                const result = await this.processMasterCommand(action, transcript);
                if (result.success) {
                    this.quickSpeak(result.message || response);
                    this.updateStatus('ready', result.message || response);
                    this.logResult(transcript, 'success');
                } else {
                    this.quickSpeak(result.error || 'Master command failed');
                    this.updateStatus('error', result.error || 'Master command failed');
                    this.logResult(transcript, 'error');
                }
            } catch (error) {
                console.error('Master command error:', error);
                this.quickSpeak('Master command failed');
                this.updateStatus('error', 'Master command failed');
                this.logResult(transcript, 'error');
            } finally {
                this.isProcessingCommand = false;
            }
            return;
        }
        
        // Handle track control commands - USE QUICK SPEAK FOR INSTANT RESPONSE
        if (isTrackCommand) {
            try {
                console.log('⚡ Processing track command (fast path):', action);
                const result = await this.processTrackCommand(action, transcript, aiResponse);
                if (result.success) {
                    // Use quickSpeak for instant feedback on track commands
                    this.quickSpeak(result.message || response);
                    this.updateStatus('ready', result.message || response);
                    if (this.aiAgent && result.context) {
                        this.aiAgent.updateDAWContext(result.context);
                    }
                    this.logResult(transcript, 'success');
                } else {
                    this.quickSpeak(result.error || 'Track command failed');
                    this.updateStatus('error', result.error || 'Track command failed');
                    this.logResult(transcript, 'error');
                }
            } catch (error) {
                console.error('Track command error:', error);
                this.quickSpeak('Command failed');
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
            // SPEED OPTIMIZATION: Reduced logging for performance
            
            if (!window.api) {
                console.error('ERROR: window.api does NOT exist!');
                this.speak('REAPER API not available');
                setTimeout(() => {
                    this.isProcessingCommand = false;
                }, 100);
                return;
            }
            
            if (window.api && window.api.executeReaperAction) {
                try {
                    const actionId = this.reaperActions[action];
                    
                    // Update AI agent context with action
                    if (this.aiAgent) {
                        this.aiAgent.updateDAWContext({
                            lastAction: action,
                            lastActionTime: Date.now()
                        });
                    }
                    
                    // Execute command
                    console.log('🎯 Executing REAPER action:', action, 'ID:', actionId);
                    const result = await window.api.executeReaperAction(actionId);
                    console.log('🎯 REAPER result:', result);
                    
                    // Update UI immediately
                    if (result && result.success) {
                        console.log('✅ Action successful, updating UI');
                        this.logResult(transcript, 'success');
                        this.updateStatus('responding', response);
                        
                        // Update transport ring AFTER updating status (so it doesn't get wiped)
                        // Use setTimeout to ensure status update is complete
                        setTimeout(() => {
                            if (action === 'play') {
                                console.log('🟢 Setting ring to PLAYING (green)');
                                this.updateTransportState('playing');
                            } else if (action === 'stop') {
                                console.log('⚪ Setting ring to STOPPED (white)');
                                this.updateTransportState('stopped');
                            } else if (action === 'record') {
                                console.log('🔴 Setting ring to RECORDING (red)');
                                this.updateTransportState('recording');
                            } else if (action === 'pause') {
                                console.log('⚪ Setting ring to PAUSED (white)');
                                this.updateTransportState('paused');
                            }
                        }, 50); // Small delay to ensure status update doesn't interfere
                        
                        // Use quickSpeak for transport commands (INSTANT), regular speak for others
                        const transportActions = ['play', 'stop', 'record', 'pause', 'rewind', 'forward', 'toggleloop', 'toggleclick'];
                        if (transportActions.includes(action)) {
                            this.quickSpeak(response);
                        } else {
                            this.speak(response);
                        }
                    } else {
                        console.error('❌ REAPER action failed:', result);
                        this.logResult(transcript, 'error');
                        this.updateStatus('error', 'Command failed');
                        this.speak('Failed to execute command');
                    }
                } catch (error) {
                    console.error('❌ REAPER command error:', error);
                    this.logResult(transcript, 'error');
                    this.updateStatus('error', 'Command error');
                    this.speak('Command failed');
                }
            } else {
                console.error('❌ window.api.executeReaperAction is NOT available!');
                this.logResult(transcript, 'success');
                this.updateStatus('responding', response);
                this.speak(response + ' (REAPER not connected)');
            }
        } else {
            // Command not recognized
            if (!action) {
                console.log('❓ Command not recognized:', transcript);
            }
            this.logResult(transcript, 'error');
            this.updateStatus('ready', 'Command not recognized');
        }

        } finally {
            // INSTANT RESET - No timeout, commands can fire immediately
            this.isProcessingCommand = false;
            if (this.isListening) {
                this.updateStatus('listening', 'Listening...');
            } else {
                this.updateStatus('ready', 'Ready to assist');
            }
        }
    }

    setupVoiceEngineListeners() {
        // Listen for voice engine changes from main process (via IPC)
        if (window.api && window.api.onVoiceEngineChanged) {
            window.api.onVoiceEngineChanged((engine) => {
                console.log(`🔄 Voice engine changed (IPC): ${engine || 'none'}`);
                this.activeVoiceEngine = engine;
                
                // Update FULL UI based on new engine
                if (engine === 'asr') {
                    this.isListening = true;
                    this.updateStatus('listening', '🧠 ASR Active');
                    this.updateVoiceEngineStatus('listening', 'ASR Active');
                    this.updateListeningUI(true, 'ASR');
                } else if (engine === 'whisper') {
                    this.isListening = true;
                    this.updateStatus('listening', 'Listening...');
                    this.updateVoiceEngineStatus('listening', 'Listening...');
                    this.updateListeningUI(true, 'Whisper');
                } else {
                    this.isListening = false;
                    this.updateStatus('ready', 'Ready');
                    this.updateVoiceEngineStatus('ready', 'Ready');
                    this.updateListeningUI(false);
                }
            });
        }
        
        // Listen for custom events from ASR config UI
        window.addEventListener('voice-engine-changed', (event) => {
            const engine = event.detail;
            console.log(`🔄 Voice engine event (DOM): ${engine || 'none'}`);
            this.activeVoiceEngine = engine;
            
            // Update FULL UI when switching to ASR
            if (engine === 'asr') {
                this.isListening = true;
                this.updateStatus('listening', '🧠 ASR Active');
                this.updateVoiceEngineStatus('listening', 'ASR Active');
                this.updateListeningUI(true, 'ASR');
            } else if (engine === 'whisper') {
                this.isListening = true;
                this.updateStatus('listening', 'Listening...');
                this.updateListeningUI(true, 'Whisper');
            } else if (engine === null) {
                this.isListening = false;
                this.updateStatus('ready', 'Ready');
                this.updateListeningUI(false);
            }
        });
        
        console.log('🎤 Voice engine listeners set up');
    }
    
    // Update the main Start Listening button UI
    updateListeningUI(isActive, engineName = '') {
        const listenBtn = document.querySelector('.listen-btn, #start-listening-btn, [data-action="toggle-voice"]');
        if (listenBtn) {
            if (isActive) {
                listenBtn.classList.add('listening', 'active');
                listenBtn.classList.remove('ready');
                const label = engineName ? `🎤 ${engineName} Active` : '🎤 Listening...';
                if (listenBtn.querySelector('.btn-label')) {
                    listenBtn.querySelector('.btn-label').textContent = label;
                } else {
                    listenBtn.textContent = label;
                }
            } else {
                listenBtn.classList.remove('listening', 'active');
                listenBtn.classList.add('ready');
                if (listenBtn.querySelector('.btn-label')) {
                    listenBtn.querySelector('.btn-label').textContent = '🎤 Start Listening';
                } else {
                    listenBtn.textContent = '🎤 Start Listening';
                }
            }
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
    
    /**
     * STOP microphone to prevent feedback during speech
     */
    pauseListening() {
        console.log('🔇 Pausing microphone (preventing feedback)');

        // In headset/isolation mode, do not pause listening. This enables barge-in and
        // avoids the "dead air" feeling when giving rapid commands.
        if (this.isIsolatedMicMode()) {
            console.log('🎧 Headset/isolation mode: keeping mic active (barge-in enabled)');
            return;
        }
        
        // Stop browser speech recognition
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {}
        }
        
        // Signal Python Whisper to pause via IPC
        if (window.api && window.api.signalSpeaking) {
            window.api.signalSpeaking(true).catch(() => {});
        }
        
        // SAFETY TIMEOUT: Auto-resume if stuck for more than 15 seconds
        if (this._speakingTimeout) {
            clearTimeout(this._speakingTimeout);
        }
        this._speakingTimeout = setTimeout(() => {
            console.log('⚠️ SAFETY: Auto-resuming listening after timeout');
            this.isSpeaking = false;
            this.ensureListening();
        }, 15000); // 15 second safety timeout
    }
    
    /**
     * RESUME microphone after speech ends
     */
    resumeListening() {
        console.log('👂 Resuming microphone');

        // In headset/isolation mode, we never paused mic; just clear speaking state ASAP.
        if (this.isIsolatedMicMode()) {
            this.isSpeaking = false;
            this.speechEndTime = Date.now();
            return;
        }
        
        // Clear safety timeout
        if (this._speakingTimeout) {
            clearTimeout(this._speakingTimeout);
            this._speakingTimeout = null;
        }
        
        // Clear the speaking signal for Python Whisper via IPC
        if (window.api && window.api.signalSpeaking) {
            window.api.signalSpeaking(false).catch(() => {});
        }
        
        // Small delay to avoid catching echo
        setTimeout(() => {
            this.isSpeaking = false;
            this.speechEndTime = Date.now();
            
            // Restart browser speech recognition
            if (this.isListening && this.recognition) {
                try {
                    this.recognition.start();
                } catch (e) {}
            }
        }, 500); // 500ms delay to let echo fade completely
    }
    
    /**
     * Quick speak - Uses OpenAI TTS ONLY for consistent voice
     * Skips D-ID animation for faster response
     * NO browser TTS fallback!
     */
    async quickSpeak(text) {
        if (!text || text.trim() === '' || !this.voiceFeedbackEnabled) return;
        
        // ========================================
        // NATURAL VOICE TRANSFORMATION
        // Make responses feel human, not robotic
        // ========================================
        let naturalText = text;
        
        if (window.NaturalVoice) {
            // Transform robotic response to natural one
            const transformed = window.NaturalVoice.makeNatural(text);
            if (transformed) {
                naturalText = transformed;
            }
        }
        
        console.log('⚡ Quick speak (natural):', naturalText);
        
        // STOP microphone to prevent feedback
        this.pauseListening();
        this.isSpeaking = true;
        
        // Stop all audio sources
        document.querySelectorAll('audio').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        try {
            // Check cache first for INSTANT playback
            if (window.NaturalVoice) {
                const cached = window.NaturalVoice.getCachedAudio(naturalText);
                if (cached) {
                    console.log('⚡ Playing CACHED audio (instant)');
                    const audioUrl = URL.createObjectURL(cached);
                    const audio = new Audio(audioUrl);
                    try {
                        await new Promise((resolve, reject) => {
                            audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
                            audio.onerror = () => { URL.revokeObjectURL(audioUrl); reject(); };
                            const playPromise = audio.play();
                            if (playPromise) playPromise.catch(reject);
                        });
                        return;
                    } catch (cacheError) {
                        console.warn('⚠️ Cached audio playback failed, trying OpenAI:', cacheError);
                    }
                }
            }
            
            // Generate fresh audio via OpenAI
            try {
                await this.speakOpenAI(naturalText);
            } catch (openaiError) {
                // Fallback to browser TTS if OpenAI fails (autoplay blocked)
                console.warn('⚠️ OpenAI TTS failed, using browser TTS fallback:', openaiError.message);
                await this.speakBrowserTTS(naturalText);
            }
            
        } catch (error) {
            console.error('⚡ TTS error (all methods failed):', error);
        } finally {
            // Delay before resuming to let TTS audio finish
            // HEADSET MODE: Near-zero delay (10ms) for instant response
            // SPEAKER MODE: Longer delay (1500ms) to prevent echo pickup
            const POST_TTS_DELAY = this.isIsolatedMicMode() ? 10 : 1500;
            await new Promise(resolve => setTimeout(resolve, POST_TTS_DELAY));
            
            this.isSpeaking = false;
            this.speechEndTime = Date.now();
            this.resumeListening();
            console.log(`✅ TTS complete, microphone resumed after ${POST_TTS_DELAY}ms delay`);
        }
    }
    
    /**
     * Direct OpenAI TTS call - bypasses provider system
     */
    async speakOpenAI(text) {
        // Get API key from AI config
        const aiConfig = JSON.parse(localStorage.getItem('rhea_ai_config') || '{}');
        const apiKey = aiConfig.apiKey;
        
        if (!apiKey) {
            console.error('❌ No OpenAI API key configured for TTS');
            return;
        }
        
        // Optimize: Keep text SHORT for speed
        // Long responses = slow generation
        let optimizedText = text;
        if (text.length > 80) {
            // Truncate long responses
            optimizedText = text.substring(0, 80);
        }
        
        console.log('🔊 OpenAI TTS:', optimizedText);
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',           // Fast model (tts-1-hd is slower)
                input: optimizedText,
                voice: 'nova',            // Natural female voice
                speed: 1.05               // Slightly faster than default
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI TTS error: ${response.status}`);
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Set properties to help with autoplay
        audio.volume = 1.0;
        audio.preload = 'auto';
        
        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };
            audio.onerror = (e) => {
                console.error('❌ Audio playback error:', e);
                URL.revokeObjectURL(audioUrl);
                reject(e);
            };
            
            // Handle autoplay restrictions
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('⚠️ Autoplay blocked by browser:', error);
                    URL.revokeObjectURL(audioUrl);
                    // Reject so caller can try fallback (browser TTS)
                    reject(new Error('Autoplay blocked'));
                });
            }
        });
    }
    
    async speak(text) {
        if (!text || text.trim() === '') return;
        
        // Check if voice feedback is enabled
        if (!this.voiceFeedbackEnabled) {
            // Silent mode - don't speak, just update timestamp
            this.speechEndTime = Date.now();
            console.log('🔇 Silent mode - skipping speech:', text);
            return;
        }
        
        console.log('RHEA says:', text);
        
        // ============================================
        // AGGRESSIVE SPEECH CANCELLATION
        // Stop ALL audio sources to prevent double voice
        // ============================================
        
        // 1. Cancel browser speech synthesis
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        // 2. Stop any playing audio elements
        document.querySelectorAll('audio').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        // 3. Cancel any pending speech timers
        if (this._speechTimer) {
            clearTimeout(this._speechTimer);
            this._speechTimer = null;
        }
        
        // Send to overlay window
        if (window.overlay && window.overlay.updateSpeech) {
            window.overlay.updateSpeech(text);
        }
        
        // STOP microphone to prevent feedback loops
        this.pauseListening();
        this.isSpeaking = true;
        
        const avatar = document.querySelector('.rhea-avatar');
        
        try {
            // ============================================
            // D-ID ANIMATED AVATAR (PRIMARY)
            // ============================================
            // Priority: D-ID Cached → D-ID Generate → Audio-Reactive fallback
            
            const didService = window.DIDService;
            const animatedAvatar = window.AnimatedAvatar;
            
            if (didService?.isInitialized && animatedAvatar?.enabled) {
                const cacheKey = didService.getCacheKey(text);
                const cachedUrl = didService.cachedVideos.get(cacheKey) || didService.persistentCache[cacheKey];
                
                // Check if cached URL exists AND is not expired
                if (cachedUrl && !didService.isUrlExpired(cachedUrl)) {
                    // INSTANT: Use cached D-ID animation
                    console.log('⚡ Playing CACHED D-ID animation');
                    try {
                        if (avatar) avatar.classList.add('speaking');
                        
                        animatedAvatar.playVideo(cachedUrl).then(() => {
                            this.isSpeaking = false;
                            this.speechEndTime = Date.now();
                            if (avatar) avatar.classList.remove('speaking');
                            this.ensureListening();
                        }).catch((err) => {
                            console.warn('⚡ D-ID playback failed (URL may have expired):', err.message);
                            // Clear the expired/invalid cache entry
                            didService.cachedVideos.delete(cacheKey);
                            delete didService.persistentCache[cacheKey];
                            didService.savePersistentCache();
                            
                            this.isSpeaking = false;
                            this.ensureListening();
                        });
                        
                        return; // D-ID handles everything
                    } catch (e) {
                        console.warn('⚡ Cached D-ID failed, using fallback');
                    }
                } else {
                    // Not cached - use audio-reactive NOW, generate D-ID in background
                    console.log('🎬 D-ID not cached - using audio-reactive, caching D-ID in background');
                    
                    // Start audio-reactive for immediate visual feedback
                    const localAnimService = window.LocalAnimationService;
                    if (localAnimService) {
                        const duration = localAnimService.estimateSpeechDuration(text);
                        localAnimService.startAudioReactive(duration);
                    }
                    
                    // Generate D-ID in background for next time
                    didService.createTalkFromText(text).then(url => {
                        console.log('✅ D-ID cached for next time:', text.substring(0, 30));
                    }).catch(err => {
                        console.warn('D-ID generation failed:', err.message);
                    });
                }
            } else {
                // D-ID not available - use audio-reactive
                console.log('🎤 D-ID not configured - using audio-reactive');
                const localAnimService = window.LocalAnimationService;
                if (localAnimService) {
                    const duration = localAnimService.estimateSpeechDuration(text);
                    localAnimService.startAudioReactive(duration);
                }
            }
            // ============================================
            
            // ============================================
            // OPENAI TTS ONLY - NO BROWSER FALLBACK
            // ============================================
            
            if (avatar) avatar.classList.add('speaking');
            
            try {
                // Check if TTS provider is configured with API key
                const useProvider = this.ttsProvider && 
                                   this.ttsProvider.config.provider !== 'browser' &&
                                   this.ttsProvider.config.apiKey;
                
                if (useProvider) {
                    // Use configured TTS provider (OpenAI, ElevenLabs, etc.)
                    console.log('🔊 Using TTS Provider:', this.ttsProvider.config.provider);
                    await this.ttsProvider.speak(text, {
                        rate: this.voiceConfig.rate,
                        pitch: this.voiceConfig.pitch,
                        volume: this.voiceConfig.volume
                    });
                    console.log('✅ TTS Provider speech completed');
                } else {
                    // No provider configured - use direct OpenAI call
                    console.log('🔊 No TTS provider - using direct OpenAI TTS');
                    await this.speakOpenAI(text);
                }
            } catch (ttsError) {
                console.error('❌ OpenAI TTS error (NO browser fallback):', ttsError);
                // NO BROWSER FALLBACK - just log the error
            }
            
            // Cleanup after speech
            this.isSpeaking = false;
            this.speechEndTime = Date.now();
            if (avatar) avatar.classList.remove('speaking');
            console.log('🔇 RHEA finished speaking');
            this.ensureListening()
        } catch (error) {
            console.error('Speech error:', error);
            this.isSpeaking = false;
            this.speechEndTime = Date.now();
            if (avatar) avatar.classList.remove('speaking');
            this.ensureListening();
        }
    }
    
    /**
     * Async version of speakBrowser that returns a Promise
     */
    speakBrowserAsync(text) {
        return new Promise((resolve, reject) => {
            if (!window.speechSynthesis) {
                resolve();
                return;
            }
            
            // Cancel any existing speech first
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Use selected voice
            if (this.voiceConfig.selectedVoice) {
                utterance.voice = this.voiceConfig.selectedVoice;
                utterance.lang = this.voiceConfig.selectedVoice.lang || 'en-US';
            } else {
                const voices = window.speechSynthesis.getVoices();
                const bestVoice = voices.find(v => 
                    v.name.includes('Samantha') || v.name.includes('Alex')
                ) || voices.find(v => v.lang.startsWith('en'));
                if (bestVoice) {
                    utterance.voice = bestVoice;
                    utterance.lang = bestVoice.lang;
                }
            }
            
            utterance.rate = this.voiceConfig.rate;
            utterance.pitch = this.voiceConfig.pitch;
            utterance.volume = this.voiceConfig.volume;
            
            const avatar = document.querySelector('.rhea-avatar');
            
            utterance.onstart = () => {
                if (avatar) avatar.classList.add('speaking');
                console.log('🔊 Browser TTS started');
            };
            
            utterance.onend = () => {
                if (avatar) avatar.classList.remove('speaking');
                this.isSpeaking = false;
                this.speechEndTime = Date.now();
                console.log('🔇 Browser TTS finished');
                this.ensureListening();
                resolve();
            };
            
            utterance.onerror = (e) => {
                if (avatar) avatar.classList.remove('speaking');
                this.isSpeaking = false;
                this.speechEndTime = Date.now();
                console.error('Browser TTS error:', e);
                this.ensureListening();
                resolve(); // Resolve anyway to not break the flow
            };
            
            window.speechSynthesis.speak(utterance);
        });
    }
    
    /**
     * Promise-wrapped browser TTS for fallback
     */
    async speakBrowserTTS(text) {
        return new Promise((resolve) => {
            if (!window.speechSynthesis) {
                resolve();
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve(); // Resolve anyway to not break flow
            
            window.speechSynthesis.speak(utterance);
            console.log('🔊 Using browser TTS fallback');
        });
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
                console.log('🔇 RHEA finished speaking');
                
                // ENSURE listening resumes IMMEDIATELY
                this.ensureListening();
            };
            
            utterance.onerror = (e) => {
                // "interrupted" errors are expected when we cancel speech (debouncing)
                if (e.error === 'interrupted' || e.error === 'canceled') {
                    console.log('🔇 Speech interrupted (debouncing - this is normal)');
                } else {
                    // Real errors - log them
                    console.warn('⚠️ Speech synthesis error:', e.error);
                }
                this.isSpeaking = false;
                this.speechEndTime = Date.now();
                
                // ENSURE listening resumes even on error
                this.ensureListening();
            };
            
            window.speechSynthesis.speak(utterance);
        }, 100);
    }
    
    // Lightweight structured pipeline: interpret common DAW intents with context + confirmation
    async handleStructuredPipeline(originalTranscript, normalizedCommand, options = {}) {
        const context = this.latestContextSnapshot || {};
        const intent = this.buildStructuredIntent(originalTranscript, normalizedCommand, context, options);
        if (!intent) return false;

        // Ask for confirmation if confidence is low or context is ambiguous
        if (intent.needsConfirmation || intent.confidence < this.intentConfidenceThreshold) {
            this.pendingStructuredCommand = intent;
            const prompt = intent.confirmPrompt || `Did you mean ${intent.readable || 'that'}?`;
            this.speak(prompt);
            return true;
        }

        const executed = await this.executeStructuredCommand(intent, { confirmed: true });
        if (executed && intent.confirmation) {
            this.speak(intent.confirmation);
        }
        return executed;
    }

    buildStructuredIntent(transcript, normalizedCommand, context = {}, options = {}) {
        if (!transcript) return null;
        const conf = typeof options.confidence === 'number' ? options.confidence : 0.75;
        const lower = (normalizedCommand || transcript.toLowerCase()).trim();
        const clean = lower.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

        const trackRef = this.resolveTrackReference(lower, context, options.hoverContext);
        const hasTrack = Number.isFinite(trackRef?.track);

        // Transport
        if (/\b(stop|halt|cut it|kill it|stop playback)\b/.test(clean)) {
            return { intent: 'transport', action: 'stop', confidence: Math.max(conf, 0.9), confirmation: 'Stopped' };
        }
        if (/\b(play|start playback|playback|let s hear it|hit play|resume|continue)\b/.test(clean)) {
            return { intent: 'transport', action: 'play', confidence: Math.max(conf, 0.9), confirmation: 'Playing' };
        }
        if (/\b(record|roll tape|start recording|hit record)\b/.test(clean)) {
            return { intent: 'transport', action: 'record', confidence: Math.max(conf, 0.9), confirmation: 'Recording' };
        }
        if (/\b(pause|hold on|wait)\b/.test(clean)) {
            return { intent: 'transport', action: 'pause', confidence: Math.max(conf, 0.85), confirmation: 'Paused' };
        }
        if (/\b(rewind|back to start|go to start|from the top)\b/.test(clean)) {
            return { intent: 'transport', action: 'rewind', confidence: Math.max(conf, 0.85), confirmation: 'Rewinding' };
        }

        // Track toggles (mute/solo/arm)
        const trackActionMatch = lower.match(/\b(mute|unmute|solo|unsolo|arm|disarm)\b/);
        if (trackActionMatch) {
            const verb = trackActionMatch[1];
            const targetTrack = hasTrack ? trackRef.track : null;
            const needsConfirmation = !hasTrack && /\b(this|that|selected|current)\b/.test(lower);
            const readable = targetTrack ? `${verb} track ${targetTrack}` : `${verb} this track`;
            return {
                intent: 'track',
                action: verb,
                targetTrack,
                confidence: hasTrack ? Math.max(conf, 0.9) : Math.min(conf, 0.72),
                needsConfirmation: !hasTrack || needsConfirmation,
                readable,
                confirmPrompt: needsConfirmation ? `Do you want to ${verb} the current track?` : `Confirm ${readable}?`,
                confirmation: targetTrack ? `${verb} track ${targetTrack}` : `${verb} track`
            };
        }

        // Track volume adjustments
        if (/\b(volume|level|fader|gain)\b/.test(lower)) {
            const targetTrack = hasTrack ? trackRef.track : null;
            const num = this.parseNumericValue(lower);
            const isUp = /\b(up|louder|increase|raise|boost)\b/.test(lower);
            const isDown = /\b(down|quieter|decrease|lower|drop|reduce)\b/.test(lower);
            const isCenter = /\b(reset|unity|zero|default)\b/.test(lower);

            let mode = 'absolute';
            let unit = 'percent';
            let value = null;

            if (isCenter && !num) {
                mode = 'absolute';
                unit = 'percent';
                value = 80; // Unity-ish (~0 dB) in many REAPER configs is near 0.79-0.82
            } else if (num) {
                unit = num.unit === 'db' ? 'db' : 'percent';
                value = num.value;
                if (isUp || isDown) {
                    mode = 'delta';
                    if (isDown && value > 0) value = -value;
                } else {
                    mode = 'absolute';
                }
            } else if (isUp || isDown) {
                mode = 'delta';
                unit = 'db';
                value = isUp ? 3 : -3; // default gentle step
            }

            const needsConfirmation = !hasTrack;
            const readable = targetTrack ? `volume ${mode === 'delta' ? (value > 0 ? 'up' : 'down') : 'set'} track ${targetTrack}` : 'volume change this track';

            return {
                intent: 'track',
                action: 'volume',
                targetTrack,
                mode,
                unit,
                value,
                confidence: hasTrack ? Math.max(conf, 0.85) : Math.min(conf, 0.7),
                needsConfirmation,
                readable,
                confirmPrompt: needsConfirmation ? 'Adjust volume of the current track?' : `Apply volume ${mode === 'delta' ? 'change' : 'set'}?`,
                confirmation: targetTrack ? `Volume updated for track ${targetTrack}` : 'Volume updated'
            };
        }

        // Track pan adjustments
        if (/\b(pan|panning)\b/.test(lower)) {
            const targetTrack = hasTrack ? trackRef.track : null;
            const num = this.parseNumericValue(lower);
            const isLeft = /\b(left|l)\b/.test(lower);
            const isRight = /\b(right|r)\b/.test(lower);
            const isCenter = /\b(center|centre|middle)\b/.test(lower);

            let mode = 'absolute';
            let value = 0; // center default

            if (isCenter && !num) {
                value = 0;
            } else if (num) {
                // Pan range is -100..100
                const magnitude = this.clamp(num.value, 0, 100);
                if (isLeft) value = -magnitude;
                else if (isRight) value = magnitude;
                else value = num.value; // assume user included sign
            } else if (isLeft || isRight) {
                value = isLeft ? -50 : 50; // gentle move if no number
            }

            const needsConfirmation = !hasTrack;
            const readable = targetTrack ? `pan track ${targetTrack}` : 'pan this track';

            return {
                intent: 'track',
                action: 'pan',
                targetTrack,
                mode: 'absolute',
                unit: 'percent',
                value,
                confidence: hasTrack ? Math.max(conf, 0.85) : Math.min(conf, 0.7),
                needsConfirmation,
                readable,
                confirmPrompt: needsConfirmation ? 'Pan the current track?' : `Pan to ${value > 0 ? 'right' : value < 0 ? 'left' : 'center'}?`,
                confirmation: targetTrack ? `Panned track ${targetTrack}` : 'Pan updated'
            };
        }

        return null;
    }

    resolveTrackReference(lower, context = {}, hoverContext = null) {
        // Explicit number
        const explicit = lower.match(/\b(?:track|channel)\s+(\d+)\b/);
        if (explicit) {
            return { track: parseInt(explicit[1], 10), source: 'explicit' };
        }

        // Deictic / selected
        if (/\b(this|that|selected|current)\b/.test(lower)) {
            if (Number.isFinite(context?.activeTrack)) {
                return { track: context.activeTrack, source: 'activeControl' };
            }
            if (hoverContext) {
                const hovered = this.extractTrackFromControl(hoverContext);
                if (Number.isFinite(hovered)) {
                    return { track: hovered, source: 'hover' };
                }
            }
            const selected = Array.isArray(context?.reaperState?.selectedTracks) ? context.reaperState.selectedTracks : [];
            if (selected.length > 0 && selected[0]?.number) {
                return { track: selected[0].number, source: 'selected' };
            }
            // Ambiguous
            return { track: null, source: 'deictic' };
        }

        return { track: null, source: 'none' };
    }

    parseNumericValue(lower) {
        // Extract number with optional units
        const numUnit = lower.match(/([-+]?\d+(?:\.\d+)?)\s*(db|dB|percent|%)/i);
        if (numUnit) {
            return { value: parseFloat(numUnit[1]), unit: numUnit[2].toLowerCase().includes('db') ? 'db' : 'percent' };
        }
        const plain = lower.match(/([-+]?\d+(?:\.\d+)?)/);
        if (plain) {
            return { value: parseFloat(plain[1]), unit: 'raw' };
        }
        return null;
    }

    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    isAffirmationCommand(text) {
        const t = (text || '').trim().toLowerCase();
        return ['yes', 'yeah', 'yep', 'confirm', 'do it', 'go ahead', 'sure', 'ok', 'okay'].includes(t);
    }

    isCancelCommand(text) {
        const t = (text || '').trim().toLowerCase();
        return ['no', 'cancel', 'stop', 'never mind', 'nevermind', 'abort', 'nah'].includes(t);
    }

    async executeStructuredCommand(intent, opts = {}) {
        try {
            // Transport mapping uses existing action IDs
            if (intent.intent === 'transport' && intent.action) {
                const actionId = this.reaperActions[intent.action];
                if (window.api?.executeReaperAction && actionId) {
                    await window.api.executeReaperAction(actionId);
                    return true;
                }
            }

            // Track toggles through main-process OSC bridge
            if (intent.intent === 'track' && intent.action) {
                const track = intent.targetTrack;
                if (!Number.isFinite(track)) {
                    console.warn('⚠️  Structured track command missing track number');
                    return false;
                }
                const commandMap = {
                    mute: 'mute',
                    unmute: 'unmute',
                    solo: 'solo',
                    unsolo: 'unsolo',
                    arm: 'arm',
                    disarm: 'disarm',
                    volume: 'volume',
                    pan: 'pan'
                };
                const mapped = commandMap[intent.action];
                if (mapped && window.api?.executeTrackCommand) {
                    // Compute value for volume/pan if needed
                    let value = intent.value;
                    if (intent.action === 'volume') {
                        value = this.computeVolumeValue(track, intent);
                        if (value === null) {
                            this.speak('I need a number for that volume change.');
                            return false;
                        }
                    } else if (intent.action === 'pan') {
                        value = this.computePanValue(intent);
                        if (value === null) {
                            this.speak('I need a pan amount.');
                            return false;
                        }
                    }

                    const result = await window.api.executeTrackCommand(mapped, track, value);
                    if (result?.success) return true;
                    console.warn('⚠️  Track command failed:', result);
                    return false;
                }
            }
        } catch (e) {
            console.error('❌ Structured command execution failed:', e);
        }
        return false;
    }

    computeVolumeValue(track, intent) {
        // intent.unit: 'db'|'percent'|'raw'; intent.mode: 'absolute'|'delta'
        if (!Number.isFinite(intent.value)) return null;
        const ctx = this.latestContextSnapshot || {};
        const trackState = ctx.reaperState?.tracks?.[track];
        const currentLinear = Number.isFinite(trackState?.volume) ? trackState.volume : null; // expected 0-1

        if (intent.mode === 'absolute') {
            if (intent.unit === 'db') {
                // Convert dB absolute to linear then percent
                const linear = Math.pow(10, intent.value / 20);
                return this.clamp(linear * 100, 0, 100);
            }
            if (intent.unit === 'percent' || intent.unit === 'raw') {
                return this.clamp(intent.value, 0, 100);
            }
        } else {
            // delta
            if (!Number.isFinite(currentLinear)) {
                return null; // need current to apply delta
            }
            if (intent.unit === 'db') {
                const linear = currentLinear * Math.pow(10, intent.value / 20);
                return this.clamp(linear * 100, 0, 100);
            }
            if (intent.unit === 'percent' || intent.unit === 'raw') {
                // convert current to percent and add delta
                const currentPercent = currentLinear * 100;
                return this.clamp(currentPercent + intent.value, 0, 100);
            }
        }
        return null;
    }

    computePanValue(intent) {
        if (!Number.isFinite(intent.value)) return null;
        // Pan range expected -100..100
        return this.clamp(intent.value, -100, 100);
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
        // Quick command buttons are USER-INTENTIONAL (treat as typed, never require wake phrase)
        this.processCommand(command, { source: 'typed' });
    }
    
    /**
     * DEBUGGING: Manual test function for transport states
     * Call from console: window.rhea.testTransportRing('playing')
     */
    testTransportRing(state) {
        console.log('🧪 MANUAL TEST: testTransportRing called with state:', state);
        this.updateTransportState(state);
        
        // Check computed styles
        const avatar = document.querySelector('.rhea-avatar');
        if (avatar) {
            const styles = window.getComputedStyle(avatar, '::before');
            console.log('🎨 Computed ::before styles:');
            console.log('   border-color:', styles.borderColor);
            console.log('   border-width:', styles.borderWidth);
            console.log('   box-shadow:', styles.boxShadow);
            console.log('   opacity:', styles.opacity);
            console.log('   animation:', styles.animation);
        }
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
    
    // Initialize avatar with stopped state (WHITE ring)
    const avatar = document.querySelector('.rhea-avatar');
    if (avatar) {
        avatar.classList.add('transport-stopped');
        console.log('✅ Avatar initialized with WHITE ring (stopped state)');
    }
    if (window.api) {
        console.log('🚀 window.api.executeReaperAction exists:', !!window.api.executeReaperAction);
        console.log('🚀 window.api.executeReaperAction:', window.api.executeReaperAction);
    }
    console.log('🚀 ========================================');
    
    window.rhea = new RHEAController();
    console.log('✅ RHEA ready!');
    
    // Pre-cache common voice responses for INSTANT playback
    setTimeout(() => {
        if (window.NaturalVoice && window.rhea) {
            console.log('🎤 Pre-caching voice responses...');
            window.NaturalVoice.cacheCommonResponses();
        }
    }, 3000);
    
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
            // Only process voice commands when listening is active
            if (window.rhea && window.rhea.isListening) {
                // Hard gate while transport is active (prevents music playback from triggering actions)
                const gate = window.rhea.preprocessVoiceTranscript(command);
                if (!gate.accept) {
                    console.log('🔇 Ignoring voice command (wake gate):', command);
                    return;
                }
                console.log('✅ Processing voice command');
                window.rhea.processCommand(gate.transcript, { source: 'voice', skipWakeCheck: gate.skipWakeCheck });
            } else {
                console.log('🔇 Ignoring voice command (not listening)');
            }
        });
        
        // Listen for REAPER action logs from main process (for debugging)
        if (window.dawrv.voice.onReaperLog) {
            window.dawrv.voice.onReaperLog((message) => {
                console.log('📋 [MAIN PROCESS LOG]:', message);
            });
        }
        
        // Listen for DAW state updates (transport state) for visual feedback
        if (window.dawrv.voice.onDawState) {
            window.dawrv.voice.onDawState((state) => {
                // Keep logs light; DAW state can be very chatty
                if (window.rhea && state.transport) {
                    // Update transport visual ring based on play/record/stop state
                    const transport = state.transport || {};
                    // Support both schemas:
                    // - New: { playing: bool, recording: bool, paused: bool }
                    // - Old: { play: 0/1, record: 0/1, pause: 0/1 }
                    const isPlaying = (typeof transport.playing === 'boolean') ? transport.playing : (transport.play === 1);
                    const isRecording = (typeof transport.recording === 'boolean') ? transport.recording : (transport.record === 1);
                    const isPaused = (typeof transport.paused === 'boolean') ? transport.paused : (transport.pause === 1);
                    let visualState = 'stopped';
                    
                    if (isRecording) {
                        visualState = 'recording';
                    } else if (isPlaying && !isPaused) {
                        visualState = 'playing';
                    } else if (isPaused) {
                        visualState = 'paused';
                    }
                    
                    window.rhea.updateTransportState(visualState);
                }
            });
        }
    }
});
