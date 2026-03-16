#!/bin/bash

set -e

echo "🚀 Starting SAP-Python Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Project directory
PROJECT_DIR="/var/www/SAP-Python"
cd "$PROJECT_DIR"

echo -e "${YELLOW}1. Setting up Python environment...${NC}"
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo -e "${YELLOW}2. Setting up environment variables...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${RED}Please edit backend/.env with your production settings${NC}"
    read -p "Press enter after editing .env file..."
fi

echo -e "${YELLOW}3. Running Django setup...${NC}"
python manage.py collectstatic --noinput
python manage.py migrate

echo -e "${YELLOW}4. Building frontend...${NC}"
cd ../frontend
npm install -g pnpm
pnpm install
pnpm build

echo -e "${YELLOW}5. Setting up nginx configuration...${NC}"
sudo cp ../nginx-sap-athenas.conf /etc/nginx/sites-available/sap-athenas
sudo ln -sf /etc/nginx/sites-available/sap-athenas /etc/nginx/sites-enabled/
sudo nginx -t

echo -e "${YELLOW}6. Setting up systemd services...${NC}"
# Create Django service
sudo tee /etc/systemd/system/sap-django.service > /dev/null <<EOF
[Unit]
Description=SAP Django Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/backend/venv/bin
ExecStart=$PROJECT_DIR/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8003 sap_backend.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Create Celery worker service
sudo tee /etc/systemd/system/sap-celery.service > /dev/null <<EOF
[Unit]
Description=SAP Celery Worker
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/backend/venv/bin
ExecStart=$PROJECT_DIR/backend/venv/bin/celery -A sap_backend worker --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Create Celery beat service
sudo tee /etc/systemd/system/sap-celery-beat.service > /dev/null <<EOF
[Unit]
Description=SAP Celery Beat
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/backend/venv/bin
ExecStart=$PROJECT_DIR/backend/venv/bin/celery -A sap_backend beat --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo -e "${YELLOW}7. Starting services...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable sap-django sap-celery sap-celery-beat
sudo systemctl start sap-django sap-celery sap-celery-beat
sudo systemctl restart nginx

echo -e "${YELLOW}8. Checking service status...${NC}"
sudo systemctl status sap-django --no-pager -l
sudo systemctl status nginx --no-pager -l

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}Your application should be available at: https://sap.athenas.co.in${NC}"
echo -e "${YELLOW}Note: Make sure your SSL certificates are properly configured${NC}"

echo -e "\n${YELLOW}Service management commands:${NC}"
echo "sudo systemctl restart sap-django"
echo "sudo systemctl restart sap-celery"
echo "sudo systemctl restart sap-celery-beat"
echo "sudo systemctl restart nginx"
echo "sudo systemctl status sap-django"
echo "sudo journalctl -u sap-django -f"