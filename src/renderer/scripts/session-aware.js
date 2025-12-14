/**
 * DAWRV/RHEA Session Aware System
 * ================================
 * Intelligent workflow learning and contextual assistance.
 * 
 * RHEA observes, learns, and assists based on:
 * - What you're doing (recording, mixing, mastering, beat-making)
 * - How you work (patterns, preferences, habits)
 * - Where you are in the process
 * - What you might need next
 */

class SessionAwareSystem {
    constructor(rheaController) {
        this.rhea = rheaController;
        this.isActive = false;
        
        // ========================================
        // SESSION STATE
        // ========================================
        this.session = {
            mode: 'unknown',           // recording, mixing, mastering, beatmaking, editing, composing
            phase: 'setup',            // setup, working, refining, finalizing
            startTime: null,
            lastActionTime: null,
            activeView: 'arrange',     // arrange, mixer, piano_roll, fx
            focusedTrack: null,
            projectName: '',
            tempo: 120,
            timeSignature: '4/4'
        };
        
        // ========================================
        // ACTION HISTORY
        // ========================================
        this.actionLog = [];           // All actions with timestamps
        this.actionPatterns = {};      // Learned patterns
        this.maxLogSize = 500;         // Keep last 500 actions
        
        // ========================================
        // USER PREFERENCES (learned)
        // ========================================
        this.preferences = {
            favoritePlugins: {},       // { 'FabFilter Pro-Q': 15, 'LA-2A': 8 }
            commonSequences: [],       // [['eq', 'comp', 'saturation'], ...]
            avgActionInterval: 2000,   // ms between actions
            preferredWorkflow: null,
            trackNamingStyle: null,
            mixingApproach: null       // top-down, bottom-up, hybrid
        };
        
        // ========================================
        // SUGGESTION ENGINE
        // ========================================
        this.suggestions = {
            pending: null,             // Current suggestion waiting
            lastSuggestionTime: 0,
            suggestionCooldown: 30000, // Don't suggest too often (30s)
            dismissed: []              // Suggestions user dismissed
        };
        
        // ========================================
        // MODE DETECTION RULES
        // ========================================
        this.modeIndicators = {
            recording: {
                actions: ['armtrack', 'record', 'punchin', 'inputmonitoring'],
                views: ['arrange'],
                weight: 0
            },
            mixing: {
                actions: ['settrackvolume', 'settrackpan', 'solo', 'mute', 'addfx'],
                views: ['mixer'],
                weight: 0
            },
            mastering: {
                actions: ['setmastervolume', 'mutemaster'],
                views: ['mixer'],
                focusOnMaster: true,
                weight: 0
            },
            beatmaking: {
                actions: ['quantize', 'addmidi', 'drumpattern'],
                views: ['piano_roll', 'arrange'],
                weight: 0
            },
            editing: {
                actions: ['cut', 'copy', 'paste', 'delete', 'fade', 'crossfade'],
                views: ['arrange'],
                weight: 0
            },
            composing: {
                actions: ['addmarker', 'loop', 'tempo', 'transpose'],
                views: ['piano_roll', 'arrange'],
                weight: 0
            }
        };
        
        // ========================================
        // CONTEXTUAL TIPS DATABASE
        // ========================================
        this.tips = {
            recording: [
                "Want me to set up a click track?",
                "I can arm multiple tracks at once - just say 'arm tracks 1 through 4'",
                "Say 'punch in at bar 8' for precise recording",
                "Need a count-in? Just say 'enable count-in'"
            ],
            mixing: [
                "Try gain staging before adding plugins - say 'check levels'",
                "I can solo this track's frequency range if you need to focus",
                "Want me to bypass all plugins for an A/B comparison?",
                "Say 'reset faders' to start fresh"
            ],
            mastering: [
                "Current loudness is around -14 LUFS - want me to check?",
                "I can bypass the master chain for reference",
                "Say 'export stems' if you need stems for external mastering"
            ],
            beatmaking: [
                "Say 'quantize selection' to tighten up the groove",
                "I can suggest a drum pattern variation",
                "Try 'swing 60%' for some groove",
                "Want me to double the tempo for half-time feel?"
            ],
            editing: [
                "Say 'crossfade selection' for smooth transitions",
                "I can ripple delete to close gaps - say 'ripple delete'",
                "Need to align? Say 'snap to grid'"
            ],
            stuck: [
                "You've been on this section for a while. Want to move on and come back?",
                "Sometimes fresh ears help - want to take a quick break?",
                "I can save a checkpoint here if you want to experiment",
                "Try referencing a track you like - I can import one"
            ]
        };
        
        // Load saved data
        this.loadData();
        
        console.log('🧠 Session Aware System initialized');
    }
    
