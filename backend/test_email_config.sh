#!/bin/bash

# Test Email Configuration Script
# This script helps test email sending functionality

echo "=========================================="
echo "SAP Email Configuration Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if virtual environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo -e "${YELLOW}⚠️  Virtual environment not activated${NC}"
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Get recipient email
read -p "Enter recipient email address: " RECIPIENT_EMAIL

if [[ -z "$RECIPIENT_EMAIL" ]]; then
    echo -e "${RED}❌ Email address is required${NC}"
    exit 1
fi

echo ""
echo "Select test type:"
echo "1) Simple test email"
echo "2) Invoice email (requires invoice ID)"
echo "3) Quotation email (requires quotation ID)"
echo "4) Receipt email (requires payment ID)"
echo ""
read -p "Enter choice (1-4): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo -e "${YELLOW}📧 Sending simple test email to $RECIPIENT_EMAIL...${NC}"
        python manage.py test_email --type=simple --to="$RECIPIENT_EMAIL"
        ;;
    2)
        read -p "Enter invoice ID: " DOC_ID
        echo ""
        echo -e "${YELLOW}📧 Sending invoice email to $RECIPIENT_EMAIL...${NC}"
        python manage.py test_email --type=invoice --to="$RECIPIENT_EMAIL" --id="$DOC_ID"
        ;;
    3)
        read -p "Enter quotation ID: " DOC_ID
        echo ""
        echo -e "${YELLOW}📧 Sending quotation email to $RECIPIENT_EMAIL...${NC}"
        python manage.py test_email --type=quotation --to="$RECIPIENT_EMAIL" --id="$DOC_ID"
        ;;
    4)
        read -p "Enter payment ID: " DOC_ID
        echo ""
        echo -e "${YELLOW}📧 Sending receipt email to $RECIPIENT_EMAIL...${NC}"
        python manage.py test_email --type=receipt --to="$RECIPIENT_EMAIL" --id="$DOC_ID"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Test completed!"
echo "=========================================="
