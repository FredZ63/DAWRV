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
from typing import Optional

COMMAND_FILE = "/tmp/dawrv_voice_command.txt"
STATUS_FILE = "/tmp/dawrv_asr_status.json"
SPEAKING_SIGNAL_FILE = "/tmp/rhea_speaking"


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
    api_key = os.environ.get("DEEPGRAM_API_KEY") or os.environ.get("DG_API_KEY")
    if not api_key:
        print("❌ DEEPGRAM_API_KEY not set", file=sys.stderr, flush=True)
        sys.exit(1)

    mode = os.environ.get("DAWRV_ASR_MODE", "command")
    sample_rate = int(os.environ.get("DAWRV_DEEPGRAM_SAMPLE_RATE", "16000"))
    chunk_frames = int(os.environ.get("DAWRV_DEEPGRAM_CHUNK_FRAMES", "1024"))
    utterance_end_ms = int(os.environ.get("DAWRV_DEEPGRAM_UTTERANCE_END_MS", "850"))

    # Throttle partial status updates
    partial_min_interval_s = float(os.environ.get("DAWRV_DEEPGRAM_PARTIAL_THROTTLE_S", "0.15"))
    last_partial_ts = 0.0
    last_partial_text: Optional[str] = None

    try:
        from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
        import pyaudio
    except ImportError as e:
        print(f"❌ Missing dependency: {e}", file=sys.stderr, flush=True)
        print("   Install: pip3 install deepgram-sdk pyaudio", file=sys.stderr, flush=True)
        sys.exit(1)

    print("🎤 Deepgram Streaming STT starting...", flush=True)

    pa = pyaudio.PyAudio()
    stream = pa.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=sample_rate,
        input=True,
        frames_per_buffer=chunk_frames,
    )

    deepgram = DeepgramClient(api_key)
    dg = deepgram.listen.websocket.v("1")

    options = LiveOptions(
        model="nova-2",
        language="en-US",
        smart_format=True,
        encoding="linear16",
        channels=1,
        sample_rate=sample_rate,
        interim_results=True,   # partials for low latency UX
        punctuate=True,
        utterance_end_ms=utterance_end_ms,
    )

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
        print(f"❌ Deepgram error: {error}", file=sys.stderr, flush=True)

    def on_close(self, close_msg, **kwargs):
        print("🔌 Deepgram connection closed", flush=True)

    dg.on(LiveTranscriptionEvents.Transcript, on_transcript)
    dg.on(LiveTranscriptionEvents.Error, on_error)
    dg.on(LiveTranscriptionEvents.Close, on_close)

    started = dg.start(options)
    if not started:
        print("❌ Failed to start Deepgram websocket", file=sys.stderr, flush=True)
        sys.exit(1)

    print("✅ Deepgram streaming ready", flush=True)
    print("🎧 Listening...", flush=True)

    try:
        while True:
            # If RHEA is speaking, pause sending audio (and give room echo time).
            if _is_rhea_speaking():
                await asyncio.sleep(0.05)
                continue

            data = stream.read(chunk_frames, exception_on_overflow=False)
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


