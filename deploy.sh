#!/bin/bash

# SAP-Python Auto-Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-local}
PROJECT_DIR="/path/to/SAP-Python"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_FILE="/var/log/sap-deployment.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

backup_database() {
    log "Creating database backup..."
    pg_dump -U postgres modernsap > "/tmp/modernsap_backup_$(date +%Y%m%d_%H%M%S).sql" || error_exit "Database backup failed"
}

deploy_backend() {
    log "Deploying backend..."
    cd "$BACKEND_DIR"
    
    # Activate virtual environment
    source venv/bin/activate || error_exit "Failed to activate virtual environment"
    
    # Install dependencies
    pip install -r requirements.txt || error_exit "Failed to install Python dependencies"
    
    # Run migrations
    python manage.py migrate || error_exit "Database migration failed"
    
    # Collect static files
    python manage.py collectstatic --noinput || error_exit "Static file collection failed"
    
    # Run tests
    if [ "$ENVIRONMENT" != "local" ]; then
        python manage.py test || error_exit "Backend tests failed"
    fi
}

deploy_frontend() {
    log "Deploying frontend..."
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    pnpm install || error_exit "Failed to install frontend dependencies"
    
    # Build production bundle
    pnpm run build || error_exit "Frontend build failed"
    
    # Run tests
    if [ "$ENVIRONMENT" != "local" ]; then
        pnpm run test || error_exit "Frontend tests failed"
    fi
}

restart_services() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Restarting production services..."
        sudo systemctl restart gunicorn || error_exit "Failed to restart Gunicorn"
        sudo systemctl restart nginx || error_exit "Failed to restart Nginx"
        sudo systemctl restart redis || error_exit "Failed to restart Redis"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        log "Restarting staging services..."
        pm2 restart sap-backend || error_exit "Failed to restart backend"
        pm2 restart sap-frontend || error_exit "Failed to restart frontend"
    fi
}

health_check() {
    log "Performing health check..."
    
    # Check backend
    if ! curl -f http://localhost:8000/api/health/ > /dev/null 2>&1; then
        error_exit "Backend health check failed"
    fi
    
    # Check frontend
    if [ "$ENVIRONMENT" != "local" ]; then
        if ! curl -f http://localhost:3000/ > /dev/null 2>&1; then
            error_exit "Frontend health check failed"
        fi
    fi
    
    log "Health check passed"
}

rollback() {
    log "Rolling back deployment..."
    cd "$PROJECT_DIR"
    
    # Get previous commit
    PREVIOUS_COMMIT=$(git log --oneline -2 | tail -1 | cut -d' ' -f1)
    
    if [ -n "$PREVIOUS_COMMIT" ]; then
        git reset --hard "$PREVIOUS_COMMIT"
        deploy_backend
        deploy_frontend
        restart_services
        log "Rollback to $PREVIOUS_COMMIT completed"
    else
        error_exit "No previous commit found for rollback"
    fi
}

main() {
    log "Starting deployment for environment: $ENVIRONMENT"
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Pull latest changes
    log "Pulling latest changes..."
    git pull origin main || error_exit "Git pull failed"
    
    # Backup database in production
    if [ "$ENVIRONMENT" = "production" ]; then
        backup_database
    fi
    
    # Deploy components
    deploy_backend
    deploy_frontend
    
    # Restart services
    restart_services
    
    # Health check
    health_check
    
    log "Deployment completed successfully"
}

# Trap errors and attempt rollback
trap 'rollback' ERR

# Run main deployment
main "$@"