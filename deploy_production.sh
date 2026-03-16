#!/bin/bash

# SAP-Python Production Deployment Script
# This script sets up the entire application for production environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/SAP-Python"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
NGINX_CONFIG="/etc/nginx/sites-available/sap-python"
SYSTEMD_DIR="/etc/systemd/system"
LOG_DIR="$BACKEND_DIR/logs"
BACKUP_DIR="$BACKEND_DIR/backups"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SAP-Python Production Deployment     ${NC}"
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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if we have sudo access
if ! sudo -n true 2>/dev/null; then
    print_error "This script requires sudo access"
    exit 1
fi

print_status "Starting production deployment..."

# 1. Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install required system packages
print_status "Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    supervisor \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    wget \
    unzip \
    build-essential \
    libpq-dev \
    python3-dev \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zlib1g-dev \
    nodejs \
    npm

# 3. Install Node.js 18+ and pnpm
print_status "Installing Node.js and pnpm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm

# 4. Setup PostgreSQL
print_status "Configuring PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user if they don't exist
sudo -u postgres psql -c "CREATE DATABASE modernsap;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'your_secure_db_password_here';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE modernsap TO postgres;" 2>/dev/null || true

# 5. Setup Redis
print_status "Configuring Redis..."
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configure Redis for production
sudo tee /etc/redis/redis.conf.d/production.conf > /dev/null <<EOF
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF

sudo systemctl restart redis-server

# 6. Create necessary directories
print_status "Creating project directories..."
sudo mkdir -p $LOG_DIR $BACKUP_DIR
sudo chown -R $USER:$USER $PROJECT_DIR
chmod 755 $LOG_DIR $BACKUP_DIR

# 7. Setup Python virtual environment
print_status "Setting up Python virtual environment..."
cd $BACKEND_DIR
python3 -m venv venv
source venv/bin/activate

# 8. Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

# 9. Setup environment file
print_status "Configuring environment variables..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp $BACKEND_DIR/.env.production $BACKEND_DIR/.env
    print_warning "Please edit $BACKEND_DIR/.env with your production settings"
fi

# 10. Run Django setup
print_status "Setting up Django application..."
python manage.py collectstatic --noinput
python manage.py migrate

# 11. Setup frontend
print_status "Setting up frontend..."
cd $FRONTEND_DIR
pnpm install
pnpm build

# 12. Configure Nginx
print_status "Configuring Nginx..."
sudo tee $NGINX_CONFIG > /dev/null <<EOF
server {
    listen 80;
    server_name sap.athenas.co.in www.sap.athenas.co.in;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;
    
    # Frontend (React)
    location / {
        root $FRONTEND_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Admin panel
    location /admin/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static/ {
        alias $BACKEND_DIR/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias $BACKEND_DIR/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Health check
    location /health/ {
        proxy_pass http://127.0.0.1:8000;
        access_log off;
    }
}
EOF

# Enable the site
sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 13. Setup SSL with Let's Encrypt
print_status "Setting up SSL certificate..."
sudo certbot --nginx -d sap.athenas.co.in -d www.sap.athenas.co.in --non-interactive --agree-tos --email admin@athenas.co.in || print_warning "SSL setup failed - please run manually"

# 14. Create systemd services
print_status "Creating systemd services..."

# Django/Gunicorn service
sudo tee $SYSTEMD_DIR/sap-django.service > /dev/null <<EOF
[Unit]
Description=SAP-Python Django Application
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=$USER
Group=$USER
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$BACKEND_DIR/venv/bin
ExecStart=$BACKEND_DIR/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:8000 --timeout 120 --max-requests 1000 --max-requests-jitter 100 sap_backend.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sap-django

[Install]
WantedBy=multi-user.target
EOF

# Celery Worker service
sudo tee $SYSTEMD_DIR/sap-celery.service > /dev/null <<EOF
[Unit]
Description=SAP-Python Celery Worker
After=network.target redis.service postgresql.service

[Service]
Type=forking
User=$USER
Group=$USER
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$BACKEND_DIR/venv/bin
ExecStart=$BACKEND_DIR/venv/bin/celery -A sap_backend worker --loglevel=info --concurrency=4 --detach
ExecStop=$BACKEND_DIR/venv/bin/celery -A sap_backend control shutdown
ExecReload=$BACKEND_DIR/venv/bin/celery -A sap_backend control reload
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Celery Beat service
sudo tee $SYSTEMD_DIR/sap-celery-beat.service > /dev/null <<EOF
[Unit]
Description=SAP-Python Celery Beat Scheduler
After=network.target redis.service postgresql.service

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$BACKEND_DIR/venv/bin
ExecStart=$BACKEND_DIR/venv/bin/celery -A sap_backend beat --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 15. Enable and start services
print_status "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable sap-django sap-celery sap-celery-beat
sudo systemctl start sap-django sap-celery sap-celery-beat

# 16. Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/sap-python > /dev/null <<EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload sap-django
    endscript
}
EOF

# 17. Setup backup cron job
print_status "Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_DIR/backup_production.sh") | crontab -

# 18. Setup firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443

# 19. Final security hardening
print_status "Applying security hardening..."
# Disable server tokens
sudo sed -i 's/# server_tokens off;/server_tokens off;/g' /etc/nginx/nginx.conf

# Set proper file permissions
find $PROJECT_DIR -type f -name "*.py" -exec chmod 644 {} \;
find $PROJECT_DIR -type f -name "*.sh" -exec chmod 755 {} \;
chmod 600 $BACKEND_DIR/.env

# 20. Health check
print_status "Running health checks..."
sleep 10

# Check services
services=("postgresql" "redis-server" "nginx" "sap-django" "sap-celery" "sap-celery-beat")
for service in "${services[@]}"; do
    if sudo systemctl is-active --quiet $service; then
        print_status "$service is running ✓"
    else
        print_error "$service is not running ✗"
    fi
done

# Check application
if curl -f -s http://localhost:8000/health/ > /dev/null; then
    print_status "Application health check passed ✓"
else
    print_warning "Application health check failed - check logs"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Production Deployment Complete!      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Edit $BACKEND_DIR/.env with your production settings"
echo "2. Create a Django superuser: cd $BACKEND_DIR && source venv/bin/activate && python manage.py createsuperuser"
echo "3. Import your database backup if needed"
echo "4. Test the application at https://sap.athenas.co.in"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "- Check logs: sudo journalctl -u sap-django -f"
echo "- Restart services: sudo systemctl restart sap-django sap-celery sap-celery-beat"
echo "- Check status: sudo systemctl status sap-django"
echo "- Backup database: $PROJECT_DIR/backup_production.sh"
echo ""
echo -e "${YELLOW}Important:${NC} Please update your DNS records to point to this server"