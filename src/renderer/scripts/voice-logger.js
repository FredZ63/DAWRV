/**
 * Voice Command Logger
 * ====================
 * Persistent logging for voice commands:
 * - Timestamp, audio device, transcript, confidence
 * - Intent, target, executed action, latency
 * - Export to JSON/CSV
 * - Session-based organization
 */

class VoiceLogger {
    constructor(options = {}) {
        this.options = {
            storageKey: options.storageKey || 'dawrv_voice_log',
            maxEntries: options.maxEntries || 10000,
            sessionTimeout: options.sessionTimeout || 30 * 60 * 1000, // 30 minutes
            autoSave: options.autoSave !== false,
            ...options
        };
        
        // Current session
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.entries = [];
        
        // All sessions
        this.sessions = {};
        
        // Load from storage
        this.load();
        
        console.log('📝 Voice Logger initialized, session:', this.sessionId);
    }
    
    // ========================================================================
    // LOGGING
    // ========================================================================
    
    /**
     * Log a voice command event
     */
    log(eventType, data = {}) {
        const entry = {
            id: this.generateId(),
            timestamp: Date.now(),
            timestampISO: new Date().toISOString(),
            sessionId: this.sessionId,
            eventType,
            ...data
        };
        
        this.entries.push(entry);
        
        // Track in current session
        if (!this.sessions[this.sessionId]) {
            this.sessions[this.sessionId] = {
                id: this.sessionId,
                start: this.sessionStart,
                entries: []
            };
        }
        this.sessions[this.sessionId].entries.push(entry);
        
        // Prune if over limit
        if (this.entries.length > this.options.maxEntries) {
            this.entries = this.entries.slice(-this.options.maxEntries);
        }
        
        // Auto-save
        if (this.options.autoSave) {
            this.save();
        }
        
        return entry;
    }
    
    /**
     * Log a transcript event
     */
    logTranscript(transcript, confidence, audioDevice = null, duration = null) {
        return this.log('transcript', {
            transcript,
            confidence,
            audioDevice,
            durationMs: duration
        });
    }
    
    /**
     * Log an intent parsing event
     */
    logIntent(intent, transcript, parseTimeMs = null) {
        return this.log('intent', {
            intent: intent ? {
                type: intent.type,
                action: intent.action,
                track: intent.track,
                bar: intent.bar,
                delta: intent.delta,
                confidence: intent.confidence
            } : null,
            transcript,
            parseTimeMs
        });
    }
    
    /**
     * Log a command execution event
     */
    logExecution(intent, result, latencyMs) {
        return this.log('execution', {
            intent: intent ? {
                type: intent.type,
                action: intent.action,
                track: intent.track,
                readable: intent.readable
            } : null,
            result: result ? {
                success: result.success,
                error: result.error
            } : null,
            latencyMs
        });
    }
    
    /**
     * Log a state transition
     */
    logStateChange(fromState, toState, reason = null) {
        return this.log('state', {
            from: fromState,
            to: toState,
            reason
        });
    }
    
    /**
     * Log an error
     */
    logError(error, context = null) {
        return this.log('error', {
            error: typeof error === 'string' ? error : error.message,
            stack: error.stack || null,
            context
        });
    }
    
    /**
     * Log context update (hover/selection)
     */
    logContext(context) {
        return this.log('context', {
            activeTrack: context?.activeTrack,
            activeControl: context?.activeControl?.type,
            controlValue: context?.activeControl?.value
        });
    }
    
    // ========================================================================
    // QUERYING
    // ========================================================================
    
    /**
     * Get entries by type
     */
    getByType(eventType, limit = 100) {
        return this.entries
            .filter(e => e.eventType === eventType)
            .slice(-limit);
    }
    
    /**
     * Get entries in time range
     */
    getByTimeRange(startTime, endTime, limit = 1000) {
        return this.entries
            .filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
            .slice(0, limit);
    }
    
    /**
     * Get entries for current session
     */
    getCurrentSession() {
        return this.entries.filter(e => e.sessionId === this.sessionId);
    }
    
    /**
     * Get all sessions
     */
    getSessions() {
        const sessionMap = {};
        
        this.entries.forEach(entry => {
            if (!sessionMap[entry.sessionId]) {
                sessionMap[entry.sessionId] = {
                    id: entry.sessionId,
                    start: entry.timestamp,
                    end: entry.timestamp,
                    count: 0
                };
            }
            sessionMap[entry.sessionId].end = entry.timestamp;
            sessionMap[entry.sessionId].count++;
        });
        
        return Object.values(sessionMap).sort((a, b) => b.start - a.start);
    }
    
