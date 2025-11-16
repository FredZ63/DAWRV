#!/bin/bash
# Install REAPER scripts for DAWRV

REAPER_SCRIPTS="$HOME/Library/Application Support/REAPER/Scripts/DAWRV"
SCRIPT_DIR="daw-scripts/reaper/scripts"

echo "📦 Installing REAPER Scripts for DAWRV"
echo "======================================"
echo ""

# Create directory
mkdir -p "$REAPER_SCRIPTS"
echo "✅ Created directory: $REAPER_SCRIPTS"

# Copy scripts
if [ -d "$SCRIPT_DIR" ]; then
    cp "$SCRIPT_DIR"/*.lua "$REAPER_SCRIPTS/" 2>/dev/null
    echo "✅ Copied scripts to REAPER Scripts folder"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Open REAPER"
    echo "2. Press ? to open Actions"
    echo "3. Click 'ReaScript: Load...'"
    echo "4. Navigate to: $REAPER_SCRIPTS"
    echo "5. Load each .lua file"
    echo ""
    echo "Or run: python3 test_reaper_actions.py to test action IDs"
else
    echo "❌ Script directory not found: $SCRIPT_DIR"
    exit 1
fi
