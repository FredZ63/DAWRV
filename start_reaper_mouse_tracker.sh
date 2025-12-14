#!/bin/bash

# Quick script to check if ReaScript is running and provide instructions

echo "🖱️  REAPER Mouse Tracker Setup"
echo "================================"
echo ""

SCRIPT_PATH="$HOME/Library/Application Support/REAPER/Scripts/DAWRV/dawrv_mouse_tracker_continuous.lua"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Mouse tracker script not found!"
    echo ""
    echo "Installing scripts..."
    ./install_reaper_scripts.sh
    echo ""
fi

echo "📋 To enable hover-based voice commands:"
echo ""
echo "1️⃣  Open REAPER"
echo "2️⃣  Press '?' key (or Actions → Show action list)"
echo "3️⃣  Click 'ReaScript: Run...'"
echo "4️⃣  Navigate to:"
echo "    ~/Library/Application Support/REAPER/Scripts/DAWRV/"
echo "5️⃣  Select: dawrv_mouse_tracker_continuous.lua"
echo "6️⃣  Click 'Open'"
echo ""
echo "✅ Script will run in background!"
echo ""
echo "Then in DAWRV:"
echo "• Enable Screen Awareness in Voice Settings"
echo "• Grant Accessibility permission"
echo "• Hover over controls and give commands!"
echo ""
echo "Test it:"
echo "• Hover over a track fader"
echo "• Say: 'solo' or 'mute' or 'raise volume 5 dB'"
echo ""






