# How to Enable OSC in REAPER - Step by Step

## Quick Steps

### Step 1: Open REAPER Preferences
- **Method 1:** Press `Cmd+,` (Command + Comma)
- **Method 2:** Go to menu: **REAPER** > **Preferences...**
- **Method 3:** Go to menu: **Options** > **Preferences...**

### Step 2: Find Control/OSC/web Settings
- In the Preferences window, look for **Control/OSC/web** in the left sidebar
- If you don't see it, use the **Search** box at the top and type: `OSC`
- Click on **Control/OSC/web** to open those settings

### Step 3: Add OSC Control Surface
- In the Control/OSC/web window, you'll see a list of control surfaces
- Click the **Add...** button (usually at the bottom or right side)
- A dialog will appear with a list of control surface types
- Scroll down and select **OSC (Open Sound Control)**
- Click **OK**

### Step 4: Configure OSC Settings
After adding OSC, you'll see OSC settings. Configure:

1. **Enable** checkbox - Make sure this is CHECKED ✓
2. **Local port** - Set to `8000` (this is the default)
3. **Mode** - Leave as default or set to "Server"
4. Click **OK** to save

### Step 5: Verify OSC is Enabled
- You should now see **OSC** listed in your Control/OSC/web surfaces
- There should be a checkmark or "Enabled" indicator next to it
- Click **OK** to close Preferences

### Step 6: Test
1. Open DAWRV
2. Click "Start Listening"
3. Say "play" or "stop"
4. REAPER should now respond!

## Visual Guide

```
REAPER Menu Bar
  ↓
REAPER > Preferences (or Cmd+,)
  ↓
Left Sidebar: Control/OSC/web
  ↓
Click "Add..." button
  ↓
Select "OSC (Open Sound Control)"
  ↓
Configure:
  ✓ Enable (checked)
  Local port: 8000
  ↓
Click OK
  ↓
Verify OSC appears in list
  ↓
Click OK to close Preferences
```

## Troubleshooting

### Can't find Control/OSC/web?
- Use the Search box in Preferences (top of window)
- Type: `OSC` or `control surface`
- It should appear in search results

### OSC not in the Add list?
- Make sure you're looking in the right place
- It should be under "Control/OSC/web" > "Add..."
- If still not found, try restarting REAPER

### Port 8000 already in use?
- Change Local port to another number (e.g., 8001)
- Update the bridge script to use the new port

### Still not working?
1. Check REAPER console: **View** > **Show console**
2. Look for OSC-related messages
3. Verify port is listening: `netstat -an | grep 8000`
4. Try restarting both REAPER and DAWRV

## Alternative: Enable HTTP API

If OSC doesn't work, try HTTP API instead:

1. Same steps as above, but in **Control/OSC/web**
2. Enable **Web interface** instead of (or in addition to) OSC
3. Set port to `8080`
4. Click **OK**

The bridge script will try HTTP API first, then OSC.

## Verification Command

After enabling, test with:
```bash
netstat -an | grep 8000
```

You should see something like:
```
udp4  0  0  *.8000  *.*
```

This confirms OSC is listening on port 8000.

---

**That's it! Once OSC is enabled, REAPER will respond to all voice commands from DAWRV/RHEA.**


