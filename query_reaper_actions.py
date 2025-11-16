#!/usr/bin/env python3
"""
Query REAPER via HTTP API to find action IDs automatically
"""
import urllib.request
import json
import re
import sys

def query_reaper_action_list():
    """Try to get action list from REAPER HTTP API"""
    try:
        # REAPER HTTP API might support listing actions
        url = "http://localhost:8080/_/GET/ACTIONS"
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=2)
        data = response.read().decode()
        return data
    except Exception as e:
        # HTTP API might not support this endpoint
        return None

def find_action_by_name(action_name, action_list_text):
    """Find action ID by searching action list text"""
    if not action_list_text:
        return None
    
    # Try to find action ID in the text
    pattern = rf'{re.escape(action_name)}.*?(\d+)'
    match = re.search(pattern, action_list_text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None

def get_action_id_via_test(action_id):
    """Test if an action ID works by trying it"""
    try:
        url = f"http://localhost:8080/_/ACTION/{action_id}"
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=1)
        return response.status == 200
    except:
        return False

def auto_find_action_ids():
    """Automatically find action IDs by testing common ranges"""
    print("🔍 Automatically finding REAPER action IDs...")
    print("=" * 60)
    print()
    
    # Common action ID ranges to test
    # Transport actions are usually 1000-1100
    # Edit actions are usually 40000-41000
    # Track actions vary
    
    known_actions = {
        'play': 1007,
        'stop': 1016,
        'record': 1013,
        'pause': 1008,
    }
    
    # Test known actions first
    print("Testing known action IDs...")
    working_actions = {}
    
    for name, action_id in known_actions.items():
        if get_action_id_via_test(action_id):
            working_actions[name] = action_id
            print(f"✅ {name}: {action_id}")
        else:
            print(f"❌ {name}: {action_id} (not working)")
    
    # Try to find other actions by testing common IDs
    print()
    print("Searching for other actions...")
    
    # Common action ID patterns
    test_ranges = [
        (6, 20, "Track toggle actions"),
        (40001, 40010, "Edit actions"),
        (40157, 40165, "Marker actions"),
        (40285, 40290, "Track navigation"),
    ]
    
    found_actions = {}
    
    for start, end, description in test_ranges:
        print(f"   Testing {description} ({start}-{end})...")
        for action_id in range(start, end + 1):
            if get_action_id_via_test(action_id):
                # Try to identify what this action does
                # (We can't know for sure without REAPER's action list)
                found_actions[action_id] = f"Unknown action {action_id}"
    
    if found_actions:
        print()
        print("Found additional actions:")
        for action_id, description in found_actions.items():
            print(f"   ID {action_id}: {description}")
    
    return working_actions

def main():
    print("🤖 REAPER Action ID Auto-Finder")
    print("=" * 60)
    print()
    
    # Method 1: Try HTTP API query (might not work)
    print("Method 1: Trying REAPER HTTP API...")
    action_list = query_reaper_action_list()
    if action_list:
        print("✅ Got action list from REAPER")
        # Parse it...
    else:
        print("⚠️  HTTP API doesn't support action listing")
    
    print()
    
    # Method 2: Test known action IDs
    print("Method 2: Testing known action IDs...")
    working = auto_find_action_ids()
    
    print()
    print("=" * 60)
    print("RESULTS:")
    print("=" * 60)
    print()
    print("Working action IDs:")
    for name, action_id in working.items():
        print(f"   {name}: {action_id}")
    
    print()
    print("💡 For best results:")
    print("   1. Load DAWRV scripts in REAPER")
    print("   2. Press ? in REAPER to see action IDs")
    print("   3. Run: ./auto_update_action_ids.sh")
    print("   4. Enter the IDs when prompted")

if __name__ == "__main__":
    main()

