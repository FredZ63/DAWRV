# How to Find Correct REAPER Action IDs

## Quick Method

1. **Open REAPER**
2. **Press `?`** to open Actions window
3. **Search** for the action name (e.g., "mute", "solo", "new track")
4. **Look at the ID** shown in the list (usually in parentheses or a column)
5. **Update `rhea.js`** with the correct ID

## Common Action IDs (Verify These)

### Transport (Usually Correct)
- Play: **1007** ✅
- Stop: **1016** ✅
- Record: **1013** ✅
- Pause: **1008** ✅
- Rewind: **1014** ✅
- Loop: **1068** ✅

### Editing (Usually Correct)
- Undo: **40029** ✅
- Redo: **40030** ✅
- Cut: **40001** ✅
- Copy: **40003** ✅
- Paste: **40004** ✅
- Delete: **40005** ✅

### Project (Usually Correct)
- Save: **40026** ✅
- Save As: **40022** ✅
- New Project: **40023** ✅
- Open Project: **40025** ✅

### Tracks (NEED VERIFICATION)
- New Track: **40001** ⚠️ (Same as Cut - likely wrong)
- Delete Track: **40005** ⚠️ (Same as Delete - likely wrong)
- Mute: **6** ⚠️ (Too low - likely wrong)
- Unmute: **7** ⚠️ (Too low - likely wrong)
- Solo: **8** ⚠️ (Too low - likely wrong)
- Unsolo: **9** ⚠️ (Too low - likely wrong)
- Next Track: **40285** ⚠️ (May not exist)
- Previous Track: **40286** ⚠️ (May not exist)

### Navigation (NEED VERIFICATION)
- Zoom In: **1011** ⚠️
- Zoom Out: **1012** ⚠️
- Zoom All: **40031** ⚠️
- Go to End: **40073** ⚠️

### Markers (NEED VERIFICATION)
- Add Marker: **40157** ⚠️
- Next Marker: **40161** ⚠️
- Previous Marker: **40162** ⚠️

## Testing Action IDs

Run this to test which action IDs work:

```bash
python3 test_reaper_actions.py
```

This will test each action and tell you which ones work.

## Solution: Use Custom ReaScripts

For commands that don't have reliable action IDs, use custom ReaScripts:

1. **Install scripts** (see INSTALL_REAPER_SCRIPTS.md):
   ```bash
   ./install_reaper_scripts.sh
   ```

2. **Load scripts in REAPER:**
   - Actions > ReaScript: Load...
   - Load each script
   - Note the action ID assigned to each script

3. **Update rhea.js** with the script action IDs

## Quick Fix: Use Only Working Commands

For now, you can comment out commands that don't work and use only the verified ones:

```javascript
// Comment out problematic commands:
// 'mute': 6,  // Doesn't work - needs script
// 'solo': 8,  // Doesn't work - needs script
```

Then add them back once you have the correct action IDs or scripts installed.

