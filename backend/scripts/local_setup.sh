#!/bin/bash

# Local Development Setup Script

echo "🚀 Setting up SAP Backend for Local Development..."

# Copy local environment file
if [ ! -f .env ]; then
    cp .env.local .env
    echo "✅ Local environment file created"
else
    echo "⚠️  .env file already exists, skipping..."
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

# Run migrations
echo "🗄️  Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser if needed
echo "👤 Creating superuser (optional)..."
echo "You can skip this if you already have a superuser"
python manage.py createsuperuser --noinput --email admin@example.com --username admin || echo "Superuser creation skipped"

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Local setup complete!"
echo "🌐 Run 'python manage.py runserver' to start the development server"
echo "🔗 Backend will be available at: http://127.0.0.1:8000/"
