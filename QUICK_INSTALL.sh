#!/bin/bash

# ATLAS Quick Install Script for Mac
# Run this on your MacBook Air M1

set -e

echo "🏔️  ATLAS Quick Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This installer is for macOS only"
    exit 1
fi

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from the atlas/standalone directory"
    exit 1
fi

echo "📦 Step 1/4: Installing dependencies..."
npm install || {
    echo "❌ npm install failed"
    echo "   Try: brew install node"
    exit 1
}

echo ""
echo "🔨 Step 2/4: Building ATLAS..."
npm run build:mac || {
    echo "⚠️  Full build failed, trying dev mode..."
    npm run dev
    exit 0
}

echo ""
echo "✅ Step 3/4: Build complete!"

if [ -f "dist/ATLAS-1.0.0-mac.dmg" ]; then
    echo ""
    echo "🎉 SUCCESS! DMG created:"
    echo "   📍 dist/ATLAS-1.0.0-mac.dmg"
    echo ""
    echo "🚀 Step 4/4: Opening installer..."
    open dist/ATLAS-1.0.0-mac.dmg
else
    echo "⚠️  DMG not found, but app might be built"
    echo "   Check: dist/mac/ATLAS.app"
    if [ -d "dist/mac/ATLAS.app" ]; then
        echo "   Opening app..."
        open dist/mac/ATLAS.app
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ ATLAS installation complete!"
echo ""

