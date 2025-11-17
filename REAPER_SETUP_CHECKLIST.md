# ✅ REAPER Setup Checklist for DAWRV

Quick reference to ensure REAPER is properly configured for DAWRV voice control.

---

## 🎯 **Required Setup (3 Steps)**

### **Step 1: Enable OSC (Open Sound Control)** ⭐

OSC is required for real-time control (track muting, master volume, mixer visibility, etc.)

1. Open **REAPER**
2. Go to **Preferences** (Cmd+, or Edit → Preferences)
3. Navigate to **Control/OSC/Web**
4. Click **Add**
5. Select **OSC (Open Sound Control)**
6. Configure:
   - **Mode:** `Configure device as REAPER control`
   - **Local listen port:** `8000` ← IMPORTANT
   - **Device sends to local port:** `8001` ← IMPORTANT
   - **IP Address:** `127.0.0.1` or `localhost`
7. Click **OK**, then **OK** again

**Test OSC:**
```bash
# Should not show "Connection refused"
nc -z localhost 8000
```

---

### **Step 2: Enable Web Interface** ⭐

The Web Interface is required for triggering REAPER actions (play, stop, tempo, bars, etc.)

1. Open **REAPER**
2. Go to **Actions** (? key or Actions → Show action list)
3. Search for: `ReaperWebInterface`
4. Double-click **`Extensions: ReaperWebInterface`** to run it
5. A web server should start (default port: 8080)

**Test Web Interface:**
```bash
# Should return HTML
curl http://localhost:8080
```

**Or open in browser:**
```
http://localhost:8080
```

**Make it auto-start:**
1. **Actions** → **Show action list**
2. Search: `ReaperWebInterface`
3. Right-click the action
4. Select **Copy selected action command ID**
5. Go to **Preferences** → **General**
6. Add to **Run on startup:** (paste the command ID)

---

### **Step 3: Load DAWRV ReaScripts** ⭐

Custom Lua scripts enable advanced features (go to bar, set tempo, etc.)

1. **Locate the scripts:**
   ```
   /Users/frederickzimmerman/DAWRV-Project/daw-scripts/reaper/scripts/
   ```

2. **In REAPER:**
   - **Actions** → **Show action list**
   - Click **`ReaScript: Load...`** (at bottom)
   - Navigate to the scripts folder above
   - Load these scripts:
     ```
     ✅ dawrv_goto_bar_from_extstate.lua
     ✅ dawrv_set_tempo_from_extstate.lua
     ✅ dawrv_track_control.lua
     ```

3. **Get Action IDs:**
   After loading, find each script in the Actions list and note its Action ID:
   - Right-click script → **Copy selected action command ID**
   - You'll see something like: `_RS63db71a7516b130e5239a079e60862488250aa67`
   - DAWRV uses these IDs to trigger the scripts

**Current Action IDs (update if different):**
```javascript
dawrv_goto_bar_from_extstate.lua      → _RS59cea27ab9c1a2647112bdc02955a66e77578452
dawrv_set_tempo_from_extstate.lua     → _RS7ae10ebec27d6e3612f7ca8b4e962fd773238246
dawrv_track_control.lua                → (Auto-detected, no ID needed)
```

---

## 🔍 **Verification Checklist**

Run this in Terminal to verify everything:

```bash
cd /Users/frederickzimmerman/DAWRV-Project
./test_voice_engine.sh
```

**Expected Results:**
- ✅ Test 7: REAPER Web Interface → PASS
- ✅ Test 8: REAPER OSC → PASS

---

## 🎤 **Quick Test**

Once setup is complete:

1. **Start DAWRV:**
   ```bash
   npm start
   ```

2. **Click "Start Listening"**

3. **Say these commands:**
   - **"Play"** → Transport should start
   - **"Stop"** → Transport should stop
   - **"Show mixer"** → Mixer window should open
   - **"Set tempo to 120"** → Tempo should change
   - **"Go to bar 10"** → Playhead should move

4. **Check Developer Console** (View → Toggle Developer Tools):
   - Look for **🎤 Voice Engine Selection**
   - Should say: **Deepgram Nova-2 (Fast)**
   - Look for **🎛️** logs when using mixer commands

---

## 🚨 **Common Issues**

### **Issue: OSC not responding (port 8000)**

**Symptoms:**
- Track muting/soloing doesn't work
- Master volume doesn't change
- Mixer visibility commands fail

**Fix:**
1. Check OSC is enabled (see Step 1)
2. Verify port 8000: `nc -z localhost 8000`
3. Restart REAPER
4. Check for firewall blocking port 8000

---

### **Issue: Web Interface not responding (port 8080)**

**Symptoms:**
- Play/Stop doesn't work
- Tempo changes fail
- Bar navigation doesn't work

**Fix:**
1. Enable Web Interface (see Step 2)
2. Verify port 8080: `curl http://localhost:8080`
3. Check if another app is using port 8080:
   ```bash
   lsof -i :8080
   ```
4. Restart REAPER

---

### **Issue: Scripts not found**

**Symptoms:**
- Console shows "Action ID not found"
- "Go to bar" or "Set tempo" commands fail

**Fix:**
1. Load scripts (see Step 3)
2. Get correct Action IDs
3. Update DAWRV code if IDs changed:
   - Edit `src/main/main.js`
   - Update the Action ID constants

---

## 📊 **Port Summary**

| Port | Service | Purpose | Test Command |
|------|---------|---------|--------------|
| 8000 | OSC Listen | Real-time control | `nc -z localhost 8000` |
| 8001 | OSC Send | Feedback from REAPER | (Auto-used) |
| 8080 | Web Interface | Action execution | `curl http://localhost:8080` |

---

## 🔧 **Advanced: Auto-Start OSC**

OSC should start automatically with REAPER, but if not:

1. **Preferences** → **Control/OSC/Web**
2. Make sure **"Enable"** is checked for your OSC device
3. Restart REAPER

---

## 📚 **Documentation References**

- **OSC Protocol:** [REAPER OSC Guide](https://www.reaper.fm/sdk/osc/osc.php)
- **Web Interface:** Check ReaperWebInterface extension docs
- **ReaScripts:** [REAPER API Documentation](https://www.reaper.fm/sdk/reascript/reascript.php)

---

## ✅ **Final Verification**

After completing all steps, run:

```bash
cd /Users/frederickzimmerman/DAWRV-Project
./test_voice_engine.sh
```

**All tests should PASS except:**
- Test 6: Microphone permission (WARN is OK - will be granted when DAWRV starts)
- Test 10: Voice listener dry-run (May fail due to timeout command)

---

## 🎉 **You're Ready!**

Once all 3 steps are complete:
1. ✅ OSC enabled (port 8000)
2. ✅ Web Interface running (port 8080)
3. ✅ Scripts loaded

**You can now use DAWRV voice control!** 🎤✨

Say: **"Play"**, **"Stop"**, **"Show mixer"**, **"Set tempo to 120"**, **"Go to bar 10"**

---

**Last Updated:** November 17, 2025  
**DAWRV Version:** 1.0.0  
**REAPER Compatibility:** 6.x and 7.x

