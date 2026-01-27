/**
 * Voice Calibration System
 * Calibrates RHEA to understand the user's specific voice characteristics
 */

class VoiceCalibration {
    constructor() {
        this.calibrationData = {
            userId: 'default',
            timestamp: null,
            voiceProfile: {
                pitchRange: { min: 0, max: 0, average: 0 },
                energyRange: { min: 0, max: 0, average: 0 },
                speakingRate: 0, // words per minute
                pauseDuration: 0, // average pause between words (ms)
                pronunciationMap: {}, // custom pronunciations for commands
                vadThresholds: {
                    energyThreshold: 0.08,
                    minSpeechDuration: 500,
                    maxSilenceDuration: 1500
                }
            },
            calibrationSamples: []
        };
        
        this.currentPhaseIndex = 0;
        this.isCalibrating = false;
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        
        // Calibration phrases covering various commands and phonemes
        this.calibrationPhrases = [
            // Phase 1: Basic transport commands (short, simple)
            { text: "play", category: "transport", difficulty: "easy" },
            { text: "stop", category: "transport", difficulty: "easy" },
            { text: "record", category: "transport", difficulty: "easy" },
            { text: "pause", category: "transport", difficulty: "easy" },
            
            // Phase 2: Extended transport commands
            { text: "start playback", category: "transport", difficulty: "medium" },
            { text: "stop playback", category: "transport", difficulty: "medium" },
            { text: "start recording", category: "transport", difficulty: "medium" },
            { text: "pause playback", category: "transport", difficulty: "medium" },
            
            // Phase 3: Track commands with numbers
            { text: "solo track one", category: "track", difficulty: "medium" },
            { text: "mute track two", category: "track", difficulty: "medium" },
            { text: "arm track three", category: "track", difficulty: "medium" },
            { text: "select track four", category: "track", difficulty: "medium" },
            { text: "unmute track five", category: "track", difficulty: "medium" },
            
            // Phase 4: Navigation commands
            { text: "go to bar five", category: "navigation", difficulty: "medium" },
            { text: "go to start", category: "navigation", difficulty: "easy" },
            { text: "go to end", category: "navigation", difficulty: "easy" },
            { text: "play from bar ten", category: "navigation", difficulty: "hard" },
            
            // Phase 5: Complex commands
            { text: "loop from bar eight to bar twelve", category: "loop", difficulty: "hard" },
            { text: "set tempo to one twenty", category: "tempo", difficulty: "hard" },
            { text: "increase volume by ten percent", category: "mixer", difficulty: "hard" },
            
            // Phase 6: Natural speech patterns
            { text: "okay RHEA, play", category: "natural", difficulty: "medium" },
            { text: "hey RHEA, stop playback", category: "natural", difficulty: "medium" },
            { text: "RHEA, mute track three", category: "natural", difficulty: "medium" },
            
            // Phase 7: Rapid fire commands (testing speaking rate)
            { text: "play", category: "rapid", difficulty: "easy" },
            { text: "stop", category: "rapid", difficulty: "easy" },
            { text: "play", category: "rapid", difficulty: "easy" },
            { text: "stop", category: "rapid", difficulty: "easy" },
            
            // Phase 8: Soft speech (testing energy thresholds)
            { text: "play softly", category: "soft", difficulty: "medium", instruction: "Say this quietly" },
            { text: "stop softly", category: "soft", difficulty: "medium", instruction: "Say this quietly" },
            
            // Phase 9: Loud speech (testing upper bounds)
            { text: "play loudly", category: "loud", difficulty: "medium", instruction: "Say this louder" },
            { text: "stop loudly", category: "loud", difficulty: "medium", instruction: "Say this louder" },
            
            // Phase 10: Background noise testing
            { text: "play with noise", category: "noise", difficulty: "hard", instruction: "While music plays" }
        ];
    }
    
    /**
     * Load saved calibration profile
     */
    loadProfile() {
        try {
            const saved = localStorage.getItem('rhea_voice_profile');
            if (saved) {
                this.calibrationData = JSON.parse(saved);
                console.log('✅ Voice profile loaded:', this.calibrationData);
                return true;
            }
        } catch (e) {
            console.error('Failed to load voice profile:', e);
        }
        return false;
    }
    
    /**
     * Save calibration profile
     */
    saveProfile() {
        try {
            this.calibrationData.timestamp = Date.now();
            localStorage.setItem('rhea_voice_profile', JSON.stringify(this.calibrationData));
            console.log('✅ Voice profile saved');
            return true;
        } catch (e) {
            console.error('Failed to save voice profile:', e);
            return false;
        }
    }
    
