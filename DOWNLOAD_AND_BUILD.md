# 🏔️ ATLAS - Download & Build DMG Instructions

## 📥 STEP 1: Download the Project

Since you're having trouble finding files in Cursor, let's use your **Terminal** on your Mac:

### Open Terminal and run:

```bash
# Go to your Documents folder
cd ~/Documents

# Download the ATLAS project from the remote workspace
# (You'll need to copy the files manually)

# OR use scp if you have SSH access:
# scp -r your-server:/workspace/atlas ./atlas
```

---

## 🎯 STEP 2: Alternative - Copy/Paste Method

Since downloading is difficult, I'll give you the **ESSENTIAL FILES** you need:

### Create the project structure manually:

```bash
# On your Mac Terminal:
cd ~/Documents
mkdir -p atlas-manual/standalone
cd atlas-manual/standalone
```

Then copy these files from Cursor (I'll provide them below):
1. `package.json`
2. `src/main/main.js`
3. `src/main/preload.js`
4. `src/renderer/index.html`
5. Core modules from `/workspace/atlas/core/`

---

## 🚀 STEP 3: Build the DMG

Once you have the files on your Mac:

```bash
cd ~/Documents/atlas/standalone

# Run the build script
./build-dmg.sh
```

This will:
1. Install all dependencies
2. Build the Electron app
3. Create: `dist/ATLAS-1.0.0-mac.dmg`
4. Open the folder automatically

---

## 💡 EASIER ALTERNATIVE: Direct Build Commands

If the script doesn't work, run these commands manually:

```bash
cd ~/Documents/atlas/standalone

# Install dependencies
npm install

# Build for macOS (Intel)
npm run build:mac

# OR Build for Apple Silicon (M1/M2)
npm run build:mac:universal
```

The DMG will be in: `dist/ATLAS-1.0.0-mac.dmg`

---

## 📦 What Gets Created:

After building, you'll have:
```
dist/
├── ATLAS-1.0.0-mac.dmg          ← Double-click to install!
├── ATLAS-1.0.0-mac-arm64.dmg    ← Apple Silicon version
└── mac/
    └── ATLAS.app                ← The actual app
```

---

## 🆘 If You STILL Can't Download Files:

I'll create a **PUBLIC LINK** version for you. Give me a moment...

