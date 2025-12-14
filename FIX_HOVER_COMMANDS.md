# 🔧 Fix Hover Commands - Quick Setup

## Problem
- Hover detection is slow or not working
- Commands like "solo", "mute" don't execute when hovering

## Solution (3 Steps - 2 minutes)

### Step 1: Run ReaScript in REAPER ⚡

The hover detection **requires** a ReaScript to be running in REAPER:

1. **Open REAPER**
2. **Press `?` key** (or go to Actions → Show action list)
3. **Click "ReaScript: Run..."** (bottom of window)
4. **Navigate to:**
   ```
   ~/Library/Application Support/REAPER/Scripts/DAWRV/
   ```
5. **Select:** `dawrv_mouse_tracker_continuous.lua`
6. **Click "Open"** - Script will run in background
7. **Close Actions window**

✅ **You only need to do this ONCE per REAPER session!**

---

### Step 2: Enable Screen Awareness in DAWRV 

1. **Open DAWRV**
2. **Click Voice Settings** (⚙️ button)
3. **Enable "Screen Awareness"** checkbox
4. **Grant Accessibility permission** when prompted:
   - System Settings will open
   - Go to: Privacy & Security → Accessibility
   - Enable "DAWRV" or "Electron"
   - **Restart DAWRV**

---

### Step 3: Test It! 🎉

1. **Open REAPER mixer** (Cmd+M)
2. **Hover your mouse** over a track's fader/button
3. **Wait 500ms** (half a second) - you should see console logs
4. **Say a command** while hovering:
   - "solo" → Solos that track
   - "mute" → Mutes that track  
   - "raise volume 5 dB" → Increases volume
   - "pan left" → Pans left

---

## Verify It's Working

### Check Console Logs

Open Developer Tools in DAWRV:
- View → Developer → Developer Tools
- Go to Console tab

**You should see:**
```
🎛️  ReaScript control touched: volume_fader on Track 3
🎯 Hover context detected
   Control: fader
   Track: 3
🎯 Hover-enhanced command: solo → solo track 3
🎚️ Sending OSC: /track/3/solo 1
✅ Track solo command sent via OSC
```

### If You Don't See Logs:

**Problem 1: No "ReaScript control touched"**
- ReaScript is NOT running in REAPER
- Go back to Step 1 and run the script

**Problem 2: No "Hover context detected"**
- Screen Awareness is not enabled
- Go back to Step 2

**Problem 3: OSC command sent but track doesn't change**
- REAPER OSC might not be enabled
- Go to: REAPER → Preferences → Control/OSC/web
- Add "OSC (Open Sound Control)"
- Set port to 8000
- Enable it

---

## Common Issues

### "Hover detection is too slow"

The default hover delay is 500ms. To make it faster:

1. Voice Settings → Screen Awareness section
2. Change "Hover Delay" to "Fast (300ms)"
3. Click Save

### "Commands work sometimes but not always"

Make sure you're **hovering when you say the command**!

Flow:
1. Hover over control → Wait for detection
2. **Keep hovering** → Say command
3. Command executes on hovered track

### "RHEA says 'soloing track' but nothing happens"

Check REAPER OSC:
```bash
netstat -an | grep 8000
```

Should show: `udp4       0      0  *.8000`

If not, enable OSC in REAPER Preferences.

---

## Advanced: Auto-Start ReaScript

To make the ReaScript run automatically when REAPER starts:

1. Open REAPER
2. Actions → Show action list
3. Find: "DAWRV: Mouse Tracker Continuous"
4. **Right-click** → "Copy selected action command ID"
5. **Extensions** → **Startup actions** → **Set global startup action**
6. **Paste the command ID**
7. Click OK

Now the script runs automatically every time you open REAPER! 🎉

---

## Quick Test Script

Run this to test OSC solo command:

```bash
cd ~/DAWRV-Project
node test_solo_command.js
```

If track 3 solos in REAPER, OSC is working! ✅

---

## Summary

| Component | Status | Fix |
|-----------|--------|-----|
| ReaScript | ❌ Not running | Run `dawrv_mouse_tracker_continuous.lua` in REAPER |
| Screen Awareness | ❌ Not enabled | Enable in Voice Settings |
| REAPER OSC | ✅ Working | Already enabled |
| Hover Delay | ⚠️ Slow (500ms) | Change to "Fast" in settings |

---

**After following these steps, hover commands should work instantly!** 🚀

If still not working, check Developer Console for error messages and report them.






