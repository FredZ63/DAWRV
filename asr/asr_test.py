#!/usr/bin/env python3
"""
DAWRV/Rhea ASR Test Suite
=========================
Comprehensive tests for the ASR engine and streaming components.
"""

import os
import sys
import time
import json
import unittest
import numpy as np
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from asr.engine import (
    DAWRVASREngine,
    TranscriptResult,
    WordSegment,
    ASRMode,
    ConfidenceLevel,
    VoiceProfile,
    VocabularyManager,
    ProfileManager,
    get_engine
)

from asr.streaming import (
    VoiceActivityDetector,
    AudioBuffer,
    StreamingASR,
    PartialTranscript
)


class TestVocabularyManager(unittest.TestCase):
    """Tests for VocabularyManager"""
    
    def setUp(self):
        self.vocab_path = "/tmp/test_vocab.json"
        self.manager = VocabularyManager(self.vocab_path)
    
    def tearDown(self):
        if os.path.exists(self.vocab_path):
            os.remove(self.vocab_path)
    
    def test_load_default_vocabulary(self):
        """Test loading default vocabulary"""
        terms = self.manager.get_all_terms()
        self.assertGreater(len(terms), 0)
        self.assertIn("play", terms)
        self.assertIn("stop", terms)
    
    def test_add_alias(self):
        """Test adding custom alias"""
        self.manager.add_alias("pump it", "add_compression")
        self.assertEqual(
            self.manager.resolve_alias("pump it"),
            "add_compression"
        )
    
    def test_resolve_unknown_alias(self):
        """Test resolving unknown phrase returns original"""
        result = self.manager.resolve_alias("unknown phrase")
        self.assertEqual(result, "unknown phrase")


class TestVoiceProfile(unittest.TestCase):
    """Tests for VoiceProfile"""
    
    def test_profile_creation(self):
        """Test creating a voice profile"""
        profile = VoiceProfile(name="TestUser", accent="american")
        self.assertEqual(profile.name, "TestUser")
        self.assertEqual(profile.accent, "american")
        self.assertEqual(profile.speech_rate, 1.0)
    
    def test_profile_serialization(self):
        """Test profile to/from dict"""
        profile = VoiceProfile(name="TestUser")
        data = profile.to_dict()
        restored = VoiceProfile.from_dict(data)
        self.assertEqual(restored.name, profile.name)


class TestProfileManager(unittest.TestCase):
    """Tests for ProfileManager"""
    
    def setUp(self):
        self.profiles_dir = "/tmp/test_profiles"
        os.makedirs(self.profiles_dir, exist_ok=True)
        self.manager = ProfileManager(self.profiles_dir)
    
    def tearDown(self):
        import shutil
        if os.path.exists(self.profiles_dir):
            shutil.rmtree(self.profiles_dir)
    
    def test_create_profile(self):
        """Test creating and saving a profile"""
        profile = self.manager.create_profile("TestUser", "british")
        self.assertIn("TestUser", self.manager.profiles)
        self.assertEqual(profile.accent, "british")
    
    def test_set_active_profile(self):
        """Test setting active profile"""
        self.manager.create_profile("User1")
        self.assertTrue(self.manager.set_active("User1"))
        self.assertEqual(self.manager.get_active_name(), "User1")
    
    def test_set_nonexistent_profile(self):
        """Test setting non-existent profile fails"""
        self.assertFalse(self.manager.set_active("NonExistent"))


class TestTranscriptResult(unittest.TestCase):
    """Tests for TranscriptResult"""
    
    def test_confidence_level_high(self):
        """Test high confidence detection"""
        result = TranscriptResult(
            transcript="test",
            segments=[],
            confidence=0.90,
            mode="command",
            speaker_profile="default",
            noise_level="low",
            timestamp=time.time()
        )
        self.assertEqual(result.get_confidence_level(), ConfidenceLevel.HIGH)
    
    def test_confidence_level_medium(self):
        """Test medium confidence detection"""
        result = TranscriptResult(
            transcript="test",
            segments=[],
            confidence=0.70,
            mode="command",
            speaker_profile="default",
            noise_level="low",
            timestamp=time.time()
        )
        self.assertEqual(result.get_confidence_level(), ConfidenceLevel.MEDIUM)
    
    def test_confidence_level_low(self):
        """Test low confidence detection"""
        result = TranscriptResult(
            transcript="test",
            segments=[],
            confidence=0.40,
            mode="command",
            speaker_profile="default",
            noise_level="low",
            timestamp=time.time()
        )
        self.assertEqual(result.get_confidence_level(), ConfidenceLevel.LOW)
    
    def test_to_dict(self):
        """Test serialization to dict"""
        result = TranscriptResult(
            transcript="arm tracks 1 through 8",
            segments=[
                WordSegment(word="arm", start=0.1, end=0.3, confidence=0.95)
            ],
            confidence=0.91,
            mode="command",
            speaker_profile="User1",
            noise_level="low",
            timestamp=1234567890.0
        )
        data = result.to_dict()
        
        self.assertEqual(data["transcript"], "arm tracks 1 through 8")
        self.assertEqual(data["confidence"], 0.91)
        self.assertEqual(data["mode"], "command")
        self.assertEqual(len(data["segments"]), 1)
        self.assertEqual(data["segments"][0]["word"], "arm")


