/**
 * Animated Avatar Component
 * Displays RHEA as an animated talking head
 * 
 * Seamlessly switches between static image and animated video
 * when RHEA speaks
 */

class AnimatedAvatar {
    constructor() {
        this.container = null;
        this.staticImage = null;
        this.videoElement = null;
        this.isAnimating = false;
        this.didService = null;
        this.enabled = false;
        this.queue = [];
        this.isProcessingQueue = false;
        
        // Idle animation state
        this.idleAnimationEnabled = true;
        this.idleInterval = null;
        
        this.init();
    }
    
    /**
     * Initialize the animated avatar
     */
    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    /**
     * Setup the avatar elements
     */
    setup() {
        // Find existing avatar container
        this.container = document.querySelector('.rhea-avatar');
        if (!this.container) {
            console.warn('⚠️ RHEA avatar container not found');
            return;
        }
        
        // Store reference to static image
        this.staticImage = this.container.querySelector('img.rhea-image') || this.container.querySelector('img');
        
        console.log('🎭 Found avatar container:', this.container);
        console.log('🎭 Found static image:', this.staticImage);
        
        // Create video element for animated avatar
        this.videoElement = document.createElement('video');
        this.videoElement.className = 'rhea-video-avatar';
        this.videoElement.playsInline = true;
        this.videoElement.muted = false; // We want audio from D-ID
        this.videoElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: 10;
        `;
        
        // Make container relative for positioning (it should already be)
        const computedStyle = window.getComputedStyle(this.container);
        if (computedStyle.position === 'static') {
            this.container.style.position = 'relative';
        }
        
        this.container.appendChild(this.videoElement);
        console.log('🎭 Video element added to avatar container');
        
        // Video event handlers
        this.videoElement.addEventListener('ended', () => this.onVideoEnded());
        this.videoElement.addEventListener('error', (e) => this.onVideoError(e));
        
        // Get D-ID service reference
        this.didService = window.DIDService;
        
        // Load settings
        this.loadSettings();
        
        // Start idle animations
        this.startIdleAnimations();
        
        console.log('🎭 Animated Avatar initialized');
    }
    
    /**
     * Load settings
     */
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('dawrv_animated_avatar') || '{}');
            this.enabled = settings.enabled !== false; // Default to true
            this.idleAnimationEnabled = settings.idleAnimations !== false;
        } catch (error) {
            console.error('Error loading animated avatar settings:', error);
        }
    }
    
    /**
     * Save settings
     */
    saveSettings(settings) {
        try {
            const current = JSON.parse(localStorage.getItem('dawrv_animated_avatar') || '{}');
            localStorage.setItem('dawrv_animated_avatar', JSON.stringify({ ...current, ...settings }));
            this.loadSettings();
        } catch (error) {
            console.error('Error saving animated avatar settings:', error);
        }
    }
    
    /**
     * Enable/disable animated avatar
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.saveSettings({ enabled });
        console.log(`🎭 Animated avatar ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Speak with animation
     * @param {string} text - Text for RHEA to speak
     * @param {Object} options - Additional options
     */
    async speak(text, options = {}) {
        if (!this.enabled || !this.didService?.isInitialized) {
            console.log('🎭 Animation disabled or D-ID not configured, using static avatar');
            return false;
        }
        
        // Add to queue
        this.queue.push({ text, options });
        
        // Process queue if not already processing
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
        
        return true;
    }
    
    /**
     * Process the speech queue
     */
    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        
        this.isProcessingQueue = true;
        const { text, options } = this.queue.shift();
        
        try {
            console.log('🎭 Generating animated speech:', text.substring(0, 40) + '...');
            
            // Stop idle animations
            this.stopIdleAnimations();
            
            // Generate video from D-ID
            const videoUrl = await this.didService.createTalkFromText(text, options.voiceId);
            
            // Play the video
            await this.playVideo(videoUrl);
            
        } catch (error) {
            console.error('❌ Animation error:', error);
            // Continue with queue even on error
        }
        
        // Process next in queue
        this.processQueue();
    }
    
