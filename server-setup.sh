#!/bin/bash

# SAP-Python Server Setup Script for 46.202.160.75
# Run as: ssh root@46.202.160.75 'bash -s' < server-setup.sh

set -e

echo "=== SAP-Python Production Server Setup ==="

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx git curl nodejs npm

# Install pnpm
npm install -g pnpm

# Setup PostgreSQL
sudo -u postgres createdb modernsap 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'orange';" 2>/dev/null || echo "Password already set"

# Create project directory
mkdir -p /var/www/SAP-Python
cd /var/www/SAP-Python

# Clone repository using token
git clone https://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@github.com/Bharath-Thiravium/SAP-Python.git .

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create production .env
cat > .env << EOF
DB_NAME=modernsap
DB_USER=postgres
DB_PASSWORD=orange
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DEBUG=False
ALLOWED_HOSTS=46.202.160.75,localhost
CORS_ALLOWED_ORIGINS=http://46.202.160.75
WEBHOOK_SECRET=$(openssl rand -hex 32)
EOF

# Run migrations
python manage.py migrate
python manage.py collectstatic --noinput

# Create services and dummy data
python scripts/create_services.py
python scripts/create_dummy_data.py

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
WorkingDirectory=/var/www/SAP-Python/backend
Environment="PATH=/var/www/SAP-Python/backend/venv/bin"
ExecStart=/var/www/SAP-Python/backend/venv/bin/gunicorn --workers 3 --bind unix:/var/www/SAP-Python/backend/sap.sock sap_backend.wsgi:application
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Create Nginx config
cat > /etc/nginx/sites-available/sap-python << EOF
server {
    listen 80;
    server_name 46.202.160.75;

    location /static/ {
        root /var/www/SAP-Python/backend;
    }

    location /media/ {
        root /var/www/SAP-Python/backend;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/var/www/SAP-Python/backend/sap.sock;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/sap-python /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Set permissions
chown -R www-data:www-data /var/www/SAP-Python

# Start services
systemctl daemon-reload
systemctl enable gunicorn nginx
systemctl start gunicorn nginx

echo "=== Setup Complete ==="
echo "Backend: http://46.202.160.75/admin/"
echo "API: http://46.202.160.75/api/"
echo "Webhook: http://46.202.160.75/api/deploy/webhook/"