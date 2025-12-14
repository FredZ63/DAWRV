/**
 * Audio-Reactive Avatar Animation
 * Makes RHEA's avatar respond to speech audio in real-time
 * 
 * This is the INSTANT fallback when Wav2Lip isn't available
 * Uses Web Audio API to analyze audio and animate the avatar
 */

class AudioReactiveAvatar {
    constructor() {
        this.container = null;
        this.staticImage = null;
        this.mouthOverlay = null;
        this.audioContext = null;
        this.analyser = null;
        this.animationFrame = null;
        this.isAnimating = false;
        this.enabled = true;
        
        // Mouth states (CSS classes)
        this.mouthStates = ['mouth-closed', 'mouth-slight', 'mouth-open', 'mouth-wide'];
        this.currentMouthState = 0;
        
        // Sensitivity settings
        this.sensitivity = 1.5;
        this.smoothing = 0.3;
        this.lastAmplitude = 0;
        
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // Find avatar container
        this.container = document.querySelector('.rhea-avatar');
        if (!this.container) {
            console.warn('⚠️ Audio-reactive: Avatar container not found');
            return;
        }
        
        this.staticImage = this.container.querySelector('.rhea-image');
        
        // Create mouth overlay element
        this.createMouthOverlay();
        
        // Add CSS for mouth states
        this.addStyles();
        
        console.log('🎤 Audio-reactive avatar initialized');
    }
    
    createMouthOverlay() {
        // Create an overlay for mouth animation
        this.mouthOverlay = document.createElement('div');
        this.mouthOverlay.className = 'rhea-mouth-overlay mouth-closed';
        this.mouthOverlay.style.cssText = `
            position: absolute;
            bottom: 25%;
            left: 50%;
            transform: translateX(-50%);
            width: 30%;
            height: 15%;
            z-index: 6;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        
        this.container.appendChild(this.mouthOverlay);
    }
    
    addStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            /* =============================================
               AUDIO-REACTIVE ANIMATION STYLES
               ============================================= */
            
            /* When audio-reactive is active */
            .rhea-avatar.audio-reactive {
                animation: audio-pulse 0.3s ease-in-out infinite !important;
            }
            
            .rhea-avatar.audio-reactive .rhea-image {
                transition: filter 0.08s ease, transform 0.08s ease;
            }
            
            /* Mouth state animations - VERY VISIBLE */
            .rhea-avatar.audio-reactive.speaking-low .rhea-image {
                filter: brightness(1.1) !important;
                transform: scale(1.01);
            }
            
            .rhea-avatar.audio-reactive.speaking-medium .rhea-image {
                filter: brightness(1.2) saturate(1.1) !important;
                transform: scale(1.02);
            }
            
            .rhea-avatar.audio-reactive.speaking-high .rhea-image {
                filter: brightness(1.3) saturate(1.2) !important;
                transform: scale(1.04);
            }
            
            /* Pulsing glow when speaking */
            .rhea-avatar.audio-reactive::after {
                content: '';
                position: absolute;
                top: -15px;
                left: -15px;
                right: -15px;
                bottom: -15px;
                border-radius: 50%;
                background: radial-gradient(ellipse at center, 
                    rgba(138, 43, 226, 0.6) 0%,
                    rgba(74, 158, 255, 0.4) 40%,
                    transparent 70%);
                z-index: -1;
                pointer-events: none;
                animation: glow-pulse-speaking 0.5s ease-in-out infinite;
            }
            
            @keyframes audio-pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.015);
                }
            }
            
            @keyframes glow-pulse-speaking {
                0%, 100% {
                    opacity: 0.5;
                    transform: scale(1);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.1);
                }
            }
            
            /* Border glow when speaking */
            .rhea-avatar.audio-reactive {
                border-color: #a855f7 !important;
                box-shadow: 0 0 30px rgba(168, 85, 247, 0.8),
                            0 0 60px rgba(168, 85, 247, 0.5),
                            0 0 90px rgba(168, 85, 247, 0.3) !important;
            }
        `;
        document.head.appendChild(styles);
    }
    
