# Complete Workflow: Getting Action IDs Working

## Quick Start (5 minutes)

### Step 1: Load Scripts in REAPER
```bash
# Scripts are already installed, just load them in REAPER:
# 1. Open REAPER
# 2. Press ? (Actions window)
# 3. ReaScript: Load...
# 4. Navigate to: ~/Library/Application Support/REAPER/Scripts/DAWRV/
# 5. Load: dawrv_track_control.lua, dawrv_navigation.lua
```

### Step 2: Find Action IDs
**In REAPER Actions window:**
- Search for "DAWRV" or the script name
- Note the action ID for each script
- Write them down

### Step 3: Update rhea.js
**Option A: Interactive Script (Easiest)**
```bash
./auto_update_action_ids.sh
# Follow prompts to enter each action ID
```

**Option B: Command Line**
```bash
./update_action_ids.sh mute 40297
./update_action_ids.sh solo 40298
# etc.
```

**Option C: Manual Edit**
Edit `src/renderer/scripts/rhea.js` and update the IDs directly.

### Step 4: Test
1. Restart DAWRV
2. Try voice commands
3. Check if they work!

## Detailed Steps

### Finding Action IDs in REAPER

1. **Open REAPER Actions:**
   - Press `?` key
   - Or: Actions > Show action list

2. **Search for Scripts:**
   - Type "DAWRV" in search box
   - Or search for: "transport", "track", "navigation"

3. **Note the Action ID:**
   - Look at the ID column
   - Or right-click > "Copy selected action ID"

4. **Common Script Names:**
   - "DAWRV: Transport Control"
   - "DAWRV: Track Control"
   - "DAWRV: Navigation"

### Action ID Mapping

After loading scripts, you'll need IDs for:

| Script Function | Action Name in rhea.js | Example ID |
|----------------|----------------------|------------|
| Mute track | `mute` | 40297 |
| Unmute track | `unmute` | 40298 |
| Solo track | `solo` | 40299 |
| Unsolo track | `unsolo` | 40300 |
| Next track | `nexttrack` | 40301 |
| Previous track | `previoustrack` | 40302 |
| Zoom in | `zoomin` | 1011 |
| Zoom out | `zoomout` | 1012 |
| Go to end | `gotoend` | 40073 |

**Note:** Actual IDs will vary - get them from REAPER!

## Troubleshooting

### Scripts Don't Appear in Actions
- ✅ Check scripts are in: `~/Library/Application Support/REAPER/Scripts/DAWRV/`
- ✅ Restart REAPER after copying scripts
- ✅ Verify file extensions are `.lua`

### Action IDs Don't Work
- ✅ Verify ID in REAPER Actions window
- ✅ Test directly: `python3 reaper_bridge.py [action_id]`
- ✅ Check REAPER console for errors

### Commands Still Not Working
- ✅ Make sure OSC is enabled in REAPER
- ✅ Check DAWRV console for errors
- ✅ Verify action ID is correct in rhea.js

## Quick Reference

**Find IDs:** REAPER > Actions (press `?`) > Search > Note ID

**Update IDs:** `./auto_update_action_ids.sh`

**Test:** Restart DAWRV > Try voice command > Check REAPER

---

**Once action IDs are updated, all 30+ voice commands will work!**

