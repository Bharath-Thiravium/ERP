#!/bin/bash

# Fix specific PO: PIEPL-PO-23-24- 0754 (with trailing space)

cd "$(dirname "$0")/backend"
source venv/bin/activate

echo "=========================================="
echo "Fixing PO: PIEPL-PO-23-24- 0754"
echo "=========================================="
echo ""

python manage.py shell << 'EOF'
from finance.models import PurchaseOrder
from decimal import Decimal

# Find the PO (with trailing space)
po = PurchaseOrder.objects.filter(internal_po_number__icontains='PIEPL-PO-23-24- 0754').first()

if po:
    print(f"Found PO: '{po.internal_po_number}'")
    print(f"Company: {po.company.name}")
    print(f"\nCurrent Status:")
    print(f"  Total Amount: ₹{po.total_amount}")
    print(f"  Invoice Claimed: ₹{po.invoice_claimed_amount}")
    print(f"  Remaining Balance: ₹{po.remaining_invoice_balance}")
    print(f"  Invoice Status: {po.invoice_status}")
    print(f"  Claimed %: {float((po.invoice_claimed_amount / po.total_amount) * 100):.1f}%")
    
    # Check invoices
    invoices = po.invoices.all()
    print(f"\n  Linked Invoices: {invoices.count()}")
    
    if invoices.exists():
        print("\n  Invoice Details:")
        for inv in invoices:
            print(f"    - {inv.invoice_number}: ₹{inv.total_amount} (Status: {inv.payment_status})")
        
        print("\n⚠️  WARNING: There are still invoices linked to this PO!")
        print("   You need to delete these invoices first, or the claimed amount will remain.")
        print("\n   Options:")
        print("   1. Delete the invoices from the UI")
        print("   2. Or run this script again after deleting them")
    else:
        print("\n  No invoices found. Recalculating...")
    
    # Recalculate regardless
    print("\n" + "="*50)
    print("Recalculating PO amounts...")
    print("="*50)
    
    # Recalculate proforma claimed amount
    proforma_total = sum(pi.subtotal for pi in po.proforma_invoices.all()) or Decimal('0')
    
    # Recalculate invoice claimed amount
    invoice_total = sum(inv.total_amount for inv in po.invoices.all()) or Decimal('0')
    
    # Update PO fields
    po.proforma_claimed_amount = proforma_total
    po.invoice_claimed_amount = invoice_total
    po.remaining_proforma_balance = po.subtotal - proforma_total
    po.remaining_invoice_balance = po.total_amount - invoice_total
    
    # Update statuses
    if po.remaining_invoice_balance <= 0:
        po.invoice_status = 'completed'
    elif invoice_total > 0:
        po.invoice_status = 'partial'
    else:
        po.invoice_status = 'not_started'
    
    if po.remaining_proforma_balance <= 0:
        po.proforma_status = 'completed'
    elif proforma_total > 0:
        po.proforma_status = 'partial'
    else:
        po.proforma_status = 'not_started'
    
    # Save
    po.save(update_fields=[
        'proforma_claimed_amount', 'invoice_claimed_amount',
        'remaining_proforma_balance', 'remaining_invoice_balance',
        'invoice_status', 'proforma_status'
    ])
    
    print("\n✓ PO Updated!")
    print(f"\nNew Status:")
    print(f"  Invoice Claimed: ₹{po.invoice_claimed_amount}")
    print(f"  Remaining Balance: ₹{po.remaining_invoice_balance}")
    print(f"  Invoice Status: {po.invoice_status}")
    
    if po.total_amount > 0:
        claimed_pct = float((po.invoice_claimed_amount / po.total_amount) * 100)
        print(f"  Claimed %: {claimed_pct:.1f}%")
    
    if invoice_total > 0:
        print(f"\n⚠️  Note: Claimed amount is still {invoice_total} because there are {invoices.count()} invoice(s) linked.")
        print("   Delete the invoices to bring claimed amount to 0.")
    else:
        print("\n✓ Success! Claimed amount is now 0.")
else:
    print("❌ PO not found!")

EOF

echo ""
echo "=========================================="
echo "Fix completed!"
echo "=========================================="
