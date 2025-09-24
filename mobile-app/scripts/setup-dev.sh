#!/bin/bash

# Development Setup Script
echo "🚀 Setting up Employee Attendance Mobile App for Development..."

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node -v)
echo "Node.js version: $node_version"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup iOS dependencies (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Setting up iOS dependencies..."
    cd ios
    pod install
    cd ..
else
    echo "⚠️  iOS setup skipped (not on macOS)"
fi

# Create local config
echo "⚙️  Creating local configuration..."
if [ ! -f "src/config/local.config.ts" ]; then
    cat > src/config/local.config.ts << EOF
// Local development configuration
export const LOCAL_CONFIG = {
  API_BASE_URL: 'http://10.0.2.2:8000', // Android emulator
  // API_BASE_URL: 'http://localhost:8000', // iOS simulator
  DEBUG_MODE: true,
  ENABLE_LOGGING: true
};
EOF
    echo "📝 Created local.config.ts"
else
    echo "📝 local.config.ts already exists"
fi

# Check Android SDK
echo "🤖 Checking Android SDK..."
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME not set. Please set it to your Android SDK path."
    echo "   Example: export ANDROID_HOME=/Users/username/Library/Android/sdk"
else
    echo "✅ ANDROID_HOME: $ANDROID_HOME"
fi

# Check Java version
echo "☕ Checking Java version..."
java_version=$(java -version 2>&1 | head -n 1)
echo "Java version: $java_version"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📱 To run the app:"
echo "   Android: npx react-native run-android"
echo "   iOS:     npx react-native run-ios"
echo ""
echo "🔧 Don't forget to:"
echo "   1. Start your backend server: python manage.py runserver 0.0.0.0:8000"
echo "   2. Update API_BASE_URL in src/config/config.ts if needed"
echo "   3. Create test employee in Django admin"
echo ""