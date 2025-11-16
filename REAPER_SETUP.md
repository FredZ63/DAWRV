# REAPER Integration Setup for DAWRV/RHEA

## Current Status
REAPER command-line execution of Lua scripts is not reliable on macOS. REAPER treats `.lua` files as project files instead of executing them.

## Solution Options

### Option 1: Enable OSC in REAPER (Recommended)
1. Open REAPER
2. Go to **Preferences** > **Control/OSC/web**
3. Enable **Control surface** and select **OSC**
4. Set **Local port** to `8000` (default)
5. Click **OK**

The bridge script will now use OSC to send commands to REAPER.

### Option 2: Enable HTTP API in REAPER
1. Open REAPER
2. Go to **Preferences** > **Control/OSC/web**
3. Enable **Web interface**
4. Set port to `8080` (default)
5. Click **OK**

The bridge script will try HTTP API first, then fall back to OSC.

### Option 3: Use REAPER Actions Directly
The scripts in `/Users/frederickzimmerman/Library/Application Support/REAPER/Scripts/RHEA/` need to be registered as REAPER actions:
1. In REAPER, go to **Actions** > **Show action list**
2. Click **ReaScript: Load** and load each script
3. Assign keyboard shortcuts if desired

## Testing
After enabling OSC or HTTP API, test with:
```bash
python3 reaper_bridge.py 1007  # Play action
python3 reaper_bridge.py 1016  # Stop action
```

## Action IDs
- 1007: Play/Pause
- 1016: Stop
- 1013: Record
- 40029: Undo
- 40026: Save
- 40001: New Track


