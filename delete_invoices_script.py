#!/usr/bin/env python
"""
Script to delete specific invoice entries from the database
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Invoice

# Invoice numbers to delete
invoice_numbers = [
    'BKGE-INV-2026-27-002',
]

print("="*60)
print("Starting invoice deletion process...")
print("="*60)

deleted_count = 0
not_found = []

for invoice_number in invoice_numbers:
    try:
        # Try to find and delete the invoice
        invoices = Invoice.objects.filter(invoice_number=invoice_number)
        
        if invoices.exists():
            count = invoices.count()
            invoice = invoices.first()
            
            print(f"\n⚠️  Deleting invoice: {invoice_number}")
            print(f"    Customer: {invoice.customer.name}")
            print(f"    Amount: ₹{invoice.total_amount}")
            print(f"    Date: {invoice.invoice_date}")
            
            # Store PO reference and claimed quantities before deletion
            purchase_order = invoice.purchase_order
            claimed_quantities = {}
            if purchase_order:
                for item in invoice.invoice_items.all():
                    if item.po_item:
                        claimed_quantities[item.po_item.id] = item.quantity
            
            invoices.delete()
            deleted_count += count
            
            print(f"✓ Successfully deleted {count} invoice(s)")
            
            # Revert claimed quantities on PO items
            if purchase_order and claimed_quantities:
                print(f"    🔄 Reverting claimed quantities on PO items")
                for po_item_id, claimed_qty in claimed_quantities.items():
                    try:
                        po_item = purchase_order.po_items.get(id=po_item_id)
                        po_item.invoice_claimed_quantity -= claimed_qty
                        if po_item.invoice_claimed_quantity < 0:
                            po_item.invoice_claimed_quantity = 0
                        po_item.save(update_fields=['invoice_claimed_quantity'])
                        print(f"      - Reverted {claimed_qty} from {po_item.product_name}")
                    except Exception as e:
                        print(f"      - Error reverting {po_item_id}: {e}")
            
            # Update PO balance tracking after deletion
            if purchase_order:
                print(f"    🔄 Updating PO balance tracking: {purchase_order.internal_po_number}")
                purchase_order.update_balance_tracking()
                print(f"      - Remaining invoice balance: ₹{purchase_order.remaining_invoice_balance}")
                print(f"      - Invoice status: {purchase_order.invoice_status}")
        else:
            not_found.append(invoice_number)
            print(f"\n✗ Invoice not found: {invoice_number}")
            
    except Exception as e:
        print(f"\n❌ Error deleting invoice {invoice_number}: {str(e)}")

# Summary
print("\n" + "="*60)
print(f"✓ Total invoices deleted: {deleted_count}")

if not_found:
    print(f"⚠️  Invoices not found: {len(not_found)}")
    for inv_num in not_found:
        print(f"  - {inv_num}")

print("="*60)
print("Invoice deletion process completed!")
print("="*60)
