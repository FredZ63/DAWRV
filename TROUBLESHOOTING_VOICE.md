# 🎤 Voice Command Troubleshooting Guide

If DAWRV is not responding to your voice commands, follow these steps:

---

## ✅ **Quick Fix Checklist**

### **1. Click "Start Listening" Button** ⭐ MOST COMMON ISSUE
**The voice listener does NOT start automatically!**

Look for the **big "Start Listening"** button in the RHEA panel (left side of the screen) and **click it**.

The button should:
- Change to **"Stop Listening"** with a red background
- Show a pulsing animation
- Display "Listening..." status

---

### **2. Check Microphone Permissions** 🎙️

**macOS:**
1. Go to **System Settings → Privacy & Security → Microphone**
2. Look for **"Electron"** or **"DAWRV"** in the list
3. Make sure the checkbox is **enabled** (checked)
4. If not listed, quit DAWRV and restart it (it will prompt for permission)

**Verify in DAWRV:**
- If permission is denied, you'll see an error message in the status area
- The voice button may be disabled or show an error

---

### **3. Check Voice Engine Status** 🔊

Look at the **Voice Engine Status** area (below RHEA's avatar):
- ✅ **"Ready - Click to start listening"** = Engine loaded successfully
- ✅ **"Listening..."** = Voice listener is active
- ❌ **"Deepgram error..."** = Deepgram issue (will fallback to Whisper)
- ❌ **"Microphone access denied"** = Permission issue (see step 2)
- ❌ **"Voice listener script not found"** = Installation issue

---

### **4. Test Your Microphone** 🎤

**Quick Test:**
1. Click **"Start Listening"**
2. Say a simple command like **"Play"** or **"Stop"**
3. Watch the status area for transcription feedback

**macOS System Test:**
1. Open **System Settings → Sound → Input**
2. Speak into your microphone
3. Watch the **Input Level** bars move
4. If bars don't move, select a different input device

---

### **5. Check Voice Engine Selection** 🤖

DAWRV supports two voice engines:

| Engine | Speed | Accuracy | Internet |
|--------|-------|----------|----------|
| **Deepgram Nova-2** | 0.2-0.5s | 95-99% | Required |
| **Whisper** (Local) | 0.5-1s | 85-95% | Not Required |

**Check which engine is active:**
1. Open **Developer Tools** (View → Toggle Developer Tools)
2. Look for this in the Console:
   ```
   🎤 Voice Engine Selection:
      Deepgram API Key set: true/false
      Selected engine: Deepgram Nova-2 (Fast) or Whisper Large (Offline)
   ```

**To use Deepgram (recommended):**
- Set `DEEPGRAM_API_KEY` environment variable
- See [DEEPGRAM_SETUP.md](DEEPGRAM_SETUP.md) for instructions
- Get free $200 credits: https://console.deepgram.com/signup

**To use Whisper (automatic fallback):**
- No setup needed
- Works offline
- Slightly slower and less accurate

---

## 🔍 **Advanced Troubleshooting**

### **Check if Voice Listener is Running**

**Terminal:**
```bash
ps aux | grep rhea_voice_listener
```

**Expected Output:**
- You should see a Python process running `rhea_voice_listener_deepgram.py` or `rhea_voice_listener_whisper.py`
- If nothing appears, the listener didn't start

---

### **Check Voice Command File**

**Terminal:**
```bash
ls -la /tmp/dawrv_voice_command.txt
```

**Expected:**
- File should exist once you start listening
- File gets updated with transcribed commands
- If missing, voice listener failed to start

---

### **View Console Logs**

1. Open **Developer Tools** (View → Toggle Developer Tools)
2. Click **Console** tab
3. Look for voice-related messages:
   - 🎤 = Voice engine messages
   - ✅ = Success messages
   - ❌ = Error messages

**Common Error Messages:**

| Error | Solution |
|-------|----------|
| "Microphone permission not granted" | Grant permission in System Settings |
| "Deepgram API key not set" | Set environment variable or use Whisper |
| "Voice listener script not found" | Reinstall DAWRV (`npm install`) |
| "PyAudio not found" | Install PyAudio: `pip3 install pyaudio` |
| "Whisper not found" | Install Whisper: `pip3 install openai-whisper` |

---

### **Check REAPER Connection**

Even if DAWRV hears you, it won't control REAPER unless it's connected:

**Verify REAPER Setup:**
1. **OSC is enabled** (Preferences → Control/OSC/Web → Add → OSC)
   - Listen port: **8000**
   - Send port: **8001**
   - Mode: **Configure device as REAPER control**
2. **Web Interface is running** (Actions → ReaperWebInterface)
   - Port: **8080**
   - Check browser: http://localhost:8080
3. **Scripts are loaded** (Scripts in `daw-scripts/reaper/scripts/` folder)

---

## 🛠️ **Common Issues & Fixes**

### **Issue: Button doesn't respond when clicked**
**Fix:**
1. Check Developer Console for errors
2. Try clicking the quick command buttons (Play, Stop) to verify UI is working
3. Restart DAWRV

---

### **Issue: RHEA hears me but doesn't execute commands**
**Fix:**
1. REAPER connection issue - verify OSC/Web Interface setup
2. Check REAPER is running
3. Try a simple command first: "Play" or "Stop"

---

### **Issue: Commands are delayed or slow**
**Fix:**
1. If using Whisper:
   - Processing takes 0.5-1 second (normal)
   - Upgrade to Deepgram for 200-500ms response
2. If using Deepgram:
   - Check internet connection
   - Look for "Rate limit" messages (you may have hit API limits)

---

### **Issue: Voice recognition is inaccurate**
**Fix:**
1. **Improve microphone quality:**
   - Use a dedicated USB microphone
   - Reduce background noise
   - Speak clearly, not too fast
2. **Upgrade to Deepgram** (95-99% accuracy)
3. **Adjust microphone sensitivity** (Audio Settings button)
4. **Train the system:**
   - Use consistent phrasing
   - Speak naturally, not robotic
   - Avoid mumbling

---

### **Issue: RHEA mishears commands**
**Examples:**
- "Go to bar 10" → "Go to Barton"
- "Thank you" → "Unmute track"

**Fix:**
1. **Upgrade to Deepgram** (much better accuracy)
2. **Speak more clearly:**
   - Pause slightly between words
   - Emphasize important words ("GO to BAR 10")
3. **Use alternative phrasing:**
   - Instead of "bar 10", try "measure 10"
   - Instead of "thank you", try "thanks RHEA"

---

## 🔄 **Restart Voice Listener**

If the voice listener gets stuck:

1. Click **"Stop Listening"** in DAWRV
2. Wait 2-3 seconds
3. Click **"Start Listening"** again
4. If still not working, quit DAWRV (Cmd+Q) and restart

---

## 🧪 **Test Commands**

Try these simple commands to verify everything is working:

| Command | Expected Result |
|---------|-----------------|
| "Play" | REAPER starts playback |
| "Stop" | REAPER stops playback |
| "Set tempo to 120" | REAPER tempo changes to 120 BPM |
| "Show mixer" | REAPER mixer window opens |
| "Thank you" | RHEA responds conversationally |

---

## 📝 **Enable Debug Logging**

For detailed troubleshooting:

1. Open **Developer Tools** (View → Toggle Developer Tools)
2. Click **Console** tab
3. Type: `localStorage.setItem('debug', 'true')`
4. Restart DAWRV
5. All voice activity will be logged in detail

**To disable:**
```javascript
localStorage.removeItem('debug')
```

---

## 🆘 **Still Not Working?**

### **Reinstall Dependencies:**
```bash
cd /Users/frederickzimmerman/DAWRV-Project
npm install
pip3 install pyaudio openai-whisper --break-system-packages
```

### **Check for Updates:**
```bash
git pull origin main
npm install
```

### **Contact Support:**
- GitHub Issues: https://github.com/FredZ63/DAWRV/issues
- Include:
  - macOS version
  - REAPER version
  - DAWRV version
  - Console logs (copy from Developer Tools)
  - Steps to reproduce

---

## ✅ **Success Indicators**

When everything is working correctly, you'll see:

1. ✅ "Start Listening" button turns red and says "Stop Listening"
2. ✅ Status shows "Listening..." with animated visualizer
3. ✅ Spoken commands appear in the command log
4. ✅ RHEA responds verbally to your commands
5. ✅ REAPER executes the requested actions

---

**Last Updated:** November 17, 2025  
**DAWRV Version:** 1.0.0

