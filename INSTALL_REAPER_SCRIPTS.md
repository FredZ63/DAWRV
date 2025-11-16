# Installing REAPER Scripts for DAWRV Voice Commands

## Why Some Commands Need Custom Scripts

Some REAPER actions don't have standard action IDs, or the action IDs vary between REAPER versions. Custom ReaScripts ensure these commands work reliably.

## Installation Steps

### 1. Find REAPER's Scripts Folder

**Method 1: Via REAPER**
1. Open REAPER
2. Go to **Options** > **Show REAPER resource path in Finder**
3. Navigate to the **Scripts** folder
4. Create a subfolder called **DAWRV** (optional, for organization)

**Method 2: Direct Path**
```
~/Library/Application Support/REAPER/Scripts/DAWRV/
```

### 2. Copy Script Files

Copy these files to the Scripts folder:

```
daw-scripts/reaper/scripts/dawrv_transport.lua
daw-scripts/reaper/scripts/dawrv_track_control.lua
daw-scripts/reaper/scripts/dawrv_navigation.lua
```

**Quick Copy Command:**
```bash
mkdir -p ~/Library/Application\ Support/REAPER/Scripts/DAWRV/
cp daw-scripts/reaper/scripts/*.lua ~/Library/Application\ Support/REAPER/Scripts/DAWRV/
```

### 3. Load Scripts in REAPER

1. In REAPER, press `?` to open **Actions** window
2. Click **ReaScript: Load...**
3. Navigate to the Scripts/DAWRV folder
4. Select each `.lua` file and click **Open**
5. Each script will appear in the Actions list

### 4. (Optional) Assign Action IDs

If you want to use action IDs instead of scripts:

1. In Actions window, find each loaded script
2. Right-click > **Copy selected action ID**
3. Note the ID number
4. Update `rhea.js` with the correct action IDs

## Scripts Included

### dawrv_transport.lua
- Play, Stop, Pause, Record
- Uses standard REAPER action IDs

### dawrv_track_control.lua
- Mute/Unmute tracks
- Solo/Unsolo tracks
- Next/Previous track navigation
- New/Delete track

### dawrv_navigation.lua
- Zoom In/Out/All
- Go to End

## Alternative: Use Action IDs Directly

If you prefer to use action IDs instead of scripts:

1. **Find Action IDs in REAPER:**
   - Actions > Show action list
   - Search for the action
   - The ID is shown in the list

2. **Common Action IDs:**
   - Play: 1007
   - Stop: 1016
   - Record: 1013
   - Undo: 40029
   - Save: 40026
   - New Track: 40001 (may vary)

3. **Update rhea.js:**
   - Edit `src/renderer/scripts/rhea.js`
   - Update the `reaperActions` object with correct IDs

## Verifying Installation

After installing scripts:

1. **Test in REAPER:**
   - Actions > Show action list
   - Search for "DAWRV"
   - You should see the scripts listed
   - Click "Run" to test each one

2. **Test Voice Commands:**
   - Restart DAWRV
   - Say a command like "mute" or "next track"
   - Check REAPER console (View > Show console) for "DAWRV:" messages

## Troubleshooting

### Scripts Don't Appear
- Check file extension is `.lua` (not `.txt`)
- Verify scripts are in the correct folder
- Restart REAPER

### Scripts Don't Execute
- Check REAPER console for error messages
- Verify Lua is enabled: Preferences > Plug-ins > ReaScript
- Make sure scripts are loaded (not just copied)

### Commands Still Don't Work
- Check REAPER console for "DAWRV:" messages
- Verify OSC is enabled in REAPER
- Test action IDs directly: `python3 reaper_bridge.py [action_id]`

## Quick Install Script

Run this to automatically install all scripts:

```bash
#!/bin/bash
REAPER_SCRIPTS="$HOME/Library/Application Support/REAPER/Scripts/DAWRV"
mkdir -p "$REAPER_SCRIPTS"
cp daw-scripts/reaper/scripts/*.lua "$REAPER_SCRIPTS/"
echo "✅ Scripts copied to: $REAPER_SCRIPTS"
echo "Now load them in REAPER: Actions > ReaScript: Load..."
```

---

**After installing scripts, restart DAWRV and test voice commands!**

