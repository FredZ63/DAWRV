/**
 * Voice Pipeline State Machine
 * ============================
 * Production-grade voice command pipeline with:
 * - Formal state machine (IDLE → LISTENING → TRANSCRIBING → PARSING → EXECUTING → CONFIRMING)
 * - Two-pass ASR (interim + final)
 * - Cancel window before execution
 * - Barge-in support (interrupt TTS)
 * - Confidence-based confirmation
 * - Timeout handling and fallbacks
 */

// Simple EventEmitter for browser
class EventEmitter {
    constructor() {
        this._events = {};
    }
    
    on(event, callback) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(callback);
        return this;
    }
    
    off(event, callback) {
        if (this._events[event]) {
            this._events[event] = this._events[event].filter(cb => cb !== callback);
        }
        return this;
    }
    
    emit(event, ...args) {
        if (this._events[event]) {
            this._events[event].forEach(cb => {
                try {
                    cb(...args);
                } catch (e) {
                    console.error(`Error in event ${event}:`, e);
                }
            });
        }
        return this;
    }
}

// State machine states
const VoicePipelineState = {
    IDLE: 'IDLE',
    LISTENING: 'LISTENING',
    TRANSCRIBING: 'TRANSCRIBING',
    PARSING: 'PARSING',
    CONFIRMING: 'CONFIRMING',
    EXECUTING: 'EXECUTING',
    SPEAKING: 'SPEAKING',
    ERROR: 'ERROR'
};

// State timeouts (ms)
const STATE_TIMEOUTS = {
    LISTENING: 30000,      // Max 30s listening without speech
    TRANSCRIBING: 5000,    // Max 5s for ASR response
    PARSING: 1000,         // Max 1s for intent parsing
    CONFIRMING: 10000,     // Max 10s waiting for confirmation
    EXECUTING: 3000,       // Max 3s for REAPER action
    SPEAKING: 10000        // Max 10s for TTS
};

// Cancel window duration (ms) - user can say "cancel" to abort
const CANCEL_WINDOW_MS = 500;

