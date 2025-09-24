# 📱 Complete APK Distribution Guide

## 🚀 **Step 1: Build APK for Your Company**

```bash
# Navigate to mobile app
cd mobile-app

# Build APK (will ask for your server IP)
chmod +x build-apk.sh
./build-apk.sh

# Enter your server IP when prompted (e.g., 192.168.1.100)
```

## 👥 **Step 2: Create Employee Accounts**

```bash
# Create sample employees
cd ..
python3 create-employees.py

# Or create manually in Django admin
cd backend
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
# Visit: http://your-ip:8000/admin
```

## 📤 **Step 3: Distribute APK to Employees**

```bash
# Setup distribution
chmod +x distribute-apk.sh
./distribute-apk.sh

# Start download server
cd distribution
./start-download-server.sh
```

## 📱 **Step 4: Share with Employees**

### **Option 1: Download Server**
1. Start download server (from Step 3)
2. Share link: `http://YOUR_IP:8080/EmployeeAttendance.apk`
3. Employees download and install

### **Option 2: WhatsApp/Email**
1. Use `distribution/message-template.txt`
2. Attach APK file to email
3. Send to all employees

### **Option 3: USB/Physical**
1. Copy `EmployeeAttendance.apk` to USB
2. Install on each employee's phone
3. Provide Employee IDs

### **Option 4: QR Code**
1. Print `distribution/download-qr.png`
2. Display in office
3. Employees scan to download

## 📋 **Employee Login Credentials**

After running `create-employees.py`:

| Employee ID | Name | Login |
|-------------|------|-------|
| EMP001 | John Doe | Use EMP001 |
| EMP002 | Jane Smith | Use EMP002 |
| EMP003 | Mike Johnson | Use EMP003 |
| EMP004 | Sarah Wilson | Use EMP004 |
| EMP005 | David Brown | Use EMP005 |

## 📱 **Employee Instructions**

### **Installation:**
1. Download `EmployeeAttendance.apk`
2. Enable "Install from Unknown Sources"
3. Install APK
4. Open app

### **Login:**
1. Enter Employee ID (e.g., EMP001)
2. Allow location permission
3. Allow camera permission

### **Daily Usage:**
1. **Morning**: Open app → Take photo → Check-in
2. **Evening**: Open app → Check-out

## 🔧 **Server Setup**

### **Start Backend:**
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

### **Set Office Location:**
```python
# In Django shell: python manage.py shell
from hr.models import GeofenceLocation
from authentication.models import Company

company = Company.objects.first()
GeofenceLocation.objects.create(
    company=company,
    name="Main Office",
    latitude=YOUR_LATITUDE,    # Replace with your coordinates
    longitude=YOUR_LONGITUDE,  # Replace with your coordinates
    radius=100
)
```

## 📊 **Monitor Attendance**

### **Django Admin:**
- Visit: `http://your-ip:8000/admin`
- Check HR → Attendances
- View employee check-ins/outs

### **HR Dashboard:**
- Visit: `http://your-ip:8000`
- Login as service user
- View live attendance dashboard

## 🐛 **Common Issues & Solutions**

### **APK Won't Install:**
- Enable "Unknown Sources" in Android settings
- Check phone storage space
- Try downloading APK again

### **Employee Can't Login:**
- Verify Employee ID spelling
- Check employee exists in Django admin
- Ensure employee status is 'active'

### **GPS Not Working:**
- Employee should enable high accuracy GPS
- Try in open area
- Check geofence location is set correctly

### **Camera Issues:**
- Grant camera permission
- Ensure good lighting
- Clean camera lens

## 📈 **Success Metrics**

Track these in Django admin:
- ✅ Employee registrations
- ✅ Daily check-ins
- ✅ GPS accuracy rates
- ✅ Photo verification success
- ✅ Offline sync rates

## 🎉 **You're Done!**

Your Employee Attendance system is now:
- ✅ **APK built** and ready for distribution
- ✅ **Employees created** with login credentials
- ✅ **Distribution setup** with multiple options
- ✅ **Instructions provided** for employees
- ✅ **Monitoring enabled** for HR/admin

### **APK Works On:**
- Samsung, Xiaomi, OnePlus, Oppo, Vivo, Realme
- Any Android 6.0+ phone
- Budget to flagship devices

**Your mobile attendance system is LIVE! 🚀📱**