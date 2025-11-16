/**
 * Knowledge Importer
 * Handles importing from various sources: PDFs, YouTube, text files, etc.
 */

class KnowledgeImporter {
    constructor(knowledgeBase) {
        this.kb = knowledgeBase;
    }
    
    /**
     * Import from text
     */
    async importText(text, metadata = {}) {
        console.log('📝 Importing text...');
        return await this.kb.addDocument(text, {
            ...metadata,
            source: metadata.source || 'text',
            type: 'text'
        });
    }
    
    /**
     * Import from text file
     */
    async importTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target.result;
                    const result = await this.importText(text, {
                        source: `file:${file.name}`,
                        filename: file.name,
                        type: 'text_file',
                        importedAt: Date.now()
                    });
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    /**
     * Import from PDF (requires PDF.js or server-side processing)
     */
    async importPDF(file) {
        // Note: PDF parsing in browser requires PDF.js
        // For now, we'll provide a placeholder that can be enhanced
        return new Promise((resolve, reject) => {
            // Check if PDF.js is available
            if (typeof pdfjsLib === 'undefined') {
                reject(new Error('PDF.js not loaded. Please include PDF.js library.'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    
                    // Extract text from all pages
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n\n';
                    }
                    
                    const result = await this.importText(fullText, {
                        source: `pdf:${file.name}`,
                        filename: file.name,
                        type: 'pdf',
                        pages: pdf.numPages,
                        importedAt: Date.now()
                    });
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Import from YouTube video
     */
    async importYouTube(url, options = {}) {
        console.log('🎥 Importing YouTube video:', url);
        
        // Extract video ID
        const videoId = this.extractYouTubeId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }
        
        // For YouTube transcription, we need to use a service
        // Options:
        // 1. Use YouTube's API (requires API key)
        // 2. Use a transcription service
        // 3. Use yt-dlp or similar (server-side)
        
        // For now, we'll provide a structure that can work with a backend service
        // or browser extension that can extract transcripts
        
        try {
            // Try to get transcript from YouTube (if available)
            const transcript = await this.getYouTubeTranscript(videoId);
            
            if (transcript) {
                const text = transcript.map(item => item.text).join(' ');
                return await this.importText(text, {
                    source: `youtube:${videoId}`,
                    url: url,
                    videoId: videoId,
                    type: 'youtube',
                    importedAt: Date.now()
                });
            } else {
                throw new Error('Transcript not available for this video');
            }
        } catch (error) {
            console.error('YouTube import error:', error);
            throw new Error(`Failed to import YouTube video: ${error.message}`);
        }
    }
    
    /**
     * Extract YouTube video ID from URL
     */
    extractYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }
    
    /**
     * Get YouTube transcript
     * Note: This requires a backend service or browser extension
     * For now, returns null - can be enhanced with actual implementation
     */
    async getYouTubeTranscript(videoId) {
        // Option 1: Use a backend service
        // Option 2: Use YouTube's transcript API (if available)
        // Option 3: Use a browser extension
        
        // Placeholder - would need actual implementation
        // For now, return null and let user know they need to provide transcript
        console.warn('YouTube transcript extraction not implemented. Please provide transcript manually or use a backend service.');
        return null;
    }
    
    /**
     * Import from URL (web scraping)
     */
    async importURL(url) {
        try {
            // Use a CORS proxy or backend service to fetch content
            // For now, we'll provide a structure
            
            const response = await fetch(url, {
                mode: 'cors',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const html = await response.text();
            
            // Extract text from HTML (simple version)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Remove script and style elements
            const scripts = doc.querySelectorAll('script, style');
            scripts.forEach(el => el.remove());
            
            // Get text content
            const text = doc.body.textContent || doc.body.innerText || '';
            
            return await this.importText(text, {
                source: `url:${url}`,
                url: url,
                type: 'webpage',
                importedAt: Date.now()
            });
        } catch (error) {
            console.error('URL import error:', error);
            throw new Error(`Failed to import URL: ${error.message}. CORS may be blocking. Use a backend service.`);
        }
    }
    
    /**
     * Import from manual text (structured)
     */
    async importManual(text, sections = {}) {
        // Import manual with section metadata
        const metadata = {
            source: 'manual',
            type: 'manual',
            sections: sections,
            importedAt: Date.now()
        };
        
        return await this.importText(text, metadata);
    }
    
    /**
     * Batch import multiple files
     */
    async importBatch(files) {
        const results = [];
        const errors = [];
        
        for (const file of files) {
            try {
                let result;
                if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                    result = await this.importTextFile(file);
                } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    result = await this.importPDF(file);
                } else {
                    throw new Error(`Unsupported file type: ${file.type}`);
                }
                results.push({ file: file.name, success: true, ...result });
            } catch (error) {
                errors.push({ file: file.name, error: error.message });
            }
        }
        
        return { results, errors };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KnowledgeImporter;
}

