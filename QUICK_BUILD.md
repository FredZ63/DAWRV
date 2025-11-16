# Quick Build Guide - Complete DAWRV DMG

## One-Command Build

To create a complete DMG installer:

```bash
./create_complete_dmg.sh
```

This single command will:
1. ✅ Build the Electron application
2. ✅ Bundle all dependencies
3. ✅ Create a DMG installer
4. ✅ Include Python dependency installer
5. ✅ Include all documentation

## Output

The DMG will be created at:
```
dist/DAWRV-1.0.0-Complete.dmg
```

## What's Included in the DMG

### Application
- **DAWRV.app** - Complete bundled application
- All Node.js dependencies included
- All Python scripts included

### Installer Scripts
- **Install Python Dependencies.command** - One-click Python dependency installer

### Documentation
- **README.txt** - Installation and usage guide
- **REAPER_SETUP.txt** - REAPER integration setup

### Quick Links
- **Applications** folder link for easy installation

## Installation for End Users

1. **Mount DMG** - Double-click the DMG file
2. **Drag to Applications** - Drag DAWRV.app to Applications folder
3. **Install Python Dependencies** - Double-click "Install Python Dependencies.command"
4. **Grant Permissions** - Allow microphone access when prompted
5. **Launch** - Open DAWRV from Applications

## Requirements

### Build Requirements
- Node.js 16+ 
- npm
- macOS with Xcode Command Line Tools

### End User Requirements
- macOS 10.13 or later
- Python 3 (usually pre-installed on macOS)
- Internet connection (for Python dependencies installation)

## Notes

- Python dependencies must be installed once per system
- Microphone permission is required for voice recognition
- REAPER integration is optional (see REAPER_SETUP.txt)

## Troubleshooting

**Build fails?**
- Run `npm install` first
- Check Node.js version: `node --version`
- Ensure electron-builder is installed: `npm list -g electron-builder`

**DMG won't open?**
- Right-click DMG > Open (if Gatekeeper blocks it)
- Check System Settings > Privacy & Security

**App won't run?**
- Check Console.app for error messages
- Ensure Python dependencies are installed
- Grant microphone permission in System Settings


