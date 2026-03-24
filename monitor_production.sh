#!/bin/bash

# SAP-Python Production Health Monitor
# This script checks the health of all production services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="sap.athenas.co.in"
BACKEND_DIR="/var/www/SAP-Python/backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SAP-Python Production Health Check   ${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check system services
echo -e "${BLUE}System Services:${NC}"
services=("postgresql" "redis-server" "nginx" "sap-django" "sap-celery" "sap-celery-beat")
for service in "${services[@]}"; do
    if sudo systemctl is-active --quiet $service; then
        print_status "$service is running"
    else
        print_error "$service is not running"
    fi
done

echo ""

# Check application endpoints
echo -e "${BLUE}Application Health:${NC}"

# Check backend health
if curl -f -s http://localhost:8000/health/ > /dev/null; then
    print_status "Backend API is responding"
else
    print_error "Backend API is not responding"
fi

# Check frontend
if curl -f -s https://$DOMAIN > /dev/null; then
    print_status "Frontend is accessible"
else
    print_error "Frontend is not accessible"
fi

# Check SSL certificate
if curl -f -s https://$DOMAIN > /dev/null; then
    print_status "SSL certificate is working"
else
    print_error "SSL certificate issue"
fi

echo ""

# Check database connection
echo -e "${BLUE}Database Status:${NC}"
cd $BACKEND_DIR
source venv/bin/activate
if python -c "import django; django.setup(); from django.db import connection; connection.ensure_connection(); print('Database connection successful')" 2>/dev/null; then
    print_status "Database connection is working"
else
    print_error "Database connection failed"
fi

echo ""

# Check disk space
echo -e "${BLUE}System Resources:${NC}"
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -lt 80 ]; then
    print_status "Disk usage: ${disk_usage}% (OK)"
else
    print_warning "Disk usage: ${disk_usage}% (High)"
fi

# Check memory usage
memory_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
memory_usage_int=${memory_usage%.*}
if [ $memory_usage_int -lt 80 ]; then
    print_status "Memory usage: ${memory_usage}% (OK)"
else
    print_warning "Memory usage: ${memory_usage}% (High)"
fi

echo ""

# Check recent logs for errors
echo -e "${BLUE}Recent Errors:${NC}"
error_count=$(sudo journalctl -u sap-django --since "1 hour ago" | grep -i error | wc -l)
if [ $error_count -eq 0 ]; then
    print_status "No recent errors in Django logs"
else
    print_warning "$error_count errors found in Django logs (last hour)"
fi

echo ""

# Show service status summary
echo -e "${BLUE}Quick Status Summary:${NC}"
echo "- Application URL: https://$DOMAIN"
echo "- Admin Panel: https://$DOMAIN/admin/"
echo "- Last check: $(date)"

echo ""
echo -e "${YELLOW}To view detailed logs:${NC}"
echo "sudo journalctl -u sap-django -f"
echo "sudo journalctl -u sap-celery -f"
echo "sudo tail -f $BACKEND_DIR/logs/*.log"