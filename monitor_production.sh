#!/bin/bash

# SAP-Python Production Monitoring Script
# This script monitors the health of all services and sends alerts

set -e

# Configuration
PROJECT_DIR="/var/www/SAP-Python"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_DIR="$BACKEND_DIR/logs"
ALERT_EMAIL="admin@athenas.co.in"
DOMAIN="sap.athenas.co.in"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create monitoring log
MONITOR_LOG="$LOG_DIR/monitoring.log"
mkdir -p $LOG_DIR

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $MONITOR_LOG
}

print_status() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    log_message "$1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
    log_message "WARNING: $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    log_message "ERROR: $1"
}

print_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    log_message "$1"
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" $ALERT_EMAIL 2>/dev/null || true
    log_message "Alert sent: $subject"
}

# Function to check service status
check_service() {
    local service_name="$1"
    if systemctl is-active --quiet $service_name; then
        print_status "$service_name is running ✓"
        return 0
    else
        print_error "$service_name is not running ✗"
        send_alert "Service Down: $service_name" "Service $service_name is not running on $(hostname). Please check immediately."
        return 1
    fi
}

# Function to check URL
check_url() {
    local url="$1"
    local expected_code="${2:-200}"
    local timeout="${3:-10}"
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" || echo "000")
    
    if [ "$response_code" = "$expected_code" ]; then
        print_status "URL $url is responding correctly ($response_code) ✓"
        return 0
    else
        print_error "URL $url returned $response_code (expected $expected_code) ✗"
        send_alert "Website Down: $url" "URL $url is not responding correctly. Response code: $response_code"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local threshold="${1:-85}"
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt "$threshold" ]; then
        print_status "Disk usage is $usage% (threshold: $threshold%) ✓"
        return 0
    else
        print_error "Disk usage is $usage% (threshold: $threshold%) ✗"
        send_alert "High Disk Usage" "Disk usage is at $usage% on $(hostname). Please free up space."
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    local threshold="${1:-85}"
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -lt "$threshold" ]; then
        print_status "Memory usage is $usage% (threshold: $threshold%) ✓"
        return 0
    else
        print_error "Memory usage is $usage% (threshold: $threshold%) ✗"
        send_alert "High Memory Usage" "Memory usage is at $usage% on $(hostname). Please investigate."
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    if sudo -u postgres psql -d modernsap -c "SELECT 1;" > /dev/null 2>&1; then
        print_status "Database connectivity ✓"
        return 0
    else
        print_error "Database connectivity ✗"
        send_alert "Database Connection Failed" "Cannot connect to PostgreSQL database on $(hostname)."
        return 1
    fi
}

# Function to check Redis connectivity
check_redis() {
    if redis-cli ping > /dev/null 2>&1; then
        print_status "Redis connectivity ✓"
        return 0
    else
        print_error "Redis connectivity ✗"
        send_alert "Redis Connection Failed" "Cannot connect to Redis server on $(hostname)."
        return 1
    fi
}

# Function to check SSL certificate
check_ssl_certificate() {
    local domain="$1"
    local days_threshold="${2:-30}"
    
    local expiry_date=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ "$days_until_expiry" -gt "$days_threshold" ]; then
        print_status "SSL certificate expires in $days_until_expiry days ✓"
        return 0
    else
        print_warning "SSL certificate expires in $days_until_expiry days (threshold: $days_threshold days) ⚠"
        send_alert "SSL Certificate Expiring" "SSL certificate for $domain expires in $days_until_expiry days."
        return 1
    fi
}

# Function to check log errors
check_log_errors() {
    local log_file="$1"
    local hours="${2:-1}"
    
    if [ ! -f "$log_file" ]; then
        print_warning "Log file $log_file not found"
        return 1
    fi
    
    local error_count=$(find "$log_file" -mmin -$((hours * 60)) -exec grep -i "error\|critical\|fatal" {} \; 2>/dev/null | wc -l)
    
    if [ "$error_count" -eq 0 ]; then
        print_status "No errors found in $log_file (last $hours hours) ✓"
        return 0
    else
        print_warning "Found $error_count errors in $log_file (last $hours hours) ⚠"
        if [ "$error_count" -gt 10 ]; then
            send_alert "High Error Rate" "Found $error_count errors in $log_file in the last $hours hours."
        fi
        return 1
    fi
}

# Main monitoring function
run_monitoring() {
    print_info "========================================="
    print_info "  SAP-Python Production Health Check    "
    print_info "========================================="
    
    local failed_checks=0
    
    # System services
    print_info "Checking system services..."
    check_service "postgresql" || ((failed_checks++))
    check_service "redis-server" || ((failed_checks++))
    check_service "nginx" || ((failed_checks++))
    
    # Application services
    print_info "Checking application services..."
    check_service "sap-django" || ((failed_checks++))
    check_service "sap-celery" || ((failed_checks++))
    check_service "sap-celery-beat" || ((failed_checks++))
    
    # Database and Redis connectivity
    print_info "Checking database connectivity..."
    check_database || ((failed_checks++))
    check_redis || ((failed_checks++))
    
    # Web endpoints
    print_info "Checking web endpoints..."
    check_url "https://$DOMAIN" 200 || ((failed_checks++))
    check_url "https://$DOMAIN/api/health/" 200 || ((failed_checks++))
    check_url "https://$DOMAIN/admin/" 200 || ((failed_checks++))
    
    # System resources
    print_info "Checking system resources..."
    check_disk_space 85 || ((failed_checks++))
    check_memory 85 || ((failed_checks++))
    
    # SSL certificate
    print_info "Checking SSL certificate..."
    check_ssl_certificate "$DOMAIN" 30 || ((failed_checks++))
    
    # Log files
    print_info "Checking log files for errors..."
    check_log_errors "/var/log/nginx/error.log" 1 || ((failed_checks++))
    check_log_errors "$LOG_DIR/production.log" 1 || ((failed_checks++))
    
    # Summary
    print_info "========================================="
    if [ "$failed_checks" -eq 0 ]; then
        print_status "All health checks passed! ✓"
    else
        print_error "$failed_checks health checks failed! ✗"
        send_alert "Health Check Summary" "$failed_checks health checks failed on $(hostname). Please check the monitoring log."
    fi
    print_info "========================================="
    
    return $failed_checks
}

# Performance monitoring
run_performance_check() {
    print_info "Performance Metrics:"
    print_info "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    print_info "Memory Usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
    print_info "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
    print_info "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    print_info "Active Connections: $(ss -tun | wc -l)"
    
    # Database performance
    if sudo -u postgres psql -d modernsap -c "SELECT count(*) FROM pg_stat_activity;" > /dev/null 2>&1; then
        local db_connections=$(sudo -u postgres psql -d modernsap -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
        print_info "Database Connections: $db_connections"
    fi
    
    # Redis performance
    if redis-cli info stats > /dev/null 2>&1; then
        local redis_memory=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        print_info "Redis Memory Usage: $redis_memory"
    fi
}

# Main execution
case "${1:-monitor}" in
    "monitor")
        run_monitoring
        ;;
    "performance")
        run_performance_check
        ;;
    "full")
        run_monitoring
        run_performance_check
        ;;
    *)
        echo "Usage: $0 [monitor|performance|full]"
        echo "  monitor     - Run health checks (default)"
        echo "  performance - Show performance metrics"
        echo "  full        - Run both health checks and performance metrics"
        exit 1
        ;;
esac