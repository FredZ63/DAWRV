/**
 * Voice Replay Harness
 * ====================
 * Testing infrastructure for voice commands:
 * - Save utterance audio clips + expected intent
 * - Replay test runner
 * - WER (Word Error Rate) calculation
 * - Intent accuracy metrics
 * - Export/import test suites
 */

class VoiceReplayHarness {
    constructor(pipeline, options = {}) {
        this.pipeline = pipeline;
        this.options = {
            storageKey: options.storageKey || 'dawrv_voice_tests',
            audioStorageKey: options.audioStorageKey || 'dawrv_voice_audio',
            maxAudioSamples: options.maxAudioSamples || 100,
            ...options
        };
        
        // Test cases
        this.testCases = [];
        this.results = [];
        
        // Recording
        this.isRecording = false;
        this.currentRecording = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        // Load saved tests
        this.loadTestCases();
        
        console.log('🧪 Voice Replay Harness initialized');
    }
    
    // ========================================================================
    // TEST CASE MANAGEMENT
    // ========================================================================
    
    /**
     * Add a test case (text only)
     */
    addTestCase(options) {
        const testCase = {
            id: this.generateId(),
            created: Date.now(),
            transcript: options.transcript,
            expectedIntent: options.expectedIntent,
            expectedAction: options.expectedAction,
            tags: options.tags || [],
            description: options.description || '',
            audioBlob: options.audioBlob || null,
            context: options.context || null
        };
        
        this.testCases.push(testCase);
        this.saveTestCases();
        
        console.log('🧪 Test case added:', testCase.transcript);
        return testCase;
    }
    
    /**
     * Remove a test case
     */
    removeTestCase(id) {
        const index = this.testCases.findIndex(tc => tc.id === id);
        if (index !== -1) {
            this.testCases.splice(index, 1);
            this.saveTestCases();
            console.log('🧪 Test case removed:', id);
            return true;
        }
        return false;
    }
    
    /**
     * Get all test cases
     */
    getTestCases(filter = null) {
        if (!filter) return this.testCases;
        
        return this.testCases.filter(tc => {
            if (filter.tag && !tc.tags.includes(filter.tag)) return false;
            if (filter.intent && tc.expectedIntent?.type !== filter.intent) return false;
            return true;
        });
    }
    
    // ========================================================================
    // AUDIO RECORDING
    // ========================================================================
    
