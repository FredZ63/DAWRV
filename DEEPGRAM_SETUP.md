# 🎤 Deepgram Setup for Fast Voice Recognition

## Problem
Without Deepgram API key, DAWRV uses Whisper which takes **30-60 seconds** to load the 3GB model.

## Solution: Use Deepgram Nova-2 (Fast & Accurate)

### Step 1: Set Environment Variable Permanently

Add this to your shell configuration file:

**For zsh (macOS default):**
```bash
echo 'export DEEPGRAM_API_KEY="7fc1dc97636cfa2f829c0beaccf96c87aad7c6a2"' >> ~/.zshrc
source ~/.zshrc
```

**For bash:**
```bash
echo 'export DEEPGRAM_API_KEY="7fc1dc97636cfa2f829c0beaccf96c87aad7c6a2"' >> ~/.bashrc
source ~/.bashrc
```

### Step 2: Verify It's Set

```bash
echo $DEEPGRAM_API_KEY
# Should output: 7fc1dc97636cfa2f829c0beaccf96c87aad7c6a2
```

### Step 3: Restart DAWRV

```bash
cd /Users/frederickzimmerman/DAWRV-Project
npm start
```

## Why This Matters

| Engine | Startup Time | Accuracy | Network |
|--------|-------------|----------|---------|
| **Deepgram Nova-2** | **2-3 seconds** ⚡ | 95-98% | Required |
| Whisper Large | 30-60 seconds | 92-97% | Offline |

## How to Check Which Engine Is Running

When you click "Start Listening", check the console output:

### ✅ Good (Deepgram):
```
🎤 Voice Engine Selection:
   Deepgram API Key set: true
   Selected engine: Deepgram Nova-2 (Fast)
🎤 Starting Deepgram Nova-2...
✅ Deepgram Nova-2 Ready! (Response time: 200-500ms)
```

### ❌ Slow (Whisper):
```
🎤 Voice Engine Selection:
   Deepgram API Key set: false
   Selected engine: Whisper Large (Offline)
📥 Loading Whisper "large" model (first time: ~3GB download, 30-60 sec)...
```

## Troubleshooting

### If npm start still uses Whisper:

1. **Make sure the variable is exported** (not just set):
   ```bash
   export DEEPGRAM_API_KEY="7fc1dc97636cfa2f829c0beaccf96c87aad7c6a2"
   ```

2. **Run from the same terminal** where you set the variable:
   ```bash
   cd /Users/frederickzimmerman/DAWRV-Project
   npm start
   ```

3. **Or use the direct command**:
   ```bash
   DEEPGRAM_API_KEY="7fc1dc97636cfa2f829c0beaccf96c87aad7c6a2" npm start
   ```

## What Changed

The `package.json` start script now explicitly passes the environment variable:

```json
"start": "DEEPGRAM_API_KEY=$DEEPGRAM_API_KEY electron ."
```

This ensures Electron receives the API key even if your terminal session doesn't automatically export it.

---

**Your API Key**: `7fc1dc97636cfa2f829c0beaccf96c87aad7c6a2`

**Status**: Ready to use! Just add it to your shell config and restart.
