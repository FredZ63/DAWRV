/**
 * Screen Awareness UI
 * 
 * Handles renderer-side integration for screen awareness
 * - Receives element detection events from main process
 * - Triggers RHEA announcements
 * - Manages UI settings for screen awareness
 */

class ScreenAwarenessUI {
    constructor(rhea) {
        this.rhea = rhea;
        this.enabled = false;
        this.autoAnnounce = true;
        this.visualOnly = false; // NEW: Show visual feedback only (no speech)
        this.hoverDelay = 500; // ms
        this.isTracking = false;
        this.lastContext = 'tcp'; // Track context: 'mcp' = Mixer, 'tcp' = Track Panel, 'arrange' = Arrange
        
        // Menu/popup detection - don't announce when in menus
        this.lastValidControl = null;
        this.invalidControlCount = 0;
        this.menuSilenceThreshold = 3;
        this.isInMenu = false;
        
        // Rapid change detection (indicates menu hovering)
        this.recentControlChanges = [];
        this.rapidChangeThreshold = 4;
        this.rapidChangeWindow = 1000;
        this.lastControlType = null;
        this.lastTrackNumber = null;
        
        // Value change detection (announce when fader/knob is moved)
        this.lastValues = {}; // Track last known values by control ID
        this.valueChangeDebounce = 450; // Wait 450ms after movement stops before announcing
        this.valueChangeTimer = null;
        this.valueAnnouncementId = 0; // Unique ID to prevent duplicate announcements
        this.suppressNormalAnnouncements = false; // Suppress regular announcements during fader movement
        
        // HOVER SETTLE - Only announce when mouse has settled on the SAME control
        this.hoverSettleTime = 200; // Must hover on same control for 200ms before announcing (FAST)
        this.hoverSettleTimer = null;
        this.lastHoveredControl = null; // {track, control_type, timestamp}
        this.pendingAnnouncement = null; // The announcement waiting to be spoken
        this.lastAnnouncedControl = null; // What we last announced (to avoid repeats)
        
        // SWIPE DETECTION - Backup detection for rapid scrolling
        this.trackChangeHistory = []; // Track recent track number changes with timestamps
        this.swipeDetectionWindow = 150; // Look at last 150ms of track changes
        this.swipeThreshold = 2; // If 2+ track changes in the window, it's a swipe
        this.swipeSettleTime = 300; // Must settle for 300ms after swipe
        this.lastTrackChangeTime = 0;
        this.isSwiping = false;
        this.swipeSettleTimer = null;
        this.lastAnnouncedTrack = null; // Track the last track number we announced
        
        // SINGLE VOICE CONTROL - Prevent double announcements
        this.isSpeaking = false;
        this.lastSpokenText = '';
        this.lastSpeakTime = 0;
        this.minSpeakInterval = 400; // Minimum 400ms between different announcements
        
        // Load settings from localStorage
        this.loadSettings();
        
        console.log('🖱️  Screen Awareness UI initialized');
        
        // Listen for element detection events from main process
        // Use setTimeout to ensure window.api is ready
        setTimeout(() => {
            this.setupEventListeners();
            this.setupReaScriptListener();
        }, 200);
    }
    
    /**
     * Setup event listeners for screen awareness
     */
    setupEventListeners() {
        try {
            // Check if API is available
            if (!window.api || !window.api.onScreenElementDetected || !window.api.onScreenControlActivated) {
                console.warn('⚠️  Screen Awareness API not available - event listeners not set up');
                return;
            }
            
            // Element detected (hover)
            window.api.onScreenElementDetected((element) => {
                this.onElementDetected(element);
            });
            
            // Control activated (click)
            window.api.onScreenControlActivated((element) => {
                this.onControlActivated(element);
            });
            
            console.log('✅ Screen Awareness event listeners set up');
        } catch (error) {
            console.error('❌ Error setting up Screen Awareness event listeners:', error);
        }
    }
    
