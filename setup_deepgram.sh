#!/bin/bash
# Quick setup script for Deepgram API key

echo "🚀 DAWRV Deepgram Setup"
echo "======================="
echo ""
echo "Deepgram Nova-2 is 7-10x faster than Whisper!"
echo "- Response time: 0.3-0.5 seconds (vs 2 seconds)"
echo "- Accuracy: 95-99%"
echo "- Free $200 credit (~775 hours of use)"
echo ""
echo "Get your free API key at: https://console.deepgram.com/signup"
echo ""
read -p "Paste your Deepgram API key: " api_key

if [ -z "$api_key" ]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

echo ""
echo "Adding API key to your shell configuration..."

# Detect shell config file
if [ -f ~/.zshrc ]; then
    config_file=~/.zshrc
    shell_name="zsh"
elif [ -f ~/.bashrc ]; then
    config_file=~/.bashrc
    shell_name="bash"
elif [ -f ~/.bash_profile ]; then
    config_file=~/.bash_profile
    shell_name="bash"
else
    config_file=~/.zshrc
    shell_name="zsh"
    echo "Creating new ~/.zshrc file..."
fi

# Check if key already exists
if grep -q "DEEPGRAM_API_KEY" "$config_file" 2>/dev/null; then
    echo "⚠️  DEEPGRAM_API_KEY already exists in $config_file"
    read -p "Replace it? (y/n): " replace
    if [ "$replace" = "y" ] || [ "$replace" = "Y" ]; then
        # Remove old key
        sed -i.bak '/DEEPGRAM_API_KEY/d' "$config_file"
    else
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Add new key
echo "" >> "$config_file"
echo "# Deepgram API Key for DAWRV Voice Recognition" >> "$config_file"
echo "export DEEPGRAM_API_KEY=\"$api_key\"" >> "$config_file"

echo "✅ API key added to $config_file"
echo ""
echo "Reloading shell configuration..."
source "$config_file"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start DAWRV with Deepgram:"
echo "  1. Close any running DAWRV instances"
echo "  2. Run: cd /Users/frederickzimmerman/DAWRV-Project && npm start"
echo ""
echo "You'll see: 'Selected engine: Deepgram Nova-2 (Fast)'"
echo ""
echo "💡 Tip: If you open a new terminal, it will automatically have the API key!"
echo ""


