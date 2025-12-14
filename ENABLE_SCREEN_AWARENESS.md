# Enable Screen Awareness - RHEA "Sees" What You Click!

## What You Want

When you hover over or click controls in REAPER, you want RHEA to:
- **See what you're pointing at**: "Track 3 volume fader"
- **Recognize clicks**: "Track 2 mute button clicked"
- **Identify controls**: Faders, pan knobs, mute buttons, solo buttons, etc.

**This feature is already built in!** It's called **Screen Awareness**.

## How to Enable Screen Awareness

### Step 1: Open Voice Settings
1. In DAWRV, click the **"Voice Settings"** button (⚙️ gear icon)
2. Scroll down to the **"🖱️ Screen Awareness"** section

### Step 2: Enable Screen Awareness
1. Check the box: **"Enable Screen Awareness"**
2. Optionally adjust settings:
   - **Auto-Announce**: RHEA speaks when you hover (default: ON)
   - **Visual Only**: Just flash avatar, no speech (default: OFF)
   - **Hover Delay**: How long to hover before announcing (default: 500ms)

### Step 3: Grant Accessibility Permission (macOS)
Screen Awareness needs permission to "see" your screen:

1. macOS will prompt: **"DAWRV would like to control this computer using accessibility features"**
2. Click **"Open System Settings"**
3. In **Privacy & Security** → **Accessibility**
4. Enable the checkbox next to **DAWRV** or **Electron**
5. **Restart DAWRV**

## How It Works

Once enabled, RHEA will "see" and announce:

### Hovering (Visual + Speech):
```
[Hover over Track 3 fader]
🎨 Avatar flashes (visual feedback)
🔊 RHEA says: "Track 3 volume fader, -6.2 dB"
```

### Clicking (Always Announces):
```
[Click Track 2 mute button]
🎯 RHEA says: "Track 2 mute, clicked"
```

### Controls RHEA Recognizes:

✅ **Volume Faders**: "Track 3 volume fader, -12 dB"
✅ **Pan Controls**: "Track 2 pan control, 50% left"
✅ **Mute Buttons**: "Track 4 mute button"
✅ **Solo Buttons**: "Track 5 solo button"
✅ **Record Arm**: "Track 1 record arm button"
✅ **FX Buttons**: "Track 3 FX button"
✅ **Sliders**: "Track 2 volume slider"
✅ **Knobs**: "Pan knob, center"

## Settings Explained

### Auto-Announce (Default: ON)
- **ON**: RHEA speaks what you hover over
- **OFF**: Silent (but visual flash still works)

### Visual Only (Default: OFF)
- **OFF**: Visual flash + speech
- **ON**: Only visual flash (no speech) - useful if announcements are too verbose

### Hover Delay (Default: 500ms)
- How long you need to hover before RHEA announces
- **Lower (300ms)**: Faster announcements, might be noisy
- **Higher (700ms)**: Fewer announcements, more deliberate

## Examples

### Scenario 1: Adjusting Volume
```
1. Hover over Track 3's volume fader
2. Wait 500ms
3. 🔊 RHEA: "Track 3 volume fader, -6.2 dB"
4. Drag fader
5. 🔊 RHEA updates: "-8 dB", "-10 dB", etc.
```

### Scenario 2: Muting Tracks
```
1. Hover over Track 2's mute button
2. 🔊 RHEA: "Track 2 mute button"
3. Click it
4. 🔊 RHEA: "Track 2 mute, clicked"
```

### Scenario 3: Panning
```
1. Hover over Track 5's pan knob
2. 🔊 RHEA: "Track 5 pan control, center"
3. Drag it left
4. 🔊 RHEA: "50% left", "75% left", etc.
```

## Visual Feedback (Avatar Flash)

RHEA's avatar flashes different colors based on control type:

🟦 **Blue**: General REAPER control
🟢 **Green**: Faders/sliders
🟡 **Yellow**: Buttons (mute, solo, arm)
🟠 **Orange**: Pan controls
🔴 **Red**: FX/special buttons

## Troubleshooting

### "Screen Awareness not working"
1. Check if enabled in Voice Settings
2. Verify Accessibility permission granted
3. Restart DAWRV after granting permission
4. Check console for error messages

### "No announcements when hovering"
1. Check **Auto-Announce** is ON
2. Check **Visual Only** is OFF (unless you only want visual)
3. Try increasing hover delay to 700ms
4. Hover slower and more deliberately

### "Announcements too frequent"
1. Increase **Hover Delay** to 700ms or 1000ms
2. Enable **Visual Only** mode (flash but no speech)
3. Turn off **Auto-Announce** (only announces on click)

### "Permission denied"
1. Go to System Settings → Privacy & Security → Accessibility
2. Find DAWRV or Electron in the list
3. Enable the checkbox
4. **Restart DAWRV completely**

## Advanced: ReaScript Integration

For **even more accurate** control detection, DAWRV includes ReaScript integration:

### What It Does:
- Polls REAPER directly for control values
- More accurate than screen detection
- Gets exact parameter names and values

### Already Enabled:
When you enable Screen Awareness, ReaScript polling starts automatically!

### What You'll See:
```
Console logs:
🎛️  ReaScript control touched: {
    track_name: "Track 3",
    parameter_name: "Volume",
    value_formatted: "-6.2 dB",
    control_type: "fader"
}
```

## Context-Aware Voice Commands

Once Screen Awareness is enabled, you can use **context keywords**:

### Examples:
```
[Hover over Track 3 fader]
You: "Mute this"
RHEA: *Mutes Track 3* ✅

[Hover over Track 5 pan]
You: "Center that"
RHEA: *Centers Track 5 pan* ✅

[Click Track 2 solo button]
You: "Unsolo that track"
RHEA: *Unsolos Track 2* ✅
```

Keywords: **"this"**, **"that"**, **"here"**, **"current"**

## Quick Start Guide

### 1. Enable in 3 Steps:
1. Open **Voice Settings** (⚙️ button)
2. Check **"Enable Screen Awareness"**
3. Grant **Accessibility permission** when prompted

### 2. Test It:
1. Hover over a fader in REAPER
2. Wait 500ms
3. You should hear: "Track X volume fader"

### 3. Use It:
- Hover to get info
- Click to activate + announce
- Use "this/that" in voice commands

## Summary

**Screen Awareness makes RHEA "see" your screen!**

✅ Hover over faders → RHEA announces them
✅ Click buttons → RHEA recognizes them
✅ Use "this/that" → RHEA knows context
✅ Works with all REAPER controls
✅ Visual feedback (avatar flash)
✅ Fully customizable

**Your exact request is already built in!** Just enable it in Voice Settings. 🎉

---
**Feature:** Screen Awareness
**Status:** Built-in, just needs to be enabled
**Requirements:** macOS Accessibility permission
**Settings:** Voice Settings → Screen Awareness section



