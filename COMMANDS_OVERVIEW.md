# 🎤 DAWRV/RHEA Voice Commands Overview

Complete command reference for controlling REAPER with your voice.

---

## 📊 Command Categories

| Category | Commands | File |
|----------|----------|------|
| 🎮 Transport | 15+ | [See Transport](#transport-commands) |
| 🎵 Tempo | 4 | [See Tempo](#tempo-commands) |
| 📏 Bars & Measures | 10+ | [See Bars](#bar--measure-commands) |
| 🎚️ Track Control | 8 | [See Tracks](#track-control-commands) |
| 🎛️ Mixer Control | 40+ | [MIXER_COMMANDS.md](MIXER_COMMANDS.md) |
| 🔖 Markers | 13 | [See Markers](#marker-commands) |
| ✂️ Editing | 6 | [See Editing](#editing-commands) |
| 📁 Project | 4 | [See Project](#project-commands) |
| 🔍 Navigation | 3 | [See Navigation](#navigation-commands) |

**Total Commands: 100+**

---

## 🎮 Transport Commands

| Command | Action | Example |
|---------|--------|---------|
| Play | Start playback | "Play" |
| Stop | Stop playback | "Stop" |
| Pause | Pause playback | "Pause" |
| Record | Start recording | "Record" |
| Rewind | Go to start | "Rewind" |
| Go to end | Jump to project end | "Go to end" |
| Loop | Toggle loop | "Loop" |

---

## 🎵 Tempo Commands

| Command | Action | Example |
|---------|--------|---------|
| Set tempo | Set project tempo | "Set tempo to 120" |
| Increase tempo | +X BPM | "Increase tempo by 10" |
| Decrease tempo | -X BPM | "Decrease tempo by 5" |
| Get tempo | Query current tempo | "What's the tempo?" |

---

## 📏 Bar & Measure Commands

| Command | Action | Example |
|---------|--------|---------|
| Go to bar | Jump to bar N | "Go to bar 10" |
| Play from bar | Start playback at bar | "Play from bar 5" |
| Loop bars | Loop from bar X to Y | "Loop bars 4 to 8" |
| Set loop from selection | Create loop from selection | "Set loop from selection" |
| Clear loop | Remove loop points | "Clear loop" |
| Toggle metronome | Enable/disable click | "Toggle metronome" |
| Toggle pre-roll | Enable/disable count-in | "Toggle pre-roll" |
| Nudge cursor | Move by bars/beats | "Nudge cursor forward 1 bar" |

---

## 🎚️ Track Control Commands

| Command | Action | Example |
|---------|--------|---------|
| Select track N | Select specific track | "Select track 3" |
| Mute track N | Mute track | "Mute track 1" |
| Unmute track N | Unmute track | "Unmute track 2" |
| Solo track N | Solo track | "Solo track 4" |
| Unsolo track N | Unsolo track | "Unsolo track 4" |
| Arm track N | Arm for recording | "Arm track 1" |
| Set track N volume | Set track level | "Set track 2 volume to 75" |
| Pan track N | Pan track L/R/Center | "Pan track 1 left" |

---

## 🎛️ Mixer Control Commands

**See [MIXER_COMMANDS.md](MIXER_COMMANDS.md) for complete documentation.**

### Quick Reference:
- **Master Control**: "Mute master", "Set master volume to 80", "Master volume up"
- **Global Actions**: "Mute all", "Unmute all", "Unsolo all", "Unarm all"
- **Visibility**: "Show mixer", "Hide mixer", "Toggle mixer"

---

## 🔖 Marker Commands

| Command | Action | Example |
|---------|--------|---------|
| Next marker | Go to next marker | "Next marker" |
| Previous marker | Go to previous marker | "Previous marker" |
| Go to marker N | Jump to marker | "Go to marker 5" |
| Add marker | Create marker at cursor | "Add marker" |

---

## ✂️ Editing Commands

| Command | Action | Example |
|---------|--------|---------|
| Undo | Undo last action | "Undo" |
| Redo | Redo last action | "Redo" |
| Cut | Cut selection | "Cut" |
| Copy | Copy selection | "Copy" |
| Paste | Paste clipboard | "Paste" |
| Delete | Delete selection | "Delete" |

---

## 📁 Project Commands

| Command | Action | Example |
|---------|--------|---------|
| Save | Save project | "Save" |
| Save as | Save project as... | "Save as" |
| New project | Create new project | "New project" |
| Open project | Open existing project | "Open project" |

---

## 🔍 Navigation Commands

| Command | Action | Example |
|---------|--------|---------|
| Zoom in | Zoom in horizontal | "Zoom in" |
| Zoom out | Zoom out horizontal | "Zoom out" |
| Zoom all | Fit project in window | "Zoom all" |

---

## 💬 Conversational Commands

RHEA also understands natural conversation:
- **"Thank you"** - RHEA will acknowledge
- **"Are you listening?"** - RHEA will confirm
- **"What can you do?"** - Shows available commands
- **"Help"** - Displays command reference

---

## 🤖 AI-Powered Understanding

RHEA uses AI (OpenAI/Anthropic) to understand natural variations:
- "Start playback" → **Play**
- "Silence track 3" → **Mute track 3**
- "Jump to the 10th bar" → **Go to bar 10**
- "Make the master louder" → **Master volume up**

---

## 🎙️ Voice Recognition

### Engines:
1. **Deepgram Nova-2** (Online) - 95-99% accuracy, 200-500ms response
2. **Whisper** (Offline) - Fallback, runs locally

### Setup:
- **Deepgram**: Set `DEEPGRAM_API_KEY` environment variable (see [DEEPGRAM_SETUP.md](DEEPGRAM_SETUP.md))
- **Whisper**: No setup needed (automatic fallback)

---

## 🔧 Technical Details

### Command Processing Flow:
1. **Voice Input** → Microphone capture
2. **Transcription** → Deepgram/Whisper STT
3. **AI Agent** → OpenAI/Anthropic analysis (optional)
4. **Keyword Matching** → Pattern matching fallback
5. **Action Execution** → REAPER OSC/HTTP/ReaScript
6. **Feedback** → RHEA speaks confirmation

### Integration Methods:
- **OSC** (Port 8000) - Real-time control, low latency
- **HTTP API** (Port 8080) - Action execution
- **ReaScripts** - Complex operations (Lua)
- **Web Interface** - ExtState/Action triggering

---

## 📚 Documentation Files

- **[MIXER_COMMANDS.md](MIXER_COMMANDS.md)** - Complete mixer control reference
- **[DEEPGRAM_SETUP.md](DEEPGRAM_SETUP.md)** - Voice engine setup guide
- **[README.md](README.md)** - Main project documentation

---

## 🚀 Quick Start

1. **Install DAWRV**: `npm install && npm start`
2. **Setup REAPER OSC**: Enable OSC in REAPER preferences (port 8000/8001)
3. **Enable Web Interface**: Load REAPER Web Interface (port 8080)
4. **Install ReaScripts**: Load DAWRV scripts from `daw-scripts/reaper/scripts/`
5. **Configure Voice**: Set Deepgram API key or use Whisper
6. **Start Talking**: "Play", "Set tempo to 120", "Mute master"

---

## 🎯 Most Popular Commands

1. **"Play"** / **"Stop"** - Transport control
2. **"Go to bar X"** - Navigation
3. **"Set tempo to X"** - Tempo adjustment
4. **"Mute track X"** / **"Solo track X"** - Track control
5. **"Show mixer"** - Open mixer
6. **"Set master volume to X"** - Master level
7. **"Loop bars X to Y"** - Loop region
8. **"Unmute all"** - Reset mutes
9. **"Save"** - Save project
10. **"Thank you"** - Conversational

---

**Last Updated:** November 17, 2025  
**DAWRV Version:** 1.0.0  
**Commands:** 100+  
**Categories:** 9


