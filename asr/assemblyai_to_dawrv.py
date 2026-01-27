#!/usr/bin/env python3
"""
DAWRV AssemblyAI Streaming Integration
=====================================
Reliable, low-latency STT provider using AssemblyAI real-time streaming.

AssemblyAI is known for:
- High accuracy
- Low latency (~300-500ms)
- Reliable API
- Good for command recognition

Writes:
- /tmp/dawrv_asr_status.json  (partial + final)
- /tmp/dawrv_voice_command.txt (final only, for compatibility)
"""

import os
import sys
import json
import time
import asyncio
import audioop
import pyaudio
from typing import Optional

COMMAND_FILE = "/tmp/dawrv_voice_command.txt"
STATUS_FILE = "/tmp/dawrv_asr_status.json"
SPEAKING_SIGNAL_FILE = "/tmp/rhea_speaking"
USER_SPEAKING_FILE = "/tmp/dawrv_user_speaking.json"

# Audio settings
SAMPLE_RATE = 16000
CHUNK_FRAMES = 1024
CHANNELS = 1
FORMAT = pyaudio.paInt16

# VAD settings
VAD_RMS_THRESHOLD = int(os.environ.get("DAWRV_VAD_RMS_THRESHOLD", "400"))
VAD_MIN_INTERVAL_S = float(os.environ.get("DAWRV_VAD_MIN_INTERVAL_S", "0.05"))
last_vad_ts = 0.0


def _is_rhea_speaking():
    """Check if RHEA is currently speaking (to avoid TTS feedback loops)."""
    return os.path.exists(SPEAKING_SIGNAL_FILE)


def _write_user_speaking(rms=0):
    """Write VAD signal for barge-in detection."""
    try:
        data = {"speaking": True, "timestamp": time.time(), "rms": rms}
        with open(USER_SPEAKING_FILE, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


def _write_status(text: str, confidence: float, mode: str, is_final: bool):
    """Write ASR status to JSON file."""
    try:
        data = {
            "text": text,
            "confidence": confidence,
            "mode": mode,
            "timestamp": time.time(),
            "isFinal": is_final
        }
        with open(STATUS_FILE, "w") as f:
            json.dump(data, f)
    except Exception as e:
        print(f"⚠️ Failed to write status: {e}", file=sys.stderr, flush=True)


def _write_command(text: str):
    """Write final command to text file."""
    try:
        with open(COMMAND_FILE, "w") as f:
            f.write(text.strip() + "\n")
    except Exception as e:
        print(f"⚠️ Failed to write command: {e}", file=sys.stderr, flush=True)


async def main():
    api_key = os.environ.get("ASSEMBLYAI_API_KEY")
    if not api_key:
        print("❌ ASSEMBLYAI_API_KEY not set", file=sys.stderr, flush=True)
        print("   Get your key at: https://www.assemblyai.com/app/account", file=sys.stderr, flush=True)
        sys.exit(1)
    
    # Log key info for debugging
    key_preview = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
    print(f"🔑 Using AssemblyAI API key: {key_preview} (length: {len(api_key)})", flush=True)
    
    mode = os.environ.get("DAWRV_ASR_MODE", "command")
    
    try:
        from assemblyai import Transcriber
    except ImportError:
        print("❌ Missing dependency: assemblyai", file=sys.stderr, flush=True)
        print("   Install: pip3 install assemblyai", file=sys.stderr, flush=True)
        sys.exit(1)
    
    print("🎤 AssemblyAI Streaming STT starting...", flush=True)
    
    # Initialize audio
    pa = pyaudio.PyAudio()
    stream = pa.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=CHUNK_FRAMES,
    )
    
    # Initialize AssemblyAI transcriber
    transcriber = Transcriber(api_key=api_key)
    
    # Create real-time session
    try:
        rt_session = transcriber.realtime.stream(
            sample_rate=SAMPLE_RATE,
            word_boost=["reaper", "track", "mute", "solo", "arm", "record", "play", "stop", "undo", "redo", "save"],
            # Optimize for commands
            punctuate=True,
            format_text=True,
        )
        
        print("✅ AssemblyAI streaming ready", flush=True)
        print("🎧 Listening... (Ctrl+C to stop)", flush=True)
        
        async def send_audio():
            """Send audio chunks to AssemblyAI."""
            while True:
                try:
                    if _is_rhea_speaking():
                        await asyncio.sleep(0.01)
                        continue
                    
                    data = stream.read(CHUNK_FRAMES, exception_on_overflow=False)
                    
                    # VAD for barge-in
                    try:
                        rms = audioop.rms(data, 2)
                        now = time.time()
                        if rms >= VAD_RMS_THRESHOLD and (now - last_vad_ts) >= VAD_MIN_INTERVAL_S:
                            global last_vad_ts
                            last_vad_ts = now
                            _write_user_speaking(rms=rms)
                    except Exception:
                        pass
                    
                    # Send to AssemblyAI
                    rt_session.send_audio(data)
                    await asyncio.sleep(0.01)
                    
                except Exception as e:
                    print(f"⚠️ Audio send error: {e}", file=sys.stderr, flush=True)
                    await asyncio.sleep(0.1)
        
        async def receive_transcripts():
            """Receive transcripts from AssemblyAI."""
            try:
                async for message in rt_session:
                    if message.type == "SessionBegins":
                        print("✅ AssemblyAI session started", flush=True)
                    elif message.type == "PartialTranscript":
                        text = message.text or ""
                        if text.strip():
                            _write_status(text, 0.7, mode, is_final=False)
                    elif message.type == "FinalTranscript":
                        text = message.text or ""
                        confidence = getattr(message, "confidence", 0.85) or 0.85
                        if text.strip():
                            print(f"📝 Transcript: {text}", flush=True)
                            _write_status(text, confidence, mode, is_final=True)
                            _write_command(text)
                    elif message.type == "SessionTerminated":
                        print("🔌 AssemblyAI session terminated", flush=True)
                        break
            except Exception as e:
                error_str = str(e)
                print(f"❌ AssemblyAI error: {error_str}", file=sys.stderr, flush=True)
                if "401" in error_str or "unauthorized" in error_str.lower() or "invalid" in error_str.lower():
                    print("❌ AssemblyAI authentication failed. Check your API key.", file=sys.stderr, flush=True)
                raise
        
        # Run both tasks concurrently
        await asyncio.gather(
            send_audio(),
            receive_transcripts()
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Stopping...", flush=True)
    except Exception as e:
        error_str = str(e)
        print(f"❌ AssemblyAI error: {error_str}", file=sys.stderr, flush=True)
        if "401" in error_str or "unauthorized" in error_str.lower():
            print("❌ AssemblyAI authentication failed. Check your ASSEMBLYAI_API_KEY.", file=sys.stderr, flush=True)
        sys.exit(1)
    finally:
        try:
            rt_session.close()
        except Exception:
            pass
        stream.stop_stream()
        stream.close()
        pa.terminate()
        print("✅ AssemblyAI stopped", flush=True)


if __name__ == "__main__":
    asyncio.run(main())








