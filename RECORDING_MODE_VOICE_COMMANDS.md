# 🎙️ Recording Mode Voice Commands - Quick Reference

## ✅ **IMPLEMENTED** - Ready to Use!

All recording mode commands from the REAPER menu are now available via voice control!

---

## 📋 Available Commands

### 1. **Record Input (Normal Mode)**
Sets REAPER to record audio or MIDI input normally.

**Say:**
- "record input"
- "normal recording"
- "input mode"
- "record audio"
- "standard recording"

**RHEA responds:** "Recording input mode"

---

### 2. **Record Output**
Records the output of the track (like bouncing in place).

**Say:**
- "record output"
- "output recording"
- "record track output"
- "bounce to track"

**RHEA responds:** "Recording track output"

---

### 3. **Disable Recording (Monitoring Only)**
Disables recording but keeps input monitoring active.

**Say:**
- "disable recording"
- "monitoring only"
- "no recording"
- "turn off recording"

**RHEA responds:** "Recording disabled" or "Input monitoring only"

---

### 4. **Input Monitoring**
Enables input monitoring without recording.

**Say:**
- "input monitoring"
- "enable monitoring"
- "turn on monitoring"
- "monitor mode"
- "listen to input"

**RHEA responds:** "Input monitoring only"

---

### 5. **Overdub Mode** (Already existed)
Layers new MIDI/audio on top of existing recordings.

**Say:**
- "overdub"
- "overdub mode"
- "layer recording"
- "enable overdub"

**RHEA responds:** "Overdub mode enabled"

---

### 6. **Replace Mode** (Already existed)
New recording replaces existing MIDI/audio.

**Say:**
- "replace mode"
- "replace recording"
- "overwrite mode"
- "enable replace"

**RHEA responds:** "Replace mode enabled"

---

## 🎯 Usage Examples

### Example 1: Normal Recording Session
```
YOU: "arm track 1"
RHEA: "Arming track 1"

YOU: "record input"
RHEA: "Recording input mode"

YOU: "record"
RHEA: "Recording"
```

### Example 2: Track Output Recording
```
YOU: "select track 3"
RHEA: "Selecting track 3"

YOU: "record output"
RHEA: "Recording track output"

YOU: "record"
RHEA: "Recording"
```

### Example 3: Monitoring Without Recording
```
YOU: "arm track 2"
RHEA: "Arming track 2"

YOU: "monitoring only"
RHEA: "Input monitoring only"

(Now you can hear input but it won't record)
```

### Example 4: MIDI Overdub
```
YOU: "arm track 1"
RHEA: "Arming track 1"

YOU: "overdub"
RHEA: "Overdub mode enabled"

YOU: "record"
RHEA: "Recording"
(New MIDI layers on top of existing)
```

---

## 🎛️ Corresponding REAPER Menu

These voice commands match REAPER's recording mode menu:

| Voice Command | REAPER Menu Item |
|--------------|------------------|
| "record input" | Record: input (audio or MIDI) |
| "overdub" | Record: MIDI overdub/replace → overdub |
| "replace mode" | Record: MIDI overdub/replace → replace |
| "record output" | Record: output |
| "disable recording" | Record: disable (input monitoring only) |
| "input monitoring" | Record: disable (input monitoring only) |

---

## 🔧 Technical Details

### Action IDs Used:
- `40252` - Record input / Overdub toggle
- `40253` - Replace mode toggle
- `40718` - Record output
- `40716` - Disable recording (monitoring only)

### Priority:
All recording mode commands have **priority 9** - they're processed quickly as recording essentials.

### Files Modified:
- `src/renderer/scripts/rhea.js`
  - Added action IDs (lines ~61-70)
  - Added command mappings (lines ~1167-1210)
  - Updated recording command patterns (line ~3321)

---

## ✅ Testing

Test each command:

1. **Start DAWRV** and click "Start Listening"
2. **Say each command** and verify:
   - RHEA confirms the command
   - REAPER's recording mode changes
   - Check REAPER's track input menu to see current mode

### Visual Verification:
Right-click any track's record arm button in REAPER to see the current recording mode (should match what you said).

---

## 🎉 What's New

**Before:** Only had "overdub" and "replace mode"

**Now:** Full control over ALL recording modes:
- ✅ Record input (normal)
- ✅ Record output  
- ✅ Disable recording
- ✅ Input monitoring
- ✅ Overdub (already had)
- ✅ Replace mode (already had)

---

## 💡 Pro Tips

1. **Combine with track commands:**
   - "arm track 3, record input, record" - one smooth flow!

2. **Use for different scenarios:**
   - **Normal recording:** "record input"
   - **Layering MIDI:** "overdub"
   - **Replacing takes:** "replace mode"
   - **Printing effects:** "record output"
   - **Just listening:** "monitoring only"

3. **Works with hover commands:**
   - Hover over a track's record arm button
   - Say "record output" - applies to that track!

---

**Status:** ✅ Fully Implemented  
**Version:** Added Nov 23, 2025  
**Tested:** Ready to use!

Enjoy full voice control over REAPER's recording modes! 🎙️🎵






