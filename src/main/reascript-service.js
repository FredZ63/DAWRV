/**
 * ReaScript Service
 * 
 * Polls REAPER for last touched control information using ReaScript
 */

const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

class ReaScriptService extends EventEmitter {
    constructor() {
        super();
        this.isPolling = false;
        this.pollInterval = null;
        this.pollRate = 200; // Poll every 200ms
        this.lastControl = null;
        this.lastValue = undefined; // Track last value for value change detection
        this.hasLogged = false; // For debug logging
        this.reaperPath = '/Applications/REAPER.app/Contents/MacOS/REAPER'; // Default macOS path
    }
    
    /**
     * Start polling for last touched control
     */
    start() {
        if (this.isPolling) {
            console.log('⚠️  ReaScript polling already active');
            return;
        }
        
        console.log('🎛️  Starting ReaScript polling...');
        this.isPolling = true;
        
        // Poll immediately, then at intervals
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), this.pollRate);
    }
    
    /**
     * Stop polling
     */
    stop() {
        if (!this.isPolling) return;
        
        console.log('🛑 Stopping ReaScript polling');
        this.isPolling = false;
        
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    /**
     * Poll REAPER for last touched control (via ExtState from Lua script)
     */
    async poll() {
        if (!this.isPolling) return;
        
        try {
            // Read ExtState values from REAPER (set by Lua script)
            const result = await this.readExtState();
            
            // DEBUG: Log EVERY poll result for transport debugging
            if (result && result.context === 'transport') {
                console.log('🎹 TRANSPORT detected in poll:', result);
            }
            
            if (result && result.success) {
                // Check if control changed OR value changed
                const controlId = `${result.track_number}-${result.control_type}`;
                const currentValue = result.value;
                
                const controlChanged = controlId !== this.lastControl;
                
                // Value changed = same control, but value moved by more than 0.001
                const valueChanged = !controlChanged && 
                                    this.lastValue !== undefined && 
                                    currentValue !== undefined && 
                                    Math.abs(currentValue - this.lastValue) > 0.001;
                
                if (controlChanged || valueChanged) {
                    // Emit control change event (for both new controls AND value changes)
                    this.emit('control-touched', result);
                    
                    if (controlChanged) {
                        console.log('🎛️  Control touched:', {
                            track: result.track_name,
                            type: result.control_type,
                            value: result.value_formatted
                        });
                        // Reset value tracking when control changes
                        this.lastValue = currentValue;
                    } else if (valueChanged) {
                        console.log('🎚️  Value changed:', {
                            track: result.track_name,
                            type: result.control_type,
                            value: result.value_formatted,
                            delta: (currentValue - this.lastValue).toFixed(3)
                        });
                        this.lastValue = currentValue;
                    }
                    
                    // Update control tracking
                    this.lastControl = controlId;
                }
            }
            
            // Check for click events (for learning!)
            const clickResult = await this.readClickExtState();
            if (clickResult && clickResult.clicked) {
                this.emit('control-clicked', clickResult);
                console.log('🖱️  Control CLICKED:', {
                    track: clickResult.track_name,
                    type: clickResult.control_type
                });
            }
            
        } catch (error) {
            // Log errors for debugging
            console.error('⚠️  ReaScript poll error:', error.message);
        }
    }
    
    /**
     * Read control data from REAPER ExtState
     */
    async readExtState() {
        try {
            const http = require('http');
            const port = 8080; // REAPER's HTTP API port
            
            // Read all ExtState values via HTTP API
            const detected = await this.getExtState('RHEA', 'control_detected');
            
            // DEBUG: First poll
            if (!this.hasLogged) {
                console.log('🔍 First ExtState read - control_detected:', detected);
                this.hasLogged = true;
            }
            
            if (detected !== 'true') return null;
            
            const valueStr = await this.getExtState('RHEA', 'value');
            const context = await this.getExtState('RHEA', 'control_context');
            const controlType = await this.getExtState('RHEA', 'control_type');
            
            // DEBUG: Log when we read transport data
            if (context === 'transport' || controlType?.includes('button')) {
                console.log('📍 ExtState read transport:', { context, controlType });
            }
            
            const result = {
                success: true,
                control_type: controlType,
                context: context,
                track_number: parseInt(await this.getExtState('RHEA', 'track_number') || '0'),
                track_name: await this.getExtState('RHEA', 'track_name'),
                track_guid: await this.getExtState('RHEA', 'track_guid'),
                parameter: await this.getExtState('RHEA', 'parameter'),
                value: valueStr ? parseFloat(valueStr) : undefined, // Raw numeric value for change detection
                value_formatted: await this.getExtState('RHEA', 'value_formatted'),
                timestamp: await this.getExtState('RHEA', 'timestamp')
            };
            
            return result;
        } catch (error) {
            console.error('❌ readExtState error:', error.message);
            return null;
        }
    }
    
    /**
     * Read click event from REAPER ExtState
     */
    async readClickExtState() {
        try {
            const clicked = await this.getExtState('RHEA', 'control_clicked');
            if (clicked !== 'true') return null;
            
            const result = {
                clicked: true,
                control_type: await this.getExtState('RHEA', 'clicked_type'),
                track_number: parseInt(await this.getExtState('RHEA', 'clicked_track') || '0'),
                track_guid: await this.getExtState('RHEA', 'clicked_guid'),
                track_name: `Track ${await this.getExtState('RHEA', 'clicked_track')}`,
                timestamp: await this.getExtState('RHEA', 'click_timestamp')
            };
            
            // Clear the click flag so we don't process it again
            await this.setExtState('RHEA', 'control_clicked', 'false');
            
            return result;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get ExtState value from REAPER by reading the .ini file directly
     * (HTTP API doesn't work reliably for ExtState)
     */
    getExtState(section, key) {
        try {
            const fs = require('fs');
            const os = require('os');
            const path = require('path');
            
            // Path to REAPER's ExtState file
            const extStateFile = path.join(
                os.homedir(),
                'Library/Application Support/REAPER/reaper-extstate.ini'
            );
            
            if (!fs.existsSync(extStateFile)) {
                return Promise.resolve('');
            }
            
            const content = fs.readFileSync(extStateFile, 'utf8');
            const lines = content.split('\n');
            
            let inSection = false;
            for (let line of lines) {
                line = line.trim();
                
                // Check if we're in the right section
                if (line === `[${section}]`) {
                    inSection = true;
                    continue;
                }
                
                // If we hit another section, stop
                if (line.startsWith('[') && line.endsWith(']')) {
                    inSection = false;
                    continue;
                }
                
                // If we're in the right section, look for the key
                if (inSection && line.startsWith(`${key}=`)) {
                    const value = line.substring(key.length + 1);
                    return Promise.resolve(value);
                }
            }
            
            return Promise.resolve('');
        } catch (error) {
            return Promise.resolve('');
        }
    }
    
    /**
     * Set ExtState value in REAPER via HTTP API
     */
    setExtState(section, key, value) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            // Try localhost first, then network IP
            const hosts = ['127.0.0.1', '192.168.1.78'];
            const options = {
                hostname: hosts[0], // Will try localhost first
                port: 8080,
                path: `/_/EXTSTATE/${section}/${key}/${encodeURIComponent(value)}`,
                method: 'GET',
                timeout: 500
            };
            
            const req = http.request(options, (res) => {
                res.on('data', () => {});
                res.on('end', () => resolve());
            });
            
            req.on('error', () => resolve());
            req.on('timeout', () => {
                req.destroy();
                resolve();
            });
            
            req.end();
        });
    }
    
    /**
     * Execute a ReaScript via REAPER's HTTP interface
     */
    executeReaScript(scriptPath) {
        return new Promise((resolve, reject) => {
            const axios = require('axios');
            
            // Use REAPER's HTTP interface to execute the action
            // The script needs to be loaded in REAPER first and we need its action ID
            // For now, we'll use a simpler approach: call via reaper_bridge.py
            
            const { spawn } = require('child_process');
            const bridgePath = path.join(__dirname, '..', '..', 'reaper_bridge.py');
            
            // Execute via reaper_bridge with custom script execution
            const process = spawn('python3', [
                bridgePath,
                'execute_script',
                scriptPath
            ], {
                timeout: 1000
            });
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(stderr || 'Script execution failed'));
                    return;
                }
                
                try {
                    // Try to parse JSON from output
                    const lines = stdout.split('\n');
                    for (const line of lines) {
                        if (line.trim().startsWith('{')) {
                            const result = JSON.parse(line);
                            resolve(result);
                            return;
                        }
                    }
                    reject(new Error('No JSON output found'));
                } catch (parseError) {
                    reject(parseError);
                }
            });
            
            process.on('error', (error) => {
                reject(error);
            });
        });
    }
    
    /**
     * Set polling rate (ms)
     */
    setPollRate(ms) {
        this.pollRate = Math.max(100, Math.min(1000, ms)); // Clamp between 100-1000ms
        
        if (this.isPolling) {
            // Restart with new rate
            this.stop();
            this.start();
        }
    }
}

module.exports = ReaScriptService;

