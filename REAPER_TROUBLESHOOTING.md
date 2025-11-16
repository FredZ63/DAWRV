# REAPER Not Responding to Voice Commands - Troubleshooting Guide

## Current Status
- ✅ HTTP API is enabled and responding (port 8080)
- ✅ OSC port is open (port 8000)
- ⚠️ Actions are being sent but may not be executing

## Quick Checks

### 1. Is REAPER Actually Executing Actions?

**Test manually in REAPER:**
1. Open REAPER
2. Press `?` to open Action List
3. Search for "Transport: Play" (action ID 1007)
4. Click it - does REAPER play?
5. If yes, the action ID is correct
6. If no, there may be an issue with REAPER itself

### 2. Is a Project Open?

**REAPER actions may not work without a project:**
1. Create a new project: `Cmd+N`
2. Or open an existing project
3. Try voice commands again

### 3. Check REAPER Console for Errors

1. In REAPER: **View** > **Show console**
2. Look for any error messages when commands are sent
3. Common errors:
   - "Action not found"
   - "Permission denied"
   - "Project required"

### 4. Verify HTTP API is Actually Executing

The HTTP API returns 200 OK, but that doesn't guarantee execution. Try:

1. **Enable OSC instead** (sometimes more reliable):
   - REAPER > Preferences > Control/OSC/web
   - Add OSC control surface
   - Port 8000
   - Enable it

2. **Check if actions work via OSC:**
   ```bash
   python3 reaper_bridge.py 1007
   ```
   Watch REAPER - does it actually play?

### 5. Test Action IDs

Verify the action IDs are correct for your REAPER version:

- **1007** = Transport: Play
- **1016** = Transport: Stop  
- **1013** = Transport: Record

**To find action IDs:**
1. REAPER > Actions > Show action list
2. Search for the action
3. The ID is shown in the list

### 6. REAPER HTTP API Configuration

The HTTP API might need additional configuration:

1. REAPER > Preferences > Control/OSC/web
2. Enable **Web interface**
3. Check **Allow remote control**
4. Port should be **8080**
5. Click **OK**

### 7. macOS Permissions

REAPER might need accessibility permissions:

1. System Settings > Privacy & Security > Accessibility
2. Make sure REAPER is listed and enabled
3. If not, add it manually

## Alternative: Use OSC Instead

OSC is often more reliable than HTTP API:

1. **Enable OSC in REAPER:**
   - Preferences > Control/OSC/web
   - Add OSC control surface
   - Port 8000
   - Enable it

2. **The bridge script will automatically use OSC** if HTTP API fails

## Debugging Steps

1. **Check DAWRV console logs:**
   - Look for "🎯 REAPER action X sent via HTTP API"
   - Check if there are any errors

2. **Check REAPER console:**
   - View > Show console
   - Look for messages when commands are sent

3. **Test bridge script directly:**
   ```bash
   python3 reaper_bridge.py 1007
   ```
   - Does REAPER actually play?
   - Check console output for which method was used

4. **Verify REAPER is active:**
   - Make sure REAPER window is in focus
   - Try clicking on REAPER before sending commands

## Most Likely Issues

1. **No project open** - REAPER needs a project for transport actions
2. **HTTP API not fully configured** - May need "Allow remote control" enabled
3. **Action IDs wrong** - Verify in REAPER's action list
4. **REAPER not in focus** - Some actions require REAPER to be active

## Next Steps

1. Open a project in REAPER
2. Try the voice command again
3. Check REAPER console for errors
4. If still not working, try enabling OSC instead of HTTP API