    /**
     * Get command statistics
     */
    getStats() {
        const transcripts = this.getByType('transcript', 10000);
        const executions = this.getByType('execution', 10000);
        const errors = this.getByType('error', 10000);
        
        const successfulExecs = executions.filter(e => e.result?.success);
        const failedExecs = executions.filter(e => !e.result?.success);
        
        const latencies = executions
            .filter(e => e.latencyMs)
            .map(e => e.latencyMs);
        
        const confidences = transcripts
            .filter(e => e.confidence)
            .map(e => e.confidence);
        
        return {
            totalTranscripts: transcripts.length,
            totalExecutions: executions.length,
            successfulExecutions: successfulExecs.length,
            failedExecutions: failedExecs.length,
            successRate: executions.length > 0 
                ? ((successfulExecs.length / executions.length) * 100).toFixed(1) + '%'
                : 'N/A',
            totalErrors: errors.length,
            avgLatencyMs: latencies.length > 0
                ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)
                : 'N/A',
            minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : null,
            maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : null,
            avgConfidence: confidences.length > 0
                ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2)
                : 'N/A',
            sessionCount: this.getSessions().length,
            currentSessionId: this.sessionId
        };
    }
    
    /**
     * Get most common commands
     */
    getMostCommonCommands(limit = 10) {
        const commandCounts = {};
        
        this.getByType('intent', 10000).forEach(entry => {
            if (entry.intent?.action) {
                const key = `${entry.intent.type}:${entry.intent.action}`;
                commandCounts[key] = (commandCounts[key] || 0) + 1;
            }
        });
        
        return Object.entries(commandCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([command, count]) => ({ command, count }));
    }
    
    /**
     * Get recent failures
     */
    getRecentFailures(limit = 10) {
        return this.getByType('execution', 1000)
            .filter(e => !e.result?.success)
            .slice(-limit)
            .map(e => ({
                timestamp: e.timestampISO,
                action: e.intent?.readable || e.intent?.action,
                error: e.result?.error
            }));
    }
    
    // ========================================================================
    // EXPORT
    // ========================================================================
    
    /**
     * Export as JSON
     */
    exportJSON(options = {}) {
        const data = {
            exportDate: new Date().toISOString(),
            stats: this.getStats(),
            entries: options.currentSessionOnly 
                ? this.getCurrentSession()
                : this.entries
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Export as CSV
     */
    exportCSV(options = {}) {
        const entries = options.currentSessionOnly 
            ? this.getCurrentSession()
            : this.entries;
        
        const headers = [
            'Timestamp',
            'Session ID',
            'Event Type',
            'Transcript',
            'Confidence',
            'Intent Type',
            'Action',
            'Track',
            'Success',
            'Latency (ms)',
            'Error'
        ];
        
        const rows = entries.map(e => {
            return [
                e.timestampISO,
                e.sessionId,
                e.eventType,
                e.transcript ? `"${e.transcript.replace(/"/g, '""')}"` : '',
                e.confidence?.toFixed(2) || '',
                e.intent?.type || '',
                e.intent?.action || '',
                e.intent?.track || '',
                e.result?.success !== undefined ? (e.result.success ? 'true' : 'false') : '',
                e.latencyMs || '',
                e.error || e.result?.error || ''
            ].join(',');
        });
        
        return [headers.join(','), ...rows].join('\n');
    }
    
    /**
     * Download as file
     */
    download(format = 'json', filename = null) {
        const content = format === 'csv' ? this.exportCSV() : this.exportJSON();
        const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
        const ext = format === 'csv' ? 'csv' : 'json';
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `dawrv_voice_log_${new Date().toISOString().slice(0, 10)}.${ext}`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    // ========================================================================
    // PERSISTENCE
    // ========================================================================
    
    /**
     * Save to localStorage
     */
    save() {
        try {
            // Only save last N entries to avoid quota issues
            const toSave = this.entries.slice(-this.options.maxEntries);
            localStorage.setItem(this.options.storageKey, JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save voice log:', e);
            // If quota exceeded, prune more aggressively
            if (e.name === 'QuotaExceededError') {
                this.entries = this.entries.slice(-1000);
                try {
                    localStorage.setItem(this.options.storageKey, JSON.stringify(this.entries));
                } catch (e2) {
                    console.error('Still failed after pruning:', e2);
                }
            }
        }
    }
    
    /**
     * Load from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                this.entries = JSON.parse(saved);
                console.log(`📝 Loaded ${this.entries.length} log entries`);
                
                // Check if we need a new session
                const lastEntry = this.entries[this.entries.length - 1];
                if (lastEntry && (Date.now() - lastEntry.timestamp) > this.options.sessionTimeout) {
                    this.sessionId = this.generateSessionId();
                    this.sessionStart = Date.now();
                    console.log(`📝 New session started: ${this.sessionId}`);
                } else if (lastEntry) {
                    this.sessionId = lastEntry.sessionId;
                }
            }
        } catch (e) {
            console.error('Failed to load voice log:', e);
            this.entries = [];
        }
    }
    
    /**
     * Clear all logs
     */
    clear() {
        this.entries = [];
        this.sessions = {};
        localStorage.removeItem(this.options.storageKey);
        console.log('📝 Voice log cleared');
    }
    
    /**
     * Clear logs older than specified time
     */
    pruneOlderThan(daysAgo) {
        const cutoff = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
        const before = this.entries.length;
        this.entries = this.entries.filter(e => e.timestamp >= cutoff);
        const pruned = before - this.entries.length;
        
        this.save();
        console.log(`📝 Pruned ${pruned} entries older than ${daysAgo} days`);
        return pruned;
    }
    
    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    generateSessionId() {
        return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
    }
    
    /**
     * Start a new session
     */
    newSession() {
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.log('session_start');
        console.log(`📝 New session: ${this.sessionId}`);
        return this.sessionId;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceLogger;
}

if (typeof window !== 'undefined') {
    window.VoiceLogger = VoiceLogger;
}
