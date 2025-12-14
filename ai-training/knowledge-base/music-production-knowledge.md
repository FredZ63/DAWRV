# Music Production Knowledge Base

## Audio Engineering Fundamentals

### The Signal Chain
Audio flows through a signal chain:
1. **Source** - Microphone, instrument, sample
2. **Preamp** - Boosts weak mic signals
3. **A/D Converter** - Analog to digital
4. **DAW** - Processing and mixing
5. **D/A Converter** - Digital to analog
6. **Monitors** - Speakers or headphones

### Microphone Types
- **Dynamic** - Rugged, handles high SPL, no phantom power (SM57, SM58)
- **Condenser** - Detailed, sensitive, needs phantom power (U87, C414)
- **Ribbon** - Warm, vintage sound, fragile (Royer 121)

### Polar Patterns
- **Cardioid** - Front pickup, rejects rear
- **Figure-8** - Front and rear pickup
- **Omnidirectional** - Picks up all directions
- **Hypercardioid** - Tighter than cardioid

---

## EQ (Equalization)

### What EQ Does
EQ adjusts the volume of specific frequency ranges. Use it to:
- Remove unwanted frequencies
- Enhance desired qualities
- Make space for instruments
- Fix tonal problems

### Frequency Ranges
- **Sub-bass (20-60 Hz)** - Felt more than heard, kick/bass fundamentals
- **Bass (60-250 Hz)** - Warmth, body, fullness
- **Low-mids (250-500 Hz)** - Muddy area, often cut here
- **Midrange (500 Hz-2 kHz)** - Presence, honk, nasal
- **Upper-mids (2-4 kHz)** - Clarity, attack, harshness
- **Presence (4-6 kHz)** - Brightness, definition
- **Air (6-20 kHz)** - Shimmer, breathiness, sparkle

### EQ Tips
- Cut before boosting
- Use narrow Q for problem frequencies
- Use wide Q for tonal shaping
- High-pass filter most tracks (except bass/kick)
- Reference on multiple speakers

### Common EQ Moves
- **Vocals**: High-pass 80-100 Hz, cut 200-300 Hz for clarity, boost 3-5 kHz for presence
- **Kick**: Boost 50-60 Hz for thump, cut 300-400 Hz for clarity, boost 3-5 kHz for attack
- **Snare**: Cut 300-500 Hz if boxy, boost 200 Hz for body, boost 5 kHz for snap
- **Bass**: High-pass 30-40 Hz, cut 200-300 Hz if muddy, boost 700-1000 Hz for growl
- **Acoustic Guitar**: High-pass 80-100 Hz, cut 200 Hz if boomy, boost 3-5 kHz for sparkle
- **Electric Guitar**: High-pass 80-100 Hz, cut 400-600 Hz if muddy, boost 2-4 kHz for bite

---

## Compression

### What Compression Does
Compressors reduce dynamic range - the difference between loud and quiet. They make quiet parts louder and loud parts quieter, resulting in:
- More consistent levels
- More punch and impact
- Better control over transients
- Glue for mixing elements together

### Compression Parameters
- **Threshold** - Level where compression starts (in dB)
- **Ratio** - How much to compress (2:1, 4:1, 10:1, etc.)
- **Attack** - How fast compression engages (ms)
- **Release** - How fast compression releases (ms)
- **Knee** - How gradually compression applies (soft/hard)
- **Makeup Gain** - Boost level after compression

### Attack and Release Tips
- **Fast attack** - Catches transients, can sound squashed
- **Slow attack** - Lets transients through, more punch
- **Fast release** - Pumping effect, aggressive
- **Slow release** - Smoother, more natural

### Compression Types
- **VCA** - Clean, precise (SSL G-Bus)
- **FET** - Fast, aggressive (1176)
- **Optical** - Smooth, musical (LA-2A)
- **Variable-mu** - Warm, vintage (Fairchild 670)

### Compression Applications
- **Vocals**: 3-6 dB reduction, medium attack, medium release
- **Drums**: Parallel compression for punch, fast attack for control
- **Bass**: Moderate compression for consistency
- **Bus/Mix**: Gentle 1-3 dB for glue

---

## Reverb

### What Reverb Does
Reverb simulates acoustic spaces. It adds:
- Sense of space and depth
- Ambience and atmosphere
- Cohesion between elements
- Size and dimension

### Reverb Types
- **Hall** - Large concert hall, long decay
- **Room** - Smaller spaces, natural
- **Plate** - Smooth, bright, artificial
- **Chamber** - Echo chamber simulation
- **Spring** - Guitar amp style, bouncy
- **Convolution** - Real space impulse responses

### Reverb Parameters
- **Decay/RT60** - How long reverb lasts
- **Pre-delay** - Delay before reverb starts
- **Early reflections** - Initial bounces
- **Damping** - High frequency decay
- **Size** - Room dimensions
- **Wet/Dry** - Mix of effect

