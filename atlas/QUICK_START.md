# ATLAS - Quick Start Guide

## 🏔️ Welcome to ATLAS!

**ATLAS** (Automatic Transfer and Librarian for Audio Synthesizers) is available in two forms:

### 1. 🖥️ Standalone Application
Run ATLAS as an independent desktop app on macOS, Windows, or Linux.

### 2. 🔌 VST/AU Plugin
Load ATLAS inside your DAW (REAPER, Ableton, Logic, etc.) for integrated patch management.

---

## 📦 Installation

### Standalone App

**macOS:**
```bash
# Download ATLAS-1.0.0-mac.dmg
# Drag ATLAS.app to Applications
# Launch from Applications folder
```

**Windows:**
```bash
# Download ATLAS-1.0.0-win.exe
# Run installer
# Launch from Start Menu
```

**Linux:**
```bash
# Download ATLAS-1.0.0.AppImage
chmod +x ATLAS-1.0.0.AppImage
./ATLAS-1.0.0.AppImage
```

### VST/AU Plugin

**macOS:**
```bash
# Copy ATLAS.component to:
~/Library/Audio/Plug-Ins/Components/

# Copy ATLAS.vst3 to:
~/Library/Audio/Plug-Ins/VST3/

# Rescan plugins in your DAW
```

**Windows:**
```bash
# Copy ATLAS.vst3 to:
C:\Program Files\Common Files\VST3\

# Rescan plugins in your DAW
```

---

## 🚀 Getting Started

### Step 1: Connect Your MIDI Devices

1. **Launch ATLAS** (standalone or as plugin)
2. Click **"Discover Devices"** button
3. ATLAS will show all connected MIDI devices
4. Click **"Connect"** on your synthesizer

### Step 2: Read Patches from Device

#### If you have MIDI 2.0 device:
```
1. Select your device
2. Click "Read Current Patch"
3. Patch is automatically captured and saved
4. Repeat for all patches you want to backup
```

#### If you have MIDI 1.0 device:
```
1. Select your device
2. Trigger "Patch Dump" on your synth (check manual)
3. ATLAS captures the SysEx data
4. Patch is saved to library
```

### Step 3: Organize Your Patches

1. **Add tags**: bass, lead, pad, ambient, etc.
2. **Set categories**: Leads, Basses, Pads, FX
3. **Rate patches**: ⭐⭐⭐⭐⭐
4. **Add notes**: "Use this for trap beats"

### Step 4: Send Patches to Device

1. **Browse your library**
2. **Click on a patch** to select it
3. **Click "Send to Device"**
4. Patch is transferred to your synth!

---

## 🎯 Key Features

### MIDI 2.0 Support ⚡
- **Query patches directly** from compatible devices
- **32-bit precision** for exact parameter values
- **Bidirectional communication** - know what's loaded
- **Auto-discovery** of device capabilities

### Universal Compatibility
- **Works with MIDI 1.0 and 2.0** devices
- **SysEx transfer** for any synthesizer
- **Device templates** for popular synths
- **Generic support** for unknown devices

### Smart Organization
- **Search** by name, category, or tags
- **Filter** by device or category
- **Sort** by most used, rating, or name
- **Projects** - organize patches per song/session

### Backup & Restore
- **One-click backup** of entire device
- **Export** patches as JSON
- **Import** patches from other users
- **Version control** - track changes

---

## 🔌 Using ATLAS as Plugin

### In REAPER:
```
1. Insert ATLAS as VST3/AU on MIDI track
2. Route MIDI output to hardware synth
3. Select patches from ATLAS browser
4. Patches sent automatically to synth
5. Patch selection saved with project!
```

### In Ableton Live:
```
1. Load ATLAS on MIDI track
2. Set MIDI output to your synth
3. Browse and select patches
4. Automate patch changes with clips
5. Record SysEx automation
```

### In Logic Pro:
```
1. Insert ATLAS as AU on instrument track
2. Set destination to external MIDI
3. Manage patches from plugin window
4. Patch recall when opening project
```

---

## 🎨 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + F` | Search patches |
| `Cmd/Ctrl + N` | New patch |
| `Cmd/Ctrl + I` | Import patches |
| `Cmd/Ctrl + E` | Export patches |
| `Cmd/Ctrl + D` | Discover devices |
| `Cmd/Ctrl + B` | Backup device |
| `Cmd/Ctrl + R` | Refresh devices |
| `Space` | Send selected patch |

---

## 💡 Tips & Tricks

### Tip 1: Create Project-Based Libraries
Organize patches by project/album:
```
Projects/
├── Album 2025/
│   ├── Song 1 patches
│   └── Song 2 patches
└── Live Set/
    └── Performance patches
```

### Tip 2: Use Tags for Quick Access
Tag patches with:
- `favorite` - Your best sounds
- `bright`, `dark`, `warm` - Tone character
- `soft`, `aggressive` - Dynamic range
- `808`, `dnb`, `house` - Genre

### Tip 3: A/B Compare Patches
In plugin mode:
1. Load patch A
2. Play your track
3. Load patch B
4. Compare instantly!

### Tip 4: Backup Before Editing
Always backup before:
- Factory reset
- Firmware updates
- Major editing sessions
- Selling/trading gear

### Tip 5: Share with Collaborators
Export your patch library:
```
File → Export Patches
Share JSON file with collaborators
They import into their ATLAS
Instant shared sound library!
```

---

## 🆘 Troubleshooting

### Device Not Detected?
```
✓ Check MIDI cable connections
✓ Check device is powered on
✓ Check MIDI settings on synth
✓ Click "Refresh Devices"
✓ Restart ATLAS
```

### Patch Won't Transfer?
```
✓ Device must be connected
✓ Check MIDI channel matches
✓ Some devices require "receive" mode
✓ Check device manual for SysEx settings
✓ Try smaller patches first
```

### Plugin Won't Load in DAW?
```
✓ Check plugin is in correct folder
✓ Rescan plugins in DAW
✓ Check DAW supports VST3/AU
✓ On macOS: remove quarantine flag
   xattr -dr com.apple.quarantine ATLAS.vst3
```

### MIDI 2.0 Not Working?
```
✓ Device must support MIDI 2.0
✓ Check device firmware is updated
✓ Check USB cable supports data (not just power)
✓ Fallback to MIDI 1.0 mode if needed
```

---

## 📚 Supported Devices

### Confirmed Working
- Sequential Prophet Rev2/5/6/10
- Moog Subsequent/Matriarch/Grandmother
- Korg Minilogue/Prologue/MS-20
- Roland Juno/JX/Jupiter series
- Novation Peak/Summit
- Arturia MatrixBrute/MicroFreak

### MIDI 2.0 Ready
- Sequential Prophet X/XL (with firmware)
- Roland FANTOM series
- Yamaha Montage M series
- Korg Prologue (with update)

### Generic SysEx Support
- **Any synthesizer with SysEx support**
- Manual patch dump required
- No automatic parameter mapping

---

## 🎓 Learn More

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [JUCE_PLUGIN_SETUP.md](JUCE_PLUGIN_SETUP.md) - Build plugin from source
- [MIDI2_INTEGRATION.md](MIDI2_INTEGRATION.md) - MIDI 2.0 features

---

## 💬 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@atlas-midi.com

---

**Enjoy managing your patches with ATLAS! 🏔️**
