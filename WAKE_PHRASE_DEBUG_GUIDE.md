# Wake Phrase Gating Debug Guide

## Overview
Rhea has been updated with **enhanced debug logging** to diagnose why wake phrase gating isn't preventing reactions to music playback.

## What Was Already Implemented (But Not Working)
✅ Wake phrase detection (`checkWakePhrase()`)
✅ Transport state tracking (`isTransportPlaying`)
✅ Conditional gating (`requireWakePhraseWhilePlaying`)
✅ DAW state service (OSC listener on port 8001)
✅ IPC channel for transport updates

## Debug Logging Added

### 1. Transport State Changes (rhea.js:218)
When REAPER's transport starts/stops, you'll see:
```
🎵 Transport state changed: STOPPED → PLAYING
   Wake phrase gating: ENABLED
   Wake phrases: hey rhea, rhea
```

### 2. Wake Phrase Check (rhea.js:4342)
Every time a command is processed, you'll see:
```
🔍 Wake phrase check:
   requireWakePhrase: false
   requireWakePhraseWhilePlaying: true
   isTransportPlaying: true/false
   needsWake: true/false
   transcript: <what was heard>
   wakeCheck.matched: true/false
   wakeCheck.stripped: <command after wake phrase>
```

## Testing Steps

### Step 1: Verify REAPER OSC Configuration
1. Open REAPER
2. Go to: **Preferences > Control/OSC/web**
3. Click "Add" to create a new OSC device (or edit existing)
4. Configure:
   - **Mode**: Configure device IP + local port
   - **Device host**: `127.0.0.1`
   - **Device port**: `8000` (DAWRV sends commands here)
   - **Local port**: `8001` (REAPER sends feedback here)
   - **Pattern config**: Leave empty (default)
   - ✅ **Enable "Send feedback to device"** checkbox
5. Click "OK" and restart REAPER

### Step 2: Restart DAWRV
```bash
cd /Users/frederickzimmerman/DAWRV-Project
npm start
```

### Step 3: Open Browser Console
- In DAWRV, press **Cmd+Option+I** (macOS) or **Ctrl+Shift+I** (Windows/Linux)
- Go to the "Console" tab

### Step 4: Test Without Playback
1. With REAPER transport **stopped**, say: "stop playback"
2. You should see in console:
   ```
   🔍 Wake phrase check:
      isTransportPlaying: false
      needsWake: false
   ✅ Wake phrase not required (transport stopped). Processing: stop playback
   ```
3. ✅ Command should execute

### Step 5: Test With Playback
1. Start REAPER playback (press spacebar)
2. You should see:
   ```
   🎵 Transport state changed: STOPPED → PLAYING
   ```
3. Say: "stop playback" (WITHOUT "hey rhea")
4. You should see:
   ```
   🔍 Wake phrase check:
      isTransportPlaying: true
      needsWake: true
      wakeCheck.matched: false
   🔇 Ignoring command - wake phrase missing while gate is enabled. Heard: stop playback
   ```
5. ✅ Command should be **ignored**

### Step 6: Test With Wake Phrase
1. With REAPER playback active, say: "hey rhea stop playback"
2. You should see:
   ```
   🔍 Wake phrase check:
      isTransportPlaying: true
      needsWake: true
      wakeCheck.matched: true
      wakeCheck.stripped: stop playback
   ✅ Wake phrase detected and stripped. Processing: stop playback
   ```
3. ✅ Command should execute

## Troubleshooting

### Issue 1: "isTransportPlaying" Never Changes
**Symptom**: Always shows `false` even when REAPER is playing
**Cause**: REAPER OSC not configured or not sending feedback
**Fix**: 
- Verify Step 1 above (REAPER OSC configuration)
- Check that "Send feedback to device" is enabled
- Restart REAPER after configuration changes
- Check DAWRV console for: `📡 DAW state service listening on 0.0.0.0:8001`

### Issue 2: Wake Phrase Always Required
**Symptom**: Wake phrase required even when transport is stopped
**Cause**: `requireWakePhrase` is `true` instead of `false`
**Fix**: 
```javascript
// In rhea.js constructor (around line 163)
this.requireWakePhrase = false; // Should be false for hands-free when stopped
this.requireWakePhraseWhilePlaying = true; // Should be true to gate during playback
```

### Issue 3: Wake Phrase Not Detected
**Symptom**: `wakeCheck.matched: false` even when saying "hey rhea"
**Cause**: 
- Speech recognition not hearing the wake phrase clearly
- Wake phrase not in `wakePhrases` array
**Fix**:
- Speak more clearly
- Try just "rhea" instead of "hey rhea"
- Check `wakePhrases` array in constructor (line 162)

### Issue 4: Music Lyrics Triggering Commands
**Symptom**: Rhea responds to sung lyrics during playback
**Cause**: Wake phrase gating not active (see Issue 1)
**Additional Fix**: Increase Whisper energy threshold in `rhea_voice_listener_whisper.py`:
```python
ENERGY_THRESHOLD = 500  # Increase to reduce sensitivity
```

## Expected Behavior Summary

| Transport State | Command Without Wake | Command With Wake |
|----------------|---------------------|-------------------|
| **Stopped**    | ✅ Executes          | ✅ Executes       |
| **Playing**    | ❌ Ignored           | ✅ Executes       |

## Files Modified
- `src/renderer/scripts/rhea.js`: Added debug logs at lines 218-222 and 4342-4366
- Wake phrase logic was already implemented, just needed debugging visibility

## Next Steps If Still Not Working
1. Share the console output from Steps 4-6 above
2. Check REAPER's OSC device list: **Preferences > Control/OSC/web**
3. Verify port 8001 is not blocked by firewall
4. Try alternative wake phrases: Add more to the array in rhea.js (line 162)