    // ========================================
    // LIFECYCLE
    // ========================================
    
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.session.startTime = Date.now();
        this.session.lastActionTime = Date.now();
        
        // Start monitoring
        this.setupEventListeners();
        this.startPatternAnalysis();
        
        console.log('🧠 Session Aware: ACTIVE');
        
        // Initial greeting based on time of day
        const hour = new Date().getHours();
        let greeting = '';
        if (hour < 12) greeting = "Good morning!";
        else if (hour < 17) greeting = "Good afternoon!";
        else if (hour < 21) greeting = "Good evening!";
        else greeting = "Late night session, huh?";
        
        if (this.rhea) {
            this.rhea.speak(`${greeting} Session Aware is now active. I'll learn how you work and help where I can.`);
        }
        
        return { success: true, message: 'Session Aware activated' };
    }
    
    stop() {
        this.isActive = false;
        this.saveData();
        
        console.log('🧠 Session Aware: STOPPED');
        
        // Summary
        const duration = this.session.startTime ? 
            Math.round((Date.now() - this.session.startTime) / 60000) : 0;
        
        if (this.rhea && duration > 5) {
            this.rhea.speak(`Session ended. You worked for ${duration} minutes. Nice work!`);
        }
        
        return { success: true, message: 'Session Aware deactivated' };
    }
    
    // ========================================
    // EVENT MONITORING
    // ========================================
    
    setupEventListeners() {
        // Listen to RHEA's command events
        if (this.rhea) {
            // Hook into command processing
            const originalProcessCommand = this.rhea.processCommand?.bind(this.rhea);
            if (originalProcessCommand) {
                this.rhea.processCommand = async (transcript) => {
                    // Log the action BEFORE processing
                    this.logAction(transcript);
                    
                    // Process normally
                    const result = await originalProcessCommand(transcript);
                    
                    // Analyze after action
                    this.analyzeContext();
                    
                    return result;
                };
            }
        }
        
        // Listen to screen awareness events
        window.addEventListener('reascript-control-touched', (e) => {
            if (!this.isActive) return;
            this.handleControlTouch(e.detail);
        });
        
        // Listen to view changes
        window.addEventListener('daw-view-changed', (e) => {
            if (!this.isActive) return;
            this.session.activeView = e.detail?.view || 'arrange';
            this.updateModeDetection();
        });
    }
    
    // ========================================
    // ACTION LOGGING
    // ========================================
    
    logAction(action, metadata = {}) {
        if (!this.isActive) return;
        
        const now = Date.now();
        const timeSinceLast = now - (this.session.lastActionTime || now);
        
        const entry = {
            action: action.toLowerCase().trim(),
            timestamp: now,
            timeSinceLast,
            mode: this.session.mode,
            view: this.session.activeView,
            track: this.session.focusedTrack,
            ...metadata
        };
        
        this.actionLog.push(entry);
        this.session.lastActionTime = now;
        
        // Trim log if too large
        if (this.actionLog.length > this.maxLogSize) {
            this.actionLog = this.actionLog.slice(-this.maxLogSize);
        }
        
        // Update preferences
        this.updatePreferences(entry);
        
        // Check for patterns
        this.detectPatterns();
        
        // Check if user seems stuck
        this.checkIfStuck(timeSinceLast);
        
        console.log(`🧠 Action logged: "${action}" (${this.session.mode} mode)`);
    }
    
    handleControlTouch(controlInfo) {
        if (!controlInfo) return;
        
        // Update focused track
        if (controlInfo.track_number) {
            this.session.focusedTrack = controlInfo.track_number;
        }
        
        // Detect view from context
        if (controlInfo.context === 'mcp') {
            this.session.activeView = 'mixer';
        } else if (controlInfo.context === 'tcp') {
            this.session.activeView = 'arrange';
        }
        
        // Log as implicit action
        const actionType = controlInfo.control_type || 'unknown';
        this.logAction(`touch_${actionType}`, {
            trackNumber: controlInfo.track_number,
            value: controlInfo.value
        });
    }
    
    // ========================================
    // MODE DETECTION
    // ========================================
    
    updateModeDetection() {
        // Reset weights
        Object.keys(this.modeIndicators).forEach(mode => {
            this.modeIndicators[mode].weight = 0;
        });
        
        // Analyze recent actions (last 20)
        const recentActions = this.actionLog.slice(-20);
        
        recentActions.forEach(entry => {
            Object.keys(this.modeIndicators).forEach(mode => {
                const indicator = this.modeIndicators[mode];
                
                // Check if action matches mode
                if (indicator.actions.some(a => entry.action.includes(a))) {
                    indicator.weight += 2;
                }
                
                // Check if view matches
                if (indicator.views.includes(entry.view)) {
                    indicator.weight += 1;
                }
            });
        });
        
        // Find highest weight mode
        let maxWeight = 0;
        let detectedMode = 'unknown';
        
        Object.keys(this.modeIndicators).forEach(mode => {
            if (this.modeIndicators[mode].weight > maxWeight) {
                maxWeight = this.modeIndicators[mode].weight;
                detectedMode = mode;
            }
        });
        
        // Only change mode if confident
        if (maxWeight > 5 && detectedMode !== this.session.mode) {
            const previousMode = this.session.mode;
            this.session.mode = detectedMode;
            
            console.log(`🧠 Mode changed: ${previousMode} → ${detectedMode}`);
            
            // Announce mode change
            if (this.rhea && previousMode !== 'unknown') {
                const modeNames = {
                    recording: 'recording mode',
                    mixing: 'mixing mode',
                    mastering: 'mastering mode',
                    beatmaking: 'beat making mode',
                    editing: 'editing mode',
                    composing: 'composing mode'
                };
                // Only announce occasionally to not be annoying
                if (Math.random() < 0.3) {
                    this.rhea.speak(`Looks like you're in ${modeNames[detectedMode]}. I'm here if you need me.`);
                }
            }
        }
    }
    
    analyzeContext() {
        this.updateModeDetection();
        this.maybeOfferSuggestion();
    }
    
    // ========================================
    // PATTERN DETECTION
    // ========================================
    
    detectPatterns() {
        if (this.actionLog.length < 5) return;
        
        // Look for repeated sequences (3-5 actions)
        const recentActions = this.actionLog.slice(-10).map(e => e.action);
        
        for (let seqLen = 3; seqLen <= 5; seqLen++) {
            if (recentActions.length < seqLen * 2) continue;
            
            const lastSeq = recentActions.slice(-seqLen).join('→');
            const prevSeq = recentActions.slice(-seqLen * 2, -seqLen).join('→');
            
            if (lastSeq === prevSeq) {
                // Found a repeated pattern!
                const patternKey = lastSeq;
                this.actionPatterns[patternKey] = (this.actionPatterns[patternKey] || 0) + 1;
                
                // If pattern repeated 3+ times, offer to automate
                if (this.actionPatterns[patternKey] === 3) {
                    this.offerPatternAutomation(recentActions.slice(-seqLen));
                }
            }
        }
    }
    
    offerPatternAutomation(sequence) {
        const readable = sequence.join(', then ');
        
        if (this.rhea) {
            this.rhea.speak(`I noticed you keep doing: ${readable}. Want me to remember this as a shortcut?`);
        }
        
        // Store as potential macro
        if (!this.preferences.commonSequences.some(s => s.join('→') === sequence.join('→'))) {
            this.preferences.commonSequences.push(sequence);
        }
    }
    
    // ========================================
    // PREFERENCE LEARNING
    // ========================================
    
    updatePreferences(entry) {
        // Track plugin usage
        if (entry.action.includes('plugin') || entry.action.includes('fx')) {
            const pluginMatch = entry.action.match(/(?:add|open|insert)\s+(.+)/i);
            if (pluginMatch) {
                const plugin = pluginMatch[1];
                this.preferences.favoritePlugins[plugin] = 
                    (this.preferences.favoritePlugins[plugin] || 0) + 1;
            }
        }
        
        // Calculate average action interval
        if (this.actionLog.length > 10) {
            const intervals = this.actionLog.slice(-20)
                .map(e => e.timeSinceLast)
                .filter(t => t > 0 && t < 60000); // Ignore long pauses
            
            if (intervals.length > 5) {
                this.preferences.avgActionInterval = 
                    intervals.reduce((a, b) => a + b, 0) / intervals.length;
            }
        }
    }
    
    // ========================================
    // STUCK DETECTION
    // ========================================
    
    checkIfStuck(timeSinceLast) {
        // If user hasn't done anything for 3x their average interval
        const stuckThreshold = Math.max(this.preferences.avgActionInterval * 3, 30000);
        
        if (timeSinceLast > stuckThreshold) {
            // Check for repeated undos (sign of frustration)
            const recentActions = this.actionLog.slice(-5).map(e => e.action);
            const undoCount = recentActions.filter(a => a.includes('undo')).length;
            
            if (undoCount >= 3) {
                this.offerStuckHelp('undo_loop');
            } else if (timeSinceLast > stuckThreshold * 2) {
                this.offerStuckHelp('long_pause');
            }
        }
    }
    
    offerStuckHelp(reason) {
        const now = Date.now();
        if (now - this.suggestions.lastSuggestionTime < this.suggestions.suggestionCooldown) {
            return; // Don't nag
        }
        
        const tips = this.tips.stuck;
        const tip = tips[Math.floor(Math.random() * tips.length)];
        
        if (this.rhea) {
            this.rhea.speak(tip);
            this.suggestions.lastSuggestionTime = now;
        }
    }
    
    // ========================================
    // SUGGESTION ENGINE
    // ========================================
    
    maybeOfferSuggestion() {
        const now = Date.now();
        
        // Cooldown check
        if (now - this.suggestions.lastSuggestionTime < this.suggestions.suggestionCooldown) {
            return;
        }
        
        // Only suggest occasionally (10% chance per action)
        if (Math.random() > 0.1) return;
        
        // Get mode-specific tips
        const modeTips = this.tips[this.session.mode] || [];
        if (modeTips.length === 0) return;
        
        // Pick a random tip not recently dismissed
        const availableTips = modeTips.filter(t => !this.suggestions.dismissed.includes(t));
        if (availableTips.length === 0) return;
        
        const tip = availableTips[Math.floor(Math.random() * availableTips.length)];
        
        if (this.rhea) {
            this.rhea.speak(tip);
            this.suggestions.lastSuggestionTime = now;
            this.suggestions.pending = tip;
        }
    }
    
    // ========================================
    // INTELLIGENT RESPONSES
    // ========================================
    
    getContextualResponse(query) {
        // Provide context-aware responses based on current session
        const context = {
            mode: this.session.mode,
            phase: this.session.phase,
            recentActions: this.actionLog.slice(-5).map(e => e.action),
            focusedTrack: this.session.focusedTrack,
            sessionDuration: this.session.startTime ? 
                Math.round((Date.now() - this.session.startTime) / 60000) : 0
        };
        
        return context;
    }
    
    // ========================================
    // DATA PERSISTENCE
    // ========================================
    
    saveData() {
        try {
            const data = {
                preferences: this.preferences,
                actionPatterns: this.actionPatterns,
                lastSession: {
                    mode: this.session.mode,
                    duration: this.session.startTime ? 
                        Date.now() - this.session.startTime : 0
                }
            };
            localStorage.setItem('dawrv_session_aware', JSON.stringify(data));
            console.log('🧠 Session Aware data saved');
        } catch (err) {
            console.error('Error saving Session Aware data:', err);
        }
    }
    
    loadData() {
        try {
            const saved = localStorage.getItem('dawrv_session_aware');
            if (saved) {
                const data = JSON.parse(saved);
                this.preferences = { ...this.preferences, ...data.preferences };
                this.actionPatterns = data.actionPatterns || {};
                console.log('🧠 Session Aware data loaded');
            }
        } catch (err) {
            console.error('Error loading Session Aware data:', err);
        }
    }
    
    // ========================================
    // PUBLIC API
    // ========================================
    
    getStatus() {
        return {
            isActive: this.isActive,
            mode: this.session.mode,
            phase: this.session.phase,
            activeView: this.session.activeView,
            focusedTrack: this.session.focusedTrack,
            sessionDuration: this.session.startTime ? 
                Math.round((Date.now() - this.session.startTime) / 60000) : 0,
            actionsLogged: this.actionLog.length,
            topPlugins: Object.entries(this.preferences.favoritePlugins)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5),
            learnedPatterns: Object.keys(this.actionPatterns).length
        };
    }
    
    setMode(mode) {
        if (this.modeIndicators[mode]) {
            this.session.mode = mode;
            console.log(`🧠 Mode manually set to: ${mode}`);
            return { success: true, mode };
        }
        return { success: false, error: 'Invalid mode' };
    }
    
    getSuggestion() {
        // Force a suggestion
        const modeTips = this.tips[this.session.mode] || this.tips.mixing;
        return modeTips[Math.floor(Math.random() * modeTips.length)];
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SessionAwareSystem };
}





