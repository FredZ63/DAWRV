#!/bin/zsh
# DAWRV Voice Engine Test Script
# Tests Deepgram Nova-2 setup and functionality

echo "🎤 ========================================"
echo "🎤 DAWRV Voice Engine Test"
echo "🎤 ========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check if Deepgram API Key is set
echo "${BLUE}Test 1: Deepgram API Key${NC}"
if [ -n "$DEEPGRAM_API_KEY" ]; then
    KEY_LENGTH=${#DEEPGRAM_API_KEY}
    MASKED_KEY="${DEEPGRAM_API_KEY:0:8}...${DEEPGRAM_API_KEY: -3}"
    echo "   ${GREEN}✅ PASS${NC} - API Key is set (${KEY_LENGTH} chars)"
    echo "   Key: ${MASKED_KEY}"
else
    echo "   ${RED}❌ FAIL${NC} - No API Key found"
    echo "   ${YELLOW}→ Will use Whisper (offline) instead${NC}"
fi
echo ""

# Test 2: Check Python availability
echo "${BLUE}Test 2: Python Installation${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo "   ${GREEN}✅ PASS${NC} - ${PYTHON_VERSION}"
else
    echo "   ${RED}❌ FAIL${NC} - Python3 not found"
    exit 1
fi
echo ""

# Test 3: Check PyAudio
echo "${BLUE}Test 3: PyAudio (Microphone Library)${NC}"
if python3 -c "import pyaudio" 2>/dev/null; then
    echo "   ${GREEN}✅ PASS${NC} - PyAudio installed"
else
    echo "   ${RED}❌ FAIL${NC} - PyAudio not installed"
    echo "   ${YELLOW}→ Install: pip3 install pyaudio${NC}"
fi
echo ""

# Test 4: Check Deepgram SDK (if key is set)
if [ -n "$DEEPGRAM_API_KEY" ]; then
    echo "${BLUE}Test 4: Deepgram SDK${NC}"
    if python3 -c "from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions" 2>/dev/null; then
        echo "   ${GREEN}✅ PASS${NC} - Deepgram SDK installed"
        
        # Get version
        DG_VERSION=$(python3 -c "import deepgram; print(deepgram.__version__)" 2>/dev/null || echo "unknown")
        echo "   Version: ${DG_VERSION}"
    else
        echo "   ${RED}❌ FAIL${NC} - Deepgram SDK not installed"
        echo "   ${YELLOW}→ Install: pip3 install deepgram-sdk${NC}"
    fi
else
    echo "${BLUE}Test 4: Whisper (Offline Engine)${NC}"
    if python3 -c "import whisper" 2>/dev/null; then
        echo "   ${GREEN}✅ PASS${NC} - Whisper installed"
    else
        echo "   ${RED}❌ FAIL${NC} - Whisper not installed"
        echo "   ${YELLOW}→ Install: pip3 install openai-whisper${NC}"
    fi
fi
echo ""

# Test 5: Check voice listener script
echo "${BLUE}Test 5: Voice Listener Scripts${NC}"
if [ -n "$DEEPGRAM_API_KEY" ]; then
    SCRIPT_NAME="rhea_voice_listener_deepgram.py"
else
    SCRIPT_NAME="rhea_voice_listener_whisper.py"
fi

if [ -f "$SCRIPT_NAME" ]; then
    echo "   ${GREEN}✅ PASS${NC} - ${SCRIPT_NAME} exists"
    SCRIPT_SIZE=$(wc -c < "$SCRIPT_NAME" | tr -d ' ')
    echo "   Size: ${SCRIPT_SIZE} bytes"
else
    echo "   ${RED}❌ FAIL${NC} - ${SCRIPT_NAME} not found"
fi
echo ""

# Test 6: Check microphone access (macOS)
echo "${BLUE}Test 6: Microphone Permissions (macOS)${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check if Electron has mic permission
    MIC_STATUS=$(sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db "SELECT allowed FROM access WHERE service='kTCCServiceMicrophone' AND client LIKE '%Electron%';" 2>/dev/null || echo "unknown")
    
    if [ "$MIC_STATUS" = "1" ]; then
        echo "   ${GREEN}✅ PASS${NC} - Microphone permission granted"
    elif [ "$MIC_STATUS" = "0" ]; then
        echo "   ${RED}❌ FAIL${NC} - Microphone permission denied"
        echo "   ${YELLOW}→ Grant in: System Settings → Privacy & Security → Microphone${NC}"
    else
        echo "   ${YELLOW}⚠️  WARN${NC} - Cannot determine permission (requires DAWRV to request it first)"
    fi
else
    echo "   ${YELLOW}⏭️  SKIP${NC} - Not on macOS"
fi
echo ""

# Test 7: Check REAPER connection
echo "${BLUE}Test 7: REAPER Web Interface${NC}"
if curl -s --max-time 2 http://localhost:8080 > /dev/null 2>&1; then
    echo "   ${GREEN}✅ PASS${NC} - REAPER Web Interface responding (port 8080)"
else
    echo "   ${RED}❌ FAIL${NC} - Cannot connect to REAPER on port 8080"
    echo "   ${YELLOW}→ Enable Web Interface in REAPER:${NC}"
    echo "   ${YELLOW}   Actions → ReaperWebInterface${NC}"
fi
echo ""

# Test 8: Check REAPER OSC
echo "${BLUE}Test 8: REAPER OSC${NC}"
# Try to send a test OSC message (we'll send a harmless query)
if command -v nc &> /dev/null; then
    # Use netcat to check if port 8000 is open
    if nc -z -w2 localhost 8000 2>/dev/null; then
        echo "   ${GREEN}✅ PASS${NC} - REAPER OSC responding (port 8000)"
    else
        echo "   ${RED}❌ FAIL${NC} - Cannot connect to REAPER OSC on port 8000"
        echo "   ${YELLOW}→ Enable OSC in REAPER:${NC}"
        echo "   ${YELLOW}   Preferences → Control/OSC/Web → Add → OSC${NC}"
        echo "   ${YELLOW}   Listen port: 8000${NC}"
    fi
else
    echo "   ${YELLOW}⏭️  SKIP${NC} - netcat not available"
fi
echo ""

# Test 9: Internet connectivity (for Deepgram)
if [ -n "$DEEPGRAM_API_KEY" ]; then
    echo "${BLUE}Test 9: Internet Connectivity (Deepgram)${NC}"
    if curl -s --max-time 3 https://api.deepgram.com > /dev/null 2>&1; then
        echo "   ${GREEN}✅ PASS${NC} - Can reach Deepgram API"
    else
        echo "   ${RED}❌ FAIL${NC} - Cannot reach Deepgram API"
        echo "   ${YELLOW}→ Check internet connection${NC}"
        echo "   ${YELLOW}→ Will fall back to Whisper (offline)${NC}"
    fi
    echo ""
fi

# Test 10: Voice listener dry-run
echo "${BLUE}Test 10: Voice Listener Dry-Run${NC}"
echo "   Testing script initialization (5 seconds)..."

timeout 5 python3 "$SCRIPT_NAME" 2>&1 | head -20 > /tmp/dawrv_voice_test.log &
TEST_PID=$!

sleep 5
kill $TEST_PID 2>/dev/null

if [ -f /tmp/dawrv_voice_test.log ]; then
    if grep -q "Ready!" /tmp/dawrv_voice_test.log || grep -q "Listening" /tmp/dawrv_voice_test.log; then
        echo "   ${GREEN}✅ PASS${NC} - Voice listener initialized successfully"
        echo ""
        echo "   ${BLUE}Listener Output:${NC}"
        head -10 /tmp/dawrv_voice_test.log | sed 's/^/   /'
    else
        echo "   ${RED}❌ FAIL${NC} - Voice listener failed to initialize"
        echo ""
        echo "   ${BLUE}Error Output:${NC}"
        cat /tmp/dawrv_voice_test.log | sed 's/^/   /'
    fi
    rm /tmp/dawrv_voice_test.log
else
    echo "   ${YELLOW}⚠️  WARN${NC} - Could not capture output"
fi
echo ""

# Summary
echo "🎤 ========================================"
echo "🎤 Test Summary"
echo "🎤 ========================================"
echo ""

if [ -n "$DEEPGRAM_API_KEY" ]; then
    echo "${GREEN}Voice Engine:${NC} Deepgram Nova-2 (Fast)"
    echo "${GREEN}Fallback:${NC} Whisper (Offline)"
else
    echo "${YELLOW}Voice Engine:${NC} Whisper (Offline)"
    echo "${YELLOW}Upgrade:${NC} Add DEEPGRAM_API_KEY for faster recognition"
fi
echo ""

echo "${BLUE}Next Steps:${NC}"
echo "1. Start DAWRV: ${GREEN}npm start${NC}"
echo "2. Click: ${GREEN}Start Listening${NC}"
echo "3. Say: ${GREEN}\"play\"${NC} or ${GREEN}\"show mixer\"${NC}"
echo "4. Check console for: ${GREEN}🎤 Voice Engine Selection${NC}"
echo ""

echo "📚 Documentation:"
echo "   - Voice troubleshooting: ${BLUE}TROUBLESHOOTING_VOICE.md${NC}"
echo "   - Deepgram setup: ${BLUE}DEEPGRAM_SETUP.md${NC}"
echo "   - All commands: ${BLUE}COMMANDS_OVERVIEW.md${NC}"
echo ""
echo "✨ Done!"

