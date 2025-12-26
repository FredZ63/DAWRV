/**
 * ATLAS Patch Database Manager
 * Manages patch storage, retrieval, and organization using SQLite
 */

let Database = null;
let sqliteLoadError = null;
try {
    // Optional dependency (native). If unavailable, we fall back to JSON storage.
    Database = require('better-sqlite3');
} catch (err) {
    sqliteLoadError = err;
    Database = null;
}
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
let APP_VERSION = '1.0.0-beta.1';
try {
    // patch-database.js is at atlas/core/patch-database.js
    // ../package.json resolves to atlas/package.json (and works inside app.asar when packaged)
    APP_VERSION = require('../package.json').version || APP_VERSION;
} catch {
    // ignore and keep fallback
}

class PatchDatabase {
    constructor(dbPath = null) {
        // Default database location in user's home directory
        this.dbPath = dbPath || path.join(
            process.env.HOME || process.env.USERPROFILE,
            '.dawrv',
            'atlas',
            'patches.db'
        );

        // JSON fallback storage (used when SQLite backend is unavailable)
        this.jsonPath = path.join(path.dirname(this.dbPath), 'patches.json');
        this.backend = Database ? 'sqlite' : 'json';
        this.patches = [];
        this.plugins = [];
        this.knowledgeDocs = [];
        this.patchSets = [];
        this.patchSetItems = [];
        this.ftsAvailable = false;
        
        this.db = null;
        this.initialized = false;
    }
    
    /**
     * Initialize database and create tables
     */
    async initialize() {
        if (this.initialized) {
            return { success: true, message: 'Database already initialized' };
        }
        
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            if (this.backend === 'sqlite') {
                // Open database
                this.db = new Database(this.dbPath);

                // Create tables
                this.createTables();

                this.initialized = true;
                console.log(`✅ ATLAS database initialized (SQLite): ${this.dbPath}`);

                return { success: true, message: 'Database initialized successfully (SQLite)' };
            }

            // JSON fallback
            if (sqliteLoadError) {
                console.warn('⚠️  SQLite backend unavailable, falling back to JSON storage.');
                console.warn(`   Reason: ${sqliteLoadError.message}`);
            } else {
                console.warn('⚠️  SQLite backend unavailable, falling back to JSON storage.');
            }

            // Load existing JSON if present
            if (fs.existsSync(this.jsonPath)) {
                try {
                    const raw = fs.readFileSync(this.jsonPath, 'utf8');
                    const parsed = JSON.parse(raw || '{}');
                    this.patches = Array.isArray(parsed.patches) ? parsed.patches : [];
                    this.plugins = Array.isArray(parsed.plugins) ? parsed.plugins : [];
                    this.knowledgeDocs = Array.isArray(parsed.knowledgeDocs) ? parsed.knowledgeDocs : [];
                    this.patchSets = Array.isArray(parsed.patchSets) ? parsed.patchSets : [];
                    this.patchSetItems = Array.isArray(parsed.patchSetItems) ? parsed.patchSetItems : [];
                    this.vendorCache = parsed.vendorCache && typeof parsed.vendorCache === 'object' ? parsed.vendorCache : {};
                } catch (e) {
                    console.warn('⚠️  Failed to read JSON patch library, starting fresh:', e.message);
                    this.patches = [];
                    this.plugins = [];
                    this.knowledgeDocs = [];
                    this.patchSets = [];
                    this.patchSetItems = [];
                    this.vendorCache = {};
                }
            } else {
                this.patches = [];
                this.plugins = [];
                this.knowledgeDocs = [];
                this.patchSets = [];
                this.patchSetItems = [];
                this.vendorCache = {};
                this.persistJson();
            }

            this.initialized = true;
            console.log(`✅ ATLAS database initialized (JSON): ${this.jsonPath}`);
            return { success: true, message: 'Database initialized successfully (JSON fallback)', backend: 'json' };
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Persist JSON fallback store to disk
     */
    persistJson() {
        try {
            const data = {
                version: APP_VERSION,
                updated: new Date().toISOString(),
                patches: this.patches,
                plugins: this.plugins || [],
                knowledgeDocs: this.knowledgeDocs || [],
                patchSets: this.patchSets || [],
                patchSetItems: this.patchSetItems || [],
                vendorCache: this.vendorCache || {}
            };
            fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.warn('⚠️  Failed to persist JSON patch library:', e.message);
        }
    }
    
    /**
     * Create database tables
     */
    createTables() {
        // Patches table (supports both hardware and plugin presets)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS patches (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                device TEXT NOT NULL,
                manufacturer TEXT,
                category TEXT,
                tags TEXT,
                sysex BLOB,
                parameters TEXT,
                projectId TEXT,
                lastUsed INTEGER,
                rating INTEGER DEFAULT 0,
                waveform TEXT,
                created INTEGER NOT NULL,
                modified INTEGER NOT NULL,
                patchType TEXT DEFAULT 'hardware',
                pluginId TEXT,
                pluginName TEXT,
                pluginType TEXT,
                pluginPath TEXT,
                genre TEXT,
                mood TEXT,
                tempoRange TEXT,
                complexity TEXT
            )
        `);
        
        // Add metadata columns if they don't exist (migration support)
        try {
            this.db.exec(`ALTER TABLE patches ADD COLUMN genre TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            this.db.exec(`ALTER TABLE patches ADD COLUMN mood TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            this.db.exec(`ALTER TABLE patches ADD COLUMN tempoRange TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            this.db.exec(`ALTER TABLE patches ADD COLUMN complexity TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        
        // Devices table (hardware MIDI devices)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                manufacturer TEXT,
                model TEXT,
                midiChannel INTEGER,
                portId TEXT,
                template TEXT,
                connected INTEGER DEFAULT 0,
                lastSeen INTEGER,
                created INTEGER NOT NULL
            )
        `);
        
        // Plugins table (VST/AU plugins)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS plugins (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT,
                manufacturer TEXT,
                path TEXT NOT NULL,
                iconPath TEXT,
                presetCount INTEGER DEFAULT 0,
                lastScanned INTEGER,
                created INTEGER NOT NULL
            )
        `);

        // Vendor cache (online enrichment results)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS vendor_cache (
                key TEXT PRIMARY KEY,
                manufacturer TEXT,
                sourceUrl TEXT,
                confidence REAL,
                updated INTEGER NOT NULL
            )
        `);
        
