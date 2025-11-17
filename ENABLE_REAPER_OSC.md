# 🎛️ Enable REAPER OSC - Visual Guide

## 📍 **You Are Here**
OSC is currently **NOT** responding on port 8000. Follow these steps to enable it.

---

## 🎯 **What You'll See**

### **Step 1: Open Preferences**
Press **Cmd+,** (Command + Comma) in REAPER

You'll see a window like this:
```
┌─────────────────────────────────────────┐
│ REAPER Preferences                      │
├─────────────────────────────────────────┤
│ ┌─────────────┐  ┌──────────────────┐  │
│ │ General     │  │                  │  │
│ │ Project     │  │                  │  │
│ │ Audio       │  │                  │  │
│ │ MIDI        │  │                  │  │
│ │ Video       │  │                  │  │
│ │→Control/OSC/│  │                  │  │ ← CLICK HERE
│ │  Web        │  │                  │  │
│ │ Appearance  │  │                  │  │
│ └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────┘
```

---

### **Step 2: You're in Control/OSC/Web**
You should see something like:
```
┌──────────────────────────────────────────────────┐
│ Control/OSC/Web                                   │
├──────────────────────────────────────────────────┤
│ Control surface devices:                          │
│ ┌──────────────────────────────────────────────┐ │
│ │ (empty or existing devices listed here)     │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                   │
│ [Add]  [Edit]  [Delete]                          │ ← CLICK "Add"
└──────────────────────────────────────────────────┘
```

---

### **Step 3: Add New Device**
Click **"Add"** button, you'll see a dropdown:
```
┌────────────────────────────┐
│ Select control surface:    │
├────────────────────────────┤
│ Mackie Control             │
│ Frontier Tranzport         │
│ Generic MIDI               │
│ → OSC (Open Sound Control) │ ← SELECT THIS!
│ Web Interface              │
└────────────────────────────┘
```

**Select: "OSC (Open Sound Control)"**

---

### **Step 4: Configure OSC Device**
A new window appears. Fill it out EXACTLY like this:

```
┌─────────────────────────────────────────────────┐
│ Control surface settings                         │
├─────────────────────────────────────────────────┤
│ Mode:                                            │
│ ┌──────────────────────────────────────────────┐│
│ │ Configure device as REAPER control           ││ ← SELECT THIS
│ └──────────────────────────────────────────────┘│
│                                                  │
│ Pattern file:                                    │
│ ┌──────────────────────────────────────────────┐│
│ │ <Default.ReaperOSC>                          ││ ← DEFAULT
│ └──────────────────────────────────────────────┘│
│                                                  │
│ Local listen port:                               │
│ ┌──────────────────────────────────────────────┐│
│ │ 8000                                         ││ ← TYPE: 8000
│ └──────────────────────────────────────────────┘│
│                                                  │
│ Device sends to local port:                      │
│ ┌──────────────────────────────────────────────┐│
│ │ 8001                                         ││ ← TYPE: 8001
│ └──────────────────────────────────────────────┘│
│                                                  │
│ Device IP:                                       │
│ ┌──────────────────────────────────────────────┐│
│ │ 127.0.0.1                                    ││ ← DEFAULT
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ☑ Enable                                        │ ← MUST BE CHECKED!
│                                                  │
│              [OK]          [Cancel]              │
└─────────────────────────────────────────────────┘
```

**CRITICAL:**
- ✅ **Local listen port: 8000** (not 8080, not 9000, exactly **8000**)
- ✅ **Device sends to port: 8001**
- ✅ **Enable checkbox is CHECKED**

---

### **Step 5: Save Everything**
1. Click **OK** in the OSC settings window
2. Click **OK** in the Preferences window
3. You should now see your OSC device listed

---

## 🔍 **Verify It's Working**

### **Method 1: In Terminal**
```bash
cd /Users/frederickzimmerman/DAWRV-Project
nc -z localhost 8000 && echo "✅ OSC is working!" || echo "❌ Still not working"
```

