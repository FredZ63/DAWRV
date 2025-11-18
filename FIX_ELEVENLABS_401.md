# 🔧 FIX ELEVENLABS 401 ERROR - COMPLETE GUIDE

**Date**: November 17, 2025  
**Error**: `ElevenLabs API error: 401`

---

## 🔍 **WHAT'S HAPPENING**

The 401 error means **ElevenLabs doesn't recognize your API key**.

**Possible reasons**:
1. ❌ The key has a typo (extra space, missing character)
2. ❌ The key was revoked (because you posted it in chat)
3. ❌ Your ElevenLabs account needs verification
4. ❌ The key doesn't have the right permissions

---

## ✅ **SOLUTION - STEP BY STEP**

### **STEP 1: TEST YOUR API KEY FIRST** 🧪

Before adding it to DAWRV, let's **verify it actually works**:

1. **Open the tester**:
   ```bash
   open /Users/frederickzimmerman/DAWRV-Project/test_elevenlabs_key.html
   ```
   OR just **double-click** the file: `test_elevenlabs_key.html`

2. **Paste your API key** in the field

3. **Click "Test API Key"**

4. **Check the result**:
   - ✅ **Green = Key is VALID** → Use this key in DAWRV
   - ❌ **Red = Key is INVALID** → Follow steps below to get a new one

---

### **STEP 2: GET A FRESH, WORKING API KEY** 🔑

1. **Go to**: https://elevenlabs.io/app/settings/api-keys

2. **Delete ALL existing keys**:
   - Click the trash icon next to EACH key
   - Confirm deletion
   - Make sure the list is EMPTY

3. **Generate a brand NEW key**:
   - Click **"+ Create New Key"**
   - Name it: `DAWRV_FRESH`
   - Click **"Create"**

4. **Copy the key CAREFULLY**:
   - Triple-click to select the ENTIRE key
   - Copy it (Cmd+C)
   - ⚠️ Make sure there are NO spaces before or after!
   - The key should start with `sk_` and be about 60-80 characters long

5. **Test it IMMEDIATELY**:
   - Go back to `test_elevenlabs_key.html`
   - Paste the NEW key
   - Click "Test API Key"
   - **Make sure you see GREEN (✅ Valid!)**

---

### **STEP 3: ADD THE VERIFIED KEY TO DAWRV** 🎚️

Now that you have a **verified working key**, add it to DAWRV:

#### **Method 1: Using DAWRV UI** (Recommended)

1. **Open DAWRV** (should be running)

2. **Open Voice Settings**:
   - Click the **🎤 Voice Settings** button

3. **Configure ElevenLabs**:
   - Change **"TTS Provider"** dropdown to: **"ElevenLabs"**
   - **Paste your VERIFIED key** in the "API Key" field
   - ⚠️ **Paste carefully** (no extra spaces!)
   - Click **"Save"** button

4. **Reload DAWRV**:
   ```bash
   # Restart DAWRV to apply changes
   cd /Users/frederickzimmerman/DAWRV-Project
   killall -9 Electron 2>/dev/null && sleep 2 && npm start
   ```

5. **Check console**:
   - Should see: `🎤 TTS Provider initialized: elevenlabs`
   - Should NOT see: `❌ 401 error`

---

#### **Method 2: Manual Config** (If UI doesn't work)

1. **Open Developer Console** in DAWRV:
   - Click: **View > Developer > Toggle Developer Tools**

2. **Paste this code** (replace `YOUR_KEY` with your actual key):

```javascript
localStorage.setItem('rhea_tts_config', JSON.stringify({
    provider: 'elevenlabs',
    apiKey: 'YOUR_ELEVENLABS_KEY_HERE',
    elevenlabs: {
        apiKey: 'YOUR_ELEVENLABS_KEY_HERE',
        voiceId: '21m00Tcm4TlvDq8ikWAM'
    }
}));
console.log('✅ Config saved!');
location.reload();
```

3. **Press Enter** → DAWRV will reload

4. **Check console**:
   - Should see: `🎤 TTS Provider initialized: elevenlabs`

---

### **STEP 4: LOAD VOICES & TEST** 🎵

1. **Open Voice Settings** again

2. **Click "Load your custom voices"** link

3. **Wait 2-3 seconds** → Voices should populate!

4. **Select a voice** from dropdown (Rachel, Bella, etc.)

5. **Click "Save"**

6. **Test it**:
   - Type "Hello, I am RHEA" in the test field
   - Click **"Test Voice"**
   - You should hear the ultra-realistic ElevenLabs voice! 🎵

---

## 🚨 **STILL NOT WORKING?**

If you **STILL** get a 401 error after following ALL steps:

### **Check Your ElevenLabs Account**

1. Go to: https://elevenlabs.io/app/subscription

2. **Verify**:
   - ✅ Email is confirmed
   - ✅ Account is active (not suspended)
   - ✅ You have free credits or an active subscription
   - ✅ No warnings or errors on your dashboard

3. **If account is NOT verified**:
   - Check your email for verification link
   - Click the link to verify
   - Wait 5 minutes
   - Generate a NEW API key
   - Test it again

---

## 💡 **ALTERNATIVE: USE GOOGLE CLOUD TTS**

If ElevenLabs is too much trouble, **Google Cloud TTS** is also excellent:

- ✅ **Free tier**: 1 million characters/month (plenty!)
- ✅ **Very high quality**
- ✅ **Easier setup**

**Setup**:
1. Go to: https://console.cloud.google.com/
2. Enable "Cloud Text-to-Speech API"
3. Create API key
4. Add to DAWRV Voice Settings

---

## 📊 **SUMMARY**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Test key with `test_elevenlabs_key.html` | ✅ Green "Valid!" message |
| 2 | Delete all old keys on ElevenLabs | Empty key list |
| 3 | Generate NEW key | Key starting with `sk_` |
| 4 | Test NEW key | ✅ Green "Valid!" message |
| 5 | Add to DAWRV Voice Settings | `🎤 TTS Provider initialized: elevenlabs` |
| 6 | Load voices | Voices populate in dropdown |
| 7 | Test voice | Hear ElevenLabs voice speaking |

---

## ✅ **SUCCESS CHECKLIST**

- [ ] Tested key with `test_elevenlabs_key.html` → Green ✅
- [ ] Added key to DAWRV
- [ ] Restarted DAWRV
- [ ] Console shows: `🎤 TTS Provider initialized: elevenlabs`
- [ ] NO 401 errors in console
- [ ] Loaded voices successfully
- [ ] Test voice works (hear ElevenLabs voice)

---

**Once ALL checkboxes are ✅, you're done!** 🎉

