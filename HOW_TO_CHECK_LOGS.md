# How to Check DAWRV Logs

There are **two places** where logs appear in DAWRV:

## 1. Main Process Logs (Terminal)

The **main process** logs appear in the **terminal** where you started DAWRV.

### To see main process logs:

1. **If DAWRV is running:**
   - Look at the terminal window where you ran `npm start`
   - All the `📡`, `🔌`, `🚀` logs appear here

2. **If you need to restart and see logs:**
   ```bash
   cd /Users/frederickzimmerman/DAWRV-Project
   npm start
   ```
   - The terminal will show all main process logs
   - Look for messages like:
     - `🚀 App ready - setting up IPC...`
     - `📡 Setting up IPC handlers...`
     - `🔌 Registering plugin IPC handlers...`
     - `✅ Plugin IPC handlers registered...`

## 2. Renderer Process Logs (DevTools Console)

The **renderer process** logs appear in the **browser DevTools console**.

### To see renderer process logs:

1. **Open DevTools:**
   - **Method 1:** Press `Cmd + Option + I` (Mac) or `Ctrl + Shift + I` (Windows/Linux)
   - **Method 2:** Right-click in the DAWRV window → Select "Inspect" or "Inspect Element"
   - **Method 3:** The DevTools might already be open (check if there's a console panel)

2. **Check the Console tab:**
   - Click on the "Console" tab in DevTools
   - Look for messages like:
     - `🔌 Attempting to initialize plugin discovery...`
     - `Plugin Discovery initialization failed: ...`
     - Any error messages

## What to Look For

### ✅ Good Signs (Handlers are registered):
```
🚀 App ready - setting up IPC...
📡 Setting up IPC handlers...
🔌 Registering plugin IPC handlers directly in setupIPC()...
✅ Plugin IPC handlers registered directly in setupIPC()...
✅ All IPC handlers setup complete
🚀 IPC setup complete - creating window...
```

### ❌ Bad Signs (Handlers NOT registered):
```
Plugin Discovery initialization failed: Error: No handler registered for 'plugin-initialize'
```

## Quick Check

1. **Terminal (Main Process):**
   - Run: `npm start`
   - Look for `🔌 Registering plugin IPC handlers...` message
   - If you see `✅ Plugin IPC handlers registered...` → Handlers are registered!

2. **DevTools Console (Renderer Process):**
   - Open DevTools (`Cmd + Option + I`)
   - Check Console tab
   - Look for plugin-related errors

## If You Don't See the Logs

- **Terminal logs not showing?** Make sure you're looking at the terminal where `npm start` was run
- **DevTools not opening?** Try `Cmd + Option + I` or check if DevTools is already open in a separate window
- **No logs at all?** The app might not be running - restart with `npm start`

## Screenshot Locations

- **Terminal:** Where you see `npm start` output
- **DevTools:** Usually opens as a panel at the bottom or side of the DAWRV window

