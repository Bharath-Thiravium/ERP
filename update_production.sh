#!/bin/bash

# SAP-Python Production Update Script
# This script handles updates and deployments to production

set -e

# Configuration
PROJECT_DIR="/var/www/SAP-Python"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKUP_DIR="$BACKEND_DIR/backups"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Function to create pre-deployment backup
create_backup() {
    print_status "Creating pre-deployment backup..."
    $PROJECT_DIR/backup_production.sh
    print_status "Backup completed"
}

# Function to update backend
update_backend() {
    print_status "Updating backend..."
    
    cd $BACKEND_DIR
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Pull latest changes
    git pull origin main
    
    # Install/update dependencies
    pip install -r requirements.txt
    
    # Run migrations
    python manage.py migrate
    
    # Collect static files
    python manage.py collectstatic --noinput
    
    # Run tests (optional)
    if [ "$RUN_TESTS" = "true" ]; then
        print_status "Running backend tests..."
        python manage.py test --keepdb
    fi
    
    print_status "Backend update completed"
}

# Function to update frontend
update_frontend() {
    print_status "Updating frontend..."
    
    cd $FRONTEND_DIR
    
    # Pull latest changes
    git pull origin main
    
    # Install dependencies
    pnpm install
    
    # Build for production
    pnpm build
    
    print_status "Frontend update completed"
}

# Function to restart services
restart_services() {
    print_status "Restarting services..."
    
    # Restart application services
    sudo systemctl restart sap-django
    sudo systemctl restart sap-celery
    sudo systemctl restart sap-celery-beat
    
    # Reload nginx
    sudo systemctl reload nginx
    
    # Wait for services to start
    sleep 10
    
    print_status "Services restarted"
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Wait for services to be ready
    sleep 5
    
    # Check if services are running
    services=("sap-django" "sap-celery" "sap-celery-beat" "nginx" "postgresql" "redis-server")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet $service; then
            print_status "$service is running ✓"
        else
            print_error "$service is not running ✗"
            return 1
        fi
    done
    
    # Check application endpoints
    if curl -f -s https://sap.athenas.co.in/api/health/ > /dev/null; then
        print_status "Application health check passed ✓"
    else
        print_error "Application health check failed ✗"
        return 1
    fi
    
    print_status "All health checks passed"
}

# Function to rollback deployment
rollback_deployment() {
    print_error "Deployment failed. Rolling back..."
    
    # Stop services
    sudo systemctl stop sap-django sap-celery sap-celery-beat
    
    # Restore from backup (implement based on your backup strategy)
    print_warning "Manual rollback required. Please restore from backup."
    
    # Restart services
    sudo systemctl start sap-django sap-celery sap-celery-beat
    
    print_error "Rollback completed. Please investigate the issue."
}

# Function to send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send email notification (configure mail server)
    echo "$message" | mail -s "SAP-Python Deployment $status" admin@athenas.co.in 2>/dev/null || true
    
    # Log notification
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Notification sent: $status - $message" >> $BACKEND_DIR/logs/deployment.log
}

# Main deployment function
deploy() {
    local deploy_type="${1:-full}"
    
    print_info "========================================="
    print_info "  SAP-Python Production Deployment      "
    print_info "  Type: $deploy_type"
    print_info "========================================="
    
    # Create backup
    create_backup
    
    # Update based on type
    case $deploy_type in
        "backend")
            update_backend
            ;;
        "frontend")
            update_frontend
            ;;
        "full")
            update_backend
            update_frontend
            ;;
        *)
            print_error "Invalid deployment type: $deploy_type"
            exit 1
            ;;
    esac
    
    # Restart services
    restart_services
    
    # Run health checks
    if run_health_checks; then
        print_status "Deployment completed successfully!"
        send_notification "SUCCESS" "Deployment completed successfully on $(date)"
    else
        print_error "Health checks failed!"
        if [ "$AUTO_ROLLBACK" = "true" ]; then
            rollback_deployment
        fi
        send_notification "FAILED" "Deployment failed on $(date). Health checks did not pass."
        exit 1
    fi
    
    print_info "========================================="
    print_info "  Deployment Summary                     "
    print_info "========================================="
    print_info "Deployment Type: $deploy_type"
    print_info "Completed At: $(date)"
    print_info "Application URL: https://sap.athenas.co.in"
    print_info "========================================="
}

# Function to show deployment status
show_status() {
    print_info "========================================="
    print_info "  SAP-Python Production Status          "
    print_info "========================================="
    
    # Git status
    cd $PROJECT_DIR
    print_info "Git Branch: $(git branch --show-current)"
    print_info "Last Commit: $(git log -1 --pretty=format:'%h - %s (%cr)')"
    
    # Service status
    services=("sap-django" "sap-celery" "sap-celery-beat" "nginx" "postgresql" "redis-server")
    print_info "Service Status:"
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet $service; then
            print_info "  $service: Running ✓"
        else
            print_info "  $service: Stopped ✗"
        fi
    done
    
    # System resources
    print_info "System Resources:"
    print_info "  CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    print_info "  Memory Usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
    print_info "  Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
    
    print_info "========================================="
}

# Main script execution
case "${1:-help}" in
    "deploy")
        deploy "${2:-full}"
        ;;
    "backend")
        deploy "backend"
        ;;
    "frontend")
        deploy "frontend"
        ;;
    "status")
        show_status
        ;;
    "health")
        run_health_checks
        ;;
    "backup")
        create_backup
        ;;
    "restart")
        restart_services
        run_health_checks
        ;;
    "help"|*)
        echo "SAP-Python Production Update Script"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  deploy [type]  - Deploy application (type: full, backend, frontend)"
        echo "  backend        - Deploy backend only"
        echo "  frontend       - Deploy frontend only"
        echo "  status         - Show current status"
        echo "  health         - Run health checks"
        echo "  backup         - Create backup"
        echo "  restart        - Restart services"
        echo "  help           - Show this help"
        echo ""
        echo "Environment Variables:"
        echo "  RUN_TESTS=true        - Run tests during deployment"
        echo "  AUTO_ROLLBACK=true    - Automatically rollback on failure"
        echo ""
        echo "Examples:"
        echo "  $0 deploy full        - Full deployment"
        echo "  $0 backend            - Backend only deployment"
        echo "  RUN_TESTS=true $0 deploy - Deploy with tests"
        ;;
esac