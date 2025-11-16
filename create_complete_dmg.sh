#!/bin/bash
# Create Complete DMG with all dependencies and installer

set -e

APP_NAME="DAWRV"
VERSION="1.0.0"
DMG_NAME="${APP_NAME}-${VERSION}-Complete"

echo "🚀 Creating Complete DAWRV DMG Package..."

# Build the Electron app first
echo "📦 Building Electron application..."
npm run build:mac:dmg

# Find the built app (check multiple possible locations)
APP_PATH=""
if [ -d "dist/mac/${APP_NAME}.app" ]; then
    APP_PATH="dist/mac/${APP_NAME}.app"
elif [ -d "dist/mac-arm64/${APP_NAME}.app" ]; then
    APP_PATH="dist/mac-arm64/${APP_NAME}.app"
elif [ -d "dist/mac-x64/${APP_NAME}.app" ]; then
    APP_PATH="dist/mac-x64/${APP_NAME}.app"
else
    echo "Looking for app in dist directory..."
    APP_PATH=$(find dist -name "${APP_NAME}.app" -type d | head -1)
    if [ -z "$APP_PATH" ]; then
        echo "❌ App not found in dist directory"
        exit 1
    fi
fi

echo "✅ Found app at: $APP_PATH"

# Create DMG contents directory
DMG_DIR="dmg_contents"
rm -rf "$DMG_DIR"
mkdir -p "$DMG_DIR"

# Copy app
cp -R "$APP_PATH" "$DMG_DIR/"

# Create Applications link
ln -s /Applications "$DMG_DIR/Applications"

# Create Python dependencies installer
cat > "$DMG_DIR/Install Python Dependencies.command" << 'EOF'
#!/bin/bash
echo "Installing Python dependencies for DAWRV/RHEA..."
echo "This may take a few minutes..."
echo ""

# Try with --break-system-packages first (Python 3.11+)
if pip3 install SpeechRecognition pyaudio --break-system-packages 2>/dev/null; then
    echo "✅ Installation complete!"
elif pip3 install SpeechRecognition pyaudio 2>/dev/null; then
    echo "✅ Installation complete!"
elif pip3 install --user SpeechRecognition pyaudio 2>/dev/null; then
    echo "✅ Installation complete!"
else
    echo "❌ Installation failed. Please run manually:"
    echo "   pip3 install SpeechRecognition pyaudio"
fi

echo ""
echo "Press any key to close..."
read -n 1
EOF
chmod +x "$DMG_DIR/Install Python Dependencies.command"

# Create README
cp INSTALLER_README.md "$DMG_DIR/README.txt"

# Create REAPER setup guide
cp REAPER_SETUP.md "$DMG_DIR/REAPER_SETUP.txt"

# Create DMG
echo "📦 Creating DMG..."
hdiutil create -volname "$APP_NAME" -srcfolder "$DMG_DIR" -ov -format UDZO "dist/${DMG_NAME}.dmg"

# Copy DMG to Desktop
DESKTOP_DMG="$HOME/Desktop/${DMG_NAME}.dmg"
if [ -f "dist/${DMG_NAME}.dmg" ]; then
    cp "dist/${DMG_NAME}.dmg" "$DESKTOP_DMG"
    echo "✅ DMG copied to Desktop: $DESKTOP_DMG"
fi

echo "✅ Complete DMG created: dist/${DMG_NAME}.dmg"
echo "✅ DMG also available on Desktop: $DESKTOP_DMG"
echo ""
echo "📋 DMG Contents:"
echo "  - DAWRV.app (Complete application)"
echo "  - Applications link"
echo "  - Install Python Dependencies.command"
echo "  - README.txt"
echo "  - REAPER_SETUP.txt"

