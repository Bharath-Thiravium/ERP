#!/usr/bin/env python3
"""
Safe Invoice Deletion Script
Deletes invoice BKC/009/2526 and updates all related records
"""

import os
import sys
import django
from decimal import Decimal

# Add the backend directory to Python path
sys.path.append('/var/www/SAP-Python/backend')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')

try:
    django.setup()
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    print("Please ensure the Django environment is properly configured.")
    sys.exit(1)

from django.db import transaction
from finance.models import Invoice, Payment, InvoiceItem

def delete_invoice_safely(invoice_number):
    """Safely delete an invoice and update all related records"""
    
    try:
        # Find the invoice
        invoice = Invoice.objects.get(invoice_number=invoice_number)
        
        print(f"\n🔍 Found Invoice: {invoice.invoice_number}")
        print(f"   Customer: {invoice.customer.name}")
        print(f"   Date: {invoice.invoice_date}")
        print(f"   Amount: ₹{invoice.total_amount}")
        print(f"   Status: {invoice.status}")
        print(f"   Payment Status: {invoice.payment_status}")
        
        if invoice.purchase_order:
            print(f"   PO: {invoice.purchase_order.internal_po_number}")
        if invoice.quotation:
            print(f"   Quotation: {invoice.quotation.quotation_number}")

        # Show related records that will be affected
        invoice_items = invoice.invoice_items.all()
        payments = invoice.payments.all()
        
        print(f"\n📋 Related Records:")
        print(f"   Invoice Items: {invoice_items.count()}")
        print(f"   Payment Records: {payments.count()}")
        
        if payments.exists():
            total_payments = sum(p.amount for p in payments)
            print(f"   Total Payments: ₹{total_payments}")

        # Confirm deletion
        response = input(f"\n⚠️  Are you sure you want to delete invoice {invoice_number}? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Deletion cancelled.")
            return False

        # Perform safe deletion with transaction
        with transaction.atomic():
            print(f"\n🗑️  Deleting invoice {invoice_number}...")
            
            # Store references before deletion
            purchase_order = invoice.purchase_order
            quotation = invoice.quotation
            customer = invoice.customer
            
            # 1. Delete payment records
            if payments.exists():
                print(f"   🔄 Deleting {payments.count()} payment records...")
                for payment in payments:
                    print(f"      - Payment {payment.payment_number}: ₹{payment.amount}")
                payments.delete()
            
            # 2. Delete invoice items
            if invoice_items.exists():
                print(f"   🔄 Deleting {invoice_items.count()} invoice items...")
                invoice_items.delete()
            
            # 3. Delete the invoice
            print(f"   🔄 Deleting invoice record...")
            invoice.delete()
            
            # 4. Update related PO balance tracking
            if purchase_order:
                print(f"   🔄 Updating PO balance tracking: {purchase_order.internal_po_number}")
                purchase_order.update_balance_tracking()
                print(f"      - Remaining invoice balance: ₹{purchase_order.remaining_invoice_balance}")
                print(f"      - Invoice status: {purchase_order.invoice_status}")
            
            # 5. Update related quotation balance tracking
            if quotation:
                print(f"   🔄 Updating quotation balance tracking: {quotation.quotation_number}")
                quotation.update_balance_tracking()
                print(f"      - Remaining invoice balance: ₹{quotation.remaining_invoice_balance}")
            
            # 6. Update customer payment history (recalculate totals)
            print(f"   🔄 Updating customer payment history: {customer.name}")
            
            # Recalculate customer totals
            remaining_invoices = Invoice.objects.filter(customer=customer)
            total_outstanding = sum(inv.outstanding_amount for inv in remaining_invoices)
            total_paid = sum(inv.paid_amount for inv in remaining_invoices)
            
            print(f"      - Customer remaining invoices: {remaining_invoices.count()}")
            print(f"      - Customer total outstanding: ₹{total_outstanding}")
            print(f"      - Customer total paid: ₹{total_paid}")

        print(f"\n✅ Invoice {invoice_number} deleted successfully!")
        print("✅ All related records updated.")
        return True
        
    except Invoice.DoesNotExist:
        print(f"❌ Invoice '{invoice_number}' not found.")
        return False
    
    except Exception as e:
        print(f"❌ Error deleting invoice {invoice_number}: {str(e)}")
        return False

if __name__ == "__main__":
    # Delete the specific invoice
    invoice_number = "BKC/009/2526"
    success = delete_invoice_safely(invoice_number)
    
    if success:
        print(f"\n🎉 Successfully deleted invoice {invoice_number}")
    else:
        print(f"\n💥 Failed to delete invoice {invoice_number}")
        sys.exit(1)