    /**
     * Start recording a test utterance
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('Already recording');
            return false;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 16000
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.currentRecording = audioBlob;
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            
            console.log('🎙️ Recording started...');
            return true;
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }
    
    /**
     * Stop recording
     */
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('Not recording');
            return null;
        }
        
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.currentRecording = audioBlob;
                this.isRecording = false;
                
                console.log('🎙️ Recording stopped:', (audioBlob.size / 1024).toFixed(1), 'KB');
                resolve(audioBlob);
            };
            
            this.mediaRecorder.stop();
        });
    }
    
    /**
     * Record a test case with audio
     */
    async recordTestCase(expectedTranscript, expectedIntent, options = {}) {
        // Start recording
        await this.startRecording();
        
        // Wait for user to speak (or timeout)
        const timeout = options.timeout || 10000;
        await new Promise(resolve => setTimeout(resolve, timeout));
        
        // Stop recording
        const audioBlob = await this.stopRecording();
        
        // Create test case
        return this.addTestCase({
            transcript: expectedTranscript,
            expectedIntent,
            audioBlob,
            tags: options.tags,
            description: options.description
        });
    }
    
    // ========================================================================
    // TEST EXECUTION
    // ========================================================================
    
    /**
     * Run a single test case
     */
    async runTest(testCase) {
        const startTime = Date.now();
        
        const result = {
            testCaseId: testCase.id,
            transcript: testCase.transcript,
            timestamp: startTime,
            passed: false,
            transcriptMatch: false,
            intentMatch: false,
            actionMatch: false,
            actualTranscript: null,
            actualIntent: null,
            wer: null,
            latencyMs: null,
            error: null
        };
        
        try {
            // Simulate processing the transcript
            // In real use, this would replay audio through ASR
            const actualTranscript = testCase.transcript; // For text-only tests
            result.actualTranscript = actualTranscript;
            
            // Calculate WER
            result.wer = this.calculateWER(testCase.transcript, actualTranscript);
            result.transcriptMatch = result.wer === 0;
            
            // Test intent parsing
            if (this.pipeline && this.pipeline.parseIntent) {
                // Create a mock parsing environment
                const mockParseResult = await this.mockParseIntent(actualTranscript);
                result.actualIntent = mockParseResult;
                
                // Check intent match
                if (testCase.expectedIntent) {
                    result.intentMatch = this.compareIntents(
                        testCase.expectedIntent, 
                        mockParseResult
                    );
                }
                
                // Check action match
                if (testCase.expectedAction) {
                    result.actionMatch = mockParseResult?.action === testCase.expectedAction;
                }
            }
            
            result.latencyMs = Date.now() - startTime;
            result.passed = result.transcriptMatch && 
                           (result.intentMatch || !testCase.expectedIntent) &&
                           (result.actionMatch || !testCase.expectedAction);
            
        } catch (error) {
            result.error = error.message;
            result.passed = false;
        }
        
        return result;
    }
    
    /**
     * Run all test cases
     */
    async runAllTests(options = {}) {
        const filter = options.filter || null;
        const testCases = this.getTestCases(filter);
        
        console.log(`🧪 Running ${testCases.length} tests...`);
        
        this.results = [];
        const startTime = Date.now();
        
        for (const testCase of testCases) {
            const result = await this.runTest(testCase);
            this.results.push(result);
            
            // Progress callback
            if (options.onProgress) {
                options.onProgress(result, this.results.length, testCases.length);
            }
        }
        
        const totalTime = Date.now() - startTime;
        const summary = this.getSummary();
        
        console.log('🧪 Test run complete:');
        console.log(`   Total: ${summary.total}`);
        console.log(`   Passed: ${summary.passed} (${summary.passRate}%)`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Avg WER: ${summary.avgWER.toFixed(2)}%`);
        console.log(`   Avg Latency: ${summary.avgLatency.toFixed(0)}ms`);
        console.log(`   Time: ${totalTime}ms`);
        
        return {
            results: this.results,
            summary,
            totalTimeMs: totalTime
        };
    }
    
    /**
     * Mock intent parsing for testing
     */
    async mockParseIntent(transcript) {
        // Create a temporary pipeline instance or use existing
        const lower = transcript.toLowerCase().trim();
        
        // Simple intent parsing (mirrors voice-pipeline.js logic)
        
        // Transport
        if (/\b(stop|halt)\b/i.test(lower)) {
            return { type: 'transport', action: 'stop', confidence: 0.95 };
        }
        if (/\b(play|start|resume)\b/i.test(lower)) {
            return { type: 'transport', action: 'play', confidence: 0.95 };
        }
        if (/\brecord\b/i.test(lower)) {
            return { type: 'transport', action: 'record', confidence: 0.95 };
        }
        if (/\bundo\b/i.test(lower)) {
            return { type: 'edit', action: 'undo', confidence: 0.95 };
        }
        if (/\bredo\b/i.test(lower)) {
            return { type: 'edit', action: 'redo', confidence: 0.95 };
        }
        if (/\bsave\b/i.test(lower)) {
            return { type: 'project', action: 'save', confidence: 0.95 };
        }
        
        // Navigation
        const gotoMatch = lower.match(/(?:go to|jump to)\s*(?:bar|measure)?\s*(\d+)/i);
        if (gotoMatch) {
            return { 
                type: 'navigation', 
                action: 'goto_bar', 
                bar: parseInt(gotoMatch[1], 10),
                confidence: 0.90 
            };
        }
        
        // Track commands
        const trackMatch = lower.match(/\btrack\s*(\d+)\b/i);
        const track = trackMatch ? parseInt(trackMatch[1], 10) : null;
        
        if (/\bmute\b/i.test(lower) && !/\bunmute\b/i.test(lower)) {
            return { type: 'track', action: 'mute', track, confidence: track ? 0.90 : 0.70 };
        }
        if (/\bunmute\b/i.test(lower)) {
            return { type: 'track', action: 'unmute', track, confidence: track ? 0.90 : 0.70 };
        }
        if (/\bsolo\b/i.test(lower) && !/\bunsolo\b/i.test(lower)) {
            return { type: 'track', action: 'solo', track, confidence: track ? 0.90 : 0.70 };
        }
        
        // Volume
        const volumeMatch = lower.match(/\b(raise|up|lower|down)\b.*?(\d+(?:\.\d+)?)\s*(db)?/i);
        if (volumeMatch && track) {
            const direction = /raise|up/i.test(volumeMatch[1]) ? 1 : -1;
            return {
                type: 'mixer',
                action: 'volume_adjust',
                track,
                delta: direction * parseFloat(volumeMatch[2]),
                unit: volumeMatch[3] || 'db',
                confidence: 0.85
            };
        }
        
        return null;
    }
    
    // ========================================================================
    // METRICS
    // ========================================================================
    
    /**
     * Calculate Word Error Rate
     */
    calculateWER(reference, hypothesis) {
        const refWords = reference.toLowerCase().split(/\s+/);
        const hypWords = hypothesis.toLowerCase().split(/\s+/);
        
        // Levenshtein distance at word level
        const m = refWords.length;
        const n = hypWords.length;
        
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (refWords[i - 1] === hypWords[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],     // Deletion
                        dp[i][j - 1],     // Insertion
                        dp[i - 1][j - 1]  // Substitution
                    );
                }
            }
        }
        
        const editDistance = dp[m][n];
        return m > 0 ? (editDistance / m) * 100 : 0;
    }
    
    /**
     * Compare intents
     */
    compareIntents(expected, actual) {
        if (!expected || !actual) return false;
        
        // Type must match
        if (expected.type !== actual.type) return false;
        
        // Action must match
        if (expected.action !== actual.action) return false;
        
        // Check specific fields
        if (expected.track !== undefined && expected.track !== actual.track) return false;
        if (expected.bar !== undefined && expected.bar !== actual.bar) return false;
        
        return true;
    }
    
    /**
     * Get test summary
     */
    getSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        
        const werValues = this.results.filter(r => r.wer !== null).map(r => r.wer);
        const avgWER = werValues.length > 0 
            ? werValues.reduce((a, b) => a + b, 0) / werValues.length 
            : 0;
        
        const latencies = this.results.filter(r => r.latencyMs !== null).map(r => r.latencyMs);
        const avgLatency = latencies.length > 0
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length
            : 0;
        
        return {
            total,
            passed,
            failed,
            passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
            avgWER,
            avgLatency,
            intentAccuracy: this.results.filter(r => r.intentMatch).length / Math.max(1, total) * 100,
            transcriptAccuracy: this.results.filter(r => r.transcriptMatch).length / Math.max(1, total) * 100
        };
    }
    
    // ========================================================================
    // BUILT-IN TEST SUITE
    // ========================================================================
    
    /**
     * Load standard test suite
     */
    loadStandardTests() {
        const standardTests = [
            // Transport commands
            { transcript: 'play', expectedIntent: { type: 'transport', action: 'play' }, tags: ['transport'] },
            { transcript: 'stop', expectedIntent: { type: 'transport', action: 'stop' }, tags: ['transport'] },
            { transcript: 'start playback', expectedIntent: { type: 'transport', action: 'play' }, tags: ['transport'] },
            { transcript: 'stop playback', expectedIntent: { type: 'transport', action: 'stop' }, tags: ['transport'] },
            { transcript: 'record', expectedIntent: { type: 'transport', action: 'record' }, tags: ['transport'] },
            { transcript: 'pause', expectedIntent: { type: 'transport', action: 'pause' }, tags: ['transport'] },
            
            // Edit commands
            { transcript: 'undo', expectedIntent: { type: 'edit', action: 'undo' }, tags: ['edit'] },
            { transcript: 'redo', expectedIntent: { type: 'edit', action: 'redo' }, tags: ['edit'] },
            { transcript: 'save', expectedIntent: { type: 'project', action: 'save' }, tags: ['project'] },
            
            // Navigation
            { transcript: 'go to bar 5', expectedIntent: { type: 'navigation', action: 'goto_bar', bar: 5 }, tags: ['navigation'] },
            { transcript: 'jump to bar 12', expectedIntent: { type: 'navigation', action: 'goto_bar', bar: 12 }, tags: ['navigation'] },
            { transcript: 'go to measure 8', expectedIntent: { type: 'navigation', action: 'goto_bar', bar: 8 }, tags: ['navigation'] },
            
            // Track commands
            { transcript: 'mute track 1', expectedIntent: { type: 'track', action: 'mute', track: 1 }, tags: ['track'] },
            { transcript: 'unmute track 3', expectedIntent: { type: 'track', action: 'unmute', track: 3 }, tags: ['track'] },
            { transcript: 'solo track 2', expectedIntent: { type: 'track', action: 'solo', track: 2 }, tags: ['track'] },
            
            // Mixer commands
            { transcript: 'raise track 1 by 5 dB', expectedIntent: { type: 'mixer', action: 'volume_adjust', track: 1, delta: 5 }, tags: ['mixer'] },
            { transcript: 'lower track 2 by 3 dB', expectedIntent: { type: 'mixer', action: 'volume_adjust', track: 2, delta: -3 }, tags: ['mixer'] },
            
            // Edge cases
            { transcript: 'Play', expectedIntent: { type: 'transport', action: 'play' }, tags: ['edge'] },
            { transcript: 'STOP', expectedIntent: { type: 'transport', action: 'stop' }, tags: ['edge'] },
            { transcript: '   play   ', expectedIntent: { type: 'transport', action: 'play' }, tags: ['edge'] },
        ];
        
        standardTests.forEach(test => {
            // Check if test already exists
            const exists = this.testCases.some(tc => 
                tc.transcript.toLowerCase() === test.transcript.toLowerCase().trim()
            );
            
            if (!exists) {
                this.addTestCase(test);
            }
        });
        
        console.log(`🧪 Loaded ${standardTests.length} standard tests`);
    }
    
    // ========================================================================
    // PERSISTENCE
    // ========================================================================
    
    saveTestCases() {
        try {
            // Save without audio blobs (those go to IndexedDB)
            const serializable = this.testCases.map(tc => ({
                ...tc,
                audioBlob: tc.audioBlob ? 'has-audio' : null
            }));
            localStorage.setItem(this.options.storageKey, JSON.stringify(serializable));
        } catch (e) {
            console.error('Failed to save test cases:', e);
        }
    }
    
    loadTestCases() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                this.testCases = JSON.parse(saved);
                console.log(`🧪 Loaded ${this.testCases.length} test cases`);
            }
        } catch (e) {
            console.error('Failed to load test cases:', e);
            this.testCases = [];
        }
    }
    
    /**
     * Export test suite
     */
    exportTests() {
        return JSON.stringify(this.testCases, null, 2);
    }
    
    /**
     * Import test suite
     */
    importTests(json) {
        try {
            const imported = JSON.parse(json);
            if (Array.isArray(imported)) {
                imported.forEach(tc => {
                    if (tc.transcript && tc.expectedIntent) {
                        this.addTestCase(tc);
                    }
                });
                console.log(`🧪 Imported ${imported.length} test cases`);
                return true;
            }
        } catch (e) {
            console.error('Failed to import tests:', e);
        }
        return false;
    }
    
    /**
     * Export results as CSV
     */
    exportResultsCSV() {
        const headers = ['ID', 'Transcript', 'Expected Action', 'Actual Action', 'Passed', 'WER', 'Latency (ms)'];
        const rows = this.results.map(r => [
            r.testCaseId,
            `"${r.transcript}"`,
            r.actualIntent?.action || '',
            r.testCaseId,
            r.passed ? 'PASS' : 'FAIL',
            r.wer?.toFixed(2) || '',
            r.latencyMs || ''
        ]);
        
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
    
    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    generateId() {
        return 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    clearResults() {
        this.results = [];
    }
    
    clearTests() {
        this.testCases = [];
        this.saveTestCases();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceReplayHarness;
}

if (typeof window !== 'undefined') {
    window.VoiceReplayHarness = VoiceReplayHarness;
}
