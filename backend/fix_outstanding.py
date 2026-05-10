#!/usr/bin/env python3
"""
Recalculate outstanding amounts for all invoices.
Accounts for:
- Cash payments (net_amount_received)
- TDS certificates received
- TDS-only payments (excluded from outstanding)
"""

import os
import sys
import django

sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Invoice, Payment
from django.db import models
from decimal import Decimal

def recalculate_invoice_outstanding(invoice):
    """Recalculate outstanding for a single invoice"""
    total = Decimal(str(invoice.total_amount or 0))
    
    # Get all completed payments (excluding TDS-only)
    payments = Payment.objects.filter(
        invoice=invoice,
        status='completed'
    ).exclude(payment_type='tds_only')
    
    total_paid = Decimal('0')
    
    for payment in payments:
        net = Decimal(str(payment.net_amount_received or 0))
        tds = Decimal(str(payment.tds_amount or 0))
        
        if tds > 0:
            # Payment-level TDS: count TDS only when cert received
            total_paid += net + (tds if payment.tds_certificate_received else Decimal('0'))
        elif invoice.tds_applicable and invoice.tds_rate:
            # Invoice-level TDS: check deposits
            cert_received = payment.tds_deposits.filter(
                certificate_received=True
            ).aggregate(t=models.Sum('amount'))['t'] or Decimal('0')
            total_paid += net + cert_received
        else:
            # No TDS
            gross = Decimal(str(payment.gross_payment_amount or payment.amount or 0))
            total_paid += gross
    
    calculated_outstanding = total - total_paid
    current_outstanding = Decimal(str(invoice.outstanding_amount or 0))
    
    if abs(calculated_outstanding - current_outstanding) > Decimal('0.01'):
        print(f"Invoice {invoice.invoice_number}:")
        print(f"  Current: ₹{current_outstanding}")
        print(f"  Calculated: ₹{calculated_outstanding}")
        print(f"  Difference: ₹{current_outstanding - calculated_outstanding}")
        
        invoice.outstanding_amount = calculated_outstanding
        invoice.save(update_fields=['outstanding_amount'])
        print(f"  ✅ Fixed")
        return True
    return False

def main():
    invoices = Invoice.objects.filter(company_id=17).order_by('id')
    
    print(f"Checking {invoices.count()} invoices...\n")
    
    fixed_count = 0
    for invoice in invoices:
        if recalculate_invoice_outstanding(invoice):
            fixed_count += 1
            print()
    
    print(f"\n✅ Fixed {fixed_count} invoices")

if __name__ == '__main__':
    main()
