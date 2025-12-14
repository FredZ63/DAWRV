/**
 * D-ID Configuration UI
 * Settings panel for configuring D-ID animated avatar
 */

class DIDConfigUI {
    constructor() {
        this.modal = null;
        this.didService = null;
        this.animatedAvatar = null;
        
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        this.didService = window.DIDService;
        this.animatedAvatar = window.AnimatedAvatar;
        
        this.createModal();
        this.attachEventListeners();
        
        console.log('⚙️ D-ID Config UI loaded');
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'did-config-modal';
        this.modal.innerHTML = `
            <div class="did-config-content">
                <div class="did-config-header">
                    <h2>🎬 Animated Avatar Settings</h2>
                    <button class="did-config-close">&times;</button>
                </div>
                
                <div class="did-config-body">
                    <!-- Enable/Disable -->
                    <div class="did-config-section">
                        <h3>Animation</h3>
                        <label class="did-toggle">
                            <input type="checkbox" id="did-enabled">
                            <span class="did-toggle-slider"></span>
                            Enable Animated RHEA
                        </label>
                        <p class="did-config-description">
                            When enabled, RHEA will animate with realistic lip-sync when speaking.
                        </p>
                    </div>
                    
                    <!-- API Key -->
                    <div class="did-config-section">
                        <h3>D-ID API Configuration</h3>
                        <div class="did-form-group">
                            <label for="did-api-key">API Key</label>
                            <input type="password" id="did-api-key" placeholder="Enter your D-ID API key">
                            <button id="did-toggle-key" class="did-btn-small">Show</button>
                        </div>
                        <p class="did-config-description">
                            Get your API key from <a href="https://studio.d-id.com/account" target="_blank">D-ID Studio</a>
                        </p>
                    </div>
                    
                    <!-- Upload Image -->
                    <div class="did-config-section">
                        <h3>RHEA Source Image</h3>
                        <div class="did-image-status">
                            <span id="did-image-status-text">Not uploaded</span>
                        </div>
                        <button id="did-upload-image" class="did-btn">Upload RHEA to D-ID</button>
                        <p class="did-config-description">
                            Uploads RHEA's image to D-ID for animation. Only needed once.
                        </p>
                    </div>
                    
                    <!-- Credits -->
                    <div class="did-config-section">
                        <h3>Account Status</h3>
                        <div id="did-credits-info">
                            <span>Credits: <span id="did-credits-value">--</span></span>
                        </div>
                        <button id="did-check-credits" class="did-btn-small">Check Credits</button>
                    </div>
                    
                    <!-- Test -->
                    <div class="did-config-section">
                        <h3>Test Animation</h3>
                        <button id="did-test-animation" class="did-btn did-btn-primary">
                            🎤 Test RHEA Speaking
                        </button>
                        <p class="did-config-description">
                            Generate a short test animation to verify everything works.
                        </p>
                    </div>
                    
                    <!-- Idle Animations -->
                    <div class="did-config-section">
                        <h3>Idle Animations</h3>
                        <label class="did-toggle">
                            <input type="checkbox" id="did-idle-enabled" checked>
                            <span class="did-toggle-slider"></span>
                            Enable subtle breathing/glow when idle
                        </label>
                    </div>
                </div>
                
                <div class="did-config-footer">
                    <button id="did-save-config" class="did-btn did-btn-primary">Save Settings</button>
                    <button id="did-close-config" class="did-btn">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        // Add styles
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .did-config-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(5px);
            }
            
            .did-config-modal.visible {
                display: flex;
            }
            
            .did-config-content {
                background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 16px;
                width: 90%;
                max-width: 500px;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 212, 255, 0.1);
            }
            
            .did-config-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .did-config-header h2 {
                margin: 0;
                font-size: 1.4rem;
                color: #fff;
            }
            
            .did-config-close {
                background: none;
                border: none;
                color: #888;
                font-size: 1.8rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            
            .did-config-close:hover {
                color: #fff;
            }
            
            .did-config-body {
                padding: 24px;
            }
            
            .did-config-section {
                margin-bottom: 24px;
            }
            
            .did-config-section h3 {
                margin: 0 0 12px 0;
                font-size: 1rem;
                color: #00d4ff;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .did-config-description {
                font-size: 0.85rem;
                color: #888;
                margin-top: 8px;
            }
            
            .did-config-description a {
                color: #00d4ff;
            }
            
            .did-form-group {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .did-form-group input {
                flex: 1;
                padding: 10px 14px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.3);
                color: #fff;
                font-size: 0.95rem;
            }
            
            .did-form-group input:focus {
                outline: none;
                border-color: #00d4ff;
            }
            
            .did-btn {
                padding: 10px 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .did-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .did-btn-small {
                padding: 8px 12px;
                font-size: 0.8rem;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.05);
                color: #ccc;
                cursor: pointer;
            }
            
            .did-btn-primary {
                background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
                border-color: #00d4ff;
                font-weight: 600;
            }
            
            .did-btn-primary:hover {
                background: linear-gradient(135deg, #00e5ff 0%, #00aadd 100%);
            }
            
            .did-toggle {
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                color: #fff;
            }
            
            .did-toggle input {
                display: none;
            }
            
            .did-toggle-slider {
                width: 44px;
                height: 24px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                position: relative;
                transition: background 0.3s ease;
            }
            
            .did-toggle-slider::before {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 20px;
                height: 20px;
                background: #fff;
                border-radius: 50%;
                transition: transform 0.3s ease;
            }
            
            .did-toggle input:checked + .did-toggle-slider {
                background: #00d4ff;
            }
            
            .did-toggle input:checked + .did-toggle-slider::before {
                transform: translateX(20px);
            }
            
            .did-image-status {
                padding: 10px 14px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                margin-bottom: 12px;
            }
            
            .did-image-status.uploaded {
                border-left: 3px solid #00ff88;
            }
            
            .did-config-footer {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding: 20px 24px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            #did-credits-info {
                padding: 10px 14px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                margin-bottom: 12px;
                color: #ccc;
            }
        `;
        document.head.appendChild(style);
    }
    
