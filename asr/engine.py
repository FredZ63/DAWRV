#!/usr/bin/env python3
"""
DAWRV/Rhea ASR Engine
=====================
Core Automatic Speech Recognition engine using Whisper with:
- Word-level confidence scoring
- Timestamped transcription
- Custom vocabulary injection
- Voice profile support
- Command/Dictation mode switching
"""

import os
import sys
import json
import time
import logging
import numpy as np
from pathlib import Path
from typing import Optional, Dict, List, Callable, Any
from dataclasses import dataclass, asdict
from enum import Enum
import threading
from queue import Queue

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('DAWRV_ASR')

# ============================================================================
# DATA STRUCTURES
# ============================================================================

class ASRMode(Enum):
    """Operating mode for the ASR engine"""
    COMMAND = "command"      # Interpret as DAW actions
    DICTATION = "dictation"  # Transcribe exactly (track names, notes)


class ConfidenceLevel(Enum):
    """Confidence thresholds for action handling"""
    HIGH = "high"        # > 0.85 - Execute immediately
    MEDIUM = "medium"    # 0.55-0.85 - Request confirmation
    LOW = "low"          # <= 0.55 - Ask for repeat


@dataclass
class WordSegment:
    """Individual word with timing and confidence"""
    word: str
    start: float
    end: float
    confidence: float
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class TranscriptResult:
    """Complete transcription result"""
    transcript: str
    segments: List[WordSegment]
    confidence: float
    mode: str
    speaker_profile: str
    noise_level: str
    timestamp: float
    is_final: bool = True
    punctuation_mode: str = "auto"
    
    def to_dict(self) -> Dict:
        return {
            "transcript": self.transcript,
            "segments": [s.to_dict() for s in self.segments],
            "confidence": self.confidence,
            "mode": self.mode,
            "speaker_profile": self.speaker_profile,
            "noise_level": self.noise_level,
            "timestamp": self.timestamp,
            "is_final": self.is_final,
            "punctuation_mode": self.punctuation_mode
        }
    
    def get_confidence_level(self) -> ConfidenceLevel:
        """Determine confidence level for action handling"""
        if self.confidence > 0.85:
            return ConfidenceLevel.HIGH
        elif self.confidence > 0.55:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW


@dataclass
class VoiceProfile:
    """User voice profile for personalization"""
    name: str
    accent: str = "neutral"
    speech_rate: float = 1.0  # 1.0 = normal
    noise_floor: float = 0.0
    custom_pronunciations: Dict[str, str] = None
    created_at: float = 0.0
    last_used: float = 0.0
    
    def __post_init__(self):
        if self.custom_pronunciations is None:
            self.custom_pronunciations = {}
        if self.created_at == 0.0:
            self.created_at = time.time()
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'VoiceProfile':
        return cls(**data)


# ============================================================================
# VOCABULARY MANAGER
# ============================================================================

