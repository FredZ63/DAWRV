#!/bin/bash
# Quick diagnostic for voice engine startup

echo "=== DAWRV Voice Engine Diagnostic ==="
echo ""

echo "1️⃣  Checking Deepgram API Key File:"
if [ -f ".deepgram-key" ]; then
    echo "   ✅ .deepgram-key exists"
    KEY_LENGTH=$(cat .deepgram-key | tr -d '[:space:]' | wc -c)
    echo "   Key length: $KEY_LENGTH characters"
    if [ $KEY_LENGTH -gt 30 ]; then
        echo "   ✅ Key appears valid (${KEY_LENGTH} chars)"
    else
        echo "   ❌ Key seems too short!"
    fi
else
    echo "   ❌ .deepgram-key NOT FOUND!"
fi

echo ""
echo "2️⃣  Checking Python Deepgram Script:"
if [ -f "rhea_voice_listener_deepgram.py" ]; then
    echo "   ✅ rhea_voice_listener_deepgram.py exists"
else
    echo "   ❌ Deepgram script NOT FOUND!"
fi

echo ""
echo "3️⃣  Checking if DAWRV is running:"
DAWRV_PID=$(ps aux | grep "Electron.*DAWRV" | grep -v grep | head -1 | awk '{print $2}')
if [ ! -z "$DAWRV_PID" ]; then
    echo "   ✅ DAWRV is running (PID: $DAWRV_PID)"
else
    echo "   ❌ DAWRV is NOT running"
fi

echo ""
echo "4️⃣  Checking for Python voice listener:"
PYTHON_PID=$(ps aux | grep "python.*voice_listener" | grep -v grep | head -1 | awk '{print $2}')
if [ ! -z "$PYTHON_PID" ]; then
    echo "   ✅ Voice listener is running (PID: $PYTHON_PID)"
else
    echo "   ⏸️  Voice listener NOT started yet"
    echo "      (This is normal - starts when you click 'Start Listening')"
fi

echo ""
echo "5️⃣  Testing Deepgram API Key manually:"
export DEEPGRAM_API_KEY=$(cat .deepgram-key 2>/dev/null)
if [ ! -z "$DEEPGRAM_API_KEY" ]; then
    echo "   ✅ Can read key from file"
    echo "   Key: ${DEEPGRAM_API_KEY:0:20}..."
else
    echo "   ❌ Could not read key from file"
fi

echo ""
echo "6️⃣  Testing if Python can import Deepgram SDK:"
python3 -c "from deepgram import DeepgramClient; print('   ✅ Deepgram SDK is installed')" 2>/dev/null || echo "   ❌ Deepgram SDK not found (run: pip3 install deepgram-sdk)"

echo ""
echo "=== Next Steps ==="
echo "1. Make sure DAWRV window is open"
echo "2. Click the 'Start Listening' button"
echo "3. Watch the DevTools console (View → Toggle Developer Tools)"
echo "4. Look for: '🔑 Loaded Deepgram API key from .deepgram-key file'"
echo ""

