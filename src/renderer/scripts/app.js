// Main DAWRV Application Controller
console.log('🚀 DAWRV Application Starting...');
console.log('Platform:', window.dawrv.platform);
console.log('Version:', window.dawrv.version);

// Initialize DAW Options
document.querySelectorAll('.daw-option').forEach(option => {
    option.addEventListener('click', function() {
        if (this.classList.contains('disabled')) {
            showComingSoonModal(this.dataset.daw);
        } else {
            selectDAW(this.dataset.daw);
        }
    });
});

function selectDAW(daw) {
    document.querySelectorAll('.daw-option').forEach(opt => {
        opt.classList.remove('active');
    });
    
    const selectedOption = document.querySelector(`[data-daw="${daw}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
        console.log('Selected DAW:', daw);
    } else {
        console.warn('DAW option not found:', daw);
    }
}

function showComingSoonModal(daw) {
    const dawNames = {
        'logic': 'Logic Pro',
        'protools': 'Pro Tools',
        'ableton': 'Ableton Live',
        'studioone': 'Studio One 7'
    };
    
    alert(`\${dawNames[daw]} Integration Coming Soon!\n\nCurrently Supported:\n✅ REAPER (Full Support)\n\n🚧 In Development:\n• Logic Pro\n• Pro Tools\n• Ableton Live\n• Studio One 7`);
}

// Initialize Audio Settings
let audioConfigManager;
let audioSettingsUI;

if (window.AudioConfigManager && window.AudioSettingsUI) {
    audioConfigManager = new AudioConfigManager();
    audioSettingsUI = new AudioSettingsUI(audioConfigManager);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            audioSettingsUI.init();
        });
    } else {
        audioSettingsUI.init();
    }
    
    // Setup audio settings button
    const audioSettingsBtn = document.getElementById('audio-settings-btn');
    if (audioSettingsBtn) {
        audioSettingsBtn.addEventListener('click', () => {
            audioSettingsUI.open();
        });
    }
    
    console.log('✅ Audio Settings initialized');
}

// Setup AI Settings button
const aiSettingsBtn = document.getElementById('ai-settings-btn');
if (aiSettingsBtn) {
    aiSettingsBtn.addEventListener('click', () => {
        console.log('🤖 Opening AI Settings...');
        // Wait for AIConfigManager to be available
        setTimeout(() => {
            if (window.aiConfigManager && typeof window.aiConfigManager.showConfigModal === 'function') {
                window.aiConfigManager.showConfigModal();
            } else {
                alert('AI Settings will be available once RHEA is initialized. Please wait a moment and try again.');
            }
        }, 100);
    });
}

// Setup Knowledge Import button
const knowledgeBtn = document.getElementById('knowledge-import-btn');
if (knowledgeBtn) {
    knowledgeBtn.addEventListener('click', () => {
        console.log('📚 Opening Knowledge Import...');
        setTimeout(() => {
            if (window.knowledgeUI && typeof window.knowledgeUI.showModal === 'function') {
                window.knowledgeUI.showModal();
            } else {
                alert('Knowledge Import will be available once RHEA is initialized. Please wait a moment and try again.');
            }
        }, 100);
    });
}

// Setup TTS/Voice Settings button
const ttsBtn = document.getElementById('tts-settings-btn');
if (ttsBtn) {
    ttsBtn.addEventListener('click', () => {
        console.log('🔊 Opening Voice Settings...');

        const debugTTSState = (tag) => {
            try {
                const hasRhea = !!window.rhea;
                const hasTTSCfgUI = !!(window.ttsConfigUI && typeof window.ttsConfigUI.show === 'function');
                const hasRheaMgr = !!(window.rhea && window.rhea.ttsConfigManager && typeof window.rhea.ttsConfigManager.show === 'function');
                const hasTCM = !!(window.TTSConfigManager || (typeof TTSConfigManager !== 'undefined' ? TTSConfigManager : null));
                console.log(`🔎 [Voice Settings debug] ${tag}`, {
                    __rheaManagersReady: !!window.__rheaManagersReady,
                    hasRhea,
                    hasTTSCfgUI,
                    hasRheaMgr,
                    hasTCM
                });
            } catch (e) {
                console.log('🔎 [Voice Settings debug] failed:', e?.message || e);
            }
        };
        
        // Function to check and open TTS config
        const openTTSConfig = () => {
            debugTTSState('openTTSConfig() start');

            // Prefer a direct hook from RHEA (most reliable)
            if (typeof window.openVoiceSettings === 'function') {
                try {
                    console.log('✅ Opening Voice Settings (window.openVoiceSettings)...');
                    window.openVoiceSettings();
                    return true;
                } catch (e) {
                    console.error('❌ window.openVoiceSettings failed:', e?.message || e);
                }
            }
            // Prefer a pre-created instance
            if (window.ttsConfigUI && typeof window.ttsConfigUI.show === 'function') {
                try {
                    console.log('✅ Opening TTS Config UI...');
                    window.ttsConfigUI.show();
                    return true;
                } catch (e) {
                    console.error('❌ TTS Config UI .show() failed:', e?.message || e);
                }
            }

            if (window.rhea && window.rhea.ttsConfigManager && typeof window.rhea.ttsConfigManager.show === 'function') {
                try {
                    console.log('✅ Opening TTS Config UI (via window.rhea.ttsConfigManager)...');
                    window.rhea.ttsConfigManager.show();
                    return true;
                } catch (e) {
                    console.error('❌ window.rhea.ttsConfigManager .show() failed:', e?.message || e);
                }
            }

            // Lazy-create as a last resort (prevents "not available" when init ordering is weird)
            const TCM = (window && window.TTSConfigManager) ? window.TTSConfigManager :
                (typeof TTSConfigManager !== 'undefined' ? TTSConfigManager : null);
            if (window.rhea && TCM) {
                try {
                    console.log('🧰 Creating TTSConfigManager lazily...');
                    window.rhea.ttsConfigManager = new TCM(window.rhea);
                    window.ttsConfigUI = window.rhea.ttsConfigManager;
                    if (window.ttsConfigUI && typeof window.ttsConfigUI.show === 'function') {
                        window.ttsConfigUI.show();
                        return true;
                    }
                } catch (e) {
                    console.error('❌ Failed to lazily create/open TTSConfigManager:', e?.message || e);
                }
            } else if (window.openTTSConfig && typeof window.openTTSConfig === 'function') {
                console.log('✅ Opening TTS Config (legacy)...');
                window.openTTSConfig();
                return true;
            } else {
                debugTTSState('openTTSConfig() cannot lazy-create (missing window.rhea or TCM)');
            }
            debugTTSState('openTTSConfig() returning false');
            return false;
        };
        
        // Try immediately
        if (openTTSConfig()) {
            return;
        }
        
        // If not ready, wait for RHEA managers to initialize, plus keep retrying for longer.
        // RHEA does a lot of startup work (plugin discovery, ASR/TTS init), and 2 seconds is often not enough.
        console.log('⏳ TTS Config not ready yet, waiting for RHEA initialization...');
        
        let opened = false;
        const tryOpen = () => {
            if (opened) return true;
            if (openTTSConfig()) {
                opened = true;
                return true;
            }
            return false;
        };
        
        // One-shot event listener (preferred)
        const onReady = () => {
            console.log('🎉 rhea-managers-ready received - attempting to open Voice Settings...');
            tryOpen();
            window.removeEventListener('rhea-managers-ready', onReady);
        };
        window.addEventListener('rhea-managers-ready', onReady);
        // If RHEA already finished initializing before the click, open immediately.
        if (window.__rheaManagersReady) {
            console.log('✅ RHEA managers already ready (flag set) - attempting to open Voice Settings...');
            tryOpen();
        }
        
        // Retry loop (fallback): up to 15 seconds
        let retries = 0;
        const maxRetries = 75; // 75 * 200ms = 15s
        const retryInterval = setInterval(() => {
            retries++;
            if (tryOpen()) {
                clearInterval(retryInterval);
                window.removeEventListener('rhea-managers-ready', onReady);
                console.log('✅ TTS Config opened after waiting');
            } else if (retries >= maxRetries) {
                clearInterval(retryInterval);
                window.removeEventListener('rhea-managers-ready', onReady);
                console.error('❌ TTS Config still not available after retries');
                debugTTSState('gave up');
                alert('Voice Settings are still initializing. Please wait a bit longer and try again.');
            }
        }, 200);
    });
}

// Initialize Ring Settings
let ringSettingsUI;

if (window.RingSettingsUI) {
    ringSettingsUI = new RingSettingsUI();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ringSettingsUI.init();
        });
    } else {
        ringSettingsUI.init();
    }
    
    // Setup ring settings button
    const ringSettingsBtn = document.getElementById('ring-settings-btn');
    if (ringSettingsBtn) {
        ringSettingsBtn.addEventListener('click', () => {
            console.log('💫 Opening Ring Settings...');
            ringSettingsUI.open();
        });
    }
    
    // Setup animated avatar settings button
    const animatedAvatarBtn = document.getElementById('animated-avatar-btn');
    if (animatedAvatarBtn) {
        animatedAvatarBtn.addEventListener('click', () => {
            console.log('🎬 Opening Animated Avatar Settings...');
            if (window.DIDConfigUI) {
                window.DIDConfigUI.show();
            }
        });
    }
    
    console.log('✅ Ring Settings initialized');
}

// Setup STT (Speech-to-Text) settings button
const sttSettingsBtn = document.getElementById('stt-settings-btn');
if (sttSettingsBtn) {
    sttSettingsBtn.addEventListener('click', () => {
        console.log('🎤 Opening Speech Recognition Settings...');
        if (window.STTConfigUI) {
            window.STTConfigUI.show();
        } else {
            console.error('STTConfigUI not loaded');
        }
    });
}

// Setup Advanced ASR settings button
const asrSettingsBtn = document.getElementById('asr-settings-btn');
if (asrSettingsBtn) {
    asrSettingsBtn.addEventListener('click', () => {
        console.log('🧠 Opening Advanced ASR Settings...');
        if (window.ASRConfigUI) {
            window.ASRConfigUI.show();
        } else if (window.rhea && window.rhea.asrConfigUI) {
            window.rhea.asrConfigUI.show();
        } else {
            console.error('ASRConfigUI not loaded');
        }
    });
}

// Log startup
console.log('✅ DAWRV Application Initialized');
console.log('🎤 Waiting for RHEA voice engine...');
