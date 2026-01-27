/**
 * Voice Pipeline Integration
 * ==========================
 * Ties together all voice pipeline components:
 * - VoicePipeline (state machine)
 * - CommandHUD (visual feedback)
 * - VoiceLogger (persistent logging)
 * - VoiceReplayHarness (testing)
 * - Screen Awareness integration
 * - ASR service integration
 */

class VoicePipelineIntegration {
    constructor(options = {}) {
        this.options = {
            enableHUD: options.enableHUD !== false,
            enableLogging: options.enableLogging !== false,
            enableReplayHarness: options.enableReplayHarness !== false,
            hudPosition: options.hudPosition || 'top-right',
            confidenceThreshold: options.confidenceThreshold || 0.70,
            confirmationThreshold: options.confirmationThreshold || 0.85,
            cancelWindowMs: options.cancelWindowMs || 500,
            enableBargeIn: options.enableBargeIn !== false,
            enableTwoPassASR: options.enableTwoPassASR !== false,
            enableCancelWindow: options.enableCancelWindow !== false,
            wakeWordRequired: options.wakeWordRequired || false,
            ...options
        };
        
        // Components
        this.pipeline = null;
        this.hud = null;
        this.logger = null;
        this.harness = null;
        
        // External references
        this.rhea = options.rhea || null;
        this.screenAwarenessUI = options.screenAwarenessUI || null;
        
        // State
        this.isInitialized = false;
        
        console.log('🔗 Voice Pipeline Integration created');
    }
    
    /**
     * Initialize all components
     */
    async init() {
        if (this.isInitialized) {
            console.warn('Voice Pipeline Integration already initialized');
            return;
        }
        
        console.log('🔗 Initializing Voice Pipeline Integration...');
        
        // 1. Create pipeline
        this.pipeline = new VoicePipeline({
            confidenceThreshold: this.options.confidenceThreshold,
            confirmationThreshold: this.options.confirmationThreshold,
            cancelWindowMs: this.options.cancelWindowMs,
            enableBargeIn: this.options.enableBargeIn,
            enableTwoPassASR: this.options.enableTwoPassASR,
            enableCancelWindow: this.options.enableCancelWindow,
            wakeWordRequired: this.options.wakeWordRequired,
            wakeWords: this.options.wakeWords
        });
        
        // 2. Create logger
        if (this.options.enableLogging) {
            this.logger = new VoiceLogger({
                storageKey: 'dawrv_voice_log',
                maxEntries: 10000,
                autoSave: true
            });
            
            // Wire logger to pipeline events
            this.wireLogger();
        }
        
        // 3. Create HUD
        if (this.options.enableHUD) {
            this.hud = new CommandHUD(this.pipeline, {
                position: this.options.hudPosition,
                showMetrics: true,
                showLog: false,
                theme: 'dark'
            });
        }
        
        // 4. Create replay harness
        if (this.options.enableReplayHarness) {
            this.harness = new VoiceReplayHarness(this.pipeline, {
                storageKey: 'dawrv_voice_tests'
            });
            
            // Load standard tests
            this.harness.loadStandardTests();
        }
        
        // 5. Wire ASR events
        this.wireASREvents();
        
        // 6. Wire screen awareness
        this.wireScreenAwareness();
        
        // 7. Wire TTS
        this.wireTTS();
        
        // 8. Wire to existing RHEA if available
        this.wireRHEA();
        
        this.isInitialized = true;
        console.log('✅ Voice Pipeline Integration initialized');
        
        return this;
    }
    
    /**
     * Wire logger to pipeline events
     */
    wireLogger() {
        if (!this.pipeline || !this.logger) return;
        
        this.pipeline.on('state-change', (data) => {
            this.logger.logStateChange(data.from, data.to);
        });
        
        this.pipeline.on('intent', (intent) => {
            this.logger.logIntent(intent, this.pipeline.currentTranscript?.text);
        });
        
        this.pipeline.on('execution-complete', (data) => {
            this.logger.logExecution(data.intent, data.result, data.timeMs);
        });
        
        this.pipeline.on('error', (error) => {
            this.logger.logError(error);
        });
        
        this.pipeline.on('context-update', (context) => {
            this.logger.logContext(context);
        });
    }
    