class VoicePipeline extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // State
        this.state = VoicePipelineState.IDLE;
        this.previousState = null;
        this.stateTimestamp = Date.now();
        this.stateTimer = null;
        
        // Configuration
        this.config = {
            confidenceThreshold: options.confidenceThreshold || 0.70,
            confirmationThreshold: options.confirmationThreshold || 0.85,
            cancelWindowMs: options.cancelWindowMs || CANCEL_WINDOW_MS,
            enableBargeIn: options.enableBargeIn !== false,
            enableTwoPassASR: options.enableTwoPassASR !== false,
            enableCancelWindow: options.enableCancelWindow !== false,
            pushToTalk: options.pushToTalk || false,
            wakeWordRequired: options.wakeWordRequired || false,
            wakeWords: options.wakeWords || ['hey rhea', 'rhea', 'ok rhea'],
            preferredDevice: options.preferredDevice || null,
            ...options
        };
        
        // Current command context
        this.currentTranscript = null;
        this.interimTranscript = null;
        this.currentIntent = null;
        this.pendingExecution = null;
        this.cancelWindowTimer = null;
        
        // Hover context (from screen awareness)
        this.hoverContext = null;
        this.activeControl = null;
        this.activeTrack = null;
        
        // Performance metrics
        this.metrics = {
            lastLatencyMs: 0,
            avgLatencyMs: 0,
            commandCount: 0,
            successCount: 0,
            errorCount: 0,
            latencySamples: []
        };
        
        // Logging
        this.logBuffer = [];
        this.maxLogEntries = 1000;
        
        console.log('🎙️ VoicePipeline initialized', this.config);
    }
    
    // ========================================================================
    // STATE MACHINE
    // ========================================================================
    
    /**
     * Transition to a new state with validation
     */
    transitionTo(newState, data = {}) {
        const oldState = this.state;
        const now = Date.now();
        const duration = now - this.stateTimestamp;
        
        // Clear any existing timeout
        if (this.stateTimer) {
            clearTimeout(this.stateTimer);
            this.stateTimer = null;
        }
        
        // Log transition
        this.log('state-transition', {
            from: oldState,
            to: newState,
            durationMs: duration,
            data
        });
        
        // Update state
        this.previousState = oldState;
        this.state = newState;
        this.stateTimestamp = now;
        
        // Set timeout for new state
        const timeout = STATE_TIMEOUTS[newState];
        if (timeout) {
            this.stateTimer = setTimeout(() => {
                this.handleStateTimeout(newState);
            }, timeout);
        }
        
        // Emit state change event
        this.emit('state-change', {
            from: oldState,
            to: newState,
            timestamp: now,
            data
        });
        
        // Handle state entry
        this.onStateEnter(newState, data);
        
        return true;
    }
    
    /**
     * Handle state entry actions
     */
    onStateEnter(state, data) {
        switch (state) {
            case VoicePipelineState.IDLE:
                this.currentTranscript = null;
                this.interimTranscript = null;
                this.currentIntent = null;
                this.pendingExecution = null;
                break;
                
            case VoicePipelineState.LISTENING:
                this.emit('listening-start');
                break;
                
            case VoicePipelineState.TRANSCRIBING:
                if (data.interim) {
                    this.interimTranscript = data.interim;
                    this.emit('interim-transcript', data.interim);
                }
                break;
                
            case VoicePipelineState.PARSING:
                this.parseIntent(data.transcript, data.confidence);
                break;
                
            case VoicePipelineState.CONFIRMING:
                this.startConfirmation(data.intent, data.prompt);
                break;
                
            case VoicePipelineState.EXECUTING:
                this.executeCommand(data.intent);
                break;
                
            case VoicePipelineState.SPEAKING:
                // TTS in progress
                break;
                
            case VoicePipelineState.ERROR:
                this.handleError(data.error);
                break;
        }
    }
    
    /**
     * Handle state timeout
     */
    handleStateTimeout(state) {
        this.log('state-timeout', { state });
        
        switch (state) {
            case VoicePipelineState.LISTENING:
                // No speech detected, return to idle
                this.transitionTo(VoicePipelineState.IDLE, { reason: 'no-speech' });
                break;
                
            case VoicePipelineState.TRANSCRIBING:
                // ASR took too long
                this.transitionTo(VoicePipelineState.ERROR, { 
                    error: 'Transcription timeout' 
                });
                break;
                
            case VoicePipelineState.PARSING:
                // Parsing timeout
                this.transitionTo(VoicePipelineState.ERROR, { 
                    error: 'Intent parsing timeout' 
                });
                break;
                
            case VoicePipelineState.CONFIRMING:
                // User didn't respond
                this.transitionTo(VoicePipelineState.IDLE, { 
                    reason: 'confirmation-timeout' 
                });
                this.emit('speak', 'No response received. Command cancelled.');
                break;
                
            case VoicePipelineState.EXECUTING:
                // Execution timeout
                this.transitionTo(VoicePipelineState.ERROR, { 
                    error: 'REAPER command timeout' 
                });
                break;
                
            case VoicePipelineState.SPEAKING:
                // TTS timeout, just return to listening
                this.transitionTo(VoicePipelineState.LISTENING);
                break;
        }
    }
    
    // ========================================================================
    // AUDIO INPUT HANDLING
    // ========================================================================
    
    /**
     * Handle speech start (VAD detected voice)
     */
    onSpeechStart() {
        if (this.state === VoicePipelineState.IDLE || 
            this.state === VoicePipelineState.LISTENING) {
            this.transitionTo(VoicePipelineState.LISTENING);
        } else if (this.state === VoicePipelineState.SPEAKING && this.config.enableBargeIn) {
            // Barge-in: user interrupted TTS
            this.emit('barge-in');
            this.transitionTo(VoicePipelineState.LISTENING);
        }
    }
    
    /**
     * Handle speech end (VAD detected silence)
     */
    onSpeechEnd() {
        if (this.state === VoicePipelineState.LISTENING) {
            this.transitionTo(VoicePipelineState.TRANSCRIBING);
        }
    }
    
    /**
     * Handle interim transcript (two-pass ASR, pass 1)
     */
    onInterimTranscript(text, confidence) {
        if (this.state === VoicePipelineState.TRANSCRIBING) {
            this.interimTranscript = text;
            this.emit('interim-transcript', { text, confidence });
            
            // Quick intent guess for immediate feedback
            if (this.config.enableTwoPassASR) {
                const quickIntent = this.quickIntentGuess(text);
                if (quickIntent) {
                    this.emit('intent-preview', quickIntent);
                }
            }
        }
    }
    
    /**
     * Handle final transcript (two-pass ASR, pass 2)
     */
    onFinalTranscript(text, confidence) {
        const startTime = Date.now();
        this.currentTranscript = { text, confidence, timestamp: startTime };
        
        this.log('transcript-final', { text, confidence });
        
        // Check wake word if required
        if (this.config.wakeWordRequired && !this.containsWakeWord(text)) {
            this.transitionTo(VoicePipelineState.IDLE, { reason: 'no-wake-word' });
            return;
        }
        
        // Strip wake word
        const cleanText = this.stripWakeWord(text);
        
        // Check confidence threshold
        if (confidence < this.config.confidenceThreshold) {
            this.transitionTo(VoicePipelineState.CONFIRMING, {
                transcript: cleanText,
                confidence,
                prompt: `I heard "${cleanText}". Is that correct?`
            });
            return;
        }
        
        // Proceed to parsing
        this.transitionTo(VoicePipelineState.PARSING, {
            transcript: cleanText,
            confidence
        });
    }
    
    // ========================================================================
    // INTENT PARSING
    // ========================================================================
    
    /**
     * Quick intent guess from interim transcript (low latency)
     */
    quickIntentGuess(text) {
        const lower = text.toLowerCase().trim();
        
        // Fast transport commands
        if (/^(play|start)$/i.test(lower)) return { action: 'play', confidence: 0.9 };
        if (/^stop$/i.test(lower)) return { action: 'stop', confidence: 0.9 };
        if (/^record$/i.test(lower)) return { action: 'record', confidence: 0.9 };
        if (/^undo$/i.test(lower)) return { action: 'undo', confidence: 0.9 };
        if (/^redo$/i.test(lower)) return { action: 'redo', confidence: 0.9 };
        if (/^save$/i.test(lower)) return { action: 'save', confidence: 0.9 };
        if (/^pause$/i.test(lower)) return { action: 'pause', confidence: 0.9 };
        
        return null;
    }
    
    /**
     * Full intent parsing with context
     */
    parseIntent(transcript, confidence) {
        const startTime = Date.now();
        const lower = transcript.toLowerCase().trim();
        
        let intent = null;
        
        try {
            // 1. Transport commands (highest priority, simplest)
            intent = this.parseTransportIntent(lower);
            if (intent) {
                intent.confidence = Math.max(intent.confidence, confidence);
                this.finalizeIntent(intent, startTime);
                return;
            }
            
            // 2. Navigation commands (go to bar, measure)
            intent = this.parseNavigationIntent(lower);
            if (intent) {
                intent.confidence = Math.max(intent.confidence, confidence);
                this.finalizeIntent(intent, startTime);
                return;
            }
            
            // 3. Track commands (mute/solo/arm with context)
            intent = this.parseTrackIntent(lower);
            if (intent) {
                intent.confidence = Math.max(intent.confidence, confidence);
                this.finalizeIntent(intent, startTime);
                return;
            }
            
            // 4. Mixer commands (volume/pan adjustments)
            intent = this.parseMixerIntent(lower);
            if (intent) {
                intent.confidence = Math.max(intent.confidence, confidence);
                this.finalizeIntent(intent, startTime);
                return;
            }
            
            // 5. Punch/loop commands
            intent = this.parsePunchLoopIntent(lower);
            if (intent) {
                intent.confidence = Math.max(intent.confidence, confidence);
                this.finalizeIntent(intent, startTime);
                return;
            }
            
            // 6. Unknown command - ask for clarification
            this.transitionTo(VoicePipelineState.CONFIRMING, {
                intent: null,
                prompt: `I didn't understand "${transcript}". Can you try again?`
            });
            
        } catch (error) {
            this.log('parse-error', { error: error.message, transcript });
            this.transitionTo(VoicePipelineState.ERROR, { error: error.message });
        }
    }
    
    /**
     * Parse transport intent
     */
    parseTransportIntent(text) {
        // Stop (check first to avoid "stop" in "start playback")
        if (/\b(stop|halt)\b/i.test(text) && !/\bdon'?t stop\b/i.test(text)) {
            return { type: 'transport', action: 'stop', confidence: 0.95, readable: 'Stop' };
        }
        
        // Play
        if (/\b(play|start playback|start playing|resume)\b/i.test(text)) {
            return { type: 'transport', action: 'play', confidence: 0.95, readable: 'Play' };
        }
        
        // Record
        if (/\brecord\b/i.test(text) && !/\bstop record/i.test(text)) {
            return { type: 'transport', action: 'record', confidence: 0.95, readable: 'Record' };
        }
        
        // Pause
        if (/\bpause\b/i.test(text)) {
            return { type: 'transport', action: 'pause', confidence: 0.95, readable: 'Pause' };
        }
        
        // Rewind
        if (/\b(rewind|go back|back to start|go to start|beginning)\b/i.test(text)) {
            return { type: 'transport', action: 'rewind', confidence: 0.90, readable: 'Rewind' };
        }
        
        // Undo/Redo
        if (/\bundo\b/i.test(text)) {
            return { type: 'edit', action: 'undo', confidence: 0.95, readable: 'Undo' };
        }
        if (/\bredo\b/i.test(text)) {
            return { type: 'edit', action: 'redo', confidence: 0.95, readable: 'Redo' };
        }
        
        // Save
        if (/\bsave\b/i.test(text)) {
            return { type: 'project', action: 'save', confidence: 0.95, readable: 'Save' };
        }
        
        // Metronome
        if (/\b(metronome|click|toggle click)\b/i.test(text)) {
            return { type: 'transport', action: 'metronome', confidence: 0.90, readable: 'Toggle metronome' };
        }
        
        // Loop
        if (/\b(loop|toggle loop)\b/i.test(text) && !/\bloop bars?\b/i.test(text)) {
            return { type: 'transport', action: 'loop', confidence: 0.90, readable: 'Toggle loop' };
        }
        
        return null;
    }
    
    /**
     * Parse navigation intent
     */
    parseNavigationIntent(text) {
        // Go to bar/measure
        const gotoMatch = text.match(/(?:go to|jump to|move to)\s*(?:bar|measure)?\s*(\d+)/i);
        if (gotoMatch) {
            const bar = parseInt(gotoMatch[1], 10);
            return {
                type: 'navigation',
                action: 'goto_bar',
                bar,
                confidence: 0.90,
                readable: `Go to bar ${bar}`
            };
        }
        
        // Bar X (standalone)
        const barMatch = text.match(/^(?:bar|measure)\s*(\d+)$/i);
        if (barMatch) {
            const bar = parseInt(barMatch[1], 10);
            return {
                type: 'navigation',
                action: 'goto_bar',
                bar,
                confidence: 0.85,
                readable: `Go to bar ${bar}`
            };
        }
        
        // Next/previous marker
        if (/\b(next|forward)\s*marker\b/i.test(text)) {
            return { type: 'navigation', action: 'next_marker', confidence: 0.90, readable: 'Next marker' };
        }
        if (/\b(previous|last|back)\s*marker\b/i.test(text)) {
            return { type: 'navigation', action: 'prev_marker', confidence: 0.90, readable: 'Previous marker' };
        }
        
        return null;
    }
    
    /**
     * Parse track intent with hover context
     */
    parseTrackIntent(text) {
        // Determine target track
        let targetTrack = null;
        let trackSource = null;
        
        // Explicit track number
        const trackMatch = text.match(/\btrack\s*(\d+)\b/i);
        if (trackMatch) {
            targetTrack = parseInt(trackMatch[1], 10);
            trackSource = 'explicit';
        }
        // "this" with hover context
        else if (/\bthis\b/i.test(text) && this.activeTrack) {
            targetTrack = this.activeTrack;
            trackSource = 'hover';
        }
        // "that" with history
        else if (/\bthat\b/i.test(text) && this.hoverContext?.history?.[0]?.track) {
            targetTrack = this.hoverContext.history[0].track;
            trackSource = 'history';
        }
        // Selected track
        else if (/\b(selected|current)\b/i.test(text) && this.hoverContext?.selectedTrack) {
            targetTrack = this.hoverContext.selectedTrack;
            trackSource = 'selected';
        }
        
        // Mute
        if (/\bmute\b/i.test(text) && !/\bunmute\b/i.test(text)) {
            if (!targetTrack && !trackSource) {
                // Try hover context as fallback
                if (this.activeTrack) {
                    targetTrack = this.activeTrack;
                    trackSource = 'hover-fallback';
                }
            }
            if (targetTrack) {
                return {
                    type: 'track',
                    action: 'mute',
                    track: targetTrack,
                    trackSource,
                    confidence: trackSource === 'explicit' ? 0.95 : 0.85,
                    readable: `Mute track ${targetTrack}`
                };
            }
            // No track specified and no hover context
            return {
                type: 'track',
                action: 'mute',
                track: null,
                needsTrack: true,
                confidence: 0.50,
                readable: 'Mute track',
                prompt: 'Which track would you like to mute?'
            };
        }
        
        // Unmute
        if (/\bunmute\b/i.test(text)) {
            if (!targetTrack && this.activeTrack) {
                targetTrack = this.activeTrack;
                trackSource = 'hover-fallback';
            }
            if (targetTrack) {
                return {
                    type: 'track',
                    action: 'unmute',
                    track: targetTrack,
                    trackSource,
                    confidence: trackSource === 'explicit' ? 0.95 : 0.85,
                    readable: `Unmute track ${targetTrack}`
                };
            }
            return {
                type: 'track',
                action: 'unmute',
                track: null,
                needsTrack: true,
                confidence: 0.50,
                readable: 'Unmute track',
                prompt: 'Which track would you like to unmute?'
            };
        }
        
        // Solo
        if (/\bsolo\b/i.test(text) && !/\bunsolo\b/i.test(text)) {
            if (!targetTrack && this.activeTrack) {
                targetTrack = this.activeTrack;
                trackSource = 'hover-fallback';
            }
            if (targetTrack) {
                return {
                    type: 'track',
                    action: 'solo',
                    track: targetTrack,
                    trackSource,
                    confidence: trackSource === 'explicit' ? 0.95 : 0.85,
                    readable: `Solo track ${targetTrack}`
                };
            }
            return {
                type: 'track',
                action: 'solo',
                track: null,
                needsTrack: true,
                confidence: 0.50,
                prompt: 'Which track would you like to solo?'
            };
        }
        
        // Unsolo
        if (/\bunsolo\b/i.test(text)) {
            if (!targetTrack && this.activeTrack) {
                targetTrack = this.activeTrack;
                trackSource = 'hover-fallback';
            }
            if (targetTrack) {
                return {
                    type: 'track',
                    action: 'unsolo',
                    track: targetTrack,
                    trackSource,
                    confidence: trackSource === 'explicit' ? 0.95 : 0.85,
                    readable: `Unsolo track ${targetTrack}`
                };
            }
        }
        
        // Arm/Disarm
        if (/\b(arm|record arm|rec arm)\b/i.test(text) && !/\bdisarm\b/i.test(text)) {
            if (!targetTrack && this.activeTrack) {
                targetTrack = this.activeTrack;
                trackSource = 'hover-fallback';
            }
            if (targetTrack) {
                return {
                    type: 'track',
                    action: 'arm',
                    track: targetTrack,
                    trackSource,
                    confidence: trackSource === 'explicit' ? 0.95 : 0.85,
                    readable: `Arm track ${targetTrack}`
                };
            }
        }
        
        if (/\bdisarm\b/i.test(text)) {
            if (!targetTrack && this.activeTrack) {
                targetTrack = this.activeTrack;
                trackSource = 'hover-fallback';
            }
            if (targetTrack) {
                return {
                    type: 'track',
                    action: 'disarm',
                    track: targetTrack,
                    trackSource,
                    confidence: trackSource === 'explicit' ? 0.95 : 0.85,
                    readable: `Disarm track ${targetTrack}`
                };
            }
        }
        
        return null;
    }
    
    /**
     * Parse mixer intent (volume/pan)
     */
    parseMixerIntent(text) {
        let targetTrack = null;
        
        // Check for explicit track or use hover
        const trackMatch = text.match(/\btrack\s*(\d+)\b/i);
        if (trackMatch) {
            targetTrack = parseInt(trackMatch[1], 10);
        } else if (/\bthis\b/i.test(text) && this.activeTrack) {
            targetTrack = this.activeTrack;
        } else if (/\bmaster\b/i.test(text)) {
            targetTrack = 0; // Master track
        } else if (this.activeTrack && this.activeControl?.type?.includes('volume')) {
            // If hovering a volume fader, use that track
            targetTrack = this.activeTrack;
        }
        
        // Volume adjustments
        const raiseMatch = text.match(/\b(raise|up|increase|boost|bring up|turn up)\b.*?(\d+(?:\.\d+)?)\s*(db|decibels?|percent|%)?/i);
        const lowerMatch = text.match(/\b(lower|down|decrease|reduce|bring down|turn down)\b.*?(\d+(?:\.\d+)?)\s*(db|decibels?|percent|%)?/i);
        const setVolumeMatch = text.match(/\b(?:set|change)?\s*(?:volume|level)\s*(?:to)?\s*(-?\d+(?:\.\d+)?)\s*(db|decibels?)?/i);
        
        if (raiseMatch && targetTrack !== null) {
            const amount = parseFloat(raiseMatch[2]);
            const unit = raiseMatch[3]?.toLowerCase().replace('decibels', 'db').replace('percent', '%') || 'db';
            return {
                type: 'mixer',
                action: 'volume_adjust',
                track: targetTrack,
                delta: amount,
                unit,
                confidence: 0.88,
                readable: `Raise track ${targetTrack} by ${amount} ${unit}`
            };
        }
        
        if (lowerMatch && targetTrack !== null) {
            const amount = parseFloat(lowerMatch[2]);
            const unit = lowerMatch[3]?.toLowerCase().replace('decibels', 'db').replace('percent', '%') || 'db';
            return {
                type: 'mixer',
                action: 'volume_adjust',
                track: targetTrack,
                delta: -amount,
                unit,
                confidence: 0.88,
                readable: `Lower track ${targetTrack} by ${amount} ${unit}`
            };
        }
        
        if (setVolumeMatch && targetTrack !== null) {
            const value = parseFloat(setVolumeMatch[1]);
            return {
                type: 'mixer',
                action: 'volume_set',
                track: targetTrack,
                value,
                unit: 'db',
                confidence: 0.85,
                readable: `Set track ${targetTrack} to ${value} dB`
            };
        }
        
        // Pan adjustments
        const panLeftMatch = text.match(/\bpan\s*(left|right)\s*(\d+)?/i);
        if (panLeftMatch && targetTrack !== null) {
            const direction = panLeftMatch[1].toLowerCase();
            const amount = panLeftMatch[2] ? parseInt(panLeftMatch[2], 10) : 50;
            return {
                type: 'mixer',
                action: 'pan_adjust',
                track: targetTrack,
                direction,
                amount,
                confidence: 0.85,
                readable: `Pan track ${targetTrack} ${direction} ${amount}%`
            };
        }
        
        return null;
    }
    
    /**
     * Parse punch/loop intent
     */
    parsePunchLoopIntent(text) {
        // Punch in at bar X
        const punchInMatch = text.match(/\bpunch\s*in\s*(?:at)?\s*(?:bar|measure)?\s*(\d+)/i);
        if (punchInMatch) {
            const bar = parseInt(punchInMatch[1], 10);
            return {
                type: 'punch',
                action: 'punch_in',
                bar,
                confidence: 0.88,
                readable: `Set punch in at bar ${bar}`
            };
        }
        
        // Punch out at bar X
        const punchOutMatch = text.match(/\bpunch\s*out\s*(?:at)?\s*(?:bar|measure)?\s*(\d+)/i);
        if (punchOutMatch) {
            const bar = parseInt(punchOutMatch[1], 10);
            return {
                type: 'punch',
                action: 'punch_out',
                bar,
                confidence: 0.88,
                readable: `Set punch out at bar ${bar}`
            };
        }
        
        // Punch from bar X to Y
        const punchRangeMatch = text.match(/\bpunch\s*(?:from)?\s*(?:bar)?\s*(\d+)\s*(?:to|through)\s*(?:bar)?\s*(\d+)/i);
        if (punchRangeMatch) {
            const startBar = parseInt(punchRangeMatch[1], 10);
            const endBar = parseInt(punchRangeMatch[2], 10);
            return {
                type: 'punch',
                action: 'punch_range',
                startBar,
                endBar,
                confidence: 0.88,
                readable: `Set punch from bar ${startBar} to ${endBar}`
            };
        }
        
        // Loop bars X to Y
        const loopMatch = text.match(/\bloop\s*(?:bars?)?\s*(\d+)\s*(?:to|through)\s*(\d+)/i);
        if (loopMatch) {
            const startBar = parseInt(loopMatch[1], 10);
            const endBar = parseInt(loopMatch[2], 10);
            return {
                type: 'loop',
                action: 'loop_range',
                startBar,
                endBar,
                confidence: 0.88,
                readable: `Loop bars ${startBar} to ${endBar}`
            };
        }
        
        return null;
    }
    
    /**
     * Finalize parsed intent
     */
    finalizeIntent(intent, startTime) {
        const parseTime = Date.now() - startTime;
        intent.parseTimeMs = parseTime;
        
        this.currentIntent = intent;
        this.log('intent-parsed', intent);
        this.emit('intent', intent);
        
        // Check if confirmation is needed
        if (intent.needsTrack || intent.prompt) {
            this.transitionTo(VoicePipelineState.CONFIRMING, {
                intent,
                prompt: intent.prompt
            });
            return;
        }
        
        // Check confidence for confirmation
        if (intent.confidence < this.config.confirmationThreshold) {
            this.transitionTo(VoicePipelineState.CONFIRMING, {
                intent,
                prompt: `${intent.readable}?`
            });
            return;
        }
        
        // High confidence - check cancel window
        if (this.config.enableCancelWindow) {
            this.startCancelWindow(intent);
        } else {
            this.transitionTo(VoicePipelineState.EXECUTING, { intent });
        }
    }
    
    // ========================================================================
    // CANCEL WINDOW
    // ========================================================================
    
    /**
     * Start cancel window before execution
     */
    startCancelWindow(intent) {
        this.pendingExecution = intent;
        this.emit('cancel-window-start', {
            intent,
            durationMs: this.config.cancelWindowMs
        });
        
        this.cancelWindowTimer = setTimeout(() => {
            this.cancelWindowTimer = null;
            if (this.pendingExecution === intent) {
                this.transitionTo(VoicePipelineState.EXECUTING, { intent });
            }
        }, this.config.cancelWindowMs);
    }
    
    /**
     * Cancel pending execution
     */
    cancelPendingExecution() {
        if (this.cancelWindowTimer) {
            clearTimeout(this.cancelWindowTimer);
            this.cancelWindowTimer = null;
        }
        
        const cancelled = this.pendingExecution;
        this.pendingExecution = null;
        
        if (cancelled) {
            this.log('execution-cancelled', cancelled);
            this.emit('execution-cancelled', cancelled);
            this.transitionTo(VoicePipelineState.IDLE, { reason: 'user-cancel' });
            this.emit('speak', 'Cancelled.');
        }
    }
    
    // ========================================================================
    // CONFIRMATION
    // ========================================================================
    
    /**
     * Start confirmation flow
     */
    startConfirmation(intent, prompt) {
        this.pendingExecution = intent;
        this.emit('confirmation-needed', { intent, prompt });
        this.emit('speak', prompt);
    }
    
    /**
     * Handle confirmation response
     */
    handleConfirmationResponse(text) {
        const lower = text.toLowerCase().trim();
        
        // Affirmative
        if (/^(yes|yeah|yep|correct|right|do it|confirm|go|ok|okay|affirmative)$/i.test(lower)) {
            if (this.pendingExecution) {
                this.transitionTo(VoicePipelineState.EXECUTING, { 
                    intent: this.pendingExecution 
                });
            }
            return;
        }
        
        // Negative
        if (/^(no|nope|cancel|stop|never mind|nevermind|abort)$/i.test(lower)) {
            this.pendingExecution = null;
            this.transitionTo(VoicePipelineState.IDLE, { reason: 'user-declined' });
            this.emit('speak', 'Cancelled.');
            return;
        }
        
        // Might be a new command or clarification - process normally
        this.transitionTo(VoicePipelineState.PARSING, {
            transcript: text,
            confidence: 0.7  // Assume medium confidence for re-spoken
        });
    }
    
    // ========================================================================
    // EXECUTION
    // ========================================================================
    
    /**
     * Execute the command in REAPER
     */
    async executeCommand(intent) {
        const startTime = Date.now();
        
        this.log('execution-start', intent);
        this.emit('execution-start', intent);
        
        try {
            let result = null;
            
            switch (intent.type) {
                case 'transport':
                    result = await this.executeTransport(intent);
                    break;
                case 'edit':
                    result = await this.executeEdit(intent);
                    break;
                case 'project':
                    result = await this.executeProject(intent);
                    break;
                case 'navigation':
                    result = await this.executeNavigation(intent);
                    break;
                case 'track':
                    result = await this.executeTrack(intent);
                    break;
                case 'mixer':
                    result = await this.executeMixer(intent);
                    break;
                case 'punch':
                case 'loop':
                    result = await this.executePunchLoop(intent);
                    break;
                default:
                    throw new Error(`Unknown intent type: ${intent.type}`);
            }
            
            const executionTime = Date.now() - startTime;
            this.updateMetrics(true, executionTime);
            
            this.log('execution-complete', { intent, result, timeMs: executionTime });
            this.emit('execution-complete', { intent, result, timeMs: executionTime });
            
            // Speak confirmation
            const confirmation = this.buildConfirmation(intent, result);
            this.transitionTo(VoicePipelineState.SPEAKING);
            this.emit('speak', confirmation);
            
            // After speaking, return to listening
            setTimeout(() => {
                if (this.state === VoicePipelineState.SPEAKING) {
                    this.transitionTo(VoicePipelineState.LISTENING);
                }
            }, 1500);
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateMetrics(false, executionTime);
            
            this.log('execution-error', { intent, error: error.message });
            this.transitionTo(VoicePipelineState.ERROR, { 
                error: `Failed to execute: ${error.message}` 
            });
        }
    }
    
    /**
     * Execute transport command
     */
    async executeTransport(intent) {
        const actionMap = {
            'play': 1007,
            'stop': 1016,
            'pause': 1008,
            'record': 1013,
            'rewind': 40042,
            'metronome': 40364,
            'loop': 1068
        };
        
        const actionId = actionMap[intent.action];
        if (!actionId) {
            throw new Error(`Unknown transport action: ${intent.action}`);
        }
        
        if (window.api?.executeReaperAction) {
            return await window.api.executeReaperAction(actionId);
        }
        
        throw new Error('REAPER API not available');
    }
    
    /**
     * Execute edit command
     */
    async executeEdit(intent) {
        const actionMap = {
            'undo': 40029,
            'redo': 40030
        };
        
        const actionId = actionMap[intent.action];
        if (!actionId) {
            throw new Error(`Unknown edit action: ${intent.action}`);
        }
        
        if (window.api?.executeReaperAction) {
            return await window.api.executeReaperAction(actionId);
        }
        
        throw new Error('REAPER API not available');
    }
    
    /**
     * Execute project command
     */
    async executeProject(intent) {
        const actionMap = {
            'save': 40026  // File: Save project
        };
        
        const actionId = actionMap[intent.action];
        if (!actionId) {
            throw new Error(`Unknown project action: ${intent.action}`);
        }
        
        if (window.api?.executeReaperAction) {
            return await window.api.executeReaperAction(actionId);
        }
        
        throw new Error('REAPER API not available');
    }
    
    /**
     * Execute navigation command
     */
    async executeNavigation(intent) {
        switch (intent.action) {
            case 'goto_bar':
                if (window.api?.executeGotoBar) {
                    return await window.api.executeGotoBar(intent.bar);
                } else if (window.api?.executeMeasureCommand) {
                    return await window.api.executeMeasureCommand('goto', intent.bar);
                }
                break;
                
            case 'next_marker':
                if (window.api?.executeReaperAction) {
                    return await window.api.executeReaperAction(40173);
                }
                break;
                
            case 'prev_marker':
                if (window.api?.executeReaperAction) {
                    return await window.api.executeReaperAction(40172);
                }
                break;
        }
        
        throw new Error('Navigation API not available');
    }
    
    /**
     * Execute track command (mute/solo/arm)
     */
    async executeTrack(intent) {
        if (!window.api?.executeTrackCommand) {
            throw new Error('Track API not available');
        }
        
        // Validate track exists
        if (intent.track < 0 || intent.track > 256) {
            throw new Error(`Invalid track number: ${intent.track}`);
        }
        
        return await window.api.executeTrackCommand(intent.action, intent.track);
    }
    
    /**
     * Execute mixer command (volume/pan)
     */
    async executeMixer(intent) {
        if (!window.api?.executeTrackCommand) {
            throw new Error('Mixer API not available');
        }
        
        // Validate track
        if (intent.track < 0 || intent.track > 256) {
            throw new Error(`Invalid track number: ${intent.track}`);
        }
        
        if (intent.action === 'volume_adjust') {
            // Delta adjustment
            return await window.api.executeTrackCommand('volume', intent.track, intent.delta);
        } else if (intent.action === 'volume_set') {
            // Absolute set
            return await window.api.executeTrackCommand('volume_set', intent.track, intent.value);
        } else if (intent.action === 'pan_adjust') {
            const panValue = intent.direction === 'left' ? -intent.amount : intent.amount;
            return await window.api.executeTrackCommand('pan', intent.track, panValue);
        }
        
        throw new Error(`Unknown mixer action: ${intent.action}`);
    }
    
    /**
     * Execute punch/loop command
     */
    async executePunchLoop(intent) {
        switch (intent.action) {
            case 'punch_in':
                // Set punch in point (uses time selection start)
                if (window.api?.executeMeasureCommand) {
                    return await window.api.executeMeasureCommand('punch_in', intent.bar);
                }
                break;
                
            case 'punch_out':
                if (window.api?.executeMeasureCommand) {
                    return await window.api.executeMeasureCommand('punch_out', intent.bar);
                }
                break;
                
            case 'punch_range':
                if (window.api?.executeMeasureCommand) {
                    await window.api.executeMeasureCommand('punch_in', intent.startBar);
                    return await window.api.executeMeasureCommand('punch_out', intent.endBar);
                }
                break;
                
            case 'loop_range':
                if (window.api?.executeMeasureCommand) {
                    return await window.api.executeMeasureCommand('loop', intent.startBar, intent.endBar);
                }
                break;
        }
        
        throw new Error('Punch/Loop API not available');
    }
    
    /**
     * Build spoken confirmation
     */
    buildConfirmation(intent, result) {
        // Short confirmations for speed
        if (!result?.success) {
            return 'Failed.';
        }
        
        // Keep confirmations brief
        switch (intent.type) {
            case 'transport':
                return intent.action === 'play' ? 'Playing.' :
                       intent.action === 'stop' ? 'Stopped.' :
                       intent.action === 'record' ? 'Recording.' :
                       intent.action === 'pause' ? 'Paused.' :
                       'Done.';
                       
            case 'track':
                return `Track ${intent.track} ${intent.action}d.`;
                
            case 'mixer':
                if (intent.action === 'volume_adjust') {
                    const dir = intent.delta > 0 ? 'up' : 'down';
                    return `Track ${intent.track} ${dir} ${Math.abs(intent.delta)} dB.`;
                }
                return 'Done.';
                
            case 'navigation':
                if (intent.action === 'goto_bar') {
                    return `Bar ${intent.bar}.`;
                }
                return 'Done.';
                
            default:
                return 'Done.';
        }
    }
    
    // ========================================================================
    // CONTEXT MANAGEMENT
    // ========================================================================
    
    /**
     * Update hover context from screen awareness
     */
    updateHoverContext(context) {
        this.hoverContext = context;
        this.activeControl = context?.activeControl || null;
        this.activeTrack = context?.activeTrack || null;
        
        this.emit('context-update', context);
    }
    
    // ========================================================================
    // WAKE WORD
    // ========================================================================
    
    containsWakeWord(text) {
        const lower = text.toLowerCase();
        return this.config.wakeWords.some(ww => lower.includes(ww));
    }
    
    stripWakeWord(text) {
        let result = text;
        for (const ww of this.config.wakeWords) {
            const regex = new RegExp(ww + '[,.]?\\s*', 'gi');
            result = result.replace(regex, '');
        }
        return result.trim();
    }
    
    // ========================================================================
    // METRICS & LOGGING
    // ========================================================================
    
    updateMetrics(success, latencyMs) {
        this.metrics.commandCount++;
        if (success) {
            this.metrics.successCount++;
        } else {
            this.metrics.errorCount++;
        }
        
        this.metrics.lastLatencyMs = latencyMs;
        this.metrics.latencySamples.push(latencyMs);
        if (this.metrics.latencySamples.length > 100) {
            this.metrics.latencySamples.shift();
        }
        
        this.metrics.avgLatencyMs = this.metrics.latencySamples.reduce((a, b) => a + b, 0) / 
                                     this.metrics.latencySamples.length;
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.commandCount > 0 
                ? (this.metrics.successCount / this.metrics.commandCount * 100).toFixed(1) + '%'
                : 'N/A',
            currentState: this.state
        };
    }
    
    log(event, data) {
        const entry = {
            timestamp: Date.now(),
            event,
            state: this.state,
            ...data
        };
        
        this.logBuffer.push(entry);
        if (this.logBuffer.length > this.maxLogEntries) {
            this.logBuffer.shift();
        }
        
        this.emit('log', entry);
        
        // Console output for debugging
        console.log(`🎙️ [${this.state}] ${event}:`, data);
    }
    
    getLog() {
        return this.logBuffer;
    }
    
    exportLog() {
        return JSON.stringify(this.logBuffer, null, 2);
    }
    
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    
    handleError(error) {
        this.emit('error', error);
        this.emit('speak', 'Something went wrong. Please try again.');
        
        // Return to idle after error
        setTimeout(() => {
            if (this.state === VoicePipelineState.ERROR) {
                this.transitionTo(VoicePipelineState.IDLE);
            }
        }, 2000);
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    /**
     * Start listening
     */
    startListening() {
        if (this.state === VoicePipelineState.IDLE) {
            this.transitionTo(VoicePipelineState.LISTENING);
        }
    }
    
    /**
     * Stop listening
     */
    stopListening() {
        this.transitionTo(VoicePipelineState.IDLE, { reason: 'user-stop' });
    }
    
    /**
     * Process manual text input
     */
    processText(text) {
        this.onFinalTranscript(text, 0.95);
    }
    
    /**
     * Handle incoming ASR transcript
     */
    handleASRTranscript(data) {
        if (data.is_final) {
            this.onFinalTranscript(data.transcript, data.confidence);
        } else {
            this.onInterimTranscript(data.transcript, data.confidence);
        }
    }
    
    /**
     * Handle cancel command
     */
    handleCancel() {
        if (this.state === VoicePipelineState.CONFIRMING || this.pendingExecution) {
            this.cancelPendingExecution();
        } else {
            this.transitionTo(VoicePipelineState.IDLE, { reason: 'user-cancel' });
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VoicePipeline, VoicePipelineState };
}

// Global for browser
if (typeof window !== 'undefined') {
    window.VoicePipeline = VoicePipeline;
    window.VoicePipelineState = VoicePipelineState;
}
