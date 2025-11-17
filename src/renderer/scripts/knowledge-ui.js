/**
 * Knowledge Base UI Manager
 * Provides UI for importing and managing knowledge
 */

class KnowledgeUIManager {
    constructor(rheaController) {
        this.rhea = rheaController;
        this.kb = null;
        this.importer = null;
        this.modal = null;
        this.init();
    }
    
    init() {
        // Initialize knowledge base if available
        if (typeof KnowledgeBase !== 'undefined') {
            const aiConfig = this.rhea.loadAIConfig();
            this.kb = new KnowledgeBase({
                embeddingAPIKey: aiConfig.apiKey,
                embeddingProvider: aiConfig.provider === 'local' ? 'local' : 'openai',
                embeddingRetryOnRateLimit: true,
                embeddingMaxRetries: 2,
                embeddingRetryDelay: 1000,
                embeddingUseCache: true // Cache embeddings to reduce API calls
            });
            this.importer = new KnowledgeImporter(this.kb);
        }
        
        // Create UI button
        this.createUIButton();
    }
    
    createUIButton() {
        const rheaPanel = document.querySelector('.rhea-panel');
        if (!rheaPanel) return;
        
        if (document.getElementById('kb-import-btn')) return;
        
        // Don't create button - it's now in the premium UI grid
        console.log('✅ Knowledge UI Manager initialized');
    }
    
    show() {
        // Alias for showModal() - used by button handlers
        this.showModal();
    }
    
