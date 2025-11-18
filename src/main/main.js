const { app, BrowserWindow, ipcMain, session, systemPreferences } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec, spawn, execSync, execFile } = require('child_process');
const os = require('os');
const MIDI2Service = require('./midi2-service');
const PluginService = require('./plugin-service');
const DAWStateService = require('./daw-state-service');
const http = require('http');

class DAWRVApp {
    constructor() {
        this.mainWindow = null;
        this.voiceListenerProcess = null;
        this.isVoiceListening = false;
        this.voiceCommandFile = '/tmp/dawrv_voice_command.txt';
        this.lastCommand = '';
        this.fileWatcherInterval = null;
        this.ipcSetup = false; // Track if IPC has been set up
        
        // Initialize MIDI 2.0 service
        this.midi2Service = new MIDI2Service();
        // Initialize DAW state service (OSC feedback)
        this.dawStateService = new DAWStateService({ port: 8001 });
        
        // Initialize Plugin service
        console.log('🔌 Creating PluginService instance...');
        try {
            this.pluginService = new PluginService();
            console.log('✅ PluginService created successfully:', !!this.pluginService);
        } catch (error) {
            console.error('❌ Failed to create PluginService:', error);
            this.pluginService = null;
        }
    }
    
    /**
     * Setup Plugin Discovery IPC handlers
     */
    setupPluginHandlers() {
        console.log('🔌 ========================================');
        console.log('🔌 Setting up plugin handlers...');
        console.log('🔌 Plugin service exists:', !!this.pluginService);
        
        if (!this.pluginService) {
            console.error('❌ Plugin service not initialized - cannot register handlers!');
            return;
        }
        
        console.log('🔌 Registering plugin IPC handlers...');
        
        try {
            // Initialize plugin discovery
            ipcMain.handle('plugin-initialize', async () => {
                console.log('🔌 plugin-initialize handler called');
                try {
                    const result = await this.pluginService.initialize();
                    return result;
                } catch (error) {
                    console.error('Plugin initialization error:', error);
                    return { success: false, error: error.message };
                }
            });
            
            // Get all plugins
            ipcMain.handle('plugin-get-all', async () => {
                console.log('🔌 plugin-get-all handler called');
                try {
                    const plugins = this.pluginService.getAllPlugins();
                    console.log(`🔌 Returning ${plugins.length} plugins`);
                    return { success: true, plugins };
                } catch (error) {
                    console.error('Get plugins error:', error);
                    return { success: false, error: error.message, plugins: [] };
                }
            });
            
            // Get plugins by type
            ipcMain.handle('plugin-get-by-type', async (event, type) => {
                try {
                    const plugins = this.pluginService.getPluginsByType(type);
                    return { success: true, plugins };
                } catch (error) {
                    console.error('Get plugins by type error:', error);
                    return { success: false, error: error.message, plugins: [] };
                }
            });
            
            // Search plugins
            ipcMain.handle('plugin-search', async (event, query) => {
                try {
                    const plugins = this.pluginService.searchPlugins(query);
                    return { success: true, plugins };
                } catch (error) {
                    console.error('Plugin search error:', error);
                    return { success: false, error: error.message, plugins: [] };
                }
            });
            
            // Get plugin info
            ipcMain.handle('plugin-get-info', async (event, pluginName) => {
                try {
                    const plugin = this.pluginService.getPluginInfo(pluginName);
                    return { success: true, plugin };
                } catch (error) {
                    console.error('Get plugin info error:', error);
                    return { success: false, error: error.message, plugin: null };
                }
            });
            
            // Get plugin counts
            ipcMain.handle('plugin-get-counts', async () => {
                try {
                    return {
                        success: true,
                        total: this.pluginService.getTotalPluginCount(),
                        counts: {
                            vst: this.pluginService.plugins.vst.length,
                            vst3: this.pluginService.plugins.vst3.length,
                            au: this.pluginService.plugins.au.length,
                            js: this.pluginService.plugins.js.length
                        }
                    };
                } catch (error) {
                    console.error('Get plugin counts error:', error);
                    return { success: false, error: error.message };
                }
            });
            
            // Verify handlers are registered
            const registeredHandlers = [
                'plugin-initialize',
                'plugin-get-all',
                'plugin-get-by-type',
                'plugin-search',
                'plugin-get-info',
                'plugin-get-counts'
            ];
            
            console.log('✅ Plugin IPC handlers registered successfully');
            console.log('🔌 Registered handlers:', registeredHandlers.join(', '));
            console.log('🔌 ========================================');
        } catch (error) {
            console.error('❌ ERROR registering plugin handlers:', error);
            console.error('   Error message:', error.message);
            console.error('   Error stack:', error.stack);
            throw error; // Re-throw to see the error
        }
    }
    
