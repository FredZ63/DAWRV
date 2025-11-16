# Quick Guide: Finding Action IDs in REAPER

## Method 1: Using REAPER Actions Window (Easiest)

1. **Open REAPER**
2. **Press `?`** (or Actions > Show action list)
3. **Search** for the action (e.g., type "mute", "solo", "zoom")
4. **Look at the ID** - it's shown in the list, usually in parentheses or a column
5. **Note the ID number**

## Method 2: Using the DAWRV List Script

1. **Load the script in REAPER:**
   - Actions > ReaScript: Load...
   - Navigate to: `daw-scripts/reaper/scripts/dawrv_list_actions.lua`
   - Load it

2. **Run the script:**
   - Find "DAWRV: List Actions" in Actions list
   - Click "Run"
   - It will create a file with all action IDs

3. **Check the output file:**
   - Location: `~/Library/Application Support/REAPER/dawrv_action_ids.txt`
   - Contains all DAWRV-related action IDs

## Method 3: Using update_action_ids.sh

After loading scripts in REAPER:

```bash
# Interactive mode
./update_action_ids.sh

# Or update specific action
./update_action_ids.sh mute 40297
```

## Common Action ID Locations

### Transport Actions
- Search: "Transport: Play" → ID: 1007
- Search: "Transport: Stop" → ID: 1016
- Search: "Transport: Record" → ID: 1013

### Track Actions
- Search: "Track: Toggle mute" → Find the ID
- Search: "Track: Toggle solo" → Find the ID
- Search: "Track: Go to next" → Find the ID

### View Actions
- Search: "View: Zoom in" → Find the ID
- Search: "View: Zoom out" → Find the ID

## After Finding IDs

Update `rhea.js`:

```javascript
this.reaperActions = {
    'mute': 40297,  // Replace with actual ID
    'solo': 40298,  // Replace with actual ID
    // etc.
}
```

Or use the update script:
```bash
./update_action_ids.sh mute 40297
```

