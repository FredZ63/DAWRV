/**
 * ATLAS Patch Database Manager
 * Manages patch storage, retrieval, and organization using SQLite
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class PatchDatabase {
    constructor(dbPath = null) {
        // Default database location in user's home directory
        this.dbPath = dbPath || path.join(
            process.env.HOME || process.env.USERPROFILE,
            '.dawrv',
            'atlas',
            'patches.db'
        );
        
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
            
            // Open database
            this.db = new Database(this.dbPath);
            
            // Create tables
            this.createTables();
            
            this.initialized = true;
            console.log(`✅ ATLAS database initialized: ${this.dbPath}`);
            
            return { success: true, message: 'Database initialized successfully' };
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Create database tables
     */
    createTables() {
        // Patches table
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
                modified INTEGER NOT NULL
            )
        `);
        
        // Devices table
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
        
        // Create indices for faster searches
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_patches_device ON patches(device);
            CREATE INDEX IF NOT EXISTS idx_patches_category ON patches(category);
            CREATE INDEX IF NOT EXISTS idx_patches_lastUsed ON patches(lastUsed);
            CREATE INDEX IF NOT EXISTS idx_patches_projectId ON patches(projectId);
        `);
        
        console.log('✅ Database tables created');
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
            const id = patchData.id || this.generateId();
            const now = Date.now();
            
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO patches 
                (id, name, device, manufacturer, category, tags, sysex, parameters, 
                 projectId, lastUsed, rating, waveform, created, modified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                now
            );
            
            console.log(`✅ Patch saved: ${patchData.name} (${id})`);
            
            return { success: true, id, message: 'Patch saved successfully' };
        } catch (error) {
            console.error('❌ Save patch error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get patch by ID
     */
    getPatch(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM patches WHERE id = ?');
            const patch = stmt.get(id);
            
            if (!patch) {
                return { success: false, error: 'Patch not found' };
            }
            
            // Parse JSON fields
            if (patch.tags) patch.tags = JSON.parse(patch.tags);
            if (patch.parameters) patch.parameters = JSON.parse(patch.parameters);
            
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
            const stmt = this.db.prepare('DELETE FROM patches WHERE id = ?');
            const result = stmt.run(id);
            
            if (result.changes === 0) {
                return { success: false, error: 'Patch not found' };
            }
            
            console.log(`✅ Patch deleted: ${id}`);
            return { success: true, message: 'Patch deleted successfully' };
        } catch (error) {
            console.error('❌ Delete patch error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Update patch last used time
     */
    updateLastUsed(id) {
        try {
            const stmt = this.db.prepare('UPDATE patches SET lastUsed = ? WHERE id = ?');
            stmt.run(Date.now(), id);
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
            const stmt = this.db.prepare('SELECT DISTINCT category FROM patches ORDER BY category');
            const categories = stmt.all().map(row => row.category);
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
            const stmt = this.db.prepare(`
                SELECT device, COUNT(*) as count 
                FROM patches 
                GROUP BY device 
                ORDER BY device
            `);
            const devices = stmt.all();
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
                version: '1.0.0',
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
    
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.initialized = false;
            console.log('✅ ATLAS database closed');
        }
    }
}

module.exports = PatchDatabase;
