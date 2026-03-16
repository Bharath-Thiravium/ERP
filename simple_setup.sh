#!/bin/bash

# Simplified SAP-Python Setup Script

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

PROJECT_ROOT="/var/www/SAP-Python/SAP-Python"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

cd "$PROJECT_ROOT"

print_status "Starting simplified SAP-Python setup..."

# 1. Backend Setup
print_status "Setting up backend..."
cd "$BACKEND_DIR"

# Create .env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Created .env file"
fi

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Created virtual environment"
fi

# Activate virtual environment
source venv/bin/activate

# Install core dependencies first
print_status "Installing core Django dependencies..."
pip install --upgrade pip
pip install Django==4.2.16
pip install djangorestframework
pip install django-cors-headers
pip install psycopg2-binary
pip install python-decouple
pip install redis
pip install celery
pip install channels
pip install drf-spectacular

# Install remaining dependencies without strict versions
print_status "Installing additional dependencies..."
pip install Pillow reportlab openpyxl pandas numpy requests cryptography
pip install gunicorn uvicorn whitenoise django-extensions
pip install matplotlib seaborn scikit-learn
pip install setuptools psutil pyotp

print_success "Backend dependencies installed!"

# 2. Database migrations
print_status "Running database migrations..."
python manage.py makemigrations --noinput || true
python manage.py migrate --noinput || true

# 3. Frontend Setup
print_status "Setting up frontend..."
cd "$FRONTEND_DIR"

# Install pnpm if not available
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi

# Install frontend dependencies
pnpm install

print_success "Frontend dependencies installed!"

# 4. Start services
print_status "Starting services..."

# Start Redis if not running
sudo systemctl start redis-server 2>/dev/null || true

# Start backend
cd "$BACKEND_DIR"
source venv/bin/activate

print_status "Starting Django server on port 8000..."
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# Start frontend
cd "$FRONTEND_DIR"
print_status "Starting React server on port 3000..."
pnpm dev &
FRONTEND_PID=$!

print_success "Services started successfully!"
echo ""
print_status "Access your application:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8000"
echo "  - Admin Panel: http://localhost:8000/admin/"
echo ""
print_warning "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'print_status "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM

wait