#!/bin/bash

# =============================================================================
# SAP BACKEND - PRODUCTION STARTUP SCRIPT
# Replaces Daphne with Uvicorn for better performance
# =============================================================================

echo "🚀 Starting SAP Backend Production Server..."
echo "📊 Using Uvicorn with Gunicorn for high performance"
echo "⚡ WebSocket support enabled for real-time features"

# Kill any existing processes
echo "🔄 Stopping existing processes..."
pkill -f "uvicorn"
pkill -f "daphne"
pkill -f "gunicorn"

# Wait a moment for processes to stop
sleep 2

# Start production server with Uvicorn workers
echo "🎯 Starting production server..."

gunicorn sap_backend.asgi:application \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-connections 1000 \
    --max-requests 10000 \
    --max-requests-jitter 1000 \
    --timeout 120 \
    --keepalive 5 \
    --preload \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --worker-class uvicorn.workers.UvicornWorker

echo "✅ SAP Backend started successfully!"
echo "🌐 Server running on: http://0.0.0.0:8000"