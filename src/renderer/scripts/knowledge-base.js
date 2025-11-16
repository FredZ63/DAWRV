/**
 * RHEA Knowledge Base System
 * Handles importing and querying knowledge from manuals, videos, and other media
 */

class KnowledgeBase {
    constructor(config = {}) {
        this.config = {
            // Storage
            storageKey: config.storageKey || 'rhea_knowledge_base',
            maxChunkSize: config.maxChunkSize || 1000, // characters per chunk
            chunkOverlap: config.chunkOverlap || 200, // overlap between chunks
            
        // Embeddings
        embeddingProvider: config.embeddingProvider || 'openai', // 'openai', 'local'
        embeddingModel: config.embeddingModel || 'text-embedding-3-small',
        embeddingAPIKey: config.embeddingAPIKey || null,
        
        // Rate limiting for embeddings
        embeddingRetryOnRateLimit: config.embeddingRetryOnRateLimit !== false, // Default true
        embeddingMaxRetries: config.embeddingMaxRetries || 2,
        embeddingRetryDelay: config.embeddingRetryDelay || 1000,
        embeddingUseCache: config.embeddingUseCache !== false, // Default true
            
        // Search
        maxResults: config.maxResults || 5,
        similarityThreshold: config.similarityThreshold || 0.7,
        };
        
        // Knowledge storage (in-memory, can be persisted to localStorage)
        this.documents = [];
        this.embeddings = []; // Vector embeddings for semantic search
        this.metadata = []; // Metadata for each document
        
        // Embedding cache to reduce API calls
        this.embeddingCache = new Map();
        
        // Rate limit tracking for embeddings
        this.embeddingRateLimit = {
            isRateLimited: false,
            retryAfter: null,
            lastRateLimitTime: null
        };
        
        // Load existing knowledge base
        this.load();
    }
    
    /**
     * Load knowledge base from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem(this.config.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                this.documents = data.documents || [];
                this.embeddings = data.embeddings || [];
                this.metadata = data.metadata || [];
                console.log(`📚 Loaded ${this.documents.length} documents from knowledge base`);
            }
        } catch (e) {
            console.warn('Failed to load knowledge base:', e);
        }
    }
    
    /**
     * Save knowledge base to localStorage
     */
    save() {
        try {
            const data = {
                documents: this.documents,
                embeddings: this.embeddings,
                metadata: this.metadata,
                version: '1.0',
                lastUpdated: Date.now()
            };
            localStorage.setItem(this.config.storageKey, JSON.stringify(data));
            console.log('💾 Knowledge base saved');
        } catch (e) {
            console.error('Failed to save knowledge base:', e);
            // If too large, try compressing or warn user
            if (e.name === 'QuotaExceededError') {
                console.warn('⚠️  Knowledge base too large for localStorage. Consider exporting or clearing old data.');
            }
        }
    }
    
    /**
     * Add document to knowledge base
     */
    async addDocument(text, metadata = {}) {
        // Chunk the text
        const chunks = this.chunkText(text);
        
        // Generate embeddings for each chunk (with rate limit handling)
        const chunkEmbeddings = [];
        let successCount = 0;
        let fallbackCount = 0;
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            try {
                const embedding = await this.generateEmbedding(chunk);
                chunkEmbeddings.push(embedding);
                successCount++;
                
                // Store chunk
                const docId = this.documents.length;
                this.documents.push(chunk);
                this.embeddings.push(embedding);
                this.metadata.push({
                    ...metadata,
                    docId: docId,
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    source: metadata.source || 'unknown',
                    addedAt: Date.now(),
                    embeddingType: Array.isArray(embedding) ? 'openai' : 'simple'
                });
                
                // Small delay between embeddings to avoid rate limits
                if (i < chunks.length - 1 && this.config.embeddingProvider === 'openai') {
                    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
                }
            } catch (error) {
                // If embedding fails, use simple embedding
                console.warn(`Embedding failed for chunk ${i}, using simple embedding:`, error.message);
                const simpleEmbedding = this.generateSimpleEmbedding(chunk);
                chunkEmbeddings.push(simpleEmbedding);
                fallbackCount++;
                
                // Store with simple embedding
                const docId = this.documents.length;
                this.documents.push(chunk);
                this.embeddings.push(simpleEmbedding);
                this.metadata.push({
                    ...metadata,
                    docId: docId,
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    source: metadata.source || 'unknown',
                    addedAt: Date.now(),
                    embeddingType: 'simple'
                });
            }
        }
        
        this.save();
        console.log(`✅ Added document with ${chunks.length} chunks (${successCount} OpenAI, ${fallbackCount} simple embeddings)`);
        
