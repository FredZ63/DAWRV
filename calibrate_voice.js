/**
 * QUICK VOICE CALIBRATION SCRIPT
 * Run this in DAWRV console to calibrate RHEA to your voice
 */

(async function calibrateVoiceNow() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎤 RHEA VOICE CALIBRATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('This will calibrate RHEA to understand YOUR voice better!');
    console.log('');
    console.log('📋 YOU WILL SAY 40 PHRASES covering:');
    console.log('   • Basic commands (play, stop, record)');
    console.log('   • Track controls (solo, mute, arm)');
    console.log('   • Navigation (go to bar, go to start)');
    console.log('   • Complex commands (loops, tempo, volume)');
    console.log('   • Natural speech patterns');
    console.log('');
    console.log('⏱️  TOTAL TIME: ~5-7 minutes');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    // Check if VoiceCalibration is loaded
    if (typeof VoiceCalibration === 'undefined') {
        console.error('❌ VoiceCalibration class not loaded!');
        console.log('');
        console.log('Please load it first:');
        console.log('  Add this to index.html:');
        console.log('  <script src="scripts/voice-calibration.js"></script>');
        return;
    }
    
    console.log('Creating calibrator...');
    const cal = new VoiceCalibration();
    
    console.log('');
    console.log('🎯 CALIBRATION PHASES:');
    console.log('');
    console.log('Phase 1: Basic Commands (4 phrases)');
    console.log('Phase 2: Extended Commands (4 phrases)');
    console.log('Phase 3: Track Commands (5 phrases)');
    console.log('Phase 4: Navigation (4 phrases)');
    console.log('Phase 5: Complex Commands (3 phrases)');
    console.log('Phase 6: Natural Speech (3 phrases)');
    console.log('Phase 7: Rapid Fire (4 phrases)');
    console.log('Phase 8: Soft Speech (2 phrases)');
    console.log('Phase 9: Loud Speech (2 phrases)');
    console.log('Phase 10: Background Noise (1 phrase)');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    // Start calibration
    console.log('🎤 Requesting microphone access...');
    const started = await cal.startCalibration();
    
    if (!started) {
        console.error('❌ Failed to start calibration!');
        console.log('   Check microphone permissions in browser settings');
        return;
    }
    
    console.log('✅ Microphone ready!');
    console.log('');
    console.log('🚀 STARTING CALIBRATION IN 3 SECONDS...');
    console.log('   Get ready to speak clearly!');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Record all phrases
    for (let i = 0; i < cal.calibrationPhrases.length; i++) {
        const phrase = cal.calibrationPhrases[i];
        const progress = `[${i + 1}/${cal.calibrationPhrases.length}]`;
        
        console.log('');
        console.log('─────────────────────────────────────────────────────');
        console.log(`${progress} Phase: ${phrase.category.toUpperCase()}`);
        console.log('');
        console.log(`📝 SAY THIS NOW: "${phrase.text}"`);
        if (phrase.instruction) {
            console.log(`   💡 Note: ${phrase.instruction}`);
        }
        console.log('');
        console.log('🔴 RECORDING... (speak now for 3 seconds)');
        
        await cal.recordPhrase(i);
        
        console.log('✅ Recorded!');
        
        // Short pause between phrases
        if (i < cal.calibrationPhrases.length - 1) {
            console.log('⏸️  Next phrase in 1 second...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 PROCESSING CALIBRATION DATA...');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    const processed = cal.processCalibrationData();
    
    if (!processed) {
        console.error('❌ Failed to process calibration data!');
        return;
    }
    
    console.log('✅ Analysis complete!');
    console.log('');
    console.log('📊 YOUR VOICE PROFILE:');
    console.log('─────────────────────────────────────────────────────');
    console.log('');
    const profile = cal.calibrationData.voiceProfile;
    console.log(`🎵 Pitch Range:`);
    console.log(`   Min: ${profile.pitchRange.min.toFixed(1)} Hz`);
    console.log(`   Max: ${profile.pitchRange.max.toFixed(1)} Hz`);
    console.log(`   Avg: ${profile.pitchRange.average.toFixed(1)} Hz`);
    console.log('');
    console.log(`🔊 Energy Range:`);
    console.log(`   Min: ${profile.energyRange.min.toFixed(1)}`);
    console.log(`   Max: ${profile.energyRange.max.toFixed(1)}`);
    console.log(`   Avg: ${profile.energyRange.average.toFixed(1)}`);
    console.log('');
    console.log(`🗣️  Speaking Rate: ${profile.speakingRate.toFixed(1)} words/minute`);
    console.log('');
    console.log(`⚙️  VAD Thresholds:`);
    console.log(`   Energy: ${profile.vadThresholds.energyThreshold.toFixed(3)}`);
    console.log(`   Min Speech: ${profile.vadThresholds.minSpeechDuration}ms`);
    console.log(`   Max Silence: ${profile.vadThresholds.maxSilenceDuration}ms`);
    console.log('');
    
    // Save profile
    console.log('💾 Saving voice profile...');
    cal.saveProfile();
    console.log('✅ Profile saved to localStorage');
    console.log('');
    
    // Apply calibration
    console.log('🔧 Applying calibration to ASR system...');
    cal.applyCalibration();
    console.log('✅ Calibration applied!');
    console.log('');
    
    // Cleanup
    cal.stopCalibration();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 CALIBRATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('RHEA is now tuned to YOUR voice!');
    console.log('');
    console.log('🧪 TEST IT NOW:');
    console.log('   window.rhea.isListening = true;');
    console.log('   Then say: "play" or "stop" or any command');
    console.log('');
    console.log('📈 Recognition should now be MUCH better!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    return {
        success: true,
        profile: profile,
        samplesRecorded: cal.calibrationData.calibrationSamples.length
    };
})();


