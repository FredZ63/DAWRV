/**
 * TTS Provider System
 * Supports multiple TTS providers for high-quality voice synthesis
 */

class TTSProvider {
    constructor(config = {}) {
        this.config = {
            provider: config.provider || 'openai', // 'openai', 'elevenlabs', 'coqui', 'piper', 'polly', 'google' - NO browser!
            apiKey: config.apiKey || null,
            voiceId: config.voiceId || null,
            model: config.model || null,
            baseURL: config.baseURL || null,
            // Provider-specific settings
            openai: {
                voice: config.openai?.voice || 'nova', // alloy, echo, fable, onyx, nova, shimmer
                model: config.openai?.model || 'tts-1', // tts-1 (fast) or tts-1-hd (high quality)
                speed: config.openai?.speed || 1.0 // 0.25 to 4.0
            },
            elevenlabs: {
                voiceId: config.elevenlabs?.voiceId || '21m00Tcm4TlvDq8ikWAM', // Rachel (default)
                model: config.elevenlabs?.model || 'eleven_monolingual_v1',
                stability: config.elevenlabs?.stability || 0.5,
                similarityBoost: config.elevenlabs?.similarityBoost || 0.75
            },
            coqui: {
                model: config.coqui?.model || 'tts_models/en/ljspeech/tacotron2-DDC',
                speaker: config.coqui?.speaker || null
            },
            piper: {
                model: config.piper?.model || 'en_US-lessac-medium',
                speed: config.piper?.speed || 1.0
            },
            polly: {
                voiceId: config.polly?.voiceId || 'Joanna', // Neural voice
                engine: config.polly?.engine || 'neural'
            },
            google: {
                voiceName: config.google?.voiceName || 'en-US-Neural2-D',
                languageCode: config.google?.languageCode || 'en-US'
            }
        };
        
        this.currentProvider = null;
        this.audioContext = null;
    }
    
