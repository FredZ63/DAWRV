/**
 * Studio Vocabulary Executor
 * ===========================
 * Executes ActionPlans from vocabulary mappings.
 * Handles parameter deltas, REAPER actions, and studio-style responses.
 */

class StudioVocabularyExecutor {
    constructor() {
        // Studio-style confirmation phrases
        this.CONFIRMATIONS = {
            positive: ['Bet.', 'Say less.', 'Got you.', 'Done.', 'Copy.', 'On it.', "That's fire.", 'Locked in.'],
            neutral: ['Done.', 'Copy.', 'Got it.', 'Handled.', 'There you go.'],
            negative: ['I feel you.', 'Let me fix that.', 'On it.', 'Say no more.']
        };
        
        // Studio-style follow-up questions
        this.FOLLOW_UPS = {
            amount: ['How much?', 'By how much?', 'What amount?'],
            clarify: ['Which one?', 'Be more specific?', 'What exactly?']
        };
        
        // Studio tone enabled by default
        this.studioToneEnabled = this.loadStudioToneSetting();
        
        // Last execution result for debugging
        this.lastExecution = null;
    }
    
    /**
     * Load studio tone setting
     */
    loadStudioToneSetting() {
        try {
            const saved = localStorage.getItem('dawrv_studio_tone');
            return saved !== 'false'; // Default to true
        } catch (e) {
            return true;
        }
    }
    
    /**
     * Save studio tone setting
     */
    setStudioTone(enabled) {
        this.studioToneEnabled = enabled;
        try {
            localStorage.setItem('dawrv_studio_tone', String(enabled));
        } catch (e) {}
    }
    
    /**
     * Build an ActionPlan from a vocabulary match
     */
    buildActionPlan(vocabMatch, context = {}) {
        const item = vocabMatch.item;
        const mapping = item.actionMapping;
        
        if (!mapping || !mapping.enabled || !mapping.actions || mapping.actions.length === 0) {
            return null;
        }
        
        const plan = {
            id: 'plan_' + Date.now(),
            vocabId: item.id,
            phrase: item.phrase,
            sentiment: item.sentiment,
            category: item.category,
            actions: [],
            needsClarification: false,
            clarificationQuestion: null,
            confirmationText: null
        };
        
        for (const action of mapping.actions) {
            const resolvedAction = this.resolveAction(action, context);
            
            if (resolvedAction.needsClarification) {
                plan.needsClarification = true;
                plan.clarificationQuestion = resolvedAction.clarificationQuestion;
            }
            
            plan.actions.push(resolvedAction);
        }
        
        // Set confirmation text
        if (plan.actions.length > 0 && plan.actions[0].confirmationText) {
            plan.confirmationText = plan.actions[0].confirmationText;
        } else {
            plan.confirmationText = this.getStudioConfirmation(item.sentiment);
        }
        
        return plan;
    }
    
    /**
     * Resolve action with context
     */
    resolveAction(action, context) {
        const resolved = {
            ...action,
            needsClarification: false,
            clarificationQuestion: null,
            resolvedTarget: null
        };
        
        // Resolve target
        switch (action.target) {
            case 'selectedTrack':
                resolved.resolvedTarget = context.selectedTrack || context.activeTrack || 1;
                break;
            case 'master':
                resolved.resolvedTarget = 'master';
                break;
            case 'focusedUIElement':
                resolved.resolvedTarget = context.focusedElement || context.activeControl;
                // If no focused element, trigger clarification
                if (!resolved.resolvedTarget) {
                    resolved.needsClarification = true;
                    resolved.clarificationQuestion = "What should I adjust? Select a track or hover over a control first.";
                }
                break;
            case 'transport':
                resolved.resolvedTarget = 'transport';
                break;
            default:
                resolved.resolvedTarget = action.target;
        }
        
        // Check if parameter delta needs clarification
        if (action.type === 'parameterDelta' && action.payload) {
            if (action.payload.amount === undefined || action.payload.amount === null) {
                resolved.needsClarification = true;
                resolved.clarificationQuestion = this.getClarificationQuestion('amount', action.payload.paramName);
            }
        }
        
        return resolved;
    }
    
