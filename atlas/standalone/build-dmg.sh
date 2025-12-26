#!/bin/bash

echo "🏔️  Building ATLAS DMG..."
echo ""

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must run on macOS to create a DMG"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the app
echo "🔨 Building ATLAS app..."
npm run build:mac

# Check if build succeeded
if [ -f "dist/ATLAS-1.0.0-mac.dmg" ]; then
    echo ""
    echo "✅ SUCCESS! DMG created:"
    echo "   📍 dist/ATLAS-1.0.0-mac.dmg"
    echo ""
    echo "🎉 Double-click to install ATLAS!"
    open dist/
else
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi
