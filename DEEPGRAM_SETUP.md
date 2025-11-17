# 🚀 Deepgram Nova-2 Setup Guide

Deepgram Nova-2 is the world's best voice recognition engine - **7-10x faster** than Whisper with **95-99% accuracy**.

---

## ⚡ **Benefits:**

| Feature | Whisper (Current) | Deepgram Nova-2 |
|---------|-------------------|-----------------|
| Response Time | 2-2.5 seconds | 0.3-0.5 seconds |
| Accuracy | 92-97% | 95-99% |
| Technical Terms | Good | Excellent |
| Cost | Free | ~$4/month |

---

## 🎁 **Free Trial:**

Deepgram offers **$200 in free credits** - that's **46,500 minutes** (~775 hours) of transcription!

---

## 📝 **Setup Steps:**

### **Step 1: Get Your API Key** (5 minutes)

1. Go to: https://console.deepgram.com/signup
2. Sign up with your email (GitHub/Google login available)
3. Click **"Create New API Key"**
4. Copy the key (starts with something like `a1b2c3d4...`)

### **Step 2: Add API Key to DAWRV**

**Option A: Via Terminal (Recommended)**

```bash
# Open your shell config file
nano ~/.zshrc

# Add this line at the end:
export DEEPGRAM_API_KEY="your_api_key_here"

# Save and reload
source ~/.zshrc
```

**Option B: Via Launch Script (Temporary)**

Create a file `launch_dawrv_deepgram.sh`:

```bash
#!/bin/bash
export DEEPGRAM_API_KEY="your_api_key_here"
cd /Users/frederickzimmerman/DAWRV-Project
npm start
```

Then run:
```bash
chmod +x launch_dawrv_deepgram.sh
./launch_dawrv_deepgram.sh
```

### **Step 3: Restart DAWRV**

That's it! DAWRV will automatically detect the API key and use Deepgram.

---

## 🔄 **Automatic Fallback:**

If Deepgram fails (no internet, API issue), DAWRV automatically falls back to Whisper!

**You get the best of both worlds:**
- ⚡ **Fast** when online (Deepgram)
- 🔒 **Reliable** when offline (Whisper)

---

## 📊 **Cost Breakdown:**

Deepgram charges **$0.0043 per minute** of audio:

| Usage | Cost per Month |
|-------|----------------|
| 1 hour/week | ~$1 |
| 4 hours/week | ~$4 |
| 10 hours/week | ~$10 |
| 40 hours/week (heavy) | ~$40 |

**Free credits last for months of testing!**

---

## 🧪 **Testing:**

After setup, you'll see in the terminal:

```
🎤 Voice Engine Selection:
   Deepgram API Key set: true
   Selected engine: Deepgram Nova-2 (Fast)
✅ Deepgram client initialized!
✅ Deepgram Nova-2 Ready! (Response time: 200-500ms)
```

Try saying:
- "Go to bar 10" (should respond in ~0.5 seconds!)
- "Thank you" (should recognize correctly)
- "Set tempo to 120" (instant response)

---

## ❓ **Troubleshooting:**

### **"DEEPGRAM_API_KEY not set" error**

The API key wasn't loaded. Try:

1. Check if it's in your shell config:
   ```bash
   echo $DEEPGRAM_API_KEY
   ```

2. If empty, add it to `~/.zshrc` and reload:
   ```bash
   export DEEPGRAM_API_KEY="your_key_here"
   source ~/.zshrc
   ```

3. Restart DAWRV completely

### **Still using Whisper?**

Check the terminal output when DAWRV starts:
```
🎤 Voice Engine Selection:
   Deepgram API Key set: false  ← Should be true!
```

If it's false, the environment variable isn't being passed to DAWRV.

---

## 🔐 **Security Note:**

**NEVER commit your API key to Git!**

The key is loaded from environment variables, not stored in code. This keeps it secure.

---

## 📈 **Monitoring Usage:**

Check your Deepgram dashboard: https://console.deepgram.com/

You'll see:
- Minutes used
- Credits remaining
- Cost breakdown

---

## 🚫 **Want to Disable Deepgram?**

Just remove the environment variable:

```bash
# Remove from ~/.zshrc
nano ~/.zshrc
# Delete the DEEPGRAM_API_KEY line
source ~/.zshrc
```

DAWRV will automatically use Whisper again.

---

## 💡 **Pro Tips:**

1. **Use Deepgram for production work** (fast, accurate)
2. **Keep Whisper as fallback** (works offline)
3. **Monitor your usage** to avoid surprise costs
4. **Free credits are generous** - test extensively!

---

**Enjoy lightning-fast voice recognition!** ⚡✨


