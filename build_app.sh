#!/bin/bash
# DAWRV Complete Build Script
# This script builds a complete DMG with all dependencies

set -e

echo "🚀 Building DAWRV Complete Application..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the DAWRV-Project directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# Create Python virtual environment for bundling
echo -e "${BLUE}🐍 Setting up Python dependencies...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install SpeechRecognition pyaudio

# Create build directory structure
echo -e "${BLUE}📁 Creating build structure...${NC}"
mkdir -p build
mkdir -p dist

# Create a Python runtime bundle script
cat > build_python_bundle.sh << 'PYEOF'
#!/bin/bash
# Bundle Python and dependencies for distribution
BUNDLE_DIR="python_bundle"
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

# Copy Python scripts
cp rhea_voice_listener.py "$BUNDLE_DIR/"
cp reaper_bridge.py "$BUNDLE_DIR/"
cp reaper_osc_sender.py "$BUNDLE_DIR/"

# Create requirements file
cat > "$BUNDLE_DIR/requirements.txt" << 'REQEOF'
SpeechRecognition>=3.10.0
pyaudio>=0.2.11
REQEOF

# Create install script for end user
cat > "$BUNDLE_DIR/install_dependencies.sh" << 'INSTEOF'
#!/bin/bash
# Install Python dependencies for DAWRV
echo "Installing Python dependencies for DAWRV/RHEA..."
pip3 install --user SpeechRecognition pyaudio --break-system-packages
echo "✅ Dependencies installed!"
INSTEOF
chmod +x "$BUNDLE_DIR/install_dependencies.sh"

echo "✅ Python bundle created"
PYEOF

chmod +x build_python_bundle.sh
./build_python_bundle.sh

# Build the Electron app
echo -e "${BLUE}🔨 Building Electron application...${NC}"
npm run build:mac

# Create post-build script to include Python bundle
echo -e "${BLUE}📦 Packaging Python dependencies...${NC}"

# The electron-builder will handle the DMG creation
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📦 DMG file should be in the 'dist' directory"
echo "🔍 To find it: ls -lh dist/*.dmg"


