#!/bin/bash
set -e

# Production Deployment Script for Hostinger VPS

echo "🚀 Deploying SAP Backend to Production..."

# Set production environment
export ENVIRONMENT=production

# Copy production environment file
if [ ! -f .env ]; then
    cp .env.production .env
    echo "✅ Production environment file created"
    echo "⚠️  IMPORTANT: Update .env with your production values!"
else
    echo "⚠️  .env file already exists, make sure it has production values"
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment and install dependencies
echo "📦 Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Install additional production dependencies
pip install gunicorn whitenoise

# Create necessary directories
echo "📁 Creating directories..."
sudo mkdir -p /var/www/sap-backend/static/
sudo mkdir -p /var/www/sap-backend/media/
sudo chown -R $USER:$USER /var/www/sap-backend/

# Run migrations
echo "🗄️  Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Create systemd service file
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/sap-backend.service > /dev/null <<EOF
[Unit]
Description=SAP Backend Django Application
After=network.target

[Service]
Type=notify
User=$USER
Group=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:8000 sap_backend.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable sap-backend
sudo systemctl start sap-backend

echo "✅ Production deployment complete!"
echo "🌐 Backend is running on port 8000"
echo "📊 Check status: sudo systemctl status sap-backend"
echo "📝 View logs: sudo journalctl -u sap-backend -f"
