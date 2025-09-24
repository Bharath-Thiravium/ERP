#!/bin/bash

# Production Deployment Script for Modern SAP System
# Run this script on your production server

set -e  # Exit on any error

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/sap-project"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
NGINX_CONFIG="/etc/nginx/sites-available/sap-project"
SYSTEMD_SERVICE="/etc/systemd/system/sap-backend.service"

echo -e "${BLUE}📁 Setting up project directories...${NC}"
sudo mkdir -p $PROJECT_DIR
sudo mkdir -p $PROJECT_DIR/logs
sudo mkdir -p $PROJECT_DIR/media
sudo mkdir -p $PROJECT_DIR/static

echo -e "${BLUE}🔧 Setting up Python environment...${NC}"
cd $BACKEND_DIR
python3 -m venv venv
source venv/bin/activate

echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${BLUE}⚙️ Setting up environment configuration...${NC}"
if [ ! -f .env ]; then
    cp .env.production .env
    echo -e "${YELLOW}⚠️  Please update .env file with your specific configuration${NC}"
fi

echo -e "${BLUE}🗄️ Running database migrations...${NC}"
python manage.py migrate

echo -e "${BLUE}📊 Collecting static files...${NC}"
python manage.py collectstatic --noinput

echo -e "${BLUE}👤 Creating superuser (if needed)...${NC}"
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

echo -e "${BLUE}🏗️ Building frontend...${NC}"
cd $FRONTEND_DIR
npm install
npm run build

echo -e "${BLUE}🌐 Setting up Nginx configuration...${NC}"
sudo tee $NGINX_CONFIG > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend (React build)
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
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static/ {
        alias $PROJECT_DIR/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias $PROJECT_DIR/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
EOF

echo -e "${BLUE}🔗 Enabling Nginx site...${NC}"
sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo -e "${BLUE}🔧 Setting up systemd service...${NC}"
sudo tee $SYSTEMD_SERVICE > /dev/null <<EOF
[Unit]
Description=Modern SAP Backend
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$BACKEND_DIR/venv/bin
ExecStart=$BACKEND_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 sap_backend.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo -e "${BLUE}🔄 Starting services...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable sap-backend
sudo systemctl start sap-backend

echo -e "${BLUE}📝 Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/sap-project > /dev/null <<EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload sap-backend
    endscript
}
EOF

echo -e "${BLUE}🔒 Setting proper permissions...${NC}"
sudo chown -R www-data:www-data $PROJECT_DIR
sudo chmod -R 755 $PROJECT_DIR
sudo chmod -R 775 $PROJECT_DIR/media
sudo chmod -R 775 $PROJECT_DIR/logs

echo -e "${GREEN}✅ Production deployment completed successfully!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "1. Update your domain name in Nginx configuration"
echo -e "2. Set up SSL certificate (Let's Encrypt recommended)"
echo -e "3. Update .env file with your specific settings"
echo -e "4. Configure your firewall to allow HTTP/HTTPS traffic"
echo -e "5. Set up database backups"
echo ""
echo -e "${BLUE}🔍 Service status:${NC}"
sudo systemctl status sap-backend --no-pager
echo ""
echo -e "${BLUE}📊 Application should be running at: http://your-domain.com${NC}"