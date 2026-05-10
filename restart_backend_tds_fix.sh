#!/bin/bash

echo "🔄 Restarting backend to apply TDS payment endpoint fix..."

# Kill existing backend processes
echo "Stopping backend..."
lsof -ti:8004 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Start backend
echo "Starting backend..."
cd /var/www/SAP-Python/backend
source venv/bin/activate
nohup python manage.py runserver 0.0.0.0:8004 > ../server.log 2>&1 &

echo "✅ Backend restarted!"
echo "📝 Check logs: tail -f /var/www/SAP-Python/server.log"
echo ""
echo "🧪 Test TDS endpoint:"
echo "   Open invoice → Update Payment → TDS tab → Add TDS Entry"
