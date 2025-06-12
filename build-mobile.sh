#!/bin/bash

echo "🚀 Building Amigo Montador for mobile platforms..."

# Build the web app first
echo "📦 Building web application..."
npm run build

# Check if build was successful
if [ ! -d "dist/public" ]; then
    echo "❌ Web build failed. dist/public directory not found."
    exit 1
fi

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync

# Generate icons if they don't exist
if [ ! -f "client/public/icon-192.png" ]; then
    echo "🎨 Generating PWA icons..."
    node android-app-icons/icon-generator.js
fi

# Build for Android
echo "🤖 Building for Android..."
if command -v npx &> /dev/null; then
    npx cap build android
    echo "✅ Android build completed"
else
    echo "⚠️  Capacitor CLI not found. Install with: npm install -g @capacitor/cli"
fi

# Build for iOS (only on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Building for iOS..."
    npx cap build ios
    echo "✅ iOS build completed"
else
    echo "ℹ️  iOS build skipped (requires macOS)"
fi

echo "✨ Mobile build process completed!"
echo ""
echo "📱 Next steps:"
echo "   • Android: Open android/ folder in Android Studio"
echo "   • iOS: Open ios/ folder in Xcode (macOS only)"
echo "   • PWA: Your app is ready for web installation"