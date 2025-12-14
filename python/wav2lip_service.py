#!/usr/bin/env python3
"""
RHEA Wav2Lip Animation Service
Generates lip-synced videos locally using Wav2Lip AI model

This service:
1. Takes RHEA's static image + audio/text
2. Generates a lip-synced video using Wav2Lip
3. Caches results for instant playback
4. Falls back to audio-reactive mode for instant response
"""

import os
import sys
import json
import time
import hashlib
import subprocess
import threading
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

app = Flask(__name__)
CORS(app)

# Configuration
CONFIG = {
    'port': 5555,
    'cache_dir': Path(__file__).parent / 'cache' / 'wav2lip',
    'rhea_image': Path(__file__).parent.parent / 'src' / 'renderer' / 'assets' / 'images' / 'rhea_avatar.png',
    'wav2lip_path': Path(__file__).parent / 'Wav2Lip',
    'model_path': Path(__file__).parent / 'models' / 'wav2lip.pth',
    'tts_voice': 'com.apple.speech.synthesis.voice.samantha',  # macOS
}

# Ensure cache directory exists
CONFIG['cache_dir'].mkdir(parents=True, exist_ok=True)

# Track service status
service_status = {
    'wav2lip_available': False,
    'model_loaded': False,
    'cache_count': 0,
    'processing': False
}


def get_cache_key(text):
    """Generate a cache key for the given text."""
    return hashlib.md5(text.lower().strip().encode()).hexdigest()[:16]


def get_cached_video(text):
    """Check if we have a cached video for this text."""
    cache_key = get_cache_key(text)
    cache_path = CONFIG['cache_dir'] / f"{cache_key}.mp4"
    if cache_path.exists():
        return cache_path
    return None


def generate_tts_audio(text, output_path):
    """Generate TTS audio using system voice."""
    try:
        # macOS: Use 'say' command
        if sys.platform == 'darwin':
            subprocess.run([
                'say', '-o', str(output_path),
                '--data-format=LEI16@22050',
                text
            ], check=True)
            
            # Convert to WAV if needed
            wav_path = output_path.with_suffix('.wav')
            subprocess.run([
                'ffmpeg', '-y', '-i', str(output_path),
                '-ar', '16000', '-ac', '1',
                str(wav_path)
            ], check=True, capture_output=True)
            return wav_path
            
        # Windows: Use pyttsx3 or edge-tts
        else:
            import pyttsx3
            engine = pyttsx3.init()
            engine.save_to_file(text, str(output_path))
            engine.runAndWait()
            return output_path
            
    except Exception as e:
        print(f"TTS Error: {e}")
        return None


