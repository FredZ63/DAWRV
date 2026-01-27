/**
 * Local Animation Service for RHEA
 * Coordinates between Wav2Lip (Python) and Audio-Reactive fallback
 * 
 * Priority:
 * 1. Check local Wav2Lip cache for instant playback
 * 2. If not cached, use audio-reactive (instant) + queue Wav2Lip generation
 * 3. If Wav2Lip unavailable, always use audio-reactive
 */

class LocalAnimationService {
    constructor() {
        this.serverUrl = 'http://localhost:5555';
        this.isServerRunning = false;
        this.serverAvailable = false;
        this.cachedPhrases = new Map();
        this.pendingGenerations = new Set();
        this._loggedOffline = false;
        this._checkTimer = null;
        this._checkBackoffMs = 3000;
        this._maxBackoffMs = 10 * 60 * 1000; // 10 minutes

        // IMPORTANT:
        // Browser devtools will show every failed network request, even if we catch errors.
        // So we disable polling by default unless the user explicitly enables the local Wav2Lip server.
        this.pollingEnabled = false;
        try {
            this.pollingEnabled = (localStorage.getItem('rhea_wav2lip_polling') === 'true');
        } catch (_) {}
        
        if (this.pollingEnabled) {
            // Check server after a delay (avoid console noise on startup)
            this._scheduleCheck(3000);
        } else {
            // Audio-reactive is always available; no need to poll.
            this.isServerRunning = false;
            this.serverAvailable = false;
        }
        
        console.log('🎤 Audio-reactive animation ready (Wav2Lip optional)');
    }

    /**
     * Enable/disable Wav2Lip server polling (persists to localStorage).
     * When disabled, we will not perform network requests to localhost:5555 at all.
     */
    setWav2LipPollingEnabled(enabled) {
        const on = !!enabled;
        this.pollingEnabled = on;
        try {
            localStorage.setItem('rhea_wav2lip_polling', on ? 'true' : 'false');
        } catch (_) {}

        if (!on) {
            this._clearCheckTimer();
            this.isServerRunning = false;
            this.serverAvailable = false;
            this._checkBackoffMs = 3000;
            return;
        }

        // Start polling with a short delay
        this._checkBackoffMs = 3000;
        this._scheduleCheck(500);
    }

    _clearCheckTimer() {
        if (this._checkTimer) {
            clearTimeout(this._checkTimer);
            this._checkTimer = null;
        }
    }

    _scheduleCheck(delayMs) {
        this._clearCheckTimer();
        if (!this.pollingEnabled) return;
        this._checkTimer = setTimeout(async () => {
            try {
                await this.checkServer();
            } finally {
                // Self-schedule with backoff (checkServer updates _checkBackoffMs)
                this._scheduleCheck(this._checkBackoffMs);
            }
        }, Math.max(100, delayMs || 0));
    }
    
    /**
     * Check if the local Wav2Lip server is running
     * (Silently fails if not running - audio-reactive is the fallback)
     */
    async checkServer() {
        // If polling is disabled, never hit the network.
        if (!this.pollingEnabled) return null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch(`${this.serverUrl}/status`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const status = await response.json();
                this.isServerRunning = true;
                this.serverAvailable = status.wav2lip_available && status.model_loaded;
                // Reset backoff on success: check every 60s
                this._checkBackoffMs = 60000;
                
                console.log('🎬 Local animation server:', 
                    this.serverAvailable ? '✅ Wav2Lip ready' : '⚠️ Audio-reactive mode');
                
                return status;
            }
        } catch (error) {
            // Silent fail - Wav2Lip server not running is normal
            // Audio-reactive mode will be used instead
            this.isServerRunning = false;
            this.serverAvailable = false;
            // Exponential backoff to avoid spamming devtools with failed requests
            this._checkBackoffMs = Math.min(this._checkBackoffMs * 2, this._maxBackoffMs);
            
            // Only log once on first check
            if (!this._loggedOffline) {
                console.log('🎤 Using audio-reactive animation (Wav2Lip server not running)');
                this._loggedOffline = true;
            }
        }
        
