# RHEA Voice Customization Guide

## Overview

RHEA now uses high-quality macOS voices with optimized settings for more human-like speech. The system automatically selects the best available voice on your system.

## Automatic Voice Selection

RHEA automatically selects from these preferred voices (in order of preference):
1. **Samantha** - Enhanced female voice (best quality)
2. **Alex** - Enhanced male voice (best quality)
3. **Victoria** - High-quality female voice
4. **Siri Female/Male** - Siri voices
5. **Karen, Moira, Tessa, Veena, Fiona** - Regional English accents

## Current Voice Settings

- **Rate**: 0.95 (slightly slower for more natural speech)
- **Pitch**: 1.0 (natural pitch)
- **Volume**: 0.9 (comfortable listening level)

## Customizing Voice Settings

### Method 1: Browser Console (Quick Test)

1. Open DAWRV
2. Press `Cmd+Option+I` (or `F12`) to open Developer Tools
3. Go to the Console tab
4. Run these commands:

```javascript
// Check current voice
console.log(rhea.voiceConfig);

// Change speech rate (0.1-10, default 1.0)
// Lower = slower/more natural, Higher = faster
rhea.setVoiceSettings({ rate: 0.9 });  // Slower
rhea.setVoiceSettings({ rate: 1.1 });   // Faster

// Change pitch (0-2, default 1.0)
// Lower = deeper, Higher = higher
rhea.setVoiceSettings({ pitch: 0.9 });  // Deeper
rhea.setVoiceSettings({ pitch: 1.1 });  // Higher

// Change volume (0-1, default 1.0)
rhea.setVoiceSettings({ volume: 0.8 }); // Quieter
rhea.setVoiceSettings({ volume: 1.0 }); // Louder

// Change to a specific voice
rhea.setVoiceSettings({ voiceName: 'Alex' });
rhea.setVoiceSettings({ voiceName: 'Samantha' });

// See all available voices
rhea.getAvailableVoices().forEach(v => console.log(v.name, v.lang));
```

### Method 2: Edit Code (Permanent)

Edit `src/renderer/scripts/rhea.js` and modify the `voiceConfig` object:

```javascript
this.voiceConfig = {
    preferredVoices: [
        'Samantha',  // Add your preferred voice first
        'Alex',
        // ... other voices
    ],
    rate: 0.95,      // Adjust rate (0.1-10)
    pitch: 1.0,      // Adjust pitch (0-2)
    volume: 0.9,     // Adjust volume (0-1)
    selectedVoice: null
};
```

## Voice Quality Tips

### For More Natural Speech:
- **Lower rate** (0.85-0.95): Slower, more deliberate speech
- **Natural pitch** (0.95-1.05): Avoid extreme values
- **Slightly lower volume** (0.85-0.9): Less intrusive

### For Faster Responses:
- **Higher rate** (1.0-1.2): Faster speech
- Keep pitch and volume at defaults

### For Different Personalities:
- **Professional**: rate: 0.95, pitch: 1.0, volume: 0.9
- **Friendly**: rate: 1.0, pitch: 1.05, volume: 0.95
- **Calm**: rate: 0.9, pitch: 0.95, volume: 0.85

## Testing Your Settings

1. Use the browser console to test different settings
2. Try voice commands like "play", "stop", "save"
3. Listen to RHEA's responses
4. Adjust settings until you're happy
5. Save your preferred settings in the code

## Advanced: Using External TTS Services

For even better quality, you can integrate external TTS services:

### Option 1: ElevenLabs (Best Quality)
- Requires API key
- Very human-like voices
- Paid service

### Option 2: Google Cloud TTS
- Requires API key
- High-quality voices
- Pay-per-use

### Option 3: Amazon Polly
- Requires AWS account
- Good quality voices
- Pay-per-use

To integrate these, you would need to:
1. Add API credentials
2. Modify the `speak()` function to call the TTS API
3. Play the returned audio

## Troubleshooting

### Voice sounds robotic
- Try lowering the rate to 0.9
- Ensure an "Enhanced" voice is selected
- Check that you're using macOS (best voice quality)

### Voice too fast/slow
- Adjust `rate` in voiceConfig
- Test values between 0.8-1.2

### Voice too quiet/loud
- Adjust `volume` in voiceConfig
- Test values between 0.7-1.0

### Wrong voice selected
- Check available voices: `rhea.getAvailableVoices()`
- Manually set voice: `rhea.setVoiceSettings({ voiceName: 'Samantha' })`

## macOS Voice Installation

If you don't have high-quality voices:

1. Open **System Settings** → **Accessibility** → **Spoken Content**
2. Click **System Voice** → **Customize...**
3. Download "Enhanced Quality" voices (Samantha, Alex, etc.)
4. Restart DAWRV

These voices are much more natural than the default voices!

