#!/bin/bash

# Template Fix and Validation Script
# Fixes calc() CSS issues in all document templates

set -e

echo "=============================================="
echo "  Document Template Fix & Validation"
echo "=============================================="
echo ""

BACKEND_DIR="/var/www/SAP-Python/backend"
TEMPLATES_DIR="$BACKEND_DIR/finance/templates"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
fixed_count=0
checked_count=0

echo "Checking all document templates..."
echo ""

# Check and fix function
check_and_fix_template() {
    local template_file=$1
    local template_name=$2
    
    checked_count=$((checked_count + 1))
    
    if [ -f "$template_file" ]; then
        if grep -q "calc(100% + 24mm)" "$template_file"; then
            echo -e "${YELLOW}[FIX]${NC} $template_name - Found calc() issue"
            sed -i 's/width: calc(100% + 24mm);/width: 100%;/g' "$template_file"
            fixed_count=$((fixed_count + 1))
            echo -e "${GREEN}      ✓ Fixed${NC}"
        else
            echo -e "${GREEN}[OK]${NC}  $template_name"
        fi
    else
        echo -e "${RED}[MISS]${NC} $template_name - File not found"
    fi
}

# Invoice Templates
echo "--- Invoice Templates ---"
check_and_fix_template "$TEMPLATES_DIR/invoice_templates/AS/invoice.html" "Invoice AS"
check_and_fix_template "$TEMPLATES_DIR/invoice_templates/BKGE/invoice.html" "Invoice BKGE"
check_and_fix_template "$TEMPLATES_DIR/invoice_templates/TC/invoice.html" "Invoice TC"
echo ""

# Quotation Templates
echo "--- Quotation Templates ---"
check_and_fix_template "$TEMPLATES_DIR/quotation_templates/AS/quotation.html" "Quotation AS"
check_and_fix_template "$TEMPLATES_DIR/quotation_templates/BKGE/quotation.html" "Quotation BKGE"
check_and_fix_template "$TEMPLATES_DIR/quotation_templates/TC/quotation.html" "Quotation TC"
echo ""

# Purchase Order Templates
echo "--- Purchase Order Templates ---"
check_and_fix_template "$TEMPLATES_DIR/po_templates/AS/purchase_order.html" "PO AS"
check_and_fix_template "$TEMPLATES_DIR/po_templates/BKGE/purchase_order.html" "PO BKGE"
check_and_fix_template "$TEMPLATES_DIR/po_templates/TC/purchase_order.html" "PO TC"
echo ""

# Proforma Templates
echo "--- Proforma Invoice Templates ---"
check_and_fix_template "$TEMPLATES_DIR/proforma_templates/AS/proforma_invoice.html" "Proforma AS"
check_and_fix_template "$TEMPLATES_DIR/proforma_templates/BKGE/proforma_invoice.html" "Proforma BKGE"
check_and_fix_template "$TEMPLATES_DIR/proforma_templates/TC/proforma_invoice.html" "Proforma TC"
echo ""

echo "=============================================="
echo "Summary:"
echo "  Templates checked: $checked_count"
echo "  Templates fixed: $fixed_count"
echo "=============================================="

if [ $fixed_count -gt 0 ]; then
    echo -e "${GREEN}✓ Template fixes applied successfully!${NC}"
else
    echo -e "${GREEN}✓ All templates are already correct!${NC}"
fi

echo ""
echo "Next steps:"
echo "  1. Restart backend service: ./restart_services.sh"
echo "  2. Test PDF generation for all document types"
echo "  3. Verify downloads work in browser"
