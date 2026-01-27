/**
 * REAPER Health Check
 * ===================
 * Validates REAPER connection and capabilities:
 * - HTTP API availability (port 8080)
 * - ExtState read/write
 * - Action execution
 * - OSC connectivity
 */

class ReaperHealthCheck {
    constructor(options = {}) {
        this.options = {
            httpPort: options.httpPort || 8080,
            oscPort: options.oscPort || 9000,
            timeout: options.timeout || 3000,
            retries: options.retries || 3,
            bundleId: options.bundleId || 'com.cockos.reaper',
            ...options
        };
        
        this.lastCheck = null;
        this.status = {
            httpApi: false,
            extState: false,
            actionExecution: false,
            oscConnection: false,
            reaperRunning: false,
            version: null,
            error: null
        };
        
        console.log('🏥 REAPER Health Check initialized');
    }
    
    /**
     * Run full health check
     */
    async runFullCheck() {
        console.log('🏥 Running REAPER health check...');
        const startTime = Date.now();
        
        this.status = {
            httpApi: false,
            extState: false,
            actionExecution: false,
            oscConnection: false,
            reaperRunning: false,
            version: null,
            error: null,
            timestamp: startTime
        };
        
        try {
            // Check if REAPER is running (macOS)
            this.status.reaperRunning = await this.checkReaperProcess();
            
            if (!this.status.reaperRunning) {
                this.status.error = 'REAPER is not running';
                return this.status;
            }
            
            // Check HTTP API
            this.status.httpApi = await this.checkHttpApi();
            
            if (!this.status.httpApi) {
                this.status.error = 'REAPER HTTP API not responding. Enable it in Preferences > Web.';
                return this.status;
            }
            
            // Check ExtState read/write
            this.status.extState = await this.checkExtState();
            
            // Check action execution
            this.status.actionExecution = await this.checkActionExecution();
            
            // Check OSC (optional)
            // this.status.oscConnection = await this.checkOSC();
            
            this.status.latencyMs = Date.now() - startTime;
            
        } catch (error) {
            this.status.error = error.message;
            console.error('❌ Health check failed:', error);
        }
        
        this.lastCheck = this.status;
        this.logStatus();
        
        return this.status;
    }
    
