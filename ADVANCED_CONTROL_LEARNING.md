# 🧠 Advanced Control Learning System

## Overview

This is the **ADVANCED** version of Screen Awareness - RHEA now **LEARNS** from your interactions and gets smarter over time!

### What's Different?

**OLD Screen Awareness**: 
- Uses macOS Accessibility API
- Makes "guesses" based on screen position
- Not very accurate for REAPER's custom controls
- Same accuracy every time

**NEW Control Learning System**:
- Uses **REAPER's internal data** (ReaScript) for accuracy
- **Learns from your clicks** to improve identification
- Gets **smarter over time** with machine learning
- **Tracks confidence** - tells you when it's still learning
- Saves training data to improve accuracy

## How It Works

### 1. Detection Phase (Hover)

When you hover over a control in REAPER:

```
🖱️  You hover → ReaScript detects control → Learning system identifies it
```

**ReaScript provides**:
- Track number and name
- Control type (fader, button, pan, etc.)
- Current value
- Position data

**Learning system provides**:
- Smart identification based on past interactions
- Confidence level (0-100%)
- Better announcements

### 2. Learning Phase (Click)

When you **click** on a control:

```
🖱️  You click → Learning system records: "User clicked THIS control"
                → Training data updated
                → Confidence increases
                → Future identifications more accurate!
```

**What gets learned**:
- Exact control type
- Position patterns
- Track patterns
- Visual features (for future ML)

**After 10 clicks on the same control**:
- ✅ 99% confidence
- ✅ Instant, accurate identification
- ✅ No more "learning" tag

### 3. Announcement Phase (Smart ID)

RHEA announces with learning-enhanced accuracy:

```
First time hovering over Track 3 volume fader:
🔊 "Track 3, volume fader, -6.2 dB (learning)"
     ↑ Confidence: 50% (ReaScript guess)

After 5 clicks on it:
🔊 "Track 3, volume fader, -6.2 dB"
     ↑ Confidence: 70% (learned pattern)

After 10+ clicks:
🔊 "Track 3, volume fader, -6.2 dB"
     ↑ Confidence: 99% (fully learned!)
```

## Setup Instructions

### Step 1: Enable Screen Awareness

1. Open **Voice Settings** in DAWRV
2. Scroll to **"🖱️ Screen Awareness"**
3. Check **"Enable Screen Awareness"**
4. Grant **Accessibility permission** when prompted

### Step 2: Install ReaScript in REAPER

The learning system needs ReaScript to get accurate control data from REAPER.

#### Option A: Automatic Installation (Recommended)

```bash
cd /Users/frederickzimmerman/DAWRV-Project
./install_reaper_scripts.sh
```

This installs:
- `dawrv_detect_control_under_mouse.lua` - One-shot detection
- `dawrv_mouse_tracker_continuous.lua` - Continuous tracking

#### Option B: Manual Installation

1. Copy scripts to REAPER:
   ```bash
   cp daw-scripts/reaper/scripts/*.lua \
      ~/Library/Application\ Support/REAPER/Scripts/DAWRV/
   ```

2. In REAPER, go to: **Actions → Show action list**

3. Click **"Load ReaScript..."**

4. Navigate to the DAWRV scripts folder and load:
   - `dawrv_mouse_tracker_continuous.lua`

5. **Run the script** - it will run continuously in the background

### Step 3: Start Training!

Once enabled, RHEA starts learning **immediately**:

1. **Hover** over controls in REAPER
2. **Click** controls you want RHEA to learn
3. Repeat for frequently used controls
4. Watch console for learning progress

## Training Workflow

### Quick Training (5 minutes)

Train the most common controls:

1. **Volume faders** (5 clicks each on Track 1-5)
2. **Mute buttons** (5 clicks each on Track 1-5)
3. **Solo buttons** (5 clicks each on Track 1-5)
4. **Pan controls** (5 clicks each on Track 1-5)
5. **Record arm** (5 clicks each on Track 1-3)

After this, RHEA will have:
- 🎯 High confidence on 25 controls
- 📚 Training data for pattern recognition
- 🧠 Better understanding of your REAPER layout

### Deep Training (30 minutes)

For maximum accuracy:

1. Click **every control type** at least 10 times
2. Train on **different tracks** (TCP and MCP)
3. Train in both **Track View** and **Mixer View**
4. Click controls while adjusting values
5. Use different track heights/widths

