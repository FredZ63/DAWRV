/**
 * TTS Provider System
 * Supports multiple TTS providers for high-quality voice synthesis
 */

class TTSProvider {
    constructor(config = {}) {
        this.config = {
            provider: config.provider || 'browser', // 'browser', 'elevenlabs', 'coqui', 'piper', 'polly', 'google'
            apiKey: config.apiKey || null,
            voiceId: config.voiceId || null,
            model: config.model || null,
            baseURL: config.baseURL || null,
            // Provider-specific settings
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
        
        try {
            switch (this.config.provider) {
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
        } catch (error) {
            console.error('TTS speak error:', error);
            // Fallback to browser TTS
            return await this.speakBrowser(text, options);
        }
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
        // Requires Google Cloud SDK or backend service
        console.warn('Google Cloud TTS requires backend service');
        return await this.speakBrowser(text, options);
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
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            const url = URL.createObjectURL(blob);
            
            audio.src = url;
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = (e) => {
                URL.revokeObjectURL(url);
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
                throw new Error(`Failed to fetch voices: ${response.status}`);
            }
            
            const data = await response.json();
            return data.voices || [];
        } catch (error) {
            console.error('Failed to get ElevenLabs voices:', error);
            return [];
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