    attachEventListeners() {
        // Close button
        this.modal.querySelector('.did-config-close').addEventListener('click', () => this.hide());
        this.modal.querySelector('#did-close-config').addEventListener('click', () => this.hide());
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        
        // Toggle API key visibility
        this.modal.querySelector('#did-toggle-key').addEventListener('click', () => {
            const input = this.modal.querySelector('#did-api-key');
            const btn = this.modal.querySelector('#did-toggle-key');
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Hide';
            } else {
                input.type = 'password';
                btn.textContent = 'Show';
            }
        });
        
        // Auto-save API key when user leaves the field
        this.modal.querySelector('#did-api-key').addEventListener('blur', () => {
            const apiKey = this.modal.querySelector('#did-api-key').value;
            if (apiKey && this.didService) {
                this.didService.setApiKey(apiKey);
                console.log('🔑 API key auto-saved');
            }
        });
        
        // Upload image
        this.modal.querySelector('#did-upload-image').addEventListener('click', () => this.uploadImage());
        
        // Check credits
        this.modal.querySelector('#did-check-credits').addEventListener('click', () => this.checkCredits());
        
        // Test animation
        this.modal.querySelector('#did-test-animation').addEventListener('click', () => this.testAnimation());
        
        // Save settings
        this.modal.querySelector('#did-save-config').addEventListener('click', () => this.saveSettings());
    }
    
    show() {
        this.loadCurrentSettings();
        this.modal.classList.add('visible');
    }
    
    hide() {
        this.modal.classList.remove('visible');
    }
    
    loadCurrentSettings() {
        if (!this.didService) return;
        
        const settings = JSON.parse(localStorage.getItem('dawrv_did_settings') || '{}');
        const avatarSettings = JSON.parse(localStorage.getItem('dawrv_animated_avatar') || '{}');
        
        // API key (masked)
        if (settings.apiKey) {
            this.modal.querySelector('#did-api-key').value = settings.apiKey;
        }
        
        // Enabled state
        this.modal.querySelector('#did-enabled').checked = avatarSettings.enabled !== false;
        this.modal.querySelector('#did-idle-enabled').checked = avatarSettings.idleAnimations !== false;
        
        // Image status
        if (settings.sourceImageUrl) {
            const statusEl = this.modal.querySelector('#did-image-status-text');
            statusEl.textContent = '✅ Uploaded and ready';
            statusEl.parentElement.classList.add('uploaded');
        }
    }
    
    async uploadImage() {
        const btn = this.modal.querySelector('#did-upload-image');
        const statusEl = this.modal.querySelector('#did-image-status-text');
        
        try {
            // First, save the API key if entered
            const apiKey = this.modal.querySelector('#did-api-key').value;
            if (!apiKey) {
                alert('Please enter your D-ID API key first!');
                this.modal.querySelector('#did-api-key').focus();
                return;
            }
            
            // Save the API key
            this.didService.setApiKey(apiKey);
            
            btn.disabled = true;
            btn.textContent = 'Uploading...';
            statusEl.textContent = 'Uploading RHEA image...';
            
            // Get the RHEA image as data URL
            const img = document.querySelector('.rhea-avatar img');
            if (!img) {
                throw new Error('RHEA avatar image not found');
            }
            
            // Create canvas to get data URL
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            
            // Upload to D-ID
            await this.didService.uploadSourceImage(dataUrl);
            
            statusEl.textContent = '✅ Uploaded and ready';
            statusEl.parentElement.classList.add('uploaded');
            
        } catch (error) {
            console.error('Upload error:', error);
            statusEl.textContent = '❌ Upload failed: ' + error.message;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Upload RHEA to D-ID';
        }
    }
    
    async checkCredits() {
        const creditsEl = this.modal.querySelector('#did-credits-value');
        
        try {
            creditsEl.textContent = 'Checking...';
            const credits = await this.didService.getCredits();
            
            if (credits) {
                creditsEl.textContent = credits.remaining || credits.total || 'Available';
            } else {
                creditsEl.textContent = 'Unable to check';
            }
        } catch (error) {
            creditsEl.textContent = 'Error';
        }
    }
    
    async testAnimation() {
        const btn = this.modal.querySelector('#did-test-animation');
        
        try {
            btn.disabled = true;
            btn.textContent = '⏳ Generating...';
            
            // Save current API key first
            const apiKey = this.modal.querySelector('#did-api-key').value;
            if (apiKey) {
                this.didService.setApiKey(apiKey);
            }
            
            // Test with a short phrase
            const videoUrl = await this.didService.createTalkFromText(
                "Hey, I'm RHEA, your voice-controlled DAW assistant. Looking good!",
                'en-US-JennyNeural'
            );
            
            // Play in the avatar
            if (this.animatedAvatar) {
                await this.animatedAvatar.playVideo(videoUrl);
            }
            
            btn.textContent = '✅ Test Successful!';
            setTimeout(() => {
                btn.textContent = '🎤 Test RHEA Speaking';
            }, 3000);
            
        } catch (error) {
            console.error('Test error:', error);
            btn.textContent = '❌ Test Failed';
            alert('Test failed: ' + error.message);
            setTimeout(() => {
                btn.textContent = '🎤 Test RHEA Speaking';
            }, 3000);
        } finally {
            btn.disabled = false;
        }
    }
    
    saveSettings() {
        // Save API key
        const apiKey = this.modal.querySelector('#did-api-key').value;
        if (apiKey) {
            this.didService.setApiKey(apiKey);
        }
        
        // Save avatar settings
        const enabled = this.modal.querySelector('#did-enabled').checked;
        const idleEnabled = this.modal.querySelector('#did-idle-enabled').checked;
        
        if (this.animatedAvatar) {
            this.animatedAvatar.saveSettings({
                enabled,
                idleAnimations: idleEnabled
            });
        }
        
        // Show confirmation
        const btn = this.modal.querySelector('#did-save-config');
        const originalText = btn.textContent;
        btn.textContent = '✅ Saved!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
        
        console.log('⚙️ D-ID settings saved');
    }
}

// Export singleton
window.DIDConfigUI = new DIDConfigUI();

console.log('⚙️ D-ID Config UI component loaded');

