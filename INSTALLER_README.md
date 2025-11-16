# DAWRV/RHEA Complete Installation Package

## What's Included

This DMG contains a complete, self-contained installation of DAWRV/RHEA with all necessary components:

### Core Application
- ✅ DAWRV Electron application
- ✅ RHEA Voice Assistant
- ✅ All Node.js dependencies bundled

### Python Components
- ✅ Voice recognition scripts
- ✅ REAPER bridge scripts
- ✅ OSC communication scripts

### Installation Requirements

**Note:** While the app is bundled, macOS requires Python dependencies to be installed system-wide for microphone access.

### Installation Steps

1. **Mount the DMG** by double-clicking it

2. **Drag DAWRV to Applications** folder

3. **Install Python Dependencies** (Required for voice recognition):
   - Open Terminal
   - Run: `pip3 install SpeechRecognition pyaudio --break-system-packages`
   - Or use the included installer script

4. **Grant Microphone Permission**:
   - System Settings > Privacy & Security > Microphone
   - Enable DAWRV

5. **Set up REAPER Integration** (Optional):
   - See REAPER_SETUP.md for OSC configuration
   - Copy REAPER scripts to: `~/Library/Application Support/REAPER/Scripts/RHEA/`

### First Launch

1. Open DAWRV from Applications
2. Click "Start Listening"
3. Grant microphone permission when prompted
4. Start using voice commands!

### Voice Commands

- "Play" - Start playback
- "Stop" - Stop playback
- "Record" - Start recording
- "Undo" - Undo last action
- "Save" - Save project
- "New track" - Create new track

### Support

For issues or questions, refer to:
- README.md - General information
- REAPER_SETUP.md - REAPER integration guide

---

**Created by Frederick Zimmerman**  
**Powered by ZIMMTEK Technology | A Soular Sound Product**


