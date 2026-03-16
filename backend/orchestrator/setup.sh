#!/bin/bash

# Orchestrator Agent Setup Script

echo "Setting up Orchestrator Agent..."

# Navigate to backend
cd /var/www/SAP-Python/backend

# Activate virtual environment
source venv/bin/activate

# Set DEBUG explicitly to avoid .env parsing issues
export DEBUG=False

# Run migrations
echo "Creating database tables..."
python manage.py makemigrations orchestrator
python manage.py migrate orchestrator

# Create superuser if needed (optional)
echo ""
echo "Setup complete!"
echo ""
echo "Available commands:"
echo "  python manage.py analyze_errors              # View top errors"
echo "  python manage.py analyze_errors --top 20     # View top 20 errors"
echo ""
echo "API Endpoints:"
echo "  GET  /api/orchestrator/error_dashboard/      # Error overview"
echo "  GET  /api/orchestrator/error_detail/?hash=X  # Error details"
echo "  POST /api/orchestrator/record_fix/           # Record fix attempt"
echo "  POST /api/orchestrator/mark_fix_status/      # Mark fix success/failure"
echo "  GET  /api/orchestrator/learning_stats/       # Learning statistics"
echo ""
echo "Admin Interface:"
echo "  http://localhost:8000/admin/orchestrator/"
echo ""
