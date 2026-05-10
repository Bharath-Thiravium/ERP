#!/usr/bin/env python3
"""
Script to check if payments have TDS information recorded.
This helps identify payments that may have TDS deducted but not recorded in the system.
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Payment, Invoice
from decimal import Decimal

def check_payments_tds():
    """Check all completed payments for TDS information"""
    
    print("=" * 80)
    print("CHECKING PAYMENTS FOR TDS INFORMATION")
    print("=" * 80)
    
    # Get all completed payments
    payments = Payment.objects.filter(status='completed').select_related('invoice', 'customer')
    
    total_payments = payments.count()
    payments_with_tds = payments.filter(tds_amount__gt=0).count()
    payments_without_tds = total_payments - payments_with_tds
    
    print(f"\nTotal Completed Payments: {total_payments}")
    print(f"Payments WITH TDS recorded: {payments_with_tds}")
    print(f"Payments WITHOUT TDS recorded: {payments_without_tds}")
    print()
    
    # Show sample payments without TDS
    print("\n" + "=" * 80)
    print("SAMPLE PAYMENTS WITHOUT TDS (First 10)")
    print("=" * 80)
    
    no_tds_payments = payments.filter(tds_amount=0)[:10]
    for payment in no_tds_payments:
        print(f"\nPayment Number: {payment.payment_number}")
        print(f"  Customer: {payment.customer.name if payment.customer else 'N/A'}")
        print(f"  Date: {payment.payment_date}")
        print(f"  Amount: ₹{payment.amount}")
        print(f"  Net Amount Received: ₹{payment.net_amount_received or payment.amount}")
        print(f"  TDS Amount: ₹{payment.tds_amount}")
        print(f"  TDS Applicable: {payment.tds_applicable}")
        print(f"  TDS Rate: {payment.tds_rate}%")
        print(f"  TDS Section: {payment.tds_section or 'Not specified'}")
        
        # Check if linked invoice has TDS
        if payment.invoice:
            print(f"  Linked Invoice: {payment.invoice.invoice_number}")
            print(f"  Invoice TDS Applicable: {payment.invoice.tds_applicable}")
            print(f"  Invoice TDS Rate: {payment.invoice.tds_rate}%")
    
    # Show sample payments with TDS
    print("\n" + "=" * 80)
    print("SAMPLE PAYMENTS WITH TDS (First 10)")
    print("=" * 80)
    
    with_tds_payments = payments.filter(tds_amount__gt=0)[:10]
    for payment in with_tds_payments:
        print(f"\nPayment Number: {payment.payment_number}")
        print(f"  Customer: {payment.customer.name if payment.customer else 'N/A'}")
        print(f"  Date: {payment.payment_date}")
        print(f"  Gross Amount: ₹{payment.amount}")
        print(f"  TDS Amount: ₹{payment.tds_amount}")
        print(f"  Net Amount Received: ₹{payment.net_amount_received}")
        print(f"  TDS Rate: {payment.tds_rate}%")
        print(f"  TDS Section: {payment.tds_section}")
        print(f"  Certificate Received: {payment.tds_certificate_received}")
    
    print("\n" + "=" * 80)
    print("RECOMMENDATIONS")
    print("=" * 80)
    print("""
If payments should have TDS but don't show TDS amounts:
1. Check if TDS was deducted when payment was received
2. Update payment records with correct TDS information
3. Ensure future payments capture TDS details during creation

To update a payment with TDS information, you can use Django admin or API:
- Set tds_amount (e.g., 10% of gross amount)
- Set tds_rate (e.g., 10.00)
- Set tds_section (e.g., '194C', '194J')
- Set tds_applicable = True
- Calculate net_amount_received = amount - tds_amount
    """)

if __name__ == '__main__':
    check_payments_tds()
