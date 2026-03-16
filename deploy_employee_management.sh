#!/bin/bash

# Employee Management Deployment Script
echo "🚀 Deploying Employee Management System..."

# Navigate to backend directory
cd /var/www/SAP-Python/backend

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# Run database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate athens_sustainability

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if needed (optional)
echo "👤 Creating superuser (if needed)..."
python manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

echo "🎉 Employee Management System deployed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the Django server: python manage.py runserver"
echo "2. Access the admin panel: http://localhost:8000/admin/"
echo "3. Test the employee management workflow using the QA checklist"
echo ""
echo "📚 Documentation:"
echo "- Implementation Guide: /var/www/SAP-Python/EMPLOYEE_MANAGEMENT_IMPLEMENTATION.md"
echo "- QA Checklist: /var/www/SAP-Python/EMPLOYEE_MANAGEMENT_QA_CHECKLIST.md"
echo ""
echo "🔗 API Endpoints:"
echo "- Employee Management: /athens-sustainability/employee-management/"
echo "- Access State: /athens-sustainability/employee-management/auth/access_state/"
echo "- Create Employee: /athens-sustainability/employee-management/employees/"