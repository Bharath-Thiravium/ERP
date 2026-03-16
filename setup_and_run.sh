#!/bin/bash

# SAP-Python Project Setup and Run Script
# This script sets up the environment, imports database, and runs both frontend and backend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Note: Some operations require sudo, but the script itself should not be run as root

# Project paths
PROJECT_ROOT="/var/www/SAP-Python"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DATABASE_BACKUP_PATH="/home/$(whoami)/Downloads/sap_database_backup.sql"

# Check if we're in the right directory
if [ ! -d "$PROJECT_ROOT" ]; then
    print_error "Project directory not found at $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

print_status "Starting SAP-Python project setup..."

# 1. Setup Backend Environment
print_status "Setting up backend environment..."

cd "$BACKEND_DIR"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file from example..."
    cp .env.example .env
    print_warning "Please update the .env file with your actual database credentials"
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 2. Database Setup
print_status "Setting up database..."

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    print_status "Starting PostgreSQL service..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Create database if it doesn't exist
print_status "Creating database 'modernsap' if it doesn't exist..."
sudo -u postgres psql -c "CREATE DATABASE modernsap;" 2>/dev/null || print_warning "Database 'modernsap' already exists"

# Import database backup if file exists
if [ -f "$DATABASE_BACKUP_PATH" ]; then
    print_status "Importing database backup from $DATABASE_BACKUP_PATH..."
    
    # Check if backup is compressed
    if [[ "$DATABASE_BACKUP_PATH" == *.gz ]]; then
        print_status "Decompressing and importing gzipped backup..."
        gunzip -c "$DATABASE_BACKUP_PATH" | sudo -u postgres psql modernsap
    else
        print_status "Importing SQL backup..."
        sudo -u postgres psql modernsap < "$DATABASE_BACKUP_PATH"
    fi
    
    print_success "Database backup imported successfully!"
else
    print_warning "Database backup file not found at $DATABASE_BACKUP_PATH"
    print_status "Running Django migrations instead..."
    python manage.py makemigrations
    python manage.py migrate
fi

# Create superuser if needed (optional)
print_status "You may want to create a superuser account..."
echo "Run 'python manage.py createsuperuser' if needed"

# 3. Setup Frontend Environment
print_status "Setting up frontend environment..."

cd "$FRONTEND_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if pnpm is installed, if not install it
if ! command -v pnpm &> /dev/null; then
    print_status "Installing pnpm..."
    npm install -g pnpm
fi

# Install frontend dependencies
print_status "Installing frontend dependencies..."
pnpm install

# 4. Setup Redis (required for Celery and Channels)
print_status "Setting up Redis..."

if ! command -v redis-server &> /dev/null; then
    print_status "Installing Redis..."
    sudo apt update
    sudo apt install -y redis-server
fi

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

print_success "Setup completed successfully!"

# 5. Start all services
print_status "Starting all services..."

# Function to run services in background
run_backend() {
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    print_status "Starting Django development server on port 8000..."
    python manage.py runserver 0.0.0.0:8000 &
    BACKEND_PID=$!
    echo $BACKEND_PID > /tmp/sap_backend.pid
    
    print_status "Starting Celery worker..."
    celery -A sap_backend worker --loglevel=info &
    CELERY_PID=$!
    echo $CELERY_PID > /tmp/sap_celery.pid
    
    print_status "Starting Celery beat scheduler..."
    celery -A sap_backend beat --loglevel=info &
    BEAT_PID=$!
    echo $BEAT_PID > /tmp/sap_beat.pid
}

run_frontend() {
    cd "$FRONTEND_DIR"
    
    print_status "Starting React development server on port 3000..."
    pnpm dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/sap_frontend.pid
}

# Start backend services
run_backend

# Wait a moment for backend to start
sleep 3

# Start frontend
run_frontend

# Display running services
print_success "All services started successfully!"
echo ""
print_status "Services running:"
echo "  - Backend (Django): http://localhost:8000"
echo "  - Frontend (React): http://localhost:3000"
echo "  - Admin Panel: http://localhost:8000/admin/"
echo "  - API Documentation: http://localhost:8000/api/schema/swagger-ui/"
echo ""
print_status "To stop all services, run: ./stop_services.sh"
echo ""
print_warning "Keep this terminal open to see logs, or press Ctrl+C to stop all services"

# Wait for user input or signals
trap 'print_status "Stopping all services..."; kill $(cat /tmp/sap_*.pid 2>/dev/null) 2>/dev/null; rm -f /tmp/sap_*.pid; exit 0' INT TERM

# Keep script running to show logs
wait