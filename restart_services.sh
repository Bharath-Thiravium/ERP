#!/bin/bash

# SAP-Python Full Restart Script
# Kills and restarts both frontend and backend services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="/var/www/SAP-Python"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_PORT=8004
FRONTEND_PORT=3000

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SAP-Python Service Restart Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${YELLOW}Checking for processes on port $port ($service_name)...${NC}"
    
    # Find and kill processes
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Found processes: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✓ Killed $service_name processes on port $port${NC}"
    else
        echo -e "${GREEN}✓ No processes found on port $port${NC}"
    fi
}

# Function to kill processes by name pattern
kill_by_pattern() {
    local pattern=$1
    local service_name=$2
    
    echo -e "${YELLOW}Checking for $service_name processes...${NC}"
    
    local pids=$(ps aux | grep -E "$pattern" | grep -v grep | awk '{print $2}' || true)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Found processes: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ Killed $service_name processes${NC}"
    else
        echo -e "${GREEN}✓ No $service_name processes found${NC}"
    fi
}

# Step 1: Stop systemd services if they exist
echo -e "\n${BLUE}Step 1: Stopping systemd services...${NC}"
sudo systemctl stop sap-backend 2>/dev/null && echo -e "${GREEN}✓ Stopped sap-backend service${NC}" || echo -e "${YELLOW}⚠ sap-backend service not running${NC}"
sudo systemctl stop sap-frontend 2>/dev/null && echo -e "${GREEN}✓ Stopped sap-frontend service${NC}" || echo -e "${YELLOW}⚠ sap-frontend service not running${NC}"

# Step 2: Kill backend processes
echo -e "\n${BLUE}Step 2: Killing backend processes...${NC}"
kill_port $BACKEND_PORT "Backend"
kill_by_pattern "uvicorn.*sap_backend" "Uvicorn"
kill_by_pattern "gunicorn.*sap_backend" "Gunicorn"
kill_by_pattern "python.*manage.py.*runserver" "Django runserver"

# Step 3: Kill frontend processes
echo -e "\n${BLUE}Step 3: Killing frontend processes...${NC}"
kill_port $FRONTEND_PORT "Frontend"
kill_by_pattern "node.*vite" "Vite"
kill_by_pattern "pnpm.*dev" "PNPM dev"
kill_by_pattern "npm.*dev" "NPM dev"

# Step 4: Kill Celery workers
echo -e "\n${BLUE}Step 4: Killing Celery workers...${NC}"
kill_by_pattern "celery.*worker" "Celery Worker"
kill_by_pattern "celery.*beat" "Celery Beat"

# Step 5: Clear Python cache
echo -e "\n${BLUE}Step 5: Clearing Python cache...${NC}"
cd "$BACKEND_DIR"
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
echo -e "${GREEN}✓ Python cache cleared${NC}"

# Step 6: Wait for ports to be free
echo -e "\n${BLUE}Step 6: Waiting for ports to be free...${NC}"
sleep 3

# Verify ports are free
if lsof -ti:$BACKEND_PORT >/dev/null 2>&1; then
    echo -e "${RED}✗ Port $BACKEND_PORT is still in use!${NC}"
    exit 1
fi

if lsof -ti:$FRONTEND_PORT >/dev/null 2>&1; then
    echo -e "${RED}✗ Port $FRONTEND_PORT is still in use!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Ports are free${NC}"

# Step 7: Start Backend
echo -e "\n${BLUE}Step 7: Starting Backend (Port $BACKEND_PORT)...${NC}"
cd "$BACKEND_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${RED}✗ Virtual environment not found!${NC}"
    echo -e "${YELLOW}Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi

# Activate virtual environment and start backend
source venv/bin/activate

# Run Django system check first
echo -e "${YELLOW}Running Django system check...${NC}"
if python manage.py check --deploy 2>&1 | tee /tmp/django_check.log | grep -q "ERRORS:"; then
    echo -e "${RED}✗ Django system check failed!${NC}"
    echo -e "${YELLOW}Check the errors above or in /tmp/django_check.log${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "  - Missing migrations: python manage.py migrate"
    echo -e "  - Invalid model fields in serializers"
    echo -e "  - Missing environment variables in .env"
    exit 1
fi
echo -e "${GREEN}✓ Django system check passed${NC}"

# Start using systemd if service exists, otherwise use uvicorn directly
if systemctl list-unit-files | grep -q "sap-backend.service"; then
    sudo systemctl start sap-backend
    echo -e "${GREEN}✓ Backend started via systemd${NC}"
else
    # Start uvicorn in background
    nohup uvicorn sap_backend.asgi:application \
        --host 127.0.0.1 \
        --port $BACKEND_PORT \
        --workers 4 \
        --access-log \
        --log-level info \
        > "$BACKEND_DIR/backend.log" 2>&1 &
    
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started via uvicorn (PID: $BACKEND_PID)${NC}"
fi

sleep 6

# Verify backend is running
if lsof -ti:$BACKEND_PORT >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port $BACKEND_PORT${NC}"
else
    echo -e "${RED}✗ Backend failed to start!${NC}"
    echo -e "${YELLOW}Check logs:${NC}"
    echo -e "  tail -f $BACKEND_DIR/backend.log"
    if [ -f "$BACKEND_DIR/backend.log" ]; then
        echo -e "\n${YELLOW}Last 20 lines of backend.log:${NC}"
        tail -20 "$BACKEND_DIR/backend.log"
    fi
    exit 1
fi

# Step 8: Start Celery Workers
echo -e "\n${BLUE}Step 8: Starting Celery workers...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate

# Start Celery worker
nohup celery -A sap_backend worker --loglevel=info --concurrency=4 \
    > "$BACKEND_DIR/celery_worker.log" 2>&1 &
echo -e "${GREEN}✓ Celery worker started (PID: $!)${NC}"

# Start Celery beat
nohup celery -A sap_backend beat --loglevel=info \
    > "$BACKEND_DIR/celery_beat.log" 2>&1 &
echo -e "${GREEN}✓ Celery beat started (PID: $!)${NC}"

sleep 2

# Step 9: Start Frontend
echo -e "\n${BLUE}Step 9: Starting Frontend (Port $FRONTEND_PORT)...${NC}"
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules not found, installing dependencies...${NC}"
    pnpm install || npm install
fi

# Start frontend in background
if systemctl list-unit-files | grep -q "sap-frontend.service"; then
    sudo systemctl start sap-frontend
    echo -e "${GREEN}✓ Frontend started via systemd${NC}"
else
    nohup pnpm dev --host 0.0.0.0 --port $FRONTEND_PORT \
        > "$FRONTEND_DIR/frontend.log" 2>&1 &
    
    echo -e "${GREEN}✓ Frontend started via pnpm (PID: $!)${NC}"
fi

sleep 5

# Verify frontend is running
if lsof -ti:$FRONTEND_PORT >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on port $FRONTEND_PORT${NC}"
else
    echo -e "${RED}✗ Frontend failed to start!${NC}"
    exit 1
fi

# Step 10: Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All services restarted successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Backend:${NC}  http://localhost:$BACKEND_PORT"
echo -e "${GREEN}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${GREEN}API Docs:${NC} http://localhost:$BACKEND_PORT/api/schema/swagger-ui/"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend:  tail -f $BACKEND_DIR/backend.log"
echo -e "  Frontend: tail -f $FRONTEND_DIR/frontend.log"
echo -e "  Celery:   tail -f $BACKEND_DIR/celery_worker.log"
echo ""
echo -e "${BLUE}========================================${NC}"