class VocabularyManager:
    """Manages custom vocabulary for improved recognition"""
    
    def __init__(self, vocab_path: str = None):
        self.vocab_path = vocab_path or self._default_vocab_path()
        self.vocabulary: Dict[str, List[str]] = {}
        self.aliases: Dict[str, str] = {}  # User-defined phrase -> action
        self.boost_words: List[str] = []   # Words to boost recognition
        self.load_vocabulary()
    
    def _default_vocab_path(self) -> str:
        return str(Path(__file__).parent / "vocab.json")
    
    def load_vocabulary(self):
        """Load vocabulary from JSON file"""
        try:
            if os.path.exists(self.vocab_path):
                with open(self.vocab_path, 'r') as f:
                    data = json.load(f)
                    self.vocabulary = data.get('categories', {})
                    self.aliases = data.get('aliases', {})
                    self.boost_words = data.get('boost_words', [])
                logger.info(f"Loaded vocabulary from {self.vocab_path}")
            else:
                logger.warning(f"Vocabulary file not found: {self.vocab_path}")
                self._create_default_vocabulary()
        except Exception as e:
            logger.error(f"Error loading vocabulary: {e}")
            self._create_default_vocabulary()
    
    def _create_default_vocabulary(self):
        """Create default DAW vocabulary"""
        self.vocabulary = {
            "daw_commands": [
                "play", "stop", "record", "pause", "rewind", "forward",
                "loop", "punch", "bounce", "render", "export", "save"
            ],
            "track_terms": [
                "track", "channel", "bus", "aux", "send", "return",
                "master", "stereo", "mono", "VCA", "group"
            ],
            "mixing_terms": [
                "fader", "volume", "pan", "mute", "solo", "arm",
                "gain", "level", "trim", "automation"
            ],
            "plugins": [
                "compressor", "EQ", "reverb", "delay", "limiter",
                "FabFilter", "Pro-Q", "Waves", "CLA", "Decapitator",
                "Autotune", "Kontakt", "Serum", "Massive"
            ],
            "studio_tasks": [
                "duplicate", "consolidate", "comp", "quantize",
                "render stems", "bounce in place", "freeze"
            ],
            "slang": [
                "make it slap", "dirty that up", "open the hook",
                "drop in", "punch in", "punch out", "top and tail"
            ]
        }
        self.save_vocabulary()
    
    def save_vocabulary(self):
        """Save vocabulary to JSON file"""
        try:
            data = {
                'categories': self.vocabulary,
                'aliases': self.aliases,
                'boost_words': self.boost_words
            }
            with open(self.vocab_path, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved vocabulary to {self.vocab_path}")
        except Exception as e:
            logger.error(f"Error saving vocabulary: {e}")
    
    def add_alias(self, phrase: str, action: str):
        """Add a user-defined alias"""
        self.aliases[phrase.lower()] = action
        self.save_vocabulary()
    
    def get_all_terms(self) -> List[str]:
        """Get flat list of all vocabulary terms"""
        terms = []
        for category in self.vocabulary.values():
            terms.extend(category)
        terms.extend(self.aliases.keys())
        terms.extend(self.boost_words)
        return list(set(terms))
    
    def resolve_alias(self, text: str) -> str:
        """Check if text matches an alias and return the action"""
        lower_text = text.lower().strip()
        return self.aliases.get(lower_text, text)


# ============================================================================
# VOICE PROFILE MANAGER
# ============================================================================

class ProfileManager:
    """Manages user voice profiles"""
    
    def __init__(self, profiles_dir: str = None):
        self.profiles_dir = profiles_dir or str(Path(__file__).parent / "profiles")
        self.profiles: Dict[str, VoiceProfile] = {}
        self.active_profile: Optional[VoiceProfile] = None
        os.makedirs(self.profiles_dir, exist_ok=True)
        self.load_profiles()
    
    def load_profiles(self):
        """Load all profiles from disk"""
        try:
            for file in Path(self.profiles_dir).glob("*.json"):
                with open(file, 'r') as f:
                    data = json.load(f)
                    profile = VoiceProfile.from_dict(data)
                    self.profiles[profile.name] = profile
            logger.info(f"Loaded {len(self.profiles)} voice profiles")
        except Exception as e:
            logger.error(f"Error loading profiles: {e}")
    
    def save_profile(self, profile: VoiceProfile):
        """Save a profile to disk"""
        try:
            filepath = Path(self.profiles_dir) / f"{profile.name}.json"
            with open(filepath, 'w') as f:
                json.dump(profile.to_dict(), f, indent=2)
            self.profiles[profile.name] = profile
            logger.info(f"Saved profile: {profile.name}")
        except Exception as e:
            logger.error(f"Error saving profile: {e}")
    
    def create_profile(self, name: str, accent: str = "neutral") -> VoiceProfile:
        """Create a new voice profile"""
        profile = VoiceProfile(name=name, accent=accent)
        self.save_profile(profile)
        return profile
    
    def set_active(self, name: str) -> bool:
        """Set the active voice profile"""
        if name in self.profiles:
            self.active_profile = self.profiles[name]
            self.active_profile.last_used = time.time()
            self.save_profile(self.active_profile)
            logger.info(f"Active profile: {name}")
            return True
        return False
    
    def get_active_name(self) -> str:
        """Get name of active profile"""
        return self.active_profile.name if self.active_profile else "default"


# ============================================================================
# MAIN ASR ENGINE
# ============================================================================

class DAWRVASREngine:
    """
    Main ASR Engine for DAWRV/Rhea
    
    Features:
    - Whisper-based transcription
    - Custom vocabulary injection
    - Voice profiles
    - Command/Dictation modes
    - Confidence-aware output
    """
    
    def __init__(
        self,
        model_size: str = "base",
        device: str = "auto",
        vocab_path: str = None,
        profiles_dir: str = None,
        compute_type: str = "float16"
    ):
        """
        Initialize the ASR engine.
        
        Args:
            model_size: Whisper model size (tiny, base, small, medium, large)
            device: Device to use (cpu, cuda, mps, auto)
            vocab_path: Path to custom vocabulary JSON
            profiles_dir: Directory for voice profiles
            compute_type: Compute type for inference
        """
        self.model_size = model_size
        self.device = self._detect_device(device)
        self.compute_type = compute_type
        
        # Mode management
        self.mode = ASRMode.COMMAND
        
        # Initialize managers
        self.vocab_manager = VocabularyManager(vocab_path)
        self.profile_manager = ProfileManager(profiles_dir)
        
        # Whisper model (lazy loaded)
        self._model = None
        self._processor = None
        
        # Callbacks
        self.on_transcript: Optional[Callable[[TranscriptResult], None]] = None
        self.on_partial: Optional[Callable[[str], None]] = None
        
        # Noise tracking
        self.noise_floor = 0.0
        self.noise_samples: List[float] = []
        
        # Transcript logging
        self.transcript_log: List[Dict] = []
        self.log_transcripts = True
        
        logger.info(f"DAWRV ASR Engine initialized (model={model_size}, device={self.device})")
    
    def _detect_device(self, device: str) -> str:
        """Auto-detect the best available device"""
        if device != "auto":
            return device
        
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                return "mps"
        except ImportError:
            pass
        
        return "cpu"
    
    def load_model(self):
        """Load the Whisper model (lazy loading)"""
        if self._model is not None:
            return
        
        logger.info(f"Loading Whisper model: {self.model_size}")
        start_time = time.time()
        
        try:
            # Try faster-whisper first (optimized)
            try:
                from faster_whisper import WhisperModel
                self._model = WhisperModel(
                    self.model_size,
                    device=self.device if self.device != "mps" else "cpu",
                    compute_type=self.compute_type if self.device == "cuda" else "int8"
                )
                self._model_type = "faster_whisper"
                logger.info("Using faster-whisper backend")
            except ImportError:
                # Fall back to standard whisper
                import whisper
                self._model = whisper.load_model(self.model_size)
                self._model_type = "whisper"
                logger.info("Using standard whisper backend")
            
            load_time = time.time() - start_time
            logger.info(f"Model loaded in {load_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def set_mode(self, mode: ASRMode):
        """Set the operating mode"""
        self.mode = mode
        logger.info(f"ASR mode set to: {mode.value}")
    
    def toggle_mode(self):
        """Toggle between command and dictation mode"""
        if self.mode == ASRMode.COMMAND:
            self.mode = ASRMode.DICTATION
        else:
            self.mode = ASRMode.COMMAND
        logger.info(f"ASR mode toggled to: {self.mode.value}")
        return self.mode
    
    def _check_mode_switch_command(self, text: str) -> bool:
        """Check if text contains a mode switch command"""
        lower_text = text.lower().strip()
        
        if "dictation mode on" in lower_text or "dictation mode" in lower_text:
            self.set_mode(ASRMode.DICTATION)
            return True
        elif "command mode on" in lower_text or "command mode" in lower_text:
            self.set_mode(ASRMode.COMMAND)
            return True
        
        return False
    
    def estimate_noise_level(self, audio: np.ndarray) -> str:
        """Estimate background noise level"""
        try:
            # Calculate RMS
            rms = np.sqrt(np.mean(audio ** 2))
            
            # Track noise floor
            self.noise_samples.append(rms)
            if len(self.noise_samples) > 100:
                self.noise_samples = self.noise_samples[-100:]
            
            # Calculate dynamic noise floor
            if len(self.noise_samples) >= 10:
                self.noise_floor = np.percentile(self.noise_samples, 10)
            
            # Categorize noise level
            if rms < 0.01:
                return "low"
            elif rms < 0.05:
                return "medium"
            else:
                return "high"
        except:
            return "unknown"
    
    def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000,
        language: str = "en"
    ) -> TranscriptResult:
        """
        Transcribe audio to text with word-level details.
        
        Args:
            audio: Audio data as numpy array (float32, normalized)
            sample_rate: Audio sample rate
            language: Language code
        
        Returns:
            TranscriptResult with transcript, segments, confidence
        """
        self.load_model()
        
        # Estimate noise level
        noise_level = self.estimate_noise_level(audio)
        
        # Handle high noise
        if noise_level == "high":
            logger.warning("High noise level detected")
        
        # Get active profile
        speaker_profile = self.profile_manager.get_active_name()
        
        try:
            if self._model_type == "faster_whisper":
                return self._transcribe_faster_whisper(
                    audio, language, noise_level, speaker_profile
                )
            else:
                return self._transcribe_whisper(
                    audio, language, noise_level, speaker_profile
                )
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            # Return empty result on error (no crash)
            return TranscriptResult(
                transcript="",
                segments=[],
                confidence=0.0,
                mode=self.mode.value,
                speaker_profile=speaker_profile,
                noise_level=noise_level,
                timestamp=time.time(),
                is_final=True
            )
    
    def _transcribe_faster_whisper(
        self,
        audio: np.ndarray,
        language: str,
        noise_level: str,
        speaker_profile: str
    ) -> TranscriptResult:
        """Transcribe using faster-whisper backend"""
        
        # Get vocabulary for prompting
        vocab_prompt = " ".join(self.vocab_manager.get_all_terms()[:50])
        
        segments_gen, info = self._model.transcribe(
            audio,
            language=language,
            word_timestamps=True,
            initial_prompt=vocab_prompt,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=200
            )
        )
        
        # Process segments
        word_segments = []
        full_text_parts = []
        confidences = []
        
        for segment in segments_gen:
            full_text_parts.append(segment.text)
            
            if segment.words:
                for word in segment.words:
                    word_segments.append(WordSegment(
                        word=word.word.strip(),
                        start=word.start,
                        end=word.end,
                        confidence=word.probability
                    ))
                    confidences.append(word.probability)
        
        # Calculate overall confidence
        overall_confidence = np.mean(confidences) if confidences else 0.0
        transcript = "".join(full_text_parts).strip()
        
        # Check for mode switch
        self._check_mode_switch_command(transcript)
        
        # Resolve aliases in command mode
        if self.mode == ASRMode.COMMAND:
            transcript = self.vocab_manager.resolve_alias(transcript)
        
        result = TranscriptResult(
            transcript=transcript,
            segments=word_segments,
            confidence=float(overall_confidence),
            mode=self.mode.value,
            speaker_profile=speaker_profile,
            noise_level=noise_level,
            timestamp=time.time()
        )
        
        # Log transcript
        if self.log_transcripts:
            self._log_transcript(result)
        
        # Fire callback
        if self.on_transcript:
            self.on_transcript(result)
        
        return result
    
    def _transcribe_whisper(
        self,
        audio: np.ndarray,
        language: str,
        noise_level: str,
        speaker_profile: str
    ) -> TranscriptResult:
        """Transcribe using standard whisper backend"""
        
        # Get vocabulary for prompting
        vocab_prompt = " ".join(self.vocab_manager.get_all_terms()[:50])
        
        result = self._model.transcribe(
            audio,
            language=language,
            word_timestamps=True,
            initial_prompt=vocab_prompt
        )
        
        # Process segments
        word_segments = []
        confidences = []
        
        for segment in result.get("segments", []):
            for word_info in segment.get("words", []):
                word_segments.append(WordSegment(
                    word=word_info.get("word", "").strip(),
                    start=word_info.get("start", 0),
                    end=word_info.get("end", 0),
                    confidence=word_info.get("probability", 0.8)
                ))
                confidences.append(word_info.get("probability", 0.8))
        
        # Calculate overall confidence
        overall_confidence = np.mean(confidences) if confidences else 0.8
        transcript = result.get("text", "").strip()
        
        # Check for mode switch
        self._check_mode_switch_command(transcript)
        
        # Resolve aliases in command mode
        if self.mode == ASRMode.COMMAND:
            transcript = self.vocab_manager.resolve_alias(transcript)
        
        asr_result = TranscriptResult(
            transcript=transcript,
            segments=word_segments,
            confidence=float(overall_confidence),
            mode=self.mode.value,
            speaker_profile=speaker_profile,
            noise_level=noise_level,
            timestamp=time.time()
        )
        
        # Log transcript
        if self.log_transcripts:
            self._log_transcript(asr_result)
        
        # Fire callback
        if self.on_transcript:
            self.on_transcript(asr_result)
        
        return asr_result
    
    def _log_transcript(self, result: TranscriptResult):
        """Log transcript for training/debugging"""
        log_entry = {
            "timestamp": result.timestamp,
            "transcript": result.transcript,
            "confidence": result.confidence,
            "mode": result.mode,
            "noise_level": result.noise_level
        }
        self.transcript_log.append(log_entry)
        
        # Keep last 1000 entries
        if len(self.transcript_log) > 1000:
            self.transcript_log = self.transcript_log[-1000:]
    
    def save_transcript_log(self, filepath: str):
        """Save transcript log to file"""
        try:
            with open(filepath, 'w') as f:
                json.dump(self.transcript_log, f, indent=2)
            logger.info(f"Saved transcript log to {filepath}")
        except Exception as e:
            logger.error(f"Error saving transcript log: {e}")
    
    def get_confidence_action(self, result: TranscriptResult) -> Dict[str, Any]:
        """
        Determine action based on confidence level.
        
        Returns:
            {
                "action": "execute" | "confirm" | "repeat",
                "confidence_level": ConfidenceLevel,
                "message": str
            }
        """
        level = result.get_confidence_level()
        
        if level == ConfidenceLevel.HIGH:
            return {
                "action": "execute",
                "confidence_level": level.value,
                "message": f"Executing: {result.transcript}"
            }
        elif level == ConfidenceLevel.MEDIUM:
            return {
                "action": "confirm",
                "confidence_level": level.value,
                "message": f"Did you say: {result.transcript}?"
            }
        else:
            return {
                "action": "repeat",
                "confidence_level": level.value,
                "message": "I didn't catch that. Could you repeat?"
            }