    /**
     * Setup ReaScript listener for accurate control detection
     */
    setupReaScriptListener() {
        try {
            if (!window.api || !window.api.onReaScriptControlTouched) {
                console.warn('⚠️  ReaScript API not available');
                return;
            }
            
            // Listen for control touches from ReaScript
            window.api.onReaScriptControlTouched((controlInfo) => {
                if (!this.enabled || !this.autoAnnounce) return;
                
                // TRANSPORT CONTROLS - Always allow, no track number required
                const isTransportControl = controlInfo.context === 'transport' || 
                    controlInfo.control_type?.includes('_button') && 
                    ['play', 'stop', 'record', 'pause', 'rewind', 'forward', 'loop', 'metronome'].some(t => 
                        controlInfo.control_type?.includes(t));
                
                // MENU DETECTION 1: If control_type is "unknown" or no track (but allow transport)
                if (!controlInfo.success || controlInfo.control_type === 'unknown' || (!controlInfo.track_number && !isTransportControl)) {
                    this.invalidControlCount++;
                    if (this.invalidControlCount >= this.menuSilenceThreshold) {
                        if (!this.isInMenu) {
                            console.log('📋 Menu detected (invalid controls) - silencing');
                            this.isInMenu = true;
                        }
                    }
                    return;
                }
                
                // Reset invalid count for valid controls (including transport)
                if (isTransportControl) {
                    this.invalidControlCount = 0;
                    this.isInMenu = false;
                }
                
                // MENU DETECTION 2: Rapid control type changes on same track
                // When in a menu, as mouse moves vertically, underlying control zones change rapidly
                const now = Date.now();
                const currentControl = controlInfo.control_type;
                const currentTrack = controlInfo.track_number;
                
                // Track changes on the SAME track (menu hovering pattern)
                if (currentTrack === this.lastTrackNumber && currentControl !== this.lastControlType) {
                    this.recentControlChanges.push(now);
                    
                    // Clean old entries outside the window
                    this.recentControlChanges = this.recentControlChanges.filter(t => now - t < this.rapidChangeWindow);
                    
                    // If too many rapid changes, assume menu is open
                    if (this.recentControlChanges.length >= this.rapidChangeThreshold) {
                        if (!this.isInMenu) {
                            console.log(`📋 Menu detected (${this.recentControlChanges.length} rapid changes) - silencing`);
                            this.isInMenu = true;
                        }
                        this.lastControlType = currentControl;
                        this.lastTrackNumber = currentTrack;
                        return; // Don't announce
                    }
                }
                
                // If we're in menu mode but changes slowed down, exit menu mode
                if (this.isInMenu && this.recentControlChanges.length < 2) {
                    console.log('📋 Menu closed - resuming announcements');
                    this.isInMenu = false;
                    this.recentControlChanges = [];
                }
                
                // Update tracking
                this.lastControlType = currentControl;
                this.lastTrackNumber = currentTrack;
                this.invalidControlCount = 0;
                
                // If still in menu mode, don't announce
                if (this.isInMenu) {
                    return;
                }
                
                console.log('🎛️  ReaScript control touched:', controlInfo);
                
                // UPDATE CONTEXT - Use "Channel" for Mixer (mcp), "Track" for Arrange (tcp)
                if (controlInfo.context) {
                    this.updateContext(controlInfo.context);
                    console.log(`🎛️ Context: ${controlInfo.context} → Using "${this.getTerminology()}"`);
                }
                
                // Flash the avatar
                if (this.rhea && this.rhea.flashHoverDetection) {
                    const controlType = (controlInfo.control_type || '').toLowerCase();
                    this.rhea.flashHoverDetection(controlType);
                }
                
                // VALUE CHANGE DETECTION - Announce when fader/knob is moved
                this.checkForValueChange(controlInfo);
            });
            
            console.log('✅ ReaScript listener set up');
        } catch (error) {
            console.error('❌ Error setting up ReaScript listener:', error);
        }
        
        // Setup smart learning-based detection listener with debouncing
        this.announcementDebounceTimer = null;
        this.lastAnnouncementTime = 0;
        
        try {
            if (window.api && window.api.onControlDetectedSmart) {
                window.api.onControlDetectedSmart((identification) => {
                    if (!this.enabled || !this.autoAnnounce) return;
                    
                    // MENU DETECTION: Skip if we detected a menu is open
                    if (this.isInMenu) {
                        console.log('📋 In menu - skipping smart announcement');
                        return;
                    }
                    
                    // Also check if this is a valid identification
                    if (!identification.rawData?.success || identification.prediction?.control_type === 'unknown') {
                        console.log('⚠️ Invalid control - possibly over menu/dialog');
                        return;
                    }
                    
                    // DEBUG: Log full identification
                    console.log('🧠 Smart control identification:', {
                        announcement: identification.announcement,
                        context: identification.rawData?.context,
                        control_type: identification.prediction?.control_type
                    });
                    
                    // UPDATE CONTEXT from smart identification
                    if (identification.rawData?.context) {
                        this.updateContext(identification.rawData.context);
                        console.log(`📍 Context: ${identification.rawData.context} → "${this.getTerminology()}"`);
                    }
                    
                    // Flash avatar immediately (no delay)
                    if (this.rhea && this.rhea.flashHoverDetection) {
                        const controlType = (identification.prediction?.control_type || '').toLowerCase();
                        this.rhea.flashHoverDetection(controlType);
                    }
                    
                    // ============================================
                    // HOVER SETTLE - Only announce when hovering on SAME control
                    // ============================================
                    const currentTrackNum = identification.rawData?.track_number;
                    const currentControlType = identification.prediction?.control_type;
                    const now = Date.now();
                    
                    // Create a unique ID for this control
                    const currentControlId = `${currentTrackNum}-${currentControlType}`;
                    
                    // Check if this is a DIFFERENT control than what we were hovering
                    const controlChanged = this.lastHoveredControl?.id !== currentControlId;
                    
                    if (controlChanged) {
                        // Control changed - cancel any pending announcement
                        if (this.hoverSettleTimer) {
                            clearTimeout(this.hoverSettleTimer);
                            this.hoverSettleTimer = null;
                        }
                        
                        // Track this as the new hovered control
                        this.lastHoveredControl = {
                            id: currentControlId,
                            track: currentTrackNum,
                            controlType: currentControlType,
                            timestamp: now,
                            announcement: identification.announcement
                        };
                        
                        // SWIPE DETECTION - Track rapid channel changes
                        if (currentTrackNum !== undefined && currentTrackNum !== this.lastAnnouncedTrack) {
                            this.trackChangeHistory.push({ track: currentTrackNum, time: now });
                            this.trackChangeHistory = this.trackChangeHistory.filter(
                                entry => now - entry.time < this.swipeDetectionWindow
                            );
                            
                            if (this.trackChangeHistory.length >= this.swipeThreshold) {
                                this.isSwiping = true;
                                console.log(`🖐️ SCROLLING detected (${this.trackChangeHistory.length} changes) - waiting...`);
                                
                                if (this.swipeSettleTimer) clearTimeout(this.swipeSettleTimer);
                                this.swipeSettleTimer = setTimeout(() => {
                                    this.isSwiping = false;
                                    this.trackChangeHistory = [];
                                }, this.swipeSettleTime);
                            }
                            this.lastAnnouncedTrack = currentTrackNum;
                        }
                        
                        // Start the hover settle timer - will announce if we stay on this control
                        if (!this.visualOnly && identification.announcement && this.rhea) {
                            this.hoverSettleTimer = setTimeout(() => {
                                // Only announce if still on the same control
                                if (this.lastHoveredControl?.id === currentControlId && 
                                    !this.isSwiping && 
                                    !this.suppressNormalAnnouncements) {
                                    
                                    // Check if we already announced this exact control
                                    if (this.lastAnnouncedControl === currentControlId) {
                                        console.log('🔇 Already announced this control');
                                        return;
                                    }
                                    
                                    let announcement = identification.announcement;
                                    const term = this.getTerminology();
                                    if (term === 'Channel') {
                                        announcement = announcement.replace(/\bTrack\b/gi, 'Channel');
                                    }
                                    
                                    console.log('🔊 HOVER SETTLED:', announcement);
                                    
                                    if (window.overlay && window.overlay.updateControl) {
                                        window.overlay.updateControl(announcement);
                                    }
                                    
                                    this.safeSpeak(announcement);
                                    this.lastAnnouncedControl = currentControlId;
                                }
                            }, this.hoverSettleTime);
                        }
                    }
                    // If control is the SAME, we're still hovering - let the timer run
                });
                console.log('✅ Smart learning listener set up (with 200ms debounce)');
            }
        } catch (error) {
            console.error('❌ Error setting up smart learning listener:', error);
        }
    }
    