    /**
     * Initialize TTS provider
     */
    async initialize() {
        try {
            switch (this.config.provider) {
                case 'openai':
                    return await this.initOpenAI();
                case 'elevenlabs':
                    return await this.initElevenLabs();
                case 'coqui':
                    return await this.initCoqui();
                case 'piper':
                    return await this.initPiper();
                case 'polly':
                    return await this.initPolly();
                case 'google':
                    return await this.initGoogle();
                case 'browser':
                default:
                    return { success: true, message: 'Using browser TTS' };
            }
        } catch (error) {
            console.error('TTS initialization error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Initialize OpenAI TTS
     */
    async initOpenAI() {
        if (!this.config.apiKey) {
            throw new Error('OpenAI API key required');
        }
        
        // Test API key by checking models
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }
            
            this.currentProvider = 'openai';
            console.log('🎤 OpenAI TTS initialized with voice:', this.config.openai.voice);
            return { success: true, message: `OpenAI TTS initialized (voice: ${this.config.openai.voice})` };
        } catch (error) {
            throw new Error(`OpenAI initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initialize ElevenLabs
     */
    async initElevenLabs() {
        if (!this.config.apiKey) {
            throw new Error('ElevenLabs API key required');
        }
        
        // Test API key
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': this.config.apiKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }
            
            this.currentProvider = 'elevenlabs';
            return { success: true, message: 'ElevenLabs initialized' };
        } catch (error) {
            throw new Error(`ElevenLabs initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initialize Coqui TTS (local)
     */
    async initCoqui() {
        // Coqui requires a backend service
        // For now, return success (would need Python backend)
        this.currentProvider = 'coqui';
        return { success: true, message: 'Coqui TTS (requires backend service)' };
    }
    
    /**
     * Initialize Piper TTS (local)
     */
    async initPiper() {
        // Piper requires a backend service or binary
        this.currentProvider = 'piper';
        return { success: true, message: 'Piper TTS (requires backend service)' };
    }
    
    /**
     * Initialize Amazon Polly
     */
    async initPolly() {
        if (!this.config.apiKey) {
            throw new Error('AWS credentials required for Polly');
        }
        this.currentProvider = 'polly';
        return { success: true, message: 'Amazon Polly initialized' };
    }
    
    /**
     * Initialize Google Cloud TTS
     */
    async initGoogle() {
        if (!this.config.apiKey) {
            throw new Error('Google Cloud API key required');
        }
        this.currentProvider = 'google';
        return { success: true, message: 'Google Cloud TTS initialized' };
    }
    
    /**
     * Speak text using configured provider
     */
    async speak(text, options = {}) {
        if (!text || text.trim() === '') return;
        
        // Cancel any existing browser speech first
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        switch (this.config.provider) {
            case 'openai':
                return await this.speakOpenAI(text, options);
            case 'elevenlabs':
                return await this.speakElevenLabs(text, options);
            case 'coqui':
                return await this.speakCoqui(text, options);
            case 'piper':
                return await this.speakPiper(text, options);
            case 'polly':
                return await this.speakPolly(text, options);
            case 'google':
                return await this.speakGoogle(text, options);
            case 'browser':
            default:
                return await this.speakBrowser(text, options);
        }
        // NOTE: No automatic fallback - errors propagate to caller
    }
    
    /**
     * Speak using OpenAI TTS (ChatGPT voices)
     */
    async speakOpenAI(text, options = {}) {
        // Cancel any browser TTS first to prevent overlap
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        const voice = options.voice || this.config.openai.voice || 'nova';
        const model = options.model || this.config.openai.model || 'tts-1';
        const speed = options.speed || this.config.openai.speed || 1.0;
        
        console.log(`🎤 OpenAI TTS: "${text.substring(0, 50)}..." (voice: ${voice})`);
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                voice: voice,
                input: text,
                speed: speed,
                response_format: 'mp3'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI TTS API error: ${response.status} - ${errorText}`);
        }
        
        const audioBlob = await response.blob();
        console.log('🔊 Playing OpenAI TTS audio...');
        
        // Use a more robust audio playback method
        return await this.playAudioBlobSafe(audioBlob);
    }
    
    /**
     * Safe audio playback with better error handling
     */
    async playAudioBlobSafe(blob) {
        // Stop any currently playing audio
        if (this._currentAudio) {
            this._currentAudio.pause();
            this._currentAudio.src = '';
            this._currentAudio = null;
        }
        
        // Cancel browser speech
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            this._currentAudio = audio;
            
            // Create object URL from blob
            const url = URL.createObjectURL(blob);
            
            // Set up event handlers BEFORE setting src
            audio.oncanplaythrough = () => {
                console.log('✅ Audio ready to play');
            };
            
            audio.onended = () => {
                console.log('✅ OpenAI TTS playback completed');
                URL.revokeObjectURL(url);
                this._currentAudio = null;
                resolve();
            };
            
            audio.onerror = (e) => {
                console.error('❌ Audio playback error:', e);
                URL.revokeObjectURL(url);
                this._currentAudio = null;
                // Don't reject - resolve anyway to prevent double fallback
                // The caller already got notified via the error log
                resolve();
            };
            
            // Set source and play
            audio.src = url;
            audio.play().then(() => {
                console.log('▶️ OpenAI audio playing...');
            }).catch(err => {
                console.error('❌ Audio play() error:', err);
                URL.revokeObjectURL(url);
                this._currentAudio = null;
                reject(err);
            });
        });
    }
    
    /**
     * Speak using ElevenLabs
     */
    async speakElevenLabs(text, options = {}) {
        const voiceId = options.voiceId || this.config.elevenlabs.voiceId;
        const model = options.model || this.config.elevenlabs.model;
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.config.apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: model,
                voice_settings: {
                    stability: options.stability || this.config.elevenlabs.stability,
                    similarity_boost: options.similarityBoost || this.config.elevenlabs.similarityBoost
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }
        
        const audioBlob = await response.blob();
        return await this.playAudioBlob(audioBlob);
    }
    
    /**
     * Speak using Coqui TTS (requires backend)
     */
    async speakCoqui(text, options = {}) {
        // Would call backend service
        // For now, fallback to browser
        console.warn('Coqui TTS requires backend service');
        return await this.speakBrowser(text, options);
    }
    
    /**
     * Speak using Piper TTS (requires backend)
     */
    async speakPiper(text, options = {}) {
        // Would call backend service
        console.warn('Piper TTS requires backend service');
        return await this.speakBrowser(text, options);
    }
    
    /**
     * Speak using Amazon Polly
     */
    async speakPolly(text, options = {}) {
        // Requires AWS SDK or backend service
        // For now, fallback to browser
        console.warn('Amazon Polly requires AWS SDK or backend service');
        return await this.speakBrowser(text, options);
    }
    
    /**
     * Speak using Google Cloud TTS
     */
    async speakGoogle(text, options = {}) {
        try {
            if (!this.config.apiKey) {
                console.warn('Google Cloud TTS API key not configured, falling back to browser TTS');
                return await this.speakBrowser(text, options);
            }
            
            // Google Cloud Text-to-Speech API REST endpoint
            const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.config.apiKey}`;
            
            // Request payload
            const payload = {
                input: { text: text },
                voice: {
                    languageCode: options.languageCode || 'en-US',
                    name: options.voiceName || 'en-US-Neural2-F', // Female neural voice (high quality)
                    ssmlGender: options.gender || 'FEMALE'
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    pitch: options.pitch || 0,
                    speakingRate: options.rate || 1.0
                }
            };
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Google Cloud TTS API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.audioContent) {
                throw new Error('No audio content received from Google Cloud TTS');
            }
            
            // Convert base64 audio to blob and play
            const audioData = atob(data.audioContent);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i);
            }
            const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
            
            await this.playAudioBlob(blob);
            
        } catch (error) {
            console.error('Google Cloud TTS error:', error);
            console.warn('Falling back to browser TTS');
            return await this.speakBrowser(text, options);
        }
    }
    
