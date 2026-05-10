#!/bin/bash

# Direct Customer Payment Feature Setup Script
# This script sets up the direct payment feature for SAP-Python

echo "=========================================="
echo "Direct Customer Payment Feature Setup"
echo "=========================================="
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/backend" || exit 1

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations finance
python manage.py migrate finance

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Direct payment feature setup completed successfully!"
    echo ""
    echo "New Features Available:"
    echo "  - Direct customer payments (without invoice)"
    echo "  - Payment purposes: memo, penalty, incentive, complimentary, etc."
    echo "  - TDS support for direct payments"
    echo "  - Customer payment summary"
    echo ""
    echo "API Endpoints:"
    echo "  POST   /api/finance/direct-payments/create/"
    echo "  GET    /api/finance/direct-payments/"
    echo "  GET    /api/finance/direct-payments/<id>/"
    echo "  DELETE /api/finance/direct-payments/<id>/delete/"
    echo "  GET    /api/finance/customers/<id>/payment-summary/"
    echo ""
    echo "Frontend Component:"
    echo "  Location: frontend/src/pages/services/finance/pages/DirectCustomerPayment.tsx"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
