#!/bin/bash

echo "🚀 Building Universal Employee Attendance App..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the mobile-app directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 5
kill $METRO_PID

# Build Android Universal APK
echo "🤖 Building Android Universal APK..."
cd android

# Clean Android build
./gradlew clean

# Build release APK with universal support
./gradlew assembleRelease

# Check if build was successful
if [ -f "app/build/outputs/apk/release/app-universal-release.apk" ]; then
    echo "✅ Universal APK built successfully!"
    cp app/build/outputs/apk/release/app-universal-release.apk ../EmployeeAttendance-Universal.apk
    echo "📱 Universal APK: EmployeeAttendance-Universal.apk"
elif [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ Release APK built successfully!"
    cp app/build/outputs/apk/release/app-release.apk ../EmployeeAttendance-Universal.apk
    echo "📱 Release APK: EmployeeAttendance-Universal.apk"
else
    echo "❌ Android build failed!"
    cd ..
    exit 1
fi

cd ..

# Show APK details
echo "📊 APK Information:"
ls -lh EmployeeAttendance-Universal.apk

# Check if on macOS for iOS build
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Building iOS (macOS detected)..."
    cd ios
    
    # Install pods
    pod install
    
    # Build iOS
    xcodebuild -workspace EmployeeAttendanceApp.xcworkspace -scheme EmployeeAttendanceApp -configuration Release -destination generic/platform=iOS -archivePath EmployeeAttendanceApp.xcarchive archive
    
    if [ -d "EmployeeAttendanceApp.xcarchive" ]; then
        echo "✅ iOS build successful!"
        echo "📱 iOS Archive: ios/EmployeeAttendanceApp.xcarchive"
    else
        echo "⚠️  iOS build failed (check Xcode setup)"
    fi
    
    cd ..
else
    echo "⚠️  iOS build skipped (not on macOS)"
fi

echo ""
echo "🎉 Build Complete!"
echo ""
echo "📱 Files created:"
echo "   - EmployeeAttendance-Universal.apk (Android - works on all devices)"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   - ios/EmployeeAttendanceApp.xcarchive (iOS)"
fi
echo ""
echo "📋 Installation:"
echo "   Android: Install EmployeeAttendance-Universal.apk on any Android device"
echo "   iOS: Upload xcarchive to App Store Connect or install via Xcode"
echo ""
echo "✅ Your app is ready for all phones!"