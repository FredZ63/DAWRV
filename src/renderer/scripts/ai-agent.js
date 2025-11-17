/**
 * RHEA AI Agent Module
 * Provides intelligent command understanding, context awareness, and conversational capabilities
 */

class AIAgent {
    constructor(config = {}) {
        this.config = {
            // API Configuration
            provider: config.provider || 'openai', // 'openai', 'anthropic', 'local'
            apiKey: config.apiKey || null,
            model: config.model || 'gpt-4o-mini', // or 'claude-3-haiku', 'llama3', etc.
            baseURL: config.baseURL || null, // For local models or custom endpoints
            
            // Agent Behavior
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens || 500,
            enableMemory: config.enableMemory !== false, // Default true
            maxContextLength: config.maxContextLength || 10, // Number of messages to remember
            
            // Tool/Function Calling
            enableTools: config.enableTools !== false, // Default true
            toolTimeout: config.toolTimeout || 5000, // ms
            
            // Rate Limiting
            retryOnRateLimit: config.retryOnRateLimit !== false, // Default true
            maxRetries: config.maxRetries || 2,
            retryDelay: config.retryDelay || 1000, // ms
            exponentialBackoff: config.exponentialBackoff !== false, // Default true
            
            // Fallback
            fallbackToKeyword: config.fallbackToKeyword !== false, // Default true
        };
        
        // Rate limit tracking
        this.rateLimitInfo = {
            isRateLimited: false,
            retryAfter: null,
            lastRateLimitTime: null
        };
        
        // Context Management
        this.conversationHistory = [];
        this.dawContext = {
            projectName: null,
            isPlaying: false,
            isRecording: false,
            trackCount: 0,
            selectedTracks: [],
            lastAction: null,
            lastActionTime: null,
        };
        
        // Available Tools (REAPER actions)
        this.tools = this.initializeTools();
        
        // System Prompt (will be built async)
        this.systemPrompt = '';
        
        // Knowledge Base (optional)
        this.knowledgeBase = config.knowledgeBase || null;
        
        // Initialize system prompt
        this.buildSystemPrompt().then(prompt => {
            this.systemPrompt = prompt;
        }).catch(e => {
            console.warn('Failed to build initial system prompt:', e);
            this.systemPrompt = this.getDefaultSystemPrompt();
        });
    }
    
    /**
     * Get default system prompt (fallback)
     */
    getDefaultSystemPrompt() {
        return `You are RHEA (Responsive Heuristic Environment Assistant), an AI assistant for DAWRV - a Digital Audio Workstation voice control system.

Your role:
- Understand user voice commands and convert them to REAPER actions
- Provide natural, conversational responses like a real studio assistant
- Remember context from previous interactions
- Troubleshoot issues and explain what's happening
- Be empathetic, patient, and helpful
- Communicate like a professional audio engineer assistant

Current DAW Context:
- Project: ${this.dawContext.projectName || 'Unknown'}
- Playing: ${this.dawContext.isPlaying ? 'Yes' : 'No'}
- Recording: ${this.dawContext.isRecording ? 'Yes' : 'No'}
- Tracks: ${this.dawContext.trackCount}
- Last Action: ${this.dawContext.lastAction || 'None'}

Available Tools:
${this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Guidelines:
1. **For Action Commands**: Use the appropriate tool and confirm briefly (5-10 words)
2. **For Conversational Queries** ("are you listening?", "what's wrong?", "can you hear me?"):
   - Respond naturally without using tools
   - Show empathy and understanding
   - Offer to help troubleshoot
   - Ask what they need assistance with
3. **For Troubleshooting** ("why didn't that work?", "what happened?"):
   - Acknowledge the issue
   - Explain what you did
   - Offer to try again or suggest alternatives
4. **For Clarification** ("what can you do?", "help"):
   - Explain your capabilities naturally
   - Give examples of commands
   - Be encouraging

Personality:
- Professional but warm
- Patient and understanding
- Proactive in offering help
- Clear and concise when executing commands
- More conversational when troubleshooting or chatting

Remember: You're a real assistant, not just a command parser. Treat the user like a colleague working on an important project.`;
    }
    
