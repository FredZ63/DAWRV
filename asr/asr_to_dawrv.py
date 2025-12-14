#!/usr/bin/env python3
"""
DAWRV ASR Integration
=====================
Integration layer between ASR engine and DAWRV NLU/Intent Engine.

This module provides:
- onTranscript callback hook
- DAWRV NLU routing
- Command file output for Electron app
- WebSocket/HTTP API for real-time communication
"""

import os
import sys
import json
import time
import logging
import threading
from pathlib import Path
from typing import Optional, Callable, Dict, Any, List
from dataclasses import dataclass
import http.server
import socketserver

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from asr.engine import (
    DAWRVASREngine,
    TranscriptResult,
    ASRMode,
    ConfidenceLevel,
    get_engine
)
from asr.streaming import (
    StreamingASR,
    RealtimeASRSession,
    PartialTranscript
)

logger = logging.getLogger('DAWRV_Integration')

# ============================================================================
# COMMAND FILE OUTPUT (for Electron IPC)
# ============================================================================

COMMAND_FILE = '/tmp/dawrv_voice_command.txt'
STATUS_FILE = '/tmp/dawrv_asr_status.json'


def _write_status_to_file(text: str, confidence: float, mode: str, *, is_final: bool, provider: str = "local"):
    """Write status JSON for Electron to poll (supports partial + final)."""
    try:
        status = {
            "text": text,
            "confidence": float(confidence) if confidence is not None else 0.0,
            "mode": mode,
            "timestamp": time.time(),
            "is_final": bool(is_final),
            "provider": provider,
        }
        with open(STATUS_FILE, 'w') as f:
            json.dump(status, f)
    except Exception as e:
        logger.error(f"Error writing status: {e}")


def write_command_to_file(text: str, confidence: float, mode: str, *, provider: str = "local"):
    """
    Write command to file for DAWRV Electron app to read.
    This is the simplest integration method.
    """
    try:
        with open(COMMAND_FILE, 'w') as f:
            f.write(text)

        # Also write status (final)
        _write_status_to_file(text, confidence, mode, is_final=True, provider=provider)
        
        logger.info(f"📝 Command written: {text}")
    except Exception as e:
        logger.error(f"Error writing command: {e}")


# ============================================================================
# DAWRV NLU INTERFACE
# ============================================================================

