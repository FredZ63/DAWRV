#!/usr/bin/env python3
"""
RHEA Voice Listener using Deepgram Nova-2
Ultra-fast, highly accurate voice recognition for DAWRV commands
"""
import sys
import time
import os
import json

print('🎤 RHEA Voice Listener (Deepgram Nova-2) Starting...', flush=True)

# Check for dependencies
def install_package(package_name):
    """Install a package, trying with and without --break-system-packages"""
    import subprocess
    import sys
    
    def run_pip_install(cmd):
        """Run pip install and suppress warnings"""
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            # Filter out pip upgrade notices and warnings
            stderr_lines = result.stderr.split('\n')
            filtered_stderr = []
            for line in stderr_lines:
                line_lower = line.lower()
                # Skip pip upgrade notices, warnings, and non-error messages
                if any(skip in line_lower for skip in ['notice', 'warning', 'upgrade', 'new release', 'to update']):
                    continue
                if line.strip():
                    filtered_stderr.append(line)
            
            # Only print actual errors
            if filtered_stderr:
                for line in filtered_stderr:
                    if line.strip():
                        print(line, file=sys.stderr, flush=True)
            
            # Check stdout for "Successfully installed" or "Requirement already satisfied"
            stdout_lower = result.stdout.lower()
            if 'successfully installed' in stdout_lower or 'requirement already satisfied' in stdout_lower:
                return 0  # Force success if package is installed
            
            return result.returncode
        except Exception as e:
            return os.system(cmd)
    
    result = run_pip_install(f'pip3 install {package_name} --break-system-packages --quiet')
    if result != 0:
        print(f'   Retrying without --break-system-packages flag...', flush=True)
        result = run_pip_install(f'pip3 install {package_name} --quiet')
        if result != 0:
            print(f'   Retrying with --user flag...', flush=True)
            result = run_pip_install(f'pip3 install --user {package_name} --quiet')
    return result

# Check for deepgram-sdk
try:
    from deepgram import DeepgramClient, PrerecordedOptions, FileSource
    print('✅ Deepgram SDK found', flush=True)
except ImportError:
    print('📦 Installing Deepgram SDK...', flush=True)
    result = install_package('deepgram-sdk')
    if result != 0:
        print('⚠️  Installation returned non-zero, but trying to import anyway...', flush=True)
    time.sleep(2)
    try:
        from deepgram import DeepgramClient, PrerecordedOptions, FileSource
        print('✅ Deepgram SDK installed successfully', flush=True)
    except ImportError as e:
        print('❌ Failed to install Deepgram SDK', flush=True)
        print(f'   Error: {e}', flush=True)
        print('   Please run manually: pip3 install deepgram-sdk', flush=True)
        print('', flush=True)
        print('⚠️  Falling back to Whisper...', flush=True)
        sys.exit(1)

# Check for PyAudio
try:
    import pyaudio
    print('✅ PyAudio found', flush=True)
except ImportError:
    print('📦 Installing PyAudio...', flush=True)
    install_package('pyaudio')
    time.sleep(2)
    try:
        import pyaudio
        print('✅ PyAudio installed successfully', flush=True)
    except ImportError:
        print('❌ Failed to install PyAudio', flush=True)
        print('   Please run manually: pip3 install pyaudio', flush=True)
        sys.exit(1)

# Check for numpy
try:
    import numpy as np
    print('✅ NumPy found', flush=True)
except ImportError:
    print('📦 Installing NumPy...', flush=True)
    install_package('numpy')
    time.sleep(2)
    try:
        import numpy as np
        print('✅ NumPy installed successfully', flush=True)
    except ImportError:
        print('❌ Failed to install NumPy', flush=True)
        sys.exit(1)

print('\n✅ All dependencies ready!', flush=True)

# Load Deepgram API key
DEEPGRAM_API_KEY = os.getenv('DEEPGRAM_API_KEY')
if not DEEPGRAM_API_KEY:
    print('❌ DEEPGRAM_API_KEY environment variable not set!', flush=True)
    print('', flush=True)
    print('💡 To set your API key:', flush=True)
    print('   1. Get free $200 credit at: https://console.deepgram.com/signup', flush=True)
    print('   2. Create an API key in your dashboard', flush=True)
    print('   3. Set in DAWRV AI Settings → Voice Recognition', flush=True)
    print('', flush=True)
    print('⚠️  Falling back to Whisper...', flush=True)
    sys.exit(1)

# Initialize Deepgram client
try:
    deepgram = DeepgramClient(DEEPGRAM_API_KEY)
    print('✅ Deepgram client initialized!', flush=True)
except Exception as e:
    print(f'❌ Failed to initialize Deepgram: {e}', flush=True)
    print('⚠️  Falling back to Whisper...', flush=True)
    sys.exit(1)

# Audio configuration
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000

