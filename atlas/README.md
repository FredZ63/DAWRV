# ATLAS - Automatic Transfer and Librarian for Audio Synthesizers

> **"Holding Your Patch Universe"**

ATLAS is a comprehensive MIDI patch librarian and SysEx manager available as:
- **Standalone Application** (macOS, Windows, Linux)
- **VST/AU Plugin** (Load inside any DAW)

Work independently or integrate seamlessly with REAPER, Ableton, Logic Pro, and more!

## 🎯 Core Features

### Patch Management
- **Universal Patch Library**: Store and organize patches from all your MIDI devices
- **Smart Search**: Find patches by name, category, tags, or sonic characteristics
- **Backup & Restore**: Never lose a patch again
- **Version Control**: Track patch changes over time

### Device Integration
- **Auto-Discovery**: Automatically detect connected MIDI devices
- **Dual Protocol Support**: MIDI 1.0 (universal compatibility) + MIDI 2.0 (enhanced features)
- **Auto-Detection**: Automatically uses best available protocol
- **Multi-Device Support**: Manage multiple synths simultaneously
- **Device Templates**: Pre-built support for popular synthesizers

### MIDI 2.0 Enhanced Features (When Available)
- **Query Patches**: Read current patch directly from device
- **32-bit Precision**: Exact parameter values (not 7-bit approximations)
- **Bidirectional Communication**: Device state queries and verification
- **Property Exchange**: Automatic capability discovery

### Voice Control (via RHEA)
```
"Atlas, load my bass patch"
"Atlas, backup all Prophet presets"
"Atlas, find patches with reverb"
"Atlas, transfer preset 5 to my Moog"
```

### REAPER Integration
- **Project-Based Patches**: Save/load patch sets per project
- **Track-Linked Patches**: Auto-load patches when selecting tracks
- **Program Change Automation**: Generate REAPER automation

## 🏗️ Architecture

```
atlas/
├── core/
│   ├── patch-database.js      # SQLite patch database
│   ├── device-manager.js      # MIDI device detection & management
│   ├── sysex-handler.js       # SysEx parsing & encoding
│   └── midi-io.js             # Low-level MIDI I/O
├── devices/
│   ├── prophet.js             # Prophet Rev2/5/6/10
│   ├── moog.js                # Moog Subsequent/Matriarch/etc
│   ├── korg.js                # Korg Minilogue/Prologue/etc
│   └── generic.js             # Fallback for unknown devices
├── ui/
│   ├── atlas.html             # Main interface
│   ├── patch-browser.html     # Patch library browser
│   └── styles/
│       └── atlas.css          # ATLAS-specific styles
└── integrations/
    ├── rhea-commands.js       # RHEA voice command integration
    └── reaper-bridge.js       # REAPER OSC/ReaScript bridge
```

## 📊 Database Schema

```javascript
Patches:
  - id (UUID)
  - name (String)
  - device (String)
  - category (String)
  - tags (Array)
  - sysex (Binary)
  - parameters (JSON)
  - projectId (String, optional)
  - lastUsed (Timestamp)
  - rating (Integer 1-5)
  - waveform (Base64, optional)

Devices:
  - id (UUID)
  - name (String)
  - manufacturer (String)
  - model (String)
  - midiChannel (Integer)
  - portId (String)
  - template (String)
  - connected (Boolean)

Projects:
  - id (UUID)
  - name (String)
  - reaperProjectPath (String)
  - patchSet (Array of patch IDs)
  - lastOpened (Timestamp)
```

## 🚀 Getting Started

### Installation
```bash
# Install dependencies
npm install better-sqlite3 midi

# Initialize ATLAS database
node atlas/core/init-database.js
```

### Usage with RHEA
```javascript
// In your DAWRV app
const Atlas = require('./atlas/core/atlas-manager.js');
const atlas = new Atlas();

// Voice command handling
rhea.on('command', async (cmd) => {
  if (cmd.startsWith('atlas')) {
    const result = await atlas.handleVoiceCommand(cmd);
    rhea.speak(result.message);
  }
});
```

## 🎨 Voice Command Examples

### Patch Management
- "Atlas, show all bass patches"
- "Atlas, save current patch as Epic Lead"
- "Atlas, load preset number 5"
- "Atlas, backup all patches from my Prophet"

### Device Operations
- "Atlas, what devices are connected?"
- "Atlas, send patch to channel 3"
- "Atlas, read current patch from device"

### Project Integration
- "Atlas, load patches for this project"
- "Atlas, save current patch set"
- "Atlas, switch to mixing mode"

### Search & Discovery
- "Atlas, find patches similar to this"
- "Atlas, show my most used patches"
- "Atlas, find bright lead sounds"

## 🔌 Supported Devices (Planned)

- Sequential Prophet Rev2/5/6/10
- Moog Subsequent/Matriarch/Grandmother
- Korg Minilogue/Prologue/MS-20
- Roland Juno/JX/Jupiter series
- Novation Peak/Summit
- Arturia MatrixBrute/MicroFreak
- Behringer DeepMind
- Generic MIDI devices (basic SysEx support)

## 🛠️ Development Roadmap

### Phase 1: Foundation ✅
- [x] Project structure
- [ ] Patch database
- [ ] Basic MIDI I/O
- [ ] Device detection

### Phase 2: Core Features
- [ ] SysEx handler
- [ ] Patch browser UI
- [ ] Backup/restore functionality
- [ ] Basic device templates

### Phase 3: Voice Integration
- [ ] RHEA command integration
- [ ] Natural language processing
- [ ] Status reporting

### Phase 4: Advanced Features
- [ ] REAPER project integration
- [ ] Patch analysis/waveform preview
- [ ] Cloud sync
- [ ] Community sharing

## 🤝 Integration with RHEA & MORPHEUS

**RHEA** (Voice Control) ↔ **ATLAS** (Patch Management) ↔ **MORPHEUS** (Sampling)

ATLAS can:
- Receive voice commands via RHEA
- Load patches for tracks in REAPER
- Coordinate with MORPHEUS for hardware sample transfers
- Provide patch recommendations based on project context

## 📝 License

MIT License - Part of the DAWRV ecosystem

---

**Built with ❤️ for musicians who want to focus on creativity, not configuration.**
