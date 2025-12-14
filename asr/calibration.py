#!/usr/bin/env python3
"""
DAWRV/Rhea Voice Calibration System
====================================
Voice enrollment and calibration for personalized speech recognition.

Features:
- Guided voice enrollment with DAW-specific phrases
- Accent detection and adaptation
- Speech rate normalization
- Background noise profiling
- Custom pronunciation learning
"""

import os
import sys
import json
import time
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Callable, Tuple
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger('DAWRV_Calibration')

# ============================================================================
# CALIBRATION PHRASES
# ============================================================================

CALIBRATION_PHRASES = {
    # Phase 1: Basic Commands (tests recognition accuracy)
    "basic_commands": [
        "play",
        "stop", 
        "record",
        "pause",
        "rewind",
        "undo",
        "save project"
    ],
    
    # Phase 2: Track Commands (tests number recognition)
    "track_commands": [
        "solo track 1",
        "mute channel 3",
        "arm track 5",
        "select tracks 1 through 8",
        "delete track 12"
    ],
    
    # Phase 3: Mixing Terms (tests technical vocabulary)
    "mixing_terms": [
        "set volume to minus 6 dB",
        "pan left 50 percent",
        "add compressor",
        "bypass EQ",
        "open FabFilter Pro-Q"
    ],
    
    # Phase 4: Complex Commands (tests natural language)
    "complex_commands": [
        "create a new audio track",
        "bounce the selection in place",
        "set the tempo to 120 BPM",
        "go to bar 32",
        "loop from bar 8 to bar 16"
    ],
    
    # Phase 5: Studio Slang (tests informal vocabulary)
    "studio_slang": [
        "make it slap",
        "punch me in at bar 4",
        "dirty that snare up",
        "give it some air",
        "tighten up the low end"
    ]
}

# All phrases flattened for quick access
ALL_CALIBRATION_PHRASES = []
for category in CALIBRATION_PHRASES.values():
    ALL_CALIBRATION_PHRASES.extend(category)


@dataclass
class CalibrationResult:
    """Result from a single calibration phrase"""
    expected: str
    transcribed: str
    confidence: float
    match_score: float  # 0-1, how well it matched
    duration: float
    noise_level: float
    timestamp: float


@dataclass
class CalibrationReport:
    """Complete calibration report"""
    profile_name: str
    total_phrases: int
    successful_matches: int
    accuracy_score: float  # Overall accuracy 0-100%
    
    # Detected characteristics
    detected_accent: str
    speech_rate: float  # Words per minute estimate
    avg_noise_level: float
    
    # Problem areas
    low_accuracy_phrases: List[str]
    pronunciation_issues: Dict[str, str]  # word -> suggested pronunciation
    
    # Timestamps
    started_at: float
    completed_at: float
    
    def to_dict(self) -> Dict:
        return asdict(self)


# ============================================================================
# VOICE CALIBRATION ENGINE
# ============================================================================

