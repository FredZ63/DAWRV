// Quick voice test script
// Run this in the browser console after DAWRV starts

console.log('🎤 RHEA Voice Test Utility');
console.log('');
console.log('Available commands:');
console.log('  testVoice() - Test current voice settings');
console.log('  listVoices() - List all available voices');
console.log('  setVoice(name) - Change to a specific voice');
console.log('  setRate(value) - Change speech rate (0.1-10)');
console.log('  setPitch(value) - Change pitch (0-2)');
console.log('  setVolume(value) - Change volume (0-1)');
console.log('');

function testVoice() {
    if (!window.rhea) {
        console.error('❌ RHEA not initialized yet. Wait for DAWRV to fully load.');
        return;
    }
    
    console.log('🎤 Testing RHEA voice...');
    console.log('Current settings:', window.rhea.voiceConfig);
    console.log('');
    
    const testPhrases = [
        'Hello, I am RHEA, your voice assistant.',
        'Starting playback.',
        'Stopping playback.',
        'Saving project.',
        'Command executed successfully.'
    ];
    
    let index = 0;
    const speakNext = () => {
        if (index < testPhrases.length) {
            console.log(`Speaking: "${testPhrases[index]}"`);
            window.rhea.speak(testPhrases[index]);
            index++;
            setTimeout(speakNext, 3000);
        } else {
            console.log('✅ Voice test complete!');
        }
    };
    
    speakNext();
}

function listVoices() {
    if (!window.rhea) {
        console.error('❌ RHEA not initialized yet.');
        return;
    }
    
    const voices = window.rhea.getAvailableVoices();
    console.log(`🎤 Found ${voices.length} English voices:`);
    console.log('');
    voices.forEach((voice, i) => {
        const marker = voice.name === window.rhea.voiceConfig.selectedVoice?.name ? '⭐' : '  ';
        console.log(`${marker} ${i + 1}. ${voice.name} (${voice.lang})`);
    });
    console.log('');
    console.log('⭐ = Currently selected voice');
}

function setVoice(name) {
    if (!window.rhea) {
        console.error('❌ RHEA not initialized yet.');
        return;
    }
    
    window.rhea.setVoiceSettings({ voiceName: name });
    console.log(`✅ Voice changed. Testing...`);
    window.rhea.speak(`Testing ${name} voice.`);
}

function setRate(value) {
    if (!window.rhea) {
        console.error('❌ RHEA not initialized yet.');
        return;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0.1 || numValue > 10) {
        console.error('❌ Rate must be between 0.1 and 10');
        return;
    }
    
    window.rhea.setVoiceSettings({ rate: numValue });
    console.log(`✅ Rate set to ${numValue}. Testing...`);
    window.rhea.speak(`Speech rate is now ${numValue}.`);
}

function setPitch(value) {
    if (!window.rhea) {
        console.error('❌ RHEA not initialized yet.');
        return;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 2) {
        console.error('❌ Pitch must be between 0 and 2');
        return;
    }
    
    window.rhea.setVoiceSettings({ pitch: numValue });
    console.log(`✅ Pitch set to ${numValue}. Testing...`);
    window.rhea.speak(`Pitch is now ${numValue}.`);
}

function setVolume(value) {
    if (!window.rhea) {
        console.error('❌ RHEA not initialized yet.');
        return;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 1) {
        console.error('❌ Volume must be between 0 and 1');
        return;
    }
    
    window.rhea.setVoiceSettings({ volume: numValue });
    console.log(`✅ Volume set to ${numValue}. Testing...`);
    window.rhea.speak(`Volume is now ${numValue}.`);
}

// Make functions available globally
window.testVoice = testVoice;
window.listVoices = listVoices;
window.setVoice = setVoice;
window.setRate = setRate;
window.setPitch = setPitch;
window.setVolume = setVolume;

console.log('✅ Voice test functions loaded!');

