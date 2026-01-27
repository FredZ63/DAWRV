/**
 * Studio Vocabulary Storage Module
 * =================================
 * Handles loading, saving, and versioning of studio vocabulary entries.
 * Stores data at ~/Library/Application Support/DAWRV/vocabulary.json
 */

class StudioVocabularyStorage {
    constructor() {
        this.SCHEMA_VERSION = 1;
        this.items = [];
        this.loaded = false;
        this.listeners = [];
        
        // Categories enum
        this.CATEGORIES = [
            'General',
            'Vocals',
            'Drums',
            'Bass',
            'Mix Bus',
            'Master',
            'Sound Design',
            'Arrangement',
            'Effects'
        ];
        
        // Intent types
        this.INTENT_TYPES = ['vibe', 'action'];
        
        // Sentiments
        this.SENTIMENTS = ['positive', 'neutral', 'negative'];
        
        // Clarification rules
        this.CLARIFICATION_RULES = ['neverAsk', 'askIfAmbiguous', 'alwaysAsk'];
        
        // Action targets
        this.ACTION_TARGETS = [
            'selectedTrack',
            'master',
            'focusedUIElement',
            'transport',
            'region/markers'
        ];
        
        // Action types
        this.ACTION_TYPES = [
            'reaperAction',
            'reaperScript',
            'fxChain',
            'parameterDelta'
        ];
    }
    
    /**
     * Initialize storage - load from disk
     */
    async initialize() {
        try {
            await this.load();
            this.loaded = true;
            console.log('📚 Studio Vocabulary initialized:', this.items.length, 'entries');
        } catch (e) {
            console.warn('⚠️ Could not load vocabulary, starting fresh:', e);
            this.items = [];
            this.loaded = true;
        }
    }
    
    /**
     * Load vocabulary from disk via IPC
     */
    async load() {
        if (window.dawrv && window.dawrv.vocabulary) {
            const result = await window.dawrv.vocabulary.load();
            if (result.success && result.data) {
                this.migrateIfNeeded(result.data);
                this.items = result.data.items || [];
                return true;
            }
        }
        
        // Fallback: try localStorage
        try {
            const saved = localStorage.getItem('dawrv_studio_vocabulary');
            if (saved) {
                const data = JSON.parse(saved);
                this.migrateIfNeeded(data);
                this.items = data.items || [];
                return true;
            }
        } catch (e) {
            console.warn('localStorage fallback failed:', e);
        }
        
        // Load default pack if no saved data
        await this.loadDefaultPack();
        return true;
    }
    
    /**
     * Save vocabulary to disk via IPC
     */
    async save() {
        const data = {
            schemaVersion: this.SCHEMA_VERSION,
            lastModified: new Date().toISOString(),
            items: this.items
        };
        
        if (window.dawrv && window.dawrv.vocabulary) {
            const result = await window.dawrv.vocabulary.save(data);
            if (result.success) {
                console.log('✅ Vocabulary saved');
                this.notifyListeners('save');
                return true;
            }
        }
        
        // Fallback: localStorage
        try {
            localStorage.setItem('dawrv_studio_vocabulary', JSON.stringify(data));
            console.log('✅ Vocabulary saved to localStorage');
            this.notifyListeners('save');
            return true;
        } catch (e) {
            console.error('❌ Failed to save vocabulary:', e);
            return false;
        }
    }
    
    /**
     * Migrate old schema versions
     */
    migrateIfNeeded(data) {
        const version = data.schemaVersion || 0;
        
        if (version < 1) {
            // Future migrations go here
            data.schemaVersion = 1;
        }
    }
    
    /**
     * Load the default starter pack
     */
    async loadDefaultPack() {
        try {
            if (window.dawrv && window.dawrv.vocabulary) {
                const result = await window.dawrv.vocabulary.loadDefault();
                if (result.success && result.data) {
                    this.items = result.data.items || [];
                    await this.save();
                    return true;
                }
            }
        } catch (e) {
            console.warn('Could not load default pack:', e);
        }
        
        // Inline fallback defaults
        this.items = this.getInlineDefaults();
        await this.save();
        return true;
    }
    
