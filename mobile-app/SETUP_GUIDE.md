# Employee Attendance Mobile App - Complete Setup Guide

## 🚀 Quick Setup

### Prerequisites
- Node.js 16+ 
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS - macOS only)
- Java 11+
- Python 3.8+ (for backend)

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create sample HR data
python manage.py create_hr_sample_data

# Start backend server
python manage.py runserver 0.0.0.0:8000
```

### 2. Mobile App Setup

```bash
# Navigate to mobile app
cd mobile-app

# Install dependencies
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..

# Update configuration
# Edit src/config/config.ts and update BASE_URL
```

### 3. Android Setup

```bash
# Add to android/app/src/main/AndroidManifest.xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />

# Run on Android
npx react-native run-android
```

### 4. iOS Setup (macOS only)

```bash
# Add to ios/EmployeeAttendanceApp/Info.plist
<key>NSCameraUsageDescription</key>
<string>Camera access required for face verification</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location access required for attendance tracking</string>

# Run on iOS
npx react-native run-ios
```

## 🔧 Configuration

### Backend Configuration

1. **Update settings.py**:
```python
ALLOWED_HOSTS = ['*']  # For development
CORS_ALLOW_ALL_ORIGINS = True  # For development
```

2. **Create Geofence Locations**:
```python
# In Django admin or shell
from hr.models import GeofenceLocation
from authentication.models import Company

company = Company.objects.first()
GeofenceLocation.objects.create(
    company=company,
    name="Main Office",
    latitude=12.9716,  # Your office coordinates
    longitude=77.5946,
    radius=100
)
```

### Mobile App Configuration

1. **Update config.ts**:
```typescript
export const CONFIG = {
  API: {
    BASE_URL: 'http://YOUR_SERVER_IP:8000', // Replace with your server IP
  },
  // ... other configs
};
```

2. **For Production**:
```typescript
BASE_URL: 'https://your-domain.com'
```

## 📱 Features Implemented

### ✅ Core Features
- Employee login with Employee ID
- GPS-based attendance tracking
- Face photo verification
- Real-time location validation
- Offline attendance storage
- Automatic sync when online
- Attendance history
- Profile management

### ✅ Advanced Features
- Geofence validation
- Device fingerprinting
- Network connectivity handling
- Background sync
- Error handling and retry logic
- Toast notifications
- Loading states

### ✅ Security Features
- Face verification
- GPS accuracy validation
- Device information tracking
- IP address logging
- Session management

## 🔄 Sync Process

### Offline Handling
1. When offline, attendance is stored locally
2. User sees "Stored Offline" message
3. Data syncs automatically when online
4. Old synced data is cleaned up after 7 days

### Background Sync
- Automatic sync every 30 seconds when online
- Retry logic with exponential backoff
- Network state monitoring

## 🧪 Testing

### Test Employee Login
1. Create test employee in Django admin
2. Set Employee ID (e.g., EMP001)
3. Set attendance_method to 'mobile_gps'
4. Login with Employee ID in mobile app

### Test Attendance Flow
1. Login with employee ID
2. Allow location and camera permissions
3. Take photo for face verification
4. Check in (GPS location will be validated)
5. Check out when done

### Test Offline Mode
1. Turn off internet/WiFi
2. Try to mark attendance
3. Should show "Stored Offline" message
4. Turn internet back on
5. Data should sync automatically

## 🐛 Troubleshooting

### Common Issues

1. **Location not working**:
   - Check permissions in device settings
   - Ensure GPS is enabled
   - Try in open area for better accuracy

2. **Camera not working**:
   - Check camera permissions
   - Restart app if needed

3. **Network errors**:
   - Check server is running on correct IP
   - Update BASE_URL in config
   - Check firewall settings

4. **Build errors**:
   - Clean build: `npx react-native start --reset-cache`
   - Android: `cd android && ./gradlew clean`
   - iOS: `cd ios && pod install`

### Debug Mode
- Enable debug mode in config.ts
- Check console logs for detailed errors
- Use React Native Debugger for advanced debugging

## 📦 Production Build

### Android APK
```bash
cd android
./gradlew assembleRelease
# APK location: android/app/build/outputs/apk/release/
```

### iOS App Store
```bash
# Open in Xcode
open ios/EmployeeAttendanceApp.xcworkspace
# Archive and upload to App Store Connect
```

## 🔐 Security Considerations

1. **API Security**:
   - Use HTTPS in production
   - Implement proper authentication
   - Rate limiting on APIs

2. **Data Security**:
   - Encrypt sensitive data
   - Secure local storage
   - Regular security audits

3. **Privacy**:
   - Clear privacy policy
   - User consent for location/camera
   - Data retention policies

## 📞 Support

For technical support:
1. Check logs in React Native debugger
2. Review backend Django logs
3. Contact HR department for employee-related issues
4. Check network connectivity and server status

## 🚀 Next Steps

### Planned Enhancements
- Push notifications
- Biometric authentication
- Advanced analytics
- Multi-language support
- Dark mode
- Shift management
- Leave integration

### Performance Optimizations
- Image compression
- Lazy loading
- Memory management
- Battery optimization