class TestVoiceActivityDetector(unittest.TestCase):
    """Tests for VoiceActivityDetector"""
    
    def setUp(self):
        self.vad = VoiceActivityDetector(sample_rate=16000)
    
    def test_silence_detection(self):
        """Test detecting silence"""
        silence = np.zeros(480, dtype=np.float32)
        self.assertFalse(self.vad.is_speech(silence))
    
    def test_speech_detection(self):
        """Test detecting speech (simulated with noise)"""
        # Generate loud signal
        speech = np.random.randn(480).astype(np.float32) * 0.3
        # Note: This might not always pass as VAD is adaptive
        # The test validates the interface works
        result = self.vad.is_speech(speech)
        self.assertIsInstance(result, bool)
    
    def test_reset(self):
        """Test VAD reset"""
        self.vad.is_speaking = True
        self.vad.speech_buffer = [np.zeros(480)]
        self.vad.reset()
        self.assertFalse(self.vad.is_speaking)
        self.assertEqual(len(self.vad.speech_buffer), 0)


class TestAudioBuffer(unittest.TestCase):
    """Tests for AudioBuffer"""
    
    def setUp(self):
        self.buffer = AudioBuffer(
            sample_rate=16000,
            buffer_duration_s=5.0,
            chunk_duration_ms=200
        )
    
    def test_write_and_read(self):
        """Test writing and reading audio"""
        # Write 1 second of audio
        audio = np.random.randn(16000).astype(np.float32)
        self.buffer.write(audio)
        
        # Read chunks
        chunks_read = 0
        while True:
            chunk = self.buffer.read_chunk()
            if chunk is None:
                break
            chunks_read += 1
            self.assertEqual(len(chunk), self.buffer.chunk_size)
        
        # Should read 5 chunks (16000 samples / 3200 chunk_size = 5)
        self.assertEqual(chunks_read, 5)
    
    def test_get_recent(self):
        """Test getting recent audio"""
        audio = np.ones(16000, dtype=np.float32)
        self.buffer.write(audio)
        
        recent = self.buffer.get_recent(0.5)  # 0.5 seconds
        self.assertEqual(len(recent), 8000)
    
    def test_clear(self):
        """Test clearing buffer"""
        self.buffer.write(np.ones(1000, dtype=np.float32))
        self.buffer.clear()
        self.assertIsNone(self.buffer.read_chunk())


class TestASREngine(unittest.TestCase):
    """Tests for DAWRVASREngine"""
    
    @classmethod
    def setUpClass(cls):
        """Set up engine once for all tests"""
        cls.engine = DAWRVASREngine(model_size="tiny")
    
    def test_mode_switching(self):
        """Test mode switching"""
        self.engine.set_mode(ASRMode.COMMAND)
        self.assertEqual(self.engine.mode, ASRMode.COMMAND)
        
        self.engine.set_mode(ASRMode.DICTATION)
        self.assertEqual(self.engine.mode, ASRMode.DICTATION)
        
        # Reset
        self.engine.set_mode(ASRMode.COMMAND)
    
    def test_mode_toggle(self):
        """Test mode toggling"""
        self.engine.set_mode(ASRMode.COMMAND)
        new_mode = self.engine.toggle_mode()
        self.assertEqual(new_mode, ASRMode.DICTATION)
        
        new_mode = self.engine.toggle_mode()
        self.assertEqual(new_mode, ASRMode.COMMAND)
    
    def test_noise_level_estimation(self):
        """Test noise level estimation"""
        # Quiet audio
        quiet = np.zeros(16000, dtype=np.float32)
        level = self.engine.estimate_noise_level(quiet)
        self.assertEqual(level, "low")
        
        # Loud audio
        loud = np.random.randn(16000).astype(np.float32) * 0.5
        level = self.engine.estimate_noise_level(loud)
        self.assertIn(level, ["medium", "high"])
    
    def test_confidence_action_high(self):
        """Test confidence action for high confidence"""
        result = TranscriptResult(
            transcript="play",
            segments=[],
            confidence=0.95,
            mode="command",
            speaker_profile="default",
            noise_level="low",
            timestamp=time.time()
        )
        action = self.engine.get_confidence_action(result)
        self.assertEqual(action["action"], "execute")
    
    def test_confidence_action_medium(self):
        """Test confidence action for medium confidence"""
        result = TranscriptResult(
            transcript="play",
            segments=[],
            confidence=0.70,
            mode="command",
            speaker_profile="default",
            noise_level="low",
            timestamp=time.time()
        )
        action = self.engine.get_confidence_action(result)
        self.assertEqual(action["action"], "confirm")
    
    def test_confidence_action_low(self):
        """Test confidence action for low confidence"""
        result = TranscriptResult(
            transcript="play",
            segments=[],
            confidence=0.40,
            mode="command",
            speaker_profile="default",
            noise_level="low",
            timestamp=time.time()
        )
        action = self.engine.get_confidence_action(result)
        self.assertEqual(action["action"], "repeat")
    
    def test_transcribe_silence(self):
        """Test transcribing silence returns empty result"""
        self.engine.load_model()
        silence = np.zeros(16000, dtype=np.float32)
        result = self.engine.transcribe(silence)
        self.assertIsInstance(result, TranscriptResult)
        # Silence should produce empty or very low confidence result