class VoiceCalibrationEngine:
    """
    Handles voice enrollment and calibration for personalized ASR.
    """
    
    def __init__(self, asr_engine=None, profiles_dir: str = None):
        """
        Initialize calibration engine.
        
        Args:
            asr_engine: Reference to main ASR engine
            profiles_dir: Directory for storing profiles
        """
        self.asr_engine = asr_engine
        self.profiles_dir = profiles_dir or str(Path(__file__).parent / "profiles")
        os.makedirs(self.profiles_dir, exist_ok=True)
        
        # Calibration state
        self.is_calibrating = False
        self.current_phase = 0
        self.current_phrase_index = 0
        self.results: List[CalibrationResult] = []
        
        # Callbacks
        self.on_phrase_prompt: Optional[Callable[[str, int, int], None]] = None
        self.on_phrase_result: Optional[Callable[[CalibrationResult], None]] = None
        self.on_calibration_complete: Optional[Callable[[CalibrationReport], None]] = None
        self.on_progress: Optional[Callable[[int, int], None]] = None
        
        # Audio characteristics collected during calibration
        self.noise_samples: List[float] = []
        self.speech_durations: List[float] = []
        self.word_counts: List[int] = []
        
        logger.info("Voice Calibration Engine initialized")
    
    def get_phrases_for_phase(self, phase: int) -> List[str]:
        """Get calibration phrases for a specific phase"""
        phase_names = list(CALIBRATION_PHRASES.keys())
        if 0 <= phase < len(phase_names):
            return CALIBRATION_PHRASES[phase_names[phase]]
        return []
    
    def get_phase_name(self, phase: int) -> str:
        """Get the name of a calibration phase"""
        phase_names = list(CALIBRATION_PHRASES.keys())
        if 0 <= phase < len(phase_names):
            return phase_names[phase].replace('_', ' ').title()
        return "Unknown"
    
    def get_total_phrases(self) -> int:
        """Get total number of calibration phrases"""
        return len(ALL_CALIBRATION_PHRASES)
    
    def get_total_phases(self) -> int:
        """Get total number of calibration phases"""
        return len(CALIBRATION_PHRASES)
    
    def start_calibration(self, profile_name: str = "default") -> Dict:
        """
        Start a new calibration session.
        
        Args:
            profile_name: Name for the voice profile
        
        Returns:
            First phrase to speak
        """
        if self.is_calibrating:
            return {"error": "Calibration already in progress"}
        
        self.is_calibrating = True
        self.current_phase = 0
        self.current_phrase_index = 0
        self.results = []
        self.noise_samples = []
        self.speech_durations = []
        self.word_counts = []
        self.profile_name = profile_name
        self.started_at = time.time()
        
        # Get first phrase
        first_phrase = self.get_current_phrase()
        
        logger.info(f"Starting calibration for profile: {profile_name}")
        
        return {
            "success": True,
            "profile_name": profile_name,
            "total_phrases": self.get_total_phrases(),
            "total_phases": self.get_total_phases(),
            "current_phase": self.get_phase_name(0),
            "current_phrase": first_phrase,
            "phrase_number": 1
        }
    
    def get_current_phrase(self) -> Optional[str]:
        """Get the current phrase to speak"""
        if not self.is_calibrating:
            return None
        
        phrases = self.get_phrases_for_phase(self.current_phase)
        if self.current_phrase_index < len(phrases):
            return phrases[self.current_phrase_index]
        return None
    
    def submit_audio(self, audio: np.ndarray, sample_rate: int = 16000) -> Dict:
        """
        Submit recorded audio for the current calibration phrase.
        
        Args:
            audio: Audio data as numpy array
            sample_rate: Audio sample rate
        
        Returns:
            Result and next phrase (or completion status)
        """
        if not self.is_calibrating:
            return {"error": "No calibration in progress"}
        
        if self.asr_engine is None:
            return {"error": "ASR engine not available"}
        
        expected_phrase = self.get_current_phrase()
        if not expected_phrase:
            return {"error": "No current phrase"}
        
        # Transcribe the audio
        start_time = time.time()
        result = self.asr_engine.transcribe(audio, sample_rate=sample_rate)
        transcription_time = time.time() - start_time
        
        # Calculate match score
        match_score = self._calculate_match_score(expected_phrase, result.transcript)
        
        # Estimate speech duration and noise
        speech_duration = len(audio) / sample_rate
        noise_level = float(np.sqrt(np.mean(audio ** 2)))
        
        # Store results
        cal_result = CalibrationResult(
            expected=expected_phrase,
            transcribed=result.transcript,
            confidence=result.confidence,
            match_score=match_score,
            duration=speech_duration,
            noise_level=noise_level,
            timestamp=time.time()
        )
        self.results.append(cal_result)
        
        # Collect statistics
        self.noise_samples.append(noise_level)
        self.speech_durations.append(speech_duration)
        self.word_counts.append(len(expected_phrase.split()))
        
        # Fire callback
        if self.on_phrase_result:
            self.on_phrase_result(cal_result)
        
        # Move to next phrase
        return self._advance_to_next()
    
    def _calculate_match_score(self, expected: str, actual: str) -> float:
        """Calculate how well the transcription matches expected phrase"""
        if not actual:
            return 0.0
        
        expected_lower = expected.lower().strip()
        actual_lower = actual.lower().strip()
        
        # Exact match
        if expected_lower == actual_lower:
            return 1.0
        
        # Word-level matching
        expected_words = set(expected_lower.split())
        actual_words = set(actual_lower.split())
        
        if not expected_words:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = len(expected_words & actual_words)
        union = len(expected_words | actual_words)
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def _advance_to_next(self) -> Dict:
        """Advance to the next phrase or complete calibration"""
        self.current_phrase_index += 1
        
        # Check if we need to move to next phase
        phrases = self.get_phrases_for_phase(self.current_phase)
        if self.current_phrase_index >= len(phrases):
            self.current_phase += 1
            self.current_phrase_index = 0
        
        # Fire progress callback
        completed = sum(1 for r in self.results if r is not None)
        total = self.get_total_phrases()
        if self.on_progress:
            self.on_progress(completed, total)
        
        # Check if calibration is complete
        if self.current_phase >= self.get_total_phases():
            return self._complete_calibration()
        
        # Get next phrase
        next_phrase = self.get_current_phrase()
        
        # Fire prompt callback
        if self.on_phrase_prompt:
            self.on_phrase_prompt(next_phrase, completed + 1, total)
        
        return {
            "success": True,
            "completed": False,
            "current_phase": self.get_phase_name(self.current_phase),
            "current_phrase": next_phrase,
            "phrase_number": completed + 1,
            "total_phrases": total,
            "last_result": {
                "expected": self.results[-1].expected,
                "transcribed": self.results[-1].transcribed,
                "match_score": self.results[-1].match_score
            }
        }
    
    def _complete_calibration(self) -> Dict:
        """Complete the calibration and generate report"""
        self.is_calibrating = False
        
        # Calculate statistics
        successful_matches = sum(1 for r in self.results if r.match_score >= 0.8)
        accuracy_score = (successful_matches / len(self.results)) * 100 if self.results else 0
        
        # Detect accent (placeholder - would need more sophisticated analysis)
        detected_accent = self._detect_accent()
        
        # Calculate speech rate (words per minute)
        if self.speech_durations and self.word_counts:
            total_words = sum(self.word_counts)
            total_time = sum(self.speech_durations)
            speech_rate = (total_words / total_time) * 60 if total_time > 0 else 0
        else:
            speech_rate = 120  # Default
        
        # Find problem phrases
        low_accuracy_phrases = [
            r.expected for r in self.results if r.match_score < 0.7
        ]
        
        # Identify pronunciation issues
        pronunciation_issues = self._identify_pronunciation_issues()
        
        # Create report
        report = CalibrationReport(
            profile_name=self.profile_name,
            total_phrases=len(self.results),
            successful_matches=successful_matches,
            accuracy_score=accuracy_score,
            detected_accent=detected_accent,
            speech_rate=speech_rate,
            avg_noise_level=np.mean(self.noise_samples) if self.noise_samples else 0,
            low_accuracy_phrases=low_accuracy_phrases,
            pronunciation_issues=pronunciation_issues,
            started_at=self.started_at,
            completed_at=time.time()
        )
        
        # Save profile with calibration data
        self._save_calibrated_profile(report)
        
        # Fire completion callback
        if self.on_calibration_complete:
            self.on_calibration_complete(report)
        
        logger.info(f"Calibration complete: {accuracy_score:.1f}% accuracy")
        
        return {
            "success": True,
            "completed": True,
            "report": report.to_dict()
        }
    
    def _detect_accent(self) -> str:
        """
        Detect accent from calibration results.
        This is a simplified implementation - a real system would use
        more sophisticated acoustic analysis.
        """
        # Analyze common misrecognitions to detect accent patterns
        # For now, return 'neutral' as default
        return "neutral"
    
    def _identify_pronunciation_issues(self) -> Dict[str, str]:
        """Identify words that were consistently misrecognized"""
        issues = {}
        
        # Group results by expected words
        word_results = {}
        for result in self.results:
            expected_words = result.expected.lower().split()
            actual_words = result.transcribed.lower().split() if result.transcribed else []
            
            for i, word in enumerate(expected_words):
                if word not in word_results:
                    word_results[word] = {'correct': 0, 'incorrect': 0, 'alternatives': []}
                
                if i < len(actual_words):
                    if actual_words[i] == word:
                        word_results[word]['correct'] += 1
                    else:
                        word_results[word]['incorrect'] += 1
                        word_results[word]['alternatives'].append(actual_words[i])
        
        # Find consistently misrecognized words
        for word, stats in word_results.items():
            total = stats['correct'] + stats['incorrect']
            if total >= 2 and stats['incorrect'] > stats['correct']:
                # Find most common alternative
                if stats['alternatives']:
                    from collections import Counter
                    most_common = Counter(stats['alternatives']).most_common(1)
                    if most_common:
                        issues[word] = most_common[0][0]
        
        return issues
    
    def _save_calibrated_profile(self, report: CalibrationReport):
        """Save the calibrated voice profile"""
        profile_data = {
            "name": report.profile_name,
            "accent": report.detected_accent,
            "speech_rate": report.speech_rate,
            "noise_floor": report.avg_noise_level,
            "custom_pronunciations": report.pronunciation_issues,
            "calibration_accuracy": report.accuracy_score,
            "calibrated_at": report.completed_at,
            "created_at": time.time(),
            "last_used": time.time()
        }
        
        filepath = Path(self.profiles_dir) / f"{report.profile_name}.json"
        with open(filepath, 'w') as f:
            json.dump(profile_data, f, indent=2)
        
        logger.info(f"Saved calibrated profile: {filepath}")
    
    def cancel_calibration(self):
        """Cancel the current calibration session"""
        if self.is_calibrating:
            self.is_calibrating = False
            self.results = []
            logger.info("Calibration cancelled")
            return {"success": True, "message": "Calibration cancelled"}
        return {"success": False, "message": "No calibration in progress"}
    
    def get_progress(self) -> Dict:
        """Get current calibration progress"""
        if not self.is_calibrating:
            return {"in_progress": False}
        
        completed = len(self.results)
        total = self.get_total_phrases()
        
        return {
            "in_progress": True,
            "completed": completed,
            "total": total,
            "percentage": (completed / total) * 100 if total > 0 else 0,
            "current_phase": self.get_phase_name(self.current_phase),
            "current_phrase": self.get_current_phrase()
        }


