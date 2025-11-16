# Automatic Action ID Setup

## Fully Automated Method

### Option 1: One-Command Setup (Easiest)

```bash
./auto_find_action_ids.sh
```

This script will:
1. ✅ Check if REAPER is running
2. ✅ Install export script to REAPER
3. ✅ Guide you through loading it in REAPER
4. ✅ Parse the exported action IDs
5. ✅ Automatically update rhea.js

### Option 2: Query REAPER Directly

```bash
python3 query_reaper_actions.py
```

This tests common action IDs to find which ones work.

### Option 3: Parse Exported File

After running the export script in REAPER:

```bash
python3 parse_action_ids.py
```

This automatically parses the exported action IDs and updates rhea.js.

## Quick Start

1. **Make sure REAPER is running**

2. **Run the auto-finder:**
   ```bash
   ./auto_find_action_ids.sh
   ```

3. **Follow the prompts:**
   - It will tell you when to load the script in REAPER
   - After you run the script in REAPER, press Enter
   - It will automatically update rhea.js

4. **Restart DAWRV** and test!

## What Gets Updated Automatically

The scripts will automatically find and update:
- ✅ Transport actions (play, stop, record, pause)
- ✅ Track actions (mute, solo, next, previous)
- ✅ Navigation actions (zoom in/out)
- ✅ DAWRV script actions (if loaded)

## Troubleshooting

### Script Can't Find Actions
- Make sure REAPER is running
- Verify OSC/HTTP API is enabled
- Load DAWRV scripts in REAPER first

### Updates Don't Work
- Check rhea.js was updated (look for new IDs)
- Verify action IDs are correct
- Test directly: `python3 reaper_bridge.py [action_id]`

---

**The automated scripts do all the work - you just need to load the export script in REAPER once!**

