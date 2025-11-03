# 📷 Camera Debug Guide for Employee Photo Capture

## 🔍 **Issue Analysis**
The camera capture functionality is implemented but may not be working due to:
1. Browser permissions
2. HTTPS requirement
3. Camera access conflicts
4. Browser compatibility

## 🛠️ **Step-by-Step Debugging**

### **Step 1: Check Browser Console**
1. Open Employee Form → Add Employee
2. Click "Open Camera" button
3. Open browser DevTools (F12)
4. Check Console tab for error messages
5. Look for these specific logs:
   - `🎥 Starting camera...`
   - `✅ MediaDevices supported, requesting camera access...`
   - `✅ Camera stream obtained:`
   - `📹 Setting video source...`

### **Step 2: Check Browser Permissions**
1. Look for camera permission popup in browser
2. Click "Allow" when prompted
3. Check browser address bar for camera icon
4. If blocked, click the camera icon and select "Allow"

### **Step 3: Verify HTTPS**
Camera access requires HTTPS in production. Check if you're using:
- ✅ `https://localhost:3000` or `https://your-domain.com`
- ❌ `http://localhost:3000` (may not work in some browsers)

### **Step 4: Test Camera Access Manually**
Open browser console and run:
```javascript
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('✅ Camera works!', stream)
    stream.getTracks().forEach(track => track.stop())
  })
  .catch(error => {
    console.error('❌ Camera error:', error)
  })
```

## 🔧 **Quick Fixes**

### **Fix 1: Enable HTTPS for Development**
Update your `package.json` dev script:
```json
{
  "scripts": {
    "dev": "HTTPS=true vite --host"
  }
}
```

### **Fix 2: Browser-Specific Issues**

**Chrome:**
- Go to `chrome://settings/content/camera`
- Ensure your site is allowed

**Firefox:**
- Go to `about:preferences#privacy`
- Check Camera permissions

**Safari:**
- Safari → Preferences → Websites → Camera
- Allow camera access

### **Fix 3: Test with Simple Camera Component**
I've created a test component at `/src/components/debug/CameraTest.tsx`

To use it, add to your route temporarily:
```tsx
import CameraTest from '../components/debug/CameraTest'

// Add this route for testing
<Route path="/camera-test" element={<CameraTest />} />
```

## 📱 **Mobile Testing**
If testing on mobile:
1. Ensure you're using HTTPS
2. Test in mobile browser (Chrome/Safari)
3. Check if camera permission is granted

## 🚨 **Common Error Messages & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| `NotAllowedError` | Permission denied | Click "Allow" in browser popup |
| `NotFoundError` | No camera found | Connect camera or use different device |
| `NotReadableError` | Camera in use | Close other apps using camera |
| `OverconstrainedError` | Unsupported settings | Try basic camera settings |

## ✅ **Expected Behavior**
When working correctly:
1. Click "Open Camera" → Permission popup appears
2. Click "Allow" → Camera feed shows in modal
3. Position face in circle guide
4. Click "Capture Photo" → Photo is captured
5. Preview shows captured image
6. Camera stops automatically

## 🔍 **Debug Output**
Check console for these messages:
```
🎥 Starting camera...
✅ MediaDevices supported, requesting camera access...
✅ Camera stream obtained: MediaStream {...}
📹 Setting video source...
✅ Video metadata loaded, starting playback...
✅ Video playing successfully
```

## 📞 **If Still Not Working**
1. Try different browser (Chrome recommended)
2. Check if other camera apps work on your device
3. Restart browser
4. Clear browser cache and cookies
5. Test on different device

## 🎯 **Alternative Solution**
If camera capture continues to fail, users can:
1. Use "Upload" button instead
2. Take photo with phone camera
3. Upload the saved image file

The face recognition will work with both captured and uploaded photos.