/**
 * Command HUD (Heads-Up Display)
 * ==============================
 * Real-time visual feedback for voice pipeline:
 * - Current state (Listening/Transcribing/Executing)
 * - Last transcript (interim + final)
 * - Confidence meter
 * - Hover target (from screen awareness)
 * - Action preview with cancel window
 * - Performance metrics
 */

class CommandHUD {
    constructor(pipeline, options = {}) {
        this.pipeline = pipeline;
        this.options = {
            position: options.position || 'top-right',
            showMetrics: options.showMetrics !== false,
            showLog: options.showLog || false,
            maxLogLines: options.maxLogLines || 5,
            theme: options.theme || 'dark',
            compact: options.compact || false,
            ...options
        };
        
        this.element = null;
        this.isVisible = true;
        this.cancelCountdown = null;
        
        // Drag state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.createUI();
        this.attachListeners();
        this.setupDragging();
        
        console.log('📺 Command HUD initialized (draggable)');
    }
    
    setupDragging() {
        const header = this.element.querySelector('.hud-header');
        if (!header) return;
        
        let startX, startY, initialX, initialY;
        
        // Enable GPU acceleration
        this.element.style.willChange = 'transform';
        
        header.style.cursor = 'grab';
        
        const onMouseDown = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            
            this.isDragging = true;
            header.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
            
            const rect = this.element.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialX = rect.left;
            initialY = rect.top;
            
            // Lock to fixed positioning on first drag
            if (!this.element.style.transform || this.element.style.transform === 'none') {
                this.element.classList.remove('top-left', 'top-right', 'bottom-left', 'bottom-right');
                this.element.style.position = 'fixed';
                this.element.style.top = '0';
                this.element.style.left = '0';
                this.element.style.right = 'auto';
                this.element.style.bottom = 'auto';
                this.element.style.transform = `translate(${initialX}px, ${initialY}px)`;
            }
            
            e.preventDefault();
        };
        
        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newX = initialX + dx;
            let newY = initialY + dy;
            
            // Clamp to viewport
            const w = this.element.offsetWidth;
            const h = this.element.offsetHeight;
            newX = Math.max(0, Math.min(newX, window.innerWidth - w));
            newY = Math.max(0, Math.min(newY, window.innerHeight - h));
            
