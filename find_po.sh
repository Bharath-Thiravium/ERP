#!/bin/bash

# Diagnostic script to find PO with number containing 0754

cd "$(dirname "$0")/backend"
source venv/bin/activate

echo "=========================================="
echo "Searching for PO containing '0754'..."
echo "=========================================="
echo ""

python manage.py shell << EOF
from finance.models import PurchaseOrder

# Search for POs containing "0754"
pos = PurchaseOrder.objects.filter(internal_po_number__icontains='0754')

if pos.exists():
    print(f"Found {pos.count()} PO(s):\n")
    for po in pos:
        print(f"Internal PO Number: '{po.internal_po_number}'")
        print(f"Client PO Number: '{po.po_number}'")
        print(f"Company: {po.company.name}")
        print(f"Total Amount: ₹{po.total_amount}")
        print(f"Invoice Claimed: ₹{po.invoice_claimed_amount}")
        print(f"Remaining Balance: ₹{po.remaining_invoice_balance}")
        print(f"Invoice Status: {po.invoice_status}")
        
        # Calculate claimed percentage
        if po.total_amount > 0:
            claimed_pct = float((po.invoice_claimed_amount / po.total_amount) * 100)
            print(f"Claimed Percentage: {claimed_pct:.1f}%")
        
        # Count invoices
        invoice_count = po.invoices.count()
        print(f"Number of Invoices: {invoice_count}")
        
        print("\n" + "="*50 + "\n")
else:
    print("No PO found containing '0754'")
    print("\nSearching in client PO numbers...")
    pos = PurchaseOrder.objects.filter(po_number__icontains='0754')
    if pos.exists():
        print(f"Found {pos.count()} PO(s) by client PO number:\n")
        for po in pos:
            print(f"Internal PO Number: '{po.internal_po_number}'")
            print(f"Client PO Number: '{po.po_number}'")
            print(f"Company: {po.company.name}")
            print("\n" + "="*50 + "\n")
    else:
        print("No PO found with '0754' in client PO number either")
        print("\nShowing last 5 POs for reference:")
        recent_pos = PurchaseOrder.objects.all().order_by('-id')[:5]
        for po in recent_pos:
            print(f"  {po.internal_po_number} | {po.po_number} | {po.company.name}")

EOF

echo ""
echo "=========================================="
echo "Diagnostic complete!"
echo "=========================================="
