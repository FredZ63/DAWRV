/**
 * Context Manager
 * 
 * Manages contextual state for voice commands
 * - Tracks what control the user is interacting with
 * - Provides context for "this", "that", "here" commands
 * - Integrates with REAPER state to get real-time values
 */

const EventEmitter = require('events');

class ContextManager extends EventEmitter {
    constructor() {
        super();
        
        // Active context (what user clicked/hovered)
        this.activeControl = null;
        this.activeTrack = null;
        this.activeFX = null;
        
        // History of recent contexts (for "that", "previous", etc.)
        this.contextHistory = [];
        this.maxHistorySize = 10;
        
        // REAPER state integration
        this.reaperState = {
            tracks: {},
            selectedTracks: [],
            masterTrack: {},
            transport: {},
            mixer: {}
        };
        
        console.log('🎯 Context Manager initialized');
    }
    
    /**
     * Set active control from screen awareness
     */
    setActiveControl(element) {
        if (!element) {
            this.clearActiveControl();
            return;
        }
        
        // Add previous control to history
        if (this.activeControl) {
            this.addToHistory(this.activeControl);
        }
        
        this.activeControl = {
            type: element.type,
            role: element.role,
            title: element.title,
            value: element.value,
            description: element.description,
            position: element.position,
            timestamp: Date.now()
        };
        
        // Try to extract track number from title
        this.activeTrack = this.extractTrackNumber(element);
        
        console.log('🎯 Active control updated:', this.activeControl.type);
        if (this.activeTrack) {
            console.log('   Track:', this.activeTrack);
        }
        
        this.emit('context-changed', {
            control: this.activeControl,
            track: this.activeTrack
        });
    }
    
    /**
     * Extract track number from element title/description
     */
    extractTrackNumber(element) {
        if (!element) return null;
        
        const text = `${element.title || ''} ${element.description || ''}`;
        
        // Try to find "Track N" pattern
        const trackMatch = text.match(/track\s+(\d+)/i);
        if (trackMatch) {
            return parseInt(trackMatch[1], 10);
        }
        
        // Try to find just a number if it's a track control
        if (element.type && (
            element.type.includes('volume') || 
            element.type.includes('pan') || 
            element.type.includes('mute') || 
            element.type.includes('solo') || 
            element.type.includes('arm')
        )) {
            const numMatch = text.match(/(\d+)/);
            if (numMatch) {
                return parseInt(numMatch[1], 10);
            }
        }
        
        return null;
    }
    
    /**
     * Clear active control
     */
    clearActiveControl() {
        if (this.activeControl) {
            this.addToHistory(this.activeControl);
        }
        this.activeControl = null;
        this.activeTrack = null;
        this.emit('context-cleared');
    }
    