            // Use transform for instant GPU-accelerated movement
            this.element.style.transform = `translate(${newX}px, ${newY}px)`;
        };
        
        const onMouseUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                header.style.cursor = 'grab';
                document.body.style.userSelect = '';
                
                // Save current transform position
                const match = this.element.style.transform.match(/translate\((\d+(?:\.\d+)?)px,\s*(\d+(?:\.\d+)?)px\)/);
                if (match) {
                    try {
                        localStorage.setItem('dawrv-hud-pos', JSON.stringify({ x: parseFloat(match[1]), y: parseFloat(match[2]) }));
                    } catch (e) {}
                }
            }
        };
        
        header.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Restore saved position
        try {
            const saved = localStorage.getItem('dawrv-hud-pos');
            if (saved) {
                const pos = JSON.parse(saved);
                this.element.classList.remove('top-left', 'top-right', 'bottom-left', 'bottom-right');
                this.element.style.position = 'fixed';
                this.element.style.top = '0';
                this.element.style.left = '0';
                this.element.style.right = 'auto';
                this.element.style.bottom = 'auto';
                this.element.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            }
        } catch (e) {}
    }
    
    createUI() {
        // Remove existing HUD if present
        const existing = document.getElementById('command-hud');
        if (existing) {
            existing.remove();
        }
        
        // Create main container
        this.element = document.createElement('div');
        this.element.id = 'command-hud';
        this.element.className = `command-hud ${this.options.position} ${this.options.theme} ${this.options.compact ? 'compact' : ''}`;
        
        this.element.innerHTML = `
            <div class="hud-header" title="Drag to move">
                <span class="hud-drag-handle">⋮⋮</span>
                <span class="hud-title">🎙️ RHEA Voice</span>
                <span class="hud-state" id="hud-state">IDLE</span>
                <button class="hud-toggle" id="hud-toggle" title="Toggle HUD">−</button>
            </div>
            
            <div class="hud-body" id="hud-body">
                <!-- State Indicator -->
                <div class="hud-section hud-state-indicator">
                    <div class="state-ring" id="state-ring"></div>
                    <div class="state-label" id="state-label">Ready</div>
                </div>
                
                <!-- Transcript -->
                <div class="hud-section hud-transcript">
                    <label>Transcript</label>
                    <div class="transcript-container">
                        <div class="transcript-interim" id="transcript-interim"></div>
                        <div class="transcript-final" id="transcript-final">Listening...</div>
                    </div>
                </div>
                
                <!-- Confidence Meter -->
                <div class="hud-section hud-confidence">
                    <label>Confidence</label>
                    <div class="confidence-bar-container">
                        <div class="confidence-bar" id="confidence-bar"></div>
                        <span class="confidence-value" id="confidence-value">—</span>
                    </div>
                </div>
                
                <!-- Hover Context -->
                <div class="hud-section hud-context">
                    <label>Context</label>
                    <div class="context-info" id="context-info">
                        <span class="context-track" id="context-track">—</span>
                        <span class="context-control" id="context-control">—</span>
                    </div>
                </div>
                
                <!-- Action Preview / Cancel Window -->
                <div class="hud-section hud-action-preview" id="action-preview-section" style="display: none;">
                    <label>Executing</label>
                    <div class="action-preview">
                        <span class="action-name" id="action-name"></span>
                        <div class="cancel-countdown" id="cancel-countdown">
                            <div class="cancel-bar" id="cancel-bar"></div>
                        </div>
                        <button class="cancel-btn" id="cancel-btn">Cancel</button>
                    </div>
                </div>
                
                <!-- Intent Preview -->
                <div class="hud-section hud-intent" id="intent-section" style="display: none;">
                    <label>Intent</label>
                    <div class="intent-preview" id="intent-preview"></div>
                </div>
                
                <!-- Metrics -->
                <div class="hud-section hud-metrics" id="metrics-section" ${this.options.showMetrics ? '' : 'style="display: none;"'}>
                    <label>Metrics</label>
                    <div class="metrics-grid">
                        <div class="metric">
                            <span class="metric-label">Latency</span>
                            <span class="metric-value" id="metric-latency">—</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Success</span>
                            <span class="metric-value" id="metric-success">—</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Commands</span>
                            <span class="metric-value" id="metric-commands">0</span>
                        </div>
                    </div>
                </div>
                
                <!-- Log (optional) -->
                <div class="hud-section hud-log" id="log-section" ${this.options.showLog ? '' : 'style="display: none;"'}>
                    <label>Log</label>
                    <div class="log-container" id="log-container"></div>
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Add to document
        document.body.appendChild(this.element);
        
        // Setup toggle button
        document.getElementById('hud-toggle').onclick = () => this.toggleBody();
        document.getElementById('cancel-btn').onclick = () => this.handleCancel();
    }
    
    addStyles() {
        if (document.getElementById('command-hud-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'command-hud-styles';
        style.textContent = `
            .command-hud {
                position: fixed;
                z-index: 10000;
                width: 280px;
                background: rgba(20, 22, 30, 0.95);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                font-family: 'SF Mono', 'Fira Code', monospace;
                font-size: 11px;
                color: #e0e0e0;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                /* No transition on transform for instant drag */
                transition: opacity 0.2s ease, box-shadow 0.2s ease;
            }
            
            .command-hud.top-right { top: 20px; right: 20px; }
            .command-hud.top-left { top: 20px; left: 20px; }
            .command-hud.bottom-right { bottom: 20px; right: 20px; }
            .command-hud.bottom-left { bottom: 20px; left: 20px; }
            
            .command-hud.compact { width: 220px; }
            .command-hud.compact .hud-section { padding: 6px 10px; }
            
            .hud-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 12px;
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px 12px 0 0;
                user-select: none;
            }
            
            .hud-drag-handle {
                color: rgba(255, 255, 255, 0.3);
                font-size: 10px;
                letter-spacing: -3px;
                margin-right: 6px;
                cursor: grab;
            }
            .hud-header:active .hud-drag-handle { cursor: grabbing; }
            
            .hud-title {
                font-weight: 600;
                font-size: 12px;
            }
            
            .hud-state {
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                background: rgba(100, 100, 100, 0.3);
            }
            
            .hud-state.listening { background: rgba(76, 175, 80, 0.3); color: #81c784; }
            .hud-state.transcribing { background: rgba(33, 150, 243, 0.3); color: #64b5f6; }
            .hud-state.parsing { background: rgba(156, 39, 176, 0.3); color: #ce93d8; }
            .hud-state.executing { background: rgba(255, 152, 0, 0.3); color: #ffb74d; }
            .hud-state.confirming { background: rgba(255, 193, 7, 0.3); color: #ffd54f; }
            .hud-state.speaking { background: rgba(0, 188, 212, 0.3); color: #4dd0e1; }
            .hud-state.error { background: rgba(244, 67, 54, 0.3); color: #ef5350; }
            
            .hud-toggle {
                background: none;
                border: none;
                color: #888;
                font-size: 16px;
                cursor: pointer;
                padding: 0 4px;
            }
            .hud-toggle:hover { color: #fff; }
            
            .hud-body {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .hud-body.collapsed {
                display: none;
            }
            
            .hud-section {
                padding: 8px 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .hud-section:last-child {
                border-bottom: none;
            }
            
            .hud-section label {
                display: block;
                font-size: 9px;
                text-transform: uppercase;
                color: #888;
                margin-bottom: 4px;
                letter-spacing: 0.5px;
            }
            
            /* State Indicator */
            .hud-state-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .state-ring {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid #555;
                position: relative;
            }
            
            .state-ring.listening {
                border-color: #4caf50;
                animation: pulse 1.5s infinite;
            }
            
            .state-ring.transcribing {
                border-color: #2196f3;
                animation: spin 1s linear infinite;
            }
            
            .state-ring.executing {
                border-color: #ff9800;
                animation: pulse 0.5s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .state-label {
                font-size: 12px;
                font-weight: 500;
            }
            
            /* Transcript */
            .transcript-container {
                min-height: 36px;
            }
            
            .transcript-interim {
                color: #888;
                font-style: italic;
                font-size: 11px;
            }
            
            .transcript-final {
                color: #fff;
                font-size: 12px;
                font-weight: 500;
            }
            
            /* Confidence */
            .confidence-bar-container {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .confidence-bar {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
                position: relative;
            }
            
            .confidence-bar::after {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                width: var(--confidence, 0%);
                background: linear-gradient(90deg, #f44336, #ff9800, #4caf50);
                border-radius: 3px;
                transition: width 0.3s ease;
            }
            
            .confidence-value {
                font-size: 11px;
                font-weight: 600;
                min-width: 35px;
                text-align: right;
            }
            
            /* Context */
            .context-info {
                display: flex;
                gap: 8px;
            }
            
            .context-track, .context-control {
                padding: 2px 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                font-size: 10px;
            }
            
            .context-track.active { background: rgba(76, 175, 80, 0.3); }
            .context-control.active { background: rgba(33, 150, 243, 0.3); }
            
            /* Action Preview */
            .action-preview {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .action-name {
                font-size: 12px;
                font-weight: 600;
                color: #ffb74d;
            }
            
            .cancel-countdown {
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                overflow: hidden;
            }
            
            .cancel-bar {
                height: 100%;
                width: 100%;
                background: #ff9800;
                transition: width linear;
            }
            
            .cancel-btn {
                padding: 4px 12px;
                background: rgba(244, 67, 54, 0.3);
                border: 1px solid rgba(244, 67, 54, 0.5);
                color: #ef5350;
                border-radius: 4px;
                font-size: 10px;
                cursor: pointer;
                align-self: flex-end;
            }
            
            .cancel-btn:hover {
                background: rgba(244, 67, 54, 0.5);
            }
            
            /* Intent Preview */
            .intent-preview {
                padding: 4px 8px;
                background: rgba(156, 39, 176, 0.2);
                border-radius: 4px;
                font-size: 11px;
                color: #ce93d8;
            }
            
            /* Metrics */
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
            }
            
            .metric {
                text-align: center;
            }
            
            .metric-label {
                display: block;
                font-size: 8px;
                color: #666;
                margin-bottom: 2px;
            }
            
            .metric-value {
                font-size: 12px;
                font-weight: 600;
            }
            
            /* Log */
            .log-container {
                max-height: 80px;
                overflow-y: auto;
                font-size: 9px;
                font-family: monospace;
                color: #888;
            }
            
            .log-entry {
                padding: 2px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .log-entry .time { color: #555; }
            .log-entry .event { color: #64b5f6; }
            .log-entry .data { color: #aaa; }
        `;
        
        document.head.appendChild(style);
    }
    
    attachListeners() {
        if (!this.pipeline) return;
        
        // State changes
        this.pipeline.on('state-change', (data) => {
            this.updateState(data.to);
        });
        
        // Transcript updates
        this.pipeline.on('interim-transcript', (data) => {
            this.updateTranscript(data.text || data, null, data.confidence);
        });
        
        // Intent preview
        this.pipeline.on('intent', (intent) => {
            this.updateIntent(intent);
        });
        
        this.pipeline.on('intent-preview', (intent) => {
            this.updateIntentPreview(intent);
        });
        
        // Cancel window
        this.pipeline.on('cancel-window-start', (data) => {
            this.showCancelWindow(data.intent, data.durationMs);
        });
        
        // Execution
        this.pipeline.on('execution-complete', (data) => {
            this.hideCancelWindow();
            this.updateMetrics();
        });
        
        this.pipeline.on('execution-cancelled', () => {
            this.hideCancelWindow();
        });
        
        // Context updates
        this.pipeline.on('context-update', (context) => {
            this.updateContext(context);
        });
        
        // Log entries
        this.pipeline.on('log', (entry) => {
            this.addLogEntry(entry);
        });
        
        // Final transcript
        this.pipeline.on('speak', () => {
            // Update transcript display after processing
        });
    }
    
    // ========================================================================
    // UI UPDATES
    // ========================================================================
    
    updateState(state) {
        const stateEl = document.getElementById('hud-state');
        const ringEl = document.getElementById('state-ring');
        const labelEl = document.getElementById('state-label');
        
        if (stateEl) {
            stateEl.textContent = state;
            stateEl.className = 'hud-state ' + state.toLowerCase();
        }
        
        if (ringEl) {
            ringEl.className = 'state-ring ' + state.toLowerCase();
        }
        
        if (labelEl) {
            const labels = {
                'IDLE': 'Ready',
                'LISTENING': 'Listening...',
                'TRANSCRIBING': 'Processing...',
                'PARSING': 'Understanding...',
                'CONFIRMING': 'Awaiting confirmation',
                'EXECUTING': 'Executing...',
                'SPEAKING': 'Speaking...',
                'ERROR': 'Error'
            };
            labelEl.textContent = labels[state] || state;
        }
    }
    
    updateTranscript(interim, final, confidence) {
        const interimEl = document.getElementById('transcript-interim');
        const finalEl = document.getElementById('transcript-final');
        const confBar = document.getElementById('confidence-bar');
        const confValue = document.getElementById('confidence-value');
        
        if (interim && interimEl) {
            interimEl.textContent = interim;
        }
        
        if (final && finalEl) {
            finalEl.textContent = final;
            if (interimEl) interimEl.textContent = '';
        }
        
        if (confidence !== undefined && confidence !== null) {
            const pct = Math.round(confidence * 100);
            if (confBar) confBar.style.setProperty('--confidence', pct + '%');
            if (confValue) confValue.textContent = pct + '%';
        }
    }
    
    updateIntent(intent) {
        const section = document.getElementById('intent-section');
        const preview = document.getElementById('intent-preview');
        
        if (intent && section && preview) {
            section.style.display = 'block';
            preview.textContent = intent.readable || JSON.stringify(intent);
        }
    }
    
    updateIntentPreview(intent) {
        // Quick preview during interim recognition
        const section = document.getElementById('intent-section');
        const preview = document.getElementById('intent-preview');
        
        if (intent && section && preview) {
            section.style.display = 'block';
            preview.textContent = `(preview) ${intent.action || 'unknown'}`;
            preview.style.opacity = '0.6';
        }
    }
    
    updateContext(context) {
        const trackEl = document.getElementById('context-track');
        const controlEl = document.getElementById('context-control');
        
        if (trackEl) {
            if (context?.activeTrack) {
                trackEl.textContent = `Track ${context.activeTrack}`;
                trackEl.classList.add('active');
            } else {
                trackEl.textContent = '—';
                trackEl.classList.remove('active');
            }
        }
        
        if (controlEl) {
            if (context?.activeControl?.type) {
                controlEl.textContent = context.activeControl.type;
                controlEl.classList.add('active');
            } else {
                controlEl.textContent = '—';
                controlEl.classList.remove('active');
            }
        }
    }
    
    showCancelWindow(intent, durationMs) {
        const section = document.getElementById('action-preview-section');
        const nameEl = document.getElementById('action-name');
        const barEl = document.getElementById('cancel-bar');
        
        if (section && nameEl && barEl) {
            section.style.display = 'block';
            nameEl.textContent = intent.readable || intent.action;
            
            // Animate countdown bar
            barEl.style.transition = 'none';
            barEl.style.width = '100%';
            
            requestAnimationFrame(() => {
                barEl.style.transition = `width ${durationMs}ms linear`;
                barEl.style.width = '0%';
            });
            
            this.cancelCountdown = setTimeout(() => {
                this.hideCancelWindow();
            }, durationMs);
        }
    }
    
    hideCancelWindow() {
        const section = document.getElementById('action-preview-section');
        if (section) {
            section.style.display = 'none';
        }
        
        if (this.cancelCountdown) {
            clearTimeout(this.cancelCountdown);
            this.cancelCountdown = null;
        }
    }
    
    updateMetrics() {
        if (!this.pipeline) return;
        
        const metrics = this.pipeline.getMetrics();
        
        const latencyEl = document.getElementById('metric-latency');
        const successEl = document.getElementById('metric-success');
        const commandsEl = document.getElementById('metric-commands');
        
        if (latencyEl) latencyEl.textContent = Math.round(metrics.avgLatencyMs) + 'ms';
        if (successEl) successEl.textContent = metrics.successRate;
        if (commandsEl) commandsEl.textContent = metrics.commandCount;
    }
    
    addLogEntry(entry) {
        if (!this.options.showLog) return;
        
        const container = document.getElementById('log-container');
        if (!container) return;
        
        const div = document.createElement('div');
        div.className = 'log-entry';
        
        const time = new Date(entry.timestamp).toLocaleTimeString();
        div.innerHTML = `
            <span class="time">${time}</span>
            <span class="event">${entry.event}</span>
            <span class="data">${JSON.stringify(entry).slice(0, 50)}...</span>
        `;
        
        container.insertBefore(div, container.firstChild);
        
        // Limit entries
        while (container.children.length > this.options.maxLogLines) {
            container.removeChild(container.lastChild);
        }
    }
    
    // ========================================================================
    // CONTROLS
    // ========================================================================
    
    toggleBody() {
        const body = document.getElementById('hud-body');
        const toggle = document.getElementById('hud-toggle');
        
        if (body.classList.contains('collapsed')) {
            body.classList.remove('collapsed');
            toggle.textContent = '−';
        } else {
            body.classList.add('collapsed');
            toggle.textContent = '+';
        }
    }
    
    handleCancel() {
        if (this.pipeline) {
            this.pipeline.handleCancel();
        }
        this.hideCancelWindow();
    }
    
    show() {
        if (this.element) {
            this.element.style.display = 'block';
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.isVisible = false;
        }
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    setPosition(position) {
        if (this.element) {
            this.element.classList.remove('top-left', 'top-right', 'bottom-left', 'bottom-right');
            this.element.classList.add(position);
            this.options.position = position;
        }
    }
    
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandHUD;
}

if (typeof window !== 'undefined') {
    window.CommandHUD = CommandHUD;
}
