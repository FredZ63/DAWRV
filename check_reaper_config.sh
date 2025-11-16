#!/bin/bash
# Check REAPER configuration for voice commands

echo "🔍 REAPER Configuration Check"
echo "=============================="
echo ""

# Check if ports are listening
echo "1. Checking if REAPER ports are listening..."
echo "   HTTP API (8080):"
netstat -an | grep 8080 | grep LISTEN || echo "   ❌ Port 8080 not listening"
echo "   OSC (8000):"
netstat -an | grep 8000 | grep -E "(udp|UDP)" || echo "   ❌ Port 8000 not listening (UDP)"
echo ""

# Test HTTP API
echo "2. Testing HTTP API..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/_/ACTION/1007 2>/dev/null)
if [ "$HTTP_RESPONSE" = "200" ]; then
    echo "   ✅ HTTP API responding (status: $HTTP_RESPONSE)"
else
    echo "   ❌ HTTP API not responding (status: $HTTP_RESPONSE)"
fi
echo ""

# Test OSC
echo "3. Testing OSC..."
python3 -c "
import socket
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(1)
    sock.sendto(b'/action/1007\x00\x00\x00,\x00\x00\x00', ('127.0.0.1', 8000))
    sock.close()
    print('   ✅ OSC message sent (no error)')
except Exception as e:
    print(f'   ⚠️  OSC test: {e}')
" 2>/dev/null || echo "   ❌ OSC test failed"
echo ""

echo "4. Configuration Checklist:"
echo "   □ REAPER > Preferences > Control/OSC/web > Web interface enabled"
echo "   □ Port 8080 configured"
echo "   □ 'Allow remote control' checked (if available)"
echo "   □ REAPER > Preferences > Control/OSC/web > OSC enabled"
echo "   □ Port 8000 configured"
echo "   □ A project is open in REAPER"
echo ""

echo "5. Next Steps:"
echo "   If HTTP API returns 200 but actions don't execute:"
echo "   → Try enabling OSC instead (often more reliable)"
echo "   → Check REAPER Console (View > Show console) for errors"
echo "   → Verify action IDs in REAPER (Actions > Show action list)"
echo ""