    /**
     * Start analyzing audio from a MediaStream or AudioNode
     */
    startAnalyzing(audioSource) {
        if (this.isAnimating) return;
        
        try {
            // Create audio context if needed
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Create analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = this.smoothing;
            
            // Connect source to analyser
            if (audioSource instanceof MediaStream) {
                const source = this.audioContext.createMediaStreamSource(audioSource);
                source.connect(this.analyser);
            } else if (audioSource instanceof AudioNode) {
                audioSource.connect(this.analyser);
            }
            
            // Start animation loop
            this.isAnimating = true;
            this.container?.classList.add('audio-reactive');
            this.animate();
            
            console.log('🎤 Audio-reactive animation started');
            
        } catch (error) {
            console.error('Audio-reactive error:', error);
        }
    }
    
    /**
     * Analyze speech synthesis audio
     * Since we can't directly access SpeechSynthesis audio,
     * we simulate based on timing
     */
    startSimulatedAnimation(duration) {
        if (this.isAnimating) {
            console.log('🎤 Already animating');
            return;
        }
        
        console.log('🎤 =====================================');
        console.log('🎤 AUDIO-REACTIVE ANIMATION STARTING');
        console.log('🎤 Duration:', duration, 'ms');
        console.log('🎤 Container:', this.container ? 'FOUND' : 'NOT FOUND');
        console.log('🎤 =====================================');
        
        this.isAnimating = true;
        
        if (this.container) {
            this.container.classList.add('audio-reactive', 'speaking');
        } else {
            console.error('🎤 ERROR: Container not found!');
            return;
        }
        
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration || !this.isAnimating) {
                console.log('🎤 Animation finished');
                this.stopAnalyzing();
                return;
            }
            
            // Simulate speech patterns
            const t = elapsed / 1000;
            
            // Create realistic speech rhythm (phonemes, pauses)
            const syllableFreq = 4; // syllables per second
            const pauseChance = Math.sin(t * 0.5) > 0.8;
            
            let amplitude;
            if (pauseChance) {
                amplitude = 0;
            } else {
                // Simulate syllable rhythm
                const syllable = Math.abs(Math.sin(t * syllableFreq * Math.PI));
                // Add some randomness
                amplitude = syllable * (0.5 + Math.random() * 0.5);
            }
            
            this.updateMouthState(amplitude);
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * TEST: Call from browser console: window.AudioReactiveAvatar.test()
     */
    test() {
        console.log('🎤 TESTING AUDIO-REACTIVE...');
        this.startSimulatedAnimation(3000);
    }
    
    /**
     * Main animation loop
     */
    animate() {
        if (!this.isAnimating || !this.analyser) return;
        
        // Get audio data
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const amplitude = (sum / dataArray.length) / 255;
        
        // Smooth the amplitude
        const smoothedAmplitude = this.lastAmplitude * 0.3 + amplitude * 0.7;
        this.lastAmplitude = smoothedAmplitude;
        
        // Update mouth state
        this.updateMouthState(smoothedAmplitude * this.sensitivity);
        
        // Continue animation
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * Update mouth state based on amplitude
     */
    updateMouthState(amplitude) {
        if (!this.container) return;
        
        // Remove all speaking classes
        this.container.classList.remove('speaking-low', 'speaking-medium', 'speaking-high');
        
        // Set glow intensity
        this.container.style.setProperty('--audio-glow', (amplitude * 0.5).toFixed(2));
        
        // Determine mouth state
        let stateClass;
        if (amplitude < 0.1) {
            stateClass = null; // Closed
        } else if (amplitude < 0.3) {
            stateClass = 'speaking-low';
        } else if (amplitude < 0.6) {
            stateClass = 'speaking-medium';
        } else {
            stateClass = 'speaking-high';
        }
        
        if (stateClass) {
            this.container.classList.add(stateClass);
        }
    }
    
    /**
     * Stop analyzing and reset
     */
    stopAnalyzing() {
        this.isAnimating = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Reset avatar state
        if (this.container) {
            this.container.classList.remove('audio-reactive', 'speaking-low', 'speaking-medium', 'speaking-high');
            this.container.style.setProperty('--audio-glow', '0');
        }
        
        console.log('🎤 Audio-reactive animation stopped');
    }
    
    /**
     * Set sensitivity level
     */
    setSensitivity(level) {
        this.sensitivity = Math.max(0.5, Math.min(3, level));
    }
    
    /**
     * Enable/disable audio-reactive mode
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopAnalyzing();
        }
    }
}

// Export singleton
window.AudioReactiveAvatar = new AudioReactiveAvatar();

console.log('🎤 Audio-Reactive Avatar loaded');