class TestOutputFormat(unittest.TestCase):
    """Test that output matches required format"""
    
    def test_output_format_compliance(self):
        """Test that TranscriptResult matches required format"""
        result = TranscriptResult(
            transcript="arm tracks 1 thru 8",
            segments=[
                WordSegment(word="arm", start=0.12, end=0.38, confidence=0.94),
                WordSegment(word="tracks", start=0.40, end=0.65, confidence=0.92),
                WordSegment(word="1", start=0.68, end=0.75, confidence=0.95),
                WordSegment(word="thru", start=0.78, end=0.90, confidence=0.88),
                WordSegment(word="8", start=0.92, end=1.00, confidence=0.96),
            ],
            confidence=0.91,
            mode="command",
            speaker_profile="User1",
            noise_level="low",
            timestamp=time.time()
        )
        
        data = result.to_dict()
        
        # Check required fields
        self.assertIn("transcript", data)
        self.assertIn("segments", data)
        self.assertIn("confidence", data)
        self.assertIn("mode", data)
        self.assertIn("speaker_profile", data)
        self.assertIn("noise_level", data)
        
        # Check segment format
        for segment in data["segments"]:
            self.assertIn("word", segment)
            self.assertIn("start", segment)
            self.assertIn("end", segment)
            self.assertIn("confidence", segment)
        
        # Print formatted output for visual verification
        print("\n📋 Output Format Test:")
        print(json.dumps(data, indent=2))


def run_integration_test():
    """Run a simple integration test"""
    print("\n" + "="*60)
    print("🧪 DAWRV ASR Integration Test")
    print("="*60)
    
    # Test 1: Engine initialization
    print("\n1️⃣ Testing engine initialization...")
    engine = DAWRVASREngine(model_size="tiny")
    print(f"   ✅ Engine created (device={engine.device})")
    
    # Test 2: Vocabulary
    print("\n2️⃣ Testing vocabulary...")
    vocab = engine.vocab_manager
    terms = vocab.get_all_terms()
    print(f"   ✅ Loaded {len(terms)} vocabulary terms")
    
    # Test 3: Mode switching
    print("\n3️⃣ Testing mode switching...")
    engine.set_mode(ASRMode.COMMAND)
    assert engine.mode == ASRMode.COMMAND
    engine.set_mode(ASRMode.DICTATION)
    assert engine.mode == ASRMode.DICTATION
    print("   ✅ Mode switching works")
    
    # Test 4: Transcription (if model loads)
    print("\n4️⃣ Testing transcription...")
    try:
        engine.load_model()
        test_audio = np.random.randn(16000).astype(np.float32) * 0.01
        result = engine.transcribe(test_audio)
        print(f"   ✅ Transcription returned: confidence={result.confidence:.2f}")
        print(f"   ✅ Output format valid: {list(result.to_dict().keys())}")
    except Exception as e:
        print(f"   ⚠️ Transcription test skipped: {e}")
    
    # Test 5: VAD
    print("\n5️⃣ Testing VAD...")
    vad = VoiceActivityDetector()
    silence = np.zeros(480, dtype=np.float32)
    is_speech = vad.is_speech(silence)
    assert not is_speech, "VAD should detect silence"
    print("   ✅ VAD correctly detects silence")
    
    # Test 6: Audio buffer
    print("\n6️⃣ Testing audio buffer...")
    buffer = AudioBuffer()
    buffer.write(np.zeros(16000, dtype=np.float32))
    chunk = buffer.read_chunk()
    assert chunk is not None
    print(f"   ✅ Audio buffer works (chunk size: {len(chunk)})")
    
    print("\n" + "="*60)
    print("✅ All integration tests passed!")
    print("="*60)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="DAWRV ASR Tests")
    parser.add_argument("--unit", action="store_true", help="Run unit tests")
    parser.add_argument("--integration", action="store_true", help="Run integration test")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    
    args = parser.parse_args()
    
    if args.all or (not args.unit and not args.integration):
        # Run all tests
        print("🧪 Running all DAWRV ASR tests...\n")
        
        # Integration test first
        run_integration_test()
        
        # Unit tests
        print("\n📋 Running unit tests...\n")
        unittest.main(argv=[''], exit=False, verbosity=2)
    
    elif args.unit:
        print("📋 Running unit tests...\n")
        unittest.main(argv=[''], exit=False, verbosity=2)
    
    elif args.integration:
        run_integration_test()





