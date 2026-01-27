/**
 * Static Knowledge Loader
 * ========================
 * Loads the reaper-knowledge.json file and provides search functionality
 * for RHEA's AI agent to answer questions about REAPER.
 */

class StaticKnowledgeLoader {
    constructor() {
        this.knowledge = null;
        this.entries = [];
        this.loaded = false;
        
        // Auto-load on instantiation
        this.load();
    }
    
    /**
     * Load knowledge from JSON file
     */
    async load() {
        try {
            let loaded = false;
            
            // Method 1: Use IPC to load from main process (most reliable in Electron)
            if (window.dawrv && window.dawrv.knowledge && window.dawrv.knowledge.load) {
                try {
                    console.log('📚 Loading knowledge via IPC...');
                    const result = await window.dawrv.knowledge.load();
                    if (result && result.success && result.data) {
                        this.knowledge = result.data;
                        loaded = true;
                        console.log('📚 Knowledge loaded via IPC');
                    }
                } catch (e) {
                    console.warn('📚 IPC load failed:', e);
                }
            }
            
            // Method 2: Try Node.js fs (works in Electron with nodeIntegration)
            if (!loaded && typeof require !== 'undefined') {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    
                    // Get the app directory - handle both dev and production
                    let appDir = process.cwd();
                    
                    // Try multiple potential paths
                    const possiblePaths = [
                        path.join(appDir, 'knowledge', 'reaper-knowledge.json'),
                        path.join(appDir, 'src', 'knowledge', 'reaper-knowledge.json'),
                        path.join(appDir, '..', 'knowledge', 'reaper-knowledge.json')
                    ];
                    
                    for (const knowledgePath of possiblePaths) {
                        try {
                            if (fs.existsSync(knowledgePath)) {
                                const content = fs.readFileSync(knowledgePath, 'utf8');
                                this.knowledge = JSON.parse(content);
                                loaded = true;
                                console.log('📚 Loaded knowledge from:', knowledgePath);
                                break;
                            }
                        } catch (e) {
                            // Try next path
                        }
                    }
                } catch (e) {
                    console.log('📚 Node.js fs not available, trying fetch...');
                }
            }
            
            // Method 3: Try fetch (fallback for dev/browser)
            if (!loaded) {
                const fetchPaths = [
                    'knowledge/reaper-knowledge.json',
                    '../knowledge/reaper-knowledge.json',
                    '../../knowledge/reaper-knowledge.json'
                ];
                
                for (const fetchPath of fetchPaths) {
                    try {
                        const response = await fetch(fetchPath);
                        if (response.ok) {
                            this.knowledge = await response.json();
                            loaded = true;
                            console.log('📚 Loaded knowledge via fetch from:', fetchPath);
                            break;
                        }
                    } catch (e) {
                        // Try next path
                    }
                }
            }
            
            if (this.knowledge) {
                this.indexEntries();
                this.loaded = true;
                console.log('📚 Static knowledge loaded:', {
                    categories: this.knowledge.categories?.length || 0,
                    entries: this.entries.length
                });
            } else {
                console.warn('⚠️ Could not load reaper-knowledge.json');
            }
        } catch (error) {
            console.error('❌ Failed to load knowledge:', error);
        }
    }
    
    /**
     * Index all entries for fast searching
     */
    indexEntries() {
        this.entries = [];
        
        if (!this.knowledge?.categories) return;
        
        for (const category of this.knowledge.categories) {
            for (const entry of category.entries || []) {
                this.entries.push({
                    category: category.name,
                    topic: entry.topic,
                    content: entry.content,
                    steps: entry.steps,
                    tips: entry.tips,
                    methods: entry.methods,
                    shortcuts: entry.shortcuts,
                    commands: entry.commands,
                    // Create searchable text
                    searchText: [
                        entry.topic,
                        entry.content,
                        ...(entry.steps || []),
                        ...(entry.tips || []),
                        ...(entry.methods || []),
                        category.name
                    ].join(' ').toLowerCase()
                });
            }
        }
    }
    
    /**
     * Search knowledge base
     * @param {string} query - Search query
     * @param {number} maxResults - Maximum results to return
     * @returns {Array} Matching entries
     */
    search(query, maxResults = 5) {
        if (!this.loaded || !query) return [];
        
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
        
        // Score each entry
        const scored = this.entries.map(entry => {
            let score = 0;
            
            // Exact topic match (highest priority)
            if (entry.topic.toLowerCase().includes(queryLower)) {
                score += 100;
            }
            
            // Category match
            if (entry.category.toLowerCase().includes(queryLower)) {
                score += 50;
            }
            
            // Word matches in searchText
            for (const word of queryWords) {
                if (entry.searchText.includes(word)) {
                    score += 10;
                }
            }
            
            // Boost for specific keywords
            const boostWords = ['how', 'what', 'where', 'when', 'why', 'can', 'do', 'set', 'create', 'add', 'remove', 'change'];
            for (const word of boostWords) {
                if (queryLower.includes(word) && entry.searchText.includes(word)) {
                    score += 5;
                }
            }
            
            return { entry, score };
        });
        
        // Sort by score and return top results
        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map(s => s.entry);
    }
    
    /**
     * Get formatted context for AI
     * @param {string} query - User's question
     * @returns {string} Formatted knowledge context
     */
    getContext(query) {
        const results = this.search(query, 3);
        
        if (results.length === 0) {
            return '';
        }
        
        let context = '\n\n--- REAPER Knowledge Base ---\n';
        
        for (const entry of results) {
            context += `\n**${entry.topic}** (${entry.category})\n`;
            context += entry.content + '\n';
            
            if (entry.steps?.length) {
                context += 'Steps: ' + entry.steps.join(' → ') + '\n';
            }
            
            if (entry.tips?.length) {
                context += 'Tips: ' + entry.tips.slice(0, 2).join('; ') + '\n';
            }
            
            if (entry.shortcuts) {
                const shortcuts = Object.entries(entry.shortcuts)
                    .slice(0, 3)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');
                context += 'Shortcuts: ' + shortcuts + '\n';
            }
        }
        
        return context;
    }
    
    /**
     * Get all categories
     */
    getCategories() {
        return this.knowledge?.categories?.map(c => c.name) || [];
    }
    
    /**
     * Get entries by category
     */
    getByCategory(categoryName) {
        return this.entries.filter(e => 
            e.category.toLowerCase() === categoryName.toLowerCase()
        );
    }
    
    /**
     * Get a quick answer (first matching entry's content)
     */
    quickAnswer(query) {
        const results = this.search(query, 1);
        if (results.length > 0) {
            return results[0].content;
        }
        return null;
    }
}

// Global instance
window.staticKnowledge = new StaticKnowledgeLoader();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StaticKnowledgeLoader;
}
