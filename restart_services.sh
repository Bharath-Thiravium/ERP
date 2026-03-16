#!/bin/bash

# SAP-Python Services Restart Script
# This script restarts both frontend and backend services

echo "🔄 Restarting SAP-Python Services..."

# Stop existing services
echo "⏹️  Stopping existing services..."
pkill -f "python.*manage.py.*runserver" 2>/dev/null || true
pkill -f "npm.*run.*dev" 2>/dev/null || true
pkill -f "pnpm.*dev" 2>/dev/null || true
pkill -f "celery.*worker" 2>/dev/null || true
pkill -f "celery.*beat" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 3

# Start backend services
echo "🚀 Starting backend services..."
cd backend
source venv/bin/activate

# Start Django development server in background
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!
echo "✅ Django server started (PID: $DJANGO_PID)"

# Start Celery worker in background
celery -A sap_backend worker --loglevel=info &
CELERY_WORKER_PID=$!
echo "✅ Celery worker started (PID: $CELERY_WORKER_PID)"

# Start Celery beat scheduler in background
celery -A sap_backend beat --loglevel=info &
CELERY_BEAT_PID=$!
echo "✅ Celery beat started (PID: $CELERY_BEAT_PID)"

# Start frontend services
echo "🎨 Starting frontend services..."
cd ../frontend

# Start React development server in background
pnpm dev &
REACT_PID=$!
echo "✅ React server started (PID: $REACT_PID)"

# Save PIDs for later reference
echo "📝 Service PIDs:"
echo "Django: $DJANGO_PID"
echo "Celery Worker: $CELERY_WORKER_PID"
echo "Celery Beat: $CELERY_BEAT_PID"
echo "React: $REACT_PID"

echo ""
echo "🎉 All services restarted successfully!"
echo ""
echo "📍 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   Admin:    http://localhost:8000/admin/"
echo ""
echo "⚠️  To stop all services, run: ./stop_services.sh"
echo ""
echo "🔍 Monitor logs with:"
echo "   Backend:  tail -f backend/logs/django.log"
echo "   Frontend: Check the terminal where pnpm dev is running"