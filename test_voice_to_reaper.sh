#!/bin/bash
# Test the full voice command chain from file write to Reaper execution

echo "🧪 Testing Voice Command Chain to Reaper"
echo ""

# Step 1: Simulate a voice command by writing to the command file
echo "1️⃣  Simulating voice command 'play'..."
echo "play" > /tmp/dawrv_voice_command.txt
echo "   ✅ Command file written: /tmp/dawrv_voice_command.txt"
echo "   Content: $(cat /tmp/dawrv_voice_command.txt)"
sleep 1

# Step 2: Test if the bridge script can execute the action
echo ""
echo "2️⃣  Testing Reaper bridge directly..."
python3 reaper_bridge.py 1007
if [ $? -eq 0 ]; then
    echo "   ✅ Bridge script executed successfully"
else
    echo "   ❌ Bridge script failed"
    exit 1
fi

# Step 3: Check if Reaper is running
echo ""
echo "3️⃣  Checking if Reaper is running..."
if pgrep -f REAPER > /dev/null; then
    echo "   ✅ Reaper is running"
else
    echo "   ❌ Reaper is NOT running"
    echo "   Please start Reaper first"
    exit 1
fi

# Step 4: Test Reaper connection
echo ""
echo "4️⃣  Testing Reaper connection..."
python3 test_reaper_connection.py | grep -E "(✅|❌)" | head -5

# Step 5: Cleanup
echo ""
echo "5️⃣  Cleaning up..."
rm -f /tmp/dawrv_voice_command.txt
echo "   ✅ Cleanup complete"

echo ""
echo "✅ All tests completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Make sure DAWRV is running"
echo "   2. Click 'Start Listening' in DAWRV"
echo "   3. Say 'play' or 'stop' and check the console logs"
echo "   4. Check the browser DevTools console for any errors"

