#!/usr/bin/env python3
"""
DAWRV Deepgram Streaming Integration
===================================
Hybrid / low-latency STT provider using Deepgram websocket streaming.

Writes:
- /tmp/dawrv_asr_status.json  (partial + final)
- /tmp/dawrv_voice_command.txt (final only, for compatibility)

Notes:
- Uses /tmp/rhea_speaking as a hard "mic mute" gate to avoid TTS feedback loops.
"""

import os
import sys
import json
import time
import asyncio
import audioop
from typing import Optional

COMMAND_FILE = "/tmp/dawrv_voice_command.txt"
STATUS_FILE = "/tmp/dawrv_asr_status.json"
SPEAKING_SIGNAL_FILE = "/tmp/rhea_speaking"
USER_SPEAKING_FILE = "/tmp/dawrv_user_speaking.json"


def _load_vocab_keywords(max_keywords: int = 60):
    """
    Load DAW/REAPER vocabulary keywords to improve Deepgram accuracy.
    Deepgram supports keyword boosting via `keywords` query param.
    Returns a list of strings, e.g. ["reaper:2", "mute:2"].
    """
    try:
        here = os.path.dirname(os.path.abspath(__file__))
        vocab_path = os.path.join(here, "vocab.json")
        if not os.path.exists(vocab_path):
            return []
        with open(vocab_path, "r") as f:
            vocab = json.load(f) or {}
        boost_words = vocab.get("boost_words") or []
        categories = (vocab.get("categories") or {})

        # Prefer single-word boosts; multi-word phrases can be flaky depending on SDK/version.
        words = []
        for w in boost_words:
            s = str(w or "").strip()
            if not s:
                continue
            if " " in s:
                continue
            words.append(s.lower())

        # Add core command words from categories (single-word only)
        for cat in ("transport_commands", "track_terms", "mixing_controls", "navigation", "values_and_numbers"):
            for w in (categories.get(cat) or []):
                s = str(w or "").strip()
                if not s or " " in s:
                    continue
                words.append(s.lower())

        # De-dupe, keep stable order
        seen = set()
        uniq = []
        for w in words:
            if w in seen:
                continue
            seen.add(w)
            uniq.append(w)

        # Apply a mild boost
        boost = int(os.environ.get("DAWRV_DEEPGRAM_KEYWORD_BOOST", "2"))
        uniq = uniq[:max_keywords]
        return [f"{w}:{boost}" for w in uniq]
    except Exception:
        return []


def _write_status(text: str, confidence: float, mode: str, *, is_final: bool):
    try:
        payload = {
            "text": text,
            "confidence": float(confidence) if confidence is not None else 0.0,
            "mode": mode,
            "timestamp": time.time(),
            "is_final": bool(is_final),
            "provider": "deepgram",
        }
        with open(STATUS_FILE, "w") as f:
            json.dump(payload, f)
    except Exception:
        # Don't crash the audio loop for file I/O issues
        pass


def _write_command(text: str):
    try:
        with open(COMMAND_FILE, "w") as f:
            f.write(text)
    except Exception:
        pass


def _is_rhea_speaking() -> bool:
    return os.path.exists(SPEAKING_SIGNAL_FILE)


def _write_user_speaking(*, rms: float):
    """
    Best-effort, low-latency signal used for barge-in.
    Renderer/main process can poll this file and stop TTS immediately when user speaks.
    """
    try:
        payload = {
            "timestamp": time.time(),
            "rms": float(rms),
        }
        with open(USER_SPEAKING_FILE, "w") as f:
            json.dump(payload, f)
    except Exception:
        pass


def _get_alt_confidence(alt) -> float:
    # Deepgram SDK objects can vary by version; be defensive.
    conf = getattr(alt, "confidence", None)
    if conf is None:
        conf = getattr(alt, "avg_logprob", None)
    try:
        return float(conf) if conf is not None else 0.0
    except Exception:
        return 0.0


