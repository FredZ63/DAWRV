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
            provider: 'deepgram', // 'local' (streaming whisper/faster-whisper) | 'deepgram' (cloud streaming)
            modelSize: 'base',
            mode: 'command',
            confidenceThreshold: 0.55,
            activeProfile: 'default',

            // Optional: selective second-pass for tricky command-like phrases (local provider only)
            // Set to '' to disable.
            secondPassModelSize: 'small',
            secondPassMaxConfidence: 0.80,
            secondPassMinImprovement: 0.08,
            secondPassMaxAudioSeconds: 6.0
        };
        
        // Paths
        this.asrPath = path.join(__dirname, '..', '..', 'asr');
        this.commandFile = '/tmp/dawrv_voice_command.txt';
        this.statusFile = '/tmp/dawrv_asr_status.json';
        this.speakingSignal = '/tmp/rhea_speaking'; // Must match Python listener!
        this.userSpeakingFile = '/tmp/dawrv_user_speaking.json'; // VAD-driven barge-in signal (Deepgram provider)
        
        // File watcher for commands
        this.commandWatcher = null;
        this.lastCommandTime = 0;

        // User-speaking watcher (for barge-in)
        this.userSpeakingWatcher = null;
        this.lastUserSpeakingTimestamp = 0;

        // Provider health / fallback
        this._lastStderr = '';
        this._activeProvider = null;
        this._fallbackAttempted = false;
        
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
                // Trim API key to remove any whitespace
                if (this.config.deepgramApiKey && typeof this.config.deepgramApiKey === 'string') {
                    this.config.deepgramApiKey = this.config.deepgramApiKey.trim();
                }
                // Never log secrets
                const redacted = { ...this.config };
                if (redacted.deepgramApiKey) redacted.deepgramApiKey = '[REDACTED]';
                console.log('📂 ASR config loaded:', redacted);
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

        // Reset fallback state per start attempt
        this._fallbackAttempted = false;
        this._lastStderr = '';
        
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
        
        // Select provider script
        let provider = (this.config.provider || 'local').toLowerCase();
        if (provider === 'deepgram') {
            // Check for API key in env vars OR config
            const hasEnvKey = !!(process.env.DEEPGRAM_API_KEY || process.env.DG_API_KEY);
            const hasConfigKey = !!(this.config.deepgramApiKey && this.config.deepgramApiKey.trim());
            
            if (!hasEnvKey && !hasConfigKey) {
                console.log('⚠️ DEEPGRAM_API_KEY missing in both env and config; falling back to local ASR');
                provider = 'local';
                this.config.provider = 'local';
            } else if (!hasEnvKey && hasConfigKey) {
                console.log('✅ Using Deepgram API key from config');
            }
        } else if (provider === 'gemini') {
            // Check for Gemini API key
            const hasEnvKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
            const hasConfigKey = !!(this.config.geminiApiKey && this.config.geminiApiKey.trim());
            
            if (!hasEnvKey && !hasConfigKey) {
                console.log('⚠️ GEMINI_API_KEY missing in both env and config; falling back to local ASR');
                provider = 'local';
                this.config.provider = 'local';
            } else if (!hasEnvKey && hasConfigKey) {
                console.log('✅ Using Gemini API key from config');
            }
        } else if (provider === 'assemblyai') {
            // Check for AssemblyAI API key
            const hasEnvKey = !!process.env.ASSEMBLYAI_API_KEY;
            const hasConfigKey = !!(this.config.assemblyaiApiKey && this.config.assemblyaiApiKey.trim());
            
            if (!hasEnvKey && !hasConfigKey) {
                console.log('⚠️ ASSEMBLYAI_API_KEY missing in both env and config; falling back to local ASR');
                provider = 'local';
                this.config.provider = 'local';
            } else if (!hasEnvKey && hasConfigKey) {
                console.log('✅ Using AssemblyAI API key from config');
            }
        }
        this._activeProvider = provider;

        const scriptPath = (provider === 'deepgram')
            ? path.join(this.asrPath, 'deepgram_to_dawrv.py')
            : (provider === 'gemini')
            ? path.join(this.asrPath, 'gemini_to_dawrv.py')
            : (provider === 'assemblyai')
            ? path.join(this.asrPath, 'assemblyai_to_dawrv.py')
            : path.join(this.asrPath, 'asr_to_dawrv.py');
        
        // Check if script exists
        if (!fs.existsSync(scriptPath)) {
            return { success: false, error: 'ASR script not found' };
        }
        
        console.log(`🚀 Starting ASR service (${provider}) with model: ${this.config.modelSize}`);
        
        try {
            const args = [scriptPath];
            if (provider !== 'deepgram') {
                args.push('--model', this.config.modelSize);
            }

            const env = { ...process.env, PYTHONUNBUFFERED: '1' };
            if (provider === 'deepgram') {
                // Prefer env var, but fall back to config if needed
                if (!env.DEEPGRAM_API_KEY && !env.DG_API_KEY) {
                    const configKey = (this.config.deepgramApiKey || '').trim();
                    if (configKey) {
                        env.DEEPGRAM_API_KEY = configKey;
                        console.log('🔑 Using Deepgram API key from config (key length:', configKey.length, ')');
                    } else {
                        console.error('❌ No Deepgram API key found in config or environment');
                    }
                } else {
                    console.log('🔑 Using Deepgram API key from environment variable');
                }
            } else if (provider === 'gemini') {
                // Prefer env var, but fall back to config if needed
                if (!env.GEMINI_API_KEY && !env.GOOGLE_API_KEY) {
                    const configKey = (this.config.geminiApiKey || '').trim();
                    if (configKey) {
                        env.GEMINI_API_KEY = configKey;
                        console.log('🔑 Using Gemini API key from config (key length:', configKey.length, ')');
                    } else {
                        console.error('❌ No Gemini API key found in config or environment');
                    }
                } else {
                    console.log('🔑 Using Gemini API key from environment variable');
                }
            } else if (provider === 'assemblyai') {
                // Prefer env var, but fall back to config if needed
                if (!env.ASSEMBLYAI_API_KEY) {
                    const configKey = (this.config.assemblyaiApiKey || '').trim();
                    if (configKey) {
                        env.ASSEMBLYAI_API_KEY = configKey;
                        console.log('🔑 Using AssemblyAI API key from config (key length:', configKey.length, ')');
                    } else {
                        console.error('❌ No AssemblyAI API key found in config or environment');
                    }
                } else {
                    console.log('🔑 Using AssemblyAI API key from environment variable');
                }
            }
            if (provider !== 'deepgram') {
                const spModel = (this.config.secondPassModelSize || '').trim();
                if (spModel) {
                    env.DAWRV_SECOND_PASS_MODEL = spModel;
                    env.DAWRV_SECOND_PASS_MAX_CONF = String(this.config.secondPassMaxConfidence ?? 0.80);
                    env.DAWRV_SECOND_PASS_MIN_IMPROVEMENT = String(this.config.secondPassMinImprovement ?? 0.08);
                    env.DAWRV_SECOND_PASS_MAX_AUDIO_S = String(this.config.secondPassMaxAudioSeconds ?? 6.0);
                } else {
                    env.DAWRV_SECOND_PASS_MODEL = '';
                }
            }

            this.process = spawn(pythonPath, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env
            });
            
            this.process.stdout.on('data', (data) => {
                const lines = data.toString().split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    console.log(`[ASR] ${line}`);
                    this.parseASROutput(line);
                });
            });
            
            this.process.stderr.on('data', (data) => {
                const msg = data.toString();
                this._lastStderr = (this._lastStderr + '\n' + msg).slice(-4000);
                console.error(`[ASR Error] ${msg}`);
                // Friendly surfaced error for common auth failures
                if (msg.includes('HTTP 401') || msg.includes('401')) {
                    this.emit('error', 'Deepgram unauthorized (HTTP 401). Check your DEEPGRAM_API_KEY / Deepgram API key in Advanced ASR settings.');
                }
            });
            
            this.process.on('close', (code) => {
                console.log(`[ASR] Process exited with code ${code}`);
                this.isRunning = false;
                this.emit('stopped', code);

                // Auto-fallback: if Deepgram fails (401 / websocket start fail), immediately switch to local ASR
                // so voice control remains functional.
                try {
                    const wasDeepgram = (this._activeProvider === 'deepgram');
                    const stderr = String(this._lastStderr || '');
                    const looksAuth = stderr.includes('HTTP 401') || stderr.includes('401') || stderr.toLowerCase().includes('unauthorized');
                    const looksStartFail = stderr.toLowerCase().includes('failed to start deepgram websocket') ||
                        stderr.toLowerCase().includes('server rejected') ||
                        stderr.toLowerCase().includes('websocketconnection') ||
                        stderr.toLowerCase().includes('websocketexception');

                    if (wasDeepgram && code !== 0 && !this._fallbackAttempted && (looksAuth || looksStartFail)) {
                        this._fallbackAttempted = true;
                        console.log('🛟 Deepgram failed — falling back to local ASR automatically');
                        this.config.provider = 'local';
                        this.saveConfig();
                        this.emit('providerFallback', { from: 'deepgram', to: 'local', reason: looksAuth ? 'auth' : 'connection' });
                        setTimeout(() => {
                            // Fire-and-forget restart (avoid unhandled promises)
                            this.start().catch(() => {});
                        }, 500);
                    }
                } catch (_) {}
            });
            
            this.process.on('error', (err) => {
                console.error(`[ASR] Process error:`, err);
                this.isRunning = false;
                this.emit('error', err);
            });
            
            this.isRunning = true;
            this.startCommandWatcher();
            this.startUserSpeakingWatcher();
            
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
        this.stopUserSpeakingWatcher();
        
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
        
        // Check for command file every 50ms for faster response
        this.commandWatcher = setInterval(() => {
            this.checkCommandFile();
        }, 50);
        
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
     * Start watching for user-speaking (VAD) events for barge-in.
     * This is intentionally low-latency (50ms) to stop TTS quickly when user starts talking.
     */
    startUserSpeakingWatcher() {
        if (this.userSpeakingWatcher) return;

        this.userSpeakingWatcher = setInterval(() => {
            this.checkUserSpeakingFile();
        }, 50);
    }

    stopUserSpeakingWatcher() {
        if (this.userSpeakingWatcher) {
            clearInterval(this.userSpeakingWatcher);
            this.userSpeakingWatcher = null;
        }
    }

    checkUserSpeakingFile() {
        try {
            if (!fs.existsSync(this.userSpeakingFile)) return;
            const data = JSON.parse(fs.readFileSync(this.userSpeakingFile, 'utf8'));
            const ts = Number(data?.timestamp || 0);
            if (!ts || !Number.isFinite(ts)) return;

            // Emit only on monotonic timestamp updates
            if (ts > this.lastUserSpeakingTimestamp) {
                this.lastUserSpeakingTimestamp = ts;
                this.emit('userSpeaking', {
                    timestamp: ts,
                    rms: Number(data?.rms || 0)
                });
            }
        } catch (err) {
            // Ignore parse errors / races
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
                        timestamp: data.timestamp,
                        isFinal: (data.is_final !== undefined) ? !!data.is_final : true,
                        provider: data.provider || this.config.provider || 'local'
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

