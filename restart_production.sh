#!/bin/bash

# SAP-Python Production Restart Script
# This script restarts the production services after configuration changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SAP-Python Production Restart        ${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as correct user
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_status "Restarting SAP-Python production services..."

# Navigate to backend directory
cd /var/www/SAP-Python/backend

# Activate virtual environment and collect static files
print_status "Collecting static files..."
source venv/bin/activate
python manage.py collectstatic --noinput

# Restart Django service
print_status "Restarting Django service..."
sudo systemctl restart sap-django

# Restart Celery services
print_status "Restarting Celery services..."
sudo systemctl restart sap-celery sap-celery-beat

# Restart Nginx
print_status "Restarting Nginx..."
sudo systemctl restart nginx

# Check service status
print_status "Checking service status..."
echo -e "${BLUE}Django Service:${NC}"
sudo systemctl status sap-django --no-pager -l

echo -e "${BLUE}Celery Worker:${NC}"
sudo systemctl status sap-celery --no-pager -l

echo -e "${BLUE}Celery Beat:${NC}"
sudo systemctl status sap-celery-beat --no-pager -l

echo -e "${BLUE}Nginx:${NC}"
sudo systemctl status nginx --no-pager -l

print_status "Production services restarted successfully!"
print_status "Application should be available at: https://sap.athenas.co.in"

# Test the API endpoint
print_status "Testing API endpoint..."
curl -s -o /dev/null -w "%{http_code}" https://sap.athenas.co.in/api/athens-sust/employee-management/employees/ || print_warning "API test failed - check logs"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Restart Complete!                     ${NC}"
echo -e "${GREEN}========================================${NC}"