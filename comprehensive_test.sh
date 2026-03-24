#!/bin/bash

echo "=== SAP-Python System Comprehensive Test ==="
echo "Date: $(date)"
echo

# Test 1: Frontend accessibility
echo "1. Testing Frontend Accessibility..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://sap.athenas.co.in/)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend accessible (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Frontend not accessible (HTTP $FRONTEND_STATUS)"
fi

# Test 2: API endpoint
echo "2. Testing API Endpoint..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://sap.athenas.co.in/api/)
if [ "$API_STATUS" = "401" ]; then
    echo "✅ API responding correctly (HTTP $API_STATUS - Authentication required)"
else
    echo "❌ API not responding correctly (HTTP $API_STATUS)"
fi

# Test 3: Backend direct access
echo "3. Testing Backend Direct Access..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8004/api/)
if [ "$BACKEND_STATUS" = "401" ]; then
    echo "✅ Backend responding correctly (HTTP $BACKEND_STATUS)"
else
    echo "❌ Backend not responding correctly (HTTP $BACKEND_STATUS)"
fi

# Test 4: Frontend routing (no redirection cycles)
echo "4. Testing Frontend Routing..."
ROUTE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://sap.athenas.co.in/services/finance/dashboard)
if [ "$ROUTE_STATUS" = "200" ]; then
    echo "✅ Frontend routing working (HTTP $ROUTE_STATUS)"
else
    echo "❌ Frontend routing issues (HTTP $ROUTE_STATUS)"
fi

# Test 5: Static assets
echo "5. Testing Static Assets..."
ASSETS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://sap.athenas.co.in/assets/index-_L8wXsew.js)
if [ "$ASSETS_STATUS" = "200" ]; then
    echo "✅ Static assets loading (HTTP $ASSETS_STATUS)"
else
    echo "❌ Static assets not loading (HTTP $ASSETS_STATUS)"
fi

# Test 6: Check for nginx errors
echo "6. Checking Nginx Error Logs..."
RECENT_ERRORS=$(tail -10 /var/log/nginx/error.log | grep -c "$(date +%Y/%m/%d)")
if [ "$RECENT_ERRORS" -eq 0 ]; then
    echo "✅ No recent nginx errors"
else
    echo "⚠️  Found $RECENT_ERRORS recent nginx errors"
fi

# Test 7: Process status
echo "7. Checking Process Status..."
BACKEND_PROC=$(ps aux | grep -c "gunicorn.*8004.*sap_backend")
FRONTEND_PROC=$(ps aux | grep -c "vite.*SAP-Python")
NGINX_PROC=$(ps aux | grep -c "nginx.*master")

if [ "$BACKEND_PROC" -gt 0 ]; then
    echo "✅ Backend process running"
else
    echo "❌ Backend process not running"
fi

if [ "$FRONTEND_PROC" -gt 0 ]; then
    echo "✅ Frontend dev server running"
else
    echo "⚠️  Frontend dev server not running (using built files)"
fi

if [ "$NGINX_PROC" -gt 0 ]; then
    echo "✅ Nginx running"
else
    echo "❌ Nginx not running"
fi

echo
echo "=== Test Summary ==="
echo "If all tests show ✅, the system is working correctly."
echo "If you see ❌, there are issues that need attention."
echo "If you see ⚠️, there are warnings but system should work."