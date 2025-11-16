#!/usr/bin/env python3
"""
Test if REAPER is actually executing actions via HTTP API
"""
import urllib.request
import time
import subprocess

def get_transport_state():
    """Get current transport state from Reaper"""
    try:
        url = "http://localhost:8080/_/GET/TRANSPORT"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.read().decode().strip()
    except Exception as e:
        return f"Error: {e}"

def test_action_execution(action_id, action_name):
    """Test if an action actually executes"""
    print(f"\n{'='*60}")
    print(f"Testing Action: {action_name} (ID: {action_id})")
    print(f"{'='*60}")
    
    # Activate Reaper
    print("1. Activating REAPER...")
    try:
        subprocess.run(['osascript', '-e', 'tell application "REAPER" to activate'], 
                      timeout=1, capture_output=True)
        time.sleep(0.3)
        print("   ✅ REAPER activated")
    except Exception as e:
        print(f"   ⚠️  Could not activate: {e}")
    
    # Get state before
    print("2. Getting transport state BEFORE action...")
    state_before = get_transport_state()
    print(f"   State: {state_before}")
    
    # Send action
    print(f"3. Sending action {action_id} via HTTP API...")
    try:
        url = f"http://localhost:8080/_/ACTION/{action_id}"
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=3)
        print(f"   ✅ HTTP Response: {response.status}")
        time.sleep(0.5)  # Wait for action to execute
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False
    
    # Get state after
    print("4. Getting transport state AFTER action...")
    state_after = get_transport_state()
    print(f"   State: {state_after}")
    
    # Check if state changed
    if state_before != state_after:
        print("   ✅ State changed - action appears to have executed!")
        return True
    else:
        print("   ⚠️  State unchanged - action may not have executed")
        print("   (This could be normal if already in that state)")
        return None

if __name__ == "__main__":
    print("REAPER Action Execution Test")
    print("=" * 60)
    print("\nMake sure REAPER is running and HTTP API is enabled!")
    print("(Preferences > Control/OSC/web > Web interface)")
    
    # Test play action
    test_action_execution(1007, "Play")
    
    time.sleep(1)
    
    # Test stop action
    test_action_execution(1016, "Stop")
    
    print("\n" + "=" * 60)
    print("Test complete!")
    print("\nIf actions aren't executing:")
    print("1. Check REAPER HTTP API is enabled (port 8080)")
    print("2. Check REAPER is running and not minimized")
    print("3. Try enabling OSC as alternative (port 8000)")
    print("4. Check REAPER console for any error messages")

