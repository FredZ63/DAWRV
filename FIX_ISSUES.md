# 🔧 Fixing DAWRV Voice Issues

## 🚨 **Current Issues**

1. ❌ **"Show mixer" acknowledged but doesn't execute** → OSC not active
2. ⏱️ **Slow response on commands** → Processing delays
3. 🔁 **RHEA repeating herself** → Feedback loop

---

## 🎯 **Issue 1: "Show Mixer" Not Working**

### **Root Cause:**
OSC (Open Sound Control) on port 8000 is **NOT active**.

Test results:
```
✅ Web Interface (port 8080) - Working
❌ OSC (port 8000) - NOT responding
```

### **Fix: Activate REAPER OSC**

#### **Step 1: In REAPER Preferences**
You showed me the OSC is configured, but you need to **click OK** to activate it:

1. Make sure the OSC device is selected (blue highlight)
2. Click **OK** button (bottom right)
3. REAPER should activate the OSC listener

#### **Step 2: Verify It's Enabled**
After clicking OK, go back to Preferences:
1. **Preferences** → **Control/OSC/Web**
2. Look for your OSC device
3. Make sure there's a **checkmark** or it says **"Enabled"**

#### **Step 3: Check for Conflicts**
If port 8000 still doesn't work, another app might be using it:

```bash
# Check what's using port 8000
lsof -i :8000
```

If something else is using it, either:
- Close that app, OR
- Change REAPER OSC to use port 9000 (then update DAWRV code)

#### **Step 4: Restart REAPER**
Sometimes OSC needs a full restart:
1. Quit REAPER (Cmd+Q)
2. Reopen REAPER
3. Test: `nc -z localhost 8000`

### **Verify Fix:**
```bash
nc -z localhost 8000 && echo "✅ OSC Working!"
```

**When OSC is working, "show mixer" will execute!**

---

## 🎯 **Issue 2: Slow Response**

### **Root Cause:**
Multiple factors causing delays:
1. Whisper processing time (~500-1000ms)
2. Command processing pipeline
3. Deduplication checks

### **Solutions:**

#### **Solution A: Use Deepgram (Faster)**
You have Deepgram configured but might not be using it.

**Check which engine is active:**
1. Start DAWRV
2. Open Developer Tools (View → Toggle Developer Tools)
3. Look for: `🎤 Voice Engine Selection:`
4. Should say: `Deepgram Nova-2 (Fast)`

**If it says Whisper:**
- Your Deepgram API key might not be loaded
- Restart Terminal and DAWRV to reload environment variables

#### **Solution B: Reduce Processing Overhead**
The command pipeline has multiple checks. This is necessary for accuracy but adds ~100-200ms.

**Current pipeline:**
```
Voice Input → Transcription (300-1000ms)
            → Deduplication Check (10ms)
            → AI Processing (200-500ms if enabled)
            → Keyword Matching (50ms)
            → REAPER Execution (50-100ms)
            → Response Speech (200-500ms)
Total: 810-2360ms
```

**Optimization:**
- Disable AI for faster response (settings)
- Use Deepgram instead of Whisper (-500ms)

---

## 🎯 **Issue 3: RHEA Repeating Herself**

### **Root Cause:**
Feedback loop: RHEA's speech is being picked up by the microphone and re-interpreted as a command.

### **Current Protections:**
```javascript
✅ Speech cooldown: 2 seconds after speaking
✅ isSpeaking flag: Ignores commands while speaking
✅ Response phrase matching: Filters RHEA's phrases
✅ Ambient noise filter: Filters short sounds
```

### **Fix: Increase Cooldown**

I'll increase the cooldown from 2 seconds to 3 seconds:

```javascript
// Before
this.speechCooldown = 2000; // 2 seconds

// After  
this.speechCooldown = 3000; // 3 seconds
```

### **Additional Fixes:**

#### **1. Lower Microphone Sensitivity**
If your mic is too sensitive:
1. Click **🎧 Audio** button
2. Adjust **Microphone Sensitivity** slider
3. Move it **higher** (less sensitive)
4. Test

#### **2. Use Push-to-Talk** (Future Feature)
Instead of always listening, hold a key to speak.
(Not yet implemented)

#### **3. Mute RHEA's Voice Output**
If RHEA's voice is too loud:
1. Lower system volume
2. Or use headphones (so mic doesn't pick up speakers)

---

## 🧪 **Testing Each Fix**

### **Test 1: OSC ("Show Mixer")**
```bash
# Terminal test
nc -z localhost 8000 && echo "✅ OSC Working!"

# Voice test
1. Start DAWRV
2. Click "Start Listening"
3. Say: "Show mixer"
4. Expected: Mixer window opens in REAPER
```

### **Test 2: Response Speed**
```bash
# Check which engine is active
1. Start DAWRV
2. Open Developer Tools (Console tab)
3. Look for: "Selected engine: Deepgram Nova-2 (Fast)"

# Voice test
1. Say: "Stop"
2. Expected: Stops within 0.5-1 second
```

### **Test 3: No Repeating**
```bash
# Voice test
1. Say: "Play"
2. RHEA responds: "Starting playback"
3. Wait 5 seconds in silence
4. Expected: RHEA doesn't randomly execute commands
```

---

## 📊 **Diagnostic Commands**

### **Check REAPER Connections:**
```bash
echo "OSC (8000):" && nc -z localhost 8000 && echo "✅" || echo "❌"
echo "Web (8080):" && curl -s --max-time 2 http://localhost:8080 > /dev/null && echo "✅" || echo "❌"
```

### **Check Voice Engine:**
```bash
echo $DEEPGRAM_API_KEY | head -c 10
```
Should show first 10 chars of your API key.

### **Full System Test:**
```bash
cd /Users/frederickzimmerman/DAWRV-Project
./test_voice_engine.sh
```

---

## 🎯 **Priority Order**

### **1. Fix OSC First** (Critical)
Without OSC, mixer/track commands won't work at all.

**Do this now:**
1. Open REAPER Preferences
2. Control/OSC/Web
3. Select OSC device
4. Click OK
5. Test: `nc -z localhost 8000`

### **2. Verify Voice Engine** (Important)
Make sure Deepgram is active for faster response.

**Check in console:**
Look for "Deepgram Nova-2 (Fast)"

### **3. Increase Feedback Cooldown** (Nice to have)
I'll push a fix that increases cooldown to 3 seconds.

---

## ✅ **Success Indicators**

You'll know everything is working when:

1. **✅ OSC Test Passes:**
   ```bash
   nc -z localhost 8000
   # Returns: 0 (success)
   ```

2. **✅ "Show Mixer" Works:**
   - Say: "Show mixer"
   - Mixer window opens in REAPER

3. **✅ Fast Response:**
   - Say: "Stop"
   - Responds within 0.5-1 second

4. **✅ No Repeating:**
   - RHEA speaks once
   - No random commands after silence

---

## 🆘 **If Still Not Working**

### **OSC Still Not Active:**
1. Check REAPER version (should be 6.x or 7.x)
2. Try port 9000 instead of 8000
3. Check macOS firewall settings
4. Restart REAPER completely

### **Still Slow:**
1. Disable AI in settings
2. Check internet speed (for Deepgram)
3. Close other apps to free up CPU

### **Still Repeating:**
1. Lower system volume
2. Use headphones
3. Increase mic sensitivity slider (in Audio Settings)
4. Move mic further from speakers

---

**Next: Let me push the cooldown increase fix, then you enable OSC!** 🚀