# ============================================================================
# MODULE INITIALIZATION
# ============================================================================

# Global engine instance (singleton pattern)
_engine_instance: Optional[DAWRVASREngine] = None

def get_engine(
    model_size: str = "base",
    **kwargs
) -> DAWRVASREngine:
    """Get or create the global ASR engine instance"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = DAWRVASREngine(model_size=model_size, **kwargs)
    return _engine_instance


def transcribe(audio: np.ndarray, **kwargs) -> TranscriptResult:
    """Convenience function to transcribe audio"""
    engine = get_engine()
    return engine.transcribe(audio, **kwargs)


# ============================================================================
# CLI INTERFACE
# ============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="DAWRV ASR Engine")
    parser.add_argument("--model", default="base", help="Whisper model size")
    parser.add_argument("--device", default="auto", help="Device (cpu, cuda, mps, auto)")
    parser.add_argument("--test", action="store_true", help="Run test transcription")
    
    args = parser.parse_args()
    
    engine = DAWRVASREngine(model_size=args.model, device=args.device)
    
    if args.test:
        # Generate test audio (silence)
        test_audio = np.zeros(16000, dtype=np.float32)
        result = engine.transcribe(test_audio)
        print(f"Test result: {result.to_dict()}")
    else:
        print("DAWRV ASR Engine ready")
        print(f"  Model: {args.model}")
        print(f"  Device: {engine.device}")
        print(f"  Mode: {engine.mode.value}")





