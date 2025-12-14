#!/bin/bash

echo "🛑 Stopping all DAWRV instances..."

# Kill all DAWRV processes
pkill -9 -f "Electron.*DAWRV"
pkill -9 -f "dawrv.*npm"
pkill -9 -f "node.*DAWRV"

# Kill all voice listeners
pkill -9 -f "rhea_voice_listener"
pkill -9 -f "python.*voice"

# Wait for processes to die
sleep 3

# Verify nothing is running
DAWRV_COUNT=$(ps aux | grep -E "(Electron.*DAWRV|rhea_voice)" | grep -v grep | wc -l)

if [ "$DAWRV_COUNT" -gt 0 ]; then
    echo "⚠️  Warning: $DAWRV_COUNT processes still running, force killing..."
    killall -9 Electron 2>/dev/null
    pkill -9 -f python 2>/dev/null
    sleep 2
fi

echo "✅ All processes stopped"
echo ""
echo "🚀 Starting DAWRV (single instance)..."

cd /Users/frederickzimmerman/DAWRV-Project
npm start > /tmp/dawrv.log 2>&1 &

sleep 8

echo "✅ DAWRV started successfully"
echo ""
echo "📊 Running processes:"
ps aux | grep -E "(Electron.*DAWRV|rhea_voice)" | grep -v grep

echo ""
echo "🎤 Voice listener log: tail -f /tmp/dawrv_voice_listener.log"
echo "🖥️  DAWRV main log: tail -f /tmp/dawrv.log"