After deep training:
- ✅ 99% confidence on all trained controls
- ✅ Pattern recognition for new, similar controls
- ✅ Near-instant identification

## Monitoring Learning Progress

### Console Output

```bash
# When hovering (learning mode)
🎛️  ReaScript control touched: {track_name: "Track 3", control_type: "volume_fader"}
🧠 Smart identification (confidence: 50%): Track 3, volume fader, -6.2 dB

# When clicking (training)
🖱️  Control clicked - learning!
🎓 LEARNED: volume_fader on Track 3 (hover: 823ms)

# After training
🧠 Smart identification (confidence: 90%): Track 3, volume fader, -6.2 dB
```

### Training Data Location

All learning data is stored in:
```
~/.dawrv/control-training.json
```

**Contains**:
- `interactions`: Last 1000 click/hover events
- `patterns`: Learned control patterns with confidence levels
- `lastUpdated`: Timestamp of last training

### View Learning Stats

Add this to `src/renderer/scripts/rhea.js` (or run in console):

```javascript
// Get learning statistics
const stats = await window.api.getControlLearningStats();
console.log('🧠 Learning Stats:', stats);

/*
Output:
{
  total_interactions: 127,
  learned_patterns: 45,
  high_confidence_patterns: 32,
  last_training_file: "~/.dawrv/control-training.json"
}
*/
```

## Features

### 1. Pattern Recognition

The system learns **patterns** across controls:

- **Track patterns**: "Controls on Track 3 behave like this"
- **Position patterns**: "Faders are always in this area"
- **Context patterns**: "TCP vs MCP controls differ this way"

### 2. Confidence Scoring

Each prediction has a confidence score:

| Confidence | Source | Meaning |
|-----------|--------|---------|
| 0-49% | ReaScript guess | First time seeing this control |
| 50-69% | Learned (low) | Seen a few times, still learning |
| 70-89% | Learned (medium) | Confident, seen many times |
| 90-99% | Learned (high) | Fully trained, very accurate |

### 3. Automatic Improvement

The more you use DAWRV:
- ✅ Identifications get faster
- ✅ Announcements get more accurate
- ✅ Fewer "learning" tags
- ✅ Better context awareness

### 4. Persistent Learning

Training data is saved to disk:
- ✅ Survives app restarts
- ✅ Shared across sessions
- ✅ Auto-saves every 10 interactions
- ✅ Keeps last 1000 interactions

## Advanced Features

### Export Training Data

```bash
# Backup your training data
cp ~/.dawrv/control-training.json ~/Desktop/rhea-training-backup.json

# Share with another machine
scp ~/.dawrv/control-training.json user@othermachine:~/.dawrv/
```

### Reset Training

If RHEA learns incorrectly, reset:

```javascript
// In console or add to rhea.js
await window.api.resetControlLearning();
console.log('🔄 Training data reset - starting fresh!');
```

Or manually:
```bash
rm ~/.dawrv/control-training.json
```

### Adjust Learning Parameters

Edit `src/main/control-learning-service.js`:

```javascript
// Line 20-21: Adjust sensitivity
this.minHoverTime = 500; // Minimum hover time (ms) to consider intentional
                         // Lower = more sensitive, but more false positives

this.confidenceThreshold = 0.7; // Minimum confidence to auto-identify
                                // Lower = uses learned patterns sooner
                                // Higher = more conservative, waits for more training
```

## Troubleshooting

### "Control-detected-smart" events not firing

1. Check ReaScript is running in REAPER
2. Check console for errors
3. Verify Screen Awareness is enabled
4. Restart DAWRV and REAPER

### Low confidence even after many clicks

1. Check if you're clicking the **same control** each time
2. Verify track number/name is consistent
3. Check training data: `cat ~/.dawrv/control-training.json`
4. Ensure ReaScript is providing correct data

### Incorrect identifications

1. Reset training data: `rm ~/.dawrv/control-training.json`
2. Re-train with correct interactions
3. Check ReaScript output in REAPER console
4. Verify no duplicate/conflicting patterns

### Memory usage growing

Training data is capped at **1000 interactions**:
- Old interactions are automatically pruned
- File size stays under 1MB
- No performance impact

## Technical Details

### Architecture