class DAWRVNLUInterface:
    """
    Interface to DAWRV's Natural Language Understanding system.
    Routes transcripts to the appropriate handler based on confidence.
    """
    
    def __init__(self):
        self.confidence_thresholds = {
            'execute': 0.85,
            'confirm': 0.55
        }
        
        # Callbacks for different confidence levels
        self.on_execute: Optional[Callable[[str], None]] = None
        self.on_confirm: Optional[Callable[[str], None]] = None
        self.on_repeat: Optional[Callable[[], None]] = None
        
        # Command queue for confirmation
        self.pending_command: Optional[str] = None
        
        # Statistics
        self.stats = {
            'total_commands': 0,
            'executed': 0,
            'confirmed': 0,
            'repeated': 0
        }
    
    def process(self, result: TranscriptResult) -> Dict[str, Any]:
        """
        Process a transcript result and route to appropriate handler.
        
        Args:
            result: TranscriptResult from ASR engine
        
        Returns:
            Action result with action type and message
        """
        self.stats['total_commands'] += 1
        
        confidence_level = result.get_confidence_level()
        
        if confidence_level == ConfidenceLevel.HIGH:
            return self._handle_execute(result)
        elif confidence_level == ConfidenceLevel.MEDIUM:
            return self._handle_confirm(result)
        else:
            return self._handle_repeat(result)
    
    def _handle_execute(self, result: TranscriptResult) -> Dict[str, Any]:
        """Handle high-confidence command - execute immediately"""
        self.stats['executed'] += 1
        
        # Write to command file for DAWRV
        write_command_to_file(result.transcript, result.confidence, result.mode, provider=getattr(result, "provider", "local"))
        
        # Fire callback
        if self.on_execute:
            self.on_execute(result.transcript)
        
        return {
            'action': 'execute',
            'command': result.transcript,
            'confidence': result.confidence,
            'message': f"Executing: {result.transcript}"
        }
    
    def _handle_confirm(self, result: TranscriptResult) -> Dict[str, Any]:
        """Handle medium-confidence command - request confirmation"""
        self.stats['confirmed'] += 1
        self.pending_command = result.transcript
        
        # Fire callback
        if self.on_confirm:
            self.on_confirm(result.transcript)
        
        return {
            'action': 'confirm',
            'command': result.transcript,
            'confidence': result.confidence,
            'message': f"Did you say: {result.transcript}?"
        }
    
    def _handle_repeat(self, result: TranscriptResult) -> Dict[str, Any]:
        """Handle low-confidence - ask for repeat"""
        self.stats['repeated'] += 1
        
        # Fire callback
        if self.on_repeat:
            self.on_repeat()
        
        return {
            'action': 'repeat',
            'confidence': result.confidence,
            'message': "I didn't catch that. Could you repeat?"
        }
    
    def confirm_pending(self) -> Optional[Dict[str, Any]]:
        """Confirm the pending command"""
        if self.pending_command:
            cmd = self.pending_command
            self.pending_command = None
            
            # Write confirmed command
            write_command_to_file(cmd, 1.0, "command")
            
            if self.on_execute:
                self.on_execute(cmd)
            
            return {
                'action': 'execute',
                'command': cmd,
                'message': f"Confirmed: {cmd}"
            }
        return None
    
    def cancel_pending(self):
        """Cancel the pending command"""
        self.pending_command = None
        return {'action': 'cancelled', 'message': 'Command cancelled'}


# ============================================================================
# MAIN INTEGRATION HANDLER
# ============================================================================

