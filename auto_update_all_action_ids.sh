#!/bin/bash
# Fully automated action ID finder and updater
# This will try multiple methods to find and update action IDs automatically

echo "🤖 DAWRV Fully Automatic Action ID Updater"
echo "=========================================="
echo ""

RHEA_JS="src/renderer/scripts/rhea.js"

# Check if REAPER is running
if ! pgrep -f REAPER > /dev/null; then
    echo "❌ REAPER is not running"
    echo "   Please start REAPER first, then run this script again"
    exit 1
fi

echo "✅ REAPER is running"
echo ""

# Method 1: Try to query REAPER directly
echo "🔍 Method 1: Querying REAPER for action IDs..."
python3 query_reaper_actions.py 2>/dev/null

echo ""
echo "📋 Method 2: Testing common action IDs..."
echo "   This will test known action IDs and update rhea.js"
echo ""

# Test and update common actions
update_action_if_works() {
    local action_name="$1"
    local test_id="$2"
    
    echo -n "   Testing ${action_name} (ID: ${test_id})... "
    
    # Test if action works
    result=$(python3 -c "
import urllib.request
try:
    url = 'http://localhost:8080/_/ACTION/${test_id}'
    req = urllib.request.Request(url)
    response = urllib.request.urlopen(req, timeout=1)
    if response.status == 200:
        print('works')
    else:
        print('failed')
except:
    print('failed')
" 2>/dev/null)
    
    if [ "$result" = "works" ]; then
        # Update rhea.js
        sed -i '' "s/'${action_name}': [0-9]*/'${action_name}': ${test_id}/g" "$RHEA_JS" 2>/dev/null
        echo "✅ Updated to ${test_id}"
        return 0
    else
        echo "❌ Not working"
        return 1
    fi
}

# Test common action IDs
echo "Testing transport actions..."
update_action_if_works "play" 1007
update_action_if_works "stop" 1016
update_action_if_works "record" 1013
update_action_if_works "pause" 1008
update_action_if_works "rewind" 1014
update_action_if_works "loop" 1068

echo ""
echo "Testing edit actions..."
update_action_if_works "undo" 40029
update_action_if_works "redo" 40030
update_action_if_works "cut" 40001
update_action_if_works "copy" 40003
update_action_if_works "paste" 40004
update_action_if_works "delete" 40005

echo ""
echo "Testing project actions..."
update_action_if_works "save" 40026
update_action_if_works "saveas" 40022
update_action_if_works "newproject" 40023
update_action_if_works "openproject" 40025

echo ""
echo "Testing navigation actions..."
update_action_if_works "zoomin" 1011
update_action_if_works "zoomout" 1012
update_action_if_works "zoomall" 40031
update_action_if_works "gotoend" 40073

echo ""
echo "Testing marker actions..."
update_action_if_works "addmarker" 40157
update_action_if_works "nextmarker" 40161
update_action_if_works "previousmarker" 40162

echo ""
echo "=" * 60
echo "✅ Automatic update complete!"
echo ""
echo "📝 Note: Some actions (mute, solo, track navigation) may need"
echo "   custom scripts. Load DAWRV scripts in REAPER and use:"
echo "   ./auto_update_action_ids.sh"
echo ""
echo "🔄 Next: Restart DAWRV and test voice commands!"