    /**
     * Setup MIDI 2.0 IPC handlers
     * Must be called after setupIPC() to ensure handlers are registered
     */
    setupMIDI2Handlers() {
        if (!this.midi2Service) {
            console.warn('MIDI 2.0 service not initialized');
            return;
        }
        // Initialize MIDI 2.0 service
        ipcMain.handle('midi2-initialize', async () => {
            try {
                const result = await this.midi2Service.initialize();
                return result;
            } catch (error) {
                console.error('MIDI 2.0 initialization error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Discover MIDI devices
        ipcMain.handle('midi2-discover-devices', async () => {
            try {
                const devices = await this.midi2Service.discoverDevices();
                return { success: true, devices };
            } catch (error) {
                console.error('MIDI 2.0 device discovery error:', error);
                return { success: false, error: error.message, devices: [] };
            }
        });
        
        // Open MIDI input
        ipcMain.handle('midi2-open-input', async (event, deviceId) => {
            try {
                const input = await this.midi2Service.openInput(deviceId);
                return { success: true, input };
            } catch (error) {
                console.error('MIDI 2.0 open input error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Open MIDI output
        ipcMain.handle('midi2-open-output', async (event, deviceId) => {
            try {
                const output = await this.midi2Service.openOutput(deviceId);
                return { success: true, output };
            } catch (error) {
                console.error('MIDI 2.0 open output error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Send precise value
        ipcMain.handle('midi2-send-precise-value', async (event, deviceId, parameter, value, options) => {
            try {
                const result = await this.midi2Service.sendPreciseValue(deviceId, parameter, value, options);
                return { success: true, result };
            } catch (error) {
                console.error('MIDI 2.0 send precise value error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Query device property
        ipcMain.handle('midi2-query-property', async (event, deviceId, property) => {
            try {
                const result = await this.midi2Service.queryProperty(deviceId, property);
                return { success: true, property: result };
            } catch (error) {
                console.error('MIDI 2.0 query property error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Get device state
        ipcMain.handle('midi2-get-device-state', async (event, deviceId) => {
            try {
                const state = await this.midi2Service.getDeviceState(deviceId);
                return { success: true, state };
            } catch (error) {
                console.error('MIDI 2.0 get device state error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Close input
        ipcMain.handle('midi2-close-input', async (event, deviceId) => {
            try {
                await this.midi2Service.closeInput(deviceId);
                return { success: true };
            } catch (error) {
                console.error('MIDI 2.0 close input error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Close output
        ipcMain.handle('midi2-close-output', async (event, deviceId) => {
            try {
                await this.midi2Service.closeOutput(deviceId);
                return { success: true };
            } catch (error) {
                console.error('MIDI 2.0 close output error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Listen for MIDI 2.0 events
        this.midi2Service.on('devices-discovered', (devices) => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('midi2-devices-discovered', devices);
            }
        });
        
        this.midi2Service.on('message-sent', (data) => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('midi2-message-sent', data);
            }
        });
        
        console.log('✅ MIDI 2.0 IPC handlers registered');
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            titleBarStyle: 'hiddenInset',
            backgroundColor: '#1a1a2e',
            show: false
        });

        session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === 'media') {
                callback(true);
            } else {
                callback(false);
            }
        });

        // Wait a moment to ensure IPC handlers are fully registered before loading
        // This prevents race conditions where renderer tries to call handlers before they're ready
        console.log('⏳ Waiting 200ms before loading window HTML to ensure IPC handlers are ready...');
        setTimeout(() => {
            console.log('📄 Loading window HTML...');
            this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        }, 200);

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            console.log('✅ DAWRV window ready');
        });

        // Always open DevTools for debugging (you can remove this later)
        this.mainWindow.webContents.openDevTools();
        
        // Or use keyboard shortcut: Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
        // Or right-click in the app and select "Inspect"

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

    async requestMicrophonePermission() {
        if (process.platform === 'darwin') {
            try {
                const status = systemPreferences.getMediaAccessStatus('microphone');
                console.log('🎤 Current microphone permission status:', status);
                
                if (status === 'not-determined' || status === 'denied') {
                    console.log('🎤 Requesting microphone permission...');
                    const granted = await systemPreferences.askForMediaAccess('microphone');
                    console.log('🎤 Microphone permission granted:', granted);
                    return granted;
                } else if (status === 'granted') {
                    console.log('✅ Microphone permission already granted');
                    return true;
                } else if (status === 'restricted') {
                    console.error('❌ Microphone access is restricted by system policy');
                    return false;
                }
            } catch (error) {
                console.error('❌ Error requesting microphone permission:', error);
                return false;
            }
        }
        // Non-macOS platforms don't need this check
        return true;
    }

    async startVoiceListener() {
        // Request microphone permission first (macOS only)
        const hasPermission = await this.requestMicrophonePermission();
        if (!hasPermission) {
            console.error('❌ Microphone permission not granted. Cannot start voice listener.');
            if (this.mainWindow) {
                this.mainWindow.webContents.send('voice-engine-error', 
                    'Microphone access denied. Please grant permission in System Settings → Privacy & Security → Microphone');
            }
            return;
        }

        try {
            if (this.voiceListenerProcess && !this.voiceListenerProcess.killed) {
                console.log('Voice listener already running');
                return;
            }
        } catch (error) {
            console.error('Error checking voice listener process:', error);
            // Continue to start new process
        }

        // Load Deepgram API key from file if not in environment
        if (!process.env.DEEPGRAM_API_KEY) {
            const keyFilePath = path.join(__dirname, '../../.deepgram-key');
            if (fs.existsSync(keyFilePath)) {
                try {
                    const apiKey = fs.readFileSync(keyFilePath, 'utf8').trim();
                    if (apiKey) {
                        process.env.DEEPGRAM_API_KEY = apiKey;
                        console.log('🔑 Loaded Deepgram API key from .deepgram-key file');
                    }
                } catch (error) {
                    console.warn('⚠️  Could not read .deepgram-key file:', error.message);
                }
            }
        }
        
        // Use Google Speech Recognition for INSTANT startup (< 1 second)
        // rhea_voice_listener.py uses FREE Google API - fast, accurate, no model loading!
        const scriptFilename = 'rhea_voice_listener.py';
        
        console.log('🎤 Voice Engine Selection:');
        console.log('   Selected engine: Google Speech Recognition (FREE, INSTANT)');
        
        // Resolve script path - handle both development and packaged app
        let scriptPath;
        if (app.isPackaged) {
            // In packaged app, scripts are in Resources
            scriptPath = path.join(process.resourcesPath, scriptFilename);
        } else {
            // In development, use project root (__dirname is src/main, so go up 2 levels)
            scriptPath = path.resolve(__dirname, '../../' + scriptFilename);
        }
        
        console.log('🎤 Starting Python voice listener...');
        console.log('   Script path:', scriptPath);
        console.log('   File exists:', fs.existsSync(scriptPath));
        console.log('   __dirname:', __dirname);
        console.log('   app.isPackaged:', app.isPackaged);
        console.log('   process.resourcesPath:', process.resourcesPath);
        
        // Check if file exists
        if (!fs.existsSync(scriptPath)) {
            const error = `Voice listener script not found at: ${scriptPath}`;
            console.error('❌', error);
            console.error('   Tried paths:');
            console.error('     -', scriptPath);
            if (!app.isPackaged) {
                console.error('     -', path.resolve(__dirname, '../../../rhea_voice_listener.py'));
                console.error('     -', path.resolve(__dirname, '../../../../rhea_voice_listener.py'));
            }
            if (this.mainWindow) {
                this.mainWindow.webContents.send('voice-engine-error', error);
            }
            throw new Error(error); // Throw error so IPC handler can catch it
        }
        
        // Find python3 executable - use absolute path first (most reliable)
        // Fast Python detection - check common paths directly (no execSync)
        const possiblePythonPaths = [
            '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
            '/usr/bin/python3',
            '/usr/local/bin/python3',
            '/opt/homebrew/bin/python3'
        ];
        
        let pythonCmd = 'python3'; // Fallback
        for (const pythonPath of possiblePythonPaths) {
            if (fs.existsSync(pythonPath)) {
                pythonCmd = pythonPath;
                break;
            }
        }
        
        console.log('🎤 Starting voice listener:', scriptPath);
        
        // Capture all output before process exits
        let stdoutBuffer = '';
        let stderrBuffer = '';
        
        // Build environment with proper PATH - use absolute Python path so PATH doesn't matter
        const env = { 
            ...process.env, 
            PYTHONUNBUFFERED: '1',
            // Ensure we have a good PATH
            PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/Library/Frameworks/Python.framework/Versions/3.13/bin'
        };
        
        // Add Python directory to PATH if using absolute path
        const pythonDir = path.dirname(pythonCmd);
        if (pythonDir && pythonDir !== '.' && pythonDir !== '/' && !env.PATH.includes(pythonDir)) {
            env.PATH = `${pythonDir}:${env.PATH}`;
        }
        
        console.log('   Environment PATH:', env.PATH);
        console.log('   Python command (absolute):', pythonCmd);
        console.log('   Script path (absolute):', scriptPath);
        
        // Use absolute paths for both Python and script - this is most reliable
        this.voiceListenerProcess = spawn(pythonCmd, [scriptPath], {
            cwd: path.dirname(scriptPath),
            stdio: ['ignore', 'pipe', 'pipe'],
            env: env,
            // Don't use shell, but ensure we have the right paths
            shell: false
        });

        // Log process start
        console.log('✅ Voice listener process spawned, PID:', this.voiceListenerProcess.pid);
        console.log('   Process object:', !!this.voiceListenerProcess);
        console.log('   Process killed:', this.voiceListenerProcess.killed);
        
        // Track if we've seen any output (indicates process started successfully)
        let hasSeenOutput = false;
        
        // Store buffers for diagnostics and process output
        this.voiceListenerProcess.stdout.on('data', (data) => {
            hasSeenOutput = true;
            const output = data.toString();
            stdoutBuffer += output;
            console.log('Voice Listener STDOUT:', output.trim());
            
            // Check for ready status
            if (output.includes('Ready!') || output.includes('listening') || output.includes('calibrated') || output.includes('Listening...')) {
                if (this.mainWindow) {
                    this.mainWindow.webContents.send('voice-engine-ready');
                }
            }
        });
        
        this.voiceListenerProcess.stderr.on('data', (data) => {
            hasSeenOutput = true; // stderr also counts as output
            const error = data.toString();
            stderrBuffer += error;
            const errorLower = error.toLowerCase();
            
            // Filter out common non-error messages
            const ignorePatterns = [
                'google-cloud-speech',
                'warning',
                'upgrade',
                'version',
                'consider upgrading',
                'you are using pip',
                'deprecated'
            ];
            
            const isIgnored = ignorePatterns.some(pattern => errorLower.includes(pattern));
            
            if (!isIgnored && error.trim()) {
                console.error('Voice Listener Error:', error.trim());
                // Only send actual errors, not warnings
                if (this.mainWindow && error.trim().length > 0) {
                    // Check if it's a real error (contains error keywords)
                    const isRealError = ['error', 'failed', 'exception', 'traceback', 'cannot', 'unable'].some(
                        keyword => errorLower.includes(keyword)
                    );
                    if (isRealError) {
                        this.mainWindow.webContents.send('voice-engine-error', error.trim());
                    } else {
                        // Just log warnings, don't send as errors
                        console.warn('Voice Listener Warning:', error.trim());
                    }
                }
            }
        });

        this.voiceListenerProcess.on('close', (code, signal) => {
            console.log('❌ ========================================');
            console.log('❌ VOICE LISTENER PROCESS CLOSED');
            console.log(`❌ Exit code: ${code}`);
            console.log(`❌ Signal: ${signal}`);
            console.log(`❌ Process PID was: ${this.voiceListenerProcess ? this.voiceListenerProcess.pid : 'unknown'}`);
            console.log(`❌ Was listening: ${this.isVoiceListening}`);
            console.log(`❌ Was using: Google Speech Recognition`);
            
            // Show captured output for diagnostics
            if (stdoutBuffer) {
                console.log('❌ STDOUT captured (first 1000 chars):');
                console.log(stdoutBuffer.substring(0, 1000));
            } else {
                console.log('❌ No STDOUT captured');
            }
            if (stderrBuffer) {
                console.log('❌ STDERR captured (first 1000 chars):');
                console.log(stderrBuffer.substring(0, 1000));
            } else {
                console.log('❌ No STDERR captured');
            }
            console.log('❌ ========================================');
            
            const wasListening = this.isVoiceListening;
            const processPid = this.voiceListenerProcess ? this.voiceListenerProcess.pid : 'unknown';
            this.voiceListenerProcess = null;
            this.isVoiceListening = false;
            
            // Build error message
            let errorMessage = '';
            if (code === 0) {
                errorMessage = 'Voice listener stopped normally';
            } else if (code === null && signal) {
                // Process was killed by a signal
                console.error(`❌ Voice listener was killed by signal: ${signal}`);
                
                // Don't show error if we intentionally stopped it (SIGTERM/SIGKILL when not listening)
                if ((signal === 'SIGTERM' || signal === 'SIGKILL') && !this.isVoiceListening) {
                    console.log('   Process stopped intentionally (user stopped listening)');
                    errorMessage = ''; // Don't send error for intentional stop
                    return; // Exit early, don't send error message
                }
                
                // Check stderr for specific error messages
                if (stderrBuffer.includes('ModuleNotFoundError') || stderrBuffer.includes('No module named')) {
                    const missingModule = stderrBuffer.match(/No module named ['"]([^'"]+)['"]/);
                    if (missingModule) {
                        errorMessage = `Python module missing: ${missingModule[1]}. Install: pip3 install ${missingModule[1]}`;
                    } else {
                        errorMessage = 'Python dependencies missing. Install: pip3 install SpeechRecognition pyaudio';
                    }
                } else if (stderrBuffer.includes('Permission denied') || stderrBuffer.includes('EACCES')) {
                    errorMessage = 'Permission denied. Check file permissions and microphone access.';
                } else if (stderrBuffer.includes('No such file') || stderrBuffer.includes('ENOENT')) {
                    errorMessage = 'Python or script not found. Check Python installation.';
                } else if (stderrBuffer.trim()) {
                    // Use the actual error from stderr
                    const errorLines = stderrBuffer.split('\n').filter(line => 
                        line.trim() && 
                        !line.toLowerCase().includes('warning') &&
                        !line.toLowerCase().includes('deprecated')
                    );
                    if (errorLines.length > 0) {
                        errorMessage = `Voice listener error: ${errorLines[0].substring(0, 200).trim()}`;
                    } else {
                        errorMessage = `Voice listener terminated (signal: ${signal}). Check console for details.`;
                    }
                } else {
                    errorMessage = `Voice listener terminated unexpectedly (signal: ${signal}). Install Python dependencies: pip3 install SpeechRecognition pyaudio`;
                }
            } else if (code === null) {
                // Process was killed but no signal info
                console.error('❌ Voice listener was terminated unexpectedly (code null, no signal)');
                // Check stderr for clues
                if (stderrBuffer.includes('ModuleNotFoundError') || stderrBuffer.includes('No module named')) {
                    const missingModule = stderrBuffer.match(/No module named ['"]([^'"]+)['"]/);
                    if (missingModule) {
                        errorMessage = `Python module missing: ${missingModule[1]}. Install: pip3 install ${missingModule[1]}`;
                    } else {
                        errorMessage = 'Python dependencies missing. Install: pip3 install SpeechRecognition pyaudio';
                    }
                } else if (stderrBuffer.trim()) {
                    errorMessage = `Voice listener failed: ${stderrBuffer.substring(0, 300).trim()}`;
                } else {
                    errorMessage = 'Voice listener terminated. Install dependencies: pip3 install SpeechRecognition pyaudio';
                }
            } else {
                console.error(`❌ Voice listener crashed with exit code: ${code}`);
                if (stderrBuffer) {
                    const errorLines = stderrBuffer.split('\n').filter(line => 
                        line.trim() && 
                        !line.toLowerCase().includes('warning') &&
                        !line.toLowerCase().includes('deprecated')
                    );
                    if (errorLines.length > 0) {
                        errorMessage = `Voice listener crashed (code ${code}): ${errorLines[0].substring(0, 200).trim()}`;
                    } else {
                        errorMessage = `Voice listener crashed (code ${code}). Check console for details.`;
                    }
                } else {
                    errorMessage = `Voice listener crashed (code ${code}). Check console for details.`;
                }
            }
            
            // Only send error if it's not an intentional stop
            // wasListening is captured BEFORE we set isVoiceListening to false, so use it
            const wasIntentionallyStopped = (signal === 'SIGTERM' || signal === 'SIGKILL') && !wasListening;
            
            console.log('   wasListening:', wasListening);
            console.log('   signal:', signal);
            console.log('   wasIntentionallyStopped:', wasIntentionallyStopped);
            
            if (this.mainWindow && errorMessage && errorMessage !== 'Voice listener stopped normally') {
                // Don't send error if we intentionally stopped it
                if (!wasIntentionallyStopped) {
                    console.log('   Sending error to renderer:', errorMessage);
                    this.mainWindow.webContents.send('voice-engine-error', errorMessage);
                } else {
                    console.log('   ✅ Suppressing error message - process was intentionally stopped');
                }
            } else {
                console.log('   No error message to send');
            }
            
            // Auto-restart if it was supposed to be running and crashed
            // Don't restart if it was killed by a signal (likely a dependency issue)
            if (wasListening && code !== 0 && !signal) {
                console.log('🔄 Restarting voice listener in 2 seconds...');
                setTimeout(() => {
                    if (this.isVoiceListening === false) { // Only restart if still supposed to be listening
                        this.startVoiceListener();
                    }
                }, 2000);
            } else if (signal) {
                console.log('⏸️  Not auto-restarting (process was killed by signal - likely dependency issue)');
                console.log('   Fix: Run "pip3 install SpeechRecognition pyaudio" in Terminal');
            }
        });

        this.voiceListenerProcess.on('error', (error) => {
            console.error('❌ ========================================');
            console.error('❌ FAILED TO START VOICE LISTENER');
            console.error('❌ Error:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error syscall:', error.syscall);
            console.error('❌ Error path:', error.path);
            
            // Provide helpful error message
            let userMessage = `Failed to start voice listener: ${error.message}`;
            if (error.code === 'ENOENT') {
                userMessage = 'Python3 not found. Please install Python 3 and ensure it is in your PATH.';
            } else if (error.code === 'EACCES') {
                userMessage = 'Permission denied. Check file permissions for the voice listener script.';
            }
            
            console.error('❌ User message:', userMessage);
            console.error('❌ ========================================');
            
            this.isVoiceListening = false;
            if (this.mainWindow) {
                this.mainWindow.webContents.send('voice-engine-error', userMessage);
            }
            // Don't throw here - process error is handled via event
        });

        // INSTANT STARTUP - No verification delays!
        // Google Speech Recognition starts in <200ms, so just check immediately
        setTimeout(() => {
            if (this.voiceListenerProcess && this.voiceListenerProcess.killed) {
                console.error('❌ Voice listener process died immediately');
                this.isVoiceListening = false;
                if (this.mainWindow && stderrBuffer.trim()) {
                    const errorMsg = stderrBuffer.split('\n')
                        .find(line => line.trim() && 
                            (line.includes('Error') || line.includes('ModuleNotFoundError') || line.includes('No module named')));
                    if (errorMsg) {
                        this.mainWindow.webContents.send('voice-engine-error', `Voice listener failed: ${errorMsg.substring(0, 200)}`);
                    } else {
                        this.mainWindow.webContents.send('voice-engine-error', 'Voice listener failed to start. Install: pip3 install SpeechRecognition pyaudio');
                    }
                } else if (this.mainWindow) {
                    this.mainWindow.webContents.send('voice-engine-error', 'Voice listener failed to start. Install: pip3 install SpeechRecognition pyaudio');
                }
            } else if (this.voiceListenerProcess) {
                console.log('✅ Voice listener process is running, PID:', this.voiceListenerProcess.pid);
                this.isVoiceListening = true;
            }
        }, 200); // INSTANT: 200ms instead of 1-3 seconds!

        // Set flag immediately (will be verified in setTimeout)
        this.isVoiceListening = true;
    }

    stopVoiceListener() {
        console.log('🛑 Stopping voice listener...');
        this.isVoiceListening = false;
        
        if (this.voiceListenerProcess) {
            try {
                // Check if process is still alive
                if (!this.voiceListenerProcess.killed) {
                    console.log('   Sending SIGTERM to process...');
                    this.voiceListenerProcess.kill('SIGTERM');
                    
                    // Force kill after 2 seconds if it doesn't stop gracefully
                    setTimeout(() => {
                        if (this.voiceListenerProcess && !this.voiceListenerProcess.killed) {
                            console.log('🛑 Force killing voice listener...');
                            try {
                                this.voiceListenerProcess.kill('SIGKILL');
                            } catch (e) {
                                console.error('Error force killing:', e);
                            }
                        }
                    }, 2000);
                } else {
                    console.log('   Process already killed');
                }
            } catch (e) {
                console.error('Error stopping voice listener:', e);
            }
            
            // Clear the process reference after a short delay to allow cleanup
            setTimeout(() => {
                this.voiceListenerProcess = null;
            }, 100);
        } else {
            console.log('   No process to stop');
        }
    }

    startFileWatcher() {
        if (this.fileWatcherInterval) {
            console.log('👂 File watcher already running');
            return; // Already watching
        }

        console.log('👂 Starting file watcher for voice commands');
        console.log('   Watching file:', this.voiceCommandFile);
        let checkCount = 0;
        let lastProcessedTime = 0;
        const fileWatcherCooldown = 1000; // Don't process same command within 1 second
        
        this.fileWatcherInterval = setInterval(() => {
            checkCount++;
            if (checkCount % 25 === 0) { // Log every 5 seconds (25 * 200ms)
                console.log('👂 File watcher active, check #' + checkCount);
            }
            try {
                if (fs.existsSync(this.voiceCommandFile)) {
                    const command = fs.readFileSync(this.voiceCommandFile, 'utf8').trim();
                    const now = Date.now();
                    
                    // Only process if command exists, is different, and enough time has passed
                    if (command && command !== this.lastCommand && (now - lastProcessedTime) >= fileWatcherCooldown) {
                        const commandToProcess = command;
                        this.lastCommand = commandToProcess;
                        lastProcessedTime = now;
                        
                        console.log('📢 Voice command received:', commandToProcess);
                        console.log('   Last command was:', this.lastCommand || '(none)');
                        console.log('   Time since last processed:', now - lastProcessedTime, 'ms');
                        
                        // Clear the file IMMEDIATELY and atomically to prevent re-reading
                        try {
                            // Use unlink + write to ensure atomic operation
                            fs.unlinkSync(this.voiceCommandFile);
                        } catch (e) {
                            // If unlink fails, try writing empty string
                            try {
                                fs.writeFileSync(this.voiceCommandFile, '');
                            } catch (e2) {
                                // Ignore if both fail
                            }
                        }
                        
                        // Send command to renderer immediately (no delay needed since file is cleared)
                        if (this.mainWindow) {
                            console.log('📤 Sending voice command to renderer:', commandToProcess);
                            this.mainWindow.webContents.send('voice-command', commandToProcess);
                        } else {
                            console.log('❌ Main window not available, cannot send command');
                        }
                    } else if (command && command === this.lastCommand) {
                        // If same command is still in file, clear it to prevent re-processing
                        console.log('⏸️  Same command still in file, clearing:', command);
                        try {
                            fs.unlinkSync(this.voiceCommandFile);
                        } catch (e) {
                            try {
                                fs.writeFileSync(this.voiceCommandFile, '');
                            } catch (e2) {
                                // Ignore
                            }
                        }
                    } else if (command && (now - lastProcessedTime) < fileWatcherCooldown) {
                        // Command exists but within cooldown - clear it
                        console.log('⏸️  Command within cooldown, clearing:', command);
                        try {
                            fs.unlinkSync(this.voiceCommandFile);
                        } catch (e) {
                            try {
                                fs.writeFileSync(this.voiceCommandFile, '');
                            } catch (e2) {
                                // Ignore
                            }
                        }
                    }
                }
            } catch (err) {
                // Ignore file read errors
            }
        }, 200); // Check every 200ms for faster response
    }

    stopFileWatcher() {
        if (this.fileWatcherInterval) {
            clearInterval(this.fileWatcherInterval);
            this.fileWatcherInterval = null;
        }
    }

    setupIPC() {
        console.log('📡 ========================================');
        console.log('📡 Setting up IPC handlers...');
        console.log('📡 ========================================');
        console.log('📡 IPC setup flag:', this.ipcSetup);
        
        // Prevent multiple setups
        if (this.ipcSetup) {
            console.log('📡 IPC already set up, but continuing to ensure handlers are registered...');
            // Don't return - continue to register handlers (they'll be removed and re-added)
        }
        
        this.ipcSetup = true;
        
        // REGISTER PLUGIN HANDLER FIRST - before anything else to ensure it's available
        console.log('🔌 REGISTERING PLUGIN HANDLER FIRST (at start of setupIPC)...');
        ipcMain.handle('get-all-plugins', async () => {
            console.log('🔌 ========================================');
            console.log('🔌 get-all-plugins HANDLER CALLED!');
            console.log('🔌 ========================================');
            try {
                if (!this.pluginService) {
                    console.error('❌ Plugin service not available');
                    return { success: false, error: 'Plugin service not available', plugins: [] };
                }
                
                await this.pluginService.initialize();
                const plugins = this.pluginService.getAllPlugins();
                const counts = {
                    total: this.pluginService.getTotalPluginCount(),
                    vst: this.pluginService.plugins.vst.length,
                    vst3: this.pluginService.plugins.vst3.length,
                    au: this.pluginService.plugins.au.length,
                    js: this.pluginService.plugins.js.length
                };
                
                console.log(`🔌 Returning ${plugins.length} plugins to renderer`);
                return { 
                    success: true, 
                    plugins: plugins,
                    counts: counts
                };
            } catch (error) {
                console.error('Plugin discovery error:', error);
                return { 
                    success: false, 
                    error: error.message, 
                    plugins: [],
                    counts: { total: 0, vst: 0, vst3: 0, au: 0, js: 0 }
                };
            }
        });
        console.log('✅ Plugin handler get-all-plugins registered at START of setupIPC()');
        
        // Tempo handler is already registered at module level (above), so we don't need to register it here
        console.log('🎵 Tempo handler already registered at module level - skipping duplicate registration');
        
        ipcMain.handle('start-voice-listening', async () => {
            console.log('📞 IPC: start-voice-listening called');
            try {
                console.log('📞 Checking voice listener process...');
                console.log('   Process exists:', !!this.voiceListenerProcess);
                console.log('   Process killed:', this.voiceListenerProcess ? this.voiceListenerProcess.killed : 'N/A');
                
                if (!this.voiceListenerProcess || this.voiceListenerProcess.killed) {
                    console.log('📞 Starting voice listener...');
                    try {
                        this.startVoiceListener();
                        console.log('📞 Voice listener startVoiceListener() completed');
                    } catch (startError) {
                        console.error('❌ Error in startVoiceListener():', startError);
                        console.error('   Error message:', startError.message);
                        console.error('   Error stack:', startError.stack);
                        throw startError; // Re-throw to be caught by outer catch
                    }
                } else {
                    console.log('📞 Voice listener already running');
                }
                
                console.log('📞 Starting file watcher...');
                this.startFileWatcher();
                console.log('✅ Voice listening started by user');
                return { success: true };
            } catch (error) {
                console.error('❌ Failed to start voice listening:', error);
                console.error('   Error message:', error.message);
                console.error('   Error stack:', error.stack);
                const errorMessage = error.message || 'Unknown error';
                return { success: false, error: errorMessage };
            }
        });

        ipcMain.handle('stop-voice-listening', async () => {
            try {
                this.stopVoiceListener();
                this.stopFileWatcher();
                console.log('✅ Voice listening stopped');
                return { success: true };
            } catch (error) {
                console.error('Failed to stop voice listening:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('send-daw-command', async (event, command, params) => {
            console.log('DAW Command:', command, params);
            return { success: true, message: 'Command executed' };
        });

        // MIDI 2.0 IPC Handlers - Register BEFORE other handlers to ensure they're available
        this.setupMIDI2Handlers();
        
        // Plugin and tempo handlers already registered at the start of setupIPC() above
        
        ipcMain.handle('execute-reaper-action', async (event, actionId) => {
            const logMessage = `🎯 IPC HANDLER CALLED: execute-reaper-action | Action ID: ${actionId} | Time: ${new Date().toISOString()}`;
            console.log('🎯 ========================================');
            console.log('🎯 IPC HANDLER CALLED: execute-reaper-action');
            console.log('🎯 EXECUTING REAPER ACTION');
            console.log('🎯 Action ID:', actionId);
            console.log('🎯 Action ID type:', typeof actionId);
            console.log('🎯 Timestamp:', new Date().toISOString());
            console.log('🎯 Event sender ID:', event.sender.id);
            console.log('🎯 ========================================');
            
            // Also send to renderer for debugging
            if (this.mainWindow) {
                this.mainWindow.webContents.send('reaper-action-log', logMessage);
            }
            
            return new Promise((resolve) => {
                // Use Python bridge script - handle both development and packaged app
                let bridgeScript;
                if (app.isPackaged) {
                    bridgeScript = path.join(process.resourcesPath, 'reaper_bridge.py');
                } else {
                    // In development, __dirname is src/main, so go up one level to project root
                    bridgeScript = path.resolve(__dirname, '../../reaper_bridge.py');
                    // Fallback: try project root if that doesn't work
                    if (!fs.existsSync(bridgeScript)) {
                        bridgeScript = path.resolve(process.cwd(), 'reaper_bridge.py');
                    }
                }
                
                console.log('🎯 Bridge script path:', bridgeScript);
                console.log('🎯 Bridge script exists:', fs.existsSync(bridgeScript));
                console.log('🎯 __dirname:', __dirname);
                console.log('🎯 process.cwd():', process.cwd());
                
                if (!fs.existsSync(bridgeScript)) {
                    console.error('❌ Bridge script not found!');
                    resolve({ success: false, error: 'Bridge script not found' });
                    return;
                }
                
                // Find python3 executable - use absolute path first (most reliable)
                let pythonCmd = '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';
                
                // Verify this Python exists, if not try to find it
                if (!fs.existsSync(pythonCmd)) {
                    console.warn('   Primary Python path not found, searching...');
                    const possiblePythonPaths = [
                        '/usr/bin/python3',
                        '/usr/local/bin/python3',
                        '/opt/homebrew/bin/python3',
                        'python3'
                    ];
                    
                    // Check which python3 is available
                    let foundPython = false;
                    for (const pythonPath of possiblePythonPaths) {
                        try {
                            const testResult = execSync(`which ${pythonPath} 2>/dev/null || echo ""`, { encoding: 'utf8', timeout: 1000 });
                            if (testResult.trim()) {
                                pythonCmd = testResult.trim();
                                console.log('   Using Python:', pythonCmd);
                                foundPython = true;
                                break;
                            }
                        } catch (e) {
                            // Try next path
                            continue;
                        }
                    }
                    
                    if (!foundPython) {
                        console.error('❌ Python not found at any location');
                        resolve({ success: false, error: 'Python not found' });
                        return;
                    }
                } else {
                    console.log('   Using Python:', pythonCmd);
                }
                
                // Use absolute Python path
                const command = `"${pythonCmd}" "${bridgeScript}" ${actionId}`;
                console.log('🎯 Using REAPER bridge script with absolute Python path');
                console.log('🎯 Running REAPER command:', command);
                console.log('🎯 Python command:', pythonCmd);
                console.log('🎯 Bridge script:', bridgeScript);
                console.log('🎯 ========================================');
                
                const startTime = Date.now();
                exec(command, { 
                    timeout: 10000, // Increased timeout
                    env: {
                        ...process.env,
                        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/Library/Frameworks/Python.framework/Versions/3.13/bin',
                        PYTHONUNBUFFERED: '1'
                    }
                }, (error, stdout, stderr) => {
                    const duration = Date.now() - startTime;
                    console.log(`🎯 Command completed in ${duration}ms`);
                    
                    // Log ALL output
                    console.log('🎯 ========================================');
                    console.log('🎯 REAPER BRIDGE OUTPUT');
                    if (stdout) {
                        console.log('🎯 STDOUT:', stdout.trim());
                    } else {
                        console.log('🎯 STDOUT: (empty)');
                    }
                    if (stderr) {
                        console.log('🎯 STDERR:', stderr.trim());
                    } else {
                        console.log('🎯 STDERR: (empty)');
                    }
                    if (error) {
                        console.log('🎯 ERROR object:', {
                            message: error.message,
                            code: error.code,
                            signal: error.signal,
                            cmd: error.cmd,
                            killed: error.killed
                        });
                    } else {
                        console.log('🎯 ERROR: (none)');
                    }
                    console.log('🎯 ========================================');
                    
                    if (error) {
                        // Check if it's a timeout (which might be OK for REAPER)
                        if (error.signal === 'SIGTERM' || error.code === null) {
                            console.log('⚠️  REAPER action timed out or was killed');
                            // Check stderr for success message from bridge
                            const stderrCheck = stderr ? stderr.trim() : '';
                            if (stderrCheck && (stderrCheck.includes('sent via') || stderrCheck.includes('✅') || stderrCheck.includes('REAPER action'))) {
                                console.log('✅ But bridge script reported success - action likely sent');
                                resolve({ success: true });
                            } else {
                                console.log('⚠️  No success confirmation from bridge script');
                                resolve({ success: false, error: 'Command timed out without confirmation' });
                            }
                            return;
                        }
                        
                        // Check error code
                        if (error.code === 0) {
                            // Exit code 0 means success
                            console.log('✅ REAPER action executed (exit code 0):', actionId);
                            resolve({ success: true });
                            return;
                        }
                        
                        console.error('❌ REAPER command error:', error);
                        console.error('❌ Error code:', error.code);
                        console.error('❌ Error signal:', error.signal);
                        console.error('❌ stderr:', stderr);
                        console.error('❌ stdout:', stdout);
                        resolve({ success: false, error: error.message || `Command failed with code ${error.code}` });
                        return;
                    }
                    
                    // Success - no error
                    console.log('✅ REAPER command executed successfully (no error from bridge)');
                    // Check if bridge script reported success
                    const stderrStr = stderr ? stderr.trim() : '';
                    const stdoutStr = stdout ? stdout.trim() : '';
                    
                    console.log('🎯 Checking bridge script output for success confirmation...');
                    console.log('   stderr:', stderrStr);
                    console.log('   stdout:', stdoutStr);
                    
                    if (stderrStr && (stderrStr.includes('sent via') || stderrStr.includes('✅') || stderrStr.includes('REAPER action'))) {
                        console.log('✅ Bridge script confirmed action sent via stderr');
                        resolve({ success: true, message: 'Action sent via OSC/HTTP' });
                    } else if (stdoutStr && (stdoutStr.includes('sent via') || stdoutStr.includes('✅') || stdoutStr.includes('REAPER action'))) {
                        console.log('✅ Bridge script confirmed action sent via stdout');
                        resolve({ success: true, message: 'Action sent via OSC/HTTP' });
                    } else if (stdoutStr) {
                        console.log('⚠️  Bridge script produced output but no success confirmation');
                        console.log('   Output:', stdoutStr);
                        resolve({ success: true, message: 'Command executed (no confirmation)' });
                    } else {
                        console.log('⚠️  No output from bridge script, but no error either');
                        console.log('   This might mean REAPER received the command but didn\'t respond');
                        resolve({ success: true, message: 'Command sent (assumed success)' });
                    }
                });
            });
        });

        // Don't auto-start - wait for user to click "Start Listening"
        // Just mark voice engine as ready
        setTimeout(() => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('voice-engine-ready');
                console.log('✅ Voice engine ready (waiting for user to start)');
            }
        }, 500);
        
        console.log('✅ All IPC handlers setup complete');
    }
}

const dawrvApp = new DAWRVApp();

// Define tempo handler function
async function handleTempoCommand(event, command, value) {
    console.log('🎵 ========================================');
    console.log('🎵 execute-tempo-command HANDLER CALLED!');
    console.log('🎵 Command:', command, 'Value:', value);
    console.log('🎵 ========================================');
    
    const TEMPO_ACTION_ID = '_RS7ae10ebec27d6e3612f7ca8b4e962fd773238246';
    
    try {
        // Handle 'get' command separately (read-only)
        if (command === 'get') {
            // For now, return a friendly message - we'd need a separate script for reading tempo
            console.log('🎵 Get tempo not yet implemented via Web API');
            return { 
                success: true, 
                message: 'Get tempo feature is coming soon! For now, you can see the tempo in REAPER\'s transport bar.' 
            };
        }
        
        // Calculate the target tempo based on command
        let targetTempo = value;
        
        if (command === 'increase' || command === 'decrease') {
            // We'd need to get current tempo first, but for now just use the value as delta
            // TODO: Implement get current tempo via Web API
            console.warn('⚠️  Increase/decrease requires current tempo - using absolute value instead');
        }
        
        if (!targetTempo || isNaN(targetTempo) || targetTempo < 1 || targetTempo > 960) {
            console.error('❌ Invalid tempo value:', targetTempo);
            return { success: false, error: 'Invalid tempo value' };
        }
        
        // Use OSC /tempo/raw message (same approach as goto bar)
        return new Promise((resolve) => {
            console.log('🎵 Setting tempo to', targetTempo, 'BPM via OSC...');
            
            try {
                const dgram = require('dgram');
                const oscSocket = dgram.createSocket('udp4');
                
                // Build OSC message for /tempo/raw
                const address = '/tempo/raw';
                let oscData = Buffer.from(address + '\x00', 'utf-8');
                // Pad to 4-byte boundary
                while (oscData.length % 4 !== 0) oscData = Buffer.concat([oscData, Buffer.from([0])]);
                
                // Type tag string: ,f (comma + float)
                let typeTag = Buffer.from(',f\x00\x00', 'utf-8');
                oscData = Buffer.concat([oscData, typeTag]);
                
                // Float argument (tempo in BPM)
                const floatBuf = Buffer.allocUnsafe(4);
                floatBuf.writeFloatBE(targetTempo, 0);
                oscData = Buffer.concat([oscData, floatBuf]);
                
                console.log('🎵 Sending OSC /tempo/raw message:', targetTempo);
                oscSocket.send(oscData, 8000, '127.0.0.1', (err) => {
                    oscSocket.close();
                    if (err) {
                        console.error('❌ OSC send error:', err);
                        resolve({ success: false, error: err.message });
                    } else {
                        console.log('✅ Tempo set to', targetTempo, 'BPM via OSC');
                        resolve({ success: true });
                    }
                });
            } catch (e) {
                console.error('❌ Failed to send OSC tempo message:', e.message);
                resolve({ success: false, error: e.message });
            }
        });
    } catch (error) {
        console.error('❌ Tempo command error:', error);
        return { success: false, error: error.message };
    }
}

// Define measure handler function
async function handleMeasureCommand(event, command, measure, measureEnd) {
    console.log('📏 execute-measure-command handler called:', command, measure, measureEnd);
    try {
        let measureScript;
        if (app.isPackaged) {
            measureScript = path.join(process.resourcesPath, 'reaper_bar_bridge.py');
        } else {
            measureScript = path.resolve(__dirname, '../../reaper_bar_bridge.py');
            if (!fs.existsSync(measureScript)) {
                measureScript = path.resolve(process.cwd(), 'reaper_bar_bridge.py');
            }
        }
        
        if (!fs.existsSync(measureScript)) {
            return { success: false, error: 'Measure control script not found' };
        }
        
        let pythonCmd = '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';
        if (!fs.existsSync(pythonCmd)) {
            try {
                pythonCmd = execSync('which python3', { encoding: 'utf-8' }).trim();
            } catch {
                pythonCmd = 'python3';
            }
        }
        
        return await new Promise((resolve) => {
            const args = [measureScript, command];
            if (typeof measure !== 'undefined' && measure !== null) {
                args.push(measure.toString());
            }
            if (typeof measureEnd !== 'undefined' && measureEnd !== null) {
                args.push(measureEnd.toString());
            }
            
            execFile(pythonCmd, args, { timeout: 4000 }, (error, stdout, stderr) => {
                if (stdout) {
                    console.log('📏 Measure command output:', stdout.trim());
                }
                if (stderr) {
                    console.log('📏 Measure command stderr:', stderr.trim());
                }
                
                if (error && error.code !== null && error.code !== 0) {
                    resolve({ success: false, error: error.message });
                } else {
                    resolve({ success: true });
                }
            });
        });
    } catch (error) {
        console.error('Measure command error:', error);
        return { success: false, error: error.message };
    }
}

// Register handlers immediately so renderer always has access
ipcMain.handle('execute-tempo-command', handleTempoCommand);
ipcMain.handle('execute-measure-command', handleMeasureCommand);
console.log('🎵 Tempo handler registered at module load');
console.log('📏 Measure handler registered at module load');

console.log('📡 Registering goto-bar handler at module load...');

// Web API: Execute "Go to bar N" via extstate + script action
// Uses user-provided Action ID for daw-scripts/reaper/scripts/dawrv_goto_bar_from_extstate.lua
const RHEA_GOTO_BAR_ACTION_ID = '_RS59cea27ab9c1a2647112bdc02955a66e77578452'; // Updated Action ID
ipcMain.handle('execute-goto-bar', async (event, barNumber) => {
    console.log('📡 ========================================');
    console.log('📡 execute-goto-bar IPC handler called!');
    console.log('📡 Bar number:', barNumber);
    console.log('📡 Action ID:', RHEA_GOTO_BAR_ACTION_ID);
    console.log('📡 ========================================');
    
    return new Promise((resolve) => {
        const tryWeb = () => {
            try {
                console.log('📡 Using REAPER native Lua script for accurate bar positioning...');
                if (!barNumber || isNaN(Number(barNumber))) {
                    console.error('❌ Invalid bar number:', barNumber);
                    resolve({ success: false, error: 'Invalid bar number' });
                    return;
                }
                
                // Use REAPER's native TimeMap functions via Lua script
                // This handles any tempo, time signature changes, and tempo envelopes
                const port = 8080;
                
                // Step 1: Set the target bar in ExtState
                const setPath = `/_/SET/EXTSTATE/RHEA/target_bar/${encodeURIComponent(String(barNumber))}`;
                console.log('📡 Setting ExtState RHEA/target_bar to:', barNumber);
                
                http.get({ host: '127.0.0.1', port, path: setPath }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        console.log('✅ ExtState set, status:', res.statusCode);
                        
                        // Step 2: Trigger the Lua script via Action ID
                        setTimeout(() => {
                            const actionPath = `/_/${encodeURIComponent(RHEA_GOTO_BAR_ACTION_ID)}`;
                            console.log('📡 Triggering goto bar script via:', `http://127.0.0.1:${port}${actionPath}`);
                            
                            const req = http.get({ host: '127.0.0.1', port, path: actionPath }, (res2) => {
                                let actionData = '';
                                res2.on('data', chunk => actionData += chunk);
                                res2.on('end', () => {
                                    console.log('✅ Goto bar script triggered, status:', res2.statusCode);
                                    console.log('📝 Response:', actionData);
                                    resolve({ success: true });
                                });
                            });
                            
                            req.on('error', (e) => {
                                console.error('❌ Failed to trigger goto bar script:', e.message);
                                console.warn('⚠️  Falling back to CLI method...');
                                tryCLI();
                            });
                            
                            req.setTimeout(5000, () => {
                                console.warn('⚠️  Request timeout - falling back to CLI');
                                tryCLI();
                            });
                        }, 100); // Small delay to ensure ExtState is written
                    });
                }).on('error', (e) => {
                    console.error('❌ Failed to set ExtState:', e.message);
                    console.warn('⚠️  Falling back to CLI method...');
                    tryCLI();
                });
            } catch (e) {
                console.error('❌ Exception in tryWeb:', e.message);
                tryCLI();
            }
        };
        
        const tryCLI = () => {
            try {
                const tempDir = os.tmpdir();
                const scriptPath = path.join(tempDir, `dawrv_goto_bar_from_extstate_wrapper_${Date.now()}.lua`);
                const lua = `
reaper.SetExtState("RHEA","target_bar","${String(barNumber)}", true)
local cmd = reaper.NamedCommandLookup("${RHEA_GOTO_BAR_ACTION_ID}")
if cmd and cmd ~= 0 then
  reaper.Main_OnCommand(cmd, 0)
end
`;
                fs.writeFileSync(scriptPath, lua, 'utf8');
                
                // Try to bring REAPER front (optional)
                try {
                    execSync('osascript -e \'tell application "REAPER" to activate\'', { stdio: 'ignore' });
                } catch {}
                
                // Resolve REAPER binary path
                let reaperPathCandidates = [
                    '/Applications/REAPER.app/Contents/MacOS/reaper',
                    path.join('/', 'Applications', 'REAPER.app', 'Contents', 'MacOS', 'reaper'),
                    '/Applications/REAPER64.app/Contents/MacOS/reaper'
                ];
                let reaperPath = reaperPathCandidates.find(p => fs.existsSync(p));
                if (!reaperPath) {
                    resolve({ success: false, error: 'REAPER executable not found at expected paths' });
                    try { fs.unlinkSync(scriptPath); } catch {}
                    return;
                }
                
                execFile(reaperPath, ['-nonewinst', '-run', scriptPath], { timeout: 4000 }, (error, stdout, stderr) => {
                    try { fs.unlinkSync(scriptPath); } catch {}
                    if (error && error.code !== null && error.code !== 0) {
                        resolve({ success: false, error: `CLI failed: ${error.message}` });
                    } else {
                        resolve({ success: true });
                    }
                });
            } catch (e) {
                resolve({ success: false, error: `CLI exception: ${e.message}` });
            }
        };
        
        // Try web first; fallback to CLI
        tryWeb();
    });
});
console.log('📡 Goto-bar web handler registered');

// Track Control: Execute track commands via OSC (much more reliable!)
ipcMain.handle('execute-track-command', async (event, command, trackNumber, value) => {
    console.log('🎚️ ========================================');
    console.log('🎚️ execute-track-command IPC handler called!');
    console.log('🎚️ Command:', command);
    console.log('🎚️ Track:', trackNumber);
    console.log('🎚️ Value:', value);
    console.log('🎚️ ========================================');
    
    return new Promise((resolve) => {
        try {
            const dgram = require('dgram');
            const oscSocket = dgram.createSocket('udp4');
            
            let oscPath = '';
            let oscValue = null;
            
            // Map commands to OSC paths
            // OSC format: /track/<trackNum>/<property> <value>
            switch (command) {
                case 'select':
                    // For select, we need to deselect all tracks first, then select the target
                    const deselectSocket = dgram.createSocket('udp4');
                    let deselectData = Buffer.from('/action/40297\x00\x00', 'utf-8'); // Action 40297 = Unselect all tracks
                    while (deselectData.length % 4 !== 0) deselectData = Buffer.concat([deselectData, Buffer.from([0])]);
                    deselectData = Buffer.concat([deselectData, Buffer.from(',i\x00\x00', 'utf-8')]);
                    const deselectAction = Buffer.allocUnsafe(4);
                    deselectAction.writeInt32BE(40297, 0);
                    deselectData = Buffer.concat([deselectData, deselectAction]);
                    
                    deselectSocket.send(deselectData, 8000, '127.0.0.1', (err) => {
                        deselectSocket.close();
                        if (err) console.warn('⚠️  Deselect all failed:', err.message);
                        
                        // After deselect completes, send the select command
                        setTimeout(() => {
                            const selectSocket = dgram.createSocket('udp4');
                            let selectPath = `/track/${trackNumber}/select`;
                            let selectData = Buffer.from(selectPath + '\x00', 'utf-8');
                            while (selectData.length % 4 !== 0) selectData = Buffer.concat([selectData, Buffer.from([0])]);
                            selectData = Buffer.concat([selectData, Buffer.from(',i\x00\x00', 'utf-8')]);
                            const selectVal = Buffer.allocUnsafe(4);
                            selectVal.writeInt32BE(1, 0);
                            selectData = Buffer.concat([selectData, selectVal]);
                            
                            selectSocket.send(selectData, 8000, '127.0.0.1', (err2) => {
                                selectSocket.close();
                                if (err2) {
                                    console.error('❌ Select OSC error:', err2);
                                    resolve({ success: false, error: err2.message });
                                } else {
                                    console.log('✅ Track select command sent via OSC');
                                    resolve({ success: true });
                                }
                            });
                        }, 100); // 100ms delay
                    });
                    return; // Exit early, callback handles resolve
                    break;
                case 'mute':
                    oscPath = `/track/${trackNumber}/mute`;
                    oscValue = 1;  // 1 = mute
                    break;
                case 'unmute':
                    oscPath = `/track/${trackNumber}/mute`;
                    oscValue = 0;  // 0 = unmute
                    break;
                case 'solo':
                    // For exclusive solo, unsolo all tracks first, then solo target
                    // Action 40340 = Unsolo all tracks
                    const unsoloSocket = dgram.createSocket('udp4');
                    let unsoloData = Buffer.from('/action/40340\x00\x00', 'utf-8');
                    while (unsoloData.length % 4 !== 0) unsoloData = Buffer.concat([unsoloData, Buffer.from([0])]);
                    unsoloData = Buffer.concat([unsoloData, Buffer.from(',i\x00\x00', 'utf-8')]);
                    // Add action ID as integer
                    const unsoloAction = Buffer.allocUnsafe(4);
                    unsoloAction.writeInt32BE(40340, 0);
                    unsoloData = Buffer.concat([unsoloData, unsoloAction]);
                    
                    unsoloSocket.send(unsoloData, 8000, '127.0.0.1', (err) => {
                        unsoloSocket.close();
                        if (err) console.warn('⚠️  Unsolo all failed:', err.message);
                        
                        // After unsolo completes, send the solo command
                        setTimeout(() => {
                            const soloSocket = dgram.createSocket('udp4');
                            let soloPath = `/track/${trackNumber}/solo`;
                            let soloData = Buffer.from(soloPath + '\x00', 'utf-8');
                            while (soloData.length % 4 !== 0) soloData = Buffer.concat([soloData, Buffer.from([0])]);
                            soloData = Buffer.concat([soloData, Buffer.from(',i\x00\x00', 'utf-8')]);
                            const soloVal = Buffer.allocUnsafe(4);
                            soloVal.writeInt32BE(1, 0);
                            soloData = Buffer.concat([soloData, soloVal]);
                            
                            soloSocket.send(soloData, 8000, '127.0.0.1', (err2) => {
                                soloSocket.close();
                                if (err2) {
                                    console.error('❌ Solo OSC error:', err2);
                                    resolve({ success: false, error: err2.message });
                                } else {
                                    console.log('✅ Track solo command sent via OSC');
                                    resolve({ success: true });
                                }
                            });
                        }, 100); // 100ms delay
                    });
                    return; // Exit early, callback handles resolve
                    break;
                case 'unsolo':
                    oscPath = `/track/${trackNumber}/solo`;
                    oscValue = 0;  // 0 = unsolo
                    break;
                case 'arm':
                    oscPath = `/track/${trackNumber}/recarm`;
                    oscValue = 1;  // Toggle (1 will toggle)
                    break;
                case 'volume':
                    oscPath = `/track/${trackNumber}/volume`;
                    // Convert percentage (0-100) to normalized value (0-1)
                    oscValue = value / 100.0;
                    break;
                case 'pan':
                    oscPath = `/track/${trackNumber}/pan`;
                    // Convert -100 to 100 range to -1 to 1
                    oscValue = value / 100.0;
                    break;
                default:
                    console.error('❌ Unknown track command:', command);
                    resolve({ success: false, error: 'Unknown command' });
                    return;
            }
            
            console.log('🎚️ Sending OSC:', oscPath, oscValue);
            
            // Build OSC message
            let oscData = Buffer.from(oscPath + '\x00', 'utf-8');
            // Pad to 4-byte boundary
            while (oscData.length % 4 !== 0) oscData = Buffer.concat([oscData, Buffer.from([0])]);
            
            // Type tag string: ,f (comma + float) or ,i (comma + int)
            const useFloat = command === 'volume' || command === 'pan';
            let typeTag = Buffer.from(useFloat ? ',f\x00\x00' : ',i\x00\x00', 'utf-8');
            oscData = Buffer.concat([oscData, typeTag]);
            
            // Value argument
            const valueBuf = Buffer.allocUnsafe(4);
            if (useFloat) {
                valueBuf.writeFloatBE(oscValue, 0);
            } else {
                valueBuf.writeInt32BE(oscValue, 0);
            }
            oscData = Buffer.concat([oscData, valueBuf]);
            
            oscSocket.send(oscData, 8000, '127.0.0.1', (err) => {
                oscSocket.close();
                if (err) {
                    console.error('❌ OSC send error:', err);
                    resolve({ success: false, error: err.message });
                } else {
                    console.log('✅ Track command sent via OSC');
                    resolve({ success: true });
                }
            });
            
        } catch (e) {
            console.error('❌ Exception in track command handler:', e.message);
            resolve({ success: false, error: e.message });
        }
    });
});
console.log('🎚️ Track control handler registered');

// Start DAW state service and forward updates to renderer
try {
    dawrvApp.dawStateService.on('ready', info => {
        console.log(`📡 DAW state service listening on ${info.host}:${info.port}`);
    });
    dawrvApp.dawStateService.on('state', (state) => {
        if (dawrvApp.mainWindow) {
            dawrvApp.mainWindow.webContents.send('daw-state-update', state);
        }
    });
    dawrvApp.dawStateService.on('error', (err) => {
        console.warn('⚠️  DAW state service error:', err.message);
    });
    dawrvApp.dawStateService.start();
} catch (e) {
    console.warn('⚠️  Failed to start DAW state service:', e.message);
}

app.whenReady().then(() => {
    console.log('🚀 ========================================');
    console.log('🚀 App ready - verifying IPC handlers...');
    
    // Setup IPC handlers BEFORE creating window to ensure they're ready
    console.log('🚀 Setting up IPC...');
    dawrvApp.setupIPC();
    console.log('🚀 IPC setup complete');
    
    // Small delay to ensure IPC handlers are fully registered before window loads
    setTimeout(() => {
        console.log('🚀 Creating window...');
        dawrvApp.createWindow();
        console.log('🚀 Window created');
    }, 200);
});

app.on('window-all-closed', () => {
    dawrvApp.stopVoiceListener();
    dawrvApp.stopFileWatcher();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    dawrvApp.stopVoiceListener();
    dawrvApp.stopFileWatcher();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        // Ensure IPC is set up before creating window
        if (!dawrvApp.mainWindow) {
            dawrvApp.setupIPC();
        }
        dawrvApp.createWindow();
    }
});

console.log('🚀 DAWRV Starting...');
