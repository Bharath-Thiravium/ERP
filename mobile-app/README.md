# Employee Attendance Mobile App

React Native mobile app for employee attendance with GPS tracking and face verification.

## Features

- ✅ Employee login with Employee ID
- ✅ GPS location tracking
- ✅ Camera photo capture for face verification
- ✅ Real-time attendance marking
- ✅ Attendance history
- ✅ Profile management
- ✅ Offline capability

## Setup Instructions

### Prerequisites

1. **Node.js** (v16 or higher)
2. **React Native CLI**
3. **Android Studio** (for Android development)
4. **Xcode** (for iOS development - macOS only)

### Installation

1. **Install React Native CLI globally:**
```bash
npm install -g react-native-cli
```

2. **Install dependencies:**
```bash
cd mobile-app
npm install
```

3. **Configure Backend URL:**
   - Open `src/context/AuthContext.tsx`
   - Replace `YOUR_BACKEND_URL` with your actual backend URL
   - Open `src/services/AttendanceService.ts`
   - Replace `YOUR_BACKEND_URL` with your actual backend URL

### Android Setup

1. **Install Android dependencies:**
```bash
npx react-native link
```

2. **Add permissions to `android/app/src/main/AndroidManifest.xml`:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

3. **Run on Android:**
```bash
npx react-native run-android
```

### iOS Setup

1. **Install iOS dependencies:**
```bash
cd ios && pod install && cd ..
```

2. **Add permissions to `ios/EmployeeAttendanceApp/Info.plist`:**
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs access to camera for face verification</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs access to location for attendance tracking</string>
```

3. **Run on iOS:**
```bash
npx react-native run-ios
```

## Build for Production

### Android APK

1. **Generate signed APK:**
```bash
cd android
./gradlew assembleRelease
```

2. **APK location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

### iOS App Store

1. **Open in Xcode:**
```bash
open ios/EmployeeAttendanceApp.xcworkspace
```

2. **Archive and upload to App Store Connect**

## Configuration

### Backend Integration

Update these files with your backend URL:

1. `src/context/AuthContext.tsx` - Line 35
2. `src/services/AttendanceService.ts` - Line 3

### App Icon and Splash Screen

1. **Android:** Replace files in `android/app/src/main/res/`
2. **iOS:** Replace files in `ios/EmployeeAttendanceApp/Images.xcassets/`

## Usage

1. **Employee Login:** Enter Employee ID
2. **Mark Attendance:** Take photo and check in/out
3. **View History:** See past attendance records
4. **Profile:** View employee information

## Troubleshooting

### Common Issues

1. **Metro bundler issues:**
```bash
npx react-native start --reset-cache
```

2. **Android build issues:**
```bash
cd android && ./gradlew clean && cd ..
```

3. **iOS build issues:**
```bash
cd ios && pod install && cd ..
```

### Permissions

Make sure all required permissions are granted:
- Camera access
- Location access
- Storage access (Android)

## Support

Contact your HR department for:
- Employee ID issues
- Backend connectivity problems
- Account-related queries