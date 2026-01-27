/**
 * Studio Vocabulary UI
 * =====================
 * Full-featured UI for managing studio vocabulary entries.
 */

class StudioVocabularyUI {
    constructor() {
        this.storage = window.studioVocabularyStorage;
        this.matcher = window.studioVocabularyMatcher;
        this.executor = window.studioVocabularyExecutor;
        
        this.modal = null;
        this.selectedEntry = null;
        this.searchQuery = '';
        this.isVisible = false;
        
        // Debug panel state
        this.showDebug = true;
        this.lastTestResult = null;
    }
    
    /**
     * Show the UI
     */
    async show() {
        if (!this.storage.loaded) {
            await this.storage.initialize();
        }
        
        this.createModal();
        this.render();
        this.isVisible = true;
    }
    
    /**
     * Hide the UI
     */
    hide() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        this.isVisible = false;
    }
    
    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Create modal container
     */
    createModal() {
        // Remove existing
        const existing = document.getElementById('studio-vocabulary-modal');
        if (existing) existing.remove();
        
        this.modal = document.createElement('div');
        this.modal.id = 'studio-vocabulary-modal';
        this.modal.className = 'studio-vocab-modal';
        
        this.addStyles();
        document.body.appendChild(this.modal);
    }
    
    /**
     * Main render function
     */
    render() {
        if (!this.modal) return;
        
        const entries = this.storage.search(this.searchQuery);
        
        this.modal.innerHTML = `
            <div class="sv-container">
                <div class="sv-header">
                    <h2>🎤 Studio Vocabulary</h2>
                    <p class="sv-subtitle">Teach RHEA studio slang and map phrases to actions</p>
                    <button class="sv-close-btn" id="sv-close">×</button>
                </div>
                
                <div class="sv-toolbar">
                    <div class="sv-search">
                        <input type="text" id="sv-search" placeholder="Search phrases, definitions, tags..." 
                               value="${this.escapeHtml(this.searchQuery)}">
                    </div>
                    <div class="sv-actions">
                        <button class="sv-btn sv-btn-primary" id="sv-new">+ New Entry</button>
                        <button class="sv-btn" id="sv-import">📥 Import</button>
                        <button class="sv-btn" id="sv-export">📤 Export</button>
                        <button class="sv-btn sv-btn-danger" id="sv-reset">↻ Reset</button>
                    </div>
                </div>
                
                <div class="sv-main">
                    <!-- Left: Entry List -->
                    <div class="sv-list-panel">
                        <div class="sv-list-header">
                            <span>${entries.length} entries</span>
                            <select id="sv-category-filter">
                                <option value="">All Categories</option>
                                ${this.storage.CATEGORIES.map(c => 
                                    `<option value="${c}">${c}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="sv-list" id="sv-list">
                            ${this.renderEntryList(entries)}
                        </div>
                    </div>
                    
                    <!-- Right: Editor Panel -->
                    <div class="sv-editor-panel">
                        ${this.selectedEntry ? this.renderEditor() : this.renderEmptyEditor()}
                    </div>
                </div>
                
                <!-- Debug Panel -->
                <div class="sv-debug-panel ${this.showDebug ? '' : 'collapsed'}" id="sv-debug">
                    <div class="sv-debug-header" id="sv-debug-toggle">
                        <span>🔍 Debug / Test</span>
                        <span class="sv-debug-arrow">${this.showDebug ? '▼' : '▶'}</span>
                    </div>
                    <div class="sv-debug-content">
                        ${this.renderDebugPanel()}
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    /**
     * Render entry list
     */
    renderEntryList(entries) {
        if (entries.length === 0) {
            return '<div class="sv-empty">No entries found</div>';
        }
        
        return entries.map(entry => `
            <div class="sv-list-item ${this.selectedEntry?.id === entry.id ? 'selected' : ''}" 
                 data-id="${entry.id}">
                <div class="sv-item-main">
                    <span class="sv-item-phrase">"${this.escapeHtml(entry.phrase)}"</span>
                    <span class="sv-item-type sv-type-${entry.intentType}">${entry.intentType}</span>
                </div>
                <div class="sv-item-meta">
                    <span class="sv-item-category">${entry.category}</span>
                    <span class="sv-item-sentiment sv-sentiment-${entry.sentiment}">${entry.sentiment}</span>
                    ${entry.actionMapping?.enabled ? '<span class="sv-item-action">⚡</span>' : ''}
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Render empty editor state
     */
    renderEmptyEditor() {
        return `
            <div class="sv-editor-empty">
                <div class="sv-empty-icon">🎤</div>
                <p>Select an entry to edit</p>
                <p>or create a new one</p>
            </div>
        `;
    }
    
    /**
     * Render editor for selected entry
     */
    renderEditor() {
        const e = this.selectedEntry;
        
        return `
            <div class="sv-editor">
                <div class="sv-field">
                    <label>Phrase *</label>
                    <input type="text" id="sv-phrase" value="${this.escapeHtml(e.phrase)}" 
                           placeholder='e.g., "make it slap"'>
                </div>
                
                <div class="sv-field-row">
                    <div class="sv-field">
                        <label>Category</label>
                        <select id="sv-category">
                            ${this.storage.CATEGORIES.map(c => 
                                `<option value="${c}" ${e.category === c ? 'selected' : ''}>${c}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="sv-field">
                        <label>Intent Type</label>
                        <select id="sv-intent-type">
                            <option value="vibe" ${e.intentType === 'vibe' ? 'selected' : ''}>Vibe (no action)</option>
                            <option value="action" ${e.intentType === 'action' ? 'selected' : ''}>Action (execute)</option>
                        </select>
                    </div>
                </div>
                
                <div class="sv-field">
                    <label>Definition *</label>
                    <textarea id="sv-definition" rows="2" 
                              placeholder="What does this phrase mean?">${this.escapeHtml(e.definition)}</textarea>
                </div>
                
                <div class="sv-field-row">
                    <div class="sv-field">
                        <label>Sentiment</label>
                        <select id="sv-sentiment">
                            ${this.storage.SENTIMENTS.map(s => 
                                `<option value="${s}" ${e.sentiment === s ? 'selected' : ''}>${s}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="sv-field">
                        <label>Clarification</label>
                        <select id="sv-clarification">
                            <option value="neverAsk" ${e.clarificationRule === 'neverAsk' ? 'selected' : ''}>Never ask</option>
                            <option value="askIfAmbiguous" ${e.clarificationRule === 'askIfAmbiguous' ? 'selected' : ''}>Ask if ambiguous</option>
                            <option value="alwaysAsk" ${e.clarificationRule === 'alwaysAsk' ? 'selected' : ''}>Always ask</option>
                        </select>
                    </div>
                </div>
                
                <div class="sv-field">
                    <label>Tags (comma separated)</label>
                    <input type="text" id="sv-tags" value="${(e.tags || []).join(', ')}" 
                           placeholder="punch, louder, presence">
                </div>
                
                <!-- Action Mapping Section -->
                <div class="sv-section">
                    <div class="sv-section-header">
                        <label class="sv-checkbox">
                            <input type="checkbox" id="sv-action-enabled" 
                                   ${e.actionMapping?.enabled ? 'checked' : ''}>
                            <span>Enable Action Mapping</span>
                        </label>
                    </div>
                    
                    <div class="sv-action-mapping ${e.actionMapping?.enabled ? '' : 'disabled'}" id="sv-action-mapping">
                        ${this.renderActionMapping(e.actionMapping)}
                    </div>
                </div>
                
                <!-- Editor Actions -->
                <div class="sv-editor-actions">
                    <button class="sv-btn sv-btn-primary" id="sv-save">💾 Save</button>
                    <button class="sv-btn" id="sv-test">🧪 Test Phrase</button>
                    <button class="sv-btn sv-btn-danger" id="sv-delete">🗑️ Delete</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render action mapping section
     */
    renderActionMapping(mapping) {
        const actions = mapping?.actions || [];
        
        if (actions.length === 0) {
            return `
                <div class="sv-action-empty">
                    <p>No actions configured</p>
                    <button class="sv-btn sv-btn-small" id="sv-add-action">+ Add Action</button>
                </div>
            `;
        }
        
        return `
            <div class="sv-actions-list">
                ${actions.map((action, index) => this.renderActionItem(action, index)).join('')}
                <button class="sv-btn sv-btn-small" id="sv-add-action">+ Add Action</button>
            </div>
        `;
    }
    
    /**
     * Render single action item
     */
    renderActionItem(action, index) {
        return `
            <div class="sv-action-item" data-index="${index}">
                <div class="sv-action-row">
                    <select class="sv-action-target" data-index="${index}">
                        ${this.storage.ACTION_TARGETS.map(t => 
                            `<option value="${t}" ${action.target === t ? 'selected' : ''}>${t}</option>`
                        ).join('')}
                    </select>
                    <select class="sv-action-type" data-index="${index}">
                        ${this.storage.ACTION_TYPES.map(t => 
                            `<option value="${t}" ${action.type === t ? 'selected' : ''}>${t}</option>`
                        ).join('')}
                    </select>
                    <button class="sv-btn sv-btn-small sv-btn-danger sv-remove-action" data-index="${index}">×</button>
                </div>
                ${this.renderActionPayload(action, index)}
                <div class="sv-action-row">
                    <input type="text" class="sv-action-confirm" data-index="${index}" 
                           placeholder="Confirmation text" value="${this.escapeHtml(action.confirmationText || '')}">
                </div>
            </div>
        `;
    }
    
    /**
     * Render action payload based on type
     */
    renderActionPayload(action, index) {
        const payload = action.payload || {};
        
        switch (action.type) {
            case 'parameterDelta':
                return `
                    <div class="sv-action-row sv-payload">
                        <select class="sv-param-name" data-index="${index}">
                            <option value="volume" ${payload.paramName === 'volume' ? 'selected' : ''}>Volume</option>
                            <option value="pan" ${payload.paramName === 'pan' ? 'selected' : ''}>Pan</option>
                            <option value="comp" ${payload.paramName === 'comp' ? 'selected' : ''}>Compression</option>
                            <option value="eq" ${payload.paramName === 'eq' ? 'selected' : ''}>EQ</option>
                            <option value="reverb" ${payload.paramName === 'reverb' ? 'selected' : ''}>Reverb</option>
                            <option value="width" ${payload.paramName === 'width' ? 'selected' : ''}>Width</option>
                        </select>
                        <input type="number" class="sv-param-amount" data-index="${index}" 
                               value="${payload.amount || ''}" placeholder="Amount" step="0.5">
                        <select class="sv-param-unit" data-index="${index}">
                            <option value="db" ${payload.unit === 'db' ? 'selected' : ''}>dB</option>
                            <option value="percent" ${payload.unit === 'percent' ? 'selected' : ''}>%</option>
                            <option value="ms" ${payload.unit === 'ms' ? 'selected' : ''}>ms</option>
                        </select>
                    </div>
                `;
                
            case 'reaperAction':
                return `
                    <div class="sv-action-row sv-payload">
                        <input type="text" class="sv-action-id" data-index="${index}" 
                               value="${payload.reaperActionId || ''}" placeholder="REAPER Action ID">
                    </div>
                `;
                
            case 'reaperScript':
                return `
                    <div class="sv-action-row sv-payload">
                        <input type="text" class="sv-script-path" data-index="${index}" 
                               value="${payload.reaperScriptPath || ''}" placeholder="Script path">
                    </div>
                `;
                
            case 'fxChain':
                return `
                    <div class="sv-action-row sv-payload">
                        <input type="text" class="sv-fx-chain" data-index="${index}" 
                               value="${payload.fxChainName || ''}" placeholder="FX Chain name">
                    </div>
                `;
                
            default:
                return '';
        }
    }
    
    /**
     * Render debug panel
     */
    renderDebugPanel() {
        const lastMatch = this.matcher.getLastMatchResult();
        const lastExec = this.executor.getLastExecution();
        
        return `
            <div class="sv-debug-grid">
                <div class="sv-debug-section">
                    <h4>Test Phrase</h4>
                    <div class="sv-debug-test">
                        <input type="text" id="sv-test-input" placeholder="Type a phrase to test...">
                        <button class="sv-btn sv-btn-small" id="sv-run-test">Test</button>
                    </div>
                    ${this.lastTestResult ? this.renderTestResult() : ''}
                </div>
                
                <div class="sv-debug-section">
                    <h4>Last Match</h4>
                    <pre class="sv-debug-output">${lastMatch ? JSON.stringify(lastMatch, null, 2) : 'No match yet'}</pre>
                </div>
                
                <div class="sv-debug-section">
                    <h4>Last Execution</h4>
                    <pre class="sv-debug-output">${lastExec ? JSON.stringify(lastExec, null, 2) : 'No execution yet'}</pre>
                </div>
            </div>
        `;
    }
    
    /**
     * Render test result
     */
    renderTestResult() {
        const r = this.lastTestResult;
        if (!r) return '';
        
        return `
            <div class="sv-test-result ${r.bestMatch ? 'sv-match' : 'sv-no-match'}">
                <div class="sv-test-status">
                    ${r.bestMatch ? '✅ Match Found' : '❌ No Match'}
                </div>
                ${r.bestMatch ? `
                    <div class="sv-test-details">
                        <div><strong>Phrase:</strong> "${r.bestMatch.item.phrase}"</div>
                        <div><strong>Score:</strong> ${(r.bestMatch.score * 100).toFixed(1)}%</div>
                        <div><strong>Type:</strong> ${r.bestMatch.matchType}</div>
                        <div><strong>Intent:</strong> ${r.bestMatch.item.intentType}</div>
                        <div><strong>Has Action:</strong> ${r.bestMatch.item.actionMapping?.enabled ? 'Yes' : 'No'}</div>
                    </div>
                ` : ''}
                <div class="sv-test-timing">Elapsed: ${r.elapsed}</div>
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        document.getElementById('sv-close')?.addEventListener('click', () => this.hide());
        
        // Search
        document.getElementById('sv-search')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.render();
        });
        
        // New entry
        document.getElementById('sv-new')?.addEventListener('click', () => this.createNewEntry());
        
        // Import/Export
        document.getElementById('sv-import')?.addEventListener('click', () => this.importPack());
        document.getElementById('sv-export')?.addEventListener('click', () => this.exportPack());
        document.getElementById('sv-reset')?.addEventListener('click', () => this.resetToDefaults());
        
        // Entry list clicks
        document.querySelectorAll('.sv-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                this.selectEntry(id);
            });
        });
        
        // Editor buttons
        document.getElementById('sv-save')?.addEventListener('click', () => this.saveEntry());
        document.getElementById('sv-delete')?.addEventListener('click', () => this.deleteEntry());
        document.getElementById('sv-test')?.addEventListener('click', () => this.testSelectedEntry());
        
        // Action mapping toggle
        document.getElementById('sv-action-enabled')?.addEventListener('change', (e) => {
            const panel = document.getElementById('sv-action-mapping');
            if (panel) {
                panel.classList.toggle('disabled', !e.target.checked);
            }
        });
        
        // Add action button
        document.getElementById('sv-add-action')?.addEventListener('click', () => this.addAction());
        
        // Remove action buttons
        document.querySelectorAll('.sv-remove-action').forEach(btn => {
            btn.addEventListener('click', () => this.removeAction(parseInt(btn.dataset.index)));
        });
        
        // Debug toggle
        document.getElementById('sv-debug-toggle')?.addEventListener('click', () => {
            this.showDebug = !this.showDebug;
            document.getElementById('sv-debug')?.classList.toggle('collapsed', !this.showDebug);
        });
        
        // Test input
        document.getElementById('sv-run-test')?.addEventListener('click', () => this.runTest());
        document.getElementById('sv-test-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.runTest();
        });
        
        // Category filter
        document.getElementById('sv-category-filter')?.addEventListener('change', (e) => {
            this.searchQuery = e.target.value;
            this.render();
        });
    }
    
    /**
     * Select an entry for editing
     */
    selectEntry(id) {
        this.selectedEntry = this.storage.getById(id);
        this.render();
    }
    
    /**
     * Create new entry
     */
    async createNewEntry() {
        const newEntry = await this.storage.add({
            phrase: 'new phrase',
            definition: 'Define what this means',
            category: 'General',
            intentType: 'vibe',
            sentiment: 'neutral'
        });
        this.selectedEntry = newEntry;
        this.render();
    }
    
    /**
     * Save current entry
     */
    async saveEntry() {
        if (!this.selectedEntry) return;
        
        const updates = {
            phrase: document.getElementById('sv-phrase')?.value || '',
            definition: document.getElementById('sv-definition')?.value || '',
            category: document.getElementById('sv-category')?.value || 'General',
            intentType: document.getElementById('sv-intent-type')?.value || 'vibe',
            sentiment: document.getElementById('sv-sentiment')?.value || 'neutral',
            clarificationRule: document.getElementById('sv-clarification')?.value || 'neverAsk',
            tags: (document.getElementById('sv-tags')?.value || '')
                .split(',').map(t => t.trim()).filter(t => t),
            actionMapping: this.collectActionMapping()
        };
        
        await this.storage.update(this.selectedEntry.id, updates);
        this.selectedEntry = this.storage.getById(this.selectedEntry.id);
        this.render();
        
        this.showToast('Entry saved!', 'success');
    }
    
    /**
     * Collect action mapping from form
     */
    collectActionMapping() {
        const enabled = document.getElementById('sv-action-enabled')?.checked || false;
        const actions = [];
        
        document.querySelectorAll('.sv-action-item').forEach((item, index) => {
            const target = item.querySelector('.sv-action-target')?.value;
            const type = item.querySelector('.sv-action-type')?.value;
            const confirmationText = item.querySelector('.sv-action-confirm')?.value || '';
            
            let payload = {};
            
            switch (type) {
                case 'parameterDelta':
                    payload = {
                        paramName: item.querySelector('.sv-param-name')?.value || 'volume',
                        amount: parseFloat(item.querySelector('.sv-param-amount')?.value) || 0,
                        unit: item.querySelector('.sv-param-unit')?.value || 'db'
                    };
                    break;
                case 'reaperAction':
                    payload = { reaperActionId: item.querySelector('.sv-action-id')?.value || '' };
                    break;
                case 'reaperScript':
                    payload = { reaperScriptPath: item.querySelector('.sv-script-path')?.value || '' };
                    break;
                case 'fxChain':
                    payload = { fxChainName: item.querySelector('.sv-fx-chain')?.value || '' };
                    break;
            }
            
            actions.push({ target, type, payload, confirmationText });
        });
        
        return { enabled, actions };
    }
    
    /**
     * Delete current entry
     */
    async deleteEntry() {
        if (!this.selectedEntry) return;
        
        if (confirm(`Delete "${this.selectedEntry.phrase}"?`)) {
            await this.storage.delete(this.selectedEntry.id);
            this.selectedEntry = null;
            this.render();
            this.showToast('Entry deleted', 'success');
        }
    }
    
    /**
     * Add action to current entry
     */
    addAction() {
        if (!this.selectedEntry) return;
        
        if (!this.selectedEntry.actionMapping) {
            this.selectedEntry.actionMapping = { enabled: true, actions: [] };
        }
        
        this.selectedEntry.actionMapping.actions.push({
            target: 'selectedTrack',
            type: 'parameterDelta',
            payload: { paramName: 'volume', amount: 0, unit: 'db' },
            confirmationText: ''
        });
        
        this.render();
    }
    
    /**
     * Remove action from current entry
     */
    removeAction(index) {
        if (!this.selectedEntry?.actionMapping?.actions) return;
        
        this.selectedEntry.actionMapping.actions.splice(index, 1);
        this.render();
    }
    
    /**
     * Test selected entry
     */
    testSelectedEntry() {
        if (!this.selectedEntry) return;
        
        const phrase = document.getElementById('sv-phrase')?.value || this.selectedEntry.phrase;
        this.lastTestResult = this.matcher.testPhrase(phrase);
        this.render();
    }
    
    /**
     * Run test from debug panel
     */
    runTest() {
        const input = document.getElementById('sv-test-input')?.value;
        if (!input) return;
        
        this.lastTestResult = this.matcher.testPhrase(input);
        this.render();
    }
    
    /**
     * Export vocabulary pack
     */
    exportPack() {
        const pack = this.storage.exportPack();
        const json = JSON.stringify(pack, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `studio-vocabulary-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Pack exported!', 'success');
    }
    
    /**
     * Import vocabulary pack
     */
    importPack() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const pack = JSON.parse(text);
                
                const merge = confirm('Merge with existing entries?\n\nOK = Merge\nCancel = Replace all');
                const result = await this.storage.importPack(pack, merge);
                
                if (result.success) {
                    this.render();
                    this.showToast(`Imported ${result.count} entries!`, 'success');
                } else {
                    this.showToast('Import failed: ' + result.error, 'error');
                }
            } catch (e) {
                this.showToast('Invalid JSON file', 'error');
            }
        };
        
        input.click();
    }
    
    /**
     * Reset to defaults
     */
    async resetToDefaults() {
        if (confirm('Reset all vocabulary to defaults?\n\nThis will delete all custom entries.')) {
            await this.storage.resetToDefaults();
            this.selectedEntry = null;
            this.render();
            this.showToast('Reset to defaults', 'success');
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `sv-toast sv-toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    /**
     * Add styles
     */
    addStyles() {
        if (document.getElementById('studio-vocabulary-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'studio-vocabulary-styles';
        style.textContent = `
            .studio-vocab-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'SF Pro Display', -apple-system, sans-serif;
            }
            
            .sv-container {
                width: 95%;
                max-width: 1200px;
                height: 90%;
                max-height: 800px;
                background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .sv-header {
                padding: 20px 24px;
                background: rgba(255, 255, 255, 0.03);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
            }
            
            .sv-header h2 {
                margin: 0;
                font-size: 24px;
                color: #fff;
            }
            
            .sv-subtitle {
                margin: 4px 0 0;
                color: rgba(255, 255, 255, 0.5);
                font-size: 13px;
            }
            
            .sv-close-btn {
                position: absolute;
                top: 16px;
                right: 20px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.5);
                font-size: 28px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .sv-close-btn:hover { color: #fff; }
            
            .sv-toolbar {
                padding: 12px 24px;
                display: flex;
                gap: 16px;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .sv-search {
                flex: 1;
            }
            
            .sv-search input {
                width: 100%;
                padding: 10px 14px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.3);
                color: #fff;
                font-size: 14px;
            }
            
            .sv-actions {
                display: flex;
                gap: 8px;
            }
            
            .sv-btn {
                padding: 8px 16px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(255, 255, 255, 0.05);
                color: #fff;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .sv-btn:hover { background: rgba(255, 255, 255, 0.1); }
            
            .sv-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-color: transparent;
            }
            .sv-btn-primary:hover { opacity: 0.9; }
            
            .sv-btn-danger {
                background: rgba(239, 68, 68, 0.2);
                border-color: rgba(239, 68, 68, 0.3);
                color: #f87171;
            }
            .sv-btn-danger:hover { background: rgba(239, 68, 68, 0.3); }
            
            .sv-btn-small {
                padding: 4px 10px;
                font-size: 12px;
            }
            
            .sv-main {
                flex: 1;
                display: flex;
                overflow: hidden;
            }
            
            .sv-list-panel {
                width: 350px;
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                flex-direction: column;
            }
            
            .sv-list-header {
                padding: 10px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .sv-list-header select {
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.3);
                color: #fff;
                font-size: 11px;
            }
            
            .sv-list {
                flex: 1;
                overflow-y: auto;
            }
            
            .sv-list-item {
                padding: 12px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                cursor: pointer;
                transition: background 0.2s;
            }
            .sv-list-item:hover { background: rgba(255, 255, 255, 0.03); }
            .sv-list-item.selected { background: rgba(102, 126, 234, 0.2); }
            
            .sv-item-main {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }
            
            .sv-item-phrase {
                font-size: 14px;
                color: #fff;
                font-weight: 500;
            }
            
            .sv-item-type {
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
                text-transform: uppercase;
            }
            .sv-type-vibe { background: rgba(168, 85, 247, 0.3); color: #c4b5fd; }
            .sv-type-action { background: rgba(34, 197, 94, 0.3); color: #86efac; }
            
            .sv-item-meta {
                display: flex;
                gap: 8px;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
            }
            
            .sv-item-sentiment {
                padding: 1px 5px;
                border-radius: 3px;
            }
            .sv-sentiment-positive { background: rgba(34, 197, 94, 0.2); color: #86efac; }
            .sv-sentiment-neutral { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
            .sv-sentiment-negative { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
            
            .sv-item-action { color: #fbbf24; }
            
            .sv-editor-panel {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            .sv-editor-empty {
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: rgba(255, 255, 255, 0.3);
            }
            
            .sv-empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            
            .sv-editor {
                max-width: 600px;
            }
            
            .sv-field {
                margin-bottom: 16px;
            }
            
            .sv-field label {
                display: block;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .sv-field input,
            .sv-field select,
            .sv-field textarea {
                width: 100%;
                padding: 10px 12px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.3);
                color: #fff;
                font-size: 14px;
            }
            
            .sv-field-row {
                display: flex;
                gap: 16px;
            }
            
            .sv-field-row .sv-field {
                flex: 1;
            }
            
            .sv-section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .sv-section-header {
                margin-bottom: 12px;
            }
            
            .sv-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 14px;
                color: #fff;
            }
            
            .sv-checkbox input {
                width: 18px;
                height: 18px;
            }
            
            .sv-action-mapping.disabled {
                opacity: 0.4;
                pointer-events: none;
            }
            
            .sv-action-item {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
            }
            
            .sv-action-row {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .sv-action-row:last-child {
                margin-bottom: 0;
            }
            
            .sv-action-row select,
            .sv-action-row input {
                flex: 1;
                padding: 6px 10px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.3);
                color: #fff;
                font-size: 12px;
            }
            
            .sv-action-empty {
                text-align: center;
                padding: 20px;
                color: rgba(255, 255, 255, 0.4);
            }
            
            .sv-editor-actions {
                margin-top: 24px;
                display: flex;
                gap: 8px;
            }
            
            .sv-debug-panel {
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.2);
            }
            
            .sv-debug-panel.collapsed .sv-debug-content {
                display: none;
            }
            
            .sv-debug-header {
                padding: 10px 24px;
                display: flex;
                justify-content: space-between;
                cursor: pointer;
                color: rgba(255, 255, 255, 0.6);
                font-size: 12px;
            }
            .sv-debug-header:hover { color: #fff; }
            
            .sv-debug-content {
                padding: 0 24px 16px;
            }
            
            .sv-debug-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 16px;
            }
            
            .sv-debug-section h4 {
                margin: 0 0 8px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
                text-transform: uppercase;
            }
            
            .sv-debug-test {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .sv-debug-test input {
                flex: 1;
                padding: 8px 10px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.3);
                color: #fff;
                font-size: 12px;
            }
            
            .sv-debug-output {
                background: rgba(0, 0, 0, 0.4);
                border-radius: 6px;
                padding: 10px;
                font-size: 10px;
                color: rgba(255, 255, 255, 0.7);
                max-height: 150px;
                overflow: auto;
                white-space: pre-wrap;
                word-break: break-all;
                font-family: 'SF Mono', monospace;
            }
            
            .sv-test-result {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 6px;
                padding: 12px;
            }
            
            .sv-test-result.sv-match {
                border: 1px solid rgba(34, 197, 94, 0.3);
            }
            
            .sv-test-result.sv-no-match {
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            
            .sv-test-status {
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .sv-test-details {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .sv-test-details > div {
                margin-bottom: 4px;
            }
            
            .sv-test-timing {
                margin-top: 8px;
                font-size: 10px;
                color: rgba(255, 255, 255, 0.4);
            }
            
            .sv-empty {
                padding: 40px;
                text-align: center;
                color: rgba(255, 255, 255, 0.3);
            }
            
            .sv-toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                padding: 12px 24px;
                border-radius: 8px;
                background: #1e293b;
                color: #fff;
                font-size: 14px;
                z-index: 10002;
                transition: transform 0.3s ease;
            }
            
            .sv-toast.show {
                transform: translateX(-50%) translateY(0);
            }
            
            .sv-toast-success { background: rgba(34, 197, 94, 0.9); }
            .sv-toast-error { background: rgba(239, 68, 68, 0.9); }
        `;
        
        document.head.appendChild(style);
    }
}

// Global instance
window.studioVocabularyUI = new StudioVocabularyUI();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudioVocabularyUI;
}
