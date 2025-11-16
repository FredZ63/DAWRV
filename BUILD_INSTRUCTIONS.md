# Building Complete DAWRV/RHEA DMG

## Quick Build

To create a complete DMG with all dependencies:

```bash
./create_complete_dmg.sh
```

This will:
1. Build the Electron application
2. Create a DMG with the app and all necessary files
3. Include Python dependency installer
4. Include documentation

## Manual Build Steps

### 1. Install Build Dependencies

```bash
npm install
```

### 2. Build Electron App

```bash
npm run build:mac:dmg
```

### 3. Create Complete DMG

```bash
./create_complete_dmg.sh
```

## What Gets Bundled

### Application Files
- ✅ DAWRV.app (Electron application)
- ✅ All Node.js dependencies
- ✅ All source code

### Python Scripts
- ✅ rhea_voice_listener.py
- ✅ reaper_bridge.py
- ✅ reaper_osc_sender.py

### Documentation
- ✅ README.md
- ✅ REAPER_SETUP.md
- ✅ INSTALLER_README.md

### Installer Scripts
- ✅ Install Python Dependencies.command

## Output

The complete DMG will be created at:
```
dist/DAWRV-1.0.0-Complete.dmg
```

## Installation Requirements

**Important:** While the app is bundled, end users still need to:

1. **Install Python dependencies** (one-time):
   ```bash
   pip3 install SpeechRecognition pyaudio --break-system-packages
   ```
   Or use the included installer script.

2. **Grant microphone permission** in System Settings

3. **Set up REAPER OSC** (optional, for REAPER integration)

## Notes

- The DMG is code-signed if you have certificates configured
- Python dependencies must be installed system-wide for microphone access
- REAPER scripts need to be manually copied to REAPER's Scripts folder

## Troubleshooting

If build fails:
1. Check Node.js version (requires Node 16+)
2. Ensure electron-builder is installed: `npm install -g electron-builder`
3. Check macOS code signing certificates if needed