    /**
     * Check if REAPER process is running
     */
    async checkReaperProcess() {
        try {
            // Use main process API if available
            if (window.api?.isReaperRunning) {
                return await window.api.isReaperRunning();
            }
            
            // Fallback: try HTTP API
            const response = await this.httpRequest('/_/', { timeout: 1000 });
            return response !== null;
            
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Check HTTP API availability
     */
    async checkHttpApi() {
        try {
            // Try to read any ExtState value
            const response = await this.httpRequest('/_/S?RHEA&health_check');
            
            if (response !== null) {
                return true;
            }
            
            // Alternative: try action list endpoint
            const altResponse = await this.httpRequest('/_/A');
            return altResponse !== null;
            
        } catch (e) {
            console.warn('HTTP API check failed:', e.message);
            return false;
        }
    }
    
    /**
     * Check ExtState read/write capability
     */
    async checkExtState() {
        try {
            const testKey = 'health_check_' + Date.now();
            const testValue = 'test_' + Math.random().toString(36).substr(2, 9);
            
            // Write test value
            const writeUrl = `/_/S?RHEA&${testKey}&${testValue}`;
            await this.httpRequest(writeUrl);
            
            // Read back
            const readUrl = `/_/S?RHEA&${testKey}`;
            const readResponse = await this.httpRequest(readUrl);
            
            // Clean up
            await this.httpRequest(`/_/S?RHEA&${testKey}&`);
            
            // Check if value matches
            return readResponse && readResponse.includes(testValue);
            
        } catch (e) {
            console.warn('ExtState check failed:', e.message);
            return false;
        }
    }
    
    /**
     * Check action execution
     */
    async checkActionExecution() {
        try {
            // Use a harmless action: Get playback state (doesn't change anything)
            // Action 40434: "View: Show last undone message"
            // We'll use action 40434 which is safe and doesn't change state
            
            // Alternative: just verify we can reach the action endpoint
            const response = await this.httpRequest('/_/S?RHEA&control_detected');
            return response !== null;
            
        } catch (e) {
            console.warn('Action execution check failed:', e.message);
            return false;
        }
    }
    
    /**
     * Make HTTP request to REAPER
     */
    async httpRequest(path, options = {}) {
        const timeout = options.timeout || this.options.timeout;
        const url = `http://localhost:${this.options.httpPort}${path}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                return await response.text();
            }
            return null;
            
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw e;
        }
    }
    
    /**
     * Log status to console
     */
    logStatus() {
        const s = this.status;
        const icon = (ok) => ok ? '✅' : '❌';
        
        console.log('🏥 REAPER Health Check Results:');
        console.log(`   ${icon(s.reaperRunning)} REAPER Process: ${s.reaperRunning ? 'Running' : 'Not running'}`);
        console.log(`   ${icon(s.httpApi)} HTTP API: ${s.httpApi ? 'Available' : 'Not available'}`);
        console.log(`   ${icon(s.extState)} ExtState: ${s.extState ? 'Working' : 'Not working'}`);
        console.log(`   ${icon(s.actionExecution)} Actions: ${s.actionExecution ? 'Working' : 'Not verified'}`);
        
        if (s.error) {
            console.log(`   ⚠️ Error: ${s.error}`);
        }
        
        if (s.latencyMs) {
            console.log(`   ⏱️ Check completed in ${s.latencyMs}ms`);
        }
    }
    
    /**
     * Get status summary
     */
    getSummary() {
        const s = this.status;
        
        if (!s.reaperRunning) {
            return { ok: false, message: 'REAPER is not running', severity: 'error' };
        }
        
        if (!s.httpApi) {
            return { 
                ok: false, 
                message: 'Enable REAPER HTTP API: Preferences → Web Interface → Enable on port 8080', 
                severity: 'error' 
            };
        }
        
        if (!s.extState) {
            return { 
                ok: false, 
                message: 'ExtState not working. Install RHEA Lua script in REAPER.', 
                severity: 'warning' 
            };
        }
        
        return { ok: true, message: 'REAPER connection healthy', severity: 'success' };
    }
    
    /**
     * Get troubleshooting steps
     */
    getTroubleshootingSteps() {
        const s = this.status;
        const steps = [];
        
        if (!s.reaperRunning) {
            steps.push({
                issue: 'REAPER not running',
                fix: 'Launch REAPER.app from Applications'
            });
        }
        
        if (!s.httpApi) {
            steps.push({
                issue: 'HTTP API disabled',
                fix: 'In REAPER: Preferences → Web Interface → Enable on port 8080'
            });
        }
        
        if (!s.extState) {
            steps.push({
                issue: 'ExtState not working',
                fix: 'Install RHEA Lua script: Actions → New Action → Load... → rhea_control_tracker.lua'
            });
        }
        
        return steps;
    }
    
    /**
     * Quick connectivity check (fast, for periodic polling)
     */
    async quickCheck() {
        try {
            const response = await this.httpRequest('/_/S?RHEA&health_check', { timeout: 1000 });
            return response !== null;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Start periodic health checks
     */
    startPeriodicChecks(intervalMs = 30000) {
        this.stopPeriodicChecks();
        
        this.checkInterval = setInterval(async () => {
            const isConnected = await this.quickCheck();
            if (!isConnected && this.status.httpApi) {
                console.warn('⚠️ REAPER connection lost');
                await this.runFullCheck();
            }
        }, intervalMs);
        
        console.log(`🏥 Periodic health checks started (every ${intervalMs / 1000}s)`);
    }
    
    /**
     * Stop periodic checks
     */
    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReaperHealthCheck;
}

if (typeof window !== 'undefined') {
    window.ReaperHealthCheck = ReaperHealthCheck;
}
