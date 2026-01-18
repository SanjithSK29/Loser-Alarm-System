#!/bin/bash

# Loser Alarm - Complete Setup Script
# This script sets up the extension with a sample siren audio

set -e  # Exit on error

EXTENSION_DIR="$(cd "$(dirname "$0")" && pwd)"
LOSERR_DIR="$EXTENSION_DIR"

echo "========================================"
echo "🚨 Loser Alarm - Setup Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "$LOSERR_DIR/manifest.json" ]; then
    echo "❌ Error: manifest.json not found!"
    echo "Please run this script from the Loserr extension folder"
    exit 1
fi

echo "✅ Found extension files in: $LOSERR_DIR"
echo ""

# Step 1: Generate icons if ImageMagick available
echo "📦 Step 1: Generating extension icons..."
if command -v convert &> /dev/null; then
    cd "$LOSERR_DIR/images"
    
    # Create colorful gradient icons
    convert -size 16x16 \
      gradient:'#667eea'-'#764ba2' \
      -fill white -gravity center \
      -pointsize 10 -annotate +0+0 '⏱' \
      icon-16.png
    
    convert -size 48x48 \
      gradient:'#667eea'-'#764ba2' \
      -fill white -gravity center \
      -pointsize 32 -annotate +0+0 '⏱' \
      icon-48.png
    
    convert -size 128x128 \
      gradient:'#667eea'-'#764ba2' \
      -fill white -gravity center \
      -pointsize 96 -annotate +0+0 '⏱' \
      icon-128.png
    
    echo "   ✅ Icons generated"
else
    echo "   ⚠️  ImageMagick not installed, skipping icon generation"
    echo "      Install with: sudo apt-get install imagemagick"
    echo "      Or download icons manually from a design tool"
fi

echo ""

# Step 2: Create sample siren audio
echo "📦 Step 2: Creating sample siren audio..."
if command -v ffmpeg &> /dev/null; then
    # Create a 3-second siren-like sound (1000Hz sine wave)
    echo "   Creating sample alarm sound (siren-like tone)..."
    ffmpeg -f lavfi -i "sine=f=1000:d=3" -q:a 9 \
      -acodec libmp3lame "$LOSERR_DIR/siren.mp3" 2>/dev/null
    
    echo "   ✅ Sample siren created at: siren.mp3"
    echo "      (Replace with real siren from freesound.org for better alarm)"
else
    echo "   ⚠️  FFmpeg not installed"
    echo "      Install with: sudo apt-get install ffmpeg"
    echo "      Or download a free siren from: https://freesound.org"
    echo "      And place it as: siren.mp3"
fi

echo ""

# Step 3: Verify all required files
echo "📦 Step 3: Verifying file structure..."
REQUIRED_FILES=(
    "manifest.json"
    "background.js"
    "popup.html"
    "popup.js"
    "popup.css"
    "offscreen.html"
    "offscreen.js"
)

ALL_PRESENT=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$LOSERR_DIR/$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ Missing: $file"
        ALL_PRESENT=false
    fi
done

if [ "$ALL_PRESENT" = false ]; then
    echo ""
    echo "❌ Some required files are missing!"
    exit 1
fi

echo ""

# Step 4: Check for siren.mp3
echo "📦 Step 4: Checking for siren audio..."
if [ -f "$LOSERR_DIR/siren.mp3" ]; then
    SIZE=$(du -h "$LOSERR_DIR/siren.mp3" | cut -f1)
    echo "   ✅ siren.mp3 found ($SIZE)"
else
    echo "   ⚠️  siren.mp3 not found"
    echo "      Please add an audio file named siren.mp3 to the extension folder"
fi

echo ""

# Step 5: Verify manifest.json syntax
echo "📦 Step 5: Validating manifest.json..."
if command -v python3 &> /dev/null; then
    if python3 -m json.tool "$LOSERR_DIR/manifest.json" > /dev/null 2>&1; then
        echo "   ✅ manifest.json is valid JSON"
    else
        echo "   ❌ manifest.json has syntax errors!"
        exit 1
    fi
else
    echo "   ⚠️  Could not validate (Python3 not available)"
fi

echo ""

# Step 6: Show installation instructions
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "📍 Extension Location: $LOSERR_DIR"
echo ""
echo "🔧 Next Steps:"
echo ""
echo "1️⃣  Open Chrome: chrome://extensions"
echo ""
echo "2️⃣  Enable 'Developer mode' (top right toggle)"
echo ""
echo "3️⃣  Click 'Load unpacked'"
echo ""
echo "4️⃣  Select this folder: $LOSERR_DIR"
echo ""
echo "5️⃣  Done! Extension icon appears in toolbar"
echo ""
echo "🧪 Quick Test:"
echo "   1. Visit https://www.netflix.com"
echo "   2. Click Loser Alarm icon"
echo "   3. Change 'Time Limit' to 0.167 minutes (~10 seconds)"
echo "   4. Click 'Update'"
echo "   5. Click 'Start'"
echo "   6. Wait 10 seconds - Alarm should trigger!"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Full feature documentation"
echo "   - INSTALL.md - Installation troubleshooting"
echo "   - DEBUGGING.md - How to debug issues"
echo "   - AUDIO_SETUP.md - How to add better alarm sound"
echo ""
echo "========================================"
echo ""

# Optional: Try to open chrome://extensions
if command -v google-chrome &> /dev/null || command -v chromium &> /dev/null; then
    read -p "Open chrome://extensions in Chrome now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v google-chrome &> /dev/null; then
            google-chrome "chrome://extensions" &
        else
            chromium "chrome://extensions" &
        fi
    fi
fi

echo "Happy tracking! 🎯"
