# 🎛️ DAWRV Mixer Control Commands

Complete list of voice commands for controlling REAPER's mixer via RHEA.

## 📊 Mixer Visibility Commands

### Show/Hide Mixer
- **"Show mixer"** - Opens the mixer window
- **"Open mixer"** - Opens the mixer window
- **"Display mixer"** - Opens the mixer window
- **"Toggle mixer"** - Toggles mixer visibility
- **"Mixer window"** - Opens the mixer window
- **"Hide mixer"** - Closes the mixer window
- **"Close mixer"** - Closes the mixer window

### Mixer Control Panels
- **"Show MCP"** - Toggles Mixer Control Panel visibility
- **"Show mixer control panel"** - Toggles Mixer Control Panel
- **"Show TCP"** - Toggles Track Control Panel visibility
- **"Show track control panel"** - Toggles Track Control Panel

---

## 🎚️ Master Track Control Commands

### Master Mute/Unmute
- **"Mute master"** - Mutes the master output
- **"Master mute"** - Mutes the master output
- **"Mute main output"** - Mutes the master output
- **"Silence master"** - Mutes the master output
- **"Unmute master"** - Unmutes the master output
- **"Master unmute"** - Unmutes the master output
- **"Unmute main output"** - Unmutes the master output
- **"Enable master"** - Unmutes the master output
- **"Toggle master mute"** - Toggles master mute on/off

### Master Volume Control
- **"Set master volume to X"** - Sets master volume to X% (e.g., "Set master volume to 75")
  - Example: "Set master volume to 50"
  - Example: "Master volume 80"
  - Example: "Main volume 100"
- **"Master volume up"** - Increases master volume by 1 dB
- **"Increase master volume"** - Increases master volume by 1 dB
- **"Master louder"** - Increases master volume by 1 dB
- **"Master volume down"** - Decreases master volume by 1 dB
- **"Decrease master volume"** - Decreases master volume by 1 dB
- **"Master quieter"** - Decreases master volume by 1 dB
- **"Reset master volume"** - Resets master volume to 0dB (unity gain)
- **"Master volume reset"** - Resets master volume to 0dB

---

## 🎛️ All Tracks Control Commands

### Global Mute/Solo/Arm
- **"Mute all"** - Mutes all tracks
- **"Mute all tracks"** - Mutes all tracks
- **"Silence all"** - Mutes all tracks
- **"Mute everything"** - Mutes all tracks
- **"Unmute all"** - Unmutes all tracks
- **"Unmute all tracks"** - Unmutes all tracks
- **"Enable all"** - Unmutes all tracks
- **"Unmute everything"** - Unmutes all tracks
- **"Unsolo all"** - Unsolos all tracks
- **"Unsolo all tracks"** - Unsolos all tracks
- **"Unsolo everything"** - Unsolos all tracks
- **"Unarm all"** - Unarms all tracks for recording
- **"Unarm all tracks"** - Unarms all tracks
- **"Disable recording all"** - Unarms all tracks
- **"Unarm everything"** - Unarms all tracks

### Global Volume
- **"Reset all faders"** - Resets all track volumes to 0dB *(Note: Not yet fully implemented)*
- **"Reset all volumes"** - Resets all track volumes
- **"Reset faders"** - Resets all track volumes
- **"Default volumes"** - Resets all track volumes

---

## 🔧 Technical Implementation Details

### Master Track Control (OSC)
Master track commands use OSC messages targeting track 0 (the master track):
- **Mute/Unmute**: `/track/0/mute` with value 1 (mute) or 0 (unmute)
- **Volume**: `/track/0/volume` with normalized value 0.0-1.0 (0% to 100%)
- **Volume +1dB**: REAPER Action 40036
- **Volume -1dB**: REAPER Action 40037

### Global Track Actions (Native REAPER)
These use REAPER's built-in action IDs:
- **Mute all**: 40339
- **Unmute all**: 40340
- **Unsolo all**: 40340
- **Unarm all**: 40491

### Mixer Visibility (Native REAPER)
- **Toggle mixer**: 40078
- **Toggle MCP**: 40075
- **Toggle TCP**: 40074

---

## 🎯 Usage Examples

### Example Workflow 1: Quick Mix Check
```
"Show mixer"
"Mute all"
"Unmute track 1"
"Play from bar 1"
```

### Example Workflow 2: Master Volume Adjustment
```
"Master volume down"
"Master volume down"
"Master volume down"
(or)
"Set master volume to 70"
```

### Example Workflow 3: Clean Slate
```
"Unsolo all"
"Unmute all"
"Unarm all"
"Reset master volume"
```

---

## 🚀 Quick Command Reference

| Command | Action | Example |
|---------|--------|---------|
| Show/Hide Mixer | Toggle mixer window | "Show mixer" |
| Master Mute | Mute master output | "Mute master" |
| Master Volume | Set master level | "Set master volume to 80" |
| Master Vol +/- | Adjust by 1dB | "Master volume up" |
| Mute All | Mute all tracks | "Mute all" |
| Unmute All | Unmute all tracks | "Unmute all" |
| Unsolo All | Unsolo all tracks | "Unsolo all" |
| Unarm All | Disarm all tracks | "Unarm all" |

---

## 📝 Notes

1. **Master Track = Track 0**: In OSC, the master track is referenced as track 0.
2. **Volume Range**: Volume percentages (0-100%) are converted to normalized values (0.0-1.0) for OSC.
   - 0% = -inf dB (silence)
   - 100% = 0dB (unity gain)
3. **Reset All Faders**: Currently returns a "not yet implemented" message. Requires DAW state knowledge to iterate through all tracks.
4. **Action IDs**: REAPER action IDs are immutable and consistent across installations.

---

## 🔮 Coming Soon

- **Reset all faders** - Full implementation to iterate through all tracks and reset volumes
- **Show/hide specific mixer sections** - Control visibility of FX, sends, etc.
- **Mixer zoom** - Voice control for mixer zoom levels

---

**Last Updated:** November 17, 2025  
**DAWRV Version:** 1.0.0  
**Total Mixer Commands:** 40+