    /**
     * Initialize available tools (REAPER actions)
     */
    initializeTools() {
        return [
            {
                name: 'play',
                description: 'Start playback in REAPER',
                parameters: {},
                action: 'play'
            },
            {
                name: 'stop',
                description: 'Stop playback in REAPER',
                parameters: {},
                action: 'stop'
            },
            {
                name: 'pause',
                description: 'Pause playback in REAPER',
                parameters: {},
                action: 'pause'
            },
            {
                name: 'record',
                description: 'Start recording in REAPER',
                parameters: {},
                action: 'record'
            },
            {
                name: 'rewind',
                description: 'Rewind playback to start',
                parameters: {},
                action: 'rewind'
            },
            {
                name: 'goto_end',
                description: 'Move playback cursor to end of project',
                parameters: {},
                action: 'gotoend'
            },
            {
                name: 'toggle_loop',
                description: 'Toggle loop mode on/off',
                parameters: {},
                action: 'loop'
            },
            {
                name: 'undo',
                description: 'Undo the last action',
                parameters: {},
                action: 'undo'
            },
            {
                name: 'redo',
                description: 'Redo the last undone action',
                parameters: {},
                action: 'redo'
            },
            {
                name: 'save_project',
                description: 'Save the current project',
                parameters: {},
                action: 'save'
            },
            {
                name: 'save_project_as',
                description: 'Save the current project with a new name',
                parameters: {},
                action: 'saveas'
            },
            {
                name: 'new_project',
                description: 'Create a new project',
                parameters: {},
                action: 'newproject'
            },
            {
                name: 'open_project',
                description: 'Open an existing project',
                parameters: {},
                action: 'openproject'
            },
            {
                name: 'create_track',
                description: 'Create a new track',
                parameters: {},
                action: 'newtrack'
            },
            {
                name: 'delete_track',
                description: 'Delete the selected track',
                parameters: {},
                action: 'deletetrack'
            },
            {
                name: 'mute_track',
                description: 'Mute the selected track',
                parameters: {},
                action: 'mute'
            },
            {
                name: 'unmute_track',
                description: 'Unmute the selected track',
                parameters: {},
                action: 'unmute'
            },
            {
                name: 'solo_track',
                description: 'Solo the selected track',
                parameters: {},
                action: 'solo'
            },
            {
                name: 'unsolo_track',
                description: 'Un-solo the selected track',
                parameters: {},
                action: 'unsolo'
            },
            {
                name: 'next_track',
                description: 'Move selection to next track',
                parameters: {},
                action: 'nexttrack'
            },
            {
                name: 'previous_track',
                description: 'Move selection to previous track',
                parameters: {},
                action: 'previoustrack'
            },
            {
                name: 'zoom_in',
                description: 'Zoom in on the timeline',
                parameters: {},
                action: 'zoomin'
            },
            {
                name: 'zoom_out',
                description: 'Zoom out on the timeline',
                parameters: {},
                action: 'zoomout'
            },
            {
                name: 'zoom_all',
                description: 'Zoom to fit all content',
                parameters: {},
                action: 'zoomall'
            },
            {
                name: 'add_marker',
                description: 'Add a marker at the current position',
                parameters: {},
                action: 'addmarker'
            },
            {
                name: 'list_plugins',
                description: 'List all available plugins',
                parameters: {},
                action: 'listplugins'
            },
            {
                name: 'search_plugins',
                description: 'Search for plugins by name',
                parameters: {
                    query: {
                        type: 'string',
                        description: 'Plugin name or search term'
                    }
                },
                action: 'searchplugins'
            },
            {
                name: 'get_plugin_info',
                description: 'Get information about a specific plugin',
                parameters: {
                    pluginName: {
                        type: 'string',
                        description: 'Name of the plugin'
                    }
                },
                action: 'plugininfo'
            },
            {
                name: 'get_plugin_counts',
                description: 'Get counts of plugins by type (VST, VST3, AU, JS)',
                parameters: {},
                action: 'plugincounts'
            },
            {
                name: 'set_tempo',
                description: 'Set project tempo/BPM to a specific value',
                parameters: {
                    bpm: {
                        type: 'number',
                        description: 'Tempo in BPM (beats per minute), typically 60-200'
                    }
                },
                action: 'settempo'
            },
            {
                name: 'increase_tempo',
                description: 'Increase tempo/BPM by a specified amount',
                parameters: {
                    amount: {
                        type: 'number',
                        description: 'Amount to increase tempo by in BPM (default: 5)'
                    }
                },
                action: 'increasetempo'
            },
            {
                name: 'decrease_tempo',
                description: 'Decrease tempo/BPM by a specified amount',
                parameters: {
                    amount: {
                        type: 'number',
                        description: 'Amount to decrease tempo by in BPM (default: 5)'
                    }
                },
                action: 'decreasetempo'
            },
            {
                name: 'get_tempo',
                description: 'Get the current project tempo/BPM',
                parameters: {},
                action: 'gettempo'
            },
            {
                name: 'goto_bar',
                description: 'Move playback cursor to a specific bar/measure',
                parameters: {
                    bar: {
                        type: 'number',
                        description: 'Bar/measure number to jump to'
                    }
                },
                action: 'gotobar'
            },
            {
                name: 'play_from_bar',
                description: 'Start playback from a specific bar/measure',
                parameters: {
                    bar: {
                        type: 'number',
                        description: 'Bar/measure number to start playback from'
                    }
                },
                action: 'playfrombar'
            },
            {
                name: 'loop_bars',
                description: 'Loop a range of bars/measures',
                parameters: {
                    startBar: {
                        type: 'number',
                        description: 'Loop start bar'
                    },
                    endBar: {
                        type: 'number',
                        description: 'Loop end bar'
                    }
                },
                action: 'loopbars'
            }
        ];
    }
    