    /**
     * Start calibration process
     */
    async startCalibration() {
        console.log('🎤 Starting voice calibration...');
        this.isCalibrating = true;
        this.currentPhaseIndex = 0;
        this.calibrationData.calibrationSamples = [];
        
        // Request microphone access
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false // Disable AGC during calibration
                } 
            });
            
            // Setup audio analysis
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            source.connect(this.analyser);
            
            console.log('✅ Microphone ready for calibration');
            return true;
        } catch (error) {
            console.error('❌ Microphone access denied:', error);
            this.isCalibrating = false;
            return false;
        }
    }
    
    /**
     * Analyze audio sample and extract voice characteristics
     */
    analyzeAudioSample(audioBuffer, transcript, duration) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate energy (volume/loudness)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const averageEnergy = sum / dataArray.length;
        
        // Estimate pitch (fundamental frequency)
        const sampleRate = this.audioContext.sampleRate;
        let maxValue = 0;
        let maxIndex = 0;
        for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] > maxValue) {
                maxValue = dataArray[i];
                maxIndex = i;
            }
        }
        const frequency = (maxIndex * sampleRate) / (2 * this.analyser.fftSize);
        
        // Calculate speaking rate (words per minute)
        const wordCount = transcript.split(' ').length;
        const durationMinutes = duration / 60000; // convert ms to minutes
        const wordsPerMinute = wordCount / durationMinutes;
        
        return {
            energy: averageEnergy,
            pitch: frequency,
            duration: duration,
            wordsPerMinute: wordsPerMinute,
            transcript: transcript,
            timestamp: Date.now()
        };
    }
    
    /**
     * Record a single calibration phrase
     */
    async recordPhrase(phraseIndex) {
        return new Promise((resolve) => {
            const phrase = this.calibrationPhrases[phraseIndex];
            console.log(`🎤 Recording phrase ${phraseIndex + 1}/${this.calibrationPhrases.length}: "${phrase.text}"`);
            
            const startTime = Date.now();
            let recordingData = [];
            
            // Monitor audio levels
            const monitorInterval = setInterval(() => {
                const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                this.analyser.getByteTimeDomainData(dataArray);
                recordingData.push([...dataArray]);
            }, 100); // Sample every 100ms
            
            // Wait for user to speak (simulate - in real implementation, use VAD)
            setTimeout(() => {
                clearInterval(monitorInterval);
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Analyze the recorded sample
                const analysis = this.analyzeAudioSample(recordingData, phrase.text, duration);
                this.calibrationData.calibrationSamples.push({
                    phrase: phrase,
                    analysis: analysis
                });
                
                console.log('✅ Phrase recorded:', analysis);
                resolve(analysis);
            }, 3000); // Give user 3 seconds to speak
        });
    }
    
    /**
     * Process all calibration samples and create voice profile
     */
    processCalibrationData() {
        console.log('📊 Processing calibration data...');
        
        const samples = this.calibrationData.calibrationSamples;
        if (samples.length === 0) {
            console.error('❌ No calibration samples to process');
            return false;
        }
        
        // Calculate pitch statistics
        const pitches = samples.map(s => s.analysis.pitch).filter(p => p > 0);
        this.calibrationData.voiceProfile.pitchRange = {
            min: Math.min(...pitches),
            max: Math.max(...pitches),
            average: pitches.reduce((a, b) => a + b, 0) / pitches.length
        };
        
        // Calculate energy statistics
        const energies = samples.map(s => s.analysis.energy);
        this.calibrationData.voiceProfile.energyRange = {
            min: Math.min(...energies),
            max: Math.max(...energies),
            average: energies.reduce((a, b) => a + b, 0) / energies.length
        };
        
        // Calculate speaking rate
        const rates = samples.map(s => s.analysis.wordsPerMinute).filter(r => r > 0 && r < 500);
        this.calibrationData.voiceProfile.speakingRate = 
            rates.reduce((a, b) => a + b, 0) / rates.length;
        
        // Adjust VAD thresholds based on user's voice
        const avgEnergy = this.calibrationData.voiceProfile.energyRange.average;
        const minEnergy = this.calibrationData.voiceProfile.energyRange.min;
        
        // Set energy threshold slightly below minimum detected energy
        this.calibrationData.voiceProfile.vadThresholds.energyThreshold = 
            Math.max(0.01, minEnergy * 0.8 / 255); // Normalize to 0-1 range
        
        // Adjust speech duration based on speaking rate
        if (this.calibrationData.voiceProfile.speakingRate > 150) {
            // Fast speaker - reduce minimum speech duration
            this.calibrationData.voiceProfile.vadThresholds.minSpeechDuration = 300;
        } else if (this.calibrationData.voiceProfile.speakingRate < 100) {
            // Slow speaker - increase minimum speech duration
            this.calibrationData.voiceProfile.vadThresholds.minSpeechDuration = 700;
        }
        
        console.log('✅ Voice profile created:', this.calibrationData.voiceProfile);
        return true;
    }
    
    /**
     * Run full calibration process
     */
    async runFullCalibration() {
        console.log('🚀 Starting full voice calibration process...');
        
        // Start calibration
        const started = await this.startCalibration();
        if (!started) {
            return { success: false, error: 'Failed to start calibration' };
        }
        
        // Record all phrases
        for (let i = 0; i < this.calibrationPhrases.length; i++) {
            await this.recordPhrase(i);
        }
        
        // Process data
        const processed = this.processCalibrationData();
        if (!processed) {
            return { success: false, error: 'Failed to process calibration data' };
        }
        
        // Save profile
        this.saveProfile();
        
        // Cleanup
        this.stopCalibration();
        
        return { 
            success: true, 
            profile: this.calibrationData.voiceProfile 
        };
    }
    
    /**
     * Stop calibration and cleanup
     */
    stopCalibration() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.isCalibrating = false;
        console.log('🛑 Calibration stopped');
    }
    
    /**
     * Apply calibration to ASR system
     */
    applyCalibration() {
        console.log('🔧 Applying voice calibration to ASR system...');
        
        // Send calibration data to ASR service
        if (window.api && window.api.updateASRCalibration) {
            window.api.updateASRCalibration(this.calibrationData.voiceProfile.vadThresholds)
                .then(() => {
                    console.log('✅ ASR calibration applied');
                })
                .catch((error) => {
                    console.error('❌ Failed to apply ASR calibration:', error);
                });
        }
        
        return this.calibrationData.voiceProfile;
    }
    
    /**
     * Get calibration status
     */
    getStatus() {
        return {
            isCalibrated: this.calibrationData.timestamp !== null,
            lastCalibration: this.calibrationData.timestamp,
            samplesCount: this.calibrationData.calibrationSamples.length,
            profile: this.calibrationData.voiceProfile
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.VoiceCalibration = VoiceCalibration;
}