    /**
     * Play animated video
     */
    async playVideo(videoUrl) {
        console.log('🎬 Playing video:', videoUrl);
        
        return new Promise(async (resolve, reject) => {
            try {
                // Try to fetch the video and create a blob URL to avoid CORS issues
                console.log('🎬 Fetching video to avoid CORS...');
                const response = await fetch(videoUrl);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status}`);
                }
                
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                console.log('🎬 Created blob URL:', blobUrl);
                
                // Reset video element
                this.videoElement.style.opacity = '0';
                this.videoElement.src = blobUrl;
                
                this.videoElement.onloadeddata = () => {
                    console.log('🎬 Video loaded, starting playback...');
                    
                    // Fade in video, fade out static image
                    this.videoElement.style.opacity = '1';
                    if (this.staticImage) {
                        this.staticImage.style.opacity = '0';
                        this.staticImage.style.transition = 'opacity 0.3s ease';
                    }
                    
                    this.isAnimating = true;
                    this.container?.classList.add('animating');
                    
                    this.videoElement.play().then(() => {
                        console.log('🎬 Video playing!');
                    }).catch(err => {
                        console.error('🎬 Play error:', err);
                    });
                };
                
                this.videoElement.onended = () => {
                    console.log('🎬 Video ended');
                    // Clean up blob URL
                    URL.revokeObjectURL(blobUrl);
                    this.hideVideo();
                    resolve();
                };
                
                this.videoElement.onerror = (e) => {
                    // Ignore empty src errors (happens during cleanup)
                    if (!this.videoElement.src || this.videoElement.src === '') {
                        return;
                    }
                    console.error('🎬 Video element error:', e);
                    console.error('🎬 Video error code:', this.videoElement.error?.code);
                    console.error('🎬 Video error message:', this.videoElement.error?.message);
                    URL.revokeObjectURL(blobUrl);
                    this.hideVideo();
                    reject(e);
                };
                
                this.videoElement.load();
                
            } catch (fetchError) {
                console.error('🎬 Fetch error:', fetchError);
                
                // Fallback: try direct URL (might work in some cases)
                console.log('🎬 Trying direct URL as fallback...');
                this.videoElement.src = videoUrl;
                this.videoElement.crossOrigin = 'anonymous';
                
                this.videoElement.onloadeddata = () => {
                    this.videoElement.style.opacity = '1';
                    if (this.staticImage) this.staticImage.style.opacity = '0';
                    this.isAnimating = true;
                    this.videoElement.play();
                };
                
                this.videoElement.onended = () => {
                    this.hideVideo();
                    resolve();
                };
                
                this.videoElement.onerror = (e) => {
                    // Ignore empty src errors
                    if (!this.videoElement.src || this.videoElement.src === '') {
                        return;
                    }
                    console.error('🎬 Fallback also failed:', e);
                    this.hideVideo();
                    reject(e);
                };
                
                this.videoElement.load();
            }
        });
    }
    
    /**
     * Hide video and show static image
     */
    hideVideo() {
        console.log('🎬 Hiding video, restoring static image');
        
        this.videoElement.style.opacity = '0';
        if (this.staticImage) {
            this.staticImage.style.opacity = '1';
            this.staticImage.style.transition = 'opacity 0.3s ease';
        }
        this.isAnimating = false;
        this.container?.classList.remove('animating');
        
        // Clear video source to free memory (remove error handlers first to avoid noise)
        setTimeout(() => {
            this.videoElement.onerror = null;
            this.videoElement.onended = null;
            this.videoElement.onloadeddata = null;
            this.videoElement.removeAttribute('src');
            this.videoElement.load(); // Reset the video element
        }, 500);
        
        // Resume idle animations
        this.startIdleAnimations();
    }
    
    /**
     * Video ended handler
     */
    onVideoEnded() {
        this.hideVideo();
    }
    
    /**
     * Video error handler
     */
    onVideoError(error) {
        console.error('🎭 Video error:', error);
        this.hideVideo();
    }
    
    /**
     * Start subtle idle animations
     */
    startIdleAnimations() {
        if (!this.idleAnimationEnabled || this.isAnimating) return;
        
        // Add CSS class for idle animations
        if (this.container) {
            this.container.classList.add('rhea-idle');
        }
        
        // Start random blink effect
        this.startBlinkEffect();
        
        // Start subtle glow pulse synchronized with transport
        this.startGlowPulse();
    }
    
    /**
     * Stop idle animations
     */
    stopIdleAnimations() {
        if (this.container) {
            this.container.classList.remove('rhea-idle');
            this.container.classList.remove('rhea-blink');
        }
        
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
        
        if (this.glowInterval) {
            clearInterval(this.glowInterval);
            this.glowInterval = null;
        }
    }
    
    /**
     * Random blink effect (subtle eye blink simulation)
     */
    startBlinkEffect() {
        if (this.blinkInterval) return;
        
        const doBlink = () => {
            if (this.isAnimating || !this.container) return;
            
            // Random blink every 3-7 seconds
            const nextBlink = 3000 + Math.random() * 4000;
            
            this.blinkInterval = setTimeout(() => {
                if (!this.isAnimating && this.container) {
                    this.container.classList.add('rhea-blink');
                    setTimeout(() => {
                        this.container?.classList.remove('rhea-blink');
                    }, 150);
                }
                doBlink();
            }, nextBlink);
        };
        
        doBlink();
    }
    
    /**
     * Subtle glow pulse effect
     */
    startGlowPulse() {
        // Glow is handled by CSS animation, just ensure class is present
        if (this.container) {
            this.container.classList.add('rhea-glow-active');
        }
    }
    
    /**
     * Set expression (for when D-ID is not available)
     * Uses CSS classes to show different static expressions
     */
    setExpression(expression) {
        if (!this.container) return;
        
        // Remove all expression classes
        this.container.classList.remove(
            'expression-neutral',
            'expression-happy',
            'expression-thinking',
            'expression-speaking',
            'expression-listening'
        );
        
        // Add new expression
        this.container.classList.add(`expression-${expression}`);
    }
    
    /**
     * Check if D-ID is configured and ready
     */
    isReady() {
        return this.enabled && this.didService?.isInitialized;
    }
    
    /**
     * Get status for UI display
     */
    getStatus() {
        if (!this.didService) {
            return { ready: false, message: 'D-ID service not loaded' };
        }
        
        if (!this.didService.apiKey) {
            return { ready: false, message: 'D-ID API key not configured' };
        }
        
        if (!this.didService.sourceImageUrl) {
            return { ready: false, message: 'RHEA image not uploaded to D-ID' };
        }
        
        return { ready: true, message: 'Ready to animate!' };
    }
}

// Add CSS for idle animations and video overlay
const idleStyles = document.createElement('style');
idleStyles.textContent = `
    /* Video avatar overlay - must be above static image */
    .rhea-video-avatar {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: 50% !important;
        z-index: 10 !important;
        pointer-events: none;
    }
    
    /* When animating, ensure video is visible */
    .rhea-avatar.animating .rhea-video-avatar {
        opacity: 1 !important;
    }
    
    .rhea-avatar.animating .rhea-image {
        opacity: 0 !important;
    }
    
    /* ============================================
       IDLE ANIMATIONS - RHEA "ALIVE" EFFECT
       ============================================ */
    
    /* Subtle breathing animation */
    .rhea-avatar.rhea-idle {
        animation: rhea-breathe 4s ease-in-out infinite;
    }
    
    @keyframes rhea-breathe {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.015);
        }
    }
    
    /* Blink effect - quick brightness dip */
    .rhea-avatar.rhea-blink .rhea-image {
        animation: rhea-blink-anim 0.15s ease-in-out;
    }
    
    @keyframes rhea-blink-anim {
        0%, 100% {
            filter: brightness(1);
        }
        50% {
            filter: brightness(0.85);
        }
    }
    
    /* Ambient glow pulse */
    .rhea-avatar.rhea-glow-active::before {
        content: '';
        position: absolute;
        top: -5px;
        left: -5px;
        right: -5px;
        bottom: -5px;
        border-radius: 50%;
        background: radial-gradient(ellipse at center, 
            rgba(0, 212, 255, 0.2) 0%, 
            rgba(0, 212, 255, 0.1) 30%,
            transparent 70%);
        animation: rhea-ambient-glow 3s ease-in-out infinite;
        pointer-events: none;
        z-index: -1;
    }
    
    @keyframes rhea-ambient-glow {
        0%, 100% {
            opacity: 0.4;
            transform: scale(1);
        }
        50% {
            opacity: 0.7;
            transform: scale(1.05);
        }
    }
    
    /* Subtle headset glow sync with breathing */
    .rhea-avatar.rhea-idle .rhea-image {
        filter: brightness(1);
        transition: filter 0.3s ease;
    }
    
    /* Expression states */
    .rhea-avatar.expression-speaking {
        filter: brightness(1.1);
    }
    
    .rhea-avatar.expression-thinking {
        filter: brightness(0.95) saturate(0.9);
        animation: rhea-think 2s ease-in-out infinite;
    }
    
    @keyframes rhea-think {
        0%, 100% {
            transform: scale(1) rotate(0deg);
        }
        25% {
            transform: scale(1.01) rotate(-0.5deg);
        }
        75% {
            transform: scale(1.01) rotate(0.5deg);
        }
    }
    
    .rhea-avatar.expression-happy {
        filter: brightness(1.15) saturate(1.1);
    }
    
    .rhea-avatar.expression-listening {
        filter: brightness(1.05);
        animation: rhea-listen 1.5s ease-in-out infinite;
    }
    
    @keyframes rhea-listen {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.02);
        }
    }
    
    /* When speaking - more pronounced animation */
    .rhea-avatar.speaking {
        animation: rhea-speaking-pulse 0.8s ease-in-out infinite;
    }
    
    @keyframes rhea-speaking-pulse {
        0%, 100% {
            filter: brightness(1);
            transform: scale(1);
        }
        50% {
            filter: brightness(1.1);
            transform: scale(1.02);
        }
    }
`;
document.head.appendChild(idleStyles);

// Export singleton instance
window.AnimatedAvatar = new AnimatedAvatar();

console.log('🎭 Animated Avatar component loaded');

