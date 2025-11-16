/**
 * Plugin Service (Main Process)
 * Scans file system for plugins and provides plugin information
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class PluginService {
    constructor() {
        this.plugins = {
            vst: [],
            vst3: [],
            au: [],
            js: []
        };
        this.pluginPaths = {
            vst: [],
            vst3: [],
            au: [],
            js: []
        };
        this.isInitialized = false;
    }

    /**
     * Initialize plugin discovery
     */
    async initialize() {
        if (this.isInitialized) {
            return { success: true, message: 'Already initialized' };
        }

        try {
            await this.discoverPluginPaths();
            await this.scanPlugins();
            
            this.isInitialized = true;
            return {
                success: true,
                message: `Found ${this.getTotalPluginCount()} plugins`,
                counts: {
                    vst: this.plugins.vst.length,
                    vst3: this.plugins.vst3.length,
                    au: this.plugins.au.length,
                    js: this.plugins.js.length
                }
            };
        } catch (error) {
            console.error('Plugin service initialization failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Discover standard plugin paths
     */
    async discoverPluginPaths() {
        const homeDir = os.homedir();
        
        // macOS standard paths
        const paths = {
            au: [
                '/Library/Audio/Plug-Ins/Components',
                path.join(homeDir, 'Library/Audio/Plug-Ins/Components')
            ],
            vst: [
                '/Library/Audio/Plug-Ins/VST',
                path.join(homeDir, 'Library/Audio/Plug-Ins/VST'),
                '/Library/Audio/Plug-Ins/VST (32bit)',
                path.join(homeDir, 'Library/Audio/Plug-Ins/VST (32bit)')
            ],
            vst3: [
                '/Library/Audio/Plug-Ins/VST3',
                path.join(homeDir, 'Library/Audio/Plug-Ins/VST3')
            ],
            js: [
                path.join(homeDir, 'Library/Application Support/REAPER/Effects'),
                path.join(homeDir, 'Library/Application Support/REAPER/Effects/JS')
            ]
        };

        // Check which paths exist
        for (const [type, typePaths] of Object.entries(paths)) {
            for (const p of typePaths) {
                try {
                    if (fs.existsSync(p)) {
                        this.pluginPaths[type].push(p);
                    }
                } catch (e) {
                    // Path doesn't exist, skip
                }
            }
        }

        return this.pluginPaths;
    }

    /**
     * Scan for plugins in discovered paths
     */
    async scanPlugins() {
        // Scan AU plugins
        for (const auPath of this.pluginPaths.au) {
            try {
                const files = fs.readdirSync(auPath);
                for (const file of files) {
                    const fullPath = path.join(auPath, file);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory() && file.endsWith('.component')) {
                        const pluginName = file.replace('.component', '');
                        this.plugins.au.push({
                            name: pluginName,
                            path: fullPath,
                            type: 'au',
                            displayName: pluginName
                        });
                    }
                }
            } catch (e) {
                console.warn(`Could not scan AU path ${auPath}:`, e.message);
            }
        }

        // Scan VST plugins
        for (const vstPath of this.pluginPaths.vst) {
            try {
                const files = fs.readdirSync(vstPath);
                for (const file of files) {
                    const fullPath = path.join(vstPath, file);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory() && file.endsWith('.vst')) {
                        const pluginName = file.replace('.vst', '');
                        this.plugins.vst.push({
                            name: pluginName,
                            path: fullPath,
                            type: 'vst',
                            displayName: pluginName
                        });
                    } else if (stat.isFile() && (file.endsWith('.so') || file.endsWith('.dylib'))) {
                        const pluginName = file.replace(/\.(so|dylib)$/, '');
                        this.plugins.vst.push({
                            name: pluginName,
                            path: fullPath,
                            type: 'vst',
                            displayName: pluginName
                        });
                    }
                }
            } catch (e) {
                console.warn(`Could not scan VST path ${vstPath}:`, e.message);
            }
        }

        // Scan VST3 plugins
        for (const vst3Path of this.pluginPaths.vst3) {
            try {
                const files = fs.readdirSync(vst3Path);
                for (const file of files) {
                    const fullPath = path.join(vst3Path, file);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory() && file.endsWith('.vst3')) {
                        const pluginName = file.replace('.vst3', '');
                        this.plugins.vst3.push({
                            name: pluginName,
                            path: fullPath,
                            type: 'vst3',
                            displayName: pluginName
                        });
                    }
                }
            } catch (e) {
                console.warn(`Could not scan VST3 path ${vst3Path}:`, e.message);
            }
        }

        // Scan JS plugins (REAPER JS effects)
        for (const jsPath of this.pluginPaths.js) {
            try {
                if (!fs.existsSync(jsPath)) continue;
                
                const files = fs.readdirSync(jsPath);
                for (const file of files) {
                    const fullPath = path.join(jsPath, file);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isFile() && file.endsWith('.js')) {
                        const pluginName = file.replace('.js', '');
                        this.plugins.js.push({
                            name: pluginName,
                            path: fullPath,
                            type: 'js',
                            displayName: pluginName
                        });
                    }
                }
            } catch (e) {
                console.warn(`Could not scan JS path ${jsPath}:`, e.message);
            }
        }
    }

    /**
     * Get all plugins
     */
    getAllPlugins() {
        return [
            ...this.plugins.au,
            ...this.plugins.vst,
            ...this.plugins.vst3,
            ...this.plugins.js
        ];
    }

    /**
     * Get plugins by type
     */
    getPluginsByType(type) {
        return this.plugins[type] || [];
    }

    /**
     * Search plugins by name
     */
    searchPlugins(query) {
        const allPlugins = this.getAllPlugins();
        const queryLower = query.toLowerCase();
        return allPlugins.filter(plugin => 
            plugin.name.toLowerCase().includes(queryLower) ||
            plugin.displayName.toLowerCase().includes(queryLower)
        );
    }

    /**
     * Get total plugin count
     */
    getTotalPluginCount() {
        return this.plugins.au.length + 
               this.plugins.vst.length + 
               this.plugins.vst3.length + 
               this.plugins.js.length;
    }

    /**
     * Get plugin info
     */
    getPluginInfo(pluginName) {
        const allPlugins = this.getAllPlugins();
        return allPlugins.find(p => 
            p.name.toLowerCase() === pluginName.toLowerCase() ||
            p.displayName.toLowerCase() === pluginName.toLowerCase()
        );
    }
}

module.exports = PluginService;

