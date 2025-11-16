#!/usr/bin/env python3
"""
REAPER OSC Sender - Send actions via OSC
"""
import socket
import sys

def send_reaper_action(action_id):
    """Send REAPER action via OSC"""
    try:
        # REAPER's default OSC port is 8000
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Send action command
        message = f"/action/{action_id}".encode()
        sock.sendto(message, ('127.0.0.1', 8000))
        sock.close()
        return True
    except Exception as e:
        print(f"OSC error: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        action_id = sys.argv[1]
        success = send_reaper_action(action_id)
        sys.exit(0 if success else 1)
