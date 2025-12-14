/**
 * Screen Awareness System
 * 
 * Enables RHEA to "see" what the user is pointing at in REAPER
 * - Tracks global mouse position
 * - Queries macOS Accessibility API for UI elements under cursor
 * - Identifies REAPER controls (faders, buttons, knobs, etc.)
 * - Provides context for voice commands ("this", "that", "here")
 */

const { screen, systemPreferences } = require('electron');
const { exec, execSync, spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');

class ScreenAwarenessSystem extends EventEmitter {
    constructor() {
        super();
        this.isEnabled = false;
        this.isTracking = false;
        this.currentElement = null;
        this.activeControl = null; // The control user clicked on
        this.hoverDelay = 500; // ms to wait before announcing
        this.lastAnnouncedElement = null;
        this.trackerProcess = null; // Python tracker process
        
        console.log('🖱️  Screen Awareness System initialized');
    }
    
    /**
     * Request macOS Accessibility permissions
     */
    async requestAccessibilityPermission() {
        if (process.platform !== 'darwin') {
            console.log('⚠️  Accessibility API only available on macOS');
            return false;
        }
        
        try {
            // Check if we already have permission
            const hasPermission = systemPreferences.isTrustedAccessibilityClient(false);
            
            if (hasPermission) {
                console.log('✅ Accessibility permission already granted');
                return true;
            }
            
            console.log('🔐 Requesting Accessibility permission...');
            console.log('   User must grant permission in System Settings → Privacy & Security → Accessibility');
            
            // Prompt for permission (opens System Settings)
            systemPreferences.isTrustedAccessibilityClient(true);
            
            // Give user instructions
            this.emit('permission-required', {
                title: 'Accessibility Permission Required',
                message: 'DAWRV needs Accessibility permission to enable Screen Awareness.\n\n' +
                        'Please:\n' +
                        '1. Open System Settings → Privacy & Security → Accessibility\n' +
                        '2. Enable DAWRV/Electron\n' +
                        '3. Restart DAWRV'
            });
            
            return false;
        } catch (error) {
            console.error('❌ Error requesting accessibility permission:', error);
            return false;
        }
    }
    
    /**
     * Check if we have accessibility permission
     */
    hasAccessibilityPermission() {
        if (process.platform !== 'darwin') {
            return false;
        }
        return systemPreferences.isTrustedAccessibilityClient(false);
    }
    
    /**
     * Wrapper for IPC - check permission
     */
    async checkPermission() {
        return this.hasAccessibilityPermission();
    }
    
    /**
     * Wrapper for IPC - request permission
     */
    async requestPermission() {
        return await this.requestAccessibilityPermission();
    }
    
    /**
     * Wrapper for IPC - set enabled (not used, but needed for API compatibility)
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    
    /**
     * Wrapper for IPC - set hover delay
     */
    setHoverDelay(delayMs) {
        this.hoverDelay = delayMs;
        console.log('🖱️  Hover delay set to:', delayMs, 'ms');
    }
    
    /**
     * Start tracking mouse and UI elements
     */
    async start(options = {}) {
        if (this.isTracking) {
            console.log('⚠️  Screen awareness already tracking');
            return;
        }
        
        // Check for accessibility permission
        const hasPermission = this.hasAccessibilityPermission();
        
        if (!hasPermission) {
            console.log('⚠️  No accessibility permission - requesting...');
            await this.requestAccessibilityPermission();
            return;
        }
        
        this.isEnabled = true;
        this.isTracking = true;
        this.hoverDelay = options.hoverDelay || 500;
        
        console.log('🖱️  Screen awareness started (hover delay:', this.hoverDelay, 'ms)');
        
        // Start Python tracker process
        this.startPythonTracker();
        
        this.emit('started');
    }
    
    /**
     * Stop tracking
     */
    stop() {
        if (!this.isTracking) {
            return;
        }
        
        this.isTracking = false;
        this.isEnabled = false;
        
        // Stop Python tracker process
        if (this.trackerProcess) {
            try {
                this.trackerProcess.kill();
                this.trackerProcess = null;
            } catch (error) {
                console.error('Error stopping tracker process:', error);
            }
        }
        
        console.log('🖱️  Screen awareness tracking stopped');
        this.emit('stopped');
    }
    
    /**
     * Start Python tracker process
     */
    startPythonTracker() {
        try {
            const scriptPath = path.join(__dirname, '..', '..', 'screen_awareness_tracker_smart.py');
            
            console.log('🐍 Starting Python tracker:', scriptPath);
            
            // Spawn Python process
            this.trackerProcess = spawn('python3', [scriptPath, this.hoverDelay.toString()], {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            // Handle stdout (JSON events from Python)
            this.trackerProcess.stdout.on('data', (data) => {
                try {
                    const lines = data.toString().trim().split('\n');
                    for (const line of lines) {
                        if (!line) continue;
                        const event = JSON.parse(line);
                        this.handleTrackerEvent(event);
                    }
                } catch (error) {
                    console.error('Error parsing tracker output:', error);
                }
            });
            
            // Handle stderr
            this.trackerProcess.stderr.on('data', (data) => {
                console.error('🐍 Tracker error:', data.toString());
            });
            
            // Handle process exit
            this.trackerProcess.on('exit', (code) => {
                console.log('🐍 Tracker process exited with code:', code);
                this.trackerProcess = null;
                if (this.isTracking) {
                    // Unexpected exit - restart
                    console.log('🔄 Restarting tracker...');
                    setTimeout(() => this.startPythonTracker(), 1000);
                }
            });
            
            console.log('✅ Python tracker started');
            
        } catch (error) {
            console.error('❌ Error starting Python tracker:', error);
        }
    }
    
    /**
     * Handle event from Python tracker
     */
    handleTrackerEvent(event) {
        if (event.event === 'element-detected') {
            this.handleElementDetected(event.element);
        } else if (event.event === 'info') {
            console.log('🐍', event.message);
        } else if (event.event === 'error') {
            console.error('🐍 Error:', event.message);
        }
    }
    
    /**
     * Handle element detection from Python tracker
     */
    handleElementDetected(element) {
        console.log('🎯 Element detected:', element.role, element.title || '(no title)');
        
        // Only announce if different from last element
        if (this.shouldAnnounce(element)) {
            console.log('🔊 Announcing element');
            this.currentElement = element;
            this.lastAnnouncedElement = element;
            this.emit('element-detected', element);
        }
    }
    
    /**
     * Parse accessibility element data
     */
    parseAccessibilityElement(data, position) {
        try {
            // Parse the pipe-delimited format: App|Role|Title|Value|Description
            const parts = data.trim().split('|');
            
            if (parts.length < 2) {
                return;
            }
            
            const [app, role, title = '', value = '', description = ''] = parts;
            
            const element = {
                position: position,
                rawData: data,
                type: this.mapRoleToType(role),
                role: role,
                title: title || null,
                value: value || null,
                description: description || null
            };
            
            // Only announce if it's different from last announced element
            if (this.shouldAnnounce(element)) {
                console.log('🔊 Announcing:', element.type, element.title || element.role);
                this.currentElement = element;
                this.lastAnnouncedElement = element;
                this.emit('element-detected', element);
            }
        } catch (error) {
            console.error('❌ Error parsing accessibility element:', error);
        }
    }
    
    /**
     * Map AX role to simplified type
     */
    mapRoleToType(role) {
        if (!role) return 'unknown';
        
        const roleLower = role.toLowerCase();
        
        if (roleLower.includes('slider')) return 'slider';
        if (roleLower.includes('button')) return 'button';
        if (roleLower.includes('checkbox')) return 'checkbox';
        if (roleLower.includes('menu')) return 'menu';
        if (roleLower.includes('text')) return 'text-field';
        if (roleLower.includes('valueindicator')) return 'slider';
        
        return role; // Return as-is if no match
    }
    
    /**
     * Identify what type of REAPER control this is
     */
    identifyElementType(element) {
        if (!element.role) return 'unknown';
        
        const role = element.role.toLowerCase();
        const title = (element.title || '').toLowerCase();
        const desc = (element.description || '').toLowerCase();
        
        // Identify by role
        if (role.includes('slider') || role.includes('valueindicator')) {
            // Check if it's a fader, pan, or other slider
            if (title.includes('volume') || title.includes('fader')) {
                return 'volume-fader';
            } else if (title.includes('pan')) {
                return 'pan-control';
            } else {
                return 'slider';
            }
        } else if (role.includes('button')) {
            // Check if it's mute, solo, arm, etc.
            if (title.includes('mute') || desc.includes('mute')) {
                return 'mute-button';
            } else if (title.includes('solo') || desc.includes('solo')) {
                return 'solo-button';
            } else if (title.includes('arm') || title.includes('record') || desc.includes('arm')) {
                return 'arm-button';
            } else if (title.includes('fx') || title.includes('effect')) {
                return 'fx-button';
            } else {
                return 'button';
            }
        } else if (role.includes('checkbox')) {
            return 'checkbox';
        } else if (role.includes('menu')) {
            return 'menu';
        } else if (role.includes('text')) {
            return 'text-field';
        }
        
        return 'unknown';
    }
    
    /**
     * Check if we should announce this element
     */
    shouldAnnounce(element) {
        if (!element || element.type === 'unknown') {
            return false;
        }
        
        // Don't re-announce the same element
        if (this.lastAnnouncedElement) {
            const same = 
                this.lastAnnouncedElement.type === element.type &&
                this.lastAnnouncedElement.title === element.title &&
                Math.abs(this.lastAnnouncedElement.position.x - element.position.x) < 5 &&
                Math.abs(this.lastAnnouncedElement.position.y - element.position.y) < 5;
            
            if (same) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Set the active control (user clicked on this)
     */
    setActiveControl(element) {
        this.activeControl = element;
        this.emit('control-activated', element);
        console.log('🎯 Active control set:', element.type, element.title || '(no title)');
    }
    
    /**
     * Get the current active control
     */
    getActiveControl() {
        return this.activeControl;
    }
    
    /**
     * Clear active control
     */
    clearActiveControl() {
        this.activeControl = null;
        this.emit('control-deactivated');
    }
    
    /**
     * Get current element under cursor
     */
    getCurrentElement() {
        return this.currentElement;
    }
    
    /**
     * Enable/disable auto-announce
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log('🖱️  Auto-announce:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Set hover delay
     */
    setHoverDelay(delayMs) {
        this.hoverDelay = delayMs;
        console.log('🖱️  Hover delay set to:', delayMs, 'ms');
    }
}

module.exports = ScreenAwarenessSystem;