    /**
     * Add control to history
     */
    addToHistory(control) {
        if (!control) return;
        
        this.contextHistory.unshift({
            ...control,
            endTimestamp: Date.now()
        });
        
        // Limit history size
        if (this.contextHistory.length > this.maxHistorySize) {
            this.contextHistory = this.contextHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * Get active control
     */
    getActiveControl() {
        return this.activeControl;
    }
    
    /**
     * Get active track
     */
    getActiveTrack() {
        return this.activeTrack;
    }
    
    /**
     * Get context from voice command keywords
     * Resolves "this", "that", "here", "current", etc.
     */
    resolveContextKeyword(keyword) {
        const kw = keyword.toLowerCase();
        
        if (kw === 'this' || kw === 'here' || kw === 'current') {
            return this.activeControl;
        }
        
        if (kw === 'that' || kw === 'previous' || kw === 'last') {
            return this.contextHistory[0] || null;
        }
        
        return null;
    }
    
    /**
     * Get current value for active control
     * Integrates with REAPER state
     */
    async getCurrentValue() {
        if (!this.activeControl) {
            return null;
        }
        
        const control = this.activeControl;
        const track = this.activeTrack;
        
        // If we have a track number and control type, query REAPER
        if (track && control.type) {
            if (control.type === 'volume-fader') {
                return await this.getTrackVolume(track);
            } else if (control.type === 'pan-control') {
                return await this.getTrackPan(track);
            } else if (control.type === 'mute-button') {
                return await this.getTrackMute(track);
            } else if (control.type === 'solo-button') {
                return await this.getTrackSolo(track);
            } else if (control.type === 'arm-button') {
                return await this.getTrackArm(track);
            }
        }
        
        // Fallback to element's reported value
        return control.value || null;
    }
    
    /**
     * Update REAPER state (from OSC feedback or Web API)
     */
    updateReaperState(state) {
        if (state.tracks) {
            this.reaperState.tracks = { ...this.reaperState.tracks, ...state.tracks };
        }
        if (state.selectedTracks) {
            this.reaperState.selectedTracks = state.selectedTracks;
        }
        if (state.masterTrack) {
            this.reaperState.masterTrack = state.masterTrack;
        }
        if (state.transport) {
            this.reaperState.transport = state.transport;
        }
        if (state.mixer) {
            this.reaperState.mixer = state.mixer;
        }
    }
    
    /**
     * Get track volume from REAPER state
     */
    async getTrackVolume(trackNum) {
        const track = this.reaperState.tracks[trackNum];
        if (track && typeof track.volume !== 'undefined') {
            return this.volumeToDb(track.volume);
        }
        return null;
    }
    
    /**
     * Get track pan from REAPER state
     */
    async getTrackPan(trackNum) {
        const track = this.reaperState.tracks[trackNum];
        if (track && typeof track.pan !== 'undefined') {
            return track.pan;
        }
        return null;
    }
    
    /**
     * Get track mute state from REAPER state
     */
    async getTrackMute(trackNum) {
        const track = this.reaperState.tracks[trackNum];
        if (track && typeof track.mute !== 'undefined') {
            return track.mute ? 'on' : 'off';
        }
        return null;
    }
    
    /**
     * Get track solo state from REAPER state
     */
    async getTrackSolo(trackNum) {
        const track = this.reaperState.tracks[trackNum];
        if (track && typeof track.solo !== 'undefined') {
            return track.solo ? 'on' : 'off';
        }
        return null;
    }
    
    /**
     * Get track arm state from REAPER state
     */
    async getTrackArm(trackNum) {
        const track = this.reaperState.tracks[trackNum];
        if (track && typeof track.recarm !== 'undefined') {
            return track.recarm ? 'on' : 'off';
        }
        return null;
    }
    
    /**
     * Convert linear volume (0-1) to dB
     */
    volumeToDb(volume) {
        if (volume <= 0) return -Infinity;
        return 20 * Math.log10(volume);
    }
    
    /**
     * Convert dB to linear volume (0-1)
     */
    dbToVolume(db) {
        if (db === -Infinity) return 0;
        return Math.pow(10, db / 20);
    }
    
    /**
     * Generate human-readable description of active control
     */
    getActiveControlDescription() {
        if (!this.activeControl) {
            return null;
        }
        
        const control = this.activeControl;
        const track = this.activeTrack;
        
        let description = '';
        
        // Add track info
        if (track) {
            description += `Track ${track} `;
        }
        
        // Add control type
        switch (control.type) {
            case 'volume-fader':
                description += 'volume fader';
                break;
            case 'pan-control':
                description += 'pan control';
                break;
            case 'mute-button':
                description += 'mute button';
                break;
            case 'solo-button':
                description += 'solo button';
                break;
            case 'arm-button':
                description += 'record arm button';
                break;
            case 'fx-button':
                description += 'FX button';
                break;
            default:
                description += control.role || control.type;
        }
        
        // Add value if available
        if (control.value) {
            description += `, ${control.value}`;
        }
        
        return description;
    }
    
    /**
     * Get context history
     */
    getHistory() {
        return this.contextHistory;
    }
    
    /**
     * Clear context history
     */
    clearHistory() {
        this.contextHistory = [];
        this.emit('history-cleared');
    }
}

module.exports = ContextManager;

