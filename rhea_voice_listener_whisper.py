#!/usr/bin/env python3
"""
RHEA Voice Listener - BULLETPROOF VERSION
=========================================
Offline Whisper-based voice recognition for DAWRV
- Explicitly selects MacBook microphone (avoids Pro Tools bridges)
- Robust audio capture with fallbacks
- Clear signal when speech is detected
"""
import sys
import time
import os
import signal

print('🎤 RHEA Voice Listener Starting...', flush=True)
print('=' * 50, flush=True)

# ============================================================================
# DEPENDENCY CHECK
# ============================================================================
try:
    import whisper
    print('✅ Whisper: OK', flush=True)
except ImportError:
    print('❌ Whisper not found. Run: pip3 install openai-whisper', flush=True)
    sys.exit(1)

try:
    import pyaudio
    print('✅ PyAudio: OK', flush=True)
except ImportError:
    print('❌ PyAudio not found. Run: pip3 install pyaudio', flush=True)
    sys.exit(1)

try:
    import numpy as np
    print('✅ NumPy: OK', flush=True)
except ImportError:
    print('❌ NumPy not found. Run: pip3 install numpy', flush=True)
    sys.exit(1)

print('=' * 50, flush=True)

# ============================================================================
# LOAD WHISPER MODEL - TINY FOR SPEED!
# ============================================================================
print('📥 Loading Whisper model (TINY for speed)...', flush=True)
try:
    model = whisper.load_model("tiny")  # FAST! ~0.5s processing
    print('✅ Whisper TINY model loaded! (ultra fast)', flush=True)
except Exception as e:
    print(f'❌ Model load failed: {e}', flush=True)
    sys.exit(1)

# ============================================================================
# AUDIO CONFIGURATION
# ============================================================================
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
RECORD_SECONDS = 4  # FASTER: Max 4 seconds recording

# Files
COMMAND_FILE = '/tmp/dawrv_voice_command.txt'
SPEAKING_SIGNAL = '/tmp/rhea_speaking'
SIGNAL_TIMEOUT = 30  # Auto-clear stuck signal after 30s

# ============================================================================
# FIND THE RIGHT MICROPHONE
# ============================================================================
def find_microphone():
    """Find the best microphone - External mic priority (louder signal)"""
    audio = pyaudio.PyAudio()
    
    print('\n🔍 Finding audio input device...', flush=True)
    
    macbook_mic = None
    external_mic = None
    
    # Find available mics
    for i in range(audio.get_device_count()):
        try:
            info = audio.get_device_info_by_index(i)
            if info['maxInputChannels'] > 0:
                name = info['name'].lower()
                print(f'   [{i}] {info["name"]}', flush=True)
                
                if 'macbook' in name or 'built-in' in name:
                    macbook_mic = i
                    print(f'       📍 MacBook mic available', flush=True)
                elif 'external' in name:
                    external_mic = i
                    print(f'       📍 External mic available', flush=True)
        except:
            pass
    
    # PRIORITY: External mic (usually louder), then MacBook
    selected = external_mic if external_mic is not None else macbook_mic
    
    if selected is None:
        # Fallback to system default
        try:
            default_info = audio.get_default_input_device_info()
            selected = default_info['index']
        except:
            selected = 0
    
    audio.terminate()
    print(f'\n   ✅ SELECTED: Device {selected}', flush=True)
    return selected

DEVICE_INDEX = find_microphone()
print(f'\n🎤 Using device index: {DEVICE_INDEX}', flush=True)

# ============================================================================
# AUDIO FUNCTIONS
# ============================================================================
def calculate_rms(audio_data):
    """Calculate audio level"""
    arr = np.frombuffer(audio_data, dtype=np.int16)
    return np.sqrt(np.mean(arr.astype(float)**2))

def is_rhea_speaking():
    """Check if RHEA is speaking (pause mic to prevent feedback)"""
    if not os.path.exists(SPEAKING_SIGNAL):
        return False
    
    # Auto-clear if stuck too long
    try:
        age = time.time() - os.path.getmtime(SPEAKING_SIGNAL)
        if age > SIGNAL_TIMEOUT:
            print(f'⚠️ Signal stuck for {age:.0f}s - clearing!', flush=True)
            os.remove(SPEAKING_SIGNAL)
            return False
    except:
        pass
    
    return True

