/**
 * Studio Vocabulary Matcher
 * ==========================
 * High-performance matching engine for studio vocabulary phrases.
 * Supports exact, fuzzy, and partial matching with configurable thresholds.
 */

class StudioVocabularyMatcher {
    constructor(storage) {
        this.storage = storage || window.studioVocabularyStorage;
        
        // Matching thresholds
        this.EXACT_MATCH_SCORE = 1.0;
        this.FUZZY_THRESHOLD = 0.82;
        this.PARTIAL_THRESHOLD = 0.75;
        this.MIN_PHRASE_WORDS = 2; // Minimum words for partial matching
        
        // Debug mode
        this.debug = false;
        this.lastMatchResult = null;
    }
    
    /**
     * Enable/disable debug mode
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
    
    /**
     * Main matching function - finds best vocabulary match for utterance
     * @param {string} utterance - User's spoken text
     * @returns {object|null} Match result with score and metadata
     */
    match(utterance) {
        const startTime = performance.now();
        
        if (!utterance || !this.storage || !this.storage.loaded) {
            return null;
        }
        
        const normalized = this.normalize(utterance);
        const candidates = [];
        
        // Get all vocabulary items
        const items = this.storage.getAll();
        
        for (const item of items) {
            const phraseNorm = this.normalize(item.phrase);
            
            // 1. Exact match (highest priority)
            if (normalized === phraseNorm || normalized.includes(phraseNorm)) {
                candidates.push({
                    item,
                    score: this.EXACT_MATCH_SCORE,
                    matchType: 'exact',
                    matchedPhrase: item.phrase
                });
                continue;
            }
            
            // 2. Fuzzy match (Levenshtein-based similarity)
            const fuzzyScore = this.fuzzyMatch(normalized, phraseNorm);
            if (fuzzyScore >= this.FUZZY_THRESHOLD) {
                candidates.push({
                    item,
                    score: fuzzyScore,
                    matchType: 'fuzzy',
                    matchedPhrase: item.phrase
                });
                continue;
            }
            
            // 3. Partial/token match (for longer phrases)
            const phraseWords = phraseNorm.split(/\s+/);
            if (phraseWords.length >= this.MIN_PHRASE_WORDS) {
                const partialScore = this.partialMatch(normalized, phraseNorm);
                if (partialScore >= this.PARTIAL_THRESHOLD) {
                    candidates.push({
                        item,
                        score: partialScore * 0.95, // Slight penalty for partial
                        matchType: 'partial',
                        matchedPhrase: item.phrase
                    });
                }
            }
            
            // 4. Tag-based boost (check if utterance contains any tags)
            // Only use tag matching for VIBE phrases (not actions) to prevent false positives
            if (item.tags && item.tags.length > 0 && item.intentType === 'vibe') {
                const tagScore = this.tagMatch(normalized, item.tags);
                // Require higher threshold (0.6+) and at least 2 matching tags for safety
                const matchedTagCount = Math.round(tagScore * item.tags.length);
                if (tagScore >= 0.6 && matchedTagCount >= 2 && candidates.length === 0) {
                    candidates.push({
                        item,
                        score: tagScore * 0.6, // Lower priority for tag-only matches
                        matchType: 'tag',
                        matchedPhrase: item.phrase
                    });
                }
            }
        }
        
        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);
        
        const elapsed = performance.now() - startTime;
        
        // Build result
        const result = {
            match: candidates.length > 0 ? candidates[0] : null,
            candidates: candidates.slice(0, 5), // Top 5 candidates for debug
            elapsed: elapsed.toFixed(2) + 'ms',
            utterance: utterance,
            normalized: normalized
        };
        
        this.lastMatchResult = result;
        
        if (this.debug) {
            console.log('🔍 Vocabulary Match:', result);
        }
        
        return result.match;
    }
    
    /**
     * Normalize text for matching
     */
    normalize(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ');   // Normalize whitespace
    }
    
    /**
     * Fuzzy matching using Levenshtein distance
     */
    fuzzyMatch(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        // Quick rejection for very different lengths
        if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.5) {
            return 0;
        }
        
        const distance = this.levenshteinDistance(str1, str2);
        const maxLen = Math.max(len1, len2);
        
        return maxLen === 0 ? 1 : 1 - (distance / maxLen);
    }
    
    /**
     * Levenshtein distance calculation
     */
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        
        // Create matrix
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Initialize first row and column
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        // Fill matrix
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,      // Deletion
                    dp[i][j - 1] + 1,      // Insertion
                    dp[i - 1][j - 1] + cost // Substitution
                );
            }
        }
        
        return dp[m][n];
    }
    
    /**
     * Partial/token matching
     */
    partialMatch(utterance, phrase) {
        const utteranceTokens = new Set(utterance.split(/\s+/));
        const phraseTokens = phrase.split(/\s+/);
        
        let matchedCount = 0;
        for (const token of phraseTokens) {
            if (utteranceTokens.has(token)) {
                matchedCount++;
            } else {
                // Check for fuzzy token match
                for (const uToken of utteranceTokens) {
                    if (this.fuzzyMatch(token, uToken) >= 0.85) {
                        matchedCount += 0.8; // Partial credit
                        break;
                    }
                }
            }
        }
        
        return matchedCount / phraseTokens.length;
    }
    
    /**
     * Tag-based matching
     */
    tagMatch(utterance, tags) {
        const utteranceTokens = new Set(utterance.split(/\s+/));
        let matchedTags = 0;
        
        for (const tag of tags) {
            const tagNorm = tag.toLowerCase();
            if (utteranceTokens.has(tagNorm) || utterance.includes(tagNorm)) {
                matchedTags++;
            }
        }
        
        return matchedTags / tags.length;
    }
    
    /**
     * Get detailed match info for debugging
     */
    getLastMatchResult() {
        return this.lastMatchResult;
    }
    
    /**
     * Test a phrase and return detailed match info
     */
    testPhrase(phrase) {
        this.debug = true;
        const result = this.match(phrase);
        this.debug = false;
        
        return {
            input: phrase,
            bestMatch: result,
            allCandidates: this.lastMatchResult?.candidates || [],
            elapsed: this.lastMatchResult?.elapsed
        };
    }
    
    /**
     * Check if utterance contains any vocabulary phrase
     */
    containsVocabPhrase(utterance) {
        const match = this.match(utterance);
        return match !== null && match.score >= this.FUZZY_THRESHOLD;
    }
    
    /**
     * Get vocabulary context for an utterance
     * Returns metadata to attach to NLU context
     */
    getVocabContext(utterance) {
        const match = this.match(utterance);
        
        if (!match) {
            return null;
        }
        
        return {
            vocabMatch: {
                phraseId: match.item.id,
                phrase: match.item.phrase,
                intentType: match.item.intentType,
                sentiment: match.item.sentiment,
                category: match.item.category,
                tags: match.item.tags || [],
                score: match.score,
                matchType: match.matchType
            },
            // Include full match result to avoid re-matching (performance fix)
            fullMatch: match,
            hasActionMapping: match.item.actionMapping?.enabled && 
                              match.item.actionMapping?.actions?.length > 0,
            clarificationRule: match.item.clarificationRule
        };
    }
}

// Global instance
window.studioVocabularyMatcher = new StudioVocabularyMatcher();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudioVocabularyMatcher;
}
