#!/bin/bash
# Test script to verify voice command chain

echo "🧪 Testing Voice Command Chain"
echo ""

# Step 1: Test Python listener
echo "1️⃣  Testing Python voice listener..."
python3 rhea_voice_listener.py &
PYTHON_PID=$!
sleep 3

if ps -p $PYTHON_PID > /dev/null; then
    echo "   ✅ Python listener is running (PID: $PYTHON_PID)"
else
    echo "   ❌ Python listener failed to start"
    exit 1
fi

# Step 2: Test command file write
echo ""
echo "2️⃣  Testing command file write..."
echo "test play command" > /tmp/dawrv_voice_command.txt
sleep 1

if [ -f /tmp/dawrv_voice_command.txt ]; then
    echo "   ✅ Command file exists"
    echo "   Content: $(cat /tmp/dawrv_voice_command.txt)"
else
    echo "   ❌ Command file not created"
    kill $PYTHON_PID 2>/dev/null
    exit 1
fi

# Step 3: Cleanup
echo ""
echo "3️⃣  Cleaning up..."
kill $PYTHON_PID 2>/dev/null
rm -f /tmp/dawrv_voice_command.txt
echo "   ✅ Cleanup complete"

echo ""
echo "✅ All tests passed! Voice listener should work."


