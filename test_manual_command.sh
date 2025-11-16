#!/bin/bash
# Manually test the voice command chain by writing to the file

echo "🧪 Manual Voice Command Test"
echo ""
echo "This will write a test command to the file that DAWRV should pick up"
echo "Make sure DAWRV is running and 'Start Listening' has been clicked"
echo ""
read -p "Press Enter to write test command..."

echo "play" > /tmp/dawrv_voice_command.txt
echo "✅ Written 'play' to /tmp/dawrv_voice_command.txt"
echo ""
echo "Check DAWRV console/logs to see if command was processed"
echo ""
echo "File contents:"
cat /tmp/dawrv_voice_command.txt


