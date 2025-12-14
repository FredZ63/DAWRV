/**
 * RHEA Natural Voice System
 * ==========================
 * Makes RHEA feel like a human companion, not a robot.
 * 
 * Features:
 * - Instant acknowledgments before actions
 * - Response variations (never repeat the same phrase twice)
 * - Natural fillers and personality
 * - Pre-cached common responses
 * - Contextual awareness
 */

class NaturalVoiceSystem {
    constructor() {
        // ========================================
        // QUICK ACKNOWLEDGMENTS
        // These play INSTANTLY before action completes
        // ========================================
        this.quickAcks = {
            positive: [
                "Got it",
                "On it", 
                "Sure thing",
                "You got it",
                "Done",
                "Alright",
                "Okay",
                "Right away",
                "There you go",
                "Easy"
            ],
            working: [
                "Let me...",
                "One sec...",
                "Working on it...",
                "Just a moment..."
            ],
            casual: [
                "Bet",
                "Say less",
                "I got you",
                "No problem",
                "Yup"
            ]
        };
        
        // ========================================
        // TRANSPORT RESPONSES
        // Varied responses for common commands
        // ========================================
        this.transportResponses = {
            play: [
                "Playing",
                "Here we go",
                "Rolling",
                "Let's hear it",
                "Playing now"
            ],
            stop: [
                "Stopped",
                "Holding",
                "All stopped",
                "Paused it"
            ],
            record: [
                "Recording now",
                "We're rolling",
                "Recording",
                "Go ahead, you're recording",
                "Capturing"
            ],
            pause: [
                "Paused",
                "On hold",
                "Taking a break"
            ],
            rewind: [
                "Back to the top",
                "Rewinding",
                "Going back",
                "From the top"
            ],
            loop: [
                "Loop is on",
                "Looping that section",
                "Got it looping"
            ]
        };
        
        // ========================================
        // TRACK/CHANNEL RESPONSES
        // ========================================
        this.trackResponses = {
            solo: [
                "channel {n} soloed",
                "Soloing channel {n}",
                "Just channel {n} now",
                "Isolating channel {n}"
            ],
            unsolo: [
                "Channel {n} back in the mix",
                "Unsolo'd channel {n}",
                "Channel {n} no longer solo"
            ],
            mute: [
                "Channel {n} muted",
                "Muting channel {n}",
                "Silencing channel {n}",
                "Channel {n} is quiet now"
            ],
            unmute: [
                "Channel {n} unmuted",
                "Bringing back channel {n}",
                "Channel {n} is live"
            ],
            arm: [
                "Channel {n} armed",
                "Ready to record on channel {n}",
                "Channel {n} is hot"
            ],
            disarm: [
                "Channel {n} disarmed",
                "Channel {n} safe now"
            ],
            volume: [
                "Channel {n} at {v}",
                "Set channel {n} to {v}",
                "Volume adjusted"
            ],
            pan: [
                "Channel {n} panned {v}",
                "Moved channel {n} {v}"
            ]
        };
        
        // ========================================
        // ERROR/CONFUSION RESPONSES
        // ========================================
        this.confusedResponses = [
            "Sorry, what was that?",
            "I didn't catch that",
            "Can you say that again?",
            "What was that?",
            "Come again?",
            "I missed that"
        ];
        
        this.errorResponses = [
            "Hmm, that didn't work",
            "Something went wrong",
            "I couldn't do that",
            "That didn't go through"
        ];
        
        // ========================================
        // PERSONALITY PHRASES
        // Add these occasionally for character
        // ========================================
        this.personalityPhrases = {
            encouraging: [
                "That's sounding good",
                "Nice work",
                "I like where this is going",
                "This is coming together"
            ],
            helpful: [
                "Need anything else?",
                "What else?",
                "I'm here"
            ]
        };
        
        // ========================================
        // RESPONSE TRACKING
        // Prevent repeating the same phrase
        // ========================================
        this.lastResponses = {};  // { category: lastIndex }
        this.responseHistory = []; // Last 10 responses
        this.maxHistory = 10;
        
        // ========================================
        // AUDIO CACHE
        // Pre-generate common responses
        // ========================================
        this.audioCache = new Map();
        this.isCaching = false;
        
        console.log('🎭 Natural Voice System initialized');
    }
    
    // ========================================
    // GET VARIED RESPONSE
    // Never repeat the same response twice in a row
    // ========================================
    
