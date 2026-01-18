#!/bin/bash
# Generate placeholder PNG icons for the extension
# Requires ImageMagick (convert command)

# Check if convert command exists
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not installed. Installing..."
    sudo apt-get install -y imagemagick
fi

cd "$(dirname "$0")"

# Create 16x16 icon
convert -size 16x16 xc:#667eea -background '#667eea' -fill white -gravity center \
  -pointsize 8 -annotate +0+0 '🚨' icon-16.png

# Create 48x48 icon
convert -size 48x48 xc:#667eea -background '#667eea' -fill white -gravity center \
  -pointsize 24 -annotate +0+0 '🚨' icon-48.png

# Create 128x128 icon
convert -size 128x128 xc:#667eea -background '#667eea' -fill white -gravity center \
  -pointsize 64 -annotate +0+0 '🚨' icon-128.png

echo "Icons generated:"
ls -lh icon-*.png

echo ""
echo "✅ All icons created in the images/ directory"
echo "   The extension should now display the alarm icon in the toolbar"