### Reverb Tips
- Use pre-delay to separate source from reverb
- Less reverb on bass frequencies
- Different reverbs for different elements
- Automate reverb for builds
- Use sends, not inserts

---

## Delay

### What Delay Does
Delay creates echoes of the original sound. Uses include:
- Adding depth and space
- Creating rhythmic effects
- Widening sounds
- Special effects

### Delay Types
- **Digital** - Clean, precise repeats
- **Analog** - Warmer, degrading repeats
- **Tape** - Modulated, saturated, wow/flutter
- **Ping-pong** - Bounces left/right

### Delay Parameters
- **Time** - Delay length (ms or note values)
- **Feedback** - Number of repeats
- **Mix** - Wet/dry balance
- **Filter** - EQ on delayed signal
- **Modulation** - Pitch variation

### Delay Techniques
- **Slap-back** - Single short echo (75-150ms)
- **Tempo-sync** - Delay in rhythm (1/4, 1/8, dotted)
- **Throw** - Automated send for emphasis
- **Stereo delay** - Different times left/right

---

## Mixing Concepts

### Frequency Balance
Every instrument needs its own frequency space:
- **Kick and bass** - Share low end, use EQ to separate
- **Vocals and guitars** - Compete in mids, carve space
- **Cymbals and vocals** - Both bright, watch sibilance

### Depth (Front to Back)
Create depth with:
- **Volume** - Louder = closer
- **Reverb** - More reverb = further away
- **EQ** - Brighter = closer
- **Compression** - More compressed = closer

### Width (Left to Right)
Use panning and stereo effects:
- **Drums** - Overhead/rooms wide, kick/snare center
- **Guitars** - Double-tracked, panned opposite
- **Vocals** - Lead center, harmonies wide
- **Keys/Pads** - Wide for atmosphere

### Contrast and Dynamics
- Verse quieter than chorus
- Build sections gradually
- Create moments of impact
- Don't compress everything flat

---

## MIDI Production

### MIDI vs Audio
- **Audio** - Recorded sound waves
- **MIDI** - Performance data (notes, timing, velocity)
- MIDI is infinitely editable
- MIDI requires an instrument to make sound

### Virtual Instruments
- **Synthesizers** - Create sounds from oscillators
- **Samplers** - Play back recorded samples
- **Drum machines** - Trigger drum sounds
- **Orchestral libraries** - Realistic orchestral sounds

### MIDI Editing Techniques
- **Quantize** - Snap to grid
- **Humanize** - Add random timing
- **Velocity layers** - Harder hits = louder
- **CC automation** - Expression, modulation

### Programming Tips
- Start with a good sound, don't over-process
- Use velocity for dynamics
- Automate expression (CC11) for realism
- Layer instruments for richness
- Program in small sections

---

## Song Structure

### Common Sections
- **Intro** - Set the mood, 4-8 bars
- **Verse** - Tell the story, lower energy
- **Pre-chorus** - Build tension
- **Chorus** - Main hook, highest energy
- **Bridge** - Contrast, new perspective
- **Outro** - Wind down, resolve

### Arrangement Tips
- Create contrast between sections
- Use dynamics to guide the listener
- Add/remove elements for movement
- Think in 4, 8, 16 bar phrases
- Build to key moments

### Energy Arc
Typical song energy flow:
1. Intro - Low
2. Verse 1 - Medium-low
3. Chorus 1 - High
4. Verse 2 - Medium
5. Chorus 2 - Higher
6. Bridge - Different
7. Final Chorus - Highest
8. Outro - Resolving

---

## Genre-Specific Tips

### Pop/Top 40
- Clear, upfront vocals
- Strong, defined bass
- Punchy, compressed drums
- Wide, full choruses
- Reference loudness: -9 to -7 LUFS

### Rock
- Guitar-forward mix
- Natural drum sound
- Bass supporting guitars
- Room and energy
- Reference loudness: -10 to -8 LUFS

### Hip-Hop/Trap
- Dominant bass and 808s
- Crisp, punchy drums
- Vocals with presence
- Heavy use of effects
- Reference loudness: -8 to -6 LUFS

### Electronic/EDM
- Heavy sidechain compression
- Wide, evolving synths
- Powerful low end
- Build-ups and drops
- Reference loudness: -7 to -5 LUFS

### Acoustic/Folk
- Natural, organic sound
- Minimal processing
- Room ambience
- Dynamic range preserved
- Reference loudness: -14 to -10 LUFS

---

## Common Mistakes to Avoid

### Recording
- Not checking levels before recording
- Recording too hot (clipping)
- Poor microphone placement
- Ignoring room acoustics
- Not doing test recordings

### Editing
- Over-editing (losing feel)
- Quantizing too hard
- Not cleaning up before mixing
- Forgetting to save

### Mixing
- Mixing too loud (ear fatigue)
- Over-compressing
- Too much reverb
- Not using reference tracks
- Ignoring mono compatibility

### General
- Not taking breaks
- Skipping the arrangement
- Fixing it in the mix
- Ignoring the fundamentals