    /**
     * Generate announcement from ReaScript control info
     */
    generateReaScriptAnnouncement(controlInfo) {
        if (!controlInfo || !controlInfo.success) return null;
        
        let announcement = '';
        
        // Add track info
        if (controlInfo.track_name) {
            announcement += controlInfo.track_name;
        }
        
        // Add parameter/control name
        if (controlInfo.parameter_name) {
            announcement += `, ${controlInfo.parameter_name}`;
        }
        
        // Add value
        if (controlInfo.value_formatted) {
            announcement += `, ${controlInfo.value_formatted}`;
        }
        
        return announcement || null;
    }
    
    /**
     * Start screen awareness
     */
    async start() {
        if (this.isTracking) {
            console.log('🖱️  Screen awareness already tracking');
            return;
        }
        
        try {
            // Check for accessibility permission first
            const permissionCheck = await window.api.screenAwarenessCheckPermission();
            
            if (!permissionCheck.success || !permissionCheck.hasPermission) {
                console.log('🔐 No accessibility permission - requesting...');
                
                // Request permission
                const permissionResult = await window.api.screenAwarenessRequestPermission();
                
                if (!permissionResult.success || !permissionResult.granted) {
                    // Show permission instructions to user
                    this.showPermissionDialog();
                    return;
                }
            }
            
            // Start tracking
            const result = await window.api.screenAwarenessStart({
                hoverDelay: this.hoverDelay
            });
            
            if (result.success) {
                this.isTracking = true;
                console.log('✅ Screen awareness started');
                this.updateStatus('Screen Awareness: Active');
                
                // Also start ReaScript polling for accurate control detection
                if (window.api.reaScriptStart) {
                    try {
                        await window.api.reaScriptStart();
                        console.log('✅ ReaScript polling started');
                    } catch (error) {
                        console.warn('⚠️  Could not start ReaScript polling:', error);
                    }
                }
            } else {
                console.error('❌ Failed to start screen awareness:', result.error);
                this.updateStatus('Screen Awareness: Failed');
            }
        } catch (error) {
            console.error('❌ Error starting screen awareness:', error);
            this.updateStatus('Screen Awareness: Error');
        }
    }
    
