/**
 * RHEA AI Agent Module
 * Provides intelligent command understanding, context awareness, and conversational capabilities
 */

class AIAgent {
    constructor(config = {}) {
        this.config = {
            // API Configuration
            provider: config.provider || 'openai', // 'openai', 'anthropic', 'gemini' (Gemini 3), 'local'
            apiKey: config.apiKey || null,
            model: config.model || 'gpt-4o', // Full GPT-4o for best natural language understanding
            baseURL: config.baseURL || null, // For local models or custom endpoints
            
            // Agent Behavior
            temperature: config.temperature || 0.8, // Higher for more natural responses
            maxTokens: config.maxTokens || 800, // Increased for fuller responses
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
        return `You are RHEA (Responsive Heuristic Environment Assistant), an expert AI assistant for REAPER DAW. You have deep knowledge of audio production, mixing, MIDI, and music production. You speak naturally like a professional studio colleague.

# Your Expertise

## REAPER Interface Knowledge
- **TCP (Track Control Panel)**: Track controls in arrange view - volume, pan, mute, solo, arm, FX
- **MCP (Mixer Control Panel)**: Full mixer view with faders, sends, routing. Use "Channel" terminology here.
- **Arrange View**: Timeline with tracks, items, regions, markers. Use "Track" terminology here.
- **Transport Bar**: Play, stop, record, loop, tempo, time signature
- **Recording Modes**: Input (audio/MIDI), Overdub (layer), Replace (overwrite), Output (bounce), Disable (monitor only)
- **Editing**: Non-destructive, splits at S key, takes/comping, unlimited undo

## REAPER Keyboard Shortcuts
- **Transport**: Space=Play/Stop, R=Record, Enter=Pause, W=Go to start, End=Go to end
- **Editing**: S=Split, G=Glue, Delete=Remove, Ctrl+Z=Undo, Ctrl+Shift+Z=Redo, Ctrl+D=Duplicate
- **Navigation**: +/-=Zoom, Tab=Next transient, [/]=Prev/Next marker, Ctrl+M=Toggle mixer
- **Tracks**: Ctrl+T=New track, M=Mute selected, S=Solo selected, R=Arm/disarm
- **View**: F=Toggle FX, Alt+R=Routing, 1-9=Screensets

## Mixing Knowledge
- **Gain Staging**: Aim for -18dBFS to -12dBFS on tracks. Leave headroom. Master at 0dB.
- **EQ Ranges**: Sub-bass 20-60Hz, Bass 60-250Hz, Low-mids 250-500Hz (muddy), Mids 500Hz-2kHz, Presence 2-6kHz, Air 6-20kHz
- **EQ Tips**: Cut before boost. High-pass most tracks (80-100Hz). Cut mud at 200-400Hz. Boost presence 3-5kHz for vocals.
- **Compression**: 3:1 to 4:1 for vocals. Faster attack = less punch. Aim for 3-6dB reduction. Use makeup gain.
- **Compressor Types**: VCA=clean/transparent, FET(1176)=fast/aggressive, Optical(LA-2A)=smooth, Variable-mu=warm
- **Reverb**: Use sends not inserts. Pre-delay 20-40ms. Short=intimate, Long=epic. Roll off lows on reverb.
- **Panning**: Keep bass, kick, snare, vocals centered. Pan guitars L/R. Mirror panning for balance.

## Common Fixes
- **Muddy mix**: Cut 200-400Hz across multiple tracks
- **Harsh vocals**: Cut 2-4kHz, use de-esser
- **Thin sound**: Boost 100-200Hz, add saturation
- **No punch**: Use parallel compression, slower attack
- **Cluttered mix**: High-pass everything except bass/kick

## Routing Knowledge
- **Sends/Aux**: Route to bus tracks for shared reverb/delay. Pre-fader=independent, Post-fader=follows
- **Sidechaining**: Route kick to bass compressor sidechain for pumping effect. Duck pads under vocals.
- **Folder Tracks**: Group related tracks (drums, vocals). Folder acts as submix bus.
- **Buses**: Create drum bus, vocal bus, etc. for group processing

## Troubleshooting
- **No sound**: Check mute/solo, routing to master, audio device, master fader
- **High latency**: Lower buffer size, use ASIO/CoreAudio, disable heavy plugins, use direct monitoring
- **CPU spikes**: Freeze tracks, increase buffer, reduce plugins, enable anticipative FX
- **Can't record**: Check arm button, input selection, input levels, mic permissions

## Studio Slang You Understand
- "Hit it" / "Let's hear it" = Play
- "Kill it" / "Cut it" = Stop  
- "Roll tape" = Record
- "From the top" = Go to start
- "Bring it up/down" = Volume up/down
- "Push it" = Make louder/more present
- "Punch in" = Start recording at cursor
- "Nuke it" = Delete
- "It's pumping" = Over-compressed/sidechaining
- "Add some air" = Boost high frequencies
- "Tighten it up" = More compression or quantize
- "Duck it" = Lower volume, sidechain

# Current Session
- Project: ${this.dawContext.projectName || 'Unknown'}
- Transport: ${this.dawContext.isPlaying ? 'Playing' : 'Stopped'} ${this.dawContext.isRecording ? '(Recording)' : ''}
- Tracks: ${this.dawContext.trackCount}
- Last Action: ${this.dawContext.lastAction || 'None'}

# Available Tools
${this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

# How To Respond

## For Commands (Be Brief!)
- "let's hear it" → "Playing" or "Here we go"
- "gimme a track" → "Track added"
- "kill track 3" → "Track 3 muted"
- "roll tape" → "Recording"

## For Questions (Be Helpful)
- Explain concepts using audio analogies
- Offer practical tips
- Keep it conversational, not robotic

## For Problems (Be Supportive)
- "Hmm, that didn't work. Let me try again."
- "That is frustrating. Want to try a different approach?"
- Never say "I don't understand" - guide them instead

## For Encouragement
- "Nice take!" / "Sounding good!"
- "Saved! Your work is safe."
- "Got it - that was a good one"

# Natural Language Rules

1. **Context-Aware**: "this track" = selected, "that" = recently mentioned
2. **Interpret Intent**: Understand casual speech and slang
3. **Handle Numbers**: "track five", "the 5th one", "number 5" all work
4. **Multi-Commands**: "stop and rewind" = stop, then go to start
5. **Assume Best Intent**: Choose logical studio actions when unclear

# Your Personality

You're a professional but warm studio colleague who:
- Uses contractions naturally ("I'll", "you're", "that's", "let's")
- Keeps command responses to 3-10 words
- Explains things when asked without being condescending
- Celebrates wins briefly ("Nice!" / "Perfect!" / "Nailed it!")
- Stays patient and solution-focused
- Never sounds robotic or says "I am processing your request"

# Natural Conversation Style

**Understand casual speech like:**
- "Can you help me with this mix?" → Have a conversation about mixing
- "The vocals sound harsh" → Offer EQ advice (cut 2-4kHz)
- "I don't know what I'm doing wrong" → Ask clarifying questions
- "What do you think?" → Give honest, helpful feedback
- "Tell me about compression" → Explain like a colleague would

**Handle incomplete requests:**
- "That one" → Ask "Which track?" or use context
- "Make it sound better" → "What's bothering you about it?"
- "I'm not sure" → Offer options or suggestions
- "Just... I don't know" → "No worries! Tell me what you're trying to achieve"

**Be conversational, not transactional:**
- Don't just execute commands - engage naturally
- Ask follow-up questions when appropriate
- Offer unsolicited tips when relevant
- Remember context from earlier in the session
- Use humor sparingly but naturally

**Understand music producer mindset:**
- Creative sessions need flow - be quick and supportive
- Technical questions deserve thorough answers
- Frustration happens - be patient and helpful
- Celebrate creative wins and progress

Remember: You're a real assistant working alongside a creative professional. Be efficient during recording, collaborative during mixing, and always supportive. You're not just a command executor - you're a knowledgeable studio partner.`;
    }
    
    /**
     * Initialize available tools (REAPER actions)
     */
    initializeTools() {
        return [
            {
                name: 'play',
                description: 'Start or resume playback. Natural variations: "play", "hit play", "let\'s hear it", "start playback", "can you play that", "play this"',
                parameters: {},
                action: 'play'
            },
            {
                name: 'stop',
                description: 'Stop playback immediately. Natural variations: "stop", "stop it", "halt", "stop playback", "cut it", "kill it"',
                parameters: {},
                action: 'stop'
            },
            {
                name: 'pause',
                description: 'Pause playback (can resume). Natural variations: "pause", "hold on", "wait", "pause it", "freeze"',
                parameters: {},
                action: 'pause'
            },
            {
                name: 'record',
                description: 'Start recording. Natural variations: "record", "start recording", "hit record", "let\'s record", "roll tape", "arm and record"',
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
                description: 'Create a new track. Natural variations: "new track", "add a track", "create track", "gimme a track", "make a new track", "I need another track"',
                parameters: {},
                action: 'newtrack'
            },
            {
                name: 'delete_track',
                description: 'Delete a specific track by number. Natural variations: "delete track 5", "remove track 3", "get rid of track 2", "kill track 4", "trash the third track". ALWAYS extract track number.',
                parameters: {
                    track_number: { type: 'number', description: 'Track number to delete (1-based). Extract from: "track 5", "track five", "the 5th track", "number 5"' }
                },
                required: ['track_number'],
                action: 'deletetrack'
            },
            {
                name: 'mute_track',
                description: 'Mute the selected track or a specific track. Natural variations: "mute", "mute track", "silence track 3", "shut off track 2", "turn off that track"',
                parameters: {},
                action: 'mute'
            },
            {
                name: 'unmute_track',
                description: 'Unmute the selected track. Natural variations: "unmute", "unmute track", "turn on track 3", "bring back track 2", "enable that track"',
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
            // === PHASE 1: RECORDING ESSENTIALS ===
            {
                name: 'arm_track',
                description: 'Arm selected track for recording. Natural variations: "arm track", "record arm", "arm this track", "enable recording", "ready to record"',
                parameters: {},
                action: 'armtrack'
            },
            {
                name: 'disarm_track',
                description: 'Disarm selected track from recording. Natural variations: "disarm track", "unarm track", "disable recording", "unarm", "take off record"',
                parameters: {},
                action: 'disarmtrack'
            },
            {
                name: 'arm_all_tracks',
                description: 'Arm all tracks for recording. Natural variations: "arm all tracks", "arm everything", "record arm all", "enable all recording"',
                parameters: {},
                action: 'armall'
            },
            {
                name: 'disarm_all_tracks',
                description: 'Disarm all tracks from recording. Natural variations: "disarm all tracks", "unarm all", "disable all recording", "unarm everything"',
                parameters: {},
                action: 'disarmall'
            },
            {
                name: 'punch_in',
                description: 'Start punch-in recording at current position. Natural variations: "punch in", "punch record", "start punch", "drop in", "punch in recording"',
                parameters: {},
                action: 'punchin'
            },
            {
                name: 'punch_out',
                description: 'Stop punch-out recording but continue playback. Natural variations: "punch out", "stop punch", "end punch", "drop out", "punch out recording"',
                parameters: {},
                action: 'punchout'
            },
            {
                name: 'toggle_auto_punch',
                description: 'Toggle automatic punch in/out mode. Natural variations: "auto punch", "toggle auto punch", "enable auto punch", "turn on auto punch"',
                parameters: {},
                action: 'autopunch'
            },
            {
                name: 'overdub_mode',
                description: 'Enable overdub recording mode (layers recordings). Natural variations: "overdub", "overdub mode", "layer recording", "enable overdub", "turn on overdub"',
                parameters: {},
                action: 'overdub'
            },
            {
                name: 'replace_mode',
                description: 'Enable replace recording mode (overwrites existing audio). Natural variations: "replace mode", "replace recording", "overwrite mode", "enable replace", "turn on replace"',
                parameters: {},
                action: 'replacemode'
            },
            {
                name: 'tape_mode',
                description: 'Enable tape-style replace mode. Natural variations: "tape mode", "tape style", "enable tape mode", "turn on tape mode"',
                parameters: {},
                action: 'tapemode'
            },
            {
                name: 'loop_record',
                description: 'Enable loop recording mode (records multiple takes in a loop). Natural variations: "loop record", "loop recording", "enable loop record", "record in loop", "turn on loop recording"',
                parameters: {},
                action: 'looprecord'
            },
            {
                name: 'input_monitoring_on',
                description: 'Enable input monitoring on selected track. Natural variations: "monitor on", "input monitoring", "enable monitoring", "turn on monitor", "monitor input"',
                parameters: {},
                action: 'monitoron'
            },
            {
                name: 'input_monitoring_off',
                description: 'Disable input monitoring on selected track. Natural variations: "monitor off", "disable monitoring", "turn off monitor", "stop monitoring"',
                parameters: {},
                action: 'monitoroff'
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
            case 'gemini':
                return await this.callGemini(messages, tools);
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
                    required: tool.required || []  // Use tool's required array if provided
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
            case 'gemini':
                // Google Gemini keys start with 'AI'
                if (!trimmed.startsWith('AI')) {
                    return { valid: false, error: 'Gemini API key must start with "AI"' };
                }
                if (trimmed.length < 20) {
                    return { valid: false, error: 'Gemini API key appears to be too short' };
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
                    // OpenAI chat/completions now expects max_completion_tokens
                    max_completion_tokens: this.config.maxTokens
                })
            });
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;

                // Read body ONCE to avoid "body stream already read"
                let bodyText = '';
                try {
                    bodyText = await response.text();
                } catch (_) {
                    bodyText = '';
                }

                // Try to parse JSON from the captured text
                try {
                    const errorData = bodyText ? JSON.parse(bodyText) : null;
                    if (errorData && errorData.error) {
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
                    } else if (bodyText) {
                        errorMessage = bodyText;
                    }
                } catch (_) {
                    if (bodyText) {
                        errorMessage = bodyText;
                    }
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
                    // Use max_completion_tokens for compatibility with newer OpenAI API
                    max_completion_tokens: this.config.maxTokens,
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
     * Call Google Gemini API
     */
    async callGemini(messages, tools) {
        // Validate API key
        const validation = this.validateAPIKey(this.config.apiKey, 'gemini');
        if (!validation.valid) {
            throw new Error(`Invalid API key: ${validation.error}`);
        }
        
        const apiKey = this.config.apiKey.trim();
        const model = this.config.model || 'gemini-3.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        // Convert messages to Gemini format
        const contents = [];
        let systemInstruction = null;
        
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction = { parts: [{ text: msg.content }] };
            } else if (msg.role === 'user') {
                contents.push({
                    role: 'user',
                    parts: [{ text: msg.content }]
                });
            } else if (msg.role === 'assistant') {
                contents.push({
                    role: 'model',
                    parts: [{ text: msg.content }]
                });
            }
        }
        
        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: this.config.temperature || 0.7,
                maxOutputTokens: this.config.maxTokens || 800,
            }
        };
        