class DAWRVASRIntegration:
    """
    Main integration class connecting ASR to DAWRV.
    
    Usage:
        integration = DAWRVASRIntegration()
        integration.start()
        # ... ASR processes commands automatically
        integration.stop()
    """
    
    def __init__(
        self,
        model_size: str = "base",
        sample_rate: int = 16000
    ):
        """
        Initialize DAWRV ASR integration.
        
        Args:
            model_size: Whisper model size
            sample_rate: Audio sample rate
        """
        # Initialize ASR engine
        self.engine = get_engine(model_size=model_size)
        
        # Initialize NLU interface
        self.nlu = DAWRVNLUInterface()
        
        # Initialize streaming session
        self.session: Optional[RealtimeASRSession] = None
        self.sample_rate = sample_rate
        
        # State
        self.is_running = False
        self.is_listening = True  # Can be paused
        
        # Event callbacks (for DAWRV frontend)
        self.on_transcript: Optional[Callable[[Dict], None]] = None
        self.on_partial: Optional[Callable[[str], None]] = None
        self.on_status: Optional[Callable[[str], None]] = None
        
        logger.info("DAWRV ASR Integration initialized")
    
    def _on_final_transcript(self, result: TranscriptResult):
        """Handle final transcript from ASR"""
        if not self.is_listening:
            return
        
        logger.info(f"🎯 Final: '{result.transcript}' (conf={result.confidence:.2f})")
        
        # Process through NLU
        action_result = self.nlu.process(result)
        
        # Combine ASR result with NLU action
        output = {
            **result.to_dict(),
            'nlu_action': action_result
        }
        
        # Fire callback for DAWRV
        if self.on_transcript:
            self.on_transcript(output)
    
    def _on_partial_transcript(self, partial: PartialTranscript):
        """Handle partial transcript for live feedback"""
        if not self.is_listening:
            return

        # Emit partial status update so Electron/renderer can show live text,
        # but MUST NOT execute commands from partials.
        if partial and partial.text:
            _write_status_to_file(
                partial.text,
                getattr(partial, "confidence", 0.0),
                self.engine.mode.value if self.engine else "command",
                is_final=False,
                provider="local",
            )

        if self.on_partial:
            self.on_partial(partial.text)
    
    def start(self):
        """Start ASR listening"""
        if self.is_running:
            logger.warning("ASR already running")
            return
        
        # Load model first
        logger.info("Loading ASR model...")
        self.engine.load_model()
        
        # Create session
        self.session = RealtimeASRSession(
            engine=self.engine,
            sample_rate=self.sample_rate,
            on_transcript=self._on_final_transcript,
            on_partial=self._on_partial_transcript
        )
        
        # Start listening
        self.session.start()
        self.is_running = True
        
        if self.on_status:
            self.on_status("listening")
        
        logger.info("🎤 ASR listening started")
    
    def stop(self):
        """Stop ASR listening"""
        if not self.is_running:
            return
        
        if self.session:
            self.session.stop()
            self.session = None
        
        self.is_running = False
        
        if self.on_status:
            self.on_status("stopped")
        
        logger.info("🔇 ASR stopped")
    
    def pause(self):
        """Pause listening (keep session alive)"""
        self.is_listening = False
        if self.on_status:
            self.on_status("paused")
        logger.info("⏸️ ASR paused")
    
    def resume(self):
        """Resume listening"""
        self.is_listening = True
        if self.on_status:
            self.on_status("listening")
        logger.info("▶️ ASR resumed")
    
    def set_mode(self, mode: str):
        """Set ASR mode (command/dictation)"""
        if mode.lower() == "command":
            self.engine.set_mode(ASRMode.COMMAND)
        elif mode.lower() == "dictation":
            self.engine.set_mode(ASRMode.DICTATION)
        logger.info(f"📝 Mode set to: {mode}")
    
    def confirm(self) -> Dict:
        """Confirm pending command"""
        return self.nlu.confirm_pending() or {'action': 'no_pending'}
    
    def cancel(self) -> Dict:
        """Cancel pending command"""
        return self.nlu.cancel_pending()
    
    def get_stats(self) -> Dict:
        """Get statistics"""
        return {
            'is_running': self.is_running,
            'is_listening': self.is_listening,
            'mode': self.engine.mode.value,
            'nlu_stats': self.nlu.stats,
            'streaming_stats': self.session.get_stats() if self.session else {}
        }


# ============================================================================
# CALLBACK HOOK (Main Integration Point)
# ============================================================================

def onTranscript(data: Dict) -> Dict:
    """
    Main callback hook for DAWRV integration.
    
    This is the primary integration point - ASR outputs go here,
    then to DAWRV's NLU/Intent Engine.
    
    Args:
        data: Transcript data dict with format:
            {
                "transcript": str,
                "segments": List[Dict],
                "confidence": float,
                "mode": str,
                "speaker_profile": str,
                "noise_level": str,
                "nlu_action": Dict
            }
    
    Returns:
        Action result for DAWRV
    """
    # This function is called by the integration layer
    # Route to DAWRV NLU
    return DAWRV_NLU(data)


def DAWRV_NLU(data: Dict) -> Dict:
    """
    DAWRV Natural Language Understanding entry point.
    
    This function receives processed ASR output and
    determines the appropriate DAW action.
    
    Args:
        data: ASR output with NLU action
    
    Returns:
        Final action result
    """
    transcript = data.get('transcript', '')
    confidence = data.get('confidence', 0)
    nlu_action = data.get('nlu_action', {})
    
    # Log for debugging
    logger.info(f"🧠 DAWRV_NLU received: '{transcript}' (conf={confidence:.2f})")
    
    # Return the action result
    # In production, this would route to DAWRV's intent classifier
    return {
        'success': True,
        'transcript': transcript,
        'action': nlu_action.get('action', 'unknown'),
        'command': nlu_action.get('command', transcript),
        'confidence': confidence,
        'message': nlu_action.get('message', '')
    }