    /**
     * Build system prompt for the AI agent
     */
    async buildSystemPrompt() {
        let knowledgeContext = '';
        
        // If knowledge base is available, add relevant context
        if (this.knowledgeBase) {
            try {
                // Get general REAPER/music production context
                const context = await this.knowledgeBase.getContext('REAPER digital audio workstation music production', 1000);
                if (context) {
                    knowledgeContext = `\n\nAdditional Knowledge Base Context:\n${context}\n`;
                }
            } catch (e) {
                console.warn('Failed to get knowledge base context:', e);
            }
        }
        
        return `You are RHEA (Responsive Heuristic Environment Assistant), an AI assistant for DAWRV - a Digital Audio Workstation voice control system.

Your role:
- Understand user voice commands and convert them to REAPER actions
- Provide natural, conversational responses like a real studio assistant
- Remember context from previous interactions
- Troubleshoot issues and explain what's happening
- Be empathetic, patient, and helpful
- Communicate like a professional audio engineer assistant
- Use your knowledge base to provide accurate information about REAPER and music production

Current DAW Context:
- Project: ${this.dawContext.projectName || 'Unknown'}
- Playing: ${this.dawContext.isPlaying ? 'Yes' : 'No'}
- Recording: ${this.dawContext.isRecording ? 'Yes' : 'No'}
- Tracks: ${this.dawContext.trackCount}
- Last Action: ${this.dawContext.lastAction || 'None'}${knowledgeContext}

Available Tools:
${this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Guidelines:
1. **For Action Commands**: Use the appropriate tool and confirm briefly (5-10 words)
2. **For Conversational Queries** ("are you listening?", "what's wrong?", "can you hear me?"):
   - Respond naturally without using tools
   - Show empathy and understanding
   - Offer to help troubleshoot
   - Ask what they need assistance with
3. **For Troubleshooting** ("why didn't that work?", "what happened?"):
   - Acknowledge the issue
   - Explain what you did
   - Offer to try again or suggest alternatives
4. **For Clarification** ("what can you do?", "help"):
   - Explain your capabilities naturally
   - Give examples of commands
   - Be encouraging
5. Use knowledge base context to provide accurate, helpful information

Personality:
- Professional but warm
- Patient and understanding
- Proactive in offering help
- Clear and concise when executing commands
- More conversational when troubleshooting or chatting

Remember: You're a real assistant, not just a command parser. Treat the user like a colleague working on an important project.`;
    }
    
