/**
 * Session Aware UI
 * =================
 * Visual interface for the Session Aware system
 */

class SessionAwareUI {
    constructor(rheaController) {
        this.rhea = rheaController;
        this.sessionAware = null;
        this.modal = null;
        this.statusWidget = null;
        
        // Initialize the Session Aware system
        this.initSystem();
    }
    
    initSystem() {
        if (typeof SessionAwareSystem !== 'undefined') {
            this.sessionAware = new SessionAwareSystem(this.rhea);
            console.log('🧠 Session Aware UI initialized');
        } else {
            console.error('SessionAwareSystem not loaded');
        }
    }
    
    // ========================================
    // FLOATING STATUS WIDGET
    // ========================================
    
    createStatusWidget() {
        if (this.statusWidget) return;
        
        this.statusWidget = document.createElement('div');
        this.statusWidget.id = 'session-aware-widget';
        this.statusWidget.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95));
            border: 1px solid rgba(156, 39, 176, 0.4);
            border-radius: 12px;
            padding: 15px;
            min-width: 200px;
            z-index: 9000;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        
        this.statusWidget.innerHTML = this.getWidgetContent();
        
        // Click to expand
        this.statusWidget.addEventListener('click', () => this.showModal());
        
        document.body.appendChild(this.statusWidget);
        
        // Update every 5 seconds
        this.widgetInterval = setInterval(() => this.updateWidget(), 5000);
    }
    
    getWidgetContent() {
        if (!this.sessionAware) {
            return `<div style="color: #888;">Session Aware loading...</div>`;
        }
        
        const status = this.sessionAware.getStatus();
        const modeEmojis = {
            recording: '🎤',
            mixing: '🎛️',
            mastering: '🎯',
            beatmaking: '🥁',
            editing: '✂️',
            composing: '🎹',
            unknown: '🎵'
        };
        
        const modeEmoji = modeEmojis[status.mode] || '🎵';
        const modeLabel = status.mode.charAt(0).toUpperCase() + status.mode.slice(1);
        
        return `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span style="font-size: 24px;">${modeEmoji}</span>
                <div>
                    <div style="color: #BA68C8; font-weight: bold; font-size: 12px;">SESSION AWARE</div>
                    <div style="color: #fff; font-size: 14px;">${modeLabel} Mode</div>
                </div>
                <div style="margin-left: auto; width: 10px; height: 10px; border-radius: 50%; background: ${status.isActive ? '#4CAF50' : '#666'};"></div>
            </div>
            <div style="display: flex; gap: 15px; color: #888; font-size: 11px;">
                <span>⏱️ ${status.sessionDuration}m</span>
                <span>📝 ${status.actionsLogged}</span>
                <span>🧠 ${status.learnedPatterns}</span>
            </div>
        `;
    }
    
    updateWidget() {
        if (this.statusWidget) {
            this.statusWidget.innerHTML = this.getWidgetContent();
        }
    }
    
    hideWidget() {
        if (this.statusWidget) {
            this.statusWidget.remove();
            this.statusWidget = null;
        }
        if (this.widgetInterval) {
            clearInterval(this.widgetInterval);
        }
    }
    
    // ========================================
    // FULL MODAL
    // ========================================
    
    showModal() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.updateModalContent();
            return;
        }
        this.createModal();
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'session-aware-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;
        
        const content = document.createElement('div');
        content.id = 'session-aware-content';
        content.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 30px;
            border-radius: 20px;
            max-width: 700px;
            width: 95%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(156, 39, 176, 0.3);
        `;
        
        content.innerHTML = this.getModalContent();
        this.modal.appendChild(content);
        document.body.appendChild(this.modal);
        
        this.setupModalEvents();
        
        // Auto-refresh
        this.modalInterval = setInterval(() => this.updateModalContent(), 3000);
    }
    
    getModalContent() {
        const status = this.sessionAware?.getStatus() || {};
        const isActive = status.isActive || false;
        
        const modeOptions = ['recording', 'mixing', 'mastering', 'beatmaking', 'editing', 'composing'];
        const modeEmojis = {
            recording: '🎤',
            mixing: '🎛️',
            mastering: '🎯',
            beatmaking: '🥁',
            editing: '✂️',
            composing: '🎹'
        };
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="color: #fff; margin: 0; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🧠</span>
                    Session Aware
                </h2>
                <button id="sa-close-btn" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer;">×</button>
            </div>
            
            <!-- Status Banner -->
            <div style="background: ${isActive ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${isActive ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: ${isActive ? '#4CAF50' : '#888'}; font-size: 14px; font-weight: bold;">
                            ${isActive ? '🟢 ACTIVE - Learning Your Workflow' : '⏸️ INACTIVE'}
                        </div>
                        <div style="color: #aaa; font-size: 12px; margin-top: 5px;">
                            ${isActive ? `Session: ${status.sessionDuration || 0} min • ${status.actionsLogged || 0} actions logged` : 'Click Start to begin session awareness'}
                        </div>
                    </div>
                    <button id="sa-toggle-btn" style="padding: 12px 24px; background: ${isActive ? 'linear-gradient(135deg, #f44336, #d32f2f)' : 'linear-gradient(135deg, #4CAF50, #45a049)'}; border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer;">
                        ${isActive ? '⏹️ Stop' : '▶️ Start'}
                    </button>
                </div>
            </div>
            
            <!-- Current Mode -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #BA68C8; margin: 0 0 15px 0; font-size: 14px;">📍 Current Mode (Auto-Detected)</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    ${modeOptions.map(mode => `
                        <button class="mode-btn" data-mode="${mode}" style="padding: 15px; background: ${status.mode === mode ? 'rgba(156, 39, 176, 0.3)' : 'rgba(255, 255, 255, 0.05)'}; border: 2px solid ${status.mode === mode ? '#BA68C8' : 'transparent'}; border-radius: 10px; color: #fff; cursor: pointer; text-align: center; transition: all 0.2s;">
                            <div style="font-size: 24px; margin-bottom: 5px;">${modeEmojis[mode]}</div>
                            <div style="font-size: 12px; text-transform: capitalize;">${mode}</div>
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <!-- Learned Patterns -->
            <div style="margin-bottom: 25px; padding: 20px; background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); border-radius: 12px;">
                <h3 style="color: #2196F3; margin: 0 0 15px 0; font-size: 14px;">🧠 What I've Learned</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                        <div style="color: #888; font-size: 11px;">Learned Patterns</div>
                        <div style="color: #2196F3; font-size: 24px; font-weight: bold;">${status.learnedPatterns || 0}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                        <div style="color: #888; font-size: 11px;">Actions Tracked</div>
                        <div style="color: #4CAF50; font-size: 24px; font-weight: bold;">${status.actionsLogged || 0}</div>
                    </div>
                </div>
                
                ${status.topPlugins && status.topPlugins.length > 0 ? `
                    <div style="margin-top: 15px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 8px;">Your Favorite Plugins</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${status.topPlugins.map(([name, count]) => `
                                <span style="padding: 5px 10px; background: rgba(33, 150, 243, 0.2); border-radius: 15px; color: #81D4FA; font-size: 11px;">
                                    ${name} (${count}x)
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <!-- Quick Suggestion -->
            <div style="margin-bottom: 25px; padding: 20px; background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 12px;">
                <h3 style="color: #FF9800; margin: 0 0 15px 0; font-size: 14px;">💡 Contextual Tip</h3>
                <p id="sa-tip" style="color: #fff; margin: 0; font-style: italic;">"${this.sessionAware?.getSuggestion() || 'Start a session to get personalized tips!'}"</p>
                <button id="sa-new-tip" style="margin-top: 12px; padding: 8px 16px; background: rgba(255, 152, 0, 0.2); border: 1px solid rgba(255, 152, 0, 0.4); border-radius: 6px; color: #FF9800; cursor: pointer; font-size: 12px;">
                    🔄 New Tip
                </button>
            </div>
            
            <!-- Info -->
            <div style="background: rgba(255, 255, 255, 0.03); padding: 15px; border-radius: 10px; border-left: 3px solid #BA68C8;">
                <p style="color: #aaa; margin: 0; font-size: 12px; line-height: 1.6;">
                    <strong style="color: #BA68C8;">How it works:</strong> Session Aware observes your workflow patterns, 
                    learns your preferences, and provides intelligent suggestions based on what you're doing. 
                    The more you use it, the smarter it gets!
                </p>
            </div>
        `;
    }
    
    updateModalContent() {
        const content = document.getElementById('session-aware-content');
        if (content) {
            content.innerHTML = this.getModalContent();
            this.setupModalEvents();
        }
    }
    
    setupModalEvents() {
        // Close button
        document.getElementById('sa-close-btn')?.addEventListener('click', () => this.hideModal());
        
        // Toggle button
        document.getElementById('sa-toggle-btn')?.addEventListener('click', () => {
            if (this.sessionAware?.isActive) {
                this.sessionAware.stop();
                this.hideWidget();
            } else {
                this.sessionAware.start();
                this.createStatusWidget();
            }
            this.updateModalContent();
            this.updateWidget();
        });
        
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.sessionAware?.setMode(mode);
                this.updateModalContent();
                this.updateWidget();
            });
        });
        
        // New tip button
        document.getElementById('sa-new-tip')?.addEventListener('click', () => {
            const tipEl = document.getElementById('sa-tip');
            if (tipEl && this.sessionAware) {
                tipEl.textContent = `"${this.sessionAware.getSuggestion()}"`;
            }
        });
        
        // Close on background click
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });
    }
    
    hideModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        if (this.modalInterval) {
            clearInterval(this.modalInterval);
        }
    }
    
    // ========================================
    // PUBLIC API
    // ========================================
    
    toggle() {
        if (this.modal?.style.display === 'flex') {
            this.hideModal();
        } else {
            this.showModal();
        }
    }
    
    start() {
        this.sessionAware?.start();
        this.createStatusWidget();
    }
    
    stop() {
        this.sessionAware?.stop();
        this.hideWidget();
    }
}

// ========================================
// AUTO-INITIALIZE
// ========================================

// Wait for DOM and RHEA
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for RHEA to initialize
    setTimeout(() => {
        const rhea = window.rhea || window.rheaController;
        
        if (!window.sessionAwareUI) {
            window.sessionAwareUI = new SessionAwareUI(rhea);
            
            // Setup button click
            const btn = document.getElementById('session-aware-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    window.sessionAwareUI.showModal();
                });
            }
            
            console.log('🧠 Session Aware UI ready');
        }
    }, 1500);
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SessionAwareUI };
}