    /**
     * Inline default vocabulary entries
     */
    getInlineDefaults() {
        return [
            {
                id: this.generateId(),
                phrase: "that's hot",
                category: "General",
                definition: "Expression of approval - the sound/mix is good",
                intentType: "vibe",
                sentiment: "positive",
                tags: ["approval", "fire"],
                clarificationRule: "neverAsk",
                actionMapping: { enabled: false, actions: [] }
            },
            {
                id: this.generateId(),
                phrase: "that's trash",
                category: "General",
                definition: "Expression of disapproval - needs work",
                intentType: "vibe",
                sentiment: "negative",
                tags: ["disapproval", "fix"],
                clarificationRule: "neverAsk",
                actionMapping: { enabled: false, actions: [] }
            },
            {
                id: this.generateId(),
                phrase: "make it slap",
                category: "Drums",
                definition: "Add punch and impact to the drums/beat",
                intentType: "action",
                sentiment: "positive",
                tags: ["punch", "impact", "drums"],
                clarificationRule: "askIfAmbiguous",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "comp", amount: 10, unit: "percent" },
                        confirmationText: "Adding some punch"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "tuck the vocal",
                category: "Vocals",
                definition: "Lower the vocal volume slightly to sit better in mix",
                intentType: "action",
                sentiment: "neutral",
                tags: ["vocal", "volume", "lower", "blend"],
                clarificationRule: "neverAsk",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "volume", amount: -1.5, unit: "db" },
                        confirmationText: "Tucked it back"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "bring it forward",
                category: "General",
                definition: "Make the element more prominent in the mix",
                intentType: "action",
                sentiment: "positive",
                tags: ["louder", "presence", "forward"],
                clarificationRule: "askIfAmbiguous",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "volume", amount: 1.5, unit: "db" },
                        confirmationText: "Brought it up"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "glue it",
                category: "Mix Bus",
                definition: "Apply bus compression to make elements cohesive",
                intentType: "action",
                sentiment: "neutral",
                tags: ["compression", "glue", "bus"],
                clarificationRule: "neverAsk",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "comp", amount: 15, unit: "percent" },
                        confirmationText: "Gluing it together"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "make it wider",
                category: "Sound Design",
                definition: "Increase stereo width",
                intentType: "action",
                sentiment: "positive",
                tags: ["stereo", "width", "wide"],
                clarificationRule: "neverAsk",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "width", amount: 15, unit: "percent" },
                        confirmationText: "Widening it out"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "tighten the drums",
                category: "Drums",
                definition: "Make drums more punchy and controlled",
                intentType: "action",
                sentiment: "neutral",
                tags: ["drums", "transient", "tight", "punch"],
                clarificationRule: "askIfAmbiguous",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "comp", amount: 12, unit: "percent" },
                        confirmationText: "Tightening up the drums"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "yo that's fire",
                category: "General",
                definition: "Strong approval - sounds great",
                intentType: "vibe",
                sentiment: "positive",
                tags: ["fire", "approval", "hype"],
                clarificationRule: "neverAsk",
                actionMapping: { enabled: false, actions: [] }
            },
            {
                id: this.generateId(),
                phrase: "that hits different",
                category: "General",
                definition: "Unique and impressive sound quality",
                intentType: "vibe",
                sentiment: "positive",
                tags: ["unique", "special", "impressive"],
                clarificationRule: "neverAsk",
                actionMapping: { enabled: false, actions: [] }
            },
            {
                id: this.generateId(),
                phrase: "add some sauce",
                category: "Effects",
                definition: "Add flavor/character - reverb, delay, saturation",
                intentType: "action",
                sentiment: "positive",
                tags: ["effect", "flavor", "character"],
                clarificationRule: "alwaysAsk",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "reverb", amount: 8, unit: "percent" },
                        confirmationText: "Adding some sauce"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "push the low end",
                category: "Bass",
                definition: "Increase bass frequencies",
                intentType: "action",
                sentiment: "neutral",
                tags: ["bass", "low", "sub"],
                clarificationRule: "askIfAmbiguous",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "eq", amount: 2, unit: "db" },
                        confirmationText: "Pushing the lows"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "take the edge off",
                category: "General",
                definition: "Reduce harshness in high frequencies",
                intentType: "action",
                sentiment: "neutral",
                tags: ["harsh", "bright", "smooth"],
                clarificationRule: "neverAsk",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "eq", amount: -2, unit: "db" },
                        confirmationText: "Smoothing it out"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "needs more air",
                category: "Vocals",
                definition: "Boost high frequencies for presence/breathiness",
                intentType: "action",
                sentiment: "neutral",
                tags: ["air", "presence", "high", "bright"],
                clarificationRule: "neverAsk",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "eq", amount: 1.5, unit: "db" },
                        confirmationText: "Adding some air"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "crush it",
                category: "Effects",
                definition: "Apply heavy compression/limiting",
                intentType: "action",
                sentiment: "neutral",
                tags: ["compression", "limit", "squash"],
                clarificationRule: "askIfAmbiguous",
                actionMapping: {
                    enabled: true,
                    actions: [{
                        target: "selectedTrack",
                        type: "parameterDelta",
                        payload: { paramName: "comp", amount: 25, unit: "percent" },
                        confirmationText: "Crushing it"
                    }]
                }
            },
            {
                id: this.generateId(),
                phrase: "say less",
                category: "General",
                definition: "Acknowledgment - I understand, will do",
                intentType: "vibe",
                sentiment: "neutral",
                tags: ["acknowledge", "confirm"],
                clarificationRule: "neverAsk",
                actionMapping: { enabled: false, actions: [] }
            }
        ];
    }
    
    /**
     * Generate unique ID
     */
    generateId() {
        return 'vocab_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // ========================================================================
    // CRUD OPERATIONS
    // ========================================================================
    
    /**
     * Get all entries
     */
    getAll() {
        return [...this.items];
    }
    
    /**
     * Get entry by ID
     */
    getById(id) {
        return this.items.find(item => item.id === id);
    }
    
    /**
     * Get entries by category
     */
    getByCategory(category) {
        return this.items.filter(item => item.category === category);
    }
    
    /**
     * Search entries
     */
    search(query) {
        if (!query) return this.getAll();
        
        const lower = query.toLowerCase();
        return this.items.filter(item => 
            item.phrase.toLowerCase().includes(lower) ||
            item.definition.toLowerCase().includes(lower) ||
            item.category.toLowerCase().includes(lower) ||
            (item.tags && item.tags.some(t => t.toLowerCase().includes(lower)))
        );
    }
    
    /**
     * Add new entry
     */
    async add(entry) {
        const newEntry = {
            id: this.generateId(),
            phrase: entry.phrase || '',
            category: entry.category || 'General',
            definition: entry.definition || '',
            intentType: entry.intentType || 'vibe',
            sentiment: entry.sentiment || 'neutral',
            tags: entry.tags || [],
            clarificationRule: entry.clarificationRule || 'neverAsk',
            actionMapping: entry.actionMapping || { enabled: false, actions: [] }
        };
        
        this.items.push(newEntry);
        await this.save();
        this.notifyListeners('add', newEntry);
        return newEntry;
    }
    
    /**
     * Update entry
     */
    async update(id, updates) {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) return null;
        
        this.items[index] = { ...this.items[index], ...updates };
        await this.save();
        this.notifyListeners('update', this.items[index]);
        return this.items[index];
    }
    
    /**
     * Delete entry
     */
    async delete(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) return false;
        
        const deleted = this.items.splice(index, 1)[0];
        await this.save();
        this.notifyListeners('delete', deleted);
        return true;
    }
    
    // ========================================================================
    // IMPORT / EXPORT
    // ========================================================================
    
    /**
     * Export vocabulary as JSON
     */
    exportPack() {
        return {
            name: 'Studio Vocabulary Pack',
            version: '1.0',
            schemaVersion: this.SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            itemCount: this.items.length,
            items: this.items
        };
    }
    
    /**
     * Import vocabulary from JSON
     */
    async importPack(packData, merge = true) {
        try {
            if (!packData || !packData.items) {
                throw new Error('Invalid pack format');
            }
            
            const importedItems = packData.items.map(item => ({
                ...item,
                id: this.generateId() // Generate new IDs to avoid conflicts
            }));
            
            if (merge) {
                // Merge: add new items, skip duplicates by phrase
                const existingPhrases = new Set(this.items.map(i => i.phrase.toLowerCase()));
                const newItems = importedItems.filter(item => 
                    !existingPhrases.has(item.phrase.toLowerCase())
                );
                this.items.push(...newItems);
                console.log(`📥 Imported ${newItems.length} new entries (${importedItems.length - newItems.length} duplicates skipped)`);
            } else {
                // Replace all
                this.items = importedItems;
                console.log(`📥 Imported ${importedItems.length} entries (replaced all)`);
            }
            
            await this.save();
            this.notifyListeners('import');
            return { success: true, count: importedItems.length };
        } catch (e) {
            console.error('❌ Import failed:', e);
            return { success: false, error: e.message };
        }
    }
    
    /**
     * Reset to defaults
     */
    async resetToDefaults() {
        this.items = this.getInlineDefaults();
        await this.save();
        this.notifyListeners('reset');
    }
    
    // ========================================================================
    // LISTENERS
    // ========================================================================
    
    /**
     * Add change listener
     */
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    /**
     * Remove listener
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }
    
    /**
     * Notify all listeners
     */
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (e) {
                console.warn('Listener error:', e);
            }
        });
    }
}

// Global instance
window.studioVocabularyStorage = new StudioVocabularyStorage();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudioVocabularyStorage;
}
