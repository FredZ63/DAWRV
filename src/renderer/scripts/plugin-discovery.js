/**
 * Plugin Discovery Module (Renderer Process)
 * Uses IPC to communicate with main process for plugin discovery
 */

class PluginDiscovery {
    constructor() {
        this.isInitialized = false;
        this.plugins = [];
        this.counts = { total: 0, vst: 0, vst3: 0, au: 0, js: 0 };
    }

    /**
     * Initialize plugin discovery - SIMPLE VERSION
     * Just calls one IPC handler that returns everything
     */
    async initialize() {
        if (this.isInitialized) {
            return { success: true, message: 'Already initialized' };
        }

        if (!window.plugins) {
            console.warn('⚠️  Plugin API not available - plugin discovery disabled');
            return { success: false, error: 'Plugin API not available' };
        }

        // Simple single call - get all plugins at once
        try {
            const result = await window.plugins.getAll();
            if (result && result.success) {
                this.plugins = result.plugins || [];
                this.counts = result.counts || { total: 0, vst: 0, vst3: 0, au: 0, js: 0 };
                this.isInitialized = true;
                console.log(`✅ Plugin discovery initialized: ${this.plugins.length} plugins found`);
                return { 
                    success: true, 
                    message: `Found ${this.plugins.length} plugins`,
                    counts: this.counts
                };
            }
            return { success: false, error: result?.error || 'Unknown error' };
        } catch (error) {
            const errorMsg = error.message || error.toString();
            console.warn('⚠️  Plugin discovery failed (non-critical):', errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Refresh plugin list - SIMPLE VERSION
     * Just re-initialize (calls the same single handler)
     */
    async refreshPlugins() {
        // Just re-initialize - it's the same call
        await this.initialize();
    }

    /**
     * Get all plugins - SIMPLE VERSION
     * Just return cached plugins (already loaded in initialize)
     */
    getAllPlugins() {
        return this.plugins || [];
    }

    /**
     * Get plugins by type - SIMPLE VERSION
     * Filter cached plugins
     */
    getPluginsByType(type) {
        return (this.plugins || []).filter(p => p.type === type);
    }

    /**
     * Search plugins by name - SIMPLE VERSION
     * Filter cached plugins (no IPC call needed)
     */
    searchPlugins(query) {
        const allPlugins = this.plugins || [];
        const queryLower = query.toLowerCase();
        return allPlugins.filter(plugin => 
            plugin.name.toLowerCase().includes(queryLower) ||
            plugin.displayName.toLowerCase().includes(queryLower)
        );
    }

    /**
     * Get plugin info - SIMPLE VERSION
     * Search cached plugins
     */
    getPluginInfo(pluginName) {
        const allPlugins = this.plugins || [];
        return allPlugins.find(p => 
            p.name.toLowerCase() === pluginName.toLowerCase() ||
            p.displayName.toLowerCase() === pluginName.toLowerCase()
        ) || null;
    }

    /**
     * Get plugin counts - SIMPLE VERSION
     * Return cached counts
     */
    getCounts() {
        if (!this.counts) {
            return { total: 0, counts: { vst: 0, vst3: 0, au: 0, js: 0 } };
        }
        return {
            total: this.counts.total || 0,
            counts: {
                vst: this.counts.vst || 0,
                vst3: this.counts.vst3 || 0,
                au: this.counts.au || 0,
                js: this.counts.js || 0
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PluginDiscovery;
}