    /**
     * Update system prompt (call when knowledge base changes)
     */
    async updateSystemPrompt() {
        this.systemPrompt = await this.buildSystemPrompt();
    }
    
    /**
     * Update DAW context
     */
    updateDAWContext(context) {
        this.dawContext = { ...this.dawContext, ...context };
        
        // Rebuild system prompt asynchronously to reflect new context
        this.buildSystemPrompt()
            .then(prompt => {
                this.systemPrompt = prompt;
            })
            .catch(error => {
                console.warn('Failed to rebuild system prompt after context update:', error);
                // Fallback to default prompt to avoid leaving a Promise in systemPrompt
                this.systemPrompt = this.getDefaultSystemPrompt();
            });
    }
    
    /**
     * Process user input with AI
     */
    async processInput(userInput, reaperActions = {}) {
        try {
            // Check if we're currently rate limited
            if (this.rateLimitInfo.isRateLimited) {
                const now = Date.now();
                if (this.rateLimitInfo.retryAfter && now < this.rateLimitInfo.retryAfter) {
                    const waitTime = Math.ceil((this.rateLimitInfo.retryAfter - now) / 1000);
                    console.log(`⏳ Rate limited. Waiting ${waitTime} seconds...`);
                    // Don't throw error - return fallback response instead
                    if (this.config.fallbackToKeyword) {
                        console.log('🔄 Rate limited - using keyword matching fallback');
                        return this.fallbackToKeyword(userInput, reaperActions);
                    } else {
                        throw new Error(`Rate limit active. Please wait ${waitTime} seconds.`);
                    }
                } else {
                    // Rate limit period expired, reset
                    this.rateLimitInfo.isRateLimited = false;
                    this.rateLimitInfo.retryAfter = null;
                }
            }
            
            // Add user message to history
            this.addToHistory('user', userInput);
            
            // Try AI processing
            if (this.config.apiKey || this.config.provider === 'local') {
                const response = await this.callAIWithRetry(userInput, reaperActions);
                this.addToHistory('assistant', response.text);
                return response;
            } else {
                // Fallback to keyword matching if no API key
                console.log('⚠️  No API key configured, using keyword fallback');
                return this.fallbackToKeyword(userInput, reaperActions);
            }
        } catch (error) {
            console.error('❌ AI processing error:', error);
            
            // If rate limited and fallback enabled, use keyword matching
            if (error.message.includes('Rate limit') && this.config.fallbackToKeyword) {
                console.log('🔄 Rate limited - falling back to keyword matching');
                return this.fallbackToKeyword(userInput, reaperActions);
            }
            
            // Fallback to keyword matching on other errors
            if (this.config.fallbackToKeyword) {
                return this.fallbackToKeyword(userInput, reaperActions);
            }
            throw error;
        }
    }
    
