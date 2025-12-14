"""
DAWRV/Rhea ASR Module
=====================
Advanced Automatic Speech Recognition for DAW voice control.

Components:
- engine.py: Core ASR engine with Whisper
- streaming.py: Real-time streaming with VAD
- vocab.json: Custom DAW vocabulary
- profiles/: User voice profiles

Usage:
    from asr import get_engine, start_listening, TranscriptResult
    
    # Simple usage
    engine = get_engine(model_size="base")
    result = engine.transcribe(audio)
    
    # Real-time streaming
    start_listening(on_transcript=my_callback)
"""

from .engine import (
    DAWRVASREngine,
    TranscriptResult,
    WordSegment,
    ASRMode,
    ConfidenceLevel,
    VoiceProfile,
    VocabularyManager,
    ProfileManager,
    get_engine,
    transcribe
)

from .streaming import (
    VoiceActivityDetector,
    AudioBuffer,
    StreamingASR,
    RealtimeASRSession,
    PartialTranscript,
    start_listening,
    stop_listening,
    get_session
)

from .calibration import (
    VoiceCalibrationEngine,
    QuickCalibration,
    CalibrationResult,
    CalibrationReport,
    CALIBRATION_PHRASES,
    QUICK_CALIBRATION_PHRASES
)

__version__ = "1.0.0"
__author__ = "DAWRV Team"

__all__ = [
    # Engine
    'DAWRVASREngine',
    'TranscriptResult',
    'WordSegment',
    'ASRMode',
    'ConfidenceLevel',
    'VoiceProfile',
    'VocabularyManager',
    'ProfileManager',
    'get_engine',
    'transcribe',
    
    # Streaming
    'VoiceActivityDetector',
    'AudioBuffer',
    'StreamingASR',
    'RealtimeASRSession',
    'PartialTranscript',
    'start_listening',
    'stop_listening',
    'get_session',
    
    # Calibration
    'VoiceCalibrationEngine',
    'QuickCalibration',
    'CalibrationResult',
    'CalibrationReport',
    'CALIBRATION_PHRASES',
    'QUICK_CALIBRATION_PHRASES'
]

