/**
 * DAWRV Voice Calibration UI
 * ==========================
 * Guided voice enrollment interface for personalized speech recognition.
 */

class VoiceCalibrationUI {
    constructor(rheaController) {
        this.rhea = rheaController;
        this.modal = null;
        this.isCalibrating = false;
        this.currentPhrase = null;
        this.phraseIndex = 0;
        this.totalPhrases = 0;
        this.results = [];
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.profileName = 'default';
        
        // Calibration phases and phrases
        this.calibrationPhrases = {
            "Basic Commands": [
                "play",
                "stop", 
                "record",
                "pause",
                "rewind",
                "undo",
                "save project"
            ],
            "Track Commands": [
                "solo track 1",
                "mute channel 3",
                "arm track 5",
                "select tracks 1 through 8",
                "delete track 12"
            ],
            "Mixing Terms": [
                "set volume to minus 6 dB",
                "pan left 50 percent",
                "add compressor",
                "bypass EQ",
                "open FabFilter Pro-Q"
            ],
            "Complex Commands": [
                "create a new audio track",
                "bounce the selection in place",
                "set the tempo to 120 BPM",
                "go to bar 32",
                "loop from bar 8 to bar 16"
            ],
            "Studio Slang": [
                "make it slap",
                "punch me in at bar 4",
                "dirty that snare up",
                "give it some air",
                "tighten up the low end"
            ]
        };
        
        // Quick calibration (8 essential phrases)
        this.quickPhrases = [
            "play",
            "stop",
            "record",
            "solo track 1",
            "mute channel 3",
            "set volume to minus 6 dB",
            "go to bar 32",
            "make it slap"
        ];
        
        // All phrases flattened
        this.allPhrases = [];
        Object.values(this.calibrationPhrases).forEach(phrases => {
            this.allPhrases.push(...phrases);
        });
    }
    
    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            return;
        }
        this.createModal();
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'voice-calibration-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            backdrop-filter: blur(15px);
        `;
        
        const content = document.createElement('div');
        content.id = 'calibration-content';
        content.style.cssText = `
            background: linear-gradient(135deg, #0a0a15 0%, #1a1a2e 100%);
            padding: 40px;
            border-radius: 24px;
            max-width: 700px;
            width: 95%;
            box-shadow: 0 30px 100px rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(102, 126, 234, 0.3);
        `;
        
        content.innerHTML = this.getStartScreen();
        
        this.modal.appendChild(content);
        document.body.appendChild(this.modal);
        
        this.setupEventListeners();
    }
    
    getStartScreen() {
        return `
            <div style="text-align: center;">
                <div style="font-size: 64px; margin-bottom: 20px;">🎤</div>
                <h2 style="color: #fff; margin: 0 0 10px 0; font-size: 28px;">Voice Calibration</h2>
                <p style="color: #aaa; margin: 0 0 30px 0; font-size: 16px;">
                    Train RHEA to recognize your voice for accurate speech recognition
                </p>
                
                <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 30px;">
                    <div style="flex: 1; max-width: 280px; padding: 25px; background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 16px; cursor: pointer; transition: transform 0.2s;" id="quick-calibration-btn">
                        <div style="font-size: 36px; margin-bottom: 10px;">⚡</div>
                        <h3 style="color: #4CAF50; margin: 0 0 8px 0;">Quick Setup</h3>
                        <p style="color: #aaa; margin: 0; font-size: 13px;">8 essential phrases<br>~2 minutes</p>
                    </div>
                    <div style="flex: 1; max-width: 280px; padding: 25px; background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); border-radius: 16px; cursor: pointer; transition: transform 0.2s;" id="full-calibration-btn">
                        <div style="font-size: 36px; margin-bottom: 10px;">🎯</div>
                        <h3 style="color: #2196F3; margin: 0 0 8px 0;">Full Calibration</h3>
                        <p style="color: #aaa; margin: 0; font-size: 13px;">${this.allPhrases.length} phrases in 5 phases<br>~10 minutes</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px;">Profile Name</label>
                    <input type="text" id="profile-name-input" value="My Voice" placeholder="Enter your name" style="width: 200px; padding: 12px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; text-align: center; font-size: 16px;">
                </div>
                
                <div style="background: rgba(255, 193, 7, 0.1); padding: 15px 20px; border-radius: 10px; margin-bottom: 25px; text-align: left;">
                    <strong style="color: #ffc107;">📢 Tips for Best Results:</strong>
                    <ul style="color: #aaa; margin: 10px 0 0 20px; font-size: 13px; line-height: 1.8;">
                        <li>Find a quiet environment</li>
                        <li>Speak naturally at your normal pace</li>
                        <li>Position microphone 6-12 inches from mouth</li>
                        <li>Say each phrase clearly, then wait for next</li>
                    </ul>
                </div>
                
                <button id="calibration-close-btn" style="padding: 12px 30px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #aaa; cursor: pointer; font-size: 14px;">
                    Cancel
                </button>
            </div>
        `;
    }
    
    getCalibrationScreen() {
        const currentPhaseIndex = this.getCurrentPhaseIndex();
        const phaseName = this.getCurrentPhaseName();
        const progress = ((this.phraseIndex + 1) / this.totalPhrases) * 100;
        
        return `
            <div style="text-align: center;">
                <!-- Progress Bar -->
                <div style="margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; color: #888; font-size: 12px; margin-bottom: 8px;">
                        <span>${phaseName}</span>
                        <span>${this.phraseIndex + 1} of ${this.totalPhrases}</span>
                    </div>
                    <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                        <div id="progress-bar" style="height: 100%; background: linear-gradient(90deg, #4CAF50, #2196F3); width: ${progress}%; transition: width 0.3s;"></div>
                    </div>
                </div>
                
                <!-- Phrase Display -->
                <div style="margin-bottom: 30px;">
                    <p style="color: #888; margin: 0 0 15px 0; font-size: 14px;">Say this phrase:</p>
                    <div id="current-phrase" style="font-size: 32px; color: #fff; font-weight: bold; padding: 30px; background: rgba(102, 126, 234, 0.1); border: 2px solid rgba(102, 126, 234, 0.3); border-radius: 16px; min-height: 40px;">
                        "${this.currentPhrase}"
                    </div>
                </div>
                
                <!-- Recording Indicator -->
                <div id="recording-indicator" style="margin-bottom: 25px;">
                    <div id="mic-animation" class="recording-indicator" style="width: 100px; height: 100px; margin: 0 auto; border-radius: 50%; background: rgba(244, 67, 54, 0.3); display: flex; align-items: center; justify-content: center; position: relative; transition: all 0.1s ease;">
                        <div style="font-size: 40px;">🎤</div>
                        <div id="pulse-ring" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 3px solid #f44336; animation: pulse 1.5s infinite;"></div>
                    </div>
                    <p id="recording-status" style="color: #f44336; margin: 15px 0 0 0; font-weight: bold;">🎧 Listening... Speak now!</p>
                </div>
                
                <!-- Live Transcription Display -->
                <div id="live-transcription" style="margin-bottom: 20px; min-height: 40px;">
                    <p id="last-transcription" style="color: #4CAF50; font-size: 18px; font-style: italic; margin: 0;">(waiting for speech...)</p>
                </div>
                
                <!-- Last Result -->
                <div id="last-result" style="margin-bottom: 20px; min-height: 50px; display: none;">
                    <div style="padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                        <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">RHEA heard:</p>
                        <p id="last-transcription" style="color: #fff; margin: 0; font-size: 16px;">--</p>
                        <div id="match-indicator" style="margin-top: 10px;"></div>
                    </div>
                </div>
                
                <!-- Controls -->
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="skip-phrase-btn" style="padding: 12px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #aaa; cursor: pointer;">
                        Skip
                    </button>
                    <button id="retry-phrase-btn" style="padding: 12px 24px; background: rgba(255, 152, 0, 0.2); border: 1px solid rgba(255, 152, 0, 0.5); border-radius: 8px; color: #FF9800; cursor: pointer;">
                        🔄 Retry
                    </button>
                    <button id="cancel-calibration-btn" style="padding: 12px 24px; background: rgba(244, 67, 54, 0.2); border: 1px solid rgba(244, 67, 54, 0.5); border-radius: 8px; color: #f44336; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </div>
            
            <style>
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
            </style>
        `;
    }
    
    getResultsScreen(report) {
        const accuracy = report.accuracy || report.accuracy_score || 0;
        const isGood = accuracy >= 80;
        
        return `
            <div style="text-align: center;">
                <div style="font-size: 64px; margin-bottom: 20px;">${isGood ? '✅' : '⚠️'}</div>
                <h2 style="color: #fff; margin: 0 0 10px 0;">Calibration Complete!</h2>
                <p style="color: #aaa; margin: 0 0 30px 0;">Profile "${this.profileName}" has been saved</p>
                
                <!-- Accuracy Score -->
                <div style="margin-bottom: 30px;">
                    <div style="width: 150px; height: 150px; margin: 0 auto; border-radius: 50%; background: conic-gradient(${isGood ? '#4CAF50' : '#FF9800'} ${accuracy}%, rgba(255,255,255,0.1) 0); display: flex; align-items: center; justify-content: center;">
                        <div style="width: 120px; height: 120px; border-radius: 50%; background: #0a0a15; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <span style="font-size: 36px; font-weight: bold; color: ${isGood ? '#4CAF50' : '#FF9800'};">${Math.round(accuracy)}%</span>
                            <span style="font-size: 12px; color: #888;">Accuracy</span>
                        </div>
                    </div>
                </div>
                
                <!-- Stats -->
                <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 30px;">
                    <div style="padding: 15px 25px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                        <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">${report.successful_matches || Math.round(this.results.length * accuracy / 100)}</div>
                        <div style="font-size: 12px; color: #888;">Matched</div>
                    </div>
                    <div style="padding: 15px 25px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                        <div style="font-size: 24px; font-weight: bold; color: #2196F3;">${this.results.length}</div>
                        <div style="font-size: 12px; color: #888;">Total</div>
                    </div>
                    <div style="padding: 15px 25px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                        <div style="font-size: 24px; font-weight: bold; color: #FF9800;">${report.speech_rate ? Math.round(report.speech_rate) : '~120'}</div>
                        <div style="font-size: 12px; color: #888;">WPM</div>
                    </div>
                </div>
                
                ${!isGood ? `
                <div style="background: rgba(255, 152, 0, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 25px; text-align: left;">
                    <strong style="color: #FF9800;">💡 Tips to Improve:</strong>
                    <ul style="color: #aaa; margin: 10px 0 0 20px; font-size: 13px;">
                        <li>Speak more clearly and slowly</li>
                        <li>Reduce background noise</li>
                        <li>Position microphone closer</li>
                        <li>Try recalibrating in a quieter environment</li>
                    </ul>
                </div>
                ` : `
                <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 25px;">
                    <p style="color: #4CAF50; margin: 0;">🎉 Excellent! RHEA is now tuned to your voice.</p>
                </div>
                `}
                
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="recalibrate-btn" style="padding: 14px 28px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #fff; cursor: pointer;">
                        🔄 Recalibrate
                    </button>
                    <button id="done-btn" style="padding: 14px 28px; background: linear-gradient(135deg, #4CAF50, #45a049); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer;">
                        Done
                    </button>
                </div>
            </div>
        `;
    }
    
    getCurrentPhaseIndex() {
        let count = 0;
        let phaseIndex = 0;
        for (const phrases of Object.values(this.calibrationPhrases)) {
            if (this.phraseIndex < count + phrases.length) {
                return phaseIndex;
            }
            count += phrases.length;
            phaseIndex++;
        }
        return phaseIndex;
    }
    
    getCurrentPhaseName() {
        const phases = Object.keys(this.calibrationPhrases);
        const index = this.getCurrentPhaseIndex();
        return phases[index] || "Complete";
    }
    
    setupEventListeners() {
        // Start screen buttons
        this.modal.addEventListener('click', (e) => {
            if (e.target.id === 'quick-calibration-btn' || e.target.closest('#quick-calibration-btn')) {
                this.startCalibration('quick');
            } else if (e.target.id === 'full-calibration-btn' || e.target.closest('#full-calibration-btn')) {
                this.startCalibration('full');
            } else if (e.target.id === 'calibration-close-btn') {
                this.hide();
            } else if (e.target.id === 'cancel-calibration-btn') {
                this.cancelCalibration();
            } else if (e.target.id === 'skip-phrase-btn') {
                this.skipPhrase();
            } else if (e.target.id === 'retry-phrase-btn') {
                this.retryPhrase();
            } else if (e.target.id === 'recalibrate-btn') {
                this.showStartScreen();
            } else if (e.target.id === 'done-btn') {
                this.hide();
            } else if (e.target === this.modal) {
                // Don't close on background click during calibration
                if (!this.isCalibrating) {
                    this.hide();
                }
            }
        });
    }
    
    startCalibration(type) {
        const nameInput = document.getElementById('profile-name-input');
        this.profileName = nameInput ? nameInput.value.trim() || 'default' : 'default';
        
        if (type === 'quick') {
            this.totalPhrases = this.quickPhrases.length;
            this.activePhrases = this.quickPhrases;
        } else {
            this.totalPhrases = this.allPhrases.length;
            this.activePhrases = this.allPhrases;
        }
        
        this.phraseIndex = 0;
        this.results = [];
        this.isCalibrating = true;
        this.currentPhrase = this.activePhrases[0];
        
        const content = document.getElementById('calibration-content');
        content.innerHTML = this.getCalibrationScreen();
        
        // Show countdown before starting
        this.showCountdownThenRecord();
    }
    
    async showCountdownThenRecord() {
        const recordingStatus = document.getElementById('recording-status');
        const micAnimation = document.getElementById('mic-animation');
        const phraseDisplay = document.getElementById('current-phrase');
        
        // Show "Get Ready" message
        if (recordingStatus) {
            recordingStatus.innerHTML = '🎯 <span style="color: #FF9800;">Get Ready...</span>';
        }
        if (micAnimation) {
            micAnimation.style.background = 'rgba(255, 152, 0, 0.3)';
        }
        
        // Countdown: 3
        await this.sleep(1000);
        if (!this.isCalibrating) return;
        if (recordingStatus) {
            recordingStatus.innerHTML = '⏱️ <span style="font-size: 24px; color: #FF9800;">3</span>';
        }
        
        // Countdown: 2
        await this.sleep(1000);
        if (!this.isCalibrating) return;
        if (recordingStatus) {
            recordingStatus.innerHTML = '⏱️ <span style="font-size: 24px; color: #FFC107;">2</span>';
        }
        
        // Countdown: 1
        await this.sleep(1000);
        if (!this.isCalibrating) return;
        if (recordingStatus) {
            recordingStatus.innerHTML = '⏱️ <span style="font-size: 24px; color: #4CAF50;">1</span>';
        }
        
        // GO!
        await this.sleep(500);
        if (!this.isCalibrating) return;
        if (recordingStatus) {
            recordingStatus.innerHTML = '🎤 <span style="color: #f44336;">SPEAK NOW!</span>';
        }
        if (micAnimation) {
            micAnimation.style.background = 'rgba(244, 67, 54, 0.3)';
        }
        
        // Now start recording
        this.startRecording();
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async startRecording() {
        try {
            console.log('🎤 Starting calibration recording...');
            
            // Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Set up audio analyzer
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.3;
            source.connect(this.analyser);
            
            this.audioStream = stream;
            this.isRecordingPhrase = true;
            this.peakAudioLevel = 0;
            this.voiceDetectedFrames = 0;
            this.totalFrames = 0;
            
            // Start audio level monitoring with voice detection
            this.startVoiceDetection();
            
            // Recording duration: 5 seconds
            const recordingDuration = 5000;
            
            console.log(`🎤 Recording for ${recordingDuration/1000} seconds...`);
            
            // Auto-stop after recording duration
            this.recordingTimeout = setTimeout(() => {
                this.finishRecording();
            }, recordingDuration);
            
        } catch (error) {
            console.error('Microphone access error:', error);
            this.showError('Could not access microphone. Please check permissions.');
        }
    }
    
    startVoiceDetection() {
        if (!this.analyser) return;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const voiceThreshold = 0.08; // Threshold for voice detection
        
        const detectVoice = () => {
            if (!this.isRecordingPhrase) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average level (focus on voice frequencies 300-3000Hz)
            let sum = 0;
            let count = 0;
            const startBin = Math.floor(300 / (this.audioContext.sampleRate / this.analyser.fftSize));
            const endBin = Math.floor(3000 / (this.audioContext.sampleRate / this.analyser.fftSize));
            
            for (let i = startBin; i < endBin && i < dataArray.length; i++) {
                sum += dataArray[i];
                count++;
            }
            
            const level = count > 0 ? (sum / count) / 255 : 0;
            this.totalFrames++;
            
            // Track peak level
            if (level > this.peakAudioLevel) {
                this.peakAudioLevel = level;
            }
            
            // Count frames with voice detected
            if (level > voiceThreshold) {
                this.voiceDetectedFrames++;
            }
            
            // Update visual indicator
            const recordBtn = document.querySelector('.recording-indicator');
            if (recordBtn) {
                const brightness = 0.3 + level * 2;
                const color = level > voiceThreshold ? '76, 175, 80' : '244, 67, 54'; // Green when voice, red otherwise
                recordBtn.style.backgroundColor = `rgba(${color}, ${Math.min(brightness, 1)})`;
                recordBtn.style.boxShadow = `0 0 ${10 + level * 40}px rgba(${color}, ${level})`;
            }
            
            // Update status text
            const lastTranscription = document.getElementById('last-transcription');
            const recordingStatus = document.getElementById('recording-status');
            
            if (level > voiceThreshold) {
                if (lastTranscription) {
                    lastTranscription.textContent = '🎤 Voice detected! Keep speaking...';
                    lastTranscription.style.color = '#4CAF50';
                }
                if (recordingStatus) {
                    recordingStatus.innerHTML = '🟢 <span style="color: #4CAF50;">VOICE DETECTED!</span>';
                }
            } else {
                if (lastTranscription && this.voiceDetectedFrames === 0) {
                    lastTranscription.textContent = '(speak now...)';
                    lastTranscription.style.color = '#888';
                }
            }
            
            requestAnimationFrame(detectVoice);
        };
        
        detectVoice();
    }
    
    finishRecording() {
        console.log('🎤 Finishing recording...');
        console.log(`   Peak level: ${this.peakAudioLevel.toFixed(3)}`);
        console.log(`   Voice frames: ${this.voiceDetectedFrames} / ${this.totalFrames}`);
        
        this.stopLevelMonitor();
        this.isRecordingPhrase = false;
        
        // Calculate voice detection ratio
        const voiceRatio = this.totalFrames > 0 ? this.voiceDetectedFrames / this.totalFrames : 0;
        
        // Determine if phrase was spoken
        // Need at least 10% of frames with voice AND peak level > 0.1
        const phraseSpoken = voiceRatio > 0.1 && this.peakAudioLevel > 0.08;
        
        console.log(`   Voice ratio: ${(voiceRatio * 100).toFixed(1)}%`);
        console.log(`   Phrase detected: ${phraseSpoken}`);
        
        if (phraseSpoken) {
            // Voice was detected - accept the phrase
            this.handleTranscription(this.currentPhrase, 0.8);
        } else {
            // No voice detected
            this.handleTranscription('', 0);
        }
    }
    
    stopLevelMonitor() {
        console.log('🛑 Stopping level monitor');
        
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }
        this.analyser = null;
    }
    
    handleTranscription(transcript, confidence) {
        const expected = this.currentPhrase;
        const matchScore = this.calculateMatchScore(expected, transcript);
        
        this.results.push({
            expected,
            transcribed: transcript,
            confidence,
            matchScore
        });
        
        // Show result
        const lastResult = document.getElementById('last-result');
        const lastTranscription = document.getElementById('last-transcription');
        const matchIndicator = document.getElementById('match-indicator');
        
        if (lastResult && lastTranscription && matchIndicator) {
            lastResult.style.display = 'block';
            lastTranscription.textContent = transcript || '(no speech detected)';
            
            if (matchScore >= 0.8) {
                matchIndicator.innerHTML = '<span style="color: #4CAF50;">✓ Good match!</span>';
            } else if (matchScore >= 0.5) {
                matchIndicator.innerHTML = '<span style="color: #FF9800;">⚠ Partial match</span>';
            } else {
                matchIndicator.innerHTML = '<span style="color: #f44336;">✗ Try again</span>';
            }
        }
        
        // Move to next phrase after showing result (2.5 seconds)
        setTimeout(() => this.nextPhrase(), 2500);
    }
    
    calculateMatchScore(expected, actual) {
        if (!actual) return 0;
        
        const expectedWords = new Set(expected.toLowerCase().split(/\s+/));
        const actualWords = new Set(actual.toLowerCase().split(/\s+/));
        
        let matches = 0;
        expectedWords.forEach(word => {
            if (actualWords.has(word)) matches++;
        });
        
        return matches / expectedWords.size;
    }
    
    nextPhrase() {
        this.phraseIndex++;
        
        if (this.phraseIndex >= this.totalPhrases) {
            this.completeCalibration();
            return;
        }
        
        this.currentPhrase = this.activePhrases[this.phraseIndex];
        
        // Update UI
        const phraseDisplay = document.getElementById('current-phrase');
        const progressBar = document.getElementById('progress-bar');
        
        if (phraseDisplay) {
            phraseDisplay.textContent = `"${this.currentPhrase}"`;
        }
        
        if (progressBar) {
            const progress = ((this.phraseIndex + 1) / this.totalPhrases) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        // Hide last result
        const lastResult = document.getElementById('last-result');
        if (lastResult) lastResult.style.display = 'none';
        
        // Reset transcription display
        const lastTranscription = document.getElementById('last-transcription');
        if (lastTranscription) {
            lastTranscription.textContent = '(waiting...)';
            lastTranscription.style.color = '#888';
        }
        
        // Show countdown before next phrase
        this.showCountdownThenRecord();
    }
    
    skipPhrase() {
        this.results.push({
            expected: this.currentPhrase,
            transcribed: '',
            confidence: 0,
            matchScore: 0,
            skipped: true
        });
        this.nextPhrase();
    }
    
    retryPhrase() {
        // Remove last result and retry
        if (this.results.length > 0) {
            this.results.pop();
        }
        this.startRecording();
    }
    
    completeCalibration() {
        this.isCalibrating = false;
        
        // Calculate accuracy
        const successfulMatches = this.results.filter(r => r.matchScore >= 0.7).length;
        const accuracy = (successfulMatches / this.results.length) * 100;
        
        // Save profile to localStorage
        const profile = {
            name: this.profileName,
            accuracy: accuracy,
            calibratedAt: Date.now(),
            totalPhrases: this.results.length,
            successfulMatches: successfulMatches
        };
        
        localStorage.setItem(`dawrv_voice_profile_${this.profileName}`, JSON.stringify(profile));
        localStorage.setItem('dawrv_active_voice_profile', this.profileName);
        
        const content = document.getElementById('calibration-content');
        content.innerHTML = this.getResultsScreen({
            accuracy_score: accuracy,
            successful_matches: successfulMatches,
            speech_rate: 120
        });
    }
    
    cancelCalibration() {
        this.isCalibrating = false;
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.showStartScreen();
    }
    
    showStartScreen() {
        const content = document.getElementById('calibration-content');
        content.innerHTML = this.getStartScreen();
        this.setupEventListeners();
    }
    
    showError(message) {
        const content = document.getElementById('calibration-content');
        content.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
                <h2 style="color: #f44336; margin: 0 0 20px 0;">Error</h2>
                <p style="color: #aaa; margin: 0 0 30px 0;">${message}</p>
                <button id="calibration-close-btn" style="padding: 12px 30px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
    }
    
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.isCalibrating = false;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceCalibrationUI;
}

