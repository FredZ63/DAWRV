# ⚠️ IMPORTANT: Enable REAPER OSC for Voice Commands

## Problem
REAPER is not responding to voice commands because **OSC (Open Sound Control) is not enabled** in REAPER.

## Quick Fix (2 minutes)

### Step 1: Open REAPER Preferences
1. Open REAPER
2. Press `Cmd+,` (or go to **REAPER** > **Preferences**)

### Step 2: Enable OSC
1. In the Preferences window, find **Control/OSC/web** (use search if needed)
2. Click on **Control/OSC/web**
3. Click **Add...** button
4. Select **OSC** from the list
5. Click **OK**
6. In the OSC settings:
   - **Local port**: `8000` (default)
   - Make sure **Enable** is checked
7. Click **OK** to close Preferences

### Step 3: Verify
- You should see OSC enabled in the Control/OSC/web list
- REAPER will now listen on port 8000 for commands

### Step 4: Test
1. Restart DAWRV
2. Click "Start Listening"
3. Say "play" or "stop"
4. REAPER should now respond!

## Alternative: Enable HTTP API

If OSC doesn't work, try HTTP API:

1. In REAPER Preferences > **Control/OSC/web**
2. Enable **Web interface**
3. Set port to `8080`
4. Click **OK**

## Why This Is Needed

REAPER's command-line script execution doesn't work reliably on macOS. OSC (or HTTP API) is the recommended way to control REAPER from external applications.

## Still Not Working?

1. Check REAPER console for errors (View > Show console)
2. Verify ports are listening: `netstat -an | grep 8000`
3. Try restarting both REAPER and DAWRV
4. Check DAWRV console for error messages

---

**After enabling OSC, REAPER will respond to all voice commands!**


