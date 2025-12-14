# REAPER Complete Knowledge Base for RHEA

## What is REAPER?

REAPER (Rapid Environment for Audio Production, Engineering, and Recording) is a professional digital audio workstation (DAW) developed by Cockos. It's known for being lightweight, highly customizable, affordable, and extremely powerful. REAPER runs on Windows, macOS, and Linux.

### Key REAPER Features
- Non-destructive editing
- Unlimited tracks (audio and MIDI)
- Powerful routing capabilities
- Extensive plugin support (VST, VST3, AU, JS, LV2)
- Built-in effects and instruments (ReaPlugs)
- Highly customizable interface
- Scripting support (ReaScript - Lua, EEL, Python)
- Portable installation option
- Reasonable pricing with generous trial

---

## REAPER Interface Components

### Track Control Panel (TCP)
The Track Control Panel is on the left side of the arrange view. Each track shows:
- **Track Number** - Sequential number starting from 1
- **Track Name** - Click to rename
- **Record Arm Button** (red circle) - Arms track for recording
- **Mute Button** (M) - Silences the track
- **Solo Button** (S) - Isolates the track
- **FX Button** - Opens the FX chain
- **Volume Fader** - Controls track volume (in dB)
- **Pan Knob** - Controls stereo positioning
- **Input/Output routing** - Configure audio I/O
- **Phase Invert** - Flip audio phase
- **Record Mode** - Input, Output, MIDI, etc.

### Mixer Control Panel (MCP)
Access with Cmd+M (Mac) or Ctrl+M (Windows). Shows:
- Vertical faders for volume
- Pan controls
- Mute/Solo buttons
- FX slots
- Send controls
- Metering

### Transport Bar
Located at the bottom, includes:
- **Play Button** - Start/resume playback
- **Stop Button** - Stop and return to start
- **Pause Button** - Pause at current position
- **Record Button** - Start recording
- **Loop Button** - Toggle loop mode
- **Time Display** - Shows position (bars:beats or time)
- **Tempo/BPM** - Project tempo
- **Time Signature** - Beats per measure

### Arrange View
The main editing area where you:
- See all tracks and media items
- Edit audio and MIDI
- Make time selections
- Add markers and regions
- Arrange your project

---

## Recording in REAPER

### Setting Up for Recording
1. **Create a track** - Insert > Track or Cmd+T
2. **Assign input** - Click input dropdown on track, select audio interface input
3. **Arm the track** - Click record arm button (turns red)
4. **Enable monitoring** - If you want to hear yourself
5. **Set recording mode** - Right-click record arm for options

### Recording Modes
- **Record: input (audio or MIDI)** - Standard recording, records what comes into the track
- **Record: MIDI overdub** - Layers new MIDI on existing, great for building parts
- **Record: MIDI replace** - Replaces existing MIDI in loop area
- **Record: output** - Records the track's output (after FX), useful for bouncing
- **Record: disable (input monitoring only)** - Hear input but don't record

### Punch Recording
- **Auto-punch** - Set time selection, enable auto-punch, records only within selection
- **Manual punch** - Press record while playing to punch in, press again to punch out
- **Pre-roll** - Plays before punch point so you can get into the groove

### Loop Recording
- Set loop region
- Enable loop recording (right-click record button > Record mode settings)
- Each pass creates a new take
- Access takes via dropdown on media item

### Multi-Track Recording
- Arm multiple tracks
- Each track records from its assigned input
- All tracks record simultaneously
- Great for recording bands or drums

---

## MIDI in REAPER

### MIDI Basics
- MIDI = Musical Instrument Digital Interface
- MIDI doesn't record sound - it records note data
- Note data includes: pitch, velocity, duration, timing
- MIDI drives virtual instruments (VST/AU plugins)

### MIDI Editor
Double-click a MIDI item to open the MIDI editor:
- **Piano roll** - Notes displayed as horizontal bars
- **Velocity lane** - Shows note velocities
- **CC lanes** - Continuous controllers (modulation, expression, etc.)
- **Note names** - Piano keyboard on left side

### MIDI Editing Operations
- **Draw notes** - Select pencil tool, click and drag
- **Select notes** - Click or drag to select
- **Move notes** - Drag selected notes
- **Resize notes** - Drag note edges
- **Change velocity** - Use velocity lane or note properties
- **Quantize** - Snap notes to grid (Edit > Quantize)
- **Humanize** - Add random timing variations
- **Transpose** - Shift notes up/down