    /**
     * Call AI with retry logic for rate limits
     */
    async callAIWithRetry(userInput, reaperActions, retryCount = 0) {
        try {
            return await this.callAI(userInput, reaperActions);
        } catch (error) {
            // Check if it's a rate limit error
            const isRateLimit = error.message.includes('Rate limit') || 
                               error.message.includes('429') ||
                               error.message.includes('rate_limit_exceeded');
            
            if (isRateLimit && this.config.retryOnRateLimit && retryCount < this.config.maxRetries) {
                // Calculate retry delay with exponential backoff
                const baseDelay = this.config.retryDelay;
                const delay = this.config.exponentialBackoff 
                    ? baseDelay * Math.pow(2, retryCount)
                    : baseDelay;
                
                console.log(`⏳ Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})...`);
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Retry
                return await this.callAIWithRetry(userInput, reaperActions, retryCount + 1);
            } else if (isRateLimit) {
                // Max retries reached or retry disabled
                this.rateLimitInfo.isRateLimited = true;
                this.rateLimitInfo.lastRateLimitTime = Date.now();
                // Estimate retry after 60 seconds (typical rate limit window)
                this.rateLimitInfo.retryAfter = Date.now() + 60000;
                throw error;
            } else {
                // Not a rate limit error, re-throw
                throw error;
            }
        }
    }
    
    /**
     * Call AI API
     */
    async callAI(userInput, reaperActions) {
        const messages = await this.buildMessages(userInput);
        
        // Add tool definitions if enabled
        const tools = this.config.enableTools ? this.formatToolsForAPI() : undefined;
        
        switch (this.config.provider) {
            case 'openai':
                return await this.callOpenAI(messages, tools);
            case 'anthropic':
                return await this.callAnthropic(messages, tools);
            case 'local':
                return await this.callLocalLLM(messages, tools);
            default:
                throw new Error(`Unsupported provider: ${this.config.provider}`);
        }
    }
    
    /**
     * Build messages array for API
     */
    async buildMessages(userInput) {
        // Get relevant knowledge base context for this query
        let queryContext = '';
        if (this.knowledgeBase) {
            try {
                queryContext = await this.knowledgeBase.getContext(userInput, 500);
            } catch (e) {
                console.warn('Failed to get query context:', e);
            }
        }
        
        // Build system prompt with query-specific context
        // Use default if system prompt not ready yet
        let systemPrompt = this.systemPrompt || this.getDefaultSystemPrompt();
        if (queryContext) {
            systemPrompt += `\n\nRelevant Context for this query:\n${queryContext}`;
        }
        
        const messages = [
            { role: 'system', content: systemPrompt }
        ];
        
        // Add conversation history if enabled
        if (this.config.enableMemory) {
            const recentHistory = this.conversationHistory.slice(-this.config.maxContextLength);
            messages.push(...recentHistory);
        }
        
        // Add current user input
        messages.push({ role: 'user', content: userInput });
        
        return messages;
    }
    
