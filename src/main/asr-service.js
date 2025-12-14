/**
 * DAWRV ASR Service
 * =================
 * Electron main process service for the advanced ASR engine.
 * Spawns and manages the Python ASR process with IPC communication.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

class ASRService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.isRunning = false;
        this.isPaused = false;
        this.config = {
            modelSize: 'base',
            mode: 'command',
            confidenceThreshold: 0.55,
            activeProfile: 'default'
        };
        
        // Paths
        this.asrPath = path.join(__dirname, '..', '..', 'asr');
        this.commandFile = '/tmp/dawrv_voice_command.txt';
        this.statusFile = '/tmp/dawrv_asr_status.json';
        this.speakingSignal = '/tmp/rhea_speaking'; // Must match Python listener!
        
        // File watcher for commands
        this.commandWatcher = null;
        this.lastCommandTime = 0;
        
        console.log('🎤 ASR Service initialized');
    }
    
    /**
     * Load saved configuration
     */
    loadConfig() {
        try {
            const configPath = path.join(this.asrPath, 'asr_config.json');
            if (fs.existsSync(configPath)) {
                const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.config = { ...this.config, ...saved };
                console.log('📂 ASR config loaded:', this.config);
            }
        } catch (err) {
            console.error('Error loading ASR config:', err);
        }
    }
    
    /**
     * Save configuration
     */
    saveConfig() {
        try {
            const configPath = path.join(this.asrPath, 'asr_config.json');
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
            console.log('💾 ASR config saved');
        } catch (err) {
            console.error('Error saving ASR config:', err);
        }
    }
    
    /**
     * Start the ASR service
     * NOTE: This CONFLICTS with rhea_voice_listener_whisper.py - only ONE can run!
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ ASR already running');
            return { success: true, message: 'Already running' };
        }
        
        // KILL conflicting Whisper listener first!
        console.log('🔪 Killing any conflicting Whisper listeners...');
        try {
            const { execSync } = require('child_process');
            execSync('pkill -f "rhea_voice_listener_whisper.py" 2>/dev/null || true');
        } catch (e) {
            // Ignore errors
        }
        
        // Clear any stuck signal files
        try {
            if (fs.existsSync(this.speakingSignal)) {
                fs.unlinkSync(this.speakingSignal);
            }
        } catch (e) {}
        
        this.loadConfig();
        
        // Find Python executable
        const pythonPath = await this.findPython();
        if (!pythonPath) {
            return { success: false, error: 'Python not found' };
        }
        
        const scriptPath = path.join(this.asrPath, 'asr_to_dawrv.py');
        
        // Check if script exists
        if (!fs.existsSync(scriptPath)) {
            return { success: false, error: 'ASR script not found' };
        }
        
        console.log(`🚀 Starting ASR service with model: ${this.config.modelSize}`);
        
        try {
            this.process = spawn(pythonPath, [
                scriptPath,
                '--model', this.config.modelSize
            ], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, PYTHONUNBUFFERED: '1' }
            });
            
            this.process.stdout.on('data', (data) => {
                const lines = data.toString().split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    console.log(`[ASR] ${line}`);
                    this.parseASROutput(line);
                });
            });
            
            this.process.stderr.on('data', (data) => {
                console.error(`[ASR Error] ${data.toString()}`);
            });
            
            this.process.on('close', (code) => {
                console.log(`[ASR] Process exited with code ${code}`);
                this.isRunning = false;
                this.emit('stopped', code);
            });
            
            this.process.on('error', (err) => {
                console.error(`[ASR] Process error:`, err);
                this.isRunning = false;
                this.emit('error', err);
            });
            
            this.isRunning = true;
            this.startCommandWatcher();
            
            this.emit('started');
            return { success: true, message: 'ASR started' };
            
        } catch (err) {
            console.error('Failed to start ASR:', err);
            return { success: false, error: err.message };
        }
    }
    
    /**
     * Stop the ASR service
     */
    stop() {
        if (!this.isRunning || !this.process) {
            return { success: true, message: 'Not running' };
        }
        
        console.log('🛑 Stopping ASR service');
        
        this.stopCommandWatcher();
        
        try {
            this.process.kill('SIGTERM');
            this.process = null;
            this.isRunning = false;
            this.emit('stopped', 0);
            return { success: true, message: 'ASR stopped' };
        } catch (err) {
            console.error('Error stopping ASR:', err);
            return { success: false, error: err.message };
        }
    }
    
    /**
     * Pause listening (RHEA is speaking)
     */
    pause() {
        this.isPaused = true;
        try {
            fs.writeFileSync(this.speakingSignal, 'true');
            console.log('⏸️ ASR paused');
        } catch (err) {
            console.error('Error pausing ASR:', err);
        }
    }
    
    /**
     * Resume listening
     */
    resume() {
        this.isPaused = false;
        try {
            if (fs.existsSync(this.speakingSignal)) {
                fs.unlinkSync(this.speakingSignal);
            }
            console.log('▶️ ASR resumed');
        } catch (err) {
            console.error('Error resuming ASR:', err);
        }
    }
    
    /**
     * Set ASR mode (command/dictation)
     */
    setMode(mode) {
        this.config.mode = mode;
        this.saveConfig();
        console.log(`📝 ASR mode set to: ${mode}`);
        this.emit('modeChanged', mode);
    }
    
    /**
     * Set model size
     */
    setModelSize(size) {
        this.config.modelSize = size;
        this.saveConfig();
        console.log(`🧠 ASR model set to: ${size}`);
        // Restart to apply
        if (this.isRunning) {
            this.stop();
            setTimeout(() => this.start(), 500);
        }
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            config: this.config
        };
    }
    
    /**
     * Start watching for command file changes
     */
    startCommandWatcher() {
        if (this.commandWatcher) return;
        
        // Check for command file every 100ms
        this.commandWatcher = setInterval(() => {
            this.checkCommandFile();
        }, 100);
        
        console.log('👀 Command watcher started');
    }
    
    /**
     * Stop command watcher
     */
    stopCommandWatcher() {
        if (this.commandWatcher) {
            clearInterval(this.commandWatcher);
            this.commandWatcher = null;
            console.log('👀 Command watcher stopped');
        }
    }
    
    /**
     * Check command file for new transcripts
     */
    checkCommandFile() {
        try {
            if (!fs.existsSync(this.statusFile)) return;
            
            const stat = fs.statSync(this.statusFile);
            const modTime = stat.mtimeMs;
            
            if (modTime > this.lastCommandTime) {
                this.lastCommandTime = modTime;
                
                const data = JSON.parse(fs.readFileSync(this.statusFile, 'utf8'));
                
                if (data.text && data.text.trim()) {
                    console.log(`🎯 ASR Transcript: "${data.text}" (conf=${data.confidence})`);
                    
                    this.emit('transcript', {
                        text: data.text,
                        confidence: data.confidence,
                        mode: data.mode,
                        timestamp: data.timestamp
                    });
                }
            }
        } catch (err) {
            // Ignore parse errors
        }
    }
    
    /**
     * Parse output from ASR process
     */
    parseASROutput(line) {
        // Look for transcript output
        if (line.includes('Final:') || line.includes('EXECUTE')) {
            // Extract transcript from log line
            const match = line.match(/'([^']+)'/);
            if (match) {
                this.emit('transcript', {
                    text: match[1],
                    confidence: 0.9,
                    mode: this.config.mode
                });
            }
        }
    }
    
    /**
     * Find Python executable
     */
    async findPython() {
        const candidates = [
            'python3',
            '/usr/bin/python3',
            '/usr/local/bin/python3',
            '/opt/homebrew/bin/python3',
            '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
            '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3',
            '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
            'python'
        ];
        
        for (const python of candidates) {
            try {
                const { execSync } = require('child_process');
                execSync(`${python} --version`, { stdio: 'ignore' });
                console.log(`🐍 Found Python: ${python}`);
                return python;
            } catch {
                continue;
            }
        }
        
        console.error('❌ Python not found');
        return null;
    }
    
    /**
     * Get vocabulary terms
     */
    getVocabulary() {
        try {
            const vocabPath = path.join(this.asrPath, 'vocab.json');
            if (fs.existsSync(vocabPath)) {
                return JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
            }
        } catch (err) {
            console.error('Error loading vocabulary:', err);
        }
        return null;
    }
    
    /**
     * Update vocabulary
     */
    updateVocabulary(vocab) {
        try {
            const vocabPath = path.join(this.asrPath, 'vocab.json');
            fs.writeFileSync(vocabPath, JSON.stringify(vocab, null, 2));
            console.log('📚 Vocabulary updated');
            return { success: true };
        } catch (err) {
            console.error('Error updating vocabulary:', err);
            return { success: false, error: err.message };
        }
    }
    
    /**
     * Get voice profiles
     */
    getProfiles() {
        try {
            const profilesDir = path.join(this.asrPath, 'profiles');
            const profiles = [];
            
            if (fs.existsSync(profilesDir)) {
                const files = fs.readdirSync(profilesDir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const data = JSON.parse(fs.readFileSync(path.join(profilesDir, file), 'utf8'));
                        profiles.push(data);
                    }
                }
            }
            
            return profiles;
        } catch (err) {
            console.error('Error loading profiles:', err);
            return [];
        }
    }
    
    /**
     * Set active profile
     */
    setActiveProfile(profileName) {
        this.config.activeProfile = profileName;
        this.saveConfig();
        console.log(`👤 Active profile: ${profileName}`);
        this.emit('profileChanged', profileName);
    }
}

module.exports = ASRService;