### MIDI Channels
- 16 channels per MIDI track
- Channel determines which instrument receives notes
- Useful for multi-timbral instruments

### Common MIDI Controllers (CC)
- CC1 - Modulation wheel
- CC7 - Volume
- CC10 - Pan
- CC11 - Expression
- CC64 - Sustain pedal
- Pitch bend - Separate from CC, bends note pitch

---

## Audio Editing in REAPER

### Non-Destructive Editing
REAPER never modifies your original files. All edits are stored as instructions:
- Cuts, trims, splits - just markers in the project
- FX processing - applied in real-time
- Original files remain untouched on disk

### Basic Editing Operations
- **Split** - S key at edit cursor, or at mouse position
- **Trim** - Drag item edges
- **Delete** - Select and press Delete
- **Copy/Paste** - Standard Cmd+C, Cmd+V
- **Duplicate** - Cmd+D
- **Move** - Drag items to new position
- **Crossfade** - Overlap items, crossfade appears automatically

### Advanced Editing
- **Time stretch** - Hold Opt/Alt and drag item edge
- **Pitch shift** - Item properties > Pitch adjust
- **Reverse** - Item processing > Reverse
- **Normalize** - Item processing > Normalize
- **Fade in/out** - Drag corners of items

### Takes and Comping
- Multiple recordings on same track create takes
- Cycle through takes with dropdown
- Comp (composite) best parts from multiple takes
- Take lanes view shows all takes vertically

### Markers and Regions
- **Markers** - Single points (M key to add)
- **Regions** - Time ranges (Shift+R to add)
- Use for navigation and organization
- Name markers for sections (Intro, Verse, Chorus)

---

## Mixing in REAPER

### Gain Staging
1. Start with all faders at 0 dB (unity)
2. Use item/clip gain for initial levels
3. Keep peaks around -18 to -12 dBFS
4. Leave headroom on master (-6 dB)

### Volume Automation
- Show automation lanes (track envelope button)
- Draw or record automation
- Volume, pan, mute, and plugin parameters
- Multiple envelope shapes (linear, bezier, square)

### Panning
- Mono tracks: simple left/right panner
- Stereo tracks: balance or width control
- Surround: multiple panner modes available

### Grouping and Busing
- **Track folders** - Parent track controls children
- **Sends** - Route audio to other tracks
- **Receives** - Get audio from other tracks
- **Buses** - Mix multiple tracks together (drums, vocals, etc.)

### FX Chain
- Each track has an FX chain
- Add plugins with FX button
- Drag to reorder
- Bypass individual or all FX
- Save FX chains as presets

---

## Plugins in REAPER

### Plugin Formats
- **VST/VST2** - Cross-platform, widely supported
- **VST3** - Newer VST format, better CPU efficiency
- **AU (Audio Units)** - macOS only
- **JS (JSFX)** - REAPER's built-in scripted effects
- **LV2** - Linux audio plugins

### Built-in Plugins (ReaPlugs)
- **ReaEQ** - Parametric equalizer
- **ReaComp** - Compressor
- **ReaDelay** - Delay effect
- **ReaVerb** - Convolution reverb
- **ReaGate** - Noise gate
- **ReaFIR** - FFT-based EQ/dynamics
- **ReaPitch** - Pitch shifter
- **ReaTune** - Pitch correction

### Plugin Categories
- **EQ** - Shape frequency content
- **Compressor** - Control dynamics
- **Reverb** - Add space and depth
- **Delay** - Echo effects
- **Saturation/Distortion** - Add warmth or grit
- **Modulation** - Chorus, flanger, phaser
- **Virtual Instruments** - Synths, samplers, drums

### Plugin Management
- Scan for plugins in Preferences
- Organize with favorites
- Create plugin chains
- Use plugin presets

---

## Keyboard Shortcuts (REAPER Defaults)

### Transport
- **Space** - Play/Stop
- **Enter** - Play/Pause
- **R** - Record
- **Home** - Go to start
- **End** - Go to end
- **L** - Toggle loop