    /**
     * Execute an ActionPlan
     */
    async execute(plan) {
        const startTime = performance.now();
        const results = [];
        
        try {
            for (const action of plan.actions) {
                const result = await this.executeAction(action);
                results.push(result);
                
                if (!result.success) {
                    console.warn('⚠️ Action failed:', result.error);
                }
            }
            
            const elapsed = performance.now() - startTime;
            
            this.lastExecution = {
                plan,
                results,
                elapsed: elapsed.toFixed(2) + 'ms',
                success: results.every(r => r.success),
                timestamp: Date.now()
            };
            
            return {
                success: this.lastExecution.success,
                confirmation: plan.confirmationText,
                results,
                elapsed: this.lastExecution.elapsed
            };
            
        } catch (e) {
            console.error('❌ Execution failed:', e);
            return {
                success: false,
                error: e.message,
                confirmation: "Something went wrong."
            };
        }
    }
    
    /**
     * Execute a single action
     */
    async executeAction(action) {
        try {
            switch (action.type) {
                case 'reaperAction':
                    return await this.executeReaperAction(action);
                    
                case 'reaperScript':
                    return await this.executeReaperScript(action);
                    
                case 'fxChain':
                    return await this.executeFxChain(action);
                    
                case 'parameterDelta':
                    return await this.executeParameterDelta(action);
                    
                default:
                    return { success: false, error: `Unknown action type: ${action.type}` };
            }
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    /**
     * Execute REAPER action by ID
     */
    async executeReaperAction(action) {
        const actionId = action.payload?.reaperActionId;
        if (!actionId) {
            return { success: false, error: 'No action ID specified' };
        }
        
        if (window.api && window.api.executeReaperAction) {
            await window.api.executeReaperAction(actionId);
            return { success: true, action: 'reaperAction', actionId };
        }
        
        return { success: false, error: 'REAPER API not available' };
    }
    
    /**
     * Execute REAPER script
     */
    async executeReaperScript(action) {
        const scriptPath = action.payload?.reaperScriptPath;
        if (!scriptPath) {
            return { success: false, error: 'No script path specified' };
        }
        
        // Script execution would go through REAPER's HTTP API
        // For now, return success as a stub
        console.log('📜 Would execute script:', scriptPath);
        return { success: true, action: 'reaperScript', scriptPath };
    }
    
    /**
     * Execute FX chain loading
     */
    async executeFxChain(action) {
        const chainName = action.payload?.fxChainName;
        if (!chainName) {
            return { success: false, error: 'No FX chain specified' };
        }
        
        // FX chain loading would go through REAPER's HTTP API
        console.log('🎛️ Would load FX chain:', chainName);
        return { success: true, action: 'fxChain', chainName };
    }
    
    /**
     * Execute parameter delta (volume, pan, etc.)
     */
    async executeParameterDelta(action) {
        const payload = action.payload;
        if (!payload) {
            return { success: false, error: 'No payload specified' };
        }
        
        const { paramName, amount, unit } = payload;
        const target = action.resolvedTarget;
        
        // Map parameter names to REAPER commands
        switch (paramName) {
            case 'volume':
                if (window.api?.executeTrackCommand) {
                    await window.api.executeTrackCommand('volume', target, amount);
                    return { success: true, action: 'volume', target, delta: amount, unit };
                }
                return { success: false, error: 'REAPER track API not available - is REAPER connected?' };
                
            case 'pan':
                if (window.api?.executeTrackCommand) {
                    await window.api.executeTrackCommand('pan', target, amount);
                    return { success: true, action: 'pan', target, delta: amount, unit };
                }
                return { success: false, error: 'REAPER track API not available - is REAPER connected?' };
                
            case 'mute':
            case 'solo':
            case 'recarm':
                if (window.api?.executeTrackCommand) {
                    await window.api.executeTrackCommand(paramName, target);
                    return { success: true, action: paramName, target };
                }
                return { success: false, error: 'REAPER track API not available - is REAPER connected?' };
                
            case 'comp':
            case 'eq':
            case 'reverb':
                // These would require FX parameter control
                // For now, log the intent
                console.log(`🎛️ Would adjust ${paramName} by ${amount}${unit} on ${target}`);
                return { success: true, action: paramName, target, delta: amount, unit, note: 'FX control not yet implemented' };
                
            case 'width':
                console.log(`🎛️ Would adjust width by ${amount}${unit} on ${target}`);
                return { success: true, action: 'width', target, delta: amount, unit, note: 'Width control not yet implemented' };
                
            default:
                return { success: false, error: `Unknown parameter: ${paramName}` };
        }
    }
    
    /**
     * Get studio-style confirmation
     */
    getStudioConfirmation(sentiment) {
        if (!this.studioToneEnabled) {
            return 'Done.';
        }
        
        const phrases = this.CONFIRMATIONS[sentiment] || this.CONFIRMATIONS.neutral;
        return phrases[Math.floor(Math.random() * phrases.length)];
    }
    
    /**
     * Get studio-style response for vibe phrases
     */
    getVibeResponse(vocabContext) {
        if (!this.studioToneEnabled) {
            return null;
        }
        
        const { sentiment, category, phrase } = vocabContext.vocabMatch;
        
        if (sentiment === 'positive') {
            const responses = [
                "Facts.",
                "No cap, that's fire.",
                "We cooking now.",
                "That's the one.",
                "Love that energy."
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        if (sentiment === 'negative') {
            const followUps = [
                "I feel you. Want me to clean it up?",
                "Say less. Should I fix the EQ, comp, or levels?",
                "Got you. What needs work - tone, timing, or volume?",
                "I hear it. Want me to tighten it up?"
            ];
            return followUps[Math.floor(Math.random() * followUps.length)];
        }
        
        return "Copy.";
    }
    
    /**
     * Get clarification question
     */
    getClarificationQuestion(type, paramName) {
        if (type === 'amount') {
            switch (paramName) {
                case 'volume':
                    return "Bet. How much? 1dB, 3dB, or 5dB?";
                case 'pan':
                    return "How far? 10%, 25%, or hard?";
                case 'comp':
                    return "Light, medium, or heavy?";
                default:
                    return "How much should I adjust it?";
            }
        }
        
        return "Can you be more specific?";
    }
    
    /**
     * Parse amount from user response
     */
    parseAmountResponse(response, paramName) {
        const lower = response.toLowerCase();
        
        // Check for numeric values
        const numMatch = lower.match(/(\d+(?:\.\d+)?)\s*(db|percent|%|ms)?/);
        if (numMatch) {
            return {
                amount: parseFloat(numMatch[1]),
                unit: numMatch[2] || this.getDefaultUnit(paramName)
            };
        }
        
        // Check for descriptive terms
        if (lower.includes('light') || lower.includes('little') || lower.includes('subtle')) {
            return { amount: 1, unit: this.getDefaultUnit(paramName) };
        }
        if (lower.includes('medium') || lower.includes('moderate')) {
            return { amount: 3, unit: this.getDefaultUnit(paramName) };
        }
        if (lower.includes('heavy') || lower.includes('lot') || lower.includes('hard')) {
            return { amount: 5, unit: this.getDefaultUnit(paramName) };
        }
        
        return null;
    }
    
    /**
     * Get default unit for parameter
     */
    getDefaultUnit(paramName) {
        switch (paramName) {
            case 'volume':
            case 'eq':
                return 'db';
            case 'pan':
            case 'comp':
            case 'reverb':
            case 'width':
                return 'percent';
            default:
                return 'db';
        }
    }
    
    /**
     * Get last execution for debugging
     */
    getLastExecution() {
        return this.lastExecution;
    }
}

// Global instance
window.studioVocabularyExecutor = new StudioVocabularyExecutor();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudioVocabularyExecutor;
}
