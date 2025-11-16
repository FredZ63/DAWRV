#!/bin/bash
# Fully automated action ID finder and updater
# This script queries REAPER to find action IDs and updates rhea.js automatically

echo "🤖 DAWRV Automatic Action ID Finder & Updater"
echo "=============================================="
echo ""

RHEA_JS="src/renderer/scripts/rhea.js"
REAPER_SCRIPTS_DIR="$HOME/Library/Application Support/REAPER/Scripts/DAWRV"
EXPORT_SCRIPT="daw-scripts/reaper/scripts/dawrv_export_action_ids.lua"

# Check if REAPER is running
if ! pgrep -f REAPER > /dev/null; then
    echo "❌ REAPER is not running"
    echo "   Please start REAPER first"
    exit 1
fi

echo "✅ REAPER is running"
echo ""

# Step 1: Copy export script to REAPER scripts folder
echo "📦 Step 1: Installing export script..."
mkdir -p "$REAPER_SCRIPTS_DIR"
if [ -f "$EXPORT_SCRIPT" ]; then
    cp "$EXPORT_SCRIPT" "$REAPER_SCRIPTS_DIR/"
    echo "   ✅ Export script copied"
else
    echo "   ⚠️  Export script not found, creating simple version..."
    # Create a simple export script
    cat > "$REAPER_SCRIPTS_DIR/dawrv_export_action_ids.lua" << 'LUAEOF'
-- Simple action ID exporter
local file = io.open(reaper.GetResourcePath() .. "/dawrv_action_ids.txt", "w")
if file then
    file:write("REAPER Action IDs\n")
    file:write("==================\n\n")
    
    -- Search for DAWRV actions
    for i = 0, reaper.CountActions() - 1 do
        local retval, name = reaper.GetActionName(i)
        if name and (string.find(string.lower(name), "dawrv") or 
                     string.find(string.lower(name), "transport") or
                     string.find(string.lower(name), "track") or
                     string.find(string.lower(name), "mute") or
                     string.find(string.lower(name), "solo") or
                     string.find(string.lower(name), "zoom")) then
            file:write(string.format("ID: %d | Name: %s\n", i, name))
        end
    end
    
    file:close()
    reaper.ShowMessageBox("Action IDs exported!\n\nRun: python3 parse_action_ids.py", "Done", 0)
end
LUAEOF
    echo "   ✅ Simple export script created"
fi

echo ""
echo "📋 Step 2: Load and run the export script in REAPER"
echo "   -------------------------------------------------"
echo "   1. In REAPER, press ? to open Actions"
echo "   2. Click 'ReaScript: Load...'"
echo "   3. Navigate to: $REAPER_SCRIPTS_DIR"
echo "   4. Load: dawrv_export_action_ids.lua"
echo "   5. Find it in Actions list and click 'Run'"
echo ""
echo "   OR if you've already loaded DAWRV scripts:"
echo "   - Just search for 'DAWRV' in Actions"
echo "   - Note the action IDs"
echo ""
read -p "Press Enter after you've run the export script in REAPER..."

# Step 3: Parse and update
echo ""
echo "🔄 Step 3: Parsing action IDs and updating rhea.js..."

if [ -f "parse_action_ids.py" ]; then
    python3 parse_action_ids.py
else
    echo "   ⚠️  parse_action_ids.py not found"
    echo "   Using manual method instead..."
    
    ACTION_FILE="$HOME/Library/Application Support/REAPER/dawrv_action_ids.txt"
    if [ -f "$ACTION_FILE" ]; then
        echo "   ✅ Found action IDs file"
        echo ""
        echo "   Found action IDs:"
        grep "ID:" "$ACTION_FILE" | head -20
        echo ""
        echo "   Now run: ./auto_update_action_ids.sh"
        echo "   And enter the IDs when prompted"
    else
        echo "   ❌ Action IDs file not found"
        echo "   Please run the export script in REAPER first"
    fi
fi

echo ""
echo "✅ Process complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify action IDs were updated correctly"
echo "   2. Restart DAWRV"
echo "   3. Test voice commands"

