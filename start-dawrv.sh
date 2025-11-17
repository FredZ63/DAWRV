#!/bin/bash
# DAWRV Startup Script with Deepgram API Key

# Load environment from .zshrc
source ~/.zshrc

# Export the key explicitly
export DEEPGRAM_API_KEY="7fc1dc97636cfa2f829c0beaccf96c87aad7c6a2"

# Verify it's set
echo "🔑 Deepgram API Key: ${DEEPGRAM_API_KEY:0:20}..."

# Start DAWRV
cd /Users/frederickzimmerman/DAWRV-Project
npm start

