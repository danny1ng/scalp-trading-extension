#!/bin/bash

echo "🏗️  Building Scalp Trading Extension..."

pnpm build

if [ $? -eq 0 ]; then
  echo "📋 Copying manifest.json..."
  cp manifest.json dist/

  echo "✅ Build complete!"
  echo "📦 Extension ready in dist/ folder"
  echo ""
  echo "To load in Chrome:"
  echo "1. Open chrome://extensions/"
  echo "2. Enable 'Developer mode'"
  echo "3. Click 'Load unpacked'"
  echo "4. Select the 'dist' folder"
else
  echo "❌ Build failed!"
  exit 1
fi