def generate_wav2lip_video(audio_path, output_path):
    """Generate lip-synced video using Wav2Lip."""
    try:
        wav2lip_script = CONFIG['wav2lip_path'] / 'inference.py'
        
        if not wav2lip_script.exists():
            print("Wav2Lip not installed. Using fallback mode.")
            return None
        
        # Run Wav2Lip inference
        result = subprocess.run([
            'python', str(wav2lip_script),
            '--checkpoint_path', str(CONFIG['model_path']),
            '--face', str(CONFIG['rhea_image']),
            '--audio', str(audio_path),
            '--outfile', str(output_path),
            '--resize_factor', '1',
            '--nosmooth'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0 and output_path.exists():
            return output_path
        else:
            print(f"Wav2Lip error: {result.stderr}")
            return None
            
    except subprocess.TimeoutExpired:
        print("Wav2Lip timed out")
        return None
    except Exception as e:
        print(f"Wav2Lip error: {e}")
        return None


def generate_video_for_text(text):
    """Full pipeline: text -> TTS -> Wav2Lip -> video."""
    cache_key = get_cache_key(text)
    cache_path = CONFIG['cache_dir'] / f"{cache_key}.mp4"
    
    # Check cache first
    if cache_path.exists():
        return cache_path
    
    service_status['processing'] = True
    
    try:
        # Generate TTS audio
        audio_path = CONFIG['cache_dir'] / f"{cache_key}_audio.aiff"
        wav_path = generate_tts_audio(text, audio_path)
        
        if not wav_path:
            return None
        
        # Generate lip-synced video
        video_path = generate_wav2lip_video(wav_path, cache_path)
        
        # Clean up temp audio
        audio_path.unlink(missing_ok=True)
        wav_path.unlink(missing_ok=True)
        
        if video_path:
            service_status['cache_count'] += 1
            return video_path
        
        return None
        
    finally:
        service_status['processing'] = False


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.route('/status', methods=['GET'])
def status():
    """Check service status."""
    # Check if Wav2Lip is available
    wav2lip_exists = (CONFIG['wav2lip_path'] / 'inference.py').exists()
    model_exists = CONFIG['model_path'].exists()
    
    # Count cached videos
    cache_count = len(list(CONFIG['cache_dir'].glob('*.mp4')))
    
    return jsonify({
        'running': True,
        'wav2lip_available': wav2lip_exists,
        'model_loaded': model_exists,
        'cache_count': cache_count,
        'processing': service_status['processing'],
        'rhea_image_exists': CONFIG['rhea_image'].exists()
    })


@app.route('/generate', methods=['POST'])
def generate():
    """Generate a lip-synced video for the given text."""
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    # Check cache first
    cached = get_cached_video(text)
    if cached:
        return jsonify({
            'success': True,
            'cached': True,
            'video_url': f'/video/{get_cache_key(text)}'
        })
    
    # Generate new video (async)
    def generate_async():
        generate_video_for_text(text)
    
    thread = threading.Thread(target=generate_async)
    thread.start()
    
    return jsonify({
        'success': True,
        'cached': False,
        'processing': True,
        'message': 'Video generation started. Use /check endpoint to poll.'
    })


@app.route('/generate-sync', methods=['POST'])
def generate_sync():
    """Generate a lip-synced video synchronously (blocking)."""
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    video_path = generate_video_for_text(text)
    
    if video_path:
        return jsonify({
            'success': True,
            'video_url': f'/video/{get_cache_key(text)}'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Video generation failed'
        }), 500


@app.route('/check/<cache_key>', methods=['GET'])
def check_status(cache_key):
    """Check if a video is ready."""
    cache_path = CONFIG['cache_dir'] / f"{cache_key}.mp4"
    
    if cache_path.exists():
        return jsonify({
            'ready': True,
            'video_url': f'/video/{cache_key}'
        })
    else:
        return jsonify({
            'ready': False,
            'processing': service_status['processing']
        })


@app.route('/video/<cache_key>', methods=['GET'])
def get_video(cache_key):
    """Serve a cached video."""
    cache_path = CONFIG['cache_dir'] / f"{cache_key}.mp4"
    
    if cache_path.exists():
        return send_file(cache_path, mimetype='video/mp4')
    else:
        return jsonify({'error': 'Video not found'}), 404


@app.route('/precache', methods=['POST'])
def precache():
    """Pre-cache common phrases."""
    common_phrases = [
        "Playing",
        "Stopped", 
        "Recording",
        "Paused",
        "Track muted",
        "Track unmuted",
        "Track soloed",
        "Track unsoloed",
        "Track armed",
        "Track disarmed",
        "Got it",
        "Done",
        "Sure thing",
        "On it",
        "Okay",
        "Ready",
        "Listening"
    ]
    
    def cache_all():
        for phrase in common_phrases:
            if not get_cached_video(phrase):
                print(f"Pre-caching: {phrase}")
                generate_video_for_text(phrase)
                time.sleep(1)  # Avoid overloading
    
    thread = threading.Thread(target=cache_all)
    thread.start()
    
    return jsonify({
        'success': True,
        'message': f'Pre-caching {len(common_phrases)} phrases in background'
    })


@app.route('/clear-cache', methods=['POST'])
def clear_cache():
    """Clear the video cache."""
    count = 0
    for file in CONFIG['cache_dir'].glob('*'):
        file.unlink()
        count += 1
    
    return jsonify({
        'success': True,
        'cleared': count
    })


# =============================================================================
# AUDIO-REACTIVE FALLBACK (Real-time, no Wav2Lip needed)
# =============================================================================

@app.route('/analyze-amplitude', methods=['POST'])
def analyze_amplitude():
    """
    Analyze audio file and return amplitude data for mouth animation.
    This is used when Wav2Lip is not available or for instant response.
    """
    # This endpoint receives audio and returns amplitude timeline
    # Frontend uses this to animate RHEA's mouth in sync with speech
    
    data = request.json
    
    # For now, return a simulated mouth animation pattern
    # In production, this would analyze actual audio
    duration = data.get('duration', 2.0)
    
    # Generate mouth states based on typical speech patterns
    # 0 = closed, 1 = slightly open, 2 = open, 3 = wide
    frames_per_second = 30
    total_frames = int(duration * frames_per_second)
    
    import random
    mouth_states = []
    for i in range(total_frames):
        # Simulate speech patterns
        if i % 10 < 2:
            state = 0  # Closed for pauses
        else:
            state = random.choice([1, 1, 2, 2, 2, 3])
        mouth_states.append(state)
    
    return jsonify({
        'success': True,
        'fps': frames_per_second,
        'mouth_states': mouth_states
    })


# =============================================================================
# MAIN
# =============================================================================

def check_dependencies():
    """Check if required dependencies are installed."""
    print("🔍 Checking dependencies...")
    
    # Check for Wav2Lip
    if (CONFIG['wav2lip_path'] / 'inference.py').exists():
        print("✅ Wav2Lip found")
        service_status['wav2lip_available'] = True
    else:
        print("⚠️  Wav2Lip not found - will use audio-reactive mode")
        print(f"   To enable Wav2Lip, clone to: {CONFIG['wav2lip_path']}")
    
    # Check for model
    if CONFIG['model_path'].exists():
        print("✅ Wav2Lip model found")
        service_status['model_loaded'] = True
    else:
        print("⚠️  Wav2Lip model not found")
        print(f"   Download wav2lip.pth to: {CONFIG['model_path']}")
    
    # Check for ffmpeg
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True)
        print("✅ FFmpeg found")
    except:
        print("⚠️  FFmpeg not found - required for audio processing")
    
    # Check RHEA image
    if CONFIG['rhea_image'].exists():
        print(f"✅ RHEA image found: {CONFIG['rhea_image']}")
    else:
        print(f"⚠️  RHEA image not found at: {CONFIG['rhea_image']}")


if __name__ == '__main__':
    print("=" * 60)
    print("🎭 RHEA Wav2Lip Animation Service")
    print("=" * 60)
    
    check_dependencies()
    
    print()
    print(f"🚀 Starting server on http://localhost:{CONFIG['port']}")
    print()
    print("Endpoints:")
    print("  GET  /status        - Check service status")
    print("  POST /generate      - Generate video (async)")
    print("  POST /generate-sync - Generate video (blocking)")
    print("  GET  /check/<key>   - Check if video is ready")
    print("  GET  /video/<key>   - Get cached video")
    print("  POST /precache      - Pre-cache common phrases")
    print("  POST /clear-cache   - Clear video cache")
    print()
    
    app.run(host='0.0.0.0', port=CONFIG['port'], debug=False, threaded=True)





