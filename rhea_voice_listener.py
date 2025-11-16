#!/usr/bin/env python3
import sys
import time
import os

print('🎤 RHEA Voice Listener Starting...', flush=True)

# Check for dependencies
def install_package(package_name):
    """Install a package, trying with and without --break-system-packages"""
    import subprocess
    import sys
    
    # Suppress pip warnings by redirecting stderr
    def run_pip_install(cmd):
        """Run pip install and suppress warnings"""
        try:
            # Use subprocess to capture and filter output
            result = subprocess.run(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            # Filter out pip upgrade warnings
            stderr_lines = result.stderr.split('\n')
            filtered_stderr = []
            for line in stderr_lines:
                line_upper = line.upper()
                line_lower = line.lower()
                # Skip pip upgrade warnings
                if 'WARNING' in line_upper and ('upgrade' in line_lower or 'version' in line_lower):
                    continue
                # Keep other messages
                if line.strip():
                    filtered_stderr.append(line)
            
            # Only print actual errors, not warnings
            if filtered_stderr:
                for line in filtered_stderr:
                    if line.strip() and not line.strip().startswith('WARNING'):
                        print(line, file=sys.stderr, flush=True)
            return result.returncode
        except Exception as e:
            # Fallback to os.system if subprocess fails
            return os.system(cmd)
    
    # Try with --break-system-packages first (Python 3.11+)
    result = run_pip_install(f'pip3 install {package_name} --break-system-packages --quiet')
    if result != 0:
        # If that fails, try without the flag (older Python versions)
        print(f'   Retrying without --break-system-packages flag...', flush=True)
        result = run_pip_install(f'pip3 install {package_name} --quiet')
        if result != 0:
            # Try with --user flag as fallback
            print(f'   Retrying with --user flag...', flush=True)
            result = run_pip_install(f'pip3 install --user {package_name} --quiet')
    return result

try:
    import speech_recognition as sr
    print('✅ SpeechRecognition found', flush=True)
except ImportError:
    print('📦 Installing SpeechRecognition...', flush=True)
    install_package('SpeechRecognition')
    time.sleep(2)  # Give pip time to finish
    try:
        import speech_recognition as sr
        print('✅ SpeechRecognition installed successfully', flush=True)
    except ImportError:
        print('❌ Failed to install SpeechRecognition', flush=True)
        print('   Please run manually: pip3 install SpeechRecognition', flush=True)
        sys.exit(1)

try:
    import pyaudio
    print('✅ PyAudio found', flush=True)
except ImportError:
    print('📦 Installing PyAudio...', flush=True)
    install_package('pyaudio')
    time.sleep(2)  # Give pip time to finish
    try:
        import pyaudio
        print('✅ PyAudio installed successfully', flush=True)
    except ImportError:
        print('❌ Failed to install PyAudio', flush=True)
        print('   Please run manually: pip3 install pyaudio', flush=True)
        sys.exit(1)

print('\n✅ All dependencies ready!', flush=True)
print('🎧 RHEA is now listening for voice commands...', flush=True)
print('Say: play, stop, record, undo, save, or new track\n', flush=True)

recognizer = sr.Recognizer()

# Improve recognition settings
recognizer.energy_threshold = 300  # Lower threshold for better sensitivity
recognizer.dynamic_energy_threshold = True
recognizer.pause_threshold = 0.8  # Shorter pause before considering speech ended
recognizer.operation_timeout = None

try:
    microphone = sr.Microphone()
    print('✅ Microphone initialized', flush=True)
except Exception as e:
    print(f'❌ Microphone error: {e}', flush=True)
    sys.exit(1)

# Adjust for ambient noise with longer calibration
print('🔧 Calibrating microphone (this may take a few seconds)...', flush=True)
with microphone as source:
    recognizer.adjust_for_ambient_noise(source, duration=1.5)
print(f'✅ Calibration complete! Energy threshold: {recognizer.energy_threshold}\n', flush=True)

command_file = '/tmp/dawrv_voice_command.txt'

# Deduplication: track last command to prevent writing duplicates
last_written_command = None
last_write_time = 0
write_cooldown = 2.0  # Don't write same command within 2 seconds

while True:
    try:
        with microphone as source:
            print('🎧 Listening...', flush=True)
            # Increase phrase time limit for longer commands
            audio = recognizer.listen(source, timeout=None, phrase_time_limit=8)
        
        try:
            # Use Google Speech Recognition with language hint
            text = recognizer.recognize_google(audio, language='en-US')
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
                # Remove existing file first
                if os.path.exists(command_file):
                    os.remove(command_file)
                # Write new command
                with open(command_file, 'w') as f:
                    f.write(text)
                    f.flush()
                    os.fsync(f.fileno())  # Force write to disk
                print(f'📝 Command written: "{text}"', flush=True)
                
                # Update deduplication tracking
                last_written_command = normalized_text
                last_write_time = current_time
            except Exception as e:
                print(f'⚠️  Failed to write command: {e}', flush=True)
            
        except sr.UnknownValueError:
            print('❓ Could not understand audio - try speaking more clearly', flush=True)
        except sr.RequestError as e:
            print(f'❌ Recognition error: {e}', flush=True)
            print('   (This might be a network issue with Google Speech Recognition)', flush=True)
        except Exception as e:
            print(f'⚠️  Error: {e}', flush=True)
            
    except KeyboardInterrupt:
        print('\n\n👋 RHEA Voice Listener stopped', flush=True)
        break
    except Exception as e:
        print(f'Error in main loop: {e}', flush=True)
        time.sleep(1)
