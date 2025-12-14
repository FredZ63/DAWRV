/**
 * Control Learning Service
 * 
 * Machine learning system that improves RHEA's control identification accuracy
 * by learning from user interactions
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class ControlLearningService extends EventEmitter {
    constructor() {
        super();
        
        // Training data storage
        this.trainingDataPath = path.join(process.env.HOME || process.env.USERPROFILE, 
                                         '.dawrv', 'control-training.json');
        this.trainingData = [];
        
        // Learned patterns
        this.learnedPatterns = new Map();
        
        // Current interaction state
        this.currentHover = null;
        this.hoverStartTime = null;
        this.lastClick = null;
        
        // Learning parameters
        this.minHoverTime = 500; // Minimum hover time to consider intentional
        this.confidenceThreshold = 0.7; // Minimum confidence to auto-identify
        
        this.loadTrainingData();
    }
    
    /**
     * Load training data from disk
     */
    loadTrainingData() {
        try {
            if (fs.existsSync(this.trainingDataPath)) {
                const data = JSON.parse(fs.readFileSync(this.trainingDataPath, 'utf8'));
                this.trainingData = data.interactions || [];
                this.learnedPatterns = new Map(data.patterns || []);
                
                console.log(`🧠 Loaded ${this.trainingData.length} training interactions, ${this.learnedPatterns.size} learned patterns`);
            } else {
                console.log('🧠 No training data found - starting fresh');
            }
        } catch (error) {
            console.error('❌ Failed to load training data:', error);
        }
    }
    
    /**
     * Save training data to disk
     */
    saveTrainingData() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.trainingDataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const data = {
                interactions: this.trainingData.slice(-1000), // Keep last 1000 interactions
                patterns: Array.from(this.learnedPatterns.entries()),
                lastUpdated: new Date().toISOString()
            };
            
            fs.writeFileSync(this.trainingDataPath, JSON.stringify(data, null, 2));
            console.log('💾 Training data saved');
        } catch (error) {
            console.error('❌ Failed to save training data:', error);
        }
    }
    
    /**
     * Record a hover event
     */
    onHover(controlData) {
        this.currentHover = controlData;
        this.hoverStartTime = Date.now();
        
        // Emit hover event
        this.emit('hover', controlData);
    }
    
    /**
     * Record a click event - this is the LEARNING moment!
     */
    onClick(controlData) {
        const clickTime = Date.now();
        const hoverDuration = this.hoverStartTime ? clickTime - this.hoverStartTime : 0;
        
        // If user hovered before clicking, this is a training signal
        if (this.currentHover && hoverDuration >= this.minHoverTime) {
            this.recordTrainingInteraction({
                timestamp: new Date().toISOString(),
                hoverDuration,
                controlData,
                action: 'click',
                // Visual features (for future ML)
                features: this.extractFeatures(controlData)
            });
            
            // Update learned patterns
            this.updateLearnedPattern(controlData);
            
            console.log(`🎓 LEARNED: ${controlData.control_type} on ${controlData.track_name} (hover: ${hoverDuration}ms)`);
        }
        
        this.lastClick = {
            time: clickTime,
            control: controlData
        };
        
        // Emit click event
        this.emit('click', controlData);
    }
    
    /**
     * Extract features from control data for ML
     */
    extractFeatures(controlData) {
        return {
            // Position features
            position_x: controlData.position?.x,
            position_y: controlData.position?.y,
            
            // Context features
            context: controlData.context, // tcp, mcp, arrange
            
            // Track features
            track_number: controlData.track_number,
            
            // Control type (what ReaScript thinks it is)
            reascript_guess: controlData.control_type,
            
            // Parameter info
            has_parameter: !!controlData.parameter,
            parameter_type: controlData.parameter,
            
            // Visual hints (for future computer vision)
            // Could include screenshot hash, color profile, etc.
        };
    }
    
    /**
     * Record a training interaction
     */
    recordTrainingInteraction(interaction) {
        this.trainingData.push(interaction);
        
        // Auto-save every 10 interactions
        if (this.trainingData.length % 10 === 0) {
            this.saveTrainingData();
        }
    }
    
    /**
     * Update learned pattern based on new interaction
     */
    updateLearnedPattern(controlData) {
        // Create a pattern key based on features
        const patternKey = this.createPatternKey(controlData);
        
        // Get or create pattern entry
        let pattern = this.learnedPatterns.get(patternKey) || {
            key: patternKey,
            control_type: controlData.control_type,
            occurrences: 0,
            confidence: 0,
            features: this.extractFeatures(controlData),
            last_seen: null
        };
        
        // Update pattern
        pattern.occurrences++;
        pattern.last_seen = new Date().toISOString();
        pattern.confidence = Math.min(0.99, pattern.occurrences / 10); // Max 0.99 after 10 occurrences
        
        // Store updated pattern
        this.learnedPatterns.set(patternKey, pattern);
        
        // Emit learning event
        this.emit('pattern-learned', pattern);
    }
    
    /**
     * Create a unique key for a control pattern
     */
    createPatternKey(controlData) {
        // Key based on: track number, context, relative position
        return `track${controlData.track_number}-${controlData.context}-${controlData.control_type}`;
    }
    
    /**
     * Predict control type based on learned patterns
     */
    predictControlType(controlData) {
        const patternKey = this.createPatternKey(controlData);
        const pattern = this.learnedPatterns.get(patternKey);
        
        if (pattern && pattern.confidence >= this.confidenceThreshold) {
            return {
                control_type: pattern.control_type,
                confidence: pattern.confidence,
                source: 'learned',
                occurrences: pattern.occurrences
            };
        }
        
        // Fall back to ReaScript's guess
        return {
            control_type: controlData.control_type,
            confidence: 0.5, // Medium confidence for ReaScript guesses
            source: 'reascript',
            occurrences: 0
        };
    }
    
    /**
     * Get identification for announcement
     */
    getControlIdentification(controlData) {
        const prediction = this.predictControlType(controlData);
        
        // Build announcement text
        let announcement = '';
        
        // Use "Channel" for Mixer (mcp), "Track" for Arrange/TCP
        // Context: "mcp" = Mixer Control Panel, "tcp" = Track Control Panel
        // If context is missing or empty, default to "mcp" = Channel (since mixer is most common use case)
        const context = controlData.context || '';
        const term = (context === 'mcp' || context === '') ? 'Channel' : 'Track';
        
        console.log(`📍 Terminology: context="${context}" → using "${term}"`);
        
        if (controlData.track_number) {
            // Use context-aware terminology
            announcement += `${term} ${controlData.track_number}, `;
        } else if (controlData.track_name) {
            // Replace "Track" with context-aware term in track_name
            let trackName = controlData.track_name;
            if (controlData.context === 'mcp') {
                trackName = trackName.replace(/^Track\s*/i, 'Channel ');
            }
            announcement += `${trackName}, `;
        }
        
        // Add control type
        const controlName = this.formatControlName(prediction.control_type);
        announcement += controlName;
        
        // Add value if available
        if (controlData.value_formatted) {
            announcement += `, ${controlData.value_formatted}`;
        }
        
        // Add confidence indicator for debugging
        if (prediction.confidence < 0.7) {
            announcement += ' (learning)';
        }
        
        return {
            announcement,
            prediction,
            controlData,
            rawData: controlData // Include raw data so renderer can access context
        };
    }
    
    /**
     * Format control type for speech
     */
    formatControlName(controlType) {
        const nameMap = {
            'volume_fader': 'volume fader',
            'volume': 'volume',
            'pan_control': 'pan control',
            'pan': 'pan',
            'width_control': 'width control',
            'width': 'width',
            'mute_button': 'mute button',
            'mute': 'mute',
            'solo_button': 'solo button',
            'solo': 'solo',
            'record_arm': 'record arm',
            'arm': 'record arm',
            'fx_button': 'FX button',
            'fx': 'FX',
            'input_monitor': 'input monitor',
            'automation_mode': 'automation mode',
            'send_control': 'sends',
            'phase_button': 'phase invert',
            'input_select': 'input routing',
            'output_select': 'output routing',
            'folder_button': 'folder',
            'track_label': 'track name',
            'track_area': 'track',
            'unknown': 'control'
        };
        
        return nameMap[controlType] || controlType;
    }
    
    /**
     * Get learning statistics
     */
    getStats() {
        return {
            total_interactions: this.trainingData.length,
            learned_patterns: this.learnedPatterns.size,
            high_confidence_patterns: Array.from(this.learnedPatterns.values())
                .filter(p => p.confidence >= this.confidenceThreshold).length,
            last_training_file: this.trainingDataPath
        };
    }
    
    /**
     * Reset all training data
     */
    reset() {
        this.trainingData = [];
        this.learnedPatterns.clear();
        this.saveTrainingData();
        console.log('🔄 Training data reset');
    }
}

module.exports = ControlLearningService;