    showModal() {
        if (!this.kb) {
            alert('Knowledge base not initialized. Please ensure KnowledgeBase is loaded.');
            return;
        }
        
        if (!this.modal) {
            this.createModal();
        }
        
        this.updateStats();
        this.modal.style.display = 'flex';
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'kb-import-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10001;
            justify-content: center;
            align-items: center;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
            padding: 30px;
            border-radius: 16px;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;
        
        content.innerHTML = `
            <h2 style="color: #fff; margin-top: 0; margin-bottom: 20px;">📚 RHEA Knowledge Base</h2>
            
            <!-- Stats -->
            <div id="kb-stats" style="margin-bottom: 20px; padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
                <strong style="color: #4CAF50;">Knowledge Base Stats</strong>
                <div id="kb-stats-content" style="color: #aaa; margin-top: 10px;"></div>
            </div>
            
            <!-- Import Methods -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #fff; margin-bottom: 15px;">Import Knowledge</h3>
                
                <!-- Text Input -->
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Manual Text Input</label>
                    <textarea id="kb-text-input" placeholder="Paste text from manuals, tutorials, documentation..." style="width: 100%; min-height: 150px; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-family: monospace; resize: vertical;"></textarea>
                    <button id="kb-import-text-btn" style="margin-top: 10px; padding: 10px 20px; background: #4CAF50; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Import Text</button>
                </div>
                
                <!-- File Upload -->
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Upload Files</label>
                    <input type="file" id="kb-file-input" multiple accept=".txt,.pdf,.md" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <small style="color: #aaa; display: block; margin-top: 5px;">Supported: .txt, .pdf, .md files</small>
                    <button id="kb-import-file-btn" style="margin-top: 10px; padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Import Files</button>
                </div>
                
                <!-- YouTube URL -->
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">YouTube Video</label>
                    <input type="text" id="kb-youtube-input" placeholder="https://www.youtube.com/watch?v=..." style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <small style="color: #aaa; display: block; margin-top: 5px;">Note: Requires transcript. You may need to provide transcript manually.</small>
                    <button id="kb-import-youtube-btn" style="margin-top: 10px; padding: 10px 20px; background: #f44336; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Import YouTube</button>
                </div>
                
                <!-- URL Import -->
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 8px; font-weight: bold;">Web Page URL</label>
                    <input type="text" id="kb-url-input" placeholder="https://..." style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff;">
                    <button id="kb-import-url-btn" style="margin-top: 10px; padding: 10px 20px; background: #9C27B0; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Import URL</button>
                </div>
            </div>
            
            <!-- Status -->
            <div id="kb-status" style="margin-bottom: 20px; padding: 10px; border-radius: 8px; display: none;"></div>
            
            <!-- Actions -->
            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button id="kb-export-btn" style="flex: 1; padding: 12px; background: #FF9800; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Export</button>
                <button id="kb-clear-btn" style="flex: 1; padding: 12px; background: #f44336; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Clear All</button>
                <button id="kb-close-btn" style="flex: 1; padding: 12px; background: #666; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Close</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('kb-import-text-btn').onclick = () => this.importText();
        document.getElementById('kb-import-file-btn').onclick = () => this.importFiles();
        document.getElementById('kb-import-youtube-btn').onclick = () => this.importYouTube();
        document.getElementById('kb-import-url-btn').onclick = () => this.importURL();
        document.getElementById('kb-export-btn').onclick = () => this.exportKB();
        document.getElementById('kb-clear-btn').onclick = () => this.clearKB();
        document.getElementById('kb-close-btn').onclick = () => this.closeModal();
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };
        
        this.modal = modal;
    }
    
    updateStats() {
        if (!this.kb) return;
        
        const stats = this.kb.getStats();
        const statsEl = document.getElementById('kb-stats-content');
        statsEl.innerHTML = `
            <div>Total Documents: <strong>${stats.totalDocuments}</strong></div>
            <div>Total Chunks: <strong>${stats.totalChunks}</strong></div>
            <div>Storage Size: <strong>${(stats.totalSize / 1024).toFixed(2)} KB</strong></div>
            <div>Sources: <strong>${Object.keys(stats.sources).length}</strong></div>
        `;
    }
    
    showStatus(message, type) {
        const statusEl = document.getElementById('kb-status');
        statusEl.style.display = 'block';
        statusEl.style.background = type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
        statusEl.style.color = type === 'success' ? '#4CAF50' : '#f44336';
        statusEl.textContent = message;
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
    
    async importText() {
        const text = document.getElementById('kb-text-input').value.trim();
        if (!text) {
            this.showStatus('❌ Please enter some text', 'error');
            return;
        }
        
        try {
            this.showStatus('🔄 Importing text...', 'info');
            const result = await this.importer.importText(text, {
                source: 'manual_input',
                type: 'manual'
            });
            this.showStatus(`✅ Imported ${result.chunks} chunks successfully!`, 'success');
            document.getElementById('kb-text-input').value = '';
            this.updateStats();
            
            // Update AI agent system prompt
            if (this.rhea.aiAgent) {
                await this.rhea.aiAgent.updateSystemPrompt();
            }
        } catch (error) {
            this.showStatus(`❌ Import failed: ${error.message}`, 'error');
        }
    }
    
    async importFiles() {
        const fileInput = document.getElementById('kb-file-input');
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) {
            this.showStatus('❌ Please select files', 'error');
            return;
        }
        
        try {
            this.showStatus(`🔄 Importing ${files.length} file(s)...`, 'info');
            const result = await this.importer.importBatch(files);
            
            const successCount = result.results.length;
            const errorCount = result.errors.length;
            
            if (successCount > 0) {
                this.showStatus(`✅ Imported ${successCount} file(s) successfully!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`, 'success');
                this.updateStats();
                
                // Update AI agent
                if (this.rhea.aiAgent) {
                    await this.rhea.aiAgent.updateSystemPrompt();
                }
            } else {
                this.showStatus(`❌ All imports failed. Check console for details.`, 'error');
            }
            
            fileInput.value = '';
        } catch (error) {
            this.showStatus(`❌ Import failed: ${error.message}`, 'error');
        }
    }
    
    async importYouTube() {
        const url = document.getElementById('kb-youtube-input').value.trim();
        if (!url) {
            this.showStatus('❌ Please enter a YouTube URL', 'error');
            return;
        }
        
        try {
            this.showStatus('🔄 Importing YouTube video...', 'info');
            const result = await this.importer.importYouTube(url);
            this.showStatus(`✅ Imported YouTube video with ${result.chunks} chunks!`, 'success');
            document.getElementById('kb-youtube-input').value = '';
            this.updateStats();
            
            // Update AI agent
            if (this.rhea.aiAgent) {
                await this.rhea.aiAgent.updateSystemPrompt();
            }
        } catch (error) {
            this.showStatus(`❌ Import failed: ${error.message}`, 'error');
        }
    }
    
    async importURL() {
        const url = document.getElementById('kb-url-input').value.trim();
        if (!url) {
            this.showStatus('❌ Please enter a URL', 'error');
            return;
        }
        
        try {
            this.showStatus('🔄 Importing URL...', 'info');
            const result = await this.importer.importURL(url);
            this.showStatus(`✅ Imported URL with ${result.chunks} chunks!`, 'success');
            document.getElementById('kb-url-input').value = '';
            this.updateStats();
            
            // Update AI agent
            if (this.rhea.aiAgent) {
                await this.rhea.aiAgent.updateSystemPrompt();
            }
        } catch (error) {
            this.showStatus(`❌ Import failed: ${error.message}`, 'error');
        }
    }
    
    exportKB() {
        if (!this.kb) return;
        
        const data = this.kb.export();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rhea_knowledge_base_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showStatus('✅ Knowledge base exported!', 'success');
    }
    
    clearKB() {
        if (!confirm('Are you sure you want to clear all knowledge? This cannot be undone.')) {
            return;
        }
        
        if (this.kb) {
            this.kb.clear();
            this.updateStats();
            this.showStatus('✅ Knowledge base cleared!', 'success');
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}

