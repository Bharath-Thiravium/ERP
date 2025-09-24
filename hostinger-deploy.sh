#!/bin/bash

# Hostinger Deployment Script for SAP System
set -e

echo "🚀 Starting Hostinger deployment..."

# Navigate to project directory
cd "/home/athenas/sap project"

# Backend setup
echo "📦 Setting up backend..."
cd backend

# Copy server environment file
cp .env.server .env

# Install Python dependencies
pip3 install -r requirements.txt

# Collect static files
python3 manage.py collectstatic --noinput

# Run migrations
python3 manage.py migrate

# Create superuser if needed (optional)
echo "Creating superuser (skip if already exists)..."
python3 manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

# Start Django server on all interfaces
echo "🌐 Starting Django server on 0.0.0.0:8000..."
python3 manage.py runserver 0.0.0.0:8000 &

# Store the PID
echo $! > django.pid

echo "✅ Backend deployed successfully!"
echo "🔗 Access your application at: http://46.202.160.75:8000"
echo "🔗 Admin panel at: http://46.202.160.75:8000/admin"
echo ""
echo "To stop the server: kill \$(cat django.pid)"