# 🎤 DAWRV Voice Commands Troubleshooting Guide

## ❌ Problem: DAWRV Not Responding to Voice Commands

---

## 🔍 Diagnostic Checklist

### **Step 1: Check if DAWRV is Running**
```bash
ps aux | grep -i "electron" | grep -i "dawrv" | grep -v grep
```
- ✅ **If you see output**: DAWRV is running
- ❌ **If no output**: Start DAWRV with `npm start`

### **Step 2: Check if Voice Listener is Running**
```bash
ps aux | grep -i "rhea_voice_listener" | grep -v grep
```
- ✅ **If you see output**: Voice listener is active
- ❌ **If no output**: Voice listener failed to start (see fixes below)

### **Step 3: Check Voice Command File**
```bash
ls -la /tmp/dawrv_voice_command.txt
cat /tmp/dawrv_voice_command.txt
```
- ✅ **If file exists**: Voice detection is working
- ❌ **If "No such file"**: Voice listener never started

### **Step 4: Check Developer Console**
1. Open DAWRV
2. Press **Cmd+Option+I** (macOS) or **View → Toggle Developer Tools**
3. Look for error messages in the **Console** tab

---

## 🔧 Common Fixes

### **Fix 1: Microphone Permission Not Granted**

**Symptoms:**
- Voice listener starts but crashes immediately
- Error: "Microphone access denied"

**Solution:**
```bash
# 1. Open System Settings
open "x-apple.systemsettings:com.apple.preference.security?Privacy_Microphone"

# 2. Grant microphone access to "Electron"
# 3. Restart DAWRV
```

**Manual Steps:**
1. Open **System Settings** → **Privacy & Security** → **Microphone**
2. Find **"Electron"** in the list
3. ✅ Enable the checkbox
4. Quit DAWRV completely (Cmd+Q)
5. Restart: `npm start`

---

### **Fix 2: Python Dependencies Missing**

**Symptoms:**
- Voice listener won't start
- Error: "ModuleNotFoundError: No module named 'pyaudio'" or "whisper"

**Solution:**
```bash
# Install dependencies manually
pip3 install pyaudio sounddevice numpy scipy --break-system-packages

# For Whisper (offline engine)
pip3 install openai-whisper --break-system-packages

# For Deepgram (online engine - optional)
pip3 install deepgram-sdk --break-system-packages
```

---

### **Fix 3: Deepgram API Key Not Set (If Using Deepgram)**

**Symptoms:**
- Console shows: "DEEPGRAM_API_KEY not set, falling back to Whisper"
- Slower response times

**Solution:**
```bash
# Check if key is set
echo $DEEPGRAM_API_KEY

# If empty, set it
export DEEPGRAM_API_KEY="your_key_here"

# Make it permanent (add to ~/.zshrc or ~/.bashrc)
echo 'export DEEPGRAM_API_KEY="your_key_here"' >> ~/.zshrc
source ~/.zshrc

# Restart DAWRV
```

**Get a Free Deepgram API Key:**
- Sign up: https://console.deepgram.com/signup
- $200 in free credits (46,500 minutes!)

---

### **Fix 4: Multiple DAWRV Instances Running**

**Symptoms:**
- Voice commands intermittent
- Multiple Electron processes shown in Activity Monitor

**Solution:**
```bash
# Kill all DAWRV/Electron processes
pkill -f "electron.*dawrv" -i

# Wait 2 seconds
sleep 2

# Start fresh
cd /Users/frederickzimmerman/DAWRV-Project
npm start
```

---

### **Fix 5: Voice Listener Crashed**

**Symptoms:**
- DAWRV is running but voice doesn't work
- No `rhea_voice_listener` process

**Solution:**
```bash
# 1. Check the logs in Developer Console (Cmd+Option+I)
# 2. Look for Python errors
# 3. Restart DAWRV completely

# Quick restart:
pkill -f "electron.*dawrv" -i
sleep 2
cd /Users/frederickzimmerman/DAWRV-Project
npm start
```

---

### **Fix 6: Audio Device Issues**

**Symptoms:**
- Voice listener starts but never hears you
- Error: "No default input device"

