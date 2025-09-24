#!/bin/bash

echo "🔧 Fixing Hostinger server deployment..."

# Navigate to project directory
cd "/home/athenas/sap project"

# 1. Fix backend environment
echo "📝 Setting up backend environment..."
cd backend

# Create production environment file
cat > .env << EOF
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=)zu@zd6s6%5et@c4xt3h\$fgt541\$bgi4-xvhur!s636a\$s_d4s

# Database Configuration
DB_NAME=modernsap
DB_USER=postgres
DB_PASSWORD=orange
DB_HOST=localhost
DB_PORT=5432

# Security Settings
ALLOWED_HOSTS=46.202.160.75,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://46.202.160.75,http://localhost:3000

# Static and Media files
STATIC_ROOT=/var/www/sap-project/backend/staticfiles
MEDIA_ROOT=/var/www/sap-project/backend/media

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@example.com
EOF

# 2. Install dependencies and setup Django
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# 3. Create necessary directories
echo "📁 Creating directories..."
sudo mkdir -p /var/www/sap-project/backend/staticfiles
sudo mkdir -p /var/www/sap-project/backend/media
sudo mkdir -p /var/www/sap-project/frontend/dist

# Set permissions
sudo chown -R $USER:$USER /var/www/sap-project/

# 4. Collect static files
echo "🎨 Collecting static files..."
python3 manage.py collectstatic --noinput

# 5. Run migrations
echo "🗄️ Running database migrations..."
python3 manage.py migrate

# 6. Create superuser
echo "👤 Creating superuser..."
python3 manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('✅ Superuser created: admin/admin123')
else:
    print('ℹ️ Superuser already exists')
"

# 7. Build frontend
echo "🏗️ Building frontend..."
cd ../frontend

# Install frontend dependencies
npm install

# Build for production
npm run build

# Copy build to nginx directory
sudo cp -r dist/* /var/www/sap-project/frontend/dist/

# 8. Start Django server
echo "🚀 Starting Django server..."
cd ../backend

# Kill any existing Django processes
pkill -f "python3 manage.py runserver" || true

# Start Django server in background
nohup python3 manage.py runserver 0.0.0.0:8000 > django.log 2>&1 &
echo $! > django.pid

# 9. Restart Nginx
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo ""
echo "✅ Server fix completed!"
echo "🌐 Your application should now be accessible at: http://46.202.160.75"
echo "🔗 Admin panel: http://46.202.160.75/admin (admin/admin123)"
echo "📊 API endpoints: http://46.202.160.75/api/"
echo ""
echo "📋 To check Django logs: tail -f /home/athenas/sap\ project/backend/django.log"
echo "🛑 To stop Django: kill \$(cat /home/athenas/sap\ project/backend/django.pid)"