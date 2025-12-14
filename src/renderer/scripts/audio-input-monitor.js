/**
 * Audio Input Monitor with Visual Meters and Controls
 * Shows real-time audio levels, gain control, and compression
 */

class AudioInputMonitor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.animationId = null;
        this.isMonitoring = false;
        
        // Audio processing nodes
        this.gainNode = null;
        this.compressorNode = null;
        this.limiterNode = null;
        
        // Settings
        this.gain = 1.0;
        this.threshold = -24; // dB
        this.ratio = 4;
        this.attack = 0.003;
        this.release = 0.25;
        
        this.createUI();
        this.loadSettings();
    }
    
    createUI() {
        const container = document.getElementById('audio-input-monitor');
        if (!container) {
            console.warn('Audio input monitor container not found');
            return;
        }
        
        container.innerHTML = `
            <div class="audio-monitor-panel">
                <div class="monitor-header">
                    <h3>🎤 Audio Input Monitor</h3>
                    <button class="toggle-monitor-btn" id="toggleMonitorBtn">
                        <span class="btn-icon">▶️</span>
                        <span class="btn-text">Start Monitor</span>
                    </button>
                </div>
                
                <div class="meters-container">
                    <!-- Peak Meter -->
                    <div class="meter-group">
                        <label>Input Level</label>
                        <div class="meter-wrapper">
                            <canvas id="peakMeter" width="300" height="60"></canvas>
                            <div class="meter-labels">
                                <span>-60</span>
                                <span>-40</span>
                                <span>-20</span>
                                <span>-10</span>
                                <span>0</span>
                                <span class="clip-label">CLIP</span>
                            </div>
                        </div>
                        <div class="level-display">
                            <span id="peakLevel">-∞ dB</span>
                        </div>
                    </div>
                    
                    <!-- Waveform Display -->
                    <div class="meter-group">
                        <label>Waveform</label>
                        <canvas id="waveformDisplay" width="300" height="80"></canvas>
                    </div>
                </div>
                
                <div class="controls-container">
                    <!-- Gain Control -->
                    <div class="control-group">
                        <label for="gainControl">
                            <span>Gain</span>
                            <span id="gainValue">0 dB</span>
                        </label>
                        <input type="range" id="gainControl" min="-20" max="20" step="0.5" value="0">
                    </div>
                    
                    <!-- Compression Threshold -->
                    <div class="control-group">
                        <label for="thresholdControl">
                            <span>Threshold</span>
                            <span id="thresholdValue">-24 dB</span>
                        </label>
                        <input type="range" id="thresholdControl" min="-60" max="0" step="1" value="-24">
                    </div>
                    
                    <!-- Compression Ratio -->
                    <div class="control-group">
                        <label for="ratioControl">
                            <span>Ratio</span>
                            <span id="ratioValue">4:1</span>
                        </label>
                        <input type="range" id="ratioControl" min="1" max="20" step="0.5" value="4">
                    </div>
                    
                    <!-- Attack Time -->
                    <div class="control-group">
                        <label for="attackControl">
                            <span>Attack</span>
                            <span id="attackValue">3 ms</span>
                        </label>
                        <input type="range" id="attackControl" min="0" max="100" step="1" value="3">
                    </div>
                    
                    <!-- Release Time -->
                    <div class="control-group">
                        <label for="releaseControl">
                            <span>Release</span>
                            <span id="releaseValue">250 ms</span>
                        </label>
                        <input type="range" id="releaseControl" min="10" max="1000" step="10" value="250">
                    </div>
                    
                    <!-- Enable/Disable Controls -->
                    <div class="control-group toggle-group">
                        <label>
                            <input type="checkbox" id="enableCompression" checked>
                            <span>Enable Compression/Limiter</span>
                        </label>
                    </div>
                </div>
                
                <div class="monitor-info">
                    <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="info-value" id="monitorStatus">Not monitoring</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Device:</span>
                        <span class="info-value" id="deviceInfo">External Microphone</span>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Toggle monitoring
        const toggleBtn = document.getElementById('toggleMonitorBtn');
        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleMonitoring();
        }
        
        // Gain control
        const gainControl = document.getElementById('gainControl');
        if (gainControl) {
            gainControl.oninput = (e) => {
                const dbValue = parseFloat(e.target.value);
                this.gain = Math.pow(10, dbValue / 20); // Convert dB to linear
                document.getElementById('gainValue').textContent = `${dbValue > 0 ? '+' : ''}${dbValue} dB`;
                if (this.gainNode) {
                    this.gainNode.gain.value = this.gain;
                }
                this.saveSettings();
            };
        }
        
        // Threshold control
        const thresholdControl = document.getElementById('thresholdControl');
        if (thresholdControl) {
            thresholdControl.oninput = (e) => {
                this.threshold = parseFloat(e.target.value);
                document.getElementById('thresholdValue').textContent = `${this.threshold} dB`;
                if (this.compressorNode) {
                    this.compressorNode.threshold.value = this.threshold;
                }
                this.saveSettings();
            };
        }
        
        // Ratio control
        const ratioControl = document.getElementById('ratioControl');
        if (ratioControl) {
            ratioControl.oninput = (e) => {
                this.ratio = parseFloat(e.target.value);
                document.getElementById('ratioValue').textContent = `${this.ratio}:1`;
                if (this.compressorNode) {
                    this.compressorNode.ratio.value = this.ratio;
                }
                this.saveSettings();
            };
        }
        
        // Attack control
        const attackControl = document.getElementById('attackControl');
        if (attackControl) {
            attackControl.oninput = (e) => {
                this.attack = parseFloat(e.target.value) / 1000; // Convert ms to seconds
                document.getElementById('attackValue').textContent = `${e.target.value} ms`;
                if (this.compressorNode) {
                    this.compressorNode.attack.value = this.attack;
                }
                this.saveSettings();
            };
        }
        
        // Release control
        const releaseControl = document.getElementById('releaseControl');
        if (releaseControl) {
            releaseControl.oninput = (e) => {
                this.release = parseFloat(e.target.value) / 1000; // Convert ms to seconds
                document.getElementById('releaseValue').textContent = `${e.target.value} ms`;
                if (this.compressorNode) {
                    this.compressorNode.release.value = this.release;
                }
                this.saveSettings();
            };
        }
        
        // Enable/disable compression
        const enableCompression = document.getElementById('enableCompression');
        if (enableCompression) {
            enableCompression.onchange = (e) => {
                if (this.compressorNode && this.microphone) {
                    if (e.target.checked) {
                        this.microphone.connect(this.gainNode);
                        this.gainNode.connect(this.compressorNode);
                        this.compressorNode.connect(this.analyser);
                    } else {
                        this.compressorNode.disconnect();
                        this.gainNode.connect(this.analyser);
                    }
                }
                this.saveSettings();
            };
        }
    }
    
    async toggleMonitoring() {
        if (this.isMonitoring) {
            this.stopMonitoring();
        } else {
            await this.startMonitoring();
        }
    }
    
    async startMonitoring() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Get microphone
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            // Create gain node
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.gain;
            
            // Create compressor/limiter
            this.compressorNode = this.audioContext.createDynamicsCompressor();
            this.compressorNode.threshold.value = this.threshold;
            this.compressorNode.knee.value = 30;
            this.compressorNode.ratio.value = this.ratio;
            this.compressorNode.attack.value = this.attack;
            this.compressorNode.release.value = this.release;
            
            // Create analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Connect nodes
            const enableCompression = document.getElementById('enableCompression');
            this.microphone.connect(this.gainNode);
            if (enableCompression && enableCompression.checked) {
                this.gainNode.connect(this.compressorNode);
                this.compressorNode.connect(this.analyser);
            } else {
                this.gainNode.connect(this.analyser);
            }
            
            // Create data array
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            // Update UI
            this.isMonitoring = true;
            const toggleBtn = document.getElementById('toggleMonitorBtn');
            if (toggleBtn) {
                toggleBtn.querySelector('.btn-icon').textContent = '⏸️';
                toggleBtn.querySelector('.btn-text').textContent = 'Stop Monitor';
            }
            document.getElementById('monitorStatus').textContent = 'Monitoring...';
            
            // Start animation
            this.animate();
            
            console.log('✅ Audio monitoring started');
            
        } catch (error) {
            console.error('Failed to start audio monitoring:', error);
            alert('Microphone access denied or not available');
        }
    }
    
    stopMonitoring() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.isMonitoring = false;
        
        const toggleBtn = document.getElementById('toggleMonitorBtn');
        if (toggleBtn) {
            toggleBtn.querySelector('.btn-icon').textContent = '▶️';
            toggleBtn.querySelector('.btn-text').textContent = 'Start Monitor';
        }
        document.getElementById('monitorStatus').textContent = 'Not monitoring';
        document.getElementById('peakLevel').textContent = '-∞ dB';
        
        console.log('🛑 Audio monitoring stopped');
    }
    
    animate() {
        if (!this.isMonitoring) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Get audio data
        this.analyser.getByteTimeDomainData(this.dataArray);
        
        // Calculate peak level
        let peak = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const value = Math.abs((this.dataArray[i] - 128) / 128);
            if (value > peak) peak = value;
        }
        
        // Convert to dB
        const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
        
        // Update displays
        this.drawPeakMeter(peakDb);
        this.drawWaveform();
        
        // Update level display
        document.getElementById('peakLevel').textContent = 
            isFinite(peakDb) ? `${peakDb.toFixed(1)} dB` : '-∞ dB';
    }
    
    drawPeakMeter(peakDb) {
        const canvas = document.getElementById('peakMeter');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate bar width (map -60dB to 0dB to 0-100%)
        const normalizedLevel = Math.max(0, Math.min(100, ((peakDb + 60) / 60) * 100));
        const barWidth = (width * normalizedLevel) / 100;
        
        // Draw gradient bar
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#4CAF50');    // Green (low)
        gradient.addColorStop(0.7, '#FFC107');  // Yellow (mid)
        gradient.addColorStop(0.9, '#FF9800');  // Orange (high)
        gradient.addColorStop(1, '#F44336');    // Red (clip)
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, barWidth, height);
        
        // Draw clip indicator
        if (peakDb > -1) {
            ctx.fillStyle = '#F44336';
            ctx.fillRect(width - 30, 0, 30, height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('CLIP', width - 15, height / 2 + 4);
        }
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const x = (width / 5) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }
    
    drawWaveform() {
        const canvas = document.getElementById('waveformDisplay');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        
        // Draw center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        
        // Draw waveform
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const sliceWidth = width / this.dataArray.length;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * height / 2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.stroke();
    }
    
    saveSettings() {
        const settings = {
            gain: this.gain,
            threshold: this.threshold,
            ratio: this.ratio,
            attack: this.attack,
            release: this.release
        };
        localStorage.setItem('audio_monitor_settings', JSON.stringify(settings));
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('audio_monitor_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.gain = settings.gain || 1.0;
                this.threshold = settings.threshold || -24;
                this.ratio = settings.ratio || 4;
                this.attack = settings.attack || 0.003;
                this.release = settings.release || 0.25;
                
                // Update UI
                const gainDb = 20 * Math.log10(this.gain);
                document.getElementById('gainControl').value = gainDb;
                document.getElementById('gainValue').textContent = `${gainDb > 0 ? '+' : ''}${gainDb.toFixed(1)} dB`;
                
                document.getElementById('thresholdControl').value = this.threshold;
                document.getElementById('thresholdValue').textContent = `${this.threshold} dB`;
                
                document.getElementById('ratioControl').value = this.ratio;
                document.getElementById('ratioValue').textContent = `${this.ratio}:1`;
                
                document.getElementById('attackControl').value = this.attack * 1000;
                document.getElementById('attackValue').textContent = `${(this.attack * 1000).toFixed(0)} ms`;
                
                document.getElementById('releaseControl').value = this.release * 1000;
                document.getElementById('releaseValue').textContent = `${(this.release * 1000).toFixed(0)} ms`;
            }
        } catch (e) {
            console.warn('Failed to load audio monitor settings:', e);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.audioInputMonitor = new AudioInputMonitor();
    });
} else {
    window.audioInputMonitor = new AudioInputMonitor();
}


