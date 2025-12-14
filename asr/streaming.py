#!/usr/bin/env python3
"""
DAWRV/Rhea Streaming ASR
========================
Real-time streaming speech recognition with:
- Voice Activity Detection (VAD)
- Low-latency chunking (200-500ms windows)
- Streaming partial transcripts
- Automatic punctuation
- <150ms latency target
"""

import os
import sys
import time
import logging
import threading
import numpy as np
from queue import Queue, Empty
from typing import Optional, Callable, List, Dict, Any
from dataclasses import dataclass
from collections import deque
import json
import re

# Import engine components
from .engine import (
    DAWRVASREngine, 
    TranscriptResult, 
    WordSegment,
    ASRMode,
    get_engine
)

logger = logging.getLogger('DAWRV_ASR_Streaming')

# If this file exists, RHEA is speaking and we should NOT feed mic audio into ASR.
# This prevents feedback loops where RHEA hears herself.
SPEAKING_SIGNAL_FILE = "/tmp/rhea_speaking"

# ============================================================================
# VOICE ACTIVITY DETECTION
# ============================================================================

class VoiceActivityDetector:
    """
    Efficient Voice Activity Detection using energy-based detection
    with adaptive thresholding.
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        frame_duration_ms: int = 30,
        energy_threshold: float = 0.01,
        speech_pad_ms: int = 300,
        min_speech_duration_ms: int = 250,
        max_silence_duration_ms: int = 1000
    ):
        """
        Initialize VAD.
        
        Args:
            sample_rate: Audio sample rate
            frame_duration_ms: Frame size in milliseconds
            energy_threshold: Initial energy threshold for speech
            speech_pad_ms: Padding around speech segments
            min_speech_duration_ms: Minimum speech duration to trigger
            max_silence_duration_ms: Max silence before ending segment
        """
        self.sample_rate = sample_rate
        self.frame_size = int(sample_rate * frame_duration_ms / 1000)
        self.energy_threshold = energy_threshold
        self.speech_pad_frames = int(speech_pad_ms / frame_duration_ms)
        self.min_speech_frames = int(min_speech_duration_ms / frame_duration_ms)
        self.max_silence_frames = int(max_silence_duration_ms / frame_duration_ms)
        
        # Adaptive threshold tracking
        self.noise_floor = 0.0
        self.noise_samples: deque = deque(maxlen=100)
        
        # State tracking
        self.speech_frames = 0
        self.silence_frames = 0
        self.is_speaking = False
        self.speech_buffer: List[np.ndarray] = []
        
        # Try to use webrtcvad for better accuracy
        self._webrtc_vad = None
        try:
            import webrtcvad
            self._webrtc_vad = webrtcvad.Vad(3)  # Aggressiveness 3 (highest)
            logger.info("Using WebRTC VAD for enhanced detection")
        except ImportError:
            logger.info("Using energy-based VAD (install webrtcvad for better accuracy)")
    
    def _calculate_energy(self, frame: np.ndarray) -> float:
        """Calculate RMS energy of audio frame"""
        return float(np.sqrt(np.mean(frame ** 2)))
    
    def _update_noise_floor(self, energy: float):
        """Adaptively update noise floor estimate"""
        if not self.is_speaking:
            self.noise_samples.append(energy)
            if len(self.noise_samples) >= 10:
                self.noise_floor = np.percentile(list(self.noise_samples), 20)
                # Adaptive threshold: noise floor + margin
                self.energy_threshold = max(0.005, self.noise_floor * 2.5)
    
    def _is_speech_webrtc(self, frame: np.ndarray) -> bool:
        """Use WebRTC VAD if available"""
        if self._webrtc_vad is None:
            return False
        
        try:
            # Convert to 16-bit PCM
            pcm_frame = (frame * 32767).astype(np.int16).tobytes()
            return self._webrtc_vad.is_speech(pcm_frame, self.sample_rate)
        except:
            return False
    
    def _is_speech_energy(self, frame: np.ndarray) -> bool:
        """Energy-based speech detection"""
        energy = self._calculate_energy(frame)
        self._update_noise_floor(energy)
        return energy > self.energy_threshold
    
    def is_speech(self, frame: np.ndarray) -> bool:
        """
        Determine if frame contains speech.
        
        Args:
            frame: Audio frame as numpy array
        
        Returns:
            True if speech detected
        """
        # Use WebRTC VAD if available, fall back to energy
        if self._webrtc_vad:
            return self._is_speech_webrtc(frame)
        return self._is_speech_energy(frame)
    
    def process_frame(self, frame: np.ndarray) -> Optional[np.ndarray]:
        """
        Process a frame and return complete speech segment when ready.
        
        Args:
            frame: Audio frame
        
        Returns:
            Complete speech segment when detected, None otherwise
        """
        is_speech = self.is_speech(frame)
        
        if is_speech:
            self.speech_frames += 1
            self.silence_frames = 0
            self.speech_buffer.append(frame)
            
            if not self.is_speaking and self.speech_frames >= self.min_speech_frames:
                self.is_speaking = True
                logger.debug("Speech started")
        else:
            if self.is_speaking:
                self.silence_frames += 1
                self.speech_buffer.append(frame)  # Include silence padding
                
                if self.silence_frames >= self.max_silence_frames:
                    # Speech ended - return the segment
                    self.is_speaking = False
                    self.speech_frames = 0
                    self.silence_frames = 0
                    
                    # Concatenate buffered frames
                    if self.speech_buffer:
                        segment = np.concatenate(self.speech_buffer)
                        self.speech_buffer = []
                        logger.debug(f"Speech segment: {len(segment)/self.sample_rate:.2f}s")
                        return segment
            else:
                # Not speaking - reset
                self.speech_frames = 0
                self.speech_buffer = []
        
        return None
    
    def reset(self):
        """Reset VAD state"""
        self.speech_frames = 0
        self.silence_frames = 0
        self.is_speaking = False
        self.speech_buffer = []


# ============================================================================
# AUDIO BUFFER
# ============================================================================

class AudioBuffer:
    """
    Ring buffer for streaming audio with overlap support.
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        buffer_duration_s: float = 30.0,
        chunk_duration_ms: int = 200
    ):
        """
        Initialize audio buffer.
        
        Args:
            sample_rate: Audio sample rate
            buffer_duration_s: Total buffer duration in seconds
            chunk_duration_ms: Chunk size for processing
        """
        self.sample_rate = sample_rate
        self.buffer_size = int(sample_rate * buffer_duration_s)
        self.chunk_size = int(sample_rate * chunk_duration_ms / 1000)
        
        self.buffer = np.zeros(self.buffer_size, dtype=np.float32)
        self.write_pos = 0
        self.read_pos = 0
        self.lock = threading.Lock()
    
    def write(self, audio: np.ndarray):
        """Write audio to buffer"""
        with self.lock:
            samples = len(audio)
            if samples > self.buffer_size:
                audio = audio[-self.buffer_size:]
                samples = self.buffer_size
            
            # Handle wrap-around
            end_pos = self.write_pos + samples
            if end_pos <= self.buffer_size:
                self.buffer[self.write_pos:end_pos] = audio
            else:
                first_part = self.buffer_size - self.write_pos
                self.buffer[self.write_pos:] = audio[:first_part]
                self.buffer[:samples - first_part] = audio[first_part:]
            
            self.write_pos = (self.write_pos + samples) % self.buffer_size
    
    def read_chunk(self) -> Optional[np.ndarray]:
        """Read a chunk from buffer"""
        with self.lock:
            available = (self.write_pos - self.read_pos) % self.buffer_size
            if available < self.chunk_size:
                return None
            
            end_pos = self.read_pos + self.chunk_size
            if end_pos <= self.buffer_size:
                chunk = self.buffer[self.read_pos:end_pos].copy()
            else:
                first_part = self.buffer_size - self.read_pos
                chunk = np.concatenate([
                    self.buffer[self.read_pos:],
                    self.buffer[:self.chunk_size - first_part]
                ])
            
            self.read_pos = (self.read_pos + self.chunk_size) % self.buffer_size
            return chunk
    
    def get_recent(self, duration_s: float) -> np.ndarray:
        """Get recent audio of specified duration"""
        with self.lock:
            samples = int(self.sample_rate * duration_s)
            samples = min(samples, self.buffer_size)
            
            start_pos = (self.write_pos - samples) % self.buffer_size
            if start_pos < self.write_pos:
                return self.buffer[start_pos:self.write_pos].copy()
            else:
                return np.concatenate([
                    self.buffer[start_pos:],
                    self.buffer[:self.write_pos]
                ])
    
    def clear(self):
        """Clear the buffer"""
        with self.lock:
            self.buffer.fill(0)
            self.write_pos = 0
            self.read_pos = 0


