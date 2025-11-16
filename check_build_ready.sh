#!/bin/bash
# Check if system is ready to build DAWRV DMG

echo "🔍 Checking build system readiness..."
echo ""

ERRORS=0

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js not found"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python: $PYTHON_VERSION"
else
    echo "❌ Python 3 not found"
    ERRORS=$((ERRORS + 1))
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Node modules installed"
else
    echo "⚠️  Node modules not found (run: npm install)"
fi

# Check if electron-builder is available
if [ -f "node_modules/.bin/electron-builder" ] || command -v electron-builder &> /dev/null; then
    echo "✅ electron-builder available"
else
    echo "⚠️  electron-builder not found (will install with npm install)"
fi

# Check required files
echo ""
echo "📁 Checking required files..."

REQUIRED_FILES=(
    "package.json"
    "electron-builder.yml"
    "src/main/main.js"
    "rhea_voice_listener.py"
    "reaper_bridge.py"
    "create_complete_dmg.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file missing"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check build directory
if [ -d "build" ]; then
    echo "✅ build/ directory exists"
else
    echo "⚠️  build/ directory will be created"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ System is ready to build!"
    echo ""
    echo "🚀 Run: ./create_complete_dmg.sh"
else
    echo "❌ Found $ERRORS issue(s). Please fix before building."
    exit 1
fi