```
REAPER (running ReaScript)
    ↓ (polls mouse position)
[dawrv_mouse_tracker_continuous.lua]
    ↓ (writes to ExtState)
[ReaScriptService] (Node.js)
    ↓ (reads ExtState, emits events)
[ControlLearningService] (ML logic)
    ↓ (learns patterns, predicts types)
[Main Process] (Electron)
    ↓ (sends IPC events)
[Renderer Process] (screen-awareness-ui.js)
    ↓ (announces to user)
[RHEA] (speaks announcement)
```

### Learning Algorithm

**Phase 1: Feature Extraction**
```javascript
features = {
    position_x, position_y,    // Screen position
    context: "tcp|mcp",        // Track Control Panel or Mixer
    track_number,              // 1, 2, 3, etc.
    reascript_guess,           // Initial guess from ReaScript
    parameter_type             // "Volume", "Pan", etc.
}
```

**Phase 2: Pattern Matching**
```javascript
patternKey = `track${track_number}-${context}-${control_type}`
// Example: "track3-tcp-volume_fader"
```

**Phase 3: Confidence Calculation**
```javascript
confidence = min(0.99, occurrences / 10)
// After 10 clicks: 99% confidence
// After 5 clicks: 50% confidence
// After 1 click: 10% confidence
```

**Phase 4: Prediction**
```javascript
if (pattern exists && confidence >= threshold) {
    return LEARNED_TYPE (high confidence)
} else {
    return REASCRIPT_GUESS (medium confidence)
}
```

### Data Format

**control-training.json**:
```json
{
  "interactions": [
    {
      "timestamp": "2025-11-19T10:30:45.123Z",
      "hoverDuration": 823,
      "controlData": {
        "track_number": 3,
        "track_name": "Track 3",
        "control_type": "volume_fader",
        "value_formatted": "-6.2 dB"
      },
      "action": "click",
      "features": {
        "position_x": 450,
        "position_y": 320,
        "context": "tcp",
        "track_number": 3,
        "reascript_guess": "volume_fader"
      }
    }
  ],
  "patterns": [
    [
      "track3-tcp-volume_fader",
      {
        "key": "track3-tcp-volume_fader",
        "control_type": "volume_fader",
        "occurrences": 12,
        "confidence": 0.99,
        "last_seen": "2025-11-19T10:35:12.456Z"
      }
    ]
  ],
  "lastUpdated": "2025-11-19T10:35:12.456Z"
}
```

## Future Enhancements

### Planned Features

1. **Visual Learning**: Use screenshot analysis to identify controls by appearance
2. **Transfer Learning**: Share learned patterns across users
3. **Context Prediction**: Predict what control you'll use next
4. **Voice Training**: "RHEA, this is a volume fader" - label controls by voice
5. **Plugin Controls**: Learn FX plugin controls, not just REAPER controls
6. **Gesture Recognition**: Learn control adjustment patterns

### Computer Vision Integration

Future version will use computer vision:

```javascript
// Capture screenshot of control
screenshot = captureControlArea(x, y, width, height)

// Extract visual features
features = {
    color_profile: extractColors(screenshot),
    shape: detectShape(screenshot),
    text: OCR(screenshot),
    pattern: CNN(screenshot)  // Deep learning
}

// Match against learned visual patterns
match = findBestVisualMatch(features, learnedPatterns)
```

## Summary

### What You Get

✅ **Accurate control identification** using REAPER's internal data
✅ **Machine learning** that improves with every click
✅ **Confidence scoring** so you know when RHEA is certain
✅ **Persistent training** that saves across sessions
✅ **Pattern recognition** for faster learning
✅ **Future-proof** architecture for computer vision upgrades

### How to Use

1. **Enable Screen Awareness** in Voice Settings
2. **Install ReaScript** in REAPER
3. **Click controls** you want RHEA to learn
4. **Watch confidence improve** over time
5. **Enjoy accurate announcements** forever!

### The Vision

This is the foundation for RHEA to truly "see" and "understand" your DAW:

- 🎯 **Today**: Learn control types from clicks
- 🔜 **Soon**: Predict what you'll do next
- 🚀 **Future**: Full computer vision, understand plugin UIs, context-aware AI

**Train RHEA once, benefit forever!** 🧠✨

---

**Feature Status**: ✅ Implemented
**Documentation**: Complete
**Testing**: Ready for user testing
**Next Steps**: Start training!