**Solution:**
```bash
# 1. Check available audio devices
system_profiler SPAudioDataType

# 2. Ensure a microphone is connected and working
# 3. Test in System Settings → Sound → Input
# 4. Set the correct device as default
# 5. Restart DAWRV
```

---

## 🎙️ Test Voice Recognition Manually

Run the voice listener directly to see errors:

### **Test Whisper (Offline)**
```bash
cd /Users/frederickzimmerman/DAWRV-Project
python3 rhea_voice_listener_whisper.py
```

- Say something (e.g., "play")
- Check if transcript appears
- Press **Ctrl+C** to stop

### **Test Deepgram (Online)**
```bash
cd /Users/frederickzimmerman/DAWRV-Project
export DEEPGRAM_API_KEY="your_key_here"
python3 rhea_voice_listener_deepgram.py
```

- Say something
- Check if transcript appears instantly (200-500ms)
- Press **Ctrl+C** to stop

---

## 🔍 Debug Mode

### **Enable Verbose Logging**
1. Open DAWRV Developer Console (Cmd+Option+I)
2. Run in console:
```javascript
localStorage.setItem('dawrv_debug', 'true');
location.reload();
```
3. Try voice commands
4. Check console for detailed logs

### **Check Main Process Logs**
```bash
# If started from terminal, logs appear in the terminal
# Look for:
# ✅ "Voice listener started"
# ✅ "Voice engine ready"
# ❌ "Voice listener error"
```

---

## 📋 Quick Checklist

Before asking for help, verify:

- [ ] DAWRV is running (`ps aux | grep electron | grep dawrv`)
- [ ] Microphone permission granted (System Settings → Privacy → Microphone → Electron)
- [ ] Python dependencies installed (`pip3 list | grep -E "pyaudio|whisper|deepgram"`)
- [ ] Only ONE DAWRV instance running (not 2+)
- [ ] Microphone is working (test in System Settings → Sound)
- [ ] Developer Console shows no critical errors (Cmd+Option+I)
- [ ] Voice listener process is running (`ps aux | grep rhea_voice_listener`)
- [ ] Command file exists (`ls /tmp/dawrv_voice_command.txt`)

---

## 🚨 Emergency Reset

If all else fails:

```bash
# 1. Kill everything
pkill -f "electron" -i
pkill -f "rhea_voice_listener" -i
pkill -f "python.*dawrv" -i

# 2. Clean up temp files
rm -f /tmp/dawrv_*

# 3. Reinstall dependencies
cd /Users/frederickzimmerman/DAWRV-Project
npm install
pip3 install --upgrade pyaudio sounddevice numpy scipy openai-whisper deepgram-sdk --break-system-packages

# 4. Fresh start
npm start
```

---

## 💡 Still Not Working?

### Check These Files:
1. **Main Process Log**: Check terminal where you ran `npm start`
2. **Renderer Console**: Cmd+Option+I in DAWRV window
3. **Voice Listener Script**: `/Users/frederickzimmerman/DAWRV-Project/rhea_voice_listener_whisper.py`

### Common Error Messages:

| Error | Fix |
|-------|-----|
| "Microphone access denied" | Grant permission in System Settings |
| "ModuleNotFoundError: pyaudio" | `pip3 install pyaudio --break-system-packages` |
| "DEEPGRAM_API_KEY not set" | Set env var or use Whisper (automatic) |
| "No default input device" | Connect/enable microphone |
| "Voice listener not started" | Check main.js logs for errors |

---

## 🎤 Expected Behavior When Working:

1. **Start DAWRV**: `npm start`
2. **Console Shows**:
   ```
   🎤 Voice Engine Selection:
      Deepgram API Key set: true/false
      Selected engine: Deepgram Nova-2 / Whisper Large
   ✅ Voice listener started
   ✅ Voice engine ready
   ```
3. **Say "Play"**:
   ```
   ✅ Heard: "play"
   🎵 Command: play
   🎯 Action: Starting playback
   ✔️  Success
   ```
4. **RHEA Speaks**: "Starting playback"

---

**Last Updated:** November 17, 2025  
**For More Help:** Check README.md or open an issue on GitHub