# ============================================================================
# HTTP API SERVER (Optional)
# ============================================================================

class ASRAPIHandler(http.server.BaseHTTPRequestHandler):
    """Simple HTTP API handler for ASR control"""
    
    integration: 'DAWRVASRIntegration' = None
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/status':
            self._send_json(self.integration.get_stats() if self.integration else {})
        elif self.path == '/start':
            if self.integration:
                self.integration.start()
            self._send_json({'status': 'started'})
        elif self.path == '/stop':
            if self.integration:
                self.integration.stop()
            self._send_json({'status': 'stopped'})
        elif self.path == '/pause':
            if self.integration:
                self.integration.pause()
            self._send_json({'status': 'paused'})
        elif self.path == '/resume':
            if self.integration:
                self.integration.resume()
            self._send_json({'status': 'resumed'})
        else:
            self._send_json({'error': 'Unknown endpoint'}, 404)
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/confirm':
            result = self.integration.confirm() if self.integration else {}
            self._send_json(result)
        elif self.path == '/cancel':
            result = self.integration.cancel() if self.integration else {}
            self._send_json(result)
        elif self.path == '/mode':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            mode = data.get('mode', 'command')
            if self.integration:
                self.integration.set_mode(mode)
            self._send_json({'mode': mode})
        else:
            self._send_json({'error': 'Unknown endpoint'}, 404)
    
    def _send_json(self, data: Dict, status: int = 200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass


def start_api_server(integration: DAWRVASRIntegration, port: int = 8765):
    """Start HTTP API server"""
    ASRAPIHandler.integration = integration
    
    with socketserver.TCPServer(("", port), ASRAPIHandler) as httpd:
        logger.info(f"🌐 ASR API server running on port {port}")
        httpd.serve_forever()


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Main entry point for DAWRV ASR integration"""
    import argparse
    
    parser = argparse.ArgumentParser(description="DAWRV ASR Integration")
    parser.add_argument("--model", default="base", help="Whisper model size")
    parser.add_argument("--api", action="store_true", help="Start HTTP API server")
    parser.add_argument("--port", type=int, default=8765, help="API server port")
    parser.add_argument("--duration", type=int, default=0, help="Listen duration (0=infinite)")
    
    args = parser.parse_args()
    
    print("🎤 DAWRV ASR Integration")
    print(f"   Model: {args.model}")
    print()
    
    # Create integration
    integration = DAWRVASRIntegration(model_size=args.model)
    
    # Set up callbacks
    def on_transcript(data):
        result = onTranscript(data)
        action = result.get('action', 'unknown')
        command = result.get('command', '')
        print(f"✅ [{action.upper()}] {command}")
    
    def on_partial(text):
        print(f"   ... {text}", end='\r')
    
    integration.on_transcript = on_transcript
    integration.on_partial = on_partial
    
    # Start API server in background if requested
    if args.api:
        api_thread = threading.Thread(
            target=start_api_server,
            args=(integration, args.port),
            daemon=True
        )
        api_thread.start()
        print(f"🌐 API server: http://localhost:{args.port}")
    
    # Start listening
    integration.start()
    
    print("🎧 Listening... (Ctrl+C to stop)")
    print()
    
    try:
        if args.duration > 0:
            time.sleep(args.duration)
        else:
            # Run forever
            while True:
                time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n👋 Stopping...")
    finally:
        integration.stop()
        print("✅ DAWRV ASR integration stopped")
        
        # Print stats
        stats = integration.get_stats()
        print(f"\n📊 Session Stats:")
        print(f"   Commands: {stats['nlu_stats']['total_commands']}")
        print(f"   Executed: {stats['nlu_stats']['executed']}")
        print(f"   Confirmed: {stats['nlu_stats']['confirmed']}")
        print(f"   Repeated: {stats['nlu_stats']['repeated']}")


if __name__ == "__main__":
    main()





