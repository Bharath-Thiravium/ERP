#!/bin/bash

# SAP-Python Custom Ports Runner
# Frontend: 3001, Backend: 8003

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Project paths
BACKEND_DIR="/var/www/SAP-Python/backend"
FRONTEND_DIR="/var/www/SAP-Python/frontend"

# Check directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory not found at $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

# Function to start backend
start_backend() {
    print_status "Starting backend on port 8003..."
    cd "$BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found. Run setup_and_run.sh first."
        exit 1
    fi
    
    source venv/bin/activate
    python manage.py runserver 0.0.0.0:8003 &
    BACKEND_PID=$!
    echo $BACKEND_PID > /tmp/sap_backend_8003.pid
    print_success "Backend started on http://localhost:8003"
}

# Function to start frontend
start_frontend() {
    print_status "Starting frontend on port 3001..."
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        print_error "Node modules not found. Run 'pnpm install' first."
        exit 1
    fi
    
    pnpm dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/sap_frontend_3001.pid
    print_success "Frontend started on http://localhost:3001"
}

# Start services
print_status "Starting SAP-Python with custom ports..."

# Start backend first
start_backend

# Wait for backend to start
sleep 3

# Start frontend
start_frontend

# Display running services
echo ""
print_success "All services started successfully!"
echo ""
print_status "Services running:"
echo "  - Backend (Django): http://localhost:8003"
echo "  - Frontend (React): http://localhost:3001"
echo "  - Admin Panel: http://localhost:8003/admin/"
echo "  - API Documentation: http://localhost:8003/api/schema/swagger-ui/"
echo ""
print_status "To stop services: kill \$(cat /tmp/sap_*_*.pid)"
echo ""
print_status "Press Ctrl+C to stop all services"

# Trap to clean up on exit
trap 'print_status "Stopping services..."; kill $(cat /tmp/sap_*_*.pid 2>/dev/null) 2>/dev/null; rm -f /tmp/sap_*_*.pid; exit 0' INT TERM

# Keep script running
wait