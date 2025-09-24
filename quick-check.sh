#!/bin/bash

echo "🔍 Quick Server Status Check..."
echo ""

# Check if Django is running
if pgrep -f "python3 manage.py runserver" > /dev/null; then
    echo "✅ Django server is running"
    echo "📊 Django processes:"
    ps aux | grep "python3 manage.py runserver" | grep -v grep
else
    echo "❌ Django server is NOT running"
fi

echo ""

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is NOT running"
fi

echo ""

# Check directories
echo "📁 Directory status:"
if [ -d "/var/www/sap-project/frontend/dist" ]; then
    echo "✅ Frontend dist directory exists"
    echo "   Files: $(ls -la /var/www/sap-project/frontend/dist/ | wc -l) items"
else
    echo "❌ Frontend dist directory missing"
fi

if [ -d "/var/www/sap-project/backend/staticfiles" ]; then
    echo "✅ Backend staticfiles directory exists"
else
    echo "❌ Backend staticfiles directory missing"
fi

echo ""

# Check ports
echo "🌐 Port status:"
if netstat -tuln | grep ":8000" > /dev/null; then
    echo "✅ Port 8000 is in use (Django)"
else
    echo "❌ Port 8000 is not in use"
fi

if netstat -tuln | grep ":80" > /dev/null; then
    echo "✅ Port 80 is in use (Nginx)"
else
    echo "❌ Port 80 is not in use"
fi

echo ""

# Test connectivity
echo "🔗 Testing connectivity:"
if curl -s http://localhost:8000 > /dev/null; then
    echo "✅ Django backend responds on localhost:8000"
else
    echo "❌ Django backend not responding on localhost:8000"
fi

if curl -s http://46.202.160.75 > /dev/null; then
    echo "✅ Server responds on public IP"
else
    echo "❌ Server not responding on public IP"
fi