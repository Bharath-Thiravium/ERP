#!/bin/bash

# SAP-Python Deployment Verification Script
# This script verifies that the InvoiceView fixes are properly deployed

echo "🔍 SAP-Python Deployment Verification"
echo "======================================"

# Check if frontend files are built
echo "1. Checking frontend build files..."
if [ -d "/var/www/SAP-Python/frontend/dist" ]; then
    echo "✅ Frontend dist directory exists"
    echo "   Files: $(ls -1 /var/www/SAP-Python/frontend/dist/assets/*.js | wc -l) JS files"
else
    echo "❌ Frontend dist directory missing"
    exit 1
fi

# Check if our changes are in the built files
echo "2. Checking for our fixes in built files..."
if grep -r "Session expired" /var/www/SAP-Python/frontend/dist/assets/*.js > /dev/null 2>&1; then
    echo "✅ InvoiceView error handling fixes found in built files"
else
    echo "❌ InvoiceView fixes not found in built files"
fi

# Check nginx configuration
echo "3. Checking nginx configuration..."
if grep -q "proxy_pass http://127.0.0.1:8004" /etc/nginx/sites-available/sap.athenas.co.in; then
    echo "✅ Nginx configured for port 8004"
else
    echo "❌ Nginx not configured for port 8004"
fi

# Check if backend is running on port 8004
echo "4. Checking backend service..."
if curl -s -I http://127.0.0.1:8004/api/ | grep -q "HTTP/1.1 401"; then
    echo "✅ Backend API responding on port 8004"
else
    echo "❌ Backend API not responding on port 8004"
fi

# Check if frontend is accessible
echo "5. Checking frontend accessibility..."
if curl -s -I https://sap.athenas.co.in/ | grep -q "HTTP/2 200"; then
    echo "✅ Frontend accessible via HTTPS"
else
    echo "❌ Frontend not accessible"
fi

# Check if API proxy is working
echo "6. Checking API proxy..."
if curl -s -I https://sap.athenas.co.in/api/ | grep -q "HTTP/2 401"; then
    echo "✅ API proxy working (401 expected without auth)"
else
    echo "❌ API proxy not working"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Test InvoiceView in browser:"
echo "   - Go to https://sap.athenas.co.in"
echo "   - Login to Finance service"
echo "   - Navigate to Finance > Invoices"
echo "   - Click 'View' on any invoice"
echo "   - Check browser console for detailed error messages"
echo ""
echo "🔧 Troubleshooting:"
echo "- If still seeing 'something went wrong', check browser console"
echo "- Look for detailed error messages we added"
echo "- Verify sessionKey is valid"
echo "- Check network tab for API call responses"