    /**
     * Stop screen awareness
     */
    async stop() {
        if (!this.isTracking) {
            return;
        }
        
        try {
            const result = await window.api.screenAwarenessStop();
            
            if (result.success) {
                this.isTracking = false;
                console.log('🖱️  Screen awareness stopped');
                this.updateStatus('Screen Awareness: Inactive');
                
                // Also stop ReaScript polling
                if (window.api.reaScriptStop) {
                    try {
                        await window.api.reaScriptStop();
                        console.log('🛑 ReaScript polling stopped');
                    } catch (error) {
                        console.warn('⚠️  Could not stop ReaScript polling:', error);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error stopping screen awareness:', error);
        }
    }
    
    /**
     * Handle element detected (hover)
     */
    onElementDetected(element) {
        // DISABLED: macOS Accessibility is less accurate than REAPER detection
        return;
        
        /* OLD CODE - macOS Accessibility (inaccurate)
        if (!this.enabled || !this.autoAnnounce) {
            return;
        }
        
        console.log('🖱️  Element detected:', element.type, element.title || '(no title)');
        
        // VISUAL FEEDBACK - Flash avatar with color
        if (this.rhea && this.rhea.flashHoverDetection) {
            this.rhea.flashHoverDetection(element.type || 'reaper-control');
        }
        */
        
        // Generate announcement
        const announcement = this.generateAnnouncement(element);
        
        // SILENCE "REAPER Control" generic announcements - only visual feedback
        const isGenericControl = element.type === 'reaper-control' || 
                                element.type === 'ui-element' ||
                                announcement === 'REAPER Control' ||
                                announcement === 'UI Element';
        
        // Check if we should speak (based on visualOnly and control type)
        const shouldSpeak = !this.visualOnly && !isGenericControl && !this.suppressNormalAnnouncements;
        
        if (announcement && this.rhea && shouldSpeak) {
            // Only speak for specific controls (fader, button, etc) if not in visual-only mode
            this.safeSpeak(announcement);
        } else if (this.suppressNormalAnnouncements) {
            console.log('🔇 Suppressed (fader moving)');
        } else if (this.visualOnly) {
            console.log('🎨 Visual-only mode - no speech');
        } else if (isGenericControl) {
            console.log('🎨 Generic control - visual feedback only (no speech)');
        }
    }
    
    /**
     * Handle control activated (click)
     */
    onControlActivated(element) {
        if (!this.enabled) {
            return;
        }
        
        console.log('🎯 Control activated:', element.type, element.title || '(no title)');
        
        // Generate announcement
        const announcement = this.generateAnnouncement(element, true);
        
        if (announcement && this.rhea) {
            // Announce via RHEA (always announce on click, even if auto-announce is off)
            this.safeSpeak(announcement);
        }
    }
    
    /**
     * Determine if we're in the Mixer window (use "channel") vs Arrange window (use "track")
     * Uses the last detected context from ReaScript
     */
    getTerminology() {
        // Check the last detected context from ReaScript
        // "mcp" = Mixer Control Panel → use "Channel"
        // "tcp" = Track Control Panel → use "Track"
        // "arrange" = Arrange area → use "Track"
        if (this.lastContext === 'mcp') {
            return 'Channel';
        }
        // Also check RHEA's mixer state as fallback
        if (this.rhea && this.rhea.mixerVisible) {
            return 'Channel';
        }
        // Default to track for arrange window
        return 'Track';
    }
    
    /**
     * SAFE SPEAK - Centralized announcement with double-voice prevention
     * All announcements should go through this method
     */
    safeSpeak(text) {
        if (!text || !this.rhea) return;
        
        // Block if already speaking
        if (this.isSpeaking) {
            console.log('🔇 Already speaking, blocked:', text.substring(0, 30));
            return;
        }
        
        const now = Date.now();
        
        // Prevent duplicate announcements (same text within interval)
        if (text === this.lastSpokenText && (now - this.lastSpeakTime) < this.minSpeakInterval) {
            console.log('🔇 Duplicate blocked:', text);
            return;
        }
        
        // Prevent rapid-fire announcements (different text but too fast)
        if ((now - this.lastSpeakTime) < 200) {
            console.log('🔇 Too fast, skipping:', text);
            return;
        }
        
        // STOP ALL AUDIO SOURCES
        // 1. Stop HTML5 audio elements
        document.querySelectorAll('audio').forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        // 2. Cancel browser speech synthesis
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        console.log('🔊 SAFE SPEAK:', text);
        this.lastSpokenText = text;
        this.lastSpeakTime = now;
        
        // Mark that we're speaking (prevent other announcements)
        this.isSpeaking = true;
        
        // Use RHEA's speak (which uses OpenAI TTS)
        this.rhea.speak(text).finally(() => {
            // Reset speaking flag after speech completes (with buffer)
            setTimeout(() => {
                this.isSpeaking = false;
            }, 200);
        });
    }
    
    /**
     * Update the context based on ReaScript data
     */
    updateContext(context) {
        if (context) {
            this.lastContext = context;
            // Also update RHEA's mixer state
            if (this.rhea) {
                this.rhea.mixerVisible = (context === 'mcp');
            }
        }
    }
    
    /**
     * Check for value changes and announce when fader/knob is moved
     * Only announces controls that have values (volume, pan, width)
     */
    checkForValueChange(controlInfo) {
        if (!controlInfo.success || !controlInfo.value_formatted) return;
        
        // Only track value-based controls
        const valueControls = ['volume_fader', 'volume', 'pan_control', 'pan', 'width_control', 'width'];
        if (!valueControls.includes(controlInfo.control_type)) return;
        
        // Create unique ID for this control
        const controlId = `${controlInfo.track_number}_${controlInfo.control_type}`;
        const currentValue = controlInfo.value;
        
        // Skip if no value provided
        if (currentValue === undefined || currentValue === null) return;
        
        const lastValue = this.lastValues[controlId];
        
        // Check if value changed at all (any movement)
        if (lastValue !== undefined) {
            const valueDiff = Math.abs(currentValue - lastValue);
            
            // Any movement detected (even tiny)
            if (valueDiff > 0.0001) {
                // SUPPRESS all other announcements while fader is moving
                this.suppressNormalAnnouncements = true;
                
                // CLEAR the smart learning debounce timer to prevent its announcement
                if (this.announcementDebounceTimer) {
                    clearTimeout(this.announcementDebounceTimer);
                    this.announcementDebounceTimer = null;
                }
                
                // ALWAYS clear any existing value change timer first
                if (this.valueChangeTimer) {
                    clearTimeout(this.valueChangeTimer);
                    this.valueChangeTimer = null;
                }
                
                // Generate unique announcement ID to prevent duplicates
                this.valueAnnouncementId = (this.valueAnnouncementId || 0) + 1;
                const currentAnnouncementId = this.valueAnnouncementId;
                
                // Store the FINAL value message (overwrites previous)
                const term = this.getTerminology();
                const finalMessage = `${term} ${controlInfo.track_number}, ${controlInfo.value_formatted}`;
                
                // Set single timer - only announces when movement STOPS for 800ms
                this.valueChangeTimer = setTimeout(() => {
                    // Only announce if this is still the latest announcement
                    if (currentAnnouncementId === this.valueAnnouncementId && this.rhea && !this.visualOnly) {
                        console.log(`🎚️ Fader stopped at: ${finalMessage}`);
                        this.safeSpeak(finalMessage);
                        // Clear to prevent any duplicate
                        this.valueAnnouncementId = 0;
                    }
                    this.valueChangeTimer = null;
                    // Re-enable normal announcements AFTER a delay to prevent race conditions
                    setTimeout(() => {
                        this.suppressNormalAnnouncements = false;
                    }, 300);
                }, this.valueChangeDebounce);
            }
        }
        
        // Update stored value
        this.lastValues[controlId] = currentValue;
    }
    
    /**
     * Generate announcement for element
     */
    generateAnnouncement(element, isClick = false) {
        if (!element) return null;
        
        let announcement = '';
        
        // Extract track number if available
        const trackNum = this.extractTrackNumber(element);
        
        // Use "Channel" for Mixer, "Track" for Arrange
        const term = this.getTerminology();
        
        // Build announcement based on element type
        switch (element.type) {
            case 'volume-fader':
            case 'volume_fader':
            case 'volume':
                announcement = trackNum ? `${term} ${trackNum} volume fader` : 'Volume fader';
                if (element.value) {
                    announcement += `, ${this.formatValue(element.value)}`;
                }
                if (isClick) announcement += ', selected';
                break;
                
            case 'pan-control':
            case 'pan_control':
            case 'pan':
                announcement = trackNum ? `${term} ${trackNum} pan control` : 'Pan control';
                if (element.value) {
                    announcement += `, ${this.formatValue(element.value)}`;
                }
                if (isClick) announcement += ', selected';
                break;
                
            case 'width-control':
            case 'width_control':
            case 'width':
                announcement = trackNum ? `${term} ${trackNum} width control` : 'Width control';
                if (element.value) {
                    announcement += `, ${this.formatValue(element.value)}`;
                }
                if (isClick) announcement += ', selected';
                break;
                
            case 'mute-button':
            case 'mute_button':
            case 'mute':
                announcement = trackNum ? `${term} ${trackNum} mute` : 'Mute button';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'solo-button':
            case 'solo_button':
            case 'solo':
                announcement = trackNum ? `${term} ${trackNum} solo` : 'Solo button';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'arm-button':
            case 'record_arm':
            case 'arm':
                announcement = trackNum ? `${term} ${trackNum} record arm` : 'Record arm button';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'fx-button':
            case 'fx_button':
            case 'fx':
                announcement = trackNum ? `${term} ${trackNum} FX` : 'FX button';
                if (isClick) announcement += ', clicked';
                break;
                
            case 'button':
                announcement = element.title || 'Button';
                if (isClick) announcement += ', clicked';
                break;
                
            case 'slider':
                announcement = element.title || 'Slider';
                if (element.value) {
                    announcement += `, ${this.formatValue(element.value)}`;
                }
                if (isClick) announcement += ', selected';
                break;
            
            // TRANSPORT CONTROLS
            case 'play_button':
                announcement = 'Play button';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'stop_button':
                announcement = 'Stop button';
                if (isClick) announcement += ', clicked';
                break;
                
            case 'record_button':
                announcement = 'Record button';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'pause_button':
                announcement = 'Pause button';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'rewind_button':
                announcement = 'Rewind button';
                if (isClick) announcement += ', clicked';
                break;
                
            case 'forward_button':
                announcement = 'Fast forward button';
                if (isClick) announcement += ', clicked';
                break;
                
            case 'loop_button':
                announcement = 'Loop button';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'metronome_button':
                announcement = 'Metronome';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'tempo_display':
                announcement = 'Tempo display';
                break;
                
            case 'time_display':
                announcement = 'Time display';
                break;
                
            case 'transport_control':
                announcement = 'Transport control';
                if (isClick) announcement += ', clicked';
                break;
            
            // Additional mixer controls
            case 'phase_button':
            case 'phase':
                announcement = trackNum ? `${term} ${trackNum} phase` : 'Phase button';
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                if (isClick) announcement += ', clicked';
                break;
                
            case 'meter':
                announcement = trackNum ? `${term} ${trackNum} meter` : 'Level meter';
                break;
                
            case 'track_label':
            case 'label':
                announcement = trackNum ? `${term} ${trackNum}` : `${term} label`;
                if (element.value) {
                    announcement += `, ${element.value}`;
                }
                break;
                
            case 'io_button':
            case 'input_button':
            case 'route':
                announcement = trackNum ? `${term} ${trackNum} input/output` : 'I/O routing';
                if (isClick) announcement += ', clicked';
                break;
                
            case 'envelope_button':
            case 'env':
                announcement = trackNum ? `${term} ${trackNum} envelope` : 'Envelope';
                if (isClick) announcement += ', clicked';
                break;
                
            default:
                // Generic announcement
                if (element.title) {
                    announcement = element.title;
                } else if (element.description) {
                    announcement = element.description;
                } else {
                    announcement = element.role || element.type;
                }
        }
        
        return announcement;
    }
    
    /**
     * Extract track number from element
     */
    extractTrackNumber(element) {
        if (!element) return null;
        
        const text = `${element.title || ''} ${element.description || ''}`;
        const match = text.match(/track\s+(\d+)/i);
        
        return match ? match[1] : null;
    }
    
    /**
     * Format value for announcement
     */
    formatValue(value) {
        if (!value) return '';
        
        // Try to extract dB value
        const dbMatch = value.match(/(-?\d+\.?\d*)\s*dB/i);
        if (dbMatch) {
            return `${dbMatch[1]} dB`;
        }
        
        // Try to extract percentage
        const percentMatch = value.match(/(\d+\.?\d*)\s*%/i);
        if (percentMatch) {
            return `${percentMatch[1]} percent`;
        }
        
        // Return as-is
        return value;
    }
    
    /**
     * Show permission dialog
     */
    showPermissionDialog() {
        if (this.rhea) {
            this.rhea.speak('Screen Awareness requires Accessibility permission. Please open System Settings, Privacy and Security, Accessibility, and enable DAWRV.');
        }
        
        // You could also show a modal here
        alert('Screen Awareness requires Accessibility permission.\n\n' +
              'Please:\n' +
              '1. Open System Settings → Privacy & Security → Accessibility\n' +
              '2. Enable DAWRV/Electron\n' +
              '3. Restart DAWRV\n\n' +
              'Screen Awareness allows RHEA to "see" what you\'re pointing at in REAPER and announce it!');
    }
    
    /**
     * Update status display
     */
    updateStatus(message) {
        // You can hook this into your UI status display
        console.log('🖱️  Status:', message);
    }
    
    /**
     * Enable/disable screen awareness
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.saveSettings();
        
        // Send to overlay window
        if (window.overlay && window.overlay.updateScreenAwareness) {
            window.overlay.updateScreenAwareness(enabled);
        }
        
        if (enabled && !this.isTracking) {
            this.start();
        } else if (!enabled && this.isTracking) {
            this.stop();
        }
        
        console.log('🖱️  Screen awareness:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Set auto-announce
     */
    setAutoAnnounce(autoAnnounce) {
        this.autoAnnounce = autoAnnounce;
        this.saveSettings();
        console.log('🖱️  Auto-announce:', autoAnnounce ? 'enabled' : 'disabled');
    }
    
    /**
     * Set visual-only mode (no speech)
     */
    setVisualOnly(visualOnly) {
        this.visualOnly = visualOnly;
        this.saveSettings();
        console.log('🎨 Visual-only mode:', visualOnly ? 'enabled' : 'disabled');
    }
    
    /**
     * Set hover delay
     */
    setHoverDelay(delayMs) {
        this.hoverDelay = delayMs;
        this.saveSettings();
        
        if (this.isTracking) {
            window.api.screenAwarenessSetHoverDelay(delayMs);
        }
        
        console.log('🖱️  Hover delay:', delayMs, 'ms');
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('screenAwarenessSettings') || '{}');
            this.enabled = settings.enabled !== undefined ? settings.enabled : true; // DEFAULT: ON
            this.visualOnly = settings.visualOnly !== undefined ? settings.visualOnly : false;
            this.autoAnnounce = settings.autoAnnounce !== undefined ? settings.autoAnnounce : true;
            this.hoverDelay = settings.hoverDelay || 500;
        } catch (error) {
            console.error('❌ Error loading screen awareness settings:', error);
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const settings = {
                enabled: this.enabled,
                autoAnnounce: this.autoAnnounce,
                visualOnly: this.visualOnly,
                hoverDelay: this.hoverDelay
            };
            localStorage.setItem('screenAwarenessSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('❌ Error saving screen awareness settings:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenAwarenessUI;
}

