#!/usr/bin/env python3
"""
Automatically parse REAPER action IDs and update rhea.js
"""
import json
import os
import re
import sys

REAPER_RESOURCE_PATH = os.path.expanduser("~/Library/Application Support/REAPER")
ACTION_FILE = os.path.join(REAPER_RESOURCE_PATH, "dawrv_actions.json")
RHEA_JS = "src/renderer/scripts/rhea.js"

def find_action_id(actions_list, keywords):
    """Find action ID by matching keywords"""
    if not actions_list:
        return None
    
    for action in actions_list:
        name_lower = action.get('name', '').lower()
        for keyword in keywords:
            if keyword.lower() in name_lower:
                return action.get('id')
    return None

def update_rhea_js(action_mappings):
    """Update rhea.js with new action IDs"""
    if not os.path.exists(RHEA_JS):
        print(f"❌ rhea.js not found: {RHEA_JS}")
        return False
    
    with open(RHEA_JS, 'r') as f:
        content = f.read()
    
    updates_made = 0
    for action_name, action_id in action_mappings.items():
        if action_id is None:
            continue
        
        # Find the pattern in rhea.js
        pattern = f"'{action_name}':\\s*\\d+"
        replacement = f"'{action_name}': {action_id}"
        
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            print(f"✅ Updated {action_name}: {action_id}")
            updates_made += 1
        else:
            print(f"⚠️  {action_name} not found in rhea.js")
    
    if updates_made > 0:
        with open(RHEA_JS, 'w') as f:
            f.write(content)
        print(f"\n✅ Updated {updates_made} action IDs in rhea.js")
        return True
    else:
        print("\n⚠️  No updates made")
        return False

def main():
    print("🔍 DAWRV Automatic Action ID Parser")
    print("=" * 50)
    print()
    
    # Check if action file exists
    if not os.path.exists(ACTION_FILE):
        print(f"❌ Action file not found: {ACTION_FILE}")
        print()
        print("📋 To generate the action file:")
        print("1. Open REAPER")
        print("2. Actions > ReaScript: Load...")
        print("3. Load: daw-scripts/reaper/scripts/dawrv_export_action_ids.lua")
        print("4. Run the script")
        print("5. Then run this script again")
        return
    
    print(f"✅ Found action file: {ACTION_FILE}")
    print()
    
    # Load action data
    try:
        with open(ACTION_FILE, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Error reading action file: {e}")
        return
    
    # Map actions to rhea.js action names
    action_mappings = {}
    
    # Transport actions
    play_actions = data.get('common', {}).get('play', [])
    if play_actions:
        action_mappings['play'] = play_actions[0].get('id') if play_actions else 1007
    
    stop_actions = data.get('common', {}).get('stop', [])
    if stop_actions:
        action_mappings['stop'] = stop_actions[0].get('id') if stop_actions else 1016
    
    record_actions = data.get('common', {}).get('record', [])
    if record_actions:
        action_mappings['record'] = record_actions[0].get('id') if record_actions else 1013
    
    pause_actions = data.get('common', {}).get('pause', [])
    if pause_actions:
        action_mappings['pause'] = pause_actions[0].get('id') if pause_actions else 1008
    
    # Track actions
    mute_actions = data.get('common', {}).get('mute', [])
    action_mappings['mute'] = find_action_id(mute_actions, ['mute', 'toggle mute'])
    
    solo_actions = data.get('common', {}).get('solo', [])
    action_mappings['solo'] = find_action_id(solo_actions, ['solo', 'toggle solo'])
    
    # Navigation
    zoom_in_actions = data.get('common', {}).get('zoom_in', [])
    action_mappings['zoomin'] = find_action_id(zoom_in_actions, ['zoom in', 'zoom in horizontal'])
    
    zoom_out_actions = data.get('common', {}).get('zoom_out', [])
    action_mappings['zoomout'] = find_action_id(zoom_out_actions, ['zoom out', 'zoom out horizontal'])
    
    # DAWRV script actions
    track_script = data.get('dawrv_scripts', {}).get('track', [])
    if track_script:
        # Try to find specific functions
        for script in track_script:
            name = script.get('name', '').lower()
            if 'mute' in name:
                action_mappings['mute'] = script.get('id')
            elif 'solo' in name:
                action_mappings['solo'] = script.get('id')
            elif 'next' in name:
                action_mappings['nexttrack'] = script.get('id')
            elif 'previous' in name:
                action_mappings['previoustrack'] = script.get('id')
    
    nav_script = data.get('dawrv_scripts', {}).get('navigation', [])
    if nav_script:
        for script in nav_script:
            name = script.get('name', '').lower()
            if 'zoom' in name:
                if 'in' in name:
                    action_mappings['zoomin'] = script.get('id')
                elif 'out' in name:
                    action_mappings['zoomout'] = script.get('id')
    
    # Print found actions
    print("📋 Found Action IDs:")
    print("-" * 50)
    for action_name, action_id in action_mappings.items():
        if action_id:
            print(f"   {action_name}: {action_id}")
        else:
            print(f"   {action_name}: ❌ Not found")
    print()
    
    # Update rhea.js
    print("🔄 Updating rhea.js...")
    if update_rhea_js(action_mappings):
        print()
        print("✅ Done! Restart DAWRV to use the updated action IDs.")
    else:
        print()
        print("⚠️  No changes made. Check the action file and try again.")

if __name__ == "__main__":
    main()