def record_audio():
    """Record audio with voice activity detection - keeps pre-buffer for better capture"""
    audio = pyaudio.PyAudio()
    
    try:
        stream = audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            input_device_index=DEVICE_INDEX,
            frames_per_buffer=CHUNK
        )
    except Exception as e:
        print(f'❌ Failed to open microphone: {e}', flush=True)
        audio.terminate()
        return None
    
    # Keep a rolling pre-buffer (last 1 second before speech detected)
    from collections import deque
    PRE_BUFFER_CHUNKS = 15  # ~1 second of audio before speech
    pre_buffer = deque(maxlen=PRE_BUFFER_CHUNKS)
    
    speech_frames = []
    SILENCE_THRESHOLD = 80   # Balanced for external/MacBook mic
    MIN_SPEECH_CHUNKS = 3    # Need 3 chunks to confirm speech
    MAX_SILENCE_CHUNKS = 12  # End after ~0.8s silence
    
    speech_detected = False
    speech_chunks = 0
    silence_chunks = 0
    max_rms = 0
    
    max_chunks = int(RATE / CHUNK * RECORD_SECONDS)
    
    for i in range(max_chunks):
        try:
            data = stream.read(CHUNK, exception_on_overflow=False)
            
            # Convert to numpy
            arr = np.frombuffer(data, dtype=np.int16).copy()
            rms = np.sqrt(np.mean(arr.astype(float)**2))
            max_rms = max(max_rms, rms)
            
            # Show live level
            if i < 20 and i % 5 == 0:
                bars = int(min(rms / 50, 20))
                print(f'   📊 Level: {"█" * bars}{"░" * (20-bars)} ({rms:.0f})', flush=True)
            
            if not speech_detected:
                # Keep rolling buffer before speech
                pre_buffer.append(arr)
                
                if rms > SILENCE_THRESHOLD:
                    speech_chunks += 1
                    if speech_chunks >= MIN_SPEECH_CHUNKS:
                        speech_detected = True
                        print('🎤 Speech detected!', flush=True)
                        # Include pre-buffer in speech frames
                        speech_frames.extend(list(pre_buffer))
                else:
                    speech_chunks = max(0, speech_chunks - 1)  # Decay
            else:
                # Capturing speech
                speech_frames.append(arr)
                
                if rms > SILENCE_THRESHOLD:
                    silence_chunks = 0
                else:
                    silence_chunks += 1
                    if silence_chunks >= MAX_SILENCE_CHUNKS:
                        duration = len(speech_frames) * CHUNK / RATE
                        print(f'✅ Captured {duration:.1f}s of speech (peak: {max_rms:.0f})', flush=True)
                        break
        except Exception as e:
            print(f'⚠️ Read error: {e}', flush=True)
            break
    
    stream.stop_stream()
    stream.close()
    audio.terminate()
    
    if not speech_detected or len(speech_frames) < 10:
        print('🔇 No speech detected (speak louder!)', flush=True)
        return None
    
    # Convert to float32 for Whisper
    audio_np = np.concatenate(speech_frames).astype(np.float32) / 32768.0
    
    # Boost quiet audio
    max_val = np.abs(audio_np).max()
    if max_val > 0.01 and max_val < 0.5:
        boost = min(0.9 / max_val, 10.0)  # BOOST up to 10x for quiet mics
        audio_np = audio_np * boost
        print(f'   Audio boosted {boost:.1f}x: max={np.abs(audio_np).max():.3f}', flush=True)
    else:
        print(f'   Audio: max={max_val:.3f}, len={len(audio_np)}', flush=True)
    
    return audio_np

def transcribe_audio(audio_data):
    """Transcribe with Whisper"""
    if audio_data is None:
        return None
    
    try:
        # Normalize
        max_val = np.abs(audio_data).max()
        print(f'   Audio max level: {max_val:.3f}', flush=True)
        if max_val > 0.01:
            audio_data = audio_data * (0.7 / max_val)
        
        # Transcribe with optimized settings for short commands
        result = model.transcribe(
            audio_data,
            language='en',
            fp16=False,
            no_speech_threshold=0.3,   # Lower = more sensitive to quiet speech
            logprob_threshold=-1.5,    # Very lenient
            compression_ratio_threshold=2.8,
            initial_prompt="play stop record mute solo channel track one two three"  # Prime for DAW commands
        )
        
        text = result['text'].strip()
        print(f'   Whisper result: "{text}"', flush=True)
        
        # Filter out Whisper hallucinations
        hallucinations = ['thanks for watching', 'thank you', 'subscribe', 
                         'like and subscribe', 'see you next time', '...']
        text_lower = text.lower()
        for h in hallucinations:
            if h in text_lower:
                print(f'   Filtered hallucination: "{text}"', flush=True)
                return None
        
        return text if text else None
        
    except Exception as e:
        print(f'⚠️ Transcription error: {e}', flush=True)
        return None

