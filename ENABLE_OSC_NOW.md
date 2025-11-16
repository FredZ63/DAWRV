# ⚠️ CRITICAL: Enable OSC in REAPER for Voice Commands

## Current Problem
- ✅ HTTP API is enabled (port 8080) but **not executing actions**
- ❌ OSC is **NOT enabled** (port 8000 not listening)
- **Result:** Commands are sent but REAPER doesn't respond

## Solution: Enable OSC (Takes 2 minutes)

### Step-by-Step Instructions

1. **Open REAPER Preferences**
   - Press `Cmd+,` (Command + Comma)
   - OR: REAPER menu > Preferences

2. **Find Control/OSC/web**
   - In the left sidebar, look for **Control/OSC/web**
   - If you don't see it, use the **Search** box at the top and type: `OSC`

3. **Add OSC Control Surface**
   - Click on **Control/OSC/web**
   - Click the **Add...** button
   - In the dialog, scroll and select **OSC (Open Sound Control)**
   - Click **OK**

4. **Configure OSC**
   - **Enable** checkbox - Make sure it's CHECKED ✓
   - **Local port** - Set to `8000` (default)
   - **Mode** - Leave as default or set to "Server"
   - Click **OK** to save

5. **Verify OSC is Enabled**
   - You should see **OSC** in the Control/OSC/web list
   - There should be a checkmark or "Enabled" indicator
   - Click **OK** to close Preferences

6. **Test**
   - Restart DAWRV (if running)
   - Click "Start Listening"
   - Say "play" or "stop"
   - **REAPER should now respond!**

## Why OSC Instead of HTTP API?

The HTTP API returns 200 OK but may not actually execute actions due to:
- Security settings
- Configuration issues
- REAPER version differences

**OSC is more reliable** and is the recommended method for external control.

## Verification

After enabling OSC, verify it's working:

```bash
netstat -an | grep 8000
```

You should see:
```
udp4  0  0  *.8000  *.*
```

## Still Not Working?

1. **Check REAPER Console**
   - View > Show console
   - Look for OSC-related messages

2. **Verify Port**
   - Make sure port 8000 is set in OSC settings
   - Try a different port if 8000 is in use

3. **Restart Both**
   - Restart REAPER
   - Restart DAWRV

4. **Test Bridge Script**
   ```bash
   python3 reaper_bridge.py 1007
   ```
   - Check console output
   - Should say "sent via OSC"
   - REAPER should play

---

**Once OSC is enabled, all voice commands will work!**