# ============================================================================
# STREAMING ASR
# ============================================================================

@dataclass
class PartialTranscript:
    """Partial (streaming) transcript result"""
    text: str
    confidence: float
    is_final: bool
    timestamp: float


class StreamingASR:
    """
    Real-time streaming ASR with VAD and low-latency processing.
    
    Features:
    - Voice activity detection
    - 200-500ms chunking
    - Partial transcripts for live feedback
    - <150ms latency target
    - Automatic punctuation
    """
    
    def __init__(
        self,
        engine: DAWRVASREngine = None,
        sample_rate: int = 16000,
        chunk_duration_ms: int = 200,
        vad_aggressiveness: int = 3
    ):
        """
        Initialize streaming ASR.
        
        Args:
            engine: ASR engine instance (or creates new one)
            sample_rate: Audio sample rate
            chunk_duration_ms: Processing chunk size (200-500ms recommended)
            vad_aggressiveness: VAD sensitivity (1-3, 3=most aggressive)
        """
        self.engine = engine or get_engine()
        self.sample_rate = sample_rate
        self.chunk_duration_ms = chunk_duration_ms
        
        # Initialize components
        self.vad = VoiceActivityDetector(
            sample_rate=sample_rate,
            max_silence_duration_ms=1500  # Longer for natural pauses
        )
        self.audio_buffer = AudioBuffer(
            sample_rate=sample_rate,
            chunk_duration_ms=chunk_duration_ms
        )
        
        # Processing state
        self.is_running = False
        self.processing_thread: Optional[threading.Thread] = None
        self.audio_queue: Queue = Queue()
        
        # Callbacks
        self.on_partial: Optional[Callable[[PartialTranscript], None]] = None
        self.on_final: Optional[Callable[[TranscriptResult], None]] = None
        self.on_speech_start: Optional[Callable[[], None]] = None
        self.on_speech_end: Optional[Callable[[], None]] = None
        
        # Performance tracking
        self.latency_samples: deque = deque(maxlen=100)
        self.avg_latency_ms = 0.0
        
        logger.info(f"StreamingASR initialized (chunk={chunk_duration_ms}ms)")

        # Optional: selective second-pass transcription (accuracy boost on numbers/bars/tracks)
        self.second_pass_model_size = (os.environ.get("DAWRV_SECOND_PASS_MODEL") or "").strip().lower() or None
        self.second_pass_max_confidence = float(os.environ.get("DAWRV_SECOND_PASS_MAX_CONF", "0.80"))
        self.second_pass_min_improvement = float(os.environ.get("DAWRV_SECOND_PASS_MIN_IMPROVEMENT", "0.08"))
        self.second_pass_max_audio_s = float(os.environ.get("DAWRV_SECOND_PASS_MAX_AUDIO_S", "6.0"))
        self._second_pass_engine = None

        # Heuristic: trigger on digits or DAW timing words
        self._second_pass_trigger_re = re.compile(r"(\b\d+\b|\bbar(s)?\b|\bmeasure(s)?\b|\btrack(s)?\b)", re.IGNORECASE)
    
    def start(self):
        """Start streaming processing"""
        if self.is_running:
            return
        
        self.is_running = True
        self.processing_thread = threading.Thread(
            target=self._processing_loop,
            daemon=True
        )
        self.processing_thread.start()
        logger.info("Streaming ASR started")
    
    def stop(self):
        """Stop streaming processing"""
        self.is_running = False
        if self.processing_thread:
            self.processing_thread.join(timeout=2.0)
            self.processing_thread = None
        logger.info("Streaming ASR stopped")
    
    def feed_audio(self, audio: np.ndarray):
        """
        Feed audio data for processing.
        
        Args:
            audio: Audio samples as float32 numpy array
        """
        if not self.is_running:
            return
        
        # Ensure correct dtype
        if audio.dtype != np.float32:
            audio = audio.astype(np.float32)
        
        # Normalize if needed
        max_val = np.abs(audio).max()
        if max_val > 1.0:
            audio = audio / max_val
        
        self.audio_queue.put(audio)
    
    def _processing_loop(self):
        """Main processing loop"""
        speech_audio = []
        speech_start_time = None
        
        while self.is_running:
            try:
                # Get audio from queue
                audio = self.audio_queue.get(timeout=0.1)
                
                # Process through VAD in chunks
                chunk_size = self.vad.frame_size
                for i in range(0, len(audio), chunk_size):
                    frame = audio[i:i + chunk_size]
                    if len(frame) < chunk_size:
                        # Pad last frame
                        frame = np.pad(frame, (0, chunk_size - len(frame)))
                    
                    # Check for speech
                    if self.vad.is_speech(frame):
                        if not speech_audio:
                            # Speech started
                            speech_start_time = time.time()
                            if self.on_speech_start:
                                self.on_speech_start()
                        speech_audio.append(frame)
                    else:
                        if speech_audio:
                            # Check if speech ended (enough silence)
                            segment = self.vad.process_frame(frame)
                            if segment is not None:
                                # Process complete speech segment
                                self._process_speech_segment(
                                    segment, 
                                    speech_start_time
                                )
                                speech_audio = []
                                speech_start_time = None
                                
                                if self.on_speech_end:
                                    self.on_speech_end()
                            elif self.vad.is_speaking:
                                speech_audio.append(frame)
                
                # Generate partial transcript if we have enough audio
                if speech_audio and len(speech_audio) > 10:
                    self._generate_partial(speech_audio)
                
            except Empty:
                continue
            except Exception as e:
                logger.error(f"Processing error: {e}")
    
    def _process_speech_segment(
        self,
        audio: np.ndarray,
        start_time: float
    ):
        """Process a complete speech segment"""
        process_start = time.time()
        
        # Transcribe
        result = self.engine.transcribe(audio, sample_rate=self.sample_rate)

        # Optional second pass (local-only) for tricky command-like utterances
        if (
            self.second_pass_model_size
            and result
            and result.transcript
            and float(result.confidence or 0.0) <= self.second_pass_max_confidence
        ):
            try:
                duration_s = float(len(audio)) / float(self.sample_rate)
            except Exception:
                duration_s = 0.0

            if duration_s > 0 and duration_s <= self.second_pass_max_audio_s and self._second_pass_trigger_re.search(result.transcript):
                try:
                    from .engine import get_engine as _get_engine
                    if self._second_pass_engine is None:
                        self._second_pass_engine = _get_engine(model_size=self.second_pass_model_size)
                        self._second_pass_engine.load_model()

                    second = self._second_pass_engine.transcribe(audio, sample_rate=self.sample_rate)
                    if second and second.transcript:
                        improved = float(second.confidence or 0.0) - float(result.confidence or 0.0)
                        if improved >= self.second_pass_min_improvement:
                            logger.info(
                                f"🧠 Second-pass improved ({result.confidence:.2f}→{second.confidence:.2f}): '{result.transcript}' → '{second.transcript}'"
                            )
                            result = second
                except Exception as e:
                    logger.debug(f"Second-pass failed: {e}")
        
        # Track latency
        latency_ms = (time.time() - start_time) * 1000
        self.latency_samples.append(latency_ms)
        self.avg_latency_ms = np.mean(list(self.latency_samples))
        
        if result.transcript:
            logger.info(f"Final: '{result.transcript}' (conf={result.confidence:.2f}, latency={latency_ms:.0f}ms)")
            
            if self.on_final:
                self.on_final(result)
    
    def _generate_partial(self, audio_frames: List[np.ndarray]):
        """Generate partial transcript for live feedback"""
        if not self.on_partial:
            return
        
        try:
            # Concatenate frames
            audio = np.concatenate(audio_frames)
            
            # Quick transcription for partial
            result = self.engine.transcribe(audio, sample_rate=self.sample_rate)
            
            if result.transcript:
                partial = PartialTranscript(
                    text=result.transcript,
                    confidence=result.confidence,
                    is_final=False,
                    timestamp=time.time()
                )
                self.on_partial(partial)
        except Exception as e:
            logger.error(f"Partial transcript error: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get streaming statistics"""
        return {
            "is_running": self.is_running,
            "avg_latency_ms": self.avg_latency_ms,
            "vad_is_speaking": self.vad.is_speaking,
            "vad_noise_floor": self.vad.noise_floor,
            "queue_size": self.audio_queue.qsize()
        }


# ============================================================================
# MICROPHONE STREAM
# ============================================================================

class MicrophoneStream:
    """
    Microphone audio capture for real-time streaming.
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        channels: int = 1,
        chunk_duration_ms: int = 100,
        device_index: int = None
    ):
        """
        Initialize microphone stream.
        
        Args:
            sample_rate: Audio sample rate
            channels: Number of audio channels
            chunk_duration_ms: Chunk size for capture
            device_index: Specific audio device index
        """
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_size = int(sample_rate * chunk_duration_ms / 1000)
        self.device_index = device_index
        
        self._pyaudio = None
        self._stream = None
        self.is_running = False

        # Echo/feedback prevention
        self._last_speaking_state = False
        self._mute_until_ts = 0.0
        self.post_speech_mute_s = 1.0  # let room echo decay after TTS
        
        # Callback
        self.on_audio: Optional[Callable[[np.ndarray], None]] = None
    
    def _init_pyaudio(self):
        """Initialize PyAudio"""
        if self._pyaudio is not None:
            return
        
        import pyaudio
        self._pyaudio = pyaudio.PyAudio()
        
        # Find best input device if not specified
        if self.device_index is None:
            self.device_index = self._find_input_device()
    
    def _find_input_device(self) -> int:
        """Find the best input device - USE SYSTEM DEFAULT like Whisper listener"""
        logger.info("🔍 Finding audio input device...")
        
        # Get system default first (this matches DAWRV Audio Monitor)
        try:
            default_info = self._pyaudio.get_default_input_device_info()
            default_idx = default_info['index']
            logger.info(f"   SYSTEM DEFAULT: [{default_idx}] {default_info['name']}")
        except:
            default_idx = None
        
        # List all input devices for debugging
        for i in range(self._pyaudio.get_device_count()):
            info = self._pyaudio.get_device_info_by_index(i)
            if info['maxInputChannels'] > 0:
                name = info['name']
                mark = " ← SELECTED" if i == default_idx else ""
                # Skip Pro Tools bridges
                if 'pro tools' in name.lower():
                    logger.info(f"   [{i}] {name} (skipped - Pro Tools)")
                else:
                    logger.info(f"   [{i}] {name}{mark}")
        
        # Return system default
        if default_idx is not None:
            return default_idx
        
        # Fallback: find any non-Pro Tools input
        for i in range(self._pyaudio.get_device_count()):
            info = self._pyaudio.get_device_info_by_index(i)
            if info['maxInputChannels'] > 0:
                if 'pro tools' not in info['name'].lower():
                    return i
        
        return 0  # Last resort
    
    def start(self):
        """Start microphone capture"""
        if self.is_running:
            return
        
        import pyaudio
        self._init_pyaudio()
        
        def callback(in_data, frame_count, time_info, status):
            # If RHEA is speaking, drop mic audio to avoid self-triggering.
            now = time.time()
            is_speaking = os.path.exists(SPEAKING_SIGNAL_FILE)
            if is_speaking:
                self._last_speaking_state = True
                self._mute_until_ts = now + self.post_speech_mute_s
                return (None, pyaudio.paContinue)

            # If RHEA just stopped speaking, keep muting briefly.
            if self._last_speaking_state:
                if now < self._mute_until_ts:
                    return (None, pyaudio.paContinue)
                self._last_speaking_state = False

            audio = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32768.0
            if self.on_audio:
                self.on_audio(audio)
            return (None, pyaudio.paContinue)
        
        self._stream = self._pyaudio.open(
            format=pyaudio.paInt16,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            input_device_index=self.device_index,
            frames_per_buffer=self.chunk_size,
            stream_callback=callback
        )
        
        self._stream.start_stream()
        self.is_running = True
        logger.info("Microphone stream started")
    
    def stop(self):
        """Stop microphone capture"""
        if not self.is_running:
            return
        
        if self._stream:
            self._stream.stop_stream()
            self._stream.close()
            self._stream = None
        
        self.is_running = False
        logger.info("Microphone stream stopped")
    
    def terminate(self):
        """Clean up PyAudio"""
        self.stop()
        if self._pyaudio:
            self._pyaudio.terminate()
            self._pyaudio = None


# ============================================================================
# REAL-TIME ASR SESSION
# ============================================================================

class RealtimeASRSession:
    """
    Complete real-time ASR session combining microphone,
    streaming ASR, and callbacks.
    """
    
    def __init__(
        self,
        engine: DAWRVASREngine = None,
        sample_rate: int = 16000,
        on_transcript: Callable[[TranscriptResult], None] = None,
        on_partial: Callable[[PartialTranscript], None] = None
    ):
        """
        Initialize real-time session.
        
        Args:
            engine: ASR engine instance
            sample_rate: Audio sample rate
            on_transcript: Callback for final transcripts
            on_partial: Callback for partial transcripts
        """
        self.engine = engine or get_engine()
        self.sample_rate = sample_rate
        
        # Components
        self.mic = MicrophoneStream(sample_rate=sample_rate)
        self.streamer = StreamingASR(engine=self.engine, sample_rate=sample_rate)
        
        # Connect components
        self.mic.on_audio = self.streamer.feed_audio
        self.streamer.on_final = on_transcript
        self.streamer.on_partial = on_partial
        
        self.is_running = False
    
    def start(self):
        """Start the real-time session"""
        if self.is_running:
            return
        
        self.streamer.start()
        self.mic.start()
        self.is_running = True
        logger.info("Real-time ASR session started")
    
    def stop(self):
        """Stop the real-time session"""
        if not self.is_running:
            return
        
        self.mic.stop()
        self.streamer.stop()
        self.is_running = False
        logger.info("Real-time ASR session stopped")
    
    def set_mode(self, mode: ASRMode):
        """Set ASR mode (command/dictation)"""
        self.engine.set_mode(mode)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get session statistics"""
        return {
            "is_running": self.is_running,
            "streaming": self.streamer.get_stats(),
            "mode": self.engine.mode.value
        }


# ============================================================================
# MODULE INTERFACE
# ============================================================================

_session_instance: Optional[RealtimeASRSession] = None

def get_session(**kwargs) -> RealtimeASRSession:
    """Get or create the global session instance"""
    global _session_instance
    if _session_instance is None:
        _session_instance = RealtimeASRSession(**kwargs)
    return _session_instance


def start_listening(
    on_transcript: Callable[[TranscriptResult], None] = None,
    on_partial: Callable[[PartialTranscript], None] = None
):
    """Start real-time listening"""
    session = get_session(on_transcript=on_transcript, on_partial=on_partial)
    session.start()
    return session


def stop_listening():
    """Stop real-time listening"""
    global _session_instance
    if _session_instance:
        _session_instance.stop()


# ============================================================================
# CLI INTERFACE
# ============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="DAWRV Streaming ASR")
    parser.add_argument("--model", default="base", help="Whisper model size")
    parser.add_argument("--duration", type=int, default=30, help="Listen duration in seconds")
    
    args = parser.parse_args()
    
    print("🎤 DAWRV Real-Time ASR")
    print(f"   Model: {args.model}")
    print(f"   Duration: {args.duration}s")
    print()
    
    def on_final(result: TranscriptResult):
        action = get_engine().get_confidence_action(result)
        print(f"✅ [{action['confidence_level']}] {result.transcript}")
        print(f"   Confidence: {result.confidence:.2f} | Action: {action['action']}")
    
    def on_partial(partial: PartialTranscript):
        print(f"   ... {partial.text}", end='\r')
    
    # Create and start session
    engine = get_engine(model_size=args.model)
    engine.load_model()
    
    session = RealtimeASRSession(
        engine=engine,
        on_transcript=on_final,
        on_partial=on_partial
    )
    
    print("🎧 Listening... (Ctrl+C to stop)")
    session.start()
    
    try:
        time.sleep(args.duration)
    except KeyboardInterrupt:
        print("\n\n👋 Stopping...")
    finally:
        session.stop()
        print("✅ Session ended")

