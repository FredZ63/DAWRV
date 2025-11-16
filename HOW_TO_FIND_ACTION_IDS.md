# How to Find Action IDs in REAPER

## Method 1: Using REAPER Actions Window (Easiest)

### Step-by-Step:

1. **Open REAPER**

2. **Open Actions Window:**
   - Press the `?` key (question mark)
   - OR: Go to menu **Actions** > **Show action list**
   - OR: Go to menu **Options** > **Show action list**

3. **Find the Action:**
   - Use the **Search box** at the top
   - Type the action name (e.g., "mute", "solo", "zoom", "play")
   - Actions matching your search will appear

4. **See the Action ID:**
   - The action ID is shown in the list
   - It's usually in a column on the right, or in parentheses
   - Example: `40297` or `(40297)`

5. **Copy the ID:**
   - Select the action
   - Right-click > **Copy selected action ID**
   - OR: Just write down the number

### Visual Guide:

```
REAPER Actions Window
┌─────────────────────────────────────────┐
│ Search: [mute                    ]      │
├─────────────────────────────────────────┤
│ Name                    │ ID   │ Shortcut│
├─────────────────────────────────────────┤
│ Track: Toggle mute      │ 40297│         │ ← ID is here
│ Track: Toggle mute (all)│ 40298│         │
└─────────────────────────────────────────┘
```

## Method 2: For DAWRV Scripts

After loading DAWRV scripts in REAPER:

1. **Open Actions** (press `?`)

2. **Search for "DAWRV":**
   - Type "DAWRV" in search box
   - You'll see scripts like:
     - "DAWRV: Transport Control"
     - "DAWRV: Track Control"
     - "DAWRV: Navigation"

3. **Note the Action ID** for each script

## Method 3: Using the List Script

1. **Load the list script:**
   - Actions > ReaScript: Load...
   - Navigate to: `daw-scripts/reaper/scripts/dawrv_list_actions.lua`
   - Load it

2. **Run the script:**
   - Find "DAWRV: List Actions" in Actions
   - Click "Run"
   - A file will be created with all action IDs

3. **Check the output:**
   - File location: `~/Library/Application Support/REAPER/dawrv_action_ids.txt`
   - Open it to see all action IDs

## Common Actions to Find

### Transport Actions
- Search: **"Transport: Play"** → ID: 1007
- Search: **"Transport: Stop"** → ID: 1016
- Search: **"Transport: Record"** → ID: 1013
- Search: **"Transport: Pause"** → ID: 1008
- Search: **"Transport: Loop"** → ID: 1068

### Track Actions
- Search: **"Track: Toggle mute"** → Find the ID
- Search: **"Track: Toggle solo"** → Find the ID
- Search: **"Track: Insert new"** → Find the ID
- Search: **"Track: Go to next"** → Find the ID

### View Actions
- Search: **"View: Zoom in"** → Find the ID
- Search: **"View: Zoom out"** → Find the ID
- Search: **"View: Zoom to project"** → Find the ID

### Marker Actions
- Search: **"Insert marker"** → Find the ID
- Search: **"Go to next marker"** → Find the ID
- Search: **"Go to previous marker"** → Find the ID

## Quick Tips

1. **Action IDs are numbers** - usually 4-5 digits
2. **Each action has a unique ID** - even if names are similar
3. **IDs can vary** between REAPER versions
4. **Custom scripts** get new IDs when loaded

## After Finding IDs

### Update rhea.js Automatically:
```bash
./auto_update_action_ids.sh
# Enter each ID when prompted
```

### Or Update Manually:
```bash
./update_action_ids.sh mute 40297
./update_action_ids.sh solo 40298
```

### Or Edit Directly:
Edit `src/renderer/scripts/rhea.js`:
```javascript
this.reaperActions = {
    'mute': 40297,  // Replace with your ID
    'solo': 40298,  // Replace with your ID
}
```

## Troubleshooting

### Can't See Action IDs?
- Make sure you're in the Actions window (not Preferences)
- Look for a column labeled "ID" or "Command ID"
- Some REAPER versions show IDs in parentheses: `(40297)`

### Can't Find the Action?
- Try different search terms
- Check spelling
- Some actions might be in sub-menus
- Custom scripts need to be loaded first

### Action ID Doesn't Work?
- Verify the ID is correct
- Test directly: `python3 reaper_bridge.py [action_id]`
- Check REAPER console for errors
- Make sure OSC is enabled

---

**The easiest way: Press `?` in REAPER, search for the action, and note the ID number!**