        return null;
    }
    
    /**
     * Generate cache key for text
     */
    getCacheKey(text) {
        return text.toLowerCase().trim().substring(0, 100);
    }
    
    /**
     * Animate RHEA speaking the given text
     * Returns true if animation was handled, false to use fallback TTS
     */
    async animate(text, options = {}) {
        const cacheKey = this.getCacheKey(text);
        
        // 1. Check if we have a cached Wav2Lip video
        if (this.isServerRunning) {
            const cachedUrl = await this.getCachedVideo(cacheKey);
            if (cachedUrl) {
                console.log('⚡ Playing cached Wav2Lip video');
                await this.playVideo(cachedUrl);
                return true;
            }
        }
        
        // 2. Use audio-reactive for instant response
        const duration = this.estimateSpeechDuration(text);
        this.startAudioReactive(duration);
        
        // 3. Queue Wav2Lip generation in background (for next time)
        if (this.serverAvailable && !this.pendingGenerations.has(cacheKey)) {
            this.queueGeneration(text);
        }
        
        // Return false to let caller use TTS
        return false;
    }
    
    /**
     * Check if we have a cached video for this text
     */
    async getCachedVideo(cacheKey) {
        // Check local memory cache
        if (this.cachedPhrases.has(cacheKey)) {
            return this.cachedPhrases.get(cacheKey);
        }
        
        // Check server cache
        try {
            const response = await fetch(`${this.serverUrl}/check/${cacheKey}`, {
                signal: AbortSignal.timeout(1000)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.ready) {
                    const videoUrl = `${this.serverUrl}${data.video_url}`;
                    this.cachedPhrases.set(cacheKey, videoUrl);
                    return videoUrl;
                }
            }
        } catch (error) {
            // Server not available
        }
        
        return null;
    }
    
    /**
     * Play a video on the avatar
     */
    async playVideo(videoUrl) {
        const animatedAvatar = window.AnimatedAvatar;
        if (animatedAvatar) {
            await animatedAvatar.playVideo(videoUrl);
        }
    }
    
    /**
     * Start audio-reactive animation
     */
    startAudioReactive(duration) {
        const audioReactive = window.AudioReactiveAvatar;
        if (audioReactive && audioReactive.enabled) {
            audioReactive.startSimulatedAnimation(duration);
        }
    }
    
    /**
     * Stop audio-reactive animation
     */
    stopAudioReactive() {
        const audioReactive = window.AudioReactiveAvatar;
        if (audioReactive) {
            audioReactive.stopAnalyzing();
        }
    }
    
    /**
     * Estimate speech duration based on text length
     */
    estimateSpeechDuration(text) {
        // Average speaking rate: ~150 words per minute = 2.5 words/second
        const words = text.split(/\s+/).length;
        const baseDuration = (words / 2.5) * 1000; // in milliseconds
        
        // Add time for pauses (commas, periods)
        const pauses = (text.match(/[,.!?]/g) || []).length * 200;
        
        return baseDuration + pauses + 500; // Add buffer
    }
    
    /**
     * Queue video generation in background
     */
    async queueGeneration(text) {
        const cacheKey = this.getCacheKey(text);
        
        if (this.pendingGenerations.has(cacheKey)) {
            return;
        }
        
        this.pendingGenerations.add(cacheKey);
        
        try {
            console.log('🎬 Queueing Wav2Lip generation for:', text.substring(0, 30));
            
            await fetch(`${this.serverUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
        } catch (error) {
            console.warn('Could not queue generation:', error);
        } finally {
            // Remove from pending after a delay
            setTimeout(() => {
                this.pendingGenerations.delete(cacheKey);
            }, 60000);
        }
    }
    
    /**
     * Pre-cache common phrases
     */
    async precacheCommonPhrases() {
        if (!this.isServerRunning) {
            console.log('🎬 Server not running, cannot pre-cache');
            return;
        }
        
        try {
            const response = await fetch(`${this.serverUrl}/precache`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('🎬', data.message);
            }
        } catch (error) {
            console.error('Pre-cache error:', error);
        }
    }
    
    /**
     * Get service status
     */
    getStatus() {
        return {
            serverRunning: this.isServerRunning,
            wav2lipAvailable: this.serverAvailable,
            cachedCount: this.cachedPhrases.size,
            pendingCount: this.pendingGenerations.size,
            mode: this.serverAvailable ? 'wav2lip' : 'audio-reactive'
        };
    }
    
    /**
     * Clear all caches
     */
    async clearCache() {
        this.cachedPhrases.clear();
        
        if (this.isServerRunning) {
            try {
                await fetch(`${this.serverUrl}/clear-cache`, { method: 'POST' });
            } catch (error) {
                // Ignore
            }
        }
        
        console.log('🎬 Animation cache cleared');
    }
}

// Export singleton
window.LocalAnimationService = new LocalAnimationService();

// Convenience toggle (can be run from DevTools console)
window.setWav2LipPollingEnabled = function(enabled) {
    try {
        window.LocalAnimationService?.setWav2LipPollingEnabled(!!enabled);
        console.log(`🎬 Wav2Lip polling: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    } catch (e) {
        console.warn('Failed to toggle Wav2Lip polling:', e?.message || e);
    }
};

// Add test functions
window.testAnimation = function() {
    console.log('🎬 TESTING LOCAL ANIMATION...');
    const service = window.LocalAnimationService;
    const audioReactive = window.AudioReactiveAvatar;
    
    console.log('LocalAnimationService:', service ? 'LOADED' : 'NOT LOADED');
    console.log('AudioReactiveAvatar:', audioReactive ? 'LOADED' : 'NOT LOADED');
    console.log('Server running:', service?.isServerRunning);
    
    // Test audio-reactive directly
    if (audioReactive) {
        console.log('🎤 Starting 3-second test animation...');
        audioReactive.startSimulatedAnimation(3000);
    } else {
        console.error('AudioReactiveAvatar not found!');
    }
};

console.log('🎬 Local Animation Service loaded');
console.log('🎬 TEST: Run "testAnimation()" in console to test');