def write_command(text):
    """Write command for DAWRV to read"""
    try:
        with open(COMMAND_FILE, 'w') as f:
            f.write(text)
        print(f'📝 Command written: {text}', flush=True)
    except Exception as e:
        print(f'❌ Write error: {e}', flush=True)

# ============================================================================
# MAIN LOOP
# ============================================================================
print('\n' + '=' * 50, flush=True)
print('🎧 RHEA is now listening!', flush=True)
print('   Say: "play", "stop", "record", "mute track 1"', flush=True)
print('   Ctrl+C to stop', flush=True)
print('=' * 50 + '\n', flush=True)

# Handle graceful shutdown
def signal_handler(sig, frame):
    print('\n\n👋 Shutting down...', flush=True)
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ============================================================================
# ECHO/FEEDBACK PREVENTION
# ============================================================================
# Words RHEA might say that we should NEVER interpret as commands
RHEA_RESPONSES = [
    'playing', 'here we go', 'rolling', 'let\'s hear it',
    'stopped', 'holding', 'all stopped', 
    'recording', 'we\'re rolling', 'go ahead',
    'got it', 'on it', 'sure thing', 'okay', 'done',
    'channel', 'soloed', 'muted', 'unmuted',
    'paused', 'rewinding', 'from the top'
]

def is_echo(text):
    """Check if transcribed text is likely RHEA's own voice (echo)"""
    if not text:
        return False
    text_lower = text.lower().strip()
    
    # Very short = likely echo fragment
    if len(text_lower) < 3:
        return True
    
    # Check for RHEA response phrases
    for phrase in RHEA_RESPONSES:
        if phrase in text_lower:
            print(f'🔇 Echo detected: "{text}" matches RHEA phrase "{phrase}"', flush=True)
            return True
    
    return False

# Main loop
last_command = None
last_time = 0
COOLDOWN = 2.5  # Longer cooldown to prevent loops
POST_SPEECH_DELAY = 1.5  # Wait 1.5s after RHEA speaks

while True:
    try:
        # Wait if RHEA is speaking
        if is_rhea_speaking():
            print('🔇 RHEA speaking - mic OFF...', flush=True)
            while is_rhea_speaking():
                time.sleep(0.1)
            # CRITICAL: Wait for echo to fade from room
            print(f'⏳ Waiting {POST_SPEECH_DELAY}s for echo to fade...', flush=True)
            time.sleep(POST_SPEECH_DELAY)
            print('👂 Resuming...', flush=True)
            continue
        
        print('🎧 Listening...', flush=True)
        
        # Record
        audio_data = record_audio()
        
        # Check AGAIN if RHEA started speaking during recording
        if is_rhea_speaking():
            print('🔇 RHEA started speaking during recording - discarding', flush=True)
            continue
        
        if audio_data is not None:
            print('🔄 Processing...', flush=True)
            text = transcribe_audio(audio_data)
            
            if text and len(text) > 1:
                # Check for echo
                if is_echo(text):
                    print(f'🔇 Rejected echo: "{text}"', flush=True)
                    continue
                
                # Deduplicate rapid commands
                now = time.time()
                if text != last_command or (now - last_time) > COOLDOWN:
                    print(f'\n✅ HEARD: "{text}"\n', flush=True)
                    write_command(text)
                    last_command = text
                    last_time = now
                else:
                    print(f'🔇 Duplicate ignored: "{text}"', flush=True)
        
        # Small pause between recordings
        time.sleep(0.3)
        
    except KeyboardInterrupt:
        print('\n👋 Stopped by user', flush=True)
        break
    except Exception as e:
        print(f'⚠️ Error: {e}', flush=True)
        time.sleep(1)

print('👋 RHEA Voice Listener stopped', flush=True)
