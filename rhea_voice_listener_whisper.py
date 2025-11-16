#!/usr/bin/env python3
"""
RHEA Voice Listener using OpenAI Whisper
Offline, accurate voice recognition for DAWRV commands
"""
import sys
import time
import os
import io

print('🎤 RHEA Voice Listener (Whisper) Starting...', flush=True)

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
            stderr_lines = result.stderr.split('\n')
            filtered_stderr = []
            for line in stderr_lines:
                line_upper = line.upper()
                line_lower = line.lower()
                if 'WARNING' in line_upper and ('upgrade' in line_lower or 'version' in line_lower):
                    continue
                if line.strip():
                    filtered_stderr.append(line)
            
            if filtered_stderr:
                for line in filtered_stderr:
                    if line.strip() and not line.strip().startswith('WARNING'):
                        print(line, file=sys.stderr, flush=True)
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

# Check for Whisper
try:
    import whisper
    print('✅ Whisper found', flush=True)
except ImportError:
    print('📦 Installing Whisper...', flush=True)
    install_package('openai-whisper')
    time.sleep(2)
    try:
        import whisper
        print('✅ Whisper installed successfully', flush=True)
    except ImportError:
        print('❌ Failed to install Whisper', flush=True)
        print('   Please run manually: pip3 install openai-whisper', flush=True)
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

# Check for numpy (required by whisper)
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
print('📥 Loading Whisper model (this may take a moment on first run)...', flush=True)

# Handle SSL certificate issues on macOS
import ssl
import urllib.request

# Create SSL context that doesn't verify certificates (for model download only)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Monkey-patch urllib to use our SSL context for model downloads
original_urlopen = urllib.request.urlopen
def urlopen_with_ssl_fix(*args, **kwargs):
    if 'context' not in kwargs:
        kwargs['context'] = ssl_context
    return original_urlopen(*args, **kwargs)
urllib.request.urlopen = urlopen_with_ssl_fix

# Load Whisper model - use base model for good balance of speed and accuracy
# Options: tiny, base, small, medium, large
# 'base' is recommended for command recognition - fast and accurate
try:
    model = whisper.load_model("base")
    print('✅ Whisper model loaded!', flush=True)
except Exception as e:
    print(f'⚠️  Failed to load base model: {e}', flush=True)
    print('   Trying tiny model as fallback...', flush=True)
    try:
        model = whisper.load_model("tiny")
        print('✅ Whisper tiny model loaded!', flush=True)
    except Exception as e2:
        print(f'❌ Failed to load tiny model: {e2}', flush=True)
        print('', flush=True)
        print('💡 TROUBLESHOOTING:', flush=True)
        print('   1. Check your internet connection (needed for first-time model download)', flush=True)
        print('   2. Try installing Python certificates:', flush=True)
        print('      /Applications/Python\\ 3.13/Install\\ Certificates.command', flush=True)
        print('   3. Or manually download the model from:', flush=True)
        print('      https://openaipublic.azureedge.net/main/whisper/models/base.pt', flush=True)
        sys.exit(1)

print('🎧 RHEA is now listening for voice commands...', flush=True)
print('Say: play, stop, record, undo, save, or new track\n', flush=True)

# Audio recording setup
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  # Whisper works best with 16kHz
RECORD_SECONDS = 3  # Record 3 seconds at a time

try:
    audio = pyaudio.PyAudio()
    print('✅ Audio system initialized', flush=True)
except Exception as e:
    print(f'❌ Audio initialization error: {e}', flush=True)
    sys.exit(1)

command_file = '/tmp/dawrv_voice_command.txt'

def record_audio():
    """Record audio from microphone"""
    stream = audio.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        frames_per_buffer=CHUNK
    )
    
    print('🎧 Listening...', flush=True)
    frames = []
    
    for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
        data = stream.read(CHUNK)
        frames.append(data)
    
    stream.stop_stream()
    stream.close()
    
    # Convert to numpy array for Whisper
    audio_data = b''.join(frames)
    audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
    
    return audio_np

def transcribe_audio(audio_data):
    """Transcribe audio using Whisper"""
    try:
        # Whisper expects audio at 16kHz, which we're already providing
        result = model.transcribe(audio_data, language='en', task='transcribe')
        text = result['text'].strip()
        return text
    except Exception as e:
        print(f'⚠️  Transcription error: {e}', flush=True)
        return None

print('✅ Ready! Starting continuous listening...\n', flush=True)

# Deduplication: track last command to prevent writing duplicates
last_written_command = None
last_write_time = 0
write_cooldown = 2.0  # Don't write same command within 2 seconds

while True:
    try:
        # Record audio
        audio_data = record_audio()
        
        # Transcribe with Whisper
        text = transcribe_audio(audio_data)
        
        if text and len(text) > 0:
            print(f'✅ Heard: "{text}"', flush=True)
            
            # Deduplication: check if this is the same command as last time
            current_time = time.time()
            normalized_text = text.lower().strip()
            
            if (normalized_text == last_written_command and 
                (current_time - last_write_time) < write_cooldown):
                print(f'⏸️  Skipping duplicate command (within cooldown): "{text}"', flush=True)
                continue  # Skip writing this duplicate
            
            # Write to file for DAWRV to read
            try:
                if os.path.exists(command_file):
                    os.remove(command_file)
                with open(command_file, 'w') as f:
                    f.write(text)
                    f.flush()
                    os.fsync(f.fileno())
                print(f'📝 Command written: "{text}"', flush=True)
                
                # Update deduplication tracking
                last_written_command = normalized_text
                last_write_time = current_time
            except Exception as e:
                print(f'⚠️  Failed to write command: {e}', flush=True)
        else:
            print('❓ No speech detected', flush=True)
            
    except KeyboardInterrupt:
        print('\n\n👋 RHEA Voice Listener stopped', flush=True)
        break
    except Exception as e:
        print(f'⚠️  Error: {e}', flush=True)
        import traceback
        traceback.print_exc()
        time.sleep(1)

# Cleanup
audio.terminate()

