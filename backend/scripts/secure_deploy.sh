#!/bin/bash

# Secure Production Deployment Script with Error Handling
# Exit on any error
set -e

# Enable error trapping
trap 'echo "Error occurred at line $LINENO. Exit code: $?" >&2' ERR

echo "🚀 Starting secure production deployment..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate secure password
generate_secure_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Validate environment
if [ -z "$DJANGO_SETTINGS_MODULE" ]; then
    export DJANGO_SETTINGS_MODULE="sap_backend.settings"
fi

# Check required commands
for cmd in python3 pip nginx systemctl; do
    if ! command_exists "$cmd"; then
        echo "❌ Error: $cmd is not installed"
        exit 1
    fi
done

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv || {
        echo "❌ Failed to create virtual environment"
        exit 1
    }
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate || {
    echo "❌ Failed to activate virtual environment"
    exit 1
}

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip || {
    echo "❌ Failed to upgrade pip"
    exit 1
}

# Install requirements
echo "📚 Installing requirements..."
pip install -r requirements.txt || {
    echo "❌ Failed to install requirements"
    exit 1
}

# Run migrations
echo "🗄️ Running database migrations..."
python manage.py migrate || {
    echo "❌ Database migration failed"
    exit 1
}

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput || {
    echo "❌ Failed to collect static files"
    exit 1
}

# Create superuser with secure password (only if not exists)
echo "👤 Creating superuser..."
ADMIN_PASSWORD=$(generate_secure_password)
python manage.py shell << EOF
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', '$ADMIN_PASSWORD')
    print(f"Superuser created with password: $ADMIN_PASSWORD")
    print("IMPORTANT: Save this password securely!")
else:
    print("Superuser already exists")
EOF

# Set proper permissions
echo "🔒 Setting file permissions..."
chmod -R 755 /var/www/sap-backend/ || {
    echo "❌ Failed to set permissions"
    exit 1
}

# Restart services
echo "🔄 Restarting services..."
systemctl restart gunicorn || {
    echo "❌ Failed to restart gunicorn"
    exit 1
}

systemctl restart nginx || {
    echo "❌ Failed to restart nginx"
    exit 1
}

# Verify services are running
echo "✅ Verifying services..."
systemctl is-active --quiet gunicorn || {
    echo "❌ Gunicorn is not running"
    exit 1
}

systemctl is-active --quiet nginx || {
    echo "❌ Nginx is not running"
    exit 1
}

echo "🎉 Deployment completed successfully!"
echo "📝 Admin password saved to: /tmp/admin_password_$(date +%Y%m%d_%H%M%S).txt"
echo "$ADMIN_PASSWORD" > "/tmp/admin_password_$(date +%Y%m%d_%H%M%S).txt"