# VAD (Voice Activity Detection) settings
SILENCE_THRESHOLD = 300  # Adjust based on your mic
MIN_SPEECH_CHUNKS = 3    # Minimum chunks to consider as speech
MAX_SILENCE_CHUNKS = 12  # Stop after this many silent chunks (after speech detected)
MAX_RECORDING_CHUNKS = int(RATE / CHUNK * 6)  # Max 6 seconds

# Initialize PyAudio
audio = pyaudio.PyAudio()

# Command file path
COMMAND_FILE = '/tmp/dawrv_voice_command.txt'

def record_audio():
    """Record audio with Voice Activity Detection"""
    stream = audio.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        frames_per_buffer=CHUNK
    )
    
    print('🎧 Listening...', flush=True)
    
    frames = []
    speech_detected = False
    silence_chunks = 0
    speech_chunks = 0
    
    for i in range(MAX_RECORDING_CHUNKS):
        data = stream.read(CHUNK, exception_on_overflow=False)
        
        # Convert to numpy array for volume detection
        audio_data = np.frombuffer(data, dtype=np.int16)
        volume = np.abs(audio_data).mean()
        
        # Detect speech
        if volume > SILENCE_THRESHOLD:
            speech_chunks += 1
            silence_chunks = 0
            
            if speech_chunks >= MIN_SPEECH_CHUNKS and not speech_detected:
                speech_detected = True
                print('🗣️  Speech detected...', flush=True)
            
            frames.append(data)
        else:
            if speech_detected:
                silence_chunks += 1
                frames.append(data)
                
                # Stop recording if we've had enough silence after detecting speech
                if silence_chunks >= MAX_SILENCE_CHUNKS:
                    print('✅ Complete phrase captured', flush=True)
                    break
    
    stream.stop_stream()
    stream.close()
    
    # Convert to bytes
    audio_bytes = b''.join(frames)
    
    return audio_bytes

def transcribe_audio(audio_data):
    """Transcribe audio using Deepgram Nova-2"""
    try:
        # Configure Deepgram options
        options = PrerecordedOptions(
            model="nova-2",
            language="en",
            punctuate=False,  # No punctuation for commands
            smart_format=False,  # No smart formatting
            keywords=[
                # DAW Commands
                "play", "stop", "record", "pause", "undo", "redo",
                "tempo", "BPM", "bar", "measure", "marker",
                "mute", "unmute", "solo", "unsolo", "track",
                "save", "zoom", "rewind", "loop",
                # Numbers with context
                "bar:3", "track:3", "marker:3", "tempo:3",
                # Conversational
                "thank you:3", "thanks:3", "hello:2", "goodbye:2",
                "help:2", "listening:2"
            ],
            utterances=False,
            diarize=False
        )
        
        # Prepare audio payload
        payload = {
            "buffer": audio_data
        }
        
        # Transcribe
        response = deepgram.listen.prerecorded.v("1").transcribe_file(payload, options)
        
        # Extract transcript
        transcript = response["results"]["channels"][0]["alternatives"][0]["transcript"]
        text = transcript.strip()
        
        return text
    except Exception as e:
        print(f'⚠️  Deepgram transcription error: {e}', flush=True)
        return None

print('✅ Deepgram Nova-2 Ready! (Response time: 200-500ms)\n', flush=True)

# Deduplication: track last command to prevent writing duplicates
last_written_command = None
last_write_time = 0
write_cooldown = 2.0  # Don't write same command within 2 seconds

while True:
    try:
        # Record audio
        audio_data = record_audio()
        
        if not audio_data or len(audio_data) < 1000:
            print('⚠️  No audio captured, trying again...', flush=True)
            continue
        
        # Transcribe with Deepgram
        text = transcribe_audio(audio_data)
        
        if text and len(text) > 0:
            print(f'✅ Heard: "{text}"', flush=True)
            
            # Normalize for deduplication
            normalized = text.lower().strip()
            now = time.time()
            
            # Check for duplicates
            if (normalized == last_written_command and 
                (now - last_write_time) < write_cooldown):
                print('   (Duplicate detected, skipping)', flush=True)
                continue
            
            # Write to command file
            try:
                with open(COMMAND_FILE, 'w') as f:
                    f.write(text)
                print(f'📝 Command written to file', flush=True)
                
                last_written_command = normalized
                last_write_time = now
            except Exception as e:
                print(f'⚠️  Failed to write command file: {e}', flush=True)
        else:
            print('⚠️  No speech detected or transcription failed', flush=True)
        
        # Small delay before next listen cycle
        time.sleep(0.1)
        
    except KeyboardInterrupt:
        print('\n👋 Stopping voice listener...', flush=True)
        break
    except Exception as e:
        print(f'⚠️  Error in main loop: {e}', flush=True)
        time.sleep(1)

# Cleanup
audio.terminate()
print('✅ Voice listener stopped', flush=True)

