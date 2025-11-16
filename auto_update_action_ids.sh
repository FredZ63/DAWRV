#!/bin/bash
# Automated Action ID Updater
# This script helps you quickly update action IDs in rhea.js

RHEA_JS="src/renderer/scripts/rhea.js"

echo "🔧 DAWRV Action ID Auto-Updater"
echo "================================"
echo ""

# Check if rhea.js exists
if [ ! -f "$RHEA_JS" ]; then
    echo "❌ rhea.js not found: $RHEA_JS"
    exit 1
fi

echo "This script will help you update action IDs in rhea.js"
echo ""
echo "📋 Commands that may need action ID updates:"
echo "   - mute, unmute, solo, unsolo"
echo "   - nexttrack, previoustrack"
echo "   - zoomin, zoomout, zoomall"
echo "   - gotoend, addmarker, nextmarker, previousmarker"
echo ""

# Function to update action ID
update_action() {
    local action_name="$1"
    local current_id=$(grep -o "'${action_name}': [0-9]*" "$RHEA_JS" | grep -o "[0-9]*")
    
    if [ -z "$current_id" ]; then
        echo "⚠️  Action '${action_name}' not found in rhea.js"
        return
    fi
    
    echo ""
    echo "Action: ${action_name}"
    echo "Current ID: ${current_id}"
    echo -n "Enter new action ID (or press Enter to keep ${current_id}): "
    read -r new_id
    
    if [ -n "$new_id" ] && [ "$new_id" != "$current_id" ]; then
        # macOS compatible sed
        sed -i '' "s/'${action_name}': ${current_id}/'${action_name}': ${new_id}/g" "$RHEA_JS"
        echo "✅ Updated ${action_name}: ${current_id} → ${new_id}"
    else
        echo "⏭️  Keeping ${action_name} as ${current_id}"
    fi
}

# List of actions that commonly need updates
actions_to_check=(
    "mute"
    "unmute"
    "solo"
    "unsolo"
    "nexttrack"
    "previoustrack"
    "zoomin"
    "zoomout"
    "zoomall"
    "gotoend"
    "addmarker"
    "nextmarker"
    "previousmarker"
)

echo "Would you like to update action IDs? (y/n)"
read -r response

if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
    echo ""
    echo "💡 TIP: To find action IDs in REAPER:"
    echo "   1. Press ? in REAPER to open Actions"
    echo "   2. Search for the action name"
    echo "   3. Note the action ID shown"
    echo ""
    echo "Press Enter to start updating..."
    read
    
    for action in "${actions_to_check[@]}"; do
        update_action "$action"
    done
    
    echo ""
    echo "✅ Action ID update complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart DAWRV"
    echo "   2. Test voice commands"
    echo "   3. Check console for any errors"
else
    echo ""
    echo "💡 To find action IDs manually:"
    echo "   1. Open REAPER"
    echo "   2. Press ? to open Actions"
    echo "   3. Search for each action"
    echo "   4. Note the action ID"
    echo "   5. Run: ./update_action_ids.sh [action_name] [action_id]"
    echo ""
    echo "   Example: ./update_action_ids.sh mute 40297"
fi