    /**
     * Format tools for API
     */
    formatToolsForAPI() {
        return this.tools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.parameters || {},
                    required: []
                }
            }
        }));
    }
    
    /**
     * Validate API key format
     */
    validateAPIKey(apiKey, provider) {
        if (!apiKey || apiKey.trim() === '') {
            return { valid: false, error: 'API key is required' };
        }
        
        const trimmed = apiKey.trim();
        
        switch (provider) {
            case 'openai':
                // OpenAI keys start with 'sk-' and are typically 51 characters
                if (!trimmed.startsWith('sk-')) {
                    return { valid: false, error: 'OpenAI API key must start with "sk-"' };
                }
                if (trimmed.length < 20) {
                    return { valid: false, error: 'OpenAI API key appears to be too short' };
                }
                break;
            case 'anthropic':
                // Anthropic keys start with 'sk-ant-' and are longer
                if (!trimmed.startsWith('sk-ant-')) {
                    return { valid: false, error: 'Anthropic API key must start with "sk-ant-"' };
                }
                if (trimmed.length < 30) {
                    return { valid: false, error: 'Anthropic API key appears to be too short' };
                }
                break;
            case 'local':
                // Local LLMs don't need API keys
                return { valid: true };
        }
        
        return { valid: true };
    }
    
    /**
     * Call OpenAI API
     */
    async callOpenAI(messages, tools) {
        // Validate API key
        const validation = this.validateAPIKey(this.config.apiKey, 'openai');
        if (!validation.valid) {
            throw new Error(`Invalid API key: ${validation.error}`);
        }
        
        const url = this.config.baseURL || 'https://api.openai.com/v1/chat/completions';
        
        // Ensure API key is trimmed and doesn't have extra characters
        const apiKey = this.config.apiKey.trim();
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages,
                    tools: tools,
                    tool_choice: tools ? 'auto' : undefined,
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens
                })
            });
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error.message || errorData.error.code || errorMessage;
                        
                        // Provide helpful error messages
                        if (response.status === 401) {
                            errorMessage = 'Invalid API key. Please check your API key at https://platform.openai.com/account/api-keys';
                        } else if (response.status === 429) {
                            // Try to extract retry-after header
                            const retryAfter = response.headers.get('retry-after');
                            if (retryAfter) {
                                const seconds = parseInt(retryAfter);
                                errorMessage = `Rate limit exceeded. Please wait ${seconds} seconds before trying again.`;
                            } else {
                                errorMessage = 'Rate limit exceeded. Please try again later or check your usage limits.';
                            }
                            // Mark as rate limited
                            this.rateLimitInfo.isRateLimited = true;
                            this.rateLimitInfo.lastRateLimitTime = Date.now();
                            if (retryAfter) {
                                this.rateLimitInfo.retryAfter = Date.now() + (parseInt(retryAfter) * 1000);
                            } else {
                                this.rateLimitInfo.retryAfter = Date.now() + 60000; // Default 60 seconds
                            }
                        } else if (response.status === 500) {
                            errorMessage = 'OpenAI server error. Please try again later.';
                        }
                    }
                } catch (e) {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            return this.parseAIResponse(data, tools);
        } catch (error) {
            // Re-throw with better error message
            if (error.message.includes('401') || error.message.includes('Invalid API key')) {
                throw new Error('Invalid API key. Please check your API key in AI Settings. Make sure it starts with "sk-" and is complete.');
            }
            throw error;
        }
    }
    
    /**
     * Call Anthropic API
     */
    async callAnthropic(messages, tools) {
        // Validate API key
        const validation = this.validateAPIKey(this.config.apiKey, 'anthropic');
        if (!validation.valid) {
            throw new Error(`Invalid API key: ${validation.error}`);
        }
        
        const url = this.config.baseURL || 'https://api.anthropic.com/v1/messages';
        
        // Convert messages format for Anthropic
        const system = messages.find(m => m.role === 'system')?.content || '';
        const conversation = messages.filter(m => m.role !== 'system');
        
        // Ensure API key is trimmed
        const apiKey = this.config.apiKey.trim();
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    system: system,
                    messages: conversation,
                    tools: tools,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature
                })
            });
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error.message || errorData.error.type || errorMessage;
                        
                        // Provide helpful error messages
                        if (response.status === 401) {
                            errorMessage = 'Invalid API key. Please check your API key at https://console.anthropic.com/';
                        } else if (response.status === 429) {
                            // Try to extract retry-after header
                            const retryAfter = response.headers.get('retry-after');
                            if (retryAfter) {
                                const seconds = parseInt(retryAfter);
                                errorMessage = `Rate limit exceeded. Please wait ${seconds} seconds before trying again.`;
                            } else {
                                errorMessage = 'Rate limit exceeded. Please try again later.';
                            }
                            // Mark as rate limited
                            this.rateLimitInfo.isRateLimited = true;
                            this.rateLimitInfo.lastRateLimitTime = Date.now();
                            if (retryAfter) {
                                this.rateLimitInfo.retryAfter = Date.now() + (parseInt(retryAfter) * 1000);
                            } else {
                                this.rateLimitInfo.retryAfter = Date.now() + 60000; // Default 60 seconds
                            }
                        }
                    }
                } catch (e) {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            return this.parseAIResponse(data, tools, 'anthropic');
        } catch (error) {
            // Re-throw with better error message
            if (error.message.includes('401') || error.message.includes('Invalid API key')) {
                throw new Error('Invalid API key. Please check your API key in AI Settings. Make sure it starts with "sk-ant-" and is complete.');
            }
            throw error;
        }
    }
    
    /**
     * Call local LLM (Ollama, LM Studio, etc.)
     */
    async callLocalLLM(messages, tools) {
        const url = this.config.baseURL || 'http://localhost:11434/v1/chat/completions';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: messages,
                tools: tools,
                temperature: this.config.temperature,
                stream: false
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Local LLM error: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        return this.parseAIResponse(data, tools);
    }
    
    /**
     * Parse AI response and extract tool calls
     */
    parseAIResponse(data, tools, provider = 'openai') {
        const choice = data.choices?.[0] || data.content?.[0];
        
        if (!choice) {
            throw new Error('No response from AI');
        }
        
        // Check for tool calls
        if (choice.message?.tool_calls || choice.tool_calls) {
            const toolCalls = choice.message?.tool_calls || choice.tool_calls || [];
            
            if (toolCalls.length > 0) {
                const toolCall = toolCalls[0];
                const toolName = toolCall.function?.name;
                const tool = this.tools.find(t => t.name === toolName);
                
                if (tool) {
                    return {
                        text: this.generateToolResponse(tool),
                        action: tool.action,
                        tool: toolName,
                        confidence: 0.95,
                        reasoning: choice.message?.content || 'AI determined this action'
                    };
                }
            }
        }
        
        // No tool call, return text response
        const text = choice.message?.content || choice.content || choice.text || '';
        
        return {
            text: text.trim(),
            action: null,
            tool: null,
            confidence: 0.8,
            reasoning: 'AI provided conversational response'
        };
    }
    
    /**
     * Generate natural response for tool execution
     */
    generateToolResponse(tool) {
        const responses = {
            'play': 'Starting playback',
            'stop': 'Stopping playback',
            'pause': 'Pausing playback',
            'record': 'Recording started',
            'rewind': 'Rewinding to start',
            'goto_end': 'Going to end',
            'toggle_loop': 'Toggling loop',
            'undo': 'Undoing last action',
            'redo': 'Redoing last action',
            'save_project': 'Saving project',
            'save_project_as': 'Saving project as',
            'new_project': 'Creating new project',
            'open_project': 'Opening project',
            'create_track': 'Creating new track',
            'delete_track': 'Deleting track',
            'mute_track': 'Muting track',
            'unmute_track': 'Unmuting track',
            'solo_track': 'Soloing track',
            'unsolo_track': 'Unsoloing track',
            'next_track': 'Moving to next track',
            'previous_track': 'Moving to previous track',
            'zoom_in': 'Zooming in',
            'zoom_out': 'Zooming out',
            'zoom_all': 'Zooming to fit all',
            'add_marker': 'Adding marker',
        };
        
        return responses[tool.name] || `Executing ${tool.name}`;
    }
    
    /**
     * Fallback to keyword matching
     */
    fallbackToKeyword(userInput, reaperActions) {
        const lower = userInput.toLowerCase();
        
        // Simple keyword matching
        for (const tool of this.tools) {
            if (lower.includes(tool.name.replace('_', ' ')) || 
                lower.includes(tool.action)) {
                return {
                    text: this.generateToolResponse(tool),
                    action: tool.action,
                    tool: tool.name,
                    confidence: 0.6,
                    reasoning: 'Keyword match fallback'
                };
            }
        }
        
        return {
            text: 'I didn\'t understand that command. Try: play, stop, record, save, or new track.',
            action: null,
            tool: null,
            confidence: 0,
            reasoning: 'No match found'
        };
    }
    
    /**
     * Add message to conversation history
     */
    addToHistory(role, content) {
        this.conversationHistory.push({ role, content });
        
        // Trim history if too long
        if (this.conversationHistory.length > this.config.maxContextLength * 2) {
            this.conversationHistory = this.conversationHistory.slice(-this.config.maxContextLength * 2);
        }
    }
    
    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.systemPrompt = this.buildSystemPrompt();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIAgent;
}

