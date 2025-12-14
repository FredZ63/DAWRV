#!/bin/bash
# ============================================
# Wav2Lip Setup Script for RHEA Animation
# ============================================
# This script installs Wav2Lip and its dependencies
# for local, FREE lip-sync animation

echo "🎬 RHEA Wav2Lip Setup"
echo "===================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create directories
mkdir -p models
mkdir -p cache/wav2lip

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check for pip
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 not found. Please install pip"
    exit 1
fi

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip3 install flask flask-cors numpy opencv-python librosa scipy --quiet

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo ""
    echo "⚠️  FFmpeg not found."
    echo "   Install with: brew install ffmpeg"
    echo ""
fi

# Clone Wav2Lip if not exists
if [ ! -d "Wav2Lip" ]; then
    echo ""
    echo "📥 Cloning Wav2Lip repository..."
    git clone https://github.com/Rudrabha/Wav2Lip.git
    cd Wav2Lip
    pip3 install -r requirements.txt --quiet
    cd ..
else
    echo "✅ Wav2Lip already cloned"
fi

# Download model if not exists
if [ ! -f "models/wav2lip.pth" ]; then
    echo ""
    echo "📥 Downloading Wav2Lip model..."
    echo "   (This is ~400MB, may take a few minutes)"
    echo ""
    
    # Model download link (Google Drive)
    # Note: You may need to download manually from:
    # https://drive.google.com/file/d/1gXEJoZxj5qJ9EV9KPLZxBLjUWmjXN6nW/view
    
    echo "⚠️  Please download the model manually:"
    echo "   1. Go to: https://github.com/Rudrabha/Wav2Lip#getting-the-weights"
    echo "   2. Download 'wav2lip.pth'"
    echo "   3. Place it in: $SCRIPT_DIR/models/wav2lip.pth"
    echo ""
else
    echo "✅ Wav2Lip model found"
fi

# Create Python virtual environment (optional)
# python3 -m venv venv
# source venv/bin/activate

echo ""
echo "============================================"
echo "📝 Setup Summary"
echo "============================================"
echo ""
echo "Wav2Lip directory: $SCRIPT_DIR/Wav2Lip"
echo "Models directory:  $SCRIPT_DIR/models"
echo "Cache directory:   $SCRIPT_DIR/cache/wav2lip"
echo ""

# Check if model exists
if [ -f "models/wav2lip.pth" ]; then
    echo "✅ Ready to use Wav2Lip!"
    echo ""
    echo "Start the service with:"
    echo "  python3 $SCRIPT_DIR/wav2lip_service.py"
else
    echo "⚠️  Model not found. Download wav2lip.pth to use Wav2Lip."
    echo ""
    echo "In the meantime, RHEA will use audio-reactive animation"
    echo "which still provides visual feedback!"
fi

echo ""
echo "============================================"





