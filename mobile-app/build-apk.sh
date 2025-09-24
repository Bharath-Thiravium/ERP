#!/bin/bash

echo "📱 Building Employee Attendance APK for Distribution..."

# Update server URL
echo "⚙️ Configuring server URL..."
read -p "Enter your server IP/domain (e.g., 192.168.1.100 or yourdomain.com): " SERVER_URL

# Update config file
cat > src/config/config.ts << EOF
export const CONFIG = {
  API: {
    BASE_URL: 'http://${SERVER_URL}:8000',
    TIMEOUT: 15000,
    RETRY_ATTEMPTS: 3
  },
  GPS: {
    ACCURACY_THRESHOLD: 20,
    TIMEOUT: 15000,
    MAXIMUM_AGE: 10000,
    ENABLE_HIGH_ACCURACY: true
  },
  CAMERA: {
    QUALITY: 0.8,
    MAX_WIDTH: 2000,
    MAX_HEIGHT: 2000,
    INCLUDE_BASE64: true
  },
  FACE_VERIFICATION: {
    CONFIDENCE_THRESHOLD: 0.8,
    ENABLED: true
  },
  APP: {
    VERSION: '1.0.0',
    AUTO_REFRESH_INTERVAL: 30000,
    OFFLINE_STORAGE_DAYS: 7
  },
  GEOFENCE: {
    DEFAULT_RADIUS: 100,
    CHECK_INTERVAL: 5000
  }
};

export default CONFIG;
EOF

echo "✅ Server URL configured: http://${SERVER_URL}:8000"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean
cd ..

# Build APK
echo "🔨 Building APK..."
cd android
./gradlew assembleRelease

# Check if build successful
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ APK built successfully!"
    
    # Copy APK to root with descriptive name
    cp app/build/outputs/apk/release/app-release.apk ../EmployeeAttendance.apk
    
    echo "📱 APK created: EmployeeAttendance.apk"
    echo "📊 APK size: $(ls -lh ../EmployeeAttendance.apk | awk '{print $5}')"
    
    cd ..
    
    echo ""
    echo "🎉 APK Ready for Distribution!"
    echo "📁 Location: $(pwd)/EmployeeAttendance.apk"
    echo "📤 Share this APK file with all employees"
    
else
    echo "❌ APK build failed!"
    cd ..
    exit 1
fi