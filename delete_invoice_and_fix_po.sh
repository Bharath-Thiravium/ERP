#!/bin/bash

# Delete invoice BKC/015/2526 and fix PO PIEPL-PO-23-24- 0754

cd "$(dirname "$0")/backend"
source venv/bin/activate

echo "=========================================="
echo "Deleting Invoice and Fixing PO"
echo "=========================================="
echo ""

python manage.py shell << 'EOF'
from finance.models import PurchaseOrder, Invoice
from decimal import Decimal

# Find the PO
po = PurchaseOrder.objects.filter(internal_po_number__icontains='PIEPL-PO-23-24- 0754').first()

if po:
    print(f"PO Found: '{po.internal_po_number}'")
    print(f"Company: {po.company.name}")
    
    # Find the invoice
    invoice = Invoice.objects.filter(purchase_order=po).first()
    
    if invoice:
        print(f"\nInvoice Found:")
        print(f"  Number: {invoice.invoice_number}")
        print(f"  Amount: ₹{invoice.total_amount}")
        print(f"  Status: {invoice.payment_status}")
        print(f"  ID: {invoice.id}")
        
        print(f"\n⚠️  Deleting invoice {invoice.invoice_number}...")
        
        # Delete the invoice
        invoice.delete()
        
        print("✓ Invoice deleted successfully!")
        
        # Refresh PO from database
        po.refresh_from_db()
        
        # Force recalculation (backup in case signal didn't fire)
        invoice_total = sum(inv.total_amount for inv in po.invoices.all()) or Decimal('0')
        proforma_total = sum(pi.subtotal for pi in po.proforma_invoices.all()) or Decimal('0')
        
        po.invoice_claimed_amount = invoice_total
        po.proforma_claimed_amount = proforma_total
        po.remaining_invoice_balance = po.total_amount - invoice_total
        po.remaining_proforma_balance = po.subtotal - proforma_total
        
        # Update status
        if invoice_total == 0:
            po.invoice_status = 'not_started'
        elif po.remaining_invoice_balance <= 0:
            po.invoice_status = 'completed'
        else:
            po.invoice_status = 'partial'
        
        po.save(update_fields=[
            'invoice_claimed_amount', 'proforma_claimed_amount',
            'remaining_invoice_balance', 'remaining_proforma_balance',
            'invoice_status'
        ])
        
        print(f"\n✓ PO Updated Successfully!")
        print(f"\nNew PO Status:")
        print(f"  Total Amount: ₹{po.total_amount}")
        print(f"  Invoice Claimed: ₹{po.invoice_claimed_amount}")
        print(f"  Remaining Balance: ₹{po.remaining_invoice_balance}")
        print(f"  Invoice Status: {po.invoice_status}")
        
        if po.total_amount > 0:
            claimed_pct = float((po.invoice_claimed_amount / po.total_amount) * 100)
            print(f"  Claimed Percentage: {claimed_pct:.1f}%")
        
        # Verify no invoices remain
        remaining_invoices = po.invoices.count()
        print(f"\n  Remaining Invoices: {remaining_invoices}")
        
        if remaining_invoices == 0 and po.invoice_claimed_amount == 0:
            print("\n✅ SUCCESS! PO is now clean with 0% claimed.")
        else:
            print(f"\n⚠️  Warning: Still has {remaining_invoices} invoice(s) or non-zero claimed amount")
    
    else:
        print("\n✓ No invoices found")
        print("  Setting PO to 0% claimed...")
        
        po.invoice_claimed_amount = Decimal('0')
        po.remaining_invoice_balance = po.total_amount
        po.invoice_status = 'not_started'
        po.save(update_fields=['invoice_claimed_amount', 'remaining_invoice_balance', 'invoice_status'])
        
        print(f"\n✓ PO Updated!")
        print(f"  Claimed Percentage: 0.0%")

else:
    print("❌ PO not found!")

EOF

echo ""
echo "=========================================="
echo "Fix Completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart backend: ./restart_services.sh"
echo "2. Refresh the PO page in your browser"
echo "3. Claimed percentage should now be 0%"
echo ""