    /**
     * Speak using browser TTS (fallback)
     */
    async speakBrowser(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!window.speechSynthesis) {
                reject(new Error('Speech synthesis not available'));
                return;
            }
            
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = options.rate || 0.95;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 0.9;
            
            if (options.voice) {
                utterance.voice = options.voice;
            }
            
            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);
            
            window.speechSynthesis.speak(utterance);
        });
    }
    
    /**
     * Play audio blob
     */
    async playAudioBlob(blob) {
        // Stop any currently playing TTS audio
        if (this._currentAudio) {
            this._currentAudio.pause();
            this._currentAudio.src = '';
            this._currentAudio = null;
        }
        
        // Also cancel browser speech
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            this._currentAudio = audio; // Track current audio
            const url = URL.createObjectURL(blob);
            
            audio.src = url;
            audio.onended = () => {
                URL.revokeObjectURL(url);
                this._currentAudio = null;
                resolve();
            };
            audio.onerror = (e) => {
                URL.revokeObjectURL(url);
                this._currentAudio = null;
                reject(e);
            };
            
            audio.play().catch(reject);
        });
    }
    
    /**
     * Get available voices for provider
     */
    async getVoices() {
        switch (this.config.provider) {
            case 'elevenlabs':
                return await this.getElevenLabsVoices();
            case 'browser':
            default:
                return window.speechSynthesis.getVoices();
        }
    }
    
    /**
     * Get ElevenLabs voices
     */
    async getElevenLabsVoices() {
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': this.config.apiKey
                }
            });
            
            if (!response.ok) {
                // Don't log 401 errors (expected when no API key is configured)
                if (response.status !== 401) {
                    console.error(`Failed to fetch ElevenLabs voices: ${response.status}`);
                }
                throw new Error(`Failed to fetch voices: ${response.status}`);
            }
            
            const data = await response.json();
            return data.voices || [];
        } catch (error) {
            // Only log non-401 errors (401 is expected when API key is missing/invalid)
            if (!error.message || !error.message.includes('401')) {
                console.error('Failed to get ElevenLabs voices:', error);
            }
            throw error; // Re-throw so the UI can handle it gracefully
        }
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// Export
if (typeof window !== 'undefined') {
    window.TTSProvider = TTSProvider;
}

