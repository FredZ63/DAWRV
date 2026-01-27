# 🎤 RHEA Voice Calibration Guide

## Why Voice Calibration is Critical

Voice recognition accuracy depends heavily on understanding **YOUR** specific voice characteristics:
- **Pitch range** - How high or low your voice is
- **Speaking rate** - How fast or slow you speak  
- **Energy levels** - How loud or soft you speak
- **Pronunciation** - Your unique way of saying words
- **Tone & inflection** - Your natural speech patterns

**Without calibration**, RHEA uses generic settings that may not match your voice!

---

## 🚀 Quick Start: Run Calibration Now

### Option 1: Guided Calibration (Recommended)

Open DAWRV Console (Cmd+Option+J) and paste:

```javascript
// Create calibration instance
const calibrator = new VoiceCalibration();

// Run full guided calibration
await calibrator.runFullCalibration();
```

### Option 2: Manual Step-by-Step

```javascript
// 1. Create calibrator
const cal = new VoiceCalibration();

// 2. Start calibration
await cal.startCalibration();

// 3. Record phrases one by one
for (let i = 0; i < cal.calibrationPhrases.length; i++) {
    console.log(`Say: "${cal.calibrationPhrases[i].text}"`);
    await cal.recordPhrase(i);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between phrases
}

// 4. Process and save
cal.processCalibrationData();
cal.saveProfile();
cal.applyCalibration();

// 5. Done!
console.log('✅ Calibration complete!', cal.getStatus());
```

---

## 📋 Calibration Phrases

You'll be asked to say **40 phrases** covering different scenarios:

### Phase 1: Basic Commands (4 phrases)
- "play"
- "stop"  
- "record"
- "pause"

### Phase 2: Extended Commands (4 phrases)
- "start playback"
- "stop playback"
- "start recording"
- "pause playback"

### Phase 3: Track Commands (5 phrases)
- "solo track one"
- "mute track two"
- "arm track three"
- "select track four"
- "unmute track five"

### Phase 4: Navigation (4 phrases)
- "go to bar five"
- "go to start"
- "go to end"
- "play from bar ten"

### Phase 5: Complex Commands (3 phrases)
- "loop from bar eight to bar twelve"
- "set tempo to one twenty"
- "increase volume by ten percent"

### Phase 6: Natural Speech (3 phrases)
- "okay RHEA, play"
- "hey RHEA, stop playback"
- "RHEA, mute track three"

### Phase 7: Rapid Fire (4 phrases)
- "play" → "stop" → "play" → "stop" (quick succession)

### Phase 8: Soft Speech (2 phrases)
- "play softly" (say quietly)
- "stop softly" (say quietly)

### Phase 9: Loud Speech (2 phrases)
- "play loudly" (say louder)
- "stop loudly" (say louder)

### Phase 10: Background Noise (1 phrase)
- "play with noise" (while music is playing)

---

## 🎯 Calibration Tips for Best Results

### Environment Setup
✅ **Quiet room** - Minimize background noise  
✅ **Consistent distance** - Stay 6-12 inches from mic  
✅ **Good microphone** - Use your headset mic  
✅ **Closed door** - Reduce external sounds

### Speaking Technique
✅ **Natural voice** - Speak normally, don't exaggerate  
✅ **Consistent volume** - Maintain steady loudness  
✅ **Clear pronunciation** - Enunciate clearly  
✅ **Normal pace** - Don't rush or slow down artificially

### What Gets Calibrated

1. **Energy Threshold** - Minimum volume to trigger detection
2. **Pitch Range** - Your voice's frequency range
3. **Speaking Rate** - Words per minute baseline
4. **Pause Duration** - Natural gaps between words
5. **Command Pronunciations** - How YOU say each command

---

## 🔧 What Happens During Calibration

```
1. MICROPHONE ACCESS
   └─> Request permission to use your mic
   
2. BASELINE RECORDING
   └─> Record ambient noise level (silence)
   └─> Set noise floor threshold
   
3. PHRASE RECORDING (40 phrases)
   └─> You see each phrase on screen
   └─> You speak the phrase clearly
   └─> System records audio + analyzes characteristics
   └─> Repeat for all phrases
   
4. ANALYSIS
   └─> Calculate pitch range (min/max/average)
   └─> Calculate energy levels (soft/normal/loud)
   └─> Calculate speaking rate (WPM)
   └─> Identify pronunciation patterns
   
5. PROFILE CREATION
   └─> Generate custom VAD thresholds
   └─> Create voice fingerprint
   └─> Save to localStorage
   
6. APPLY TO SYSTEM
   └─> Update ASR engine with new thresholds
   └─> Enable voice-specific optimizations
   └─> Test with sample commands
```

---

## 📊 After Calibration: Check Your Profile

```javascript
const cal = new VoiceCalibration();
cal.loadProfile();
console.log('Your voice profile:', cal.getStatus());
```

**Expected output:**
```json
{
  "isCalibrated": true,
  "lastCalibration": 1704672000000,
  "samplesCount": 40,
  "profile": {
    "pitchRange": {
      "min": 85,
      "max": 255,
      "average": 150
    },
    "energyRange": {
      "min": 30,
      "max": 180,
      "average": 95
    },
    "speakingRate": 145,
    "vadThresholds": {
      "energyThreshold": 0.09,
      "minSpeechDuration": 450,
      "maxSilenceDuration": 1500
    }
  }
}
```

---

## 🔄 Re-Calibration: When to Do It Again

**Re-calibrate if:**
- ✅ Moving to a different room/environment
- ✅ Using a different microphone
- ✅ Your voice changes (tired, sick, different time of day)
- ✅ Recognition accuracy drops significantly
- ✅ After major system updates

**How often:**
- Initial setup: **REQUIRED**
- Regular use: Every **2-4 weeks**
- Environment changes: **IMMEDIATELY**

---

## 🎓 Advanced: Fine-Tune Specific Commands

If specific commands aren't recognized well:

```javascript
const cal = new VoiceCalibration();
cal.loadProfile();

// Record additional samples for problematic command
await cal.startCalibration();
await cal.recordPhrase(0); // Re-record "play"
cal.processCalibrationData();
cal.saveProfile();
cal.applyCalibration();
```

---

## 🐛 Troubleshooting

### "Microphone access denied"
→ Check browser permissions (Settings → Privacy → Microphone)

### "No audio detected during calibration"
→ Check mic input level in System Preferences
→ Try speaking louder
→ Ensure correct mic is selected

### "Calibration didn't improve accuracy"
→ Try re-calibrating in quieter environment
→ Speak more clearly during calibration
→ Check microphone quality/positioning

### "Some commands work, others don't"
→ Re-calibrate just those commands
→ Check pronunciation consistency

---

## 🚀 Next Steps After Calibration

1. **Test recognition** - Try all command types
2. **Check console logs** - Monitor recognition confidence
3. **Adjust if needed** - Re-calibrate specific phrases
4. **Use RHEA naturally** - She's now tuned to YOUR voice!

---

## 📞 Need Help?

If calibration isn't working as expected:
1. Check console for errors
2. Verify microphone is working
3. Try re-calibration in different environment
4. Check that `voice-calibration.js` is loaded


