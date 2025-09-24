#!/bin/bash

# Android Production Build Script
echo "🚀 Building Android APK for Production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean
cd ..

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate release APK
echo "🔨 Building release APK..."
cd android
./gradlew assembleRelease

# Check if build was successful
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ Build successful!"
    echo "📱 APK location: android/app/build/outputs/apk/release/app-release.apk"
    
    # Copy APK to root directory for easy access
    cp app/build/outputs/apk/release/app-release.apk ../EmployeeAttendance-release.apk
    echo "📋 APK copied to: EmployeeAttendance-release.apk"
    
    # Show APK info
    echo "📊 APK Information:"
    ls -lh ../EmployeeAttendance-release.apk
else
    echo "❌ Build failed!"
    exit 1
fi

cd ..
echo "🎉 Android build complete!"