# ============================================================================
# QUICK CALIBRATION (Minimal enrollment)
# ============================================================================

QUICK_CALIBRATION_PHRASES = [
    "play",
    "stop",
    "record",
    "solo track 1",
    "mute channel 3",
    "set volume to minus 6 dB",
    "go to bar 32",
    "make it slap"
]


class QuickCalibration:
    """
    Quick 8-phrase calibration for users who want faster setup.
    """
    
    def __init__(self, asr_engine=None, profiles_dir: str = None):
        self.asr_engine = asr_engine
        self.profiles_dir = profiles_dir or str(Path(__file__).parent / "profiles")
        os.makedirs(self.profiles_dir, exist_ok=True)
        
        self.is_calibrating = False
        self.current_index = 0
        self.results: List[CalibrationResult] = []
        self.profile_name = "default"
        
        # Callbacks
        self.on_phrase_prompt: Optional[Callable[[str, int, int], None]] = None
        self.on_complete: Optional[Callable[[Dict], None]] = None
    
    def start(self, profile_name: str = "default") -> Dict:
        """Start quick calibration"""
        self.is_calibrating = True
        self.current_index = 0
        self.results = []
        self.profile_name = profile_name
        
        return {
            "success": True,
            "total_phrases": len(QUICK_CALIBRATION_PHRASES),
            "current_phrase": QUICK_CALIBRATION_PHRASES[0],
            "phrase_number": 1
        }
    
    def submit_audio(self, audio: np.ndarray, sample_rate: int = 16000) -> Dict:
        """Submit audio for current phrase"""
        if not self.is_calibrating or not self.asr_engine:
            return {"error": "Not calibrating or no ASR engine"}
        
        expected = QUICK_CALIBRATION_PHRASES[self.current_index]
        result = self.asr_engine.transcribe(audio, sample_rate=sample_rate)
        
        match_score = self._match_score(expected, result.transcript)
        
        self.results.append(CalibrationResult(
            expected=expected,
            transcribed=result.transcript,
            confidence=result.confidence,
            match_score=match_score,
            duration=len(audio) / sample_rate,
            noise_level=float(np.sqrt(np.mean(audio ** 2))),
            timestamp=time.time()
        ))
        
        self.current_index += 1
        
        if self.current_index >= len(QUICK_CALIBRATION_PHRASES):
            return self._complete()
        
        return {
            "success": True,
            "completed": False,
            "current_phrase": QUICK_CALIBRATION_PHRASES[self.current_index],
            "phrase_number": self.current_index + 1,
            "last_match_score": match_score
        }
    
    def _match_score(self, expected: str, actual: str) -> float:
        if not actual:
            return 0.0
        expected_words = set(expected.lower().split())
        actual_words = set(actual.lower().split())
        if not expected_words:
            return 0.0
        intersection = len(expected_words & actual_words)
        return intersection / len(expected_words)
    
    def _complete(self) -> Dict:
        self.is_calibrating = False
        
        accuracy = sum(r.match_score for r in self.results) / len(self.results) * 100
        
        # Save basic profile
        profile_data = {
            "name": self.profile_name,
            "accent": "neutral",
            "speech_rate": 1.0,
            "calibration_accuracy": accuracy,
            "calibrated_at": time.time(),
            "quick_calibration": True
        }
        
        filepath = Path(self.profiles_dir) / f"{self.profile_name}.json"
        with open(filepath, 'w') as f:
            json.dump(profile_data, f, indent=2)
        
        return {
            "success": True,
            "completed": True,
            "accuracy": accuracy,
            "profile_saved": str(filepath)
        }


# ============================================================================
# CLI INTERFACE
# ============================================================================

if __name__ == "__main__":
    print("🎤 DAWRV Voice Calibration System")
    print("="*50)
    print()
    print("Calibration Phases:")
    for i, (phase, phrases) in enumerate(CALIBRATION_PHRASES.items()):
        print(f"  {i+1}. {phase.replace('_', ' ').title()}: {len(phrases)} phrases")
    print()
    print(f"Total phrases: {len(ALL_CALIBRATION_PHRASES)}")
    print()
    print("Quick Calibration: 8 essential phrases")
    for i, phrase in enumerate(QUICK_CALIBRATION_PHRASES, 1):
        print(f"  {i}. \"{phrase}\"")





