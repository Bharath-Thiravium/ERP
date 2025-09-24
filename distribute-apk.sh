#!/bin/bash

echo "📤 Employee Attendance APK Distribution Setup"

# Check if APK exists
if [ ! -f "mobile-app/EmployeeAttendance.apk" ]; then
    echo "❌ APK not found! Please build APK first:"
    echo "   cd mobile-app && ./build-apk.sh"
    exit 1
fi

echo "✅ APK found: mobile-app/EmployeeAttendance.apk"

# Create distribution folder
mkdir -p distribution
cp mobile-app/EmployeeAttendance.apk distribution/
cp EMPLOYEE_APP_GUIDE.md distribution/

# Create QR code for easy download (if qrencode is available)
if command -v qrencode &> /dev/null; then
    echo "📱 Creating QR code for download..."
    echo "http://$(hostname -I | awk '{print $1}'):8080/EmployeeAttendance.apk" | qrencode -t PNG -o distribution/download-qr.png
    echo "✅ QR code created: distribution/download-qr.png"
fi

# Create simple HTTP server script
cat > distribution/start-download-server.sh << 'EOF'
#!/bin/bash
echo "🌐 Starting download server..."
echo "📱 Employees can download APK from:"
echo "   http://$(hostname -I | awk '{print $1}'):8080/EmployeeAttendance.apk"
echo ""
echo "📋 Share this link with employees or show QR code"
echo "⏹️  Press Ctrl+C to stop server"
echo ""
python3 -m http.server 8080
EOF

chmod +x distribution/start-download-server.sh

# Create WhatsApp/Email message template
cat > distribution/message-template.txt << EOF
📱 *Employee Attendance App*

Dear Team,

Please install the new Employee Attendance mobile app:

*Download Link:*
http://$(hostname -I | awk '{print $1}'):8080/EmployeeAttendance.apk

*Installation Steps:*
1. Click the link above to download
2. Enable "Install from Unknown Sources" in phone settings
3. Install the APK file
4. Login with your Employee ID

*Your Employee ID:* [HR will provide]

*Need Help?*
- Check the user guide
- Contact HR for Employee ID
- Contact IT for technical issues

*Features:*
✅ GPS-based attendance
✅ Face photo verification  
✅ Works offline
✅ Attendance history

Please install and test the app today.

Thanks,
HR Department
EOF

echo ""
echo "🎉 Distribution Package Ready!"
echo ""
echo "📁 Files created in 'distribution/' folder:"
echo "   - EmployeeAttendance.apk (The app file)"
echo "   - EMPLOYEE_APP_GUIDE.md (User guide)"
echo "   - start-download-server.sh (Download server)"
echo "   - message-template.txt (WhatsApp/Email template)"
if [ -f "distribution/download-qr.png" ]; then
    echo "   - download-qr.png (QR code for download)"
fi

echo ""
echo "📤 Distribution Options:"
echo ""
echo "1️⃣  *Start Download Server:*"
echo "   cd distribution && ./start-download-server.sh"
echo "   Share the download link with employees"
echo ""
echo "2️⃣  *Manual Distribution:*"
echo "   Copy EmployeeAttendance.apk to USB/Email"
echo "   Share with employees individually"
echo ""
echo "3️⃣  *WhatsApp/Email:*"
echo "   Use message-template.txt content"
echo "   Customize with employee IDs"
echo ""
echo "4️⃣  *QR Code:*"
if [ -f "distribution/download-qr.png" ]; then
    echo "   Print download-qr.png and display in office"
else
    echo "   Install qrencode: sudo apt install qrencode"
fi

echo ""
echo "✅ Your APK is ready for ALL employees!"