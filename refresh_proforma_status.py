#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/home/athenas/sap project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

# Setup Django
django.setup()

from finance.models import ProformaInvoice, Payment
from decimal import Decimal

def refresh_proforma_payment_status():
    """Refresh payment status for all proforma invoices"""
    proforma_invoices = ProformaInvoice.objects.all()
    updated_count = 0
    
    for proforma in proforma_invoices:
        # Calculate total payments for this proforma
        total_payments = proforma.payments.filter(status='completed').aggregate(
            total=django.db.models.Sum('amount')
        )['total'] or Decimal('0')
        
        old_status = proforma.payment_status
        old_paid = proforma.paid_amount
        old_outstanding = proforma.outstanding_amount
        
        # Update payment amounts
        proforma.paid_amount = total_payments
        proforma_total = Decimal(str(proforma.total_amount)) if proforma.total_amount is not None else Decimal('0')
        proforma.outstanding_amount = proforma_total - total_payments
        
        # Update payment status with fixed logic
        if abs(proforma.outstanding_amount) <= Decimal('0.01'):  # Allow for small rounding differences
            proforma.payment_status = 'paid'
        elif total_payments > Decimal('0'):
            proforma.payment_status = 'partially_paid'
        else:
            proforma.payment_status = 'unpaid'
        
        # Save if anything changed
        if (old_status != proforma.payment_status or 
            old_paid != proforma.paid_amount or 
            old_outstanding != proforma.outstanding_amount):
            
            proforma.save(update_fields=['paid_amount', 'outstanding_amount', 'payment_status'])
            updated_count += 1
            print(f"Updated {proforma.proforma_number}: {old_status} -> {proforma.payment_status}, Paid: ₹{proforma.paid_amount}, Outstanding: ₹{proforma.outstanding_amount}")
    
    print(f"\nRefresh completed. Updated {updated_count} proforma invoices.")

if __name__ == '__main__':
    refresh_proforma_payment_status()