    getResponse(category, subcategory = null, replacements = {}) {
        let pool;
        
        // Find the right response pool
        if (subcategory && this[category] && this[category][subcategory]) {
            pool = this[category][subcategory];
        } else if (this[category] && Array.isArray(this[category])) {
            pool = this[category];
        } else {
            return null;
        }
        
        if (!pool || pool.length === 0) return null;
        
        // Get a different response than last time
        const key = `${category}_${subcategory}`;
        let lastIndex = this.lastResponses[key] || -1;
        let newIndex;
        
        if (pool.length === 1) {
            newIndex = 0;
        } else {
            // Pick random but different from last
            do {
                newIndex = Math.floor(Math.random() * pool.length);
            } while (newIndex === lastIndex && pool.length > 1);
        }
        
        this.lastResponses[key] = newIndex;
        let response = pool[newIndex];
        
        // Apply replacements (e.g., {n} → track number)
        for (const [placeholder, value] of Object.entries(replacements)) {
            response = response.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
        }
        
        // Track history
        this.responseHistory.push(response);
        if (this.responseHistory.length > this.maxHistory) {
            this.responseHistory.shift();
        }
        
        return response;
    }
    
    // ========================================
    // QUICK ACKNOWLEDGMENT
    // Returns an instant response before action
    // ========================================
    
    getQuickAck(style = 'positive') {
        const pool = this.quickAcks[style] || this.quickAcks.positive;
        return this.getResponse('quickAcks', style);
    }
    
    // ========================================
    // TRANSPORT RESPONSES
    // ========================================
    
    getTransportResponse(action) {
        return this.getResponse('transportResponses', action);
    }
    
    // ========================================
    // TRACK RESPONSES
    // ========================================
    
    getTrackResponse(action, trackNumber, value = null) {
        const replacements = { n: trackNumber };
        if (value !== null) replacements.v = value;
        
        return this.getResponse('trackResponses', action, replacements);
    }
    
    // ========================================
    // MAKE RESPONSE NATURAL
    // Transform robotic responses into natural ones
    // ========================================
    
    makeNatural(roboticResponse) {
        if (!roboticResponse) return null;
        
        const text = roboticResponse.toLowerCase();
        
        // Transport commands
        if (text.includes('playing')) {
            return this.getTransportResponse('play');
        }
        if (text.includes('stopped') || text.includes('stopping')) {
            return this.getTransportResponse('stop');
        }
        if (text.includes('recording')) {
            return this.getTransportResponse('record');
        }
        if (text.includes('paused')) {
            return this.getTransportResponse('pause');
        }
        if (text.includes('rewind') || text.includes('start of project')) {
            return this.getTransportResponse('rewind');
        }
        if (text.includes('loop')) {
            return this.getTransportResponse('loop');
        }
        
        // Track commands - extract track number
        const trackMatch = text.match(/(?:track|channel)\s*(\d+)/i);
        const trackNum = trackMatch ? trackMatch[1] : '?';
        
        if (text.includes('solo') && !text.includes('unsolo')) {
            return this.getTrackResponse('solo', trackNum);
        }
        if (text.includes('unsolo')) {
            return this.getTrackResponse('unsolo', trackNum);
        }
        if (text.includes('mute') && !text.includes('unmute')) {
            return this.getTrackResponse('mute', trackNum);
        }
        if (text.includes('unmute')) {
            return this.getTrackResponse('unmute', trackNum);
        }
        if (text.includes('arm') && !text.includes('disarm')) {
            return this.getTrackResponse('arm', trackNum);
        }
        if (text.includes('disarm')) {
            return this.getTrackResponse('disarm', trackNum);
        }
        
        // Couldn't transform - return original
        return roboticResponse;
    }
    
    // ========================================
    // AUDIO CACHING
    // Pre-generate common responses for instant playback
    // ========================================
    
    async cacheCommonResponses(speakFunction) {
        if (this.isCaching) return;
        this.isCaching = true;
        
        const toCache = [
            // Transport
            "Playing", "Stopped", "Recording", "Paused",
            // Quick acks
            "Got it", "On it", "Done", "Okay", "Sure thing",
            // Common tracks
            "Channel 1 soloed", "Channel 2 soloed", "Channel 1 muted"
        ];
        
        console.log('🎤 Pre-caching common voice responses...');
        
        for (const phrase of toCache) {
            try {
                // Generate and cache
                const audio = await this.generateAudio(phrase);
                if (audio) {
                    this.audioCache.set(phrase.toLowerCase(), audio);
                }
            } catch (e) {
                // Silent fail
            }
        }
        
        console.log(`✅ Cached ${this.audioCache.size} responses`);
        this.isCaching = false;
    }
    
    async generateAudio(text) {
        const aiConfig = JSON.parse(localStorage.getItem('rhea_ai_config') || '{}');
        const apiKey = aiConfig.apiKey;
        if (!apiKey) return null;
        
        try {
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: 'nova',
                    speed: 1.0
                })
            });
            
            if (response.ok) {
                return await response.blob();
            }
        } catch (e) {
            // Silent fail
        }
        return null;
    }
    
    getCachedAudio(text) {
        return this.audioCache.get(text.toLowerCase());
    }
    
    // ========================================
    // CONFUSION/ERROR
    // ========================================
    
    getConfusedResponse() {
        return this.getResponse('confusedResponses');
    }
    
    getErrorResponse() {
        return this.getResponse('errorResponses');
    }
}

// Global instance
window.NaturalVoice = new NaturalVoiceSystem();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NaturalVoiceSystem };
}





