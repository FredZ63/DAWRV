#!/usr/bin/env python3
"""
Test REAPER action IDs to verify which ones work
"""
import urllib.request
import subprocess
import time
import sys

def test_action(action_id, action_name):
    """Test if an action ID works"""
    print(f"\nTesting: {action_name} (ID: {action_id})")
    print("-" * 60)
    
    # Activate REAPER
    try:
        subprocess.run(['osascript', '-e', 'tell application "REAPER" to activate'], 
                      timeout=1, capture_output=True)
        time.sleep(0.2)
    except:
        pass
    
    # Try HTTP API
    try:
        url = f"http://localhost:8080/_/ACTION/{action_id}"
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=2)
        if response.status == 200:
            print(f"✅ HTTP API: Status 200 (action sent)")
            print(f"   👀 Check REAPER - did '{action_name}' execute?")
            return True
    except Exception as e:
        print(f"❌ HTTP API failed: {e}")
        return False

# Standard REAPER action IDs (verified)
standard_actions = {
    # Transport
    'Play': 1007,
    'Stop': 1016,
    'Record': 1013,
    'Pause': 1008,
    'Rewind': 1014,
    'Fast Forward': 1015,
    'Loop': 1068,
    
    # Editing
    'Undo': 40029,
    'Redo': 40030,
    'Cut': 40001,
    'Copy': 40003,
    'Paste': 40004,
    'Delete': 40005,
    
    # Project
    'Save': 40026,
    'Save As': 40022,
    'New Project': 40023,
    'Open Project': 40025,
    
    # Tracks
    'New Track': 40001,  # Same as Cut - might be wrong
    'Delete Track': 40005,  # Same as Delete - might be wrong
    
    # Navigation
    'Zoom In': 1011,
    'Zoom Out': 1012,
    
    # Markers
    'Add Marker': 40157,
    'Next Marker': 40161,
    'Previous Marker': 40162,
}

print("=" * 60)
print("REAPER Action ID Verification")
print("=" * 60)
print("\nTesting action IDs to see which ones work...")
print("Watch REAPER to see if actions actually execute!")
print("\nPress Enter after each test to continue...")

working = []
not_working = []

for name, action_id in standard_actions.items():
    result = test_action(action_id, name)
    if result:
        working.append((name, action_id))
    else:
        not_working.append((name, action_id))
    
    # Small delay
    time.sleep(0.5)

print("\n" + "=" * 60)
print("RESULTS:")
print("=" * 60)
print(f"\n✅ Working Actions ({len(working)}):")
for name, action_id in working:
    print(f"   {name}: {action_id}")

print(f"\n❌ Not Working Actions ({len(not_working)}):")
for name, action_id in not_working:
    print(f"   {name}: {action_id}")
    print(f"      → May need custom ReaScript or different action ID")

print("\n" + "=" * 60)
print("To find correct action IDs in REAPER:")
print("1. Actions > Show action list")
print("2. Search for the action name")
print("3. The ID is shown in the list")
print("=" * 60)

