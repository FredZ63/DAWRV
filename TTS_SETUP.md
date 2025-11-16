# High-Quality TTS Setup Guide for RHEA

## Quick Start

1. Click **🎤 Voice Settings** button in RHEA panel
2. Select a TTS provider
3. Enter API key (if required)
4. Click **Save**
5. Test the voice!

## Recommended: ElevenLabs (Best Quality)

### Why ElevenLabs?
- **Most human-like voices** available
- Very natural intonation and emotion
- Fast response times
- Easy to set up

### Setup Steps:

1. **Get API Key:**
   - Go to https://elevenlabs.io
   - Sign up (free tier: 10,000 characters/month)
   - Go to Settings → API Keys
   - Create a new API key

2. **Configure in DAWRV:**
   - Click **🎤 Voice Settings**
   - Select **ElevenLabs**
   - Paste your API key
   - Choose a voice (Rachel is default)
   - Click **Save**

3. **Test:**
   - Enter test text
   - Click **Test Voice**
   - Enjoy human-like speech!

### ElevenLabs Voices:
- **Rachel** (Default) - Natural, friendly female
- **Adam** - Professional male
- **Bella** - Warm female
- **Antoni** - Clear male
- **Elli** - Energetic female
- **Josh** - Casual male
- **Arnold** - Deep male
- **Sam** - Versatile male

### Pricing:
- **Free**: 10,000 characters/month
- **Starter**: $5/month - 30,000 characters
- **Creator**: $22/month - 100,000 characters

---

## Free Options

### Coqui TTS (Local, Free)

**Pros:**
- 100% free
- Runs locally (privacy)
- Very natural voices
- No API costs

**Setup:**
1. Install Coqui TTS:
   ```bash
   pip install TTS
   ```

2. Start backend service (requires Python backend):
   ```bash
   python tts_server.py
   ```

3. Configure in DAWRV:
   - Select **Coqui TTS**
   - Set Base URL: `http://localhost:5000`

**Note:** Requires backend service setup (see advanced setup)

### Piper TTS (Local, Free, Fast)

**Pros:**
- 100% free
- Very fast
- Runs locally
- Lightweight

**Setup:**
1. Download Piper binary or use Python package
2. Start backend service
3. Configure in DAWRV

---

## Other Options

### Amazon Polly (Good Quality, Very Cheap)

**Pricing:** $4 per 1 million characters (very affordable!)

**Setup:**
1. Create AWS account
2. Get IAM credentials
3. Configure in DAWRV

### Google Cloud TTS (Good Quality)

**Pricing:** $4 per 1 million characters

**Setup:**
1. Create Google Cloud account
2. Enable TTS API
3. Get API key
4. Configure in DAWRV

---

## Comparison

| Provider | Quality | Cost | Setup | Best For |
|---------|---------|------|-------|----------|
| **ElevenLabs** | ⭐⭐⭐⭐⭐ | Paid | Easy | Best quality |
| **Coqui** | ⭐⭐⭐⭐ | Free | Medium | Privacy, offline |
| **Piper** | ⭐⭐⭐ | Free | Medium | Fast, lightweight |
| **Polly** | ⭐⭐⭐⭐ | Very Low | Medium | Cost-effective |
| **Google** | ⭐⭐⭐⭐ | Low | Medium | Good balance |

---

## Voice Quality Examples

### Browser TTS (Current):
- Robotic, limited emotion
- 7-bit quality
- Free but limited

### ElevenLabs:
- Natural, human-like
- Emotional expression
- Professional quality
- **Recommended for production**

### Coqui/Piper:
- Natural, good quality
- Free, local processing
- **Recommended for privacy**

---

## Troubleshooting

### "API key invalid"
- Check API key is correct
- Ensure no extra spaces
- Verify account is active

### "Voice not working"
- Check internet connection (for cloud providers)
- Verify API key has credits
- Try browser TTS as fallback

### "Rate limited"
- Upgrade plan or wait
- Use local TTS (Coqui/Piper) for unlimited

---

## Advanced: Local TTS Setup

### Coqui TTS Backend

Create `tts_server.py`:
```python
from TTS.api import TTS
from flask import Flask, request, send_file
import io

app = Flask(__name__)
tts = TTS("tts_models/en/ljspeech/tacotron2-DDC")

@app.route('/synthesize', methods=['POST'])
def synthesize():
    text = request.json['text']
    wav = tts.tts(text)
    # Return audio file
    return send_file(io.BytesIO(wav), mimetype='audio/wav')

if __name__ == '__main__':
    app.run(port=5000)
```

### Piper TTS Backend

Download Piper binary and create wrapper service.

---

## Recommendations

**For Best Quality:** ElevenLabs (worth the cost)

**For Privacy/Offline:** Coqui TTS or Piper TTS

**For Budget:** Amazon Polly (very cheap, good quality)

**For Quick Setup:** ElevenLabs (easiest)

---

Enjoy your enhanced RHEA voice! 🎤✨

