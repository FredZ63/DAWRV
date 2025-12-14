/**
 * D-ID Avatar Animation Service
 * Brings RHEA to life with realistic talking head animation
 * 
 * Uses D-ID's Talks API to animate the static RHEA image
 * with lip-sync and natural head movements
 */

class DIDService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://api.d-id.com';
        this.sourceImageUrl = null;
        this.isInitialized = false;
        this.pendingTalks = new Map();
        this.cachedVideos = new Map(); // In-memory cache
        this.persistentCache = {}; // localStorage cache
        
        // Common phrases to pre-cache
        this.commonPhrases = [
            "Playing",
            "Stopped",
            "Recording",
            "Track muted",
            "Track soloed",
            "Track armed",
            "Got it",
            "Done",
            "Sure thing",
            "On it"
        ];
        
        // Load settings
        this.loadSettings();
        this.loadPersistentCache();
        
        // Clean expired URLs on startup
        setTimeout(() => this.cleanExpiredCache(), 2000);
    }
    
    /**
     * Load cached videos from localStorage
     */
    loadPersistentCache() {
        try {
            const cached = localStorage.getItem('dawrv_did_video_cache');
            if (cached) {
                this.persistentCache = JSON.parse(cached);
                console.log(`🎬 Loaded ${Object.keys(this.persistentCache).length} cached videos`);
            }
        } catch (e) {
            console.warn('Could not load video cache:', e);
        }
    }
    
    /**
     * Save cache to localStorage
     */
    savePersistentCache() {
        try {
            // Keep only last 50 entries
            const keys = Object.keys(this.persistentCache);
            if (keys.length > 50) {
                const toRemove = keys.slice(0, keys.length - 50);
                toRemove.forEach(k => delete this.persistentCache[k]);
            }
            localStorage.setItem('dawrv_did_video_cache', JSON.stringify(this.persistentCache));
        } catch (e) {
            console.warn('Could not save video cache:', e);
        }
    }
    
    /**
     * Pre-cache common responses (call after setup)
     */
    async preCacheCommonPhrases() {
        if (!this.isInitialized || !this.sourceImageUrl) {
            console.log('🎬 Cannot pre-cache: not initialized');
            return;
        }
        
        console.log('🎬 Pre-caching common phrases in background...');
        
        for (const phrase of this.commonPhrases) {
            const cacheKey = this.getCacheKey(phrase);
            if (!this.persistentCache[cacheKey]) {
                try {
                    // Generate in background, don't block
                    this.createTalkFromText(phrase).then(url => {
                        console.log(`✅ Pre-cached: "${phrase}"`);
                    }).catch(() => {
                        // Ignore errors during pre-cache
                    });
                    
                    // Wait between requests to avoid rate limiting
                    await new Promise(r => setTimeout(r, 2000));
                } catch (e) {
                    // Continue with other phrases
                }
            }
        }
    }
    
    /**
     * Generate cache key for a phrase
     */
    getCacheKey(text) {
        return text.toLowerCase().trim().substring(0, 100);
    }
    
    /**
     * Check if a D-ID URL has expired
     * D-ID URLs contain "Expires=" parameter with Unix timestamp
     */
    isUrlExpired(url) {
        try {
            const expiresMatch = url.match(/Expires=(\d+)/);
            if (expiresMatch) {
                const expiresTime = parseInt(expiresMatch[1], 10) * 1000; // Convert to ms
                const now = Date.now();
                const isExpired = now >= expiresTime;
                if (isExpired) {
                    console.log('⏰ D-ID URL expired:', new Date(expiresTime).toLocaleString());
                }
                return isExpired;
            }
        } catch (e) {
            console.warn('Could not check URL expiration:', e);
        }
        return false; // Assume not expired if we can't check
    }
    
    /**
     * Remove expired URLs from cache
     */
    cleanExpiredCache() {
        let cleaned = 0;
        
        // Clean memory cache
        for (const [key, url] of this.cachedVideos.entries()) {
            if (this.isUrlExpired(url)) {
                this.cachedVideos.delete(key);
                cleaned++;
            }
        }
        
        // Clean persistent cache
        for (const key in this.persistentCache) {
            if (this.isUrlExpired(this.persistentCache[key])) {
                delete this.persistentCache[key];
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired D-ID URLs from cache`);
            this.savePersistentCache();
        }
        
        return cleaned;
    }
    
    /**
     * Load D-ID settings from localStorage
     */
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('dawrv_did_settings') || '{}');
            this.apiKey = settings.apiKey || null;
            this.sourceImageUrl = settings.sourceImageUrl || null;
            this.isInitialized = !!this.apiKey;
            
            console.log('🎬 D-ID Service:', this.isInitialized ? 'Initialized' : 'No API key configured');
        } catch (error) {
            console.error('Error loading D-ID settings:', error);
        }
    }
    
    /**
     * Save D-ID settings to localStorage
     */
    saveSettings(settings) {
        try {
            const current = JSON.parse(localStorage.getItem('dawrv_did_settings') || '{}');
            const updated = { ...current, ...settings };
            localStorage.setItem('dawrv_did_settings', JSON.stringify(updated));
            this.loadSettings();
        } catch (error) {
            console.error('Error saving D-ID settings:', error);
        }
    }
    
    /**
     * Set the API key
     */
    setApiKey(apiKey) {
        this.saveSettings({ apiKey });
        console.log('🔑 D-ID API key updated');
    }
    
    /**
     * Get properly formatted authorization header
     * D-ID uses Basic auth with the API key
     */
    getAuthHeader() {
        if (!this.apiKey) return null;
        
        // Clean the key - remove any whitespace
        const cleanKey = this.apiKey.trim();
        
        // If already has "Basic " prefix, use as-is
        if (cleanKey.toLowerCase().startsWith('basic ')) {
            return cleanKey;
        }
        
        // D-ID provides the key already encoded, just add Basic prefix
        return `Basic ${cleanKey}`;
    }
    
    /**
     * Get auth headers object - some endpoints may need different format
     */
    getAuthHeaders() {
        const cleanKey = this.apiKey?.trim();
        if (!cleanKey) return {};
        
        // Return multiple possible auth header formats
        // D-ID might use x-api-key or Authorization
        return {
            'Authorization': this.getAuthHeader(),
            'x-api-key': cleanKey
        };
    }
    
    /**
     * Upload RHEA's image to D-ID and get a source URL
     */
    async uploadSourceImage(imageDataUrl) {
        if (!this.apiKey) {
            throw new Error('D-ID API key not configured');
        }
        
        const authHeader = this.getAuthHeader();
        if (!authHeader) {
            throw new Error('Invalid API key format');
        }
        
        try {
            console.log('📤 Uploading RHEA image to D-ID...');
            
            // Convert data URL to blob
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            
            // Create form data
            const formData = new FormData();
            formData.append('image', blob, 'rhea_avatar.png');
            
            // Upload to D-ID
            console.log('🔑 Using auth header:', authHeader.substring(0, 20) + '...');
            
            const uploadResponse = await fetch(`${this.baseUrl}/images`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'accept': 'application/json',
                },
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const errorBody = await uploadResponse.text();
                console.error('❌ D-ID API Error:', uploadResponse.status, errorBody);
                throw new Error(`Upload failed: ${uploadResponse.status} - ${errorBody}`);
            }
            
            const result = await uploadResponse.json();
            this.sourceImageUrl = result.url;
            this.saveSettings({ sourceImageUrl: result.url });
            
            console.log('✅ RHEA image uploaded to D-ID');
            return result.url;
            
        } catch (error) {
            console.error('❌ Error uploading image to D-ID:', error);
            throw error;
        }
    }
    
    /**
     * Create a talking head video from text
     * @param {string} text - The text for RHEA to speak
     * @param {string} voiceId - Voice ID (optional, uses default)
     * @returns {Promise<string>} - URL to the generated video
     */
    async createTalkFromText(text, voiceId = 'en-US-JennyNeural') {
        if (!this.apiKey) {
            throw new Error('D-ID API key not configured');
        }
        
        if (!this.sourceImageUrl) {
            throw new Error('RHEA source image not uploaded. Please upload first.');
        }
        
        // Check memory cache first (but verify URL hasn't expired)
        const cacheKey = this.getCacheKey(text);
        if (this.cachedVideos.has(cacheKey)) {
            const cachedUrl = this.cachedVideos.get(cacheKey);
            if (!this.isUrlExpired(cachedUrl)) {
                console.log('⚡ Using memory-cached video for:', text.substring(0, 30));
                return cachedUrl;
            } else {
                console.log('⏰ Memory-cached URL expired, regenerating...');
                this.cachedVideos.delete(cacheKey);
            }
        }
        
        // Check persistent cache (but verify URL hasn't expired)
        if (this.persistentCache[cacheKey]) {
            const cachedUrl = this.persistentCache[cacheKey];
            if (!this.isUrlExpired(cachedUrl)) {
                console.log('💾 Using disk-cached video for:', text.substring(0, 30));
                return cachedUrl;
            } else {
                console.log('⏰ Disk-cached URL expired, regenerating...');
                delete this.persistentCache[cacheKey];
                this.savePersistentCache();
            }
        }
        
        try {
            console.log('🎬 Creating D-ID talk:', text.substring(0, 50) + '...');
            
            // Create the talk
            const createResponse = await fetch(`${this.baseUrl}/talks`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_url: this.sourceImageUrl,
                    script: {
                        type: 'text',
                        input: text,
                        provider: {
                            type: 'microsoft',
                            voice_id: voiceId
                        }
                    },
                    config: {
                        fluent: true,
                        pad_audio: 0.5,
                        stitch: true
                    }
                })
            });
            
            if (!createResponse.ok) {
                // Handle payment/credit issues gracefully
                if (createResponse.status === 402) {
                    console.warn('⚠️ D-ID credits exhausted - animation disabled');
                    this.isInitialized = false; // Disable D-ID temporarily
                    throw new Error('D-ID credits exhausted. Add credits at d-id.com');
                }
                
                const error = await createResponse.json();
                throw new Error(`Create talk failed: ${error.message || createResponse.status}`);
            }
            
            const createResult = await createResponse.json();
            const talkId = createResult.id;
            
            console.log('⏳ Talk created, waiting for processing:', talkId);
            
            // Poll for completion
            const videoUrl = await this.pollTalkStatus(talkId);
            
            console.log('🎬 D-ID returned video URL:', videoUrl);
            
            // Verify the URL is valid
            if (!videoUrl || !videoUrl.startsWith('http')) {
                throw new Error('Invalid video URL received from D-ID');
            }
            
            // Cache the result (both memory and persistent)
            this.cachedVideos.set(cacheKey, videoUrl);
            this.persistentCache[cacheKey] = videoUrl;
            this.savePersistentCache();
            console.log('💾 Cached video for future use');
            
            return videoUrl;
            
        } catch (error) {
            console.error('❌ Error creating D-ID talk:', error);
            throw error;
        }
    }
    
    /**
     * Create a talking head video from audio
     * @param {Blob|string} audio - Audio blob or URL
     * @returns {Promise<string>} - URL to the generated video
     */
    async createTalkFromAudio(audio) {
        if (!this.apiKey) {
            throw new Error('D-ID API key not configured');
        }
        
        if (!this.sourceImageUrl) {
            throw new Error('RHEA source image not uploaded');
        }
        
        try {
            let audioUrl = audio;
            
            // If audio is a blob, we need to upload it first
            if (audio instanceof Blob) {
                console.log('📤 Uploading audio to D-ID...');
                
                const formData = new FormData();
                formData.append('audio', audio, 'speech.mp3');
                
                const uploadResponse = await fetch(`${this.baseUrl}/audios`, {
                    method: 'POST',
                    headers: {
                        'Authorization': this.getAuthHeader(),
                    },
                    body: formData
                });
                
                if (!uploadResponse.ok) {
                    throw new Error(`Audio upload failed: ${uploadResponse.status}`);
                }
                
                const uploadResult = await uploadResponse.json();
                audioUrl = uploadResult.url;
            }
            
            console.log('🎬 Creating D-ID talk from audio...');
            
            // Create the talk with audio
            const createResponse = await fetch(`${this.baseUrl}/talks`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_url: this.sourceImageUrl,
                    script: {
                        type: 'audio',
                        audio_url: audioUrl
                    },
                    config: {
                        fluent: true,
                        pad_audio: 0.5,
                        stitch: true
                    }
                })
            });
            
            if (!createResponse.ok) {
                const error = await createResponse.json();
                throw new Error(`Create talk failed: ${error.message || createResponse.status}`);
            }
            
            const createResult = await createResponse.json();
            const talkId = createResult.id;
            
            console.log('⏳ Talk created, waiting for processing:', talkId);
            
            // Poll for completion
            return await this.pollTalkStatus(talkId);
            
        } catch (error) {
            console.error('❌ Error creating D-ID talk from audio:', error);
            throw error;
        }
    }
    
    /**
     * Poll for talk completion status
     */
    async pollTalkStatus(talkId, maxAttempts = 60, interval = 1000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await fetch(`${this.baseUrl}/talks/${talkId}`, {
                    headers: {
                        'Authorization': this.getAuthHeader()
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Status check failed: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.status === 'done') {
                    console.log('✅ D-ID talk ready:', result.result_url);
                    return result.result_url;
                }
                
                if (result.status === 'error') {
                    throw new Error(`Talk generation failed: ${result.error?.message || 'Unknown error'}`);
                }
                
                // Still processing, wait and try again
                await new Promise(resolve => setTimeout(resolve, interval));
                
            } catch (error) {
                console.error('Error polling talk status:', error);
                throw error;
            }
        }
        
        throw new Error('Talk generation timed out');
    }
    
    /**
     * Get account credits remaining
     */
    async getCredits() {
        if (!this.apiKey) {
            return null;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/credits`, {
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });
            
            if (!response.ok) {
                return null;
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Error getting D-ID credits:', error);
            return null;
        }
    }
    
    /**
     * Clear video cache
     */
    clearCache() {
        this.cachedVideos.clear();
        console.log('🗑️ D-ID video cache cleared');
    }
}

// Export singleton instance
window.DIDService = new DIDService();

console.log('🎬 D-ID Avatar Service loaded');