### **Method 2: Run Full Test**
```bash
./test_voice_engine.sh
```
Look for **Test 8: REAPER OSC** → Should say **✅ PASS**

---

## 🚨 **Troubleshooting**

### **Problem: Port 8000 still not responding**

**Try these in order:**

#### **1. Check if OSC device is enabled**
- Preferences → Control/OSC/Web
- Look for your OSC device in the list
- Make sure **Enable** checkbox is **checked** ✅

#### **2. Restart REAPER**
- Quit REAPER completely (Cmd+Q)
- Reopen REAPER
- Test again: `nc -z localhost 8000`

#### **3. Check if another app is using port 8000**
```bash
lsof -i :8000
```
If something else is using it, either:
- Close that app
- Or change REAPER OSC to use port 9000 (and update DAWRV code)

#### **4. Check firewall**
macOS Firewall might be blocking port 8000:
- **System Settings → Network → Firewall**
- Make sure REAPER is allowed

#### **5. Verify the port number**
Double-check in REAPER:
- Preferences → Control/OSC/Web
- Select your OSC device → Edit
- Confirm **Local listen port: 8000**

---

## 📸 **What Success Looks Like**

When it's working, you should see:

**In REAPER Preferences:**
```
Control surface devices:
┌────────────────────────────────────┐
│ ✓ OSC (Open Sound Control)        │ ← Green checkmark
│   Listen: 127.0.0.1:8000           │
│   Send: 127.0.0.1:8001             │
└────────────────────────────────────┘
```

**In Terminal:**
```bash
$ nc -z localhost 8000
$ echo $?
0  ← This means success!
```

**In DAWRV:**
When you say "show mixer", the console will show:
```
🎛️ Calling executeReaperAction with ID: 40078
🎛️ Result: { success: true }
```
And the mixer window will open! 🎉

---

## 🎯 **After OSC is Working**

Once Test 8 passes, these commands will work:

| Command | What It Does |
|---------|-------------|
| **"Show mixer"** | Opens mixer window |
| **"Mute track 1"** | Mutes track 1 |
| **"Solo track 2"** | Solos track 2 |
| **"Master volume up"** | Increases master by 1dB |
| **"Mute all"** | Mutes all tracks |
| **"Unmute all"** | Unmutes all tracks |

---

## 💡 **Quick Visual Checklist**

Before clicking OK, verify:

```
Mode: "Configure device as REAPER control"     ✓
Pattern file: <Default.ReaperOSC>              ✓
Local listen port: 8000                        ✓  ← MOST IMPORTANT!
Device sends to local port: 8001               ✓
Device IP: 127.0.0.1                           ✓
☑ Enable                                       ✓  ← MUST BE CHECKED!
```

---

## 🆘 **Still Having Issues?**

If OSC still won't work after trying everything above:

1. **Check REAPER version:**
   ```
   Help → About REAPER
   ```
   OSC should work in REAPER 6.x and 7.x

2. **Try a different port:**
   - Use port **9000** instead of 8000
   - Update DAWRV: Edit `src/main/main.js`
   - Search for `8000` and change to `9000`

3. **Check REAPER console:**
   - Actions → Show REAPER console
   - Look for OSC-related errors

4. **Test with oscsend (if installed):**
   ```bash
   oscsend localhost 8000 /play
   ```
   If REAPER starts playing, OSC is working!

---

## ✅ **Success Indicator**

You'll know it's working when:

1. `nc -z localhost 8000` returns **0** (success)
2. Test 8 shows **✅ PASS**
3. Saying "show mixer" opens the mixer window in REAPER
4. Console shows: `🎛️ Result: { success: true }`

---

**Once OSC is enabled, come back and run:**
```bash
./test_voice_engine.sh
```

**And start DAWRV:**
```bash
npm start
```

**Then test with: "Show mixer"** 🎤

---

**Good luck! OSC setup should take 2-3 minutes.** ⏱️✨
