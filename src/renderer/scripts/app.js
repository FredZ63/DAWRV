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
        
        // Function to check and open TTS config
        const openTTSConfig = () => {
            if (window.ttsConfigUI && typeof window.ttsConfigUI.show === 'function') {
                console.log('✅ Opening TTS Config UI...');
                window.ttsConfigUI.show();
                return true;
            } else if (window.openTTSConfig && typeof window.openTTSConfig === 'function') {
                console.log('✅ Opening TTS Config (legacy)...');
                window.openTTSConfig();
                return true;
            }
            return false;
        };
        
        // Try immediately
        if (openTTSConfig()) {
            return;
        }
        
        // If not ready, wait a bit longer and retry
        console.log('⏳ TTS Config not ready yet, waiting...');
        let retries = 0;
        const maxRetries = 10; // Try for up to 2 seconds (10 * 200ms)
        
        const retryInterval = setInterval(() => {
            retries++;
            console.log(`🔄 Retry ${retries}/${maxRetries}...`);
            
            if (openTTSConfig()) {
                clearInterval(retryInterval);
                console.log('✅ TTS Config opened after retry');
            } else if (retries >= maxRetries) {
                clearInterval(retryInterval);
                console.error('❌ TTS Config still not available after retries');
                alert('Voice Settings are still initializing. Please wait a few more seconds and try again.');
            }
        }, 200);
    });
}

// Log startup
console.log('✅ DAWRV Application Initialized');
console.log('🎤 Waiting for RHEA voice engine...');
