#!/bin/bash

# Stop all SAP-Python services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_status "Stopping SAP-Python services..."

# Stop services using PID files
for service in backend frontend celery beat; do
    PID_FILE="/tmp/sap_${service}.pid"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            print_status "Stopping $service (PID: $PID)..."
            kill "$PID"
            rm -f "$PID_FILE"
        else
            print_status "$service was not running"
            rm -f "$PID_FILE"
        fi
    fi
done

# Kill any remaining processes
print_status "Cleaning up any remaining processes..."

# Kill Django runserver
pkill -f "python.*manage.py.*runserver" 2>/dev/null || true

# Kill Celery processes
pkill -f "celery.*worker" 2>/dev/null || true
pkill -f "celery.*beat" 2>/dev/null || true

# Kill Node/React processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill Django processes on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

print_success "All SAP-Python services stopped!"