    /**
     * Wire ASR events from main process
     */
    wireASREvents() {
        // Listen for transcripts from the ASR service
        if (window.api?.onASRTranscript) {
            window.api.onASRTranscript((data) => {
                // Log transcript
                if (this.logger) {
                    this.logger.logTranscript(
                        data.transcript,
                        data.confidence,
                        data.audioDevice,
                        data.durationMs
                    );
                }
                
                // Feed to pipeline
                if (this.pipeline) {
                    this.pipeline.handleASRTranscript(data);
                }
            });
        }
        
        // Alternative: listen for voice-transcript event (legacy)
        if (window.dawrv?.voice?.onTranscript) {
            window.dawrv.voice.onTranscript((data) => {
                if (this.logger) {
                    this.logger.logTranscript(
                        data.transcript,
                        data.confidence
                    );
                }
                
                if (this.pipeline) {
                    this.pipeline.handleASRTranscript({
                        transcript: data.transcript,
                        confidence: data.confidence || 0.8,
                        is_final: true
                    });
                }
            });
        }
        
        // Listen for speech start/end (VAD)
        if (window.api?.onVADSpeechStart) {
            window.api.onVADSpeechStart(() => {
                if (this.pipeline) {
                    this.pipeline.onSpeechStart();
                }
            });
        }
        
        if (window.api?.onVADSpeechEnd) {
            window.api.onVADSpeechEnd(() => {
                if (this.pipeline) {
                    this.pipeline.onSpeechEnd();
                }
            });
        }
    }
    
    /**
     * Wire screen awareness context
     */
    wireScreenAwareness() {
        // Get screen awareness UI if available
        if (window.screenAwarenessUI) {
            this.screenAwarenessUI = window.screenAwarenessUI;
        }
        
        // Listen for context snapshots from main process
        if (window.dawrv?.voice?.onContextSnapshot) {
            window.dawrv.voice.onContextSnapshot((snapshot) => {
                if (this.pipeline) {
                    this.pipeline.updateHoverContext(snapshot);
                }
            });
        }
        
        // Alternative: poll for context periodically
        if (window.dawrv?.voice?.getContextSnapshot) {
            setInterval(async () => {
                try {
                    const snapshot = await window.dawrv.voice.getContextSnapshot();
                    if (snapshot && this.pipeline) {
                        this.pipeline.updateHoverContext(snapshot);
                    }
                } catch (e) {
                    // Ignore errors
                }
            }, 500);
        }
        
        // Listen for ReaScript control touches
        if (window.api?.onReaScriptControlTouched) {
            window.api.onReaScriptControlTouched((controlInfo) => {
                if (this.pipeline) {
                    this.pipeline.updateHoverContext({
                        activeControl: {
                            type: controlInfo.control_type,
                            value: controlInfo.value_formatted
                        },
                        activeTrack: controlInfo.track_number
                    });
                }
            });
        }
    }
    
    /**
     * Wire TTS for spoken confirmations
     */
    wireTTS() {
        if (!this.pipeline) return;
        
        this.pipeline.on('speak', (text) => {
            this.speak(text);
        });
        
        this.pipeline.on('barge-in', () => {
            // Stop current TTS
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            
            // Also signal to RHEA if available
            if (this.rhea?.stopSpeaking) {
                this.rhea.stopSpeaking();
            }
        });
    }
    
    /**
     * Wire to existing RHEA controller
     */
    wireRHEA() {
        // Get RHEA reference
        if (window.rhea) {
            this.rhea = window.rhea;
        }
        
        if (!this.rhea) return;
        
        // Override RHEA's processCommand to use our pipeline
        // (but keep RHEA's existing logic as fallback)
        const originalProcessCommand = this.rhea.processCommand?.bind(this.rhea);
        
        if (originalProcessCommand) {
            // For now, run both in parallel - pipeline for logging/HUD, RHEA for actual execution
            // This allows gradual migration
            this.rhea._originalProcessCommand = originalProcessCommand;
        }
    }
    
