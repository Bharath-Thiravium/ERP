#!/bin/bash

echo "🚀 Quick Setup for Employee Attendance Mobile App"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install additional required packages
echo "📦 Installing React Native dependencies..."
npm install @react-native-community/netinfo react-native-permissions react-native-device-info

# For Android setup
echo "🤖 Setting up Android..."
if [ ! -d "android" ]; then
    npx react-native init EmployeeAttendanceApp --template react-native-template-typescript
    mv EmployeeAttendanceApp/* .
    rm -rf EmployeeAttendanceApp
fi

# Make scripts executable
chmod +x scripts/*.sh

echo "✅ Setup complete!"
echo ""
echo "📱 Next steps:"
echo "1. Start backend: cd ../backend && python manage.py runserver 0.0.0.0:8000"
echo "2. Run Android: npx react-native run-android"
echo "3. Run iOS: npx react-native run-ios"