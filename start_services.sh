#!/bin/bash

# Simple script to start both frontend and backend

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting SAP-Python services...${NC}"

# Start backend
cd /var/www/SAP-Python/SAP-Python/backend

# Create .env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}Created .env file${NC}"
fi

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}Created virtual environment${NC}"
fi

# Activate virtual environment and start backend
source venv/bin/activate

echo -e "${BLUE}Starting Django backend on port 8003...${NC}"
python manage.py runserver 0.0.0.0:8003 &
BACKEND_PID=$!

# Start frontend
cd /var/www/SAP-Python/SAP-Python/frontend

echo -e "${BLUE}Starting React frontend on port 3001...${NC}"
pnpm dev --port 3001 &
FRONTEND_PID=$!

echo -e "${GREEN}Services started successfully!${NC}"
echo ""
echo "Access your application:"
echo "  - Frontend: http://localhost:3001"
echo "  - Backend API: http://localhost:8003"
echo "  - Admin Panel: http://localhost:8003/admin/"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM

wait