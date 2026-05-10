#!/bin/bash

# Quick Fix Script for PO Claimed Amounts
# This script fixes Purchase Orders with incorrect claimed percentages after invoice deletion

set -e

echo "=========================================="
echo "PO Claimed Amount Fix Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${RED}Error: Virtual environment not found!${NC}"
    echo "Please run setup_and_run.sh first"
    exit 1
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Check if user wants dry run
echo ""
echo "Choose an option:"
echo "1) Dry run (preview changes without saving)"
echo "2) Fix all POs"
echo "3) Fix specific PO"
echo "4) Fix POs for specific company"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo -e "${YELLOW}Running dry run...${NC}"
        python manage.py fix_po_claimed_amounts --dry-run
        ;;
    2)
        echo -e "${YELLOW}Fixing all POs...${NC}"
        read -p "Are you sure? This will update all POs. (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            python manage.py fix_po_claimed_amounts
            echo -e "${GREEN}✓ All POs fixed successfully!${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    3)
        read -p "Enter PO number (e.g., PIEPL-PO-23-24-0754): " po_number
        echo -e "${YELLOW}Fixing PO: $po_number${NC}"
        python manage.py fix_po_claimed_amounts --po-number "$po_number"
        echo -e "${GREEN}✓ PO fixed successfully!${NC}"
        ;;
    4)
        read -p "Enter company prefix (e.g., PIEPL): " company
        echo -e "${YELLOW}Fixing POs for company: $company${NC}"
        python manage.py fix_po_claimed_amounts --company "$company"
        echo -e "${GREEN}✓ Company POs fixed successfully!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=========================================="
echo "Fix completed!"
echo "==========================================${NC}"
echo ""
echo "The signals are now active. Future invoice/proforma"
echo "deletions will automatically update PO claimed amounts."
echo ""
