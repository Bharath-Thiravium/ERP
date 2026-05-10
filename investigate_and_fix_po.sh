#!/bin/bash

# Investigate and fix the hidden invoice issue

cd "$(dirname "$0")/backend"
source venv/bin/activate

echo "=========================================="
echo "Investigating Hidden Invoice Issue"
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
    print(f"\n" + "="*60)
    print("INVESTIGATING INVOICES")
    print("="*60)
    
    # Check all invoices (including soft-deleted ones)
    all_invoices = Invoice.objects.filter(purchase_order=po)
    print(f"\nTotal invoices in database: {all_invoices.count()}")
    
    if all_invoices.exists():
        print("\nInvoice Details:")
        for inv in all_invoices:
            print(f"\n  Invoice Number: {inv.invoice_number}")
            print(f"  Amount: ₹{inv.total_amount}")
            print(f"  Date: {inv.invoice_date}")
            print(f"  Payment Status: {inv.payment_status}")
            
            # Check for soft delete flags
            if hasattr(inv, 'is_deleted'):
                print(f"  Is Deleted: {inv.is_deleted}")
            if hasattr(inv, 'is_rejected'):
                print(f"  Is Rejected: {inv.is_rejected}")
            if hasattr(inv, 'is_active'):
                print(f"  Is Active: {inv.is_active}")
            
            print(f"  Created By: {inv.created_by if hasattr(inv, 'created_by') else 'N/A'}")
            print(f"  Invoice ID: {inv.id}")
        
        print("\n" + "="*60)
        print("SOLUTION OPTIONS")
        print("="*60)
        
        print("\nOption 1: Hard delete the invoice(s) from database")
        print("  This will permanently remove the invoice and recalculate PO")
        
        print("\nOption 2: Just recalculate PO (keep invoice)")
        print("  This will update PO to match current invoice total")
        
        response = input("\nChoose option (1 or 2, or 'skip' to cancel): ").strip()
        
        if response == '1':
            print("\n⚠️  WARNING: This will PERMANENTLY delete the invoice(s)!")
            confirm = input("Type 'DELETE' to confirm: ").strip()
            
            if confirm == 'DELETE':
                deleted_count = 0
                for inv in all_invoices:
                    print(f"  Deleting invoice {inv.invoice_number}...")
                    inv.delete()
                    deleted_count += 1
                
                print(f"\n✓ Deleted {deleted_count} invoice(s)")
                
                # The signal should auto-update, but let's force it
                po.refresh_from_db()
                
                # Manual recalculation as backup
                invoice_total = sum(inv.total_amount for inv in po.invoices.all()) or Decimal('0')
                po.invoice_claimed_amount = invoice_total
                po.remaining_invoice_balance = po.total_amount - invoice_total
                po.invoice_status = 'not_started' if invoice_total == 0 else ('completed' if po.remaining_invoice_balance <= 0 else 'partial')
                po.save(update_fields=['invoice_claimed_amount', 'remaining_invoice_balance', 'invoice_status'])
                
                print(f"\n✓ PO Updated!")
                print(f"  Invoice Claimed: ₹{po.invoice_claimed_amount}")
                print(f"  Remaining Balance: ₹{po.remaining_invoice_balance}")
                print(f"  Claimed %: {float((po.invoice_claimed_amount / po.total_amount) * 100):.1f}%")
            else:
                print("\nCancelled. No changes made.")
        
        elif response == '2':
            print("\nRecalculating PO without deleting invoices...")
            
            invoice_total = sum(inv.total_amount for inv in all_invoices) or Decimal('0')
            proforma_total = sum(pi.subtotal for pi in po.proforma_invoices.all()) or Decimal('0')
            
            po.invoice_claimed_amount = invoice_total
            po.proforma_claimed_amount = proforma_total
            po.remaining_invoice_balance = po.total_amount - invoice_total
            po.remaining_proforma_balance = po.subtotal - proforma_total
            
            if po.remaining_invoice_balance <= 0:
                po.invoice_status = 'completed'
            elif invoice_total > 0:
                po.invoice_status = 'partial'
            else:
                po.invoice_status = 'not_started'
            
            po.save(update_fields=[
                'invoice_claimed_amount', 'proforma_claimed_amount',
                'remaining_invoice_balance', 'remaining_proforma_balance',
                'invoice_status'
            ])
            
            print(f"\n✓ PO Updated!")
            print(f"  Invoice Claimed: ₹{po.invoice_claimed_amount}")
            print(f"  Remaining Balance: ₹{po.remaining_invoice_balance}")
            print(f"  Claimed %: {float((po.invoice_claimed_amount / po.total_amount) * 100):.1f}%")
            print(f"\n  Note: Invoice(s) still exist in database")
        
        else:
            print("\nNo changes made.")
    
    else:
        print("\n✓ No invoices found in database")
        print("  Recalculating PO to set claimed amount to 0...")
        
        po.invoice_claimed_amount = Decimal('0')
        po.remaining_invoice_balance = po.total_amount
        po.invoice_status = 'not_started'
        po.save(update_fields=['invoice_claimed_amount', 'remaining_invoice_balance', 'invoice_status'])
        
        print(f"\n✓ PO Updated!")
        print(f"  Invoice Claimed: ₹{po.invoice_claimed_amount}")
        print(f"  Remaining Balance: ₹{po.remaining_invoice_balance}")
        print(f"  Claimed %: 0.0%")

else:
    print("❌ PO not found!")

EOF

echo ""
echo "=========================================="
echo "Investigation completed!"
echo "=========================================="
echo ""
echo "After fixing, restart the backend:"
echo "  cd /var/www/SAP-Python && ./restart_services.sh"