        // Projects table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                reaperProjectPath TEXT,
                patchSet TEXT,
                lastOpened INTEGER,
                created INTEGER NOT NULL
            )
        `);

        // Patch Sets (Bundles/Groups) for devices
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS patch_sets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                device TEXT NOT NULL,
                description TEXT,
                created INTEGER NOT NULL,
                modified INTEGER NOT NULL
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS patch_set_items (
                setId TEXT NOT NULL,
                patchId TEXT NOT NULL,
                orderIndex INTEGER DEFAULT 0,
                created INTEGER NOT NULL,
                PRIMARY KEY(setId, patchId)
            )
        `);

        // Knowledge base documents (manuals, manufacturer docs, notes)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS knowledge_docs (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                source TEXT,
                pluginId TEXT,
                pluginName TEXT,
                manufacturer TEXT,
                docType TEXT,
                tags TEXT,
                content TEXT NOT NULL,
                created INTEGER NOT NULL,
                modified INTEGER NOT NULL
            )
        `);
        
        // Create indices for faster searches
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_patches_device ON patches(device);
            CREATE INDEX IF NOT EXISTS idx_patches_category ON patches(category);
            CREATE INDEX IF NOT EXISTS idx_patches_lastUsed ON patches(lastUsed);
            CREATE INDEX IF NOT EXISTS idx_patches_projectId ON patches(projectId);
            CREATE INDEX IF NOT EXISTS idx_knowledge_docs_pluginName ON knowledge_docs(pluginName);
            CREATE INDEX IF NOT EXISTS idx_knowledge_docs_modified ON knowledge_docs(modified);
            CREATE INDEX IF NOT EXISTS idx_patch_sets_device ON patch_sets(device);
            CREATE INDEX IF NOT EXISTS idx_patch_set_items_set ON patch_set_items(setId);
            CREATE INDEX IF NOT EXISTS idx_vendor_cache_updated ON vendor_cache(updated);
        `);

        // Optional FTS (if SQLite build supports it)
        try {
            this.db.exec(`
                CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_docs_fts USING fts5(
                    id,
                    title,
                    content,
                    tags,
                    pluginName,
                    manufacturer,
                    docType
                )
            `);
            this.ftsAvailable = true;
        } catch (e) {
            this.ftsAvailable = false;
        }
        
        // Migrate existing databases - add missing columns if they don't exist
        this.migrateDatabase();
        
        console.log('✅ Database tables created');
    }
    
    /**
     * Migrate database schema - add missing columns to existing databases
     */
    migrateDatabase() {
        try {
            // Migrate patches table
            const patchesColumnsToAdd = [
                { name: 'patchType', type: 'TEXT DEFAULT "hardware"' },
                { name: 'pluginId', type: 'TEXT' },
                { name: 'pluginName', type: 'TEXT' },
                { name: 'pluginType', type: 'TEXT' },
                { name: 'pluginPath', type: 'TEXT' },
                { name: 'genre', type: 'TEXT' },
                { name: 'mood', type: 'TEXT' },
                { name: 'tempoRange', type: 'TEXT' },
                { name: 'complexity', type: 'TEXT' }
            ];
            
            // Get existing columns for patches table
            const patchesTableInfo = this.db.prepare("PRAGMA table_info(patches)").all();
            const patchesExistingColumns = new Set(patchesTableInfo.map(col => col.name));
            
            // Add missing columns to patches table
            for (const col of patchesColumnsToAdd) {
                if (!patchesExistingColumns.has(col.name)) {
                    try {
                        this.db.exec(`ALTER TABLE patches ADD COLUMN ${col.name} ${col.type}`);
                        console.log(`✅ Added column to patches table: ${col.name}`);
                    } catch (err) {
                        console.warn(`⚠️  Could not add column ${col.name} to patches:`, err.message);
                    }
                }
            }
            
            // Migrate plugins table
            const pluginsColumnsToAdd = [
                { name: 'category', type: 'TEXT' },
                { name: 'iconPath', type: 'TEXT' }
            ];
            
            // Get existing columns for plugins table
            const pluginsTableInfo = this.db.prepare("PRAGMA table_info(plugins)").all();
            const pluginsExistingColumns = new Set(pluginsTableInfo.map(col => col.name));
            
            // Add missing columns to plugins table
            for (const col of pluginsColumnsToAdd) {
                if (!pluginsExistingColumns.has(col.name)) {
                    try {
                        this.db.exec(`ALTER TABLE plugins ADD COLUMN ${col.name} ${col.type}`);
                        console.log(`✅ Added column to plugins table: ${col.name}`);
                    } catch (err) {
                        console.warn(`⚠️  Could not add column ${col.name} to plugins:`, err.message);
                    }
                }
            }

            // Knowledge docs table (create if missing)
            try {
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS knowledge_docs (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        source TEXT,
                        pluginId TEXT,
                        pluginName TEXT,
                        manufacturer TEXT,
                        docType TEXT,
                        tags TEXT,
                        content TEXT NOT NULL,
                        created INTEGER NOT NULL,
                        modified INTEGER NOT NULL
                    )
                `);
            } catch (e) {
                // ignore
            }

            // Optional FTS
            try {
                this.db.exec(`
                    CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_docs_fts USING fts5(
                        id,
                        title,
                        content,
                        tags,
                        pluginName,
                        manufacturer,
                        docType
                    )
                `);
                this.ftsAvailable = true;
            } catch (e) {
                this.ftsAvailable = false;
            }

            // Normalize plugin preset patch categories so they never show as "Uncategorized"
            // (Many plugins/packs don't have enough info for Lead/Bass/Pad detection.)
            try {
                this.db.exec(`
                    UPDATE patches
                    SET category = 'Plugin Preset'
                    WHERE patchType = 'plugin'
                      AND (category IS NULL OR TRIM(category) = '' OR category = 'Uncategorized')
                `);
            } catch (e) {
                // ignore
            }
            
            console.log('✅ Database migration complete');
        } catch (error) {
            console.error('❌ Database migration error:', error);
        }
    }

    saveKnowledgeDoc(doc) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized' };
            }

            const id = doc.id || this.generateId();
            const now = Date.now();
            const normalized = {
                id,
                title: doc.title || 'Untitled',
                source: doc.source || null,
                pluginId: doc.pluginId || null,
                pluginName: doc.pluginName || null,
                manufacturer: doc.manufacturer || null,
                docType: doc.docType || null,
                tags: Array.isArray(doc.tags) ? doc.tags : (doc.tags ? [String(doc.tags)] : []),
                content: doc.content || '',
                created: doc.created || now,
                modified: now
            };

            if (!normalized.content || normalized.content.trim().length === 0) {
                return { success: false, error: 'Knowledge document content is empty' };
            }

            if (this.backend === 'sqlite') {
                this.db.prepare(`
                    INSERT OR REPLACE INTO knowledge_docs
                    (id, title, source, pluginId, pluginName, manufacturer, docType, tags, content, created, modified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    normalized.id,
                    normalized.title,
                    normalized.source,
                    normalized.pluginId,
                    normalized.pluginName,
                    normalized.manufacturer,
                    normalized.docType,
                    JSON.stringify(normalized.tags),
                    normalized.content,
                    normalized.created,
                    normalized.modified
                );

                if (this.ftsAvailable) {
                    try {
                        this.db.prepare(`
                            INSERT OR REPLACE INTO knowledge_docs_fts
                            (id, title, content, tags, pluginName, manufacturer, docType)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `).run(
                            normalized.id,
                            normalized.title,
                            normalized.content,
                            normalized.tags.join(' '),
                            normalized.pluginName || '',
                            normalized.manufacturer || '',
                            normalized.docType || ''
                        );
                    } catch (e) {
                        // ignore
                    }
                }

                return { success: true, id: normalized.id };
            }

            const idx = (this.knowledgeDocs || []).findIndex(d => d.id === normalized.id);
            if (idx >= 0) this.knowledgeDocs[idx] = normalized;
            else this.knowledgeDocs.push(normalized);
            this.persistJson();
            return { success: true, id: normalized.id };
        } catch (error) {
            console.error('❌ Save knowledge doc error:', error);
            return { success: false, error: error.message };
        }
    }

    listKnowledgeDocs(limit = 200) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized', docs: [] };
            }

            if (this.backend === 'sqlite') {
                const rows = this.db.prepare(`
                    SELECT id, title, source, pluginId, pluginName, manufacturer, docType, tags, created, modified
                    FROM knowledge_docs
                    ORDER BY modified DESC
                    LIMIT ?
                `).all(limit);
                const docs = rows.map(r => ({ ...r, tags: r.tags ? JSON.parse(r.tags) : [] }));
                return { success: true, docs };
            }

            const docs = (this.knowledgeDocs || [])
                .slice()
                .sort((a, b) => (b.modified || 0) - (a.modified || 0))
                .slice(0, limit);
            return { success: true, docs };
        } catch (error) {
            console.error('❌ List knowledge docs error:', error);
            return { success: false, error: error.message, docs: [] };
        }
    }

    deleteKnowledgeDoc(id) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized' };
            }

            if (this.backend === 'sqlite') {
                const result = this.db.prepare('DELETE FROM knowledge_docs WHERE id = ?').run(id);
                if (this.ftsAvailable) {
                    try {
                        this.db.prepare('DELETE FROM knowledge_docs_fts WHERE id = ?').run(id);
                    } catch (e) {
                        // ignore
                    }
                }
                return { success: true, deleted: result.changes };
            }

            const before = (this.knowledgeDocs || []).length;
            this.knowledgeDocs = (this.knowledgeDocs || []).filter(d => d.id !== id);
            const deleted = before - this.knowledgeDocs.length;
            this.persistJson();
            return { success: true, deleted };
        } catch (error) {
            console.error('❌ Delete knowledge doc error:', error);
            return { success: false, error: error.message };
        }
    }

    searchKnowledge(q, limit = 5) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized', results: [] };
            }

            const query = String(q || '').trim();
            if (!query) return { success: true, results: [] };

            if (this.backend === 'sqlite') {
                if (this.ftsAvailable) {
                    try {
                        const rows = this.db.prepare(`
                            SELECT id, title,
                                   snippet(knowledge_docs_fts, 2, '[', ']', '…', 12) AS excerpt
                            FROM knowledge_docs_fts
                            WHERE knowledge_docs_fts MATCH ?
                            LIMIT ?
                        `).all(query.replace(/"/g, '""'), limit);
                        return { success: true, results: rows };
                    } catch (e) {
                        // fall back
                    }
                }

                const like = `%${query}%`;
                const rows = this.db.prepare(`
                    SELECT id, title, substr(content, 1, 400) AS excerpt
                    FROM knowledge_docs
                    WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? OR pluginName LIKE ? OR manufacturer LIKE ?
                    ORDER BY modified DESC
                    LIMIT ?
                `).all(like, like, like, like, like, limit);
                return { success: true, results: rows };
            }

            const needle = query.toLowerCase();
            const results = (this.knowledgeDocs || [])
                .filter(d =>
                    String(d.title || '').toLowerCase().includes(needle) ||
                    String(d.content || '').toLowerCase().includes(needle) ||
                    (d.tags || []).some(t => String(t).toLowerCase().includes(needle)) ||
                    String(d.pluginName || '').toLowerCase().includes(needle) ||
                    String(d.manufacturer || '').toLowerCase().includes(needle)
                )
                .sort((a, b) => (b.modified || 0) - (a.modified || 0))
                .slice(0, limit)
                .map(d => ({ id: d.id, title: d.title, excerpt: String(d.content || '').slice(0, 400) }));
            return { success: true, results };
        } catch (error) {
            console.error('❌ Search knowledge error:', error);
            return { success: false, error: error.message, results: [] };
        }
    }
    
    /**
     * Generate UUID
     */
    generateId() {
        return crypto.randomUUID();
    }
    
    /**
     * Save a patch
     */
    savePatch(patchData) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized' };
            }

            const id = patchData.id || this.generateId();
            const now = Date.now();

            if (this.backend === 'sqlite') {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO patches 
                (id, name, device, manufacturer, category, tags, sysex, parameters, 
                 projectId, lastUsed, rating, waveform, created, modified,
                 patchType, pluginId, pluginName, pluginType, pluginPath,
                 genre, mood, tempoRange, complexity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                id,
                patchData.name,
                patchData.device,
                patchData.manufacturer || null,
                patchData.category || 'Uncategorized',
                patchData.tags ? JSON.stringify(patchData.tags) : null,
                patchData.sysex || null,
                patchData.parameters ? JSON.stringify(patchData.parameters) : null,
                patchData.projectId || null,
                patchData.lastUsed || now,
                patchData.rating || 0,
                patchData.waveform || null,
                patchData.created || now,
                now,
                patchData.patchType || 'hardware',
                patchData.pluginId || null,
                patchData.pluginName || null,
                patchData.pluginType || null,
                patchData.pluginPath || null,
                patchData.genre || null,
                patchData.mood || null,
                patchData.tempoRange || null,
                patchData.complexity || null
            );
            } else {
                const normalized = {
                    id,
                    name: patchData.name,
                    device: patchData.device,
                    manufacturer: patchData.manufacturer || null,
                    category: patchData.category || 'Uncategorized',
                    tags: Array.isArray(patchData.tags) ? patchData.tags : (patchData.tags ? [String(patchData.tags)] : []),
                    sysex: patchData.sysex || null,
                    parameters: patchData.parameters || null,
                    projectId: patchData.projectId || null,
                    lastUsed: patchData.lastUsed || now,
                    rating: patchData.rating || 0,
                    waveform: patchData.waveform || null,
                    created: patchData.created || now,
                    modified: now,
                    patchType: patchData.patchType || 'hardware',
                    pluginId: patchData.pluginId || null,
                    pluginName: patchData.pluginName || null,
                    pluginType: patchData.pluginType || null,
                    pluginPath: patchData.pluginPath || null,
                    genre: patchData.genre || null,
                    mood: patchData.mood || null,
                    tempoRange: patchData.tempoRange || null,
                    complexity: patchData.complexity || null
                };

                const idx = this.patches.findIndex(p => p.id === id);
                if (idx >= 0) this.patches[idx] = normalized;
                else this.patches.push(normalized);
                this.persistJson();
            }
            
            console.log(`✅ Patch saved: ${patchData.name} (${id})`);
            
            return { success: true, id, message: 'Patch saved successfully' };
        } catch (error) {
            console.error('❌ Save patch error:', error);
            console.error('   Error details:', {
                message: error.message,
                stack: error.stack,
                patchName: patchData.name,
                backend: this.backend
            });
            return { success: false, error: error.message, details: error.stack };
        }
    }
    
    /**
     * Get patch by ID
     */
    getPatch(id) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized' };
            }

            if (this.backend === 'sqlite') {
                const stmt = this.db.prepare('SELECT * FROM patches WHERE id = ?');
                const patch = stmt.get(id);

                if (!patch) {
                    return { success: false, error: 'Patch not found' };
                }

                // Parse JSON fields
                if (patch.tags) patch.tags = JSON.parse(patch.tags);
                if (patch.parameters) patch.parameters = JSON.parse(patch.parameters);

                return { success: true, patch };
            }

            const patch = this.patches.find(p => p.id === id);
            if (!patch) return { success: false, error: 'Patch not found' };
            return { success: true, patch };
        } catch (error) {
            console.error('❌ Get patch error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Search patches
     */
    searchPatches(query) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized', patches: [] };
            }

            if (this.backend === 'sqlite') {
                let sql = 'SELECT * FROM patches WHERE 1=1';
                const params = [];

                if (query.name) {
                    sql += ' AND name LIKE ?';
                    params.push(`%${query.name}%`);
                }

                if (query.device) {
                    sql += ' AND device = ?';
                    params.push(query.device);
                }

                if (query.category) {
                    sql += ' AND category = ?';
                    params.push(query.category);
                }

                if (query.projectId) {
                    sql += ' AND projectId = ?';
                    params.push(query.projectId);
                }

                if (query.tags) {
                    sql += ' AND tags LIKE ?';
                    params.push(`%${query.tags}%`);
                }

                // Additional filters (Phase 1 intelligence / library retrieval)
                if (query.patchType) {
                    sql += ' AND patchType = ?';
                    params.push(query.patchType);
                }
                if (query.pluginId) {
                    sql += ' AND pluginId = ?';
                    params.push(query.pluginId);
                }
                if (Array.isArray(query.pluginIds) && query.pluginIds.length) {
                    const ids = query.pluginIds.map(x => String(x)).filter(Boolean);
                    if (ids.length) {
                        sql += ` AND pluginId IN (${ids.map(() => '?').join(',')})`;
                        params.push(...ids);
                    }
                }
                if (query.pluginName) {
                    sql += ' AND pluginName LIKE ?';
                    params.push(`%${query.pluginName}%`);
                }
                if (Array.isArray(query.pluginNames) && query.pluginNames.length) {
                    const names = query.pluginNames.map(x => String(x)).filter(Boolean);
                    if (names.length) {
                        sql += ` AND pluginName IN (${names.map(() => '?').join(',')})`;
                        params.push(...names);
                    }
                }
                if (query.pluginType) {
                    sql += ' AND pluginType = ?';
                    params.push(query.pluginType);
                }
                if (query.genre) {
                    sql += ' AND genre = ?';
                    params.push(query.genre);
                }
                if (query.mood) {
                    sql += ' AND mood = ?';
                    params.push(query.mood);
                }
                if (query.tempoRange) {
                    sql += ' AND tempoRange = ?';
                    params.push(query.tempoRange);
                }
                if (query.complexity) {
                    sql += ' AND complexity = ?';
                    params.push(query.complexity);
                }

                sql += ' ORDER BY lastUsed DESC';

                if (query.limit) {
                    sql += ' LIMIT ?';
                    params.push(query.limit);
                }

                const stmt = this.db.prepare(sql);
                const patches = stmt.all(...params);

                // Parse JSON fields
                patches.forEach(patch => {
                    if (patch.tags) patch.tags = JSON.parse(patch.tags);
                    if (patch.parameters) patch.parameters = JSON.parse(patch.parameters);
                });

                return { success: true, patches, count: patches.length };
            }

            const q = query || {};
            let results = this.patches.slice();

            if (q.name) {
                const needle = String(q.name).toLowerCase();
                results = results.filter(p => String(p.name || '').toLowerCase().includes(needle));
            }
            if (q.device) {
                results = results.filter(p => p.device === q.device);
            }
            if (q.category) {
                results = results.filter(p => p.category === q.category);
            }
            if (q.projectId) {
                results = results.filter(p => p.projectId === q.projectId);
            }
            if (q.tags) {
                const tagNeedle = String(q.tags).toLowerCase();
                results = results.filter(p => (p.tags || []).some(t => String(t).toLowerCase().includes(tagNeedle)));
            }
            if (q.patchType) {
                results = results.filter(p => (p.patchType || 'hardware') === q.patchType);
            }
            if (q.pluginId) {
                results = results.filter(p => p.pluginId === q.pluginId);
            }
            if (Array.isArray(q.pluginIds) && q.pluginIds.length) {
                const set = new Set(q.pluginIds.map(x => String(x)));
                results = results.filter(p => p.pluginId && set.has(String(p.pluginId)));
            }
            if (q.pluginName) {
                const pn = String(q.pluginName).toLowerCase();
                results = results.filter(p => String(p.pluginName || '').toLowerCase().includes(pn));
            }
            if (Array.isArray(q.pluginNames) && q.pluginNames.length) {
                const set = new Set(q.pluginNames.map(x => String(x)));
                results = results.filter(p => p.pluginName && set.has(String(p.pluginName)));
            }
            if (q.pluginType) {
                results = results.filter(p => p.pluginType === q.pluginType);
            }
            if (q.genre) {
                results = results.filter(p => p.genre === q.genre);
            }
            if (q.mood) {
                results = results.filter(p => p.mood === q.mood);
            }
            if (q.tempoRange) {
                results = results.filter(p => p.tempoRange === q.tempoRange);
            }
            if (q.complexity) {
                results = results.filter(p => p.complexity === q.complexity);
            }

            results.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

            if (q.limit) {
                results = results.slice(0, q.limit);
            }

            return { success: true, patches: results, count: results.length };
        } catch (error) {
            console.error('❌ Search patches error:', error);
            return { success: false, error: error.message, patches: [] };
        }
    }
    
    /**
     * Delete patch
     */
    deletePatch(id) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized' };
            }

            if (this.backend === 'sqlite') {
                const stmt = this.db.prepare('DELETE FROM patches WHERE id = ?');
                const result = stmt.run(id);

                if (result.changes === 0) {
                    return { success: false, error: 'Patch not found' };
                }

                console.log(`✅ Patch deleted: ${id}`);
                return { success: true, message: 'Patch deleted successfully' };
            }

            const before = this.patches.length;
            this.patches = this.patches.filter(p => p.id !== id);
            const after = this.patches.length;
            if (before === after) return { success: false, error: 'Patch not found' };
            this.persistJson();
            console.log(`✅ Patch deleted: ${id}`);
            return { success: true, message: 'Patch deleted successfully' };
        } catch (error) {
            console.error('❌ Delete patch error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete ALL patches (dangerous)
     */
    deleteAllPatches() {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized' };
            }

            if (this.backend === 'sqlite') {
                // Patch Sets depend on patches; clear them too to avoid dangling references
                try { this.db.exec('DELETE FROM patch_set_items'); } catch { /* ignore */ }
                try { this.db.exec('DELETE FROM patch_sets'); } catch { /* ignore */ }
                const stmt = this.db.prepare('DELETE FROM patches');
                const result = stmt.run();
                console.log(`🧹 Cleared patch library (${result.changes} patches removed)`);
                return { success: true, deleted: result.changes };
            }

            const deleted = this.patches.length;
            this.patches = [];
            this.patchSetItems = [];
            this.patchSets = [];
            this.persistJson();
            console.log(`🧹 Cleared patch library (${deleted} patches removed)`);
            return { success: true, deleted };
        } catch (error) {
            console.error('❌ Delete all patches error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Update patch last used time
     */
    updateLastUsed(id) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized' };
            }

            if (this.backend === 'sqlite') {
                const stmt = this.db.prepare('UPDATE patches SET lastUsed = ? WHERE id = ?');
                stmt.run(Date.now(), id);
                return { success: true };
            }

            const idx = this.patches.findIndex(p => p.id === id);
            if (idx < 0) return { success: false, error: 'Patch not found' };
            this.patches[idx].lastUsed = Date.now();
            this.patches[idx].modified = Date.now();
            this.persistJson();
            return { success: true };
        } catch (error) {
            console.error('❌ Update last used error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get all categories
     */
    getCategories() {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized', categories: [] };
            }

            if (this.backend === 'sqlite') {
                const stmt = this.db.prepare('SELECT DISTINCT category FROM patches ORDER BY category');
                const categories = stmt.all().map(row => row.category);
                return { success: true, categories };
            }

            const categories = Array.from(new Set(this.patches.map(p => p.category).filter(Boolean))).sort();
            return { success: true, categories };
        } catch (error) {
            console.error('❌ Get categories error:', error);
            return { success: false, error: error.message, categories: [] };
        }
    }
    
    /**
     * Get all devices with patches
     */
    getDevicesWithPatches() {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized', devices: [] };
            }

            if (this.backend === 'sqlite') {
                const stmt = this.db.prepare(`
                    SELECT device, COUNT(*) as count 
                    FROM patches 
                    GROUP BY device 
                    ORDER BY device
                `);
                const devices = stmt.all();
                return { success: true, devices };
            }

            const counts = new Map();
            for (const p of this.patches) {
                const key = p.device || 'Unknown';
                counts.set(key, (counts.get(key) || 0) + 1);
            }
            const devices = Array.from(counts.entries())
                .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                .map(([device, count]) => ({ device, count }));
            return { success: true, devices };
        } catch (error) {
            console.error('❌ Get devices error:', error);
            return { success: false, error: error.message, devices: [] };
        }
    }
    
    /**
     * Export patches to JSON
     */
    exportPatches(deviceName = null) {
        try {
            let query = { limit: null };
            if (deviceName) {
                query.device = deviceName;
            }
            
            const result = this.searchPatches(query);
            
            if (!result.success) {
                return result;
            }
            
            const exportData = {
                version: APP_VERSION,
                exported: new Date().toISOString(),
                device: deviceName || 'all',
                patches: result.patches
            };
            
            return { success: true, data: exportData };
        } catch (error) {
            console.error('❌ Export patches error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Import patches from JSON
     */
    importPatches(exportData) {
        try {
            let imported = 0;
            let errors = 0;
            
            for (const patch of exportData.patches) {
                const result = this.savePatch(patch);
                if (result.success) {
                    imported++;
                } else {
                    errors++;
                    console.error(`Failed to import patch: ${patch.name}`);
                }
            }
            
            console.log(`✅ Imported ${imported} patches (${errors} errors)`);
            
            return { 
                success: true, 
                imported, 
                errors,
                message: `Imported ${imported} patches` 
            };
        } catch (error) {
            console.error('❌ Import patches error:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================
    // Patch Sets (Bundles/Groups)
    // =========================

    createPatchSet({ name, device, description = '' }) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized' };
            const id = this.generateId();
            const now = Date.now();
            const set = { id, name: String(name || 'New Set'), device: String(device || 'Unknown'), description: description || '', created: now, modified: now };

            if (this.backend === 'sqlite') {
                this.db.prepare(`
                    INSERT INTO patch_sets (id, name, device, description, created, modified)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(set.id, set.name, set.device, set.description || null, set.created, set.modified);
                return { success: true, set };
            }

            this.patchSets.push(set);
            this.persistJson();
            return { success: true, set };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    listPatchSets(device) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized', sets: [] };
            const dev = String(device || '');

            if (this.backend === 'sqlite') {
                const rows = this.db.prepare(`
                    SELECT id, name, device, description, created, modified
                    FROM patch_sets
                    WHERE device = ?
                    ORDER BY modified DESC
                `).all(dev);
                return { success: true, sets: rows };
            }

            const sets = (this.patchSets || [])
                .filter(s => String(s.device) === dev)
                .slice()
                .sort((a, b) => (b.modified || 0) - (a.modified || 0));
            return { success: true, sets };
        } catch (error) {
            return { success: false, error: error.message, sets: [] };
        }
    }

    getPatchSetItems(setId) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized', patches: [] };
            const id = String(setId || '');
            if (!id) return { success: false, error: 'Missing setId', patches: [] };

            if (this.backend === 'sqlite') {
                const rows = this.db.prepare(`
                    SELECT p.*
                    FROM patch_set_items i
                    JOIN patches p ON p.id = i.patchId
                    WHERE i.setId = ?
                    ORDER BY i.orderIndex ASC, i.created ASC
                `).all(id);
                rows.forEach(patch => {
                    if (patch.tags) patch.tags = JSON.parse(patch.tags);
                    if (patch.parameters) patch.parameters = JSON.parse(patch.parameters);
                });
                return { success: true, patches: rows };
            }

            const items = (this.patchSetItems || [])
                .filter(i => i.setId === id)
                .slice()
                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            const patches = items
                .map(i => this.patches.find(p => p.id === i.patchId))
                .filter(Boolean);
            return { success: true, patches };
        } catch (error) {
            return { success: false, error: error.message, patches: [] };
        }
    }

    addPatchesToSet(setId, patchIds = []) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized' };
            const id = String(setId || '');
            const ids = Array.isArray(patchIds) ? patchIds.map(String).filter(Boolean) : [];
            if (!id) return { success: false, error: 'Missing setId' };
            if (ids.length === 0) return { success: true, added: 0 };

            const now = Date.now();

            if (this.backend === 'sqlite') {
                const maxRow = this.db.prepare('SELECT MAX(orderIndex) as maxOrder FROM patch_set_items WHERE setId = ?').get(id);
                let order = Number(maxRow?.maxOrder || 0);
                const stmt = this.db.prepare(`
                    INSERT OR IGNORE INTO patch_set_items (setId, patchId, orderIndex, created)
                    VALUES (?, ?, ?, ?)
                `);
                let added = 0;
                for (const pid of ids) {
                    order += 1;
                    const res = stmt.run(id, pid, order, now);
                    if (res.changes) added += 1;
                }
                this.db.prepare('UPDATE patch_sets SET modified = ? WHERE id = ?').run(now, id);
                return { success: true, added };
            }

            let max = 0;
            for (const it of (this.patchSetItems || []).filter(i => i.setId === id)) {
                max = Math.max(max, Number(it.orderIndex || 0));
            }
            let order = max;
            let added = 0;
            for (const pid of ids) {
                const exists = (this.patchSetItems || []).some(i => i.setId === id && i.patchId === pid);
                if (exists) continue;
                order += 1;
                this.patchSetItems.push({ setId: id, patchId: pid, orderIndex: order, created: now });
                added += 1;
            }
            const sIdx = (this.patchSets || []).findIndex(s => s.id === id);
            if (sIdx >= 0) this.patchSets[sIdx].modified = now;
            this.persistJson();
            return { success: true, added };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    removePatchFromSet(setId, patchId) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized' };
            const sid = String(setId || '');
            const pid = String(patchId || '');
            if (!sid || !pid) return { success: false, error: 'Missing setId/patchId' };

            const now = Date.now();
            if (this.backend === 'sqlite') {
                const res = this.db.prepare('DELETE FROM patch_set_items WHERE setId = ? AND patchId = ?').run(sid, pid);
                this.db.prepare('UPDATE patch_sets SET modified = ? WHERE id = ?').run(now, sid);
                return { success: true, deleted: res.changes };
            }

            const before = (this.patchSetItems || []).length;
            this.patchSetItems = (this.patchSetItems || []).filter(i => !(i.setId === sid && i.patchId === pid));
            const deleted = before - this.patchSetItems.length;
            const sIdx = (this.patchSets || []).findIndex(s => s.id === sid);
            if (sIdx >= 0) this.patchSets[sIdx].modified = now;
            this.persistJson();
            return { success: true, deleted };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    updatePatchSet(setId, { name, description } = {}) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized' };
            const id = String(setId || '');
            if (!id) return { success: false, error: 'Missing setId' };
            const now = Date.now();

            const newName = (name !== undefined) ? String(name || '').trim() : undefined;
            const newDesc = (description !== undefined) ? String(description || '') : undefined;
            if (newName !== undefined && !newName) return { success: false, error: 'Set name cannot be empty' };

            if (this.backend === 'sqlite') {
                const row = this.db.prepare('SELECT id, name, device, description, created, modified FROM patch_sets WHERE id = ?').get(id);
                if (!row) return { success: false, error: 'Set not found' };
                const finalName = newName !== undefined ? newName : row.name;
                const finalDesc = newDesc !== undefined ? newDesc : (row.description || '');
                this.db.prepare('UPDATE patch_sets SET name = ?, description = ?, modified = ? WHERE id = ?')
                    .run(finalName, finalDesc || null, now, id);
                return { success: true, set: { ...row, name: finalName, description: finalDesc, modified: now } };
            }

            const idx = (this.patchSets || []).findIndex(s => s.id === id);
            if (idx < 0) return { success: false, error: 'Set not found' };
            if (newName !== undefined) this.patchSets[idx].name = newName;
            if (newDesc !== undefined) this.patchSets[idx].description = newDesc;
            this.patchSets[idx].modified = now;
            this.persistJson();
            return { success: true, set: this.patchSets[idx] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    deletePatchSet(setId) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized' };
            const id = String(setId || '');
            if (!id) return { success: false, error: 'Missing setId' };

            if (this.backend === 'sqlite') {
                // manual cascade
                const tx = this.db.transaction(() => {
                    this.db.prepare('DELETE FROM patch_set_items WHERE setId = ?').run(id);
                    const res = this.db.prepare('DELETE FROM patch_sets WHERE id = ?').run(id);
                    return res.changes;
                });
                const deleted = tx();
                return { success: true, deleted };
            }

            const before = (this.patchSets || []).length;
            this.patchSets = (this.patchSets || []).filter(s => s.id !== id);
            this.patchSetItems = (this.patchSetItems || []).filter(i => i.setId !== id);
            this.persistJson();
            return { success: true, deleted: before - this.patchSets.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    reorderPatchSetItems(setId, orderedPatchIds = []) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized' };
            const id = String(setId || '');
            const ids = Array.isArray(orderedPatchIds) ? orderedPatchIds.map(String).filter(Boolean) : [];
            if (!id) return { success: false, error: 'Missing setId' };
            if (ids.length === 0) return { success: true, updated: 0 };

            const now = Date.now();

            if (this.backend === 'sqlite') {
                const tx = this.db.transaction(() => {
                    const update = this.db.prepare('UPDATE patch_set_items SET orderIndex = ? WHERE setId = ? AND patchId = ?');
                    let updated = 0;
                    for (let i = 0; i < ids.length; i++) {
                        const pid = ids[i];
                        const res = update.run(i + 1, id, pid);
                        if (res.changes) updated += 1;
                    }
                    this.db.prepare('UPDATE patch_sets SET modified = ? WHERE id = ?').run(now, id);
                    return updated;
                });
                const updated = tx();
                return { success: true, updated };
            }

            // JSON fallback: only reorder items that exist for this set
            const idxByPatchId = new Map();
            for (let i = 0; i < ids.length; i++) idxByPatchId.set(ids[i], i + 1);
            let updated = 0;
            for (const it of (this.patchSetItems || []).filter(i => i.setId === id)) {
                const newOrder = idxByPatchId.get(it.patchId);
                if (newOrder !== undefined) {
                    it.orderIndex = newOrder;
                    updated += 1;
                }
            }
            const sIdx = (this.patchSets || []).findIndex(s => s.id === id);
            if (sIdx >= 0) this.patchSets[sIdx].modified = now;
            this.persistJson();
            return { success: true, updated };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    exportPatchSet(setId) {
        try {
            if (!this.initialized) return { success: false, error: 'Database not initialized' };
            const id = String(setId || '');
            if (!id) return { success: false, error: 'Missing setId' };

            let set = null;
            if (this.backend === 'sqlite') {
                set = this.db.prepare('SELECT id, name, device, description, created, modified FROM patch_sets WHERE id = ?').get(id) || null;
            } else {
                set = (this.patchSets || []).find(s => s.id === id) || null;
            }
            if (!set) return { success: false, error: 'Set not found' };

            const items = this.getPatchSetItems(id);
            if (!items.success) return items;

            // Make export portable: include sysex as base64 if present
            const patches = (items.patches || []).map(p => {
                const out = { ...p };
                if (out.sysex && Buffer.isBuffer(out.sysex)) {
                    out.sysex = out.sysex.toString('base64');
                    out.sysexEncoding = 'base64';
                }
                return out;
            });

            const exportData = {
                kind: 'atlas-patch-set',
                version: APP_VERSION,
                exported: new Date().toISOString(),
                set,
                patches
            };

            return { success: true, data: exportData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Save plugin to database
     */
    savePlugin(pluginData) {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized' };
            }

            if (this.backend === 'sqlite') {
                const now = Date.now();
                const stmt = this.db.prepare(`
                    INSERT OR REPLACE INTO plugins 
                    (id, name, type, category, manufacturer, path, iconPath, presetCount, lastScanned, created)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                stmt.run(
                    pluginData.id,
                    pluginData.name,
                    pluginData.type,
                    pluginData.category || 'unknown',
                    pluginData.manufacturer || null,
                    pluginData.path,
                    pluginData.iconPath || null,
                    pluginData.presetCount || 0,
                    now,
                    pluginData.created || now
                );
                
                console.log(`✅ Plugin saved: ${pluginData.name} (${pluginData.type})`);
                return { success: true, id: pluginData.id };
            }

            // JSON fallback - store in a separate plugins array
            if (!this.plugins) this.plugins = [];
            const idx = this.plugins.findIndex(p => p.id === pluginData.id);
            if (idx >= 0) {
                this.plugins[idx] = { ...pluginData, modified: Date.now() };
            } else {
                this.plugins.push({ ...pluginData, created: Date.now(), modified: Date.now() });
            }
            this.persistJson();
            return { success: true, id: pluginData.id };
        } catch (error) {
            console.error('❌ Save plugin error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Override / fix plugin manufacturer (vendor) in the plugins table
     */
    setPluginManufacturer(pluginId, manufacturer) {
        try {
            const pid = String(pluginId || '').trim();
            if (!pid) return { success: false, error: 'Missing pluginId' };
            if (!this.initialized) return { success: false, error: 'Database not initialized' };

            const m = String(manufacturer || '').trim() || 'Unknown';
            const now = Date.now();

            if (this.backend === 'sqlite') {
                const stmt = this.db.prepare('UPDATE plugins SET manufacturer = ?, lastScanned = ? WHERE id = ?');
                const info = stmt.run(m, now, pid);
                return { success: true, updated: info.changes || 0 };
            }

            // JSON fallback
            if (!this.plugins) this.plugins = [];
            const idx = this.plugins.findIndex(p => String(p.id) === pid);
            if (idx < 0) return { success: false, error: 'Plugin not found' };
            this.plugins[idx] = { ...this.plugins[idx], manufacturer: m, modified: now };
            this.persistJson();
            return { success: true, updated: 1 };
        } catch (error) {
            console.error('❌ Set plugin manufacturer error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all plugins
     */
    getPlugins() {
        try {
            if (!this.initialized) {
                return { success: false, error: 'Database not initialized', plugins: [] };
            }

            if (this.backend === 'sqlite') {
                const stmt = this.db.prepare('SELECT * FROM plugins ORDER BY name');
                const plugins = stmt.all();
                return { success: true, plugins };
            }

            return { success: true, plugins: this.plugins || [] };
        } catch (error) {
            console.error('❌ Get plugins error:', error);
            return { success: false, error: error.message, plugins: [] };
        }
    }

    getVendorCache(key) {
        try {
            const k = String(key || '').trim();
            if (!k) return { success: true, value: null };
            if (!this.initialized) return { success: false, error: 'Database not initialized', value: null };

            if (this.backend === 'sqlite') {
                const row = this.db.prepare('SELECT key, manufacturer, sourceUrl, confidence, updated FROM vendor_cache WHERE key = ?').get(k) || null;
                return { success: true, value: row };
            }

            const hit = (this.vendorCache || {})[k] || null;
            return { success: true, value: hit ? { key: k, ...hit } : null };
        } catch (e) {
            return { success: false, error: e.message, value: null };
        }
    }

    saveVendorCache({ key, manufacturer, sourceUrl = null, confidence = 0.5 } = {}) {
        try {
            const k = String(key || '').trim();
            if (!k) return { success: false, error: 'Missing key' };
            if (!this.initialized) return { success: false, error: 'Database not initialized' };
            const now = Date.now();
            const m = String(manufacturer || '').trim() || null;
            const u = sourceUrl ? String(sourceUrl) : null;
            const c = Number.isFinite(Number(confidence)) ? Number(confidence) : 0.5;

            if (this.backend === 'sqlite') {
                this.db.prepare(`
                    INSERT OR REPLACE INTO vendor_cache (key, manufacturer, sourceUrl, confidence, updated)
                    VALUES (?, ?, ?, ?, ?)
                `).run(k, m, u, c, now);
                return { success: true };
            }

            if (!this.vendorCache) this.vendorCache = {};
            this.vendorCache[k] = { manufacturer: m, sourceUrl: u, confidence: c, updated: now };
            this.persistJson();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.backend === 'sqlite' && this.db) {
            this.db.close();
            this.initialized = false;
            console.log('✅ ATLAS database closed');
        }

        if (this.backend === 'json') {
            this.persistJson();
            this.initialized = false;
            console.log('✅ ATLAS database closed (JSON)');
        }
    }
}

module.exports = PatchDatabase;
