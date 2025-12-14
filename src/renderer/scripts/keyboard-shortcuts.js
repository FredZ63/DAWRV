/**
 * Keyboard Shortcuts Manager for RHEA
 * Allows user-definable keyboard shortcuts for common actions
 */

class KeyboardShortcuts {
    constructor(rhea) {
        this.rhea = rhea;
        
        // Default shortcuts
        this.shortcuts = this.loadShortcuts();
        
        // Active key states (for modifier tracking)
        this.keysPressed = new Set();
        
        // Setup keyboard listeners
        this.setupListeners();
        
        console.log('⌨️  Keyboard shortcuts initialized');
    }
    
    /**
     * Load shortcuts from localStorage or use defaults
     */
    loadShortcuts() {
        try {
            const saved = localStorage.getItem('rhea_keyboard_shortcuts');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load keyboard shortcuts:', e);
        }
        
        // Default shortcuts
        return {
            toggleListening: {
                key: 'L',
                modifiers: ['Meta', 'Shift'], // Cmd+Shift+L on Mac
                description: 'Toggle voice listening on/off'
            },
            toggleScreenAwareness: {
                key: 'S',
                modifiers: ['Meta', 'Shift'], // Cmd+Shift+S on Mac
                description: 'Toggle screen awareness on/off'
            },
            toggleVoiceFeedback: {
                key: 'V',
                modifiers: ['Meta', 'Shift'], // Cmd+Shift+V on Mac
                description: 'Toggle voice feedback on/off'
            },
            toggleOverlay: {
                key: 'O',
                modifiers: ['Meta', 'Shift'], // Cmd+Shift+O on Mac
                description: 'Toggle floating RHEA overlay'
            }
        };
    }
    
    /**
     * Save shortcuts to localStorage
     */
    saveShortcuts() {
        try {
            localStorage.setItem('rhea_keyboard_shortcuts', JSON.stringify(this.shortcuts));
            console.log('✅ Keyboard shortcuts saved');
        } catch (e) {
            console.error('Failed to save keyboard shortcuts:', e);
        }
    }
    
    /**
     * Setup keyboard event listeners
     */
    setupListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    /**
     * Handle keydown events
     */
    handleKeyDown(e) {
        // Add key to pressed set
        this.keysPressed.add(e.key.toUpperCase());
        
        // Check if any shortcut matches
        for (const [action, shortcut] of Object.entries(this.shortcuts)) {
            if (this.isShortcutPressed(shortcut, e)) {
                e.preventDefault();
                this.executeAction(action);
                return;
            }
        }
    }
    
    /**
     * Handle keyup events
     */
    handleKeyUp(e) {
        this.keysPressed.delete(e.key.toUpperCase());
    }
    
    /**
     * Check if a shortcut combination is pressed
     */
    isShortcutPressed(shortcut, event) {
        // Check main key
        if (event.key.toUpperCase() !== shortcut.key.toUpperCase()) {
            return false;
        }
        
        // Check modifiers
        const requiredModifiers = shortcut.modifiers || [];
        
        for (const modifier of requiredModifiers) {
            const isPressed = 
                (modifier === 'Meta' && (event.metaKey || event.key === 'Meta')) ||
                (modifier === 'Control' && (event.ctrlKey || event.key === 'Control')) ||
                (modifier === 'Alt' && (event.altKey || event.key === 'Alt')) ||
                (modifier === 'Shift' && (event.shiftKey || event.key === 'Shift'));
            
            if (!isPressed) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Execute shortcut action
     */
    executeAction(action) {
        console.log(`⌨️  Keyboard shortcut triggered: ${action}`);
        
        switch (action) {
            case 'toggleListening':
                this.toggleListening();
                break;
            case 'toggleScreenAwareness':
                this.toggleScreenAwareness();
                break;
            case 'toggleVoiceFeedback':
                this.toggleVoiceFeedback();
                break;
            case 'toggleOverlay':
                this.toggleOverlay();
                break;
            default:
                console.warn('Unknown shortcut action:', action);
        }
    }
    
    /**
     * Toggle voice listening on/off
     */
    toggleListening() {
        if (!this.rhea) return;
        
        if (this.rhea.isListening) {
            // Stop listening
            this.rhea.stopListening();
            this.rhea.speak('Listening stopped');
            console.log('🔇 Voice listening: OFF (keyboard shortcut)');
        } else {
            // Start listening
            this.rhea.startListening();
            this.rhea.speak('Listening started');
            console.log('🎤 Voice listening: ON (keyboard shortcut)');
        }
        
        // The button state is automatically updated by RHEA's startListening/stopListening methods
    }
    
    /**
     * Toggle screen awareness on/off
     */
    toggleScreenAwareness() {
        if (!this.rhea || !this.rhea.screenAwareness) return;
        
        const currentState = this.rhea.screenAwareness.enabled;
        this.rhea.screenAwareness.setEnabled(!currentState);
        
        // Update the checkbox in the UI
        const checkbox = document.getElementById('screenAwarenessEnabled');
        if (checkbox) {
            checkbox.checked = !currentState;
        }
        
        if (!currentState) {
            this.rhea.speak('Screen awareness enabled');
            console.log('🖱️  Screen awareness: ON (keyboard shortcut)');
        } else {
            this.rhea.speak('Screen awareness disabled');
            console.log('🖱️  Screen awareness: OFF (keyboard shortcut)');
        }
    }
    
    /**
     * Toggle voice feedback on/off
     */
    toggleVoiceFeedback() {
        if (!this.rhea) return;
        
        this.rhea.voiceFeedbackEnabled = !this.rhea.voiceFeedbackEnabled;
        localStorage.setItem('voiceFeedbackEnabled', this.rhea.voiceFeedbackEnabled ? 'true' : 'false');
        
        // Update the checkbox in the UI if it exists
        const checkbox = document.getElementById('voice-feedback-toggle');
        if (checkbox) {
            checkbox.checked = this.rhea.voiceFeedbackEnabled;
        }
        
        if (this.rhea.voiceFeedbackEnabled) {
            this.rhea.speak('Voice feedback enabled');
            console.log('🔊 Voice feedback: ON (keyboard shortcut)');
        } else {
            console.log('🔇 Voice feedback: OFF (keyboard shortcut)');
        }
    }
    
    /**
     * Update a shortcut
     */
    updateShortcut(action, key, modifiers) {
        if (!this.shortcuts[action]) {
            console.warn('Unknown action:', action);
            return false;
        }
        
        this.shortcuts[action].key = key;
        this.shortcuts[action].modifiers = modifiers;
        this.saveShortcuts();
        
        return true;
    }
    
    /**
     * Toggle floating overlay window
     */
    toggleOverlay() {
        if (window.overlay && window.overlay.toggle) {
            window.overlay.toggle();
            console.log('🎨 Toggling floating overlay (keyboard shortcut)');
        } else {
            console.warn('Overlay API not available');
        }
    }
    
    /**
     * Get formatted shortcut string for display
     */
    getShortcutString(action) {
        const shortcut = this.shortcuts[action];
        if (!shortcut) return 'Not set';
        
        const parts = [];
        
        if (shortcut.modifiers) {
            for (const mod of shortcut.modifiers) {
                switch (mod) {
                    case 'Meta': parts.push('⌘'); break;
                    case 'Control': parts.push('⌃'); break;
                    case 'Alt': parts.push('⌥'); break;
                    case 'Shift': parts.push('⇧'); break;
                }
            }
        }
        
        parts.push(shortcut.key);
        
        return parts.join('');
    }
}