        if (systemInstruction) {
            requestBody.systemInstruction = systemInstruction;
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Invalid API key. Please check your API key at https://aistudio.google.com/app/apikey');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                throw new Error(`Gemini API error (${response.status}): ${errorData.error?.message || response.statusText}`);
            }
            
            const data = await response.json();
            
            // Parse Gemini response format
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('No response from Gemini');
            }
            
            const candidate = data.candidates[0];
            const text = candidate.content.parts.map(part => part.text).join('');
            
            return {
                content: text,
                finish_reason: candidate.finishReason?.toLowerCase() || 'stop'
            };
            
        } catch (error) {
            // Re-throw with better error message
            if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Invalid API key')) {
                throw new Error('Invalid API key. Please check your API key in AI Settings. Make sure it starts with "AI" and is complete.');
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
                    // Extract function arguments (parameters like track_number)
                    let parameters = {};
                    try {
                        const argsString = toolCall.function?.arguments || '{}';
                        parameters = typeof argsString === 'string' ? JSON.parse(argsString) : argsString;
                        console.log('🤖 AI extracted parameters:', parameters);
                    } catch (e) {
                        console.warn('Failed to parse AI function arguments:', e);
                    }
                    
                    return {
                        text: this.generateToolResponse(tool, parameters),
                        action: tool.action,
                        tool: toolName,
                        parameters: parameters,  // Include parameters from AI
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
    generateToolResponse(tool, parameters = {}) {
        // Include track number in response if provided
        if (parameters.track_number) {
            const trackNum = parameters.track_number;
            const trackResponses = {
                'delete_track': `Deleting track ${trackNum}`,
                'mute_track': `Muting track ${trackNum}`,
                'unmute_track': `Unmuting track ${trackNum}`,
                'solo_track': `Soloing track ${trackNum}`,
                'unsolo_track': `Unsoloing track ${trackNum}`,
            };
            if (trackResponses[tool.name]) {
                return trackResponses[tool.name];
            }
        }
        
        // Default responses
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

