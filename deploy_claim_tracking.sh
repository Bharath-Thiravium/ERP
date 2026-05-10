#!/bin/bash

echo "========================================="
echo "Deploying Claim Tracking Feature Updates"
echo "========================================="
echo ""

# Step 1: Check if backend process is running
echo "Step 1: Checking backend status..."
BACKEND_PID=$(lsof -ti:8004)
if [ -n "$BACKEND_PID" ]; then
    echo "✓ Backend is running on port 8004 (PID: $BACKEND_PID)"
else
    echo "✗ Backend is not running"
fi
echo ""

# Step 2: Kill backend processes
echo "Step 2: Stopping backend..."
lsof -ti:8004 | xargs kill -9 2>/dev/null
sleep 2
echo "✓ Backend stopped"
echo ""

# Step 3: Kill Celery workers
echo "Step 3: Stopping Celery workers..."
pkill -f "celery.*worker" 2>/dev/null
sleep 1
echo "✓ Celery workers stopped"
echo ""

# Step 4: Clear Python cache
echo "Step 4: Clearing Python cache..."
cd /var/www/SAP-Python/backend
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
echo "✓ Python cache cleared"
echo ""

# Step 5: Activate virtual environment and start backend
echo "Step 5: Starting backend..."
cd /var/www/SAP-Python/backend
source venv/bin/activate
nohup python manage.py runserver 0.0.0.0:8004 > /tmp/backend.log 2>&1 &
sleep 3
echo "✓ Backend started"
echo ""

# Step 6: Start Celery worker
echo "Step 6: Starting Celery worker..."
cd /var/www/SAP-Python/backend
source venv/bin/activate
nohup celery -A sap_backend worker --loglevel=info > /tmp/celery.log 2>&1 &
sleep 2
echo "✓ Celery worker started"
echo ""

# Step 7: Verify backend is running
echo "Step 7: Verifying backend..."
sleep 2
BACKEND_PID=$(lsof -ti:8004)
if [ -n "$BACKEND_PID" ]; then
    echo "✓ Backend is running on port 8004 (PID: $BACKEND_PID)"
    echo "✓ Backend logs: /tmp/backend.log"
else
    echo "✗ Backend failed to start"
    echo "Check logs: tail -f /tmp/backend.log"
    exit 1
fi
echo ""

echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Create a NEW Purchase Order"
echo "2. Raise Invoice from PO"
echo "3. Select 'By Percentage' for items"
echo "4. Enter percentage (e.g., 80%)"
echo "5. Save invoice"
echo "6. View invoice - you should see:"
echo "   - Quantity: '80%' (not '8.00 NOS')"
echo "   - Badge: '✓ CLAIMED' in green"
echo ""
echo "Note: Old invoices created before this update"
echo "will still show the old format."
echo ""
echo "Backend logs: tail -f /tmp/backend.log"
echo "Celery logs: tail -f /tmp/celery.log"
echo ""
