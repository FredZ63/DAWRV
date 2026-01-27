#!/usr/bin/env python3
"""
DAWRV Gemini 2.5 Audio Integration
===================================
STT provider using Google Gemini 2.5 Audio API.

Writes:
- /tmp/dawrv_asr_status.json  (partial + final)
- /tmp/dawrv_voice_command.txt (final only, for compatibility)

Notes:
- Uses /tmp/rhea_speaking as a hard "mic mute" gate to avoid TTS feedback loops.
- Processes audio in chunks for near-real-time transcription.
"""

import os
import sys
import json
import time
import audioop
import pyaudio
import wave
import tempfile
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

# Transcription settings
MIN_AUDIO_DURATION_S = 0.5  # Minimum audio length to transcribe
MAX_AUDIO_DURATION_S = 10.0  # Maximum audio length per chunk
SILENCE_THRESHOLD = 200  # RMS threshold for silence detection
SILENCE_DURATION_S = 1.0  # Seconds of silence before finalizing


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


def _save_audio_chunk(audio_data, sample_rate=SAMPLE_RATE):
    """Save audio data to a temporary WAV file for Gemini API."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_path = tmp_file.name
            
            with wave.open(tmp_path, "wb") as wav_file:
                wav_file.setnchannels(CHANNELS)
                wav_file.setsampwidth(2)  # 16-bit = 2 bytes
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data)
            
            return tmp_path
    except Exception as e:
        print(f"⚠️ Failed to save audio chunk: {e}", file=sys.stderr, flush=True)
        return None


def _transcribe_audio_with_gemini(audio_path: str, api_key: str):
    """Transcribe audio file using Gemini 2.5 Audio API."""
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        
        # Use Gemini 2.5 Flash or Pro model with audio support
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Read audio file
        with open(audio_path, "rb") as audio_file:
            audio_data = audio_file.read()
        
        # Create prompt for transcription
        prompt = "Transcribe this audio accurately. Return only the spoken text, no additional commentary."
        
        # Generate transcription
        response = model.generate_content(
            [prompt, {"mime_type": "audio/wav", "data": audio_data}],
            generation_config={
                "temperature": 0.0,  # Deterministic for transcription
                "max_output_tokens": 1024,
            }
        )
        
        transcript = response.text.strip() if response.text else ""
        return transcript, 0.85  # Default confidence (Gemini doesn't provide confidence scores)
        
    except ImportError:
        print("❌ Missing dependency: google-generativeai", file=sys.stderr, flush=True)
        print("   Install: pip3 install google-generativeai", file=sys.stderr, flush=True)
        return None, 0.0
    except Exception as e:
        error_str = str(e)
        print(f"❌ Gemini transcription error: {error_str}", file=sys.stderr, flush=True)
        if "401" in error_str or "unauthorized" in error_str.lower() or "API_KEY" in error_str:
            print("❌ Gemini API authentication failed. Check your GEMINI_API_KEY.", file=sys.stderr, flush=True)
        return None, 0.0


def main():
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not set", file=sys.stderr, flush=True)
        print("   Set it via: export GEMINI_API_KEY='your_key'", file=sys.stderr, flush=True)
        sys.exit(1)
    
    # Log key info for debugging
    key_preview = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
    print(f"🔑 Using Gemini API key: {key_preview} (length: {len(api_key)})", flush=True)
    
    mode = os.environ.get("DAWRV_ASR_MODE", "command")
    
    try:
        import google.generativeai as genai
    except ImportError:
        print("❌ Missing dependency: google-generativeai", file=sys.stderr, flush=True)
        print("   Install: pip3 install google-generativeai", file=sys.stderr, flush=True)
        sys.exit(1)
    
    print("🎤 Gemini 2.5 Audio STT starting...", flush=True)
    
    # Initialize audio
    pa = pyaudio.PyAudio()
    stream = pa.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=CHUNK_FRAMES,
    )
    
    print("✅ Gemini Audio ready", flush=True)
    print("🎧 Listening... (Ctrl+C to stop)", flush=True)
    
    audio_buffer = []
    silence_chunks = 0
    last_speech_time = time.time()
    is_speaking = False
    
    try:
        while True:
            try:
                data = stream.read(CHUNK_FRAMES, exception_on_overflow=False)
                
                # VAD for barge-in detection
                try:
                    rms = audioop.rms(data, 2)
                    now = time.time()
                    if rms >= VAD_RMS_THRESHOLD and (now - last_vad_ts) >= VAD_MIN_INTERVAL_S:
                        last_vad_ts = now
                        _write_user_speaking(rms=rms)
                except Exception:
                    pass
                
                # Skip if RHEA is speaking
                if _is_rhea_speaking():
                    continue
                
                # Detect speech vs silence
                rms = audioop.rms(data, 2) if len(data) >= 2 else 0
                
                if rms > SILENCE_THRESHOLD:
                    # Speech detected
                    audio_buffer.append(data)
                    silence_chunks = 0
                    is_speaking = True
                    last_speech_time = time.time()
                else:
                    # Silence
                    silence_chunks += 1
                    
                    if is_speaking:
                        # We were speaking, check if we should finalize
                        silence_duration = (silence_chunks * CHUNK_FRAMES) / SAMPLE_RATE
                        audio_duration = len(audio_buffer) * CHUNK_FRAMES / SAMPLE_RATE
                        
                        # Finalize if enough silence OR max duration reached
                        if silence_duration >= SILENCE_DURATION_S or audio_duration >= MAX_AUDIO_DURATION_S:
                            if audio_duration >= MIN_AUDIO_DURATION_S:
                                # Convert buffer to bytes
                                audio_bytes = b''.join(audio_buffer)
                                
                                # Save to temp file
                                tmp_path = _save_audio_chunk(audio_bytes)
                                if tmp_path:
                                    try:
                                        # Transcribe
                                        transcript, confidence = _transcribe_audio_with_gemini(tmp_path, api_key)
                                        
                                        if transcript:
                                            # Write final transcript
                                            _write_status(transcript, confidence, mode, is_final=True)
                                            _write_command(transcript)
                                            print(f"📝 Transcript: {transcript}", flush=True)
                                        else:
                                            print("⚠️ No transcript returned", flush=True)
                                    finally:
                                        # Clean up temp file
                                        try:
                                            os.unlink(tmp_path)
                                        except Exception:
                                            pass
                            
                            # Reset buffer
                            audio_buffer = []
                            is_speaking = False
                            silence_chunks = 0
                    else:
                        # Not speaking, keep buffer small
                        if len(audio_buffer) > CHUNK_FRAMES * 2:
                            audio_buffer.pop(0)
                
            except Exception as e:
                print(f"⚠️ Audio read error: {e}", file=sys.stderr, flush=True)
                time.sleep(0.1)
                
    except KeyboardInterrupt:
        print("\n🛑 Stopping...", flush=True)
    finally:
        stream.stop_stream()
        stream.close()
        pa.terminate()
        print("✅ Gemini Audio stopped", flush=True)


if __name__ == "__main__":
    main()








