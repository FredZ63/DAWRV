#!/usr/bin/env python3
"""
RHEA Voice Listener using Deepgram Nova-2 API (SDK v5+)
Real-time, highly accurate voice recognition for DAWRV commands
"""
import sys
import os
import asyncio
import time

print('🎤 Starting Deepgram Nova-2...', flush=True)

# Check for Deepgram API Key FIRST (before imports)
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY")
if not DEEPGRAM_API_KEY:
    print('❌ DEEPGRAM_API_KEY not set', file=sys.stderr, flush=True)
    sys.exit(1)

# Fast imports - no verbose messages during startup
try:
    from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
    import pyaudio
    import numpy as np
except ImportError as e:
    print(f'❌ Missing: {e}', file=sys.stderr, flush=True)
    sys.exit(1)

# Audio recording parameters
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  # Deepgram prefers 16kHz
CHUNK = 1024  # Buffer size

# Output file for commands
COMMAND_FILE = '/tmp/dawrv_voice_command.txt'

# Deduplication: track last command to prevent writing duplicates
last_written_command = None
last_write_time = 0
write_cooldown = 1.0  # Don't write same command within 1 second

async def listen_and_transcribe():
    global last_written_command, last_write_time
    
    # Initialize PyAudio
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK)
    
    print('✅ Microphone initialized', flush=True)
    
    # Create Deepgram client (SDK v3.7.0)
    try:
        deepgram = DeepgramClient(DEEPGRAM_API_KEY)
        # Use websocket API (recommended over deprecated live API)
        dg_connection = deepgram.listen.websocket.v("1")
    except Exception as e:
        print(f'❌ Connection failed: {e}', file=sys.stderr, flush=True)
        stream.stop_stream()
        stream.close()
        p.terminate()
        sys.exit(1)
    
    # Configure live transcription options
    options = LiveOptions(
        model="nova-2",
        language="en-US",
        smart_format=True,
        encoding="linear16",
        channels=CHANNELS,
        sample_rate=RATE,
        interim_results=False,  # Only final results
        punctuate=True,
        utterance_end_ms=1000  # End utterance after 1 second of silence
    )
    
    # Set up event handlers
    def on_message(self, result, **kwargs):
        global last_written_command, last_write_time
        
        sentence = result.channel.alternatives[0].transcript
        if sentence:
            # Filter out very short transcripts (likely false triggers)
            sentence_stripped = sentence.strip()
            if len(sentence_stripped) < 3:
                print(f'⏩ Ignoring short transcript (likely noise): "{sentence}"', flush=True)
                return
            
            # Filter out ambient noise words
            ambient_noises = ['uh', 'um', 'ah', 'oh', 'mm', 'hm', 'shh', 'hmm']
            if sentence_stripped.lower() in ambient_noises:
                print(f'⏩ Ignoring ambient noise: "{sentence}"', flush=True)
                return
            
            print(f'✅ Heard (Deepgram): "{sentence}"', flush=True)
            
            # Deduplication logic
            now = time.time()
            if sentence.lower() != last_written_command or (now - last_write_time) > write_cooldown:
                with open(COMMAND_FILE, 'w') as f:
                    f.write(sentence)
                last_written_command = sentence.lower()
                last_write_time = now
                print(f'📝 Command written to {COMMAND_FILE}', flush=True)
            else:
                print('⏩ Duplicate command, skipping write.', flush=True)
    
    def on_error(self, error, **kwargs):
        print(f'❌ Deepgram error: {error}', file=sys.stderr, flush=True)
    
    def on_close(self, close_msg, **kwargs):
        print('🔌 Deepgram connection closed', flush=True)
    
    # Register event handlers
    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
    dg_connection.on(LiveTranscriptionEvents.Error, on_error)
    dg_connection.on(LiveTranscriptionEvents.Close, on_close)
    
    # Start the connection (SDK v3.7.0 - start() returns bool, not awaitable)
    try:
        started = dg_connection.start(options)
        if not started:
            print('❌ Failed to start Deepgram connection', file=sys.stderr, flush=True)
            stream.stop_stream()
            stream.close()
            p.terminate()
            sys.exit(1)
    except Exception as e:
        print(f'❌ Connection start error: {e}', file=sys.stderr, flush=True)
        stream.stop_stream()
        stream.close()
        p.terminate()
        sys.exit(1)
    
    print('✅ Deepgram Nova-2 Ready! (Response time: 200-500ms)', flush=True)
    print('Ready!', flush=True)  # Signal to Electron that we're ready
    print('🎧 Listening...', flush=True)
    
    # Stream audio to Deepgram
    try:
        while True:
            data = stream.read(CHUNK, exception_on_overflow=False)
            dg_connection.send(data)  # SDK v3.7.0 - send() is not async
            await asyncio.sleep(0.01)  # Small delay to prevent blocking
    except KeyboardInterrupt:
        print('🛑 Stopping...', flush=True)
    except Exception as e:
        print(f'❌ Error in audio loop: {e}', file=sys.stderr, flush=True)
    finally:
        # Clean up
        dg_connection.finish()  # SDK v3.7.0 - finish() is not async
        stream.stop_stream()
        stream.close()
        p.terminate()
        print('✅ Deepgram listener stopped', flush=True)

if __name__ == '__main__':
    try:
        asyncio.run(listen_and_transcribe())
    except KeyboardInterrupt:
        print('🛑 Deepgram listener interrupted by user.', flush=True)
    except Exception as e:
        print(f'❌ Deepgram listener main error: {e}', file=sys.stderr, flush=True)
        sys.exit(1)