async def main():
    api_key_raw = os.environ.get("DEEPGRAM_API_KEY") or os.environ.get("DG_API_KEY")
    if not api_key_raw:
        print("❌ DEEPGRAM_API_KEY not set", file=sys.stderr, flush=True)
        print("   Get your API key at: https://console.deepgram.com/", file=sys.stderr, flush=True)
        sys.exit(1)
    
    # Trim whitespace and newlines (in case key was read from file with trailing newline)
    api_key = api_key_raw.strip()
    
    # Validate API key format
    # Deepgram keys typically start with "dg_" but some legacy keys may not
    if not api_key or len(api_key) < 10:
        print("❌ Invalid API key format (too short)", file=sys.stderr, flush=True)
        sys.exit(1)
    
    # Log key info for debugging (first 4 and last 4 chars only)
    key_preview = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
    print(f"🔑 Using Deepgram API key: {key_preview} (length: {len(api_key)})", flush=True)
    
    # Warn if key doesn't have expected prefix (but don't fail - SDK may handle it)
    if not api_key.startswith("dg_"):
        print("⚠️  Warning: API key doesn't start with 'dg_' prefix", flush=True)
        print("   If authentication fails, verify your key format in Deepgram console", flush=True)

    mode = os.environ.get("DAWRV_ASR_MODE", "command")
    sample_rate = int(os.environ.get("DAWRV_DEEPGRAM_SAMPLE_RATE", "16000"))
    chunk_frames = int(os.environ.get("DAWRV_DEEPGRAM_CHUNK_FRAMES", "1024"))
    utterance_end_ms = int(os.environ.get("DAWRV_DEEPGRAM_UTTERANCE_END_MS", "850"))

    # Throttle partial status updates
    partial_min_interval_s = float(os.environ.get("DAWRV_DEEPGRAM_PARTIAL_THROTTLE_S", "0.15"))
    last_partial_ts = 0.0
    last_partial_text: Optional[str] = None

    # Low-latency VAD for barge-in
    # Default threshold intentionally conservative to reduce "ghosting" from background noise.
    # Tune via env var if needed.
    vad_rms_threshold = int(os.environ.get("DAWRV_VAD_RMS_THRESHOLD", "400"))
    vad_min_interval_s = float(os.environ.get("DAWRV_VAD_MIN_INTERVAL_S", "0.05"))
    last_vad_ts = 0.0

    try:
        from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
        import pyaudio
    except ImportError as e:
        print(f"❌ Missing dependency: {e}", file=sys.stderr, flush=True)
        print("   Install: pip3 install deepgram-sdk pyaudio", file=sys.stderr, flush=True)
        sys.exit(1)

    print("🎤 Deepgram Streaming STT starting...", flush=True)
    
    # Validate API key format (Deepgram keys typically start with "dg_" but some may not)
    if not api_key or len(api_key.strip()) < 10:
        print("❌ Invalid API key format (too short)", file=sys.stderr, flush=True)
        sys.exit(1)
    
    # Note: Some Deepgram keys don't have the "dg_" prefix, which is fine
    # The SDK should handle both formats

    pa = pyaudio.PyAudio()
    stream = pa.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=sample_rate,
        input=True,
        frames_per_buffer=chunk_frames,
    )

    # Test API key authentication before starting websocket
    # This provides better error messages if the key is invalid
    try:
        import requests
        test_url = "https://api.deepgram.com/v1/auth/token"
        headers = {"Authorization": f"Token {api_key}"}
        test_response = requests.get(test_url, headers=headers, timeout=5)
        
        if test_response.status_code == 401:
            print("❌ Deepgram API key authentication failed (HTTP 401)", file=sys.stderr, flush=True)
            print("   Steps to fix:", file=sys.stderr, flush=True)
            print("   1. Verify your API key at https://console.deepgram.com/", file=sys.stderr, flush=True)
            print("   2. Ensure the key has 'usage:read' and 'usage:write' permissions", file=sys.stderr, flush=True)
            print("   3. Check that the key is active (not expired or revoked)", file=sys.stderr, flush=True)
            print(f"   4. Key format: Should be 'dg_...' or full key from console", file=sys.stderr, flush=True)
            print(f"   Key being used: {key_preview} (length: {len(api_key)})", file=sys.stderr, flush=True)
            sys.exit(1)
        elif test_response.status_code == 200:
            print("✅ API key validated successfully", flush=True)
        else:
            print(f"⚠️  API key test returned status {test_response.status_code}", flush=True)
    except ImportError:
        # requests not available, skip validation
        print("⚠️  'requests' package not available - skipping API key validation", flush=True)
    except Exception as e:
        # Don't fail on validation errors - let the SDK try
        print(f"⚠️  API key validation check failed: {e}", flush=True)
        print("   Proceeding with SDK initialization...", flush=True)
    
    # Initialize Deepgram client
    try:
        deepgram = DeepgramClient(api_key)
        dg = deepgram.listen.websocket.v("1")
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Failed to initialize Deepgram client: {error_msg}", file=sys.stderr, flush=True)
        if "401" in error_msg or "unauthorized" in error_msg.lower() or "authentication" in error_msg.lower():
            print("❌ Deepgram authentication failed during client initialization (HTTP 401).", file=sys.stderr, flush=True)
            print("   Steps to resolve:", file=sys.stderr, flush=True)
            print("   1. Verify your API key at https://console.deepgram.com/", file=sys.stderr, flush=True)
            print("   2. Ensure the key has correct permissions (usage:read, usage:write)", file=sys.stderr, flush=True)
            print("   3. Check that the key is active and not expired", file=sys.stderr, flush=True)
            print("   4. The SDK uses 'Authorization: Token YOUR_KEY' header automatically", file=sys.stderr, flush=True)
            print(f"   Key being used: {key_preview} (length: {len(api_key)})", file=sys.stderr, flush=True)
        sys.exit(1)

    # Keyword boosting to improve DAW command recognition
    keywords = _load_vocab_keywords(max_keywords=int(os.environ.get("DAWRV_DEEPGRAM_MAX_KEYWORDS", "60")))

    # Build options defensively (SDK versions vary in accepted fields)
    base_kwargs = dict(
        model="nova-2",
        language="en-US",
        smart_format=True,
        encoding="linear16",
        channels=1,
        sample_rate=sample_rate,
        interim_results=True,   # partials for low latency UX
        punctuate=True,
        utterance_end_ms=utterance_end_ms,
        # Improve numeric handling if supported
        numerals=True,
    )
    if keywords:
        base_kwargs["keywords"] = keywords

    try:
        options = LiveOptions(**base_kwargs)
    except TypeError:
        # Remove optional fields not supported by this SDK version
        base_kwargs.pop("numerals", None)
        base_kwargs.pop("keywords", None)
        options = LiveOptions(**base_kwargs)

    def on_transcript(self, result, **kwargs):
        nonlocal last_partial_ts, last_partial_text

        try:
            alt = result.channel.alternatives[0]
            text = (alt.transcript or "").strip()
        except Exception:
            return

        if not text:
            return

        is_final = bool(getattr(result, "is_final", False) or getattr(result, "speech_final", False))
        confidence = _get_alt_confidence(alt)

        # Hard mute while RHEA is speaking (avoid loops)
        if _is_rhea_speaking():
            return

        if not is_final:
            now = time.time()
            if (now - last_partial_ts) < partial_min_interval_s and text == last_partial_text:
                return
            last_partial_ts = now
            last_partial_text = text
            _write_status(text, confidence, mode, is_final=False)
            return

        # Final transcript
        _write_status(text, confidence, mode, is_final=True)
        _write_command(text)

    def on_error(self, error, **kwargs):
        error_str = str(error) if error else "Unknown error"
        # Log full error details for debugging
        print(f"❌ Deepgram error: {error_str}", file=sys.stderr, flush=True)
        if kwargs:
            print(f"   Error details: {kwargs}", file=sys.stderr, flush=True)
        # Check for auth errors specifically
        if "401" in error_str or "unauthorized" in error_str.lower() or "authentication" in error_str.lower() or "invalid credentials" in error_str.lower():
            print("❌ Deepgram authentication failed (HTTP 401).", file=sys.stderr, flush=True)
            print("   Possible causes:", file=sys.stderr, flush=True)
            print("   1. API key is incorrect or expired", file=sys.stderr, flush=True)
            print("   2. API key doesn't have required permissions", file=sys.stderr, flush=True)
            print("   3. API key format issue (check Deepgram console)", file=sys.stderr, flush=True)
            print(f"   Key being used: {key_preview} (length: {len(api_key)})", file=sys.stderr, flush=True)
            sys.exit(1)

    def on_close(self, close_msg, **kwargs):
        print("🔌 Deepgram connection closed", flush=True)

    dg.on(LiveTranscriptionEvents.Transcript, on_transcript)
    dg.on(LiveTranscriptionEvents.Error, on_error)
    dg.on(LiveTranscriptionEvents.Close, on_close)

    try:
        started = dg.start(options)
        if not started:
            print("❌ Failed to start Deepgram websocket", file=sys.stderr, flush=True)
            sys.exit(1)
    except Exception as e:
        error_str = str(e)
        print(f"❌ Exception starting Deepgram: {error_str}", file=sys.stderr, flush=True)
        if "401" in error_str or "unauthorized" in error_str.lower() or "authentication" in error_str.lower():
            print("❌ Deepgram authentication failed (HTTP 401). Check your API key.", file=sys.stderr, flush=True)
        sys.exit(1)

    print("✅ Deepgram streaming ready", flush=True)
    print("🎧 Listening...", flush=True)

    try:
        while True:
            data = stream.read(chunk_frames, exception_on_overflow=False)

            # Emit a low-latency "user is speaking" signal for barge-in.
            # This is intentionally independent of Deepgram transcript latency.
            try:
                rms = audioop.rms(data, 2)  # 16-bit samples
                now = time.time()
                if rms >= vad_rms_threshold and (now - last_vad_ts) >= vad_min_interval_s:
                    last_vad_ts = now
                    _write_user_speaking(rms=rms)
            except Exception:
                pass

            # If RHEA is speaking, DO NOT send audio to Deepgram (avoid TTS feedback loops),
            # but keep reading audio + VAD so barge-in still works.
            if _is_rhea_speaking():
                await asyncio.sleep(0.01)
                continue

            dg.send(data)
            await asyncio.sleep(0.005)
    except KeyboardInterrupt:
        print("🛑 Stopping...", flush=True)
    finally:
        try:
            dg.finish()
        except Exception:
            pass
        try:
            stream.stop_stream()
            stream.close()
            pa.terminate()
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(main())


