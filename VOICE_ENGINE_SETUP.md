# 🎤 Voice Engine Setup Guide - SUCCESS PATH

## ⚡ **RECOMMENDED: AssemblyAI** (Most Reliable)

**Why AssemblyAI:**
- ✅ **Very reliable** - Industry standard, used by thousands
- ✅ **Low latency** - ~300-500ms response time
- ✅ **High accuracy** - Excellent command recognition
- ✅ **Free tier** - 5 hours/month free
- ✅ **Easy setup** - Simple API key

### Setup Steps:

1. **Get API Key:**
   - Go to: https://www.assemblyai.com/app/account
   - Sign up (free)
   - Copy your API key

2. **Install Python Package:**
   ```bash
   pip3 install assemblyai
   ```

3. **Configure in DAWRV:**
   - Open **Advanced ASR Settings**
   - Select **"AssemblyAI"** (marked RECOMMENDED)
   - Paste your API key
   - Click **"Save"**
   - Click **"Start Listening"**

4. **Test:**
   - Say: "play the project"
   - Should respond within ~500ms

---

## 🏠 **Option 2: Local Whisper** (No API Needed)

**Why Local Whisper:**
- ✅ **100% free** - No API costs
- ✅ **Works offline** - No internet needed
- ✅ **Private** - Audio never leaves your computer
- ⚠️ **Slower** - ~2-3 second processing time

### Setup Steps:

1. **Already Installed** - Whisper is built-in!

2. **Configure:**
   - Open **Advanced ASR Settings**
   - Select **"Local Whisper"**
   - Choose model size:
     - **Base** (recommended) - Good balance
     - **Small** - Better accuracy, slower
     - **Large** - Best accuracy, slowest

3. **Test:**
   - Say: "mute track one"
   - Wait 2-3 seconds for response

---

## ✨ **Option 3: Gemini 2.5 Audio**

**Why Gemini:**
- ✅ Natural-sounding transcription
- ✅ Good accuracy
- ⚠️ Newer API, may have quirks

### Setup Steps:

1. **Get API Key:**
   - Go to: https://aistudio.google.com/app/apikey
   - Create API key

2. **Install:**
   ```bash
   pip3 install google-generativeai
   ```

3. **Configure:**
   - Select **"Gemini 2.5 Audio"** in ASR Settings
   - Paste API key and save

---

## 🤖 **CRITICAL: Configure AI Agent for Intelligent Commands**

**This is ESSENTIAL** - Without this, commands won't be understood intelligently!

### Setup AI Agent:

1. **Open AI Agent Settings** (in DAWRV settings)

2. **Choose Provider:**
   - **OpenAI** (recommended) - Best understanding
   - **Anthropic Claude** - Also excellent
   - **Gemini** - Good alternative

3. **Get API Key:**
   - **OpenAI**: https://platform.openai.com/api-keys
   - **Anthropic**: https://console.anthropic.com/
   - **Gemini**: https://aistudio.google.com/app/apikey

4. **Paste API Key** and save

5. **Test:**
   - Say: "turn down the volume on track five"
   - RHEA should understand and execute intelligently

---

## 🎯 **Complete Setup Checklist**

- [ ] **STT (Speech-to-Text)** - Choose one:
  - [ ] AssemblyAI (RECOMMENDED)
  - [ ] Local Whisper (free, slower)
  - [ ] Gemini Audio
  - [ ] Deepgram (if you fix API key)

- [ ] **AI Agent (NLU)** - REQUIRED for intelligent commands:
  - [ ] OpenAI API key configured
  - [ ] OR Anthropic API key configured
  - [ ] OR Gemini API key configured

- [ ] **Test Commands:**
  - [ ] "play the project"
  - [ ] "mute track one"
  - [ ] "set tempo to 120"
  - [ ] "arm track five"

---

## 🚨 **Troubleshooting**

### Commands Not Executing?

1. **Check AI Agent is configured:**
   - Without AI Agent, only keyword matching works
   - Go to AI Agent Settings and add API key

2. **Check STT is working:**
   - Look at console logs
   - Should see transcripts appearing

3. **Check REAPER Connection:**
   - REAPER must be running
   - OSC must be enabled in REAPER

### Low Accuracy?

1. **Speak clearly** - Enunciate commands
2. **Use recommended phrases** - "mute track one" vs "mute the first track"
3. **Check microphone** - Use external mic if possible
4. **Try AssemblyAI** - Best accuracy

### Slow Response?

1. **Use AssemblyAI** - Fastest cloud option
2. **Use Local Whisper "base" model** - Faster than "large"
3. **Check internet connection** - For cloud STT

---

## 💡 **Pro Tips**

1. **Best Combo:**
   - STT: AssemblyAI (fast, reliable)
   - NLU: OpenAI GPT-4o (best understanding)
   - Result: Fast, accurate, intelligent commands

2. **Budget Option:**
   - STT: Local Whisper (free)
   - NLU: OpenAI free tier
   - Result: Works, but slower

3. **Privacy-First:**
   - STT: Local Whisper (audio stays local)
   - NLU: Keyword matching (no API)
   - Result: 100% private, but less intelligent

---

## 🎉 **You're Ready!**

Once configured:
- **Speak naturally** - RHEA understands intent
- **Give commands** - "mute track five", "set tempo to 140"
- **Have conversations** - "what's the tempo?", "undo that"

**Remember:** The AI Agent is what makes commands intelligent. STT just converts speech to text - the AI Agent understands what you mean!