    /**
     * Speak text using TTS
     */
    speak(text) {
        // Use RHEA's speak if available
        if (this.rhea?.speak) {
            this.rhea.speak(text);
            return;
        }
        
        // Fallback to Web Speech API
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }
    
    /**
     * Process a command (can be called manually)
     */
    processCommand(text, options = {}) {
        if (this.pipeline) {
            this.pipeline.processText(text);
        }
        
        // Also process through RHEA if available
        if (this.rhea?._originalProcessCommand) {
            this.rhea._originalProcessCommand(text, options);
        }
    }
    
    /**
     * Start listening
     */
    startListening() {
        if (this.pipeline) {
            this.pipeline.startListening();
        }
    }
    
    /**
     * Stop listening
     */
    stopListening() {
        if (this.pipeline) {
            this.pipeline.stopListening();
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return this.pipeline?.state || 'UNKNOWN';
    }
    
    /**
     * Get metrics
     */
    getMetrics() {
        return this.pipeline?.getMetrics() || {};
    }
    
    /**
     * Get log stats
     */
    getLogStats() {
        return this.logger?.getStats() || {};
    }
    
    /**
     * Run test suite
     */
    async runTests(options = {}) {
        if (!this.harness) {
            console.error('Replay harness not enabled');
            return null;
        }
        
        return await this.harness.runAllTests(options);
    }
    
    /**
     * Export logs
     */
    exportLogs(format = 'json') {
        if (!this.logger) {
            console.error('Logging not enabled');
            return null;
        }
        
        this.logger.download(format);
    }
    
    /**
     * Show/hide HUD
     */
    toggleHUD() {
        if (this.hud) {
            this.hud.toggle();
        }
    }
    
    /**
     * Set HUD position
     */
    setHUDPosition(position) {
        if (this.hud) {
            this.hud.setPosition(position);
        }
    }
    
    /**
     * Destroy all components
     */
    destroy() {
        if (this.hud) {
            this.hud.destroy();
            this.hud = null;
        }
        
        if (this.pipeline) {
            this.pipeline.stopListening();
            this.pipeline = null;
        }
        
        this.isInitialized = false;
        console.log('🔗 Voice Pipeline Integration destroyed');
    }
}

// Auto-initialize when scripts are loaded
function initVoicePipelineIntegration() {
    // Check if all dependencies are loaded
    if (typeof VoicePipeline === 'undefined' ||
        typeof CommandHUD === 'undefined' ||
        typeof VoiceLogger === 'undefined' ||
        typeof VoiceReplayHarness === 'undefined') {
        console.warn('Voice Pipeline dependencies not loaded, deferring...');
        setTimeout(initVoicePipelineIntegration, 500);
        return;
    }
    
    // Create integration
    const integration = new VoicePipelineIntegration({
        enableHUD: true,
        enableLogging: true,
        enableReplayHarness: true,
        hudPosition: 'top-right',
        confidenceThreshold: 0.70,
        confirmationThreshold: 0.85,
        cancelWindowMs: 500,
        enableBargeIn: true,
        enableCancelWindow: true,
        wakeWordRequired: false
    });
    
    // Initialize
    integration.init().then(() => {
        window.voicePipelineIntegration = integration;
        
        // Make components globally accessible for debugging
        window.voicePipeline = integration.pipeline;
        window.voiceLogger = integration.logger;
        window.voiceHUD = integration.hud;
        window.voiceHarness = integration.harness;
        
        console.log('🎙️ Voice Pipeline ready! Access via:');
        console.log('   window.voicePipelineIntegration - Main integration');
        console.log('   window.voicePipeline - State machine');
        console.log('   window.voiceLogger - Command logs');
        console.log('   window.voiceHUD - Visual feedback');
        console.log('   window.voiceHarness - Test harness');
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoicePipelineIntegration;
}

if (typeof window !== 'undefined') {
    window.VoicePipelineIntegration = VoicePipelineIntegration;
    window.initVoicePipelineIntegration = initVoicePipelineIntegration;
}
