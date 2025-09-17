#!/bin/bash

# Production Server Setup Script
# Run on server: 46.202.160.75

set -e

SERVER_IP="46.202.160.75"
PROJECT_DIR="/var/www/SAP-Python"
DOMAIN="your-domain.com"

echo "=== SAP-Python Production Setup ==="

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx git curl

# Install Node.js and pnpm
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pnpm

# Create project directory
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Clone repository
git clone https://github.com/your-username/SAP-Python.git .

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup PostgreSQL
sudo -u postgres createdb modernsap
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'orange';"

# Create .env file
cat > .env << EOF
DB_NAME=modernsap
DB_USER=postgres
DB_PASSWORD=orange
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DEBUG=False
ALLOWED_HOSTS=$DOMAIN,$SERVER_IP,localhost
CORS_ALLOWED_ORIGINS=https://$DOMAIN
WEBHOOK_SECRET=$(openssl rand -hex 32)
EOF

# Run migrations
python manage.py migrate
python manage.py collectstatic --noinput

# Setup frontend
cd ../frontend
pnpm install
pnpm run build

# Create Gunicorn service
cat > /etc/systemd/system/gunicorn.service << EOF
[Unit]
Description=Gunicorn SAP-Python
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR/backend
Environment="PATH=$PROJECT_DIR/backend/venv/bin"
ExecStart=$PROJECT_DIR/backend/venv/bin/gunicorn --workers 3 --bind unix:$PROJECT_DIR/backend/sap.sock sap_backend.wsgi:application
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Create Nginx config
cat > /etc/nginx/sites-available/sap-python << EOF
server {
    listen 80;
    server_name $DOMAIN $SERVER_IP;

    location /static/ {
        root $PROJECT_DIR/backend;
    }

    location /media/ {
        root $PROJECT_DIR/backend;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:$PROJECT_DIR/backend/sap.sock;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/sap-python /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Set permissions
chown -R www-data:www-data $PROJECT_DIR
chmod +x $PROJECT_DIR/deploy.sh

# Start services
systemctl daemon-reload
systemctl enable gunicorn nginx
systemctl start gunicorn nginx

echo "=== Setup Complete ==="
echo "Server: http://$SERVER_IP"
echo "Webhook: http://$SERVER_IP/api/deploy/webhook/"
echo "Admin: http://$SERVER_IP/admin/"