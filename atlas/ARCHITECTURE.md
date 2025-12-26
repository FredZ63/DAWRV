# ATLAS Architecture - Standalone + VST/AU Plugin

## 🎯 Dual Mode Architecture

ATLAS will work in **TWO modes**:

### 1. **Standalone Application** (Electron)
- Full-featured desktop app
- Complete patch management
- Device discovery and SysEx transfer
- MIDI 2.0 support
- Runs independently of any DAW

### 2. **VST/AU Plugin** (JUCE Framework)
- Loads inside any DAW (REAPER, Ableton, Logic, FL Studio, etc.)
- Same UI and features as standalone
- Integrated with DAW's MIDI routing
- Responds to DAW project changes
- Can load patches automatically per track/project

---

## 🏗️ Project Structure

```
atlas/
├── standalone/                 # Electron standalone app
│   ├── src/
│   │   ├── main/              # Electron main process
│   │   └── renderer/          # UI (shared with plugin)
│   ├── package.json
│   └── build scripts
│
├── plugin/                     # JUCE VST/AU plugin
│   ├── Source/
│   │   ├── PluginProcessor.cpp
│   │   ├── PluginEditor.cpp
│   │   └── WebView/           # Embeds same UI as standalone
│   ├── ATLAS.jucer            # JUCE project file
│   └── Builds/                # Platform-specific builds
│
├── shared/                     # Shared components
│   ├── ui/                    # Web-based UI (HTML/CSS/JS)
│   ├── core/                  # MIDI/patch logic (Node.js/C++)
│   └── assets/                # Icons, styles, etc.
│
└── docs/
    └── ARCHITECTURE.md        # This file
```

---

## 🔧 Technology Stack

### Standalone (Electron)
```javascript
- Electron 27.x          // Desktop app framework
- Node.js               // Backend logic
- better-sqlite3        // Database
- node-midi             // MIDI I/O
- Web UI (HTML/CSS/JS)  // Interface
```

### Plugin (JUCE)
```cpp
- JUCE Framework        // VST/AU plugin framework
- WebView2 (Windows)    // Embedded browser
- WKWebView (macOS)     // Embedded browser
- Same web UI           // Shared interface
- SQLite                // Database
- JUCE MIDI classes     // MIDI I/O
```

---

## 🎨 Shared UI Architecture

The **same web-based UI** is used in both modes:

```
shared/ui/
├── index.html          # Main interface
├── styles/
│   ├── main.css
│   └── components.css
├── scripts/
│   ├── atlas-core.js   # Core UI logic
│   ├── midi-io.js      # MIDI interface
│   └── patch-manager.js
└── assets/
    └── icons/
```

**How it works:**
- **Standalone**: Electron loads the UI directly
- **Plugin**: JUCE WebView loads the same UI files
- UI communicates with backend via **message passing**
- Backend adapts to environment (Node.js or C++)

---

## 🔌 Plugin Integration Features

### When loaded as VST/AU:

1. **DAW-Aware**
   - Knows which track it's loaded on
   - Responds to project changes
   - Auto-loads patches per track

2. **MIDI Integration**
   - Uses DAW's MIDI routing
   - Can receive/send MIDI through track
   - Program changes integrated with DAW automation

3. **Project Management**
   - Saves patch selections with DAW project
   - Recalls patches when project opens
   - Per-track patch presets

4. **Automation**
   - Expose parameters to DAW automation
   - Patch selection via automation
   - SysEx triggers via MIDI clips

---

## 📦 Build Targets

### Standalone Builds
```bash
# macOS
ATLAS-1.0.0-beta.1-universal.dmg
ATLAS-1.0.0-beta.1-arm64.dmg
ATLAS-1.0.0-beta.1-x64.dmg

# Windows
ATLAS-1.0.0-beta.1-win.exe
ATLAS-1.0.0-beta.1-win-portable.exe

# Linux
ATLAS-1.0.0-beta.1.AppImage
ATLAS-1.0.0-beta.1.deb
```

### Plugin Builds
```bash
# macOS
ATLAS.component          # Audio Unit (AU)
ATLAS.vst3              # VST3
ATLAS.vst               # VST2 (legacy)

# Windows
ATLAS.vst3              # VST3
ATLAS.dll               # VST2 (legacy)

# Linux
ATLAS.vst3              # VST3
```

---

## 🚀 Implementation Phases

### Phase 1: Standalone App (Current) ✅
- [x] Electron app structure
- [x] Core MIDI/database logic
- [x] Basic UI
- [ ] Complete patch browser
- [ ] Device management UI

### Phase 2: Shared UI Extraction
- [ ] Extract UI to `shared/ui/`
- [ ] Create API abstraction layer
- [ ] Message-based backend communication
- [ ] Test standalone with new architecture

### Phase 3: JUCE Plugin Framework
- [ ] Create JUCE project
- [ ] Implement VST/AU plugin shell
- [ ] Embed WebView with shared UI
- [ ] Port MIDI/database logic to C++
- [ ] Implement plugin-specific features

### Phase 4: DAW Integration
- [ ] Track awareness
- [ ] Project state management
- [ ] Automation parameters
- [ ] MIDI routing integration

### Phase 5: Testing & Distribution
- [ ] Test in major DAWs
- [ ] Code signing (macOS/Windows)
- [ ] Installer creation
- [ ] Documentation

---

## 💡 Example Use Cases

### Standalone Mode
```
1. Launch ATLAS app
2. Connect MIDI devices
3. Backup all patches from Prophet Rev2
4. Organize patches into categories
5. Export patch library
```

### Plugin Mode (REAPER)
```
1. Load ATLAS as VST3 on Track 1
2. ATLAS auto-connects to hardware synth on MIDI Out 1
3. Select patch from browser
4. Patch sent to synth automatically
5. Patch selection saved with REAPER project
6. Next time: patch loads automatically!
```

### Plugin Mode (Ableton)
```
1. Load ATLAS on MIDI track
2. Browse patches while playing
3. A/B compare different patches
4. Automate patch changes with clips
5. Record SysEx automation in timeline
```

---

## 🔑 Key Benefits

| Feature | Standalone | VST/AU Plugin |
|---------|-----------|---------------|
| **Patch Management** | ✅ Full | ✅ Full |
| **Device Discovery** | ✅ | ✅ |
| **MIDI 2.0** | ✅ | ✅ |
| **DAW Integration** | ❌ | ✅ Auto |
| **Project Recall** | Manual | ✅ Auto |
| **Track-based Patches** | ❌ | ✅ |
| **Automation** | ❌ | ✅ |
| **Timeline Integration** | ❌ | ✅ |

---

## 🛠️ Development Workflow

### For Standalone
```bash
cd atlas/standalone
npm install
npm run dev          # Development mode
npm run build:mac    # Build for macOS
npm run build:win    # Build for Windows
```

### For Plugin
```bash
cd atlas/plugin
# Open ATLAS.jucer in Projucer
# Generate build files for your platform
# Build in Xcode (macOS) or Visual Studio (Windows)
```

---

## 📝 Next Steps

1. **Complete standalone app** (current focus)
2. **Extract shared UI** to `shared/` directory
3. **Set up JUCE project** for plugin
4. **Port core logic** to C++ (or use Node.js addon)
5. **Test plugin** in multiple DAWs
6. **Release both versions**

---

**Built for flexibility: Use ATLAS however you work best! 🎵**
