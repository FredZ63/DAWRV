# Quick Fix: Update Action IDs

## Step 1: Load Scripts in REAPER

1. Open REAPER
2. Press `?` to open Actions
3. Click **ReaScript: Load...**
4. Navigate to: `~/Library/Application Support/REAPER/Scripts/DAWRV/`
5. Load these files:
   - `dawrv_transport.lua`
   - `dawrv_track_control.lua`
   - `dawrv_navigation.lua`

## Step 2: Find Action IDs

### Option A: Quick Manual Method
1. In REAPER Actions window, search for "DAWRV"
2. For each script, note the action ID shown
3. Write them down

### Option B: Use List Script
1. Load `dawrv_list_actions.lua` in REAPER
2. Run it
3. Check `~/Library/Application Support/REAPER/dawrv_action_ids.txt`

## Step 3: Update rhea.js

### Method 1: Use Update Script (Easiest)
```bash
# Interactive mode - enter IDs one by one
./update_action_ids.sh

# Or update specific actions
./update_action_ids.sh mute 40297
./update_action_ids.sh solo 40298
./update_action_ids.sh nexttrack 40299
```

### Method 2: Manual Edit
Edit `src/renderer/scripts/rhea.js` and update the `reaperActions` object:

```javascript
this.reaperActions = {
    // ... existing actions ...
    'mute': 40297,        // Replace with actual ID from REAPER
    'unmute': 40298,      // Replace with actual ID from REAPER
    'solo': 40299,        // Replace with actual ID from REAPER
    'unsolo': 40300,      // Replace with actual ID from REAPER
    'nexttrack': 40301,   // Replace with actual ID from REAPER
    'previoustrack': 40302, // Replace with actual ID from REAPER
}
```

## Step 4: Test

1. Restart DAWRV
2. Try voice commands
3. Check console for any errors
4. Verify commands execute in REAPER

## Troubleshooting

### Can't Find Scripts in Actions?
- Make sure scripts are in: `~/Library/Application Support/REAPER/Scripts/DAWRV/`
- Restart REAPER after copying scripts
- Check file extensions are `.lua` (not `.txt`)

### Action IDs Don't Work?
- Verify the ID in REAPER Actions window
- Test directly: `python3 reaper_bridge.py [action_id]`
- Check REAPER console for errors

### Scripts Don't Execute?
- Check REAPER console (View > Show console)
- Verify Lua is enabled: Preferences > Plug-ins > ReaScript
- Make sure scripts are loaded (not just copied)

---

**After updating action IDs, all voice commands should work!**

