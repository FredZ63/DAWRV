# Whisper Voice Engine Setup

## Overview
Whisper is an offline, highly accurate voice recognition engine that's better than Google Speech Recognition for command recognition.

## Benefits
- ✅ **Offline** - No internet connection required
- ✅ **More Accurate** - Better recognition of commands
- ✅ **Faster** - No network latency
- ✅ **Private** - All processing happens locally

## Installation

The Whisper voice listener will automatically install dependencies on first run:
- `openai-whisper` - The Whisper model
- `pyaudio` - Audio input
- `numpy` - Required by Whisper

## Usage

### Option 1: Replace Current Listener
Update `src/main/main.js` to use `rhea_voice_listener_whisper.py` instead of `rhea_voice_listener.py`:

```javascript
// In startVoiceListener() method, change:
scriptPath = path.resolve(__dirname, '../../rhea_voice_listener_whisper.py');
```

### Option 2: Test First
Test the Whisper listener manually:
```bash
python3 rhea_voice_listener_whisper.py
```

## Model Sizes

The script uses the "base" model by default. Available models:
- `tiny` - Fastest, least accurate (~39MB)
- `base` - Good balance (~74MB) - **Recommended**
- `small` - Better accuracy (~244MB)
- `medium` - High accuracy (~769MB)
- `large` - Best accuracy (~1550MB)

To change the model, edit `rhea_voice_listener_whisper.py` and change:
```python
model = whisper.load_model("base")  # Change "base" to your preferred model
```

## First Run

On first run, Whisper will download the model automatically. This happens once and the model is cached locally.

## Performance

- **First load**: ~2-5 seconds (downloads model if needed)
- **Subsequent loads**: ~1-2 seconds
- **Recognition speed**: Real-time or faster
- **Accuracy**: Significantly better than Google Speech Recognition for commands

## Troubleshooting

### Model download fails
- Check internet connection (needed only for first download)
- Try a smaller model (tiny or base)

### Audio issues
- Ensure microphone permissions are granted
- Check that PyAudio is installed correctly
- On macOS, you may need: `brew install portaudio`

### Slow performance
- Use a smaller model (tiny or base)
- Ensure you have enough RAM (base model needs ~1GB)