        return {
            chunks: chunks.length,
            docId: this.documents.length - chunks.length,
            embeddingStats: {
                openai: successCount,
                simple: fallbackCount
            }
        };
    }
    
    /**
     * Chunk text into smaller pieces for embedding
     */
    chunkText(text) {
        const chunks = [];
        const maxSize = this.config.maxChunkSize;
        const overlap = this.config.chunkOverlap;
        
        // Split by paragraphs first
        const paragraphs = text.split(/\n\n+/);
        let currentChunk = '';
        
        for (const para of paragraphs) {
            // If adding this paragraph would exceed max size, save current chunk
            if (currentChunk.length + para.length > maxSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                
                // Start new chunk with overlap
                const words = currentChunk.split(/\s+/);
                const overlapWords = words.slice(-Math.floor(overlap / 10)); // Approximate word count
                currentChunk = overlapWords.join(' ') + ' ' + para;
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + para;
            }
        }
        
        // Add remaining chunk
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }
        
        // If chunks are still too large, split by sentences
        const finalChunks = [];
        for (const chunk of chunks) {
            if (chunk.length <= maxSize) {
                finalChunks.push(chunk);
            } else {
                // Split by sentences
                const sentences = chunk.match(/[^.!?]+[.!?]+/g) || [chunk];
                let current = '';
                for (const sent of sentences) {
                    if (current.length + sent.length > maxSize && current.length > 0) {
                        finalChunks.push(current.trim());
                        current = sent;
                    } else {
                        current += sent;
                    }
                }
                if (current.trim().length > 0) {
                    finalChunks.push(current.trim());
                }
            }
        }
        
        return finalChunks.filter(c => c.length > 50); // Filter out very short chunks
    }
    
    /**
     * Generate embedding for text
     */
    async generateEmbedding(text) {
        // Check cache first
        if (this.config.embeddingUseCache && this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text);
        }
        
        // Check rate limit
        if (this.embeddingRateLimit.isRateLimited) {
            const now = Date.now();
            if (this.embeddingRateLimit.retryAfter && now < this.embeddingRateLimit.retryAfter) {
                console.log('⏳ Embedding rate limited, using simple embedding');
                return this.generateSimpleEmbedding(text);
            } else {
                // Rate limit expired
                this.embeddingRateLimit.isRateLimited = false;
                this.embeddingRateLimit.retryAfter = null;
            }
        }
        
        if (this.config.embeddingProvider === 'openai' && this.config.embeddingAPIKey) {
            try {
                const embedding = await this.generateOpenAIEmbeddingWithRetry(text);
                // Cache the result
                if (this.config.embeddingUseCache) {
                    this.embeddingCache.set(text, embedding);
                }
                return embedding;
            } catch (error) {
                console.warn('OpenAI embedding failed, using simple embedding:', error);
                return this.generateSimpleEmbedding(text);
            }
        } else {
            // Use simple embedding for local
            const embedding = this.generateSimpleEmbedding(text);
            // Cache it
            if (this.config.embeddingUseCache) {
                this.embeddingCache.set(text, embedding);
            }
            return embedding;
        }
    }
    
    /**
     * Generate OpenAI embedding with retry logic
     */
    async generateOpenAIEmbeddingWithRetry(text, retryCount = 0) {
        try {
            return await this.generateOpenAIEmbedding(text);
        } catch (error) {
            // Check if it's a rate limit error
            const isRateLimit = error.message.includes('Rate limit') || 
                               error.message.includes('429') ||
                               error.message.includes('rate_limit_exceeded');
            
            if (isRateLimit && this.config.embeddingRetryOnRateLimit && retryCount < this.config.embeddingMaxRetries) {
                // Calculate retry delay with exponential backoff
                const baseDelay = this.config.embeddingRetryDelay;
                const delay = baseDelay * Math.pow(2, retryCount);
                
                console.log(`⏳ Embedding rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.embeddingMaxRetries})...`);
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Retry
                return await this.generateOpenAIEmbeddingWithRetry(text, retryCount + 1);
            } else if (isRateLimit) {
                // Max retries reached or retry disabled
                this.embeddingRateLimit.isRateLimited = true;
                this.embeddingRateLimit.lastRateLimitTime = Date.now();
                this.embeddingRateLimit.retryAfter = Date.now() + 60000; // 60 seconds
                throw error;
            } else {
                // Not a rate limit error, re-throw
                throw error;
            }
        }
    }
    
    /**
     * Generate OpenAI embedding
     */
    async generateOpenAIEmbedding(text) {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.embeddingAPIKey}`
            },
            body: JSON.stringify({
                model: this.config.embeddingModel,
                input: text.substring(0, 8000) // OpenAI limit
            })
        });
        
        if (!response.ok) {
            let errorMessage = `Embedding API error: ${response.status}`;
            
            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('retry-after');
                if (retryAfter) {
                    const seconds = parseInt(retryAfter);
                    errorMessage = `Rate limit exceeded. Please wait ${seconds} seconds.`;
                    this.embeddingRateLimit.isRateLimited = true;
                    this.embeddingRateLimit.lastRateLimitTime = Date.now();
                    this.embeddingRateLimit.retryAfter = Date.now() + (seconds * 1000);
                } else {
                    errorMessage = 'Rate limit exceeded. Please try again later.';
                    this.embeddingRateLimit.isRateLimited = true;
                    this.embeddingRateLimit.lastRateLimitTime = Date.now();
                    this.embeddingRateLimit.retryAfter = Date.now() + 60000; // Default 60 seconds
                }
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        return data.data[0].embedding;
    }
    
    /**
     * Generate simple embedding (TF-IDF-like, for local use)
     */
    generateSimpleEmbedding(text) {
        // Simple word frequency vector (normalized)
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        
        // Normalize
        const totalWords = words.length;
        const vector = {};
        Object.keys(wordFreq).forEach(word => {
            vector[word] = wordFreq[word] / totalWords;
        });
        
        return vector;
    }
    
    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(embedding1, embedding2) {
        // Handle different embedding formats
        if (Array.isArray(embedding1) && Array.isArray(embedding2)) {
            // Vector embeddings (OpenAI format)
            if (embedding1.length !== embedding2.length) return 0;
            
            let dotProduct = 0;
            let norm1 = 0;
            let norm2 = 0;
            
            for (let i = 0; i < embedding1.length; i++) {
                dotProduct += embedding1[i] * embedding2[i];
                norm1 += embedding1[i] * embedding1[i];
                norm2 += embedding2[i] * embedding2[i];
            }
            
            return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
        } else {
            // Simple word frequency embeddings
            const keys = new Set([...Object.keys(embedding1), ...Object.keys(embedding2)]);
            let dotProduct = 0;
            let norm1 = 0;
            let norm2 = 0;
            
            keys.forEach(key => {
                const val1 = embedding1[key] || 0;
                const val2 = embedding2[key] || 0;
                dotProduct += val1 * val2;
                norm1 += val1 * val1;
                norm2 += val2 * val2;
            });
            
            const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
            return denominator > 0 ? dotProduct / denominator : 0;
        }
    }
    
    /**
     * Search knowledge base
     */
    async search(query, options = {}) {
        const maxResults = options.maxResults || this.config.maxResults;
        const threshold = options.threshold || this.config.similarityThreshold;
        
        // Generate query embedding
        const queryEmbedding = await this.generateEmbedding(query);
        
        // Calculate similarities
        const results = [];
        for (let i = 0; i < this.embeddings.length; i++) {
            const similarity = this.cosineSimilarity(queryEmbedding, this.embeddings[i]);
            if (similarity >= threshold) {
                results.push({
                    document: this.documents[i],
                    metadata: this.metadata[i],
                    similarity: similarity,
                    index: i
                });
            }
        }
        
        // Sort by similarity
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Return top results
        return results.slice(0, maxResults);
    }
    
    /**
     * Get context for AI agent
     */
    async getContext(query, maxLength = 2000) {
        try {
            const results = await this.search(query, { maxResults: 5 });
            
            let context = '';
            for (const result of results) {
                const chunk = result.document;
                if (context.length + chunk.length <= maxLength) {
                    context += (context ? '\n\n' : '') + chunk;
                } else {
                    break;
                }
            }
            
            return context;
        } catch (error) {
            console.warn('Failed to get knowledge base context:', error);
            // Return empty context on error (don't break AI agent)
            return '';
        }
    }
    
    /**
     * Clear knowledge base
     */
    clear() {
        this.documents = [];
        this.embeddings = [];
        this.metadata = [];
        this.save();
        console.log('🗑️  Knowledge base cleared');
    }
    
    /**
     * Get statistics
     */
    getStats() {
        const sources = {};
        this.metadata.forEach(meta => {
            const source = meta.source || 'unknown';
            sources[source] = (sources[source] || 0) + 1;
        });
        
        return {
            totalDocuments: this.documents.length,
            totalChunks: this.documents.length,
            sources: sources,
            totalSize: JSON.stringify(this.documents).length
        };
    }
    
    /**
     * Export knowledge base
     */
    export() {
        return {
            documents: this.documents,
            metadata: this.metadata,
            stats: this.getStats(),
            exportedAt: Date.now()
        };
    }
    
    /**
     * Import knowledge base
     */
    import(data) {
        if (data.documents && Array.isArray(data.documents)) {
            this.documents = data.documents;
            this.metadata = data.metadata || [];
            // Regenerate embeddings (or load if included)
            this.save();
            console.log(`📥 Imported ${data.documents.length} documents`);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KnowledgeBase;
}