### Editing
- **S** - Split at cursor
- **Delete** - Delete selected items
- **Cmd+Z** - Undo
- **Cmd+Shift+Z** - Redo
- **Cmd+C** - Copy
- **Cmd+V** - Paste
- **Cmd+D** - Duplicate
- **Cmd+A** - Select all

### Navigation
- **+/-** - Zoom in/out
- **Cmd+Home** - Zoom to project
- **Page Up/Down** - Scroll tracks
- **Cmd+J** - Go to time/marker

### Tracks
- **Cmd+T** - Insert track
- **M** - Toggle mute on selected track
- **F5** - Toggle solo on selected track
- **Up/Down** - Select previous/next track

---

## REAPER Actions System

### What Are Actions?
Actions are commands that do something in REAPER. Everything in REAPER is an action:
- Menu commands
- Keyboard shortcuts
- Toolbar buttons
- Scripts

### Action List
Open with **?** key or Actions menu:
- Search for any action
- See command ID (number)
- Assign keyboard shortcuts
- Run actions manually

### Common Action IDs
- 1007 - Play
- 1016 - Stop
- 1013 - Record
- 1008 - Pause
- 40029 - Undo
- 40030 - Redo
- 40001 - Insert new track
- 40005 - Remove track
- 40340 - Unsolo all tracks

### Custom Actions
- Combine multiple actions into one
- Create macros for complex operations
- Assign single shortcut to multiple steps

---

## Audio Concepts

### Sample Rate
- How many times per second audio is measured
- 44.1 kHz - CD quality, good for music
- 48 kHz - Standard for video
- 96 kHz, 192 kHz - High resolution
- Higher = more detail, larger files

### Bit Depth
- Resolution of each sample
- 16-bit - CD quality
- 24-bit - Professional standard
- 32-bit float - Maximum headroom

### Latency
- Delay between input and output
- Lower = more responsive, more CPU
- Higher = less CPU, noticeable delay
- Buffer size controls latency

### Headroom
- Space between signal level and 0 dBFS
- -6 dB headroom is common practice
- Prevents clipping during mixing
- Master limiter catches peaks

### Clipping
- When signal exceeds 0 dBFS
- Causes distortion (usually bad)
- Digital clipping is harsh
- Use limiters to prevent

---

## Music Production Workflow

### Pre-Production
1. Songwriting and arrangement
2. Demo recordings
3. Plan session (tempo, key, instrumentation)
4. Prepare click track and scratch tracks

### Tracking (Recording)
1. Record foundation (drums, bass, rhythm)
2. Layer instruments
3. Record vocals
4. Capture multiple takes for comping

### Editing
1. Comp best takes
2. Time align tracks
3. Tune vocals if needed
4. Clean up noise and mistakes
5. Arrange structure

### Mixing
1. Balance levels
2. Pan instruments for space
3. Apply EQ for clarity
4. Compress for consistency
5. Add effects (reverb, delay)
6. Automation for movement

### Mastering
1. Final EQ adjustments
2. Multi-band compression
3. Stereo enhancement
4. Limiting for loudness
5. Format for distribution

---

## Troubleshooting

### No Sound
1. Check audio device settings (Preferences > Audio)
2. Verify output routing on master track
3. Check track isn't muted or volume at zero
4. Verify speakers/headphones are connected

### Crackling/Pops
1. Increase buffer size
2. Close other applications
3. Disable unnecessary plugins
4. Check CPU usage
5. Update audio drivers

### Latency Issues
1. Use ASIO drivers (Windows)
2. Lower buffer size
3. Use direct monitoring
4. Freeze heavy tracks

### Plugin Problems
1. Re-scan plugins
2. Check plugin compatibility
3. Update plugins
4. Try different plugin format (VST3 vs VST2)

---

## Tips for Voice Control

When using voice commands:
- Say track numbers clearly ("track five" not "track 5ive")
- Wait for confirmation before next command
- Use simple, direct commands
- State the action first, then parameters ("mute track 3")

### Command Patterns
- Transport: "play", "stop", "record", "pause"
- Navigation: "go to bar 5", "rewind", "go to end"
- Tracks: "new track", "delete track 3", "mute track 2"
- Mixing: "solo track 1", "raise volume 3 dB", "pan left"
- Recording: "arm track", "disarm all", "punch in"






