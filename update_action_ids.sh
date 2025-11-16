#!/bin/bash
# Automatically update action IDs in rhea.js based on REAPER action list

echo "🔍 DAWRV Action ID Updater"
echo "=========================="
echo ""

REAPER_RESOURCE_PATH="$HOME/Library/Application Support/REAPER"
ACTION_FILE="$REAPER_RESOURCE_PATH/dawrv_action_ids.txt"
RHEA_JS="src/renderer/scripts/rhea.js"

# Check if action file exists
if [ ! -f "$ACTION_FILE" ]; then
    echo "❌ Action ID file not found: $ACTION_FILE"
    echo ""
    echo "📋 To generate the action ID file:"
    echo "1. Open REAPER"
    echo "2. Actions > ReaScript: Load..."
    echo "3. Load: daw-scripts/reaper/scripts/dawrv_list_actions.lua"
    echo "4. Run the script"
    echo "5. Then run this script again"
    exit 1
fi

echo "✅ Found action ID file: $ACTION_FILE"
echo ""

# Function to find action ID by name pattern
find_action_id() {
    local pattern="$1"
    grep -i "$pattern" "$ACTION_FILE" | head -1 | sed -E 's/.*ID: ([0-9]+).*/\1/'
}

# Function to update action ID in rhea.js
update_action_id() {
    local action_name="$1"
    local new_id="$2"
    local old_pattern="'${action_name}': [0-9]+"
    local new_value="'${action_name}': ${new_id}"
    
    if [ -f "$RHEA_JS" ]; then
        # Use sed to update (macOS compatible)
        sed -i '' "s/'${action_name}': [0-9]*/'${action_name}': ${new_id}/g" "$RHEA_JS"
        echo "   ✅ Updated ${action_name} to ${new_id}"
    else
        echo "   ❌ rhea.js not found: $RHEA_JS"
    fi
}

echo "🔍 Searching for action IDs..."
echo ""

# Search for DAWRV script actions
echo "Looking for DAWRV script actions..."

# Try to find script actions by searching the action file
DAWRV_ACTIONS=$(grep -i "dawrv\|transport\|track\|navigation" "$ACTION_FILE" | grep "ID:")

if [ -z "$DAWRV_ACTIONS" ]; then
    echo "⚠️  No DAWRV script actions found in action file"
    echo "   Make sure you've loaded the scripts in REAPER"
    echo ""
    echo "   To load scripts:"
    echo "   1. REAPER > Actions > ReaScript: Load..."
    echo "   2. Load each .lua file from:"
    echo "      ~/Library/Application Support/REAPER/Scripts/DAWRV/"
    echo ""
else
    echo "✅ Found DAWRV actions:"
    echo "$DAWRV_ACTIONS" | while read -r line; do
        echo "   $line"
    done
    echo ""
fi

# Manual update section - user can specify IDs
echo "📝 Manual Action ID Update"
echo "-------------------------"
echo ""
echo "If you know the action IDs, you can update them manually:"
echo ""
echo "Example:"
echo "  To update 'mute' action ID to 12345:"
echo "  ./update_action_ids.sh mute 12345"
echo ""

# If arguments provided, update specific action
if [ $# -eq 2 ]; then
    ACTION_NAME="$1"
    ACTION_ID="$2"
    echo "Updating $ACTION_NAME to action ID $ACTION_ID..."
    update_action_id "$ACTION_NAME" "$ACTION_ID"
    echo ""
    echo "✅ Updated! Restart DAWRV to use the new action ID."
    exit 0
fi

# Interactive mode
echo "Would you like to update action IDs interactively? (y/n)"
read -r response

if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
    echo ""
    echo "Enter action names and IDs (press Enter with empty name to finish):"
    echo ""
    
    while true; do
        echo -n "Action name (e.g., 'mute'): "
        read -r action_name
        
        if [ -z "$action_name" ]; then
            break
        fi
        
        echo -n "Action ID: "
        read -r action_id
        
        if [ -n "$action_id" ]; then
            update_action_id "$action_name" "$action_id"
        fi
        echo ""
    done
    
    echo ""
    echo "✅ Updates complete! Restart DAWRV to use the new action IDs."
else
    echo ""
    echo "💡 To find action IDs:"
    echo "1. Open REAPER"
    echo "2. Press ? to open Actions"
    echo "3. Search for the action name"
    echo "4. Note the action ID"
    echo "5. Run: ./update_action_ids.sh [action_name] [action_id]"
    echo ""
    echo "Example: ./update_action_ids.sh mute 40297"
fi

