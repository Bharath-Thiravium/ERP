#!/usr/bin/env python3
"""
Fix payment numbers that have {FY_SHORT} placeholder instead of actual financial year.
This script replaces {FY_SHORT} with the correct financial year based on payment_date.
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Payment
from datetime import datetime


def get_fy_short(date):
    """Return FY short string like '2526' based on Indian FY (Apr-Mar)."""
    year = date.year
    if date.month < 4:
        return f"{str(year - 1)[2:]}{str(year)[2:]}"
    return f"{str(year)[2:]}{str(year + 1)[2:]}"


def fix_payment_numbers():
    """Fix all payment numbers with {FY_SHORT} placeholder."""
    broken_payments = Payment.objects.filter(payment_number__contains='{FY_SHORT}')
    
    print(f"Found {broken_payments.count()} payments with broken numbering")
    
    for payment in broken_payments:
        old_number = payment.payment_number
        fy_short = get_fy_short(payment.payment_date)
        new_number = old_number.replace('{FY_SHORT}', fy_short)
        
        payment.payment_number = new_number
        payment.save(update_fields=['payment_number'])
        
        print(f"✅ Fixed: {old_number} → {new_number} (Date: {payment.payment_date})")
    
    print(f"\n✅ Fixed {broken_payments.count()} payment numbers")


if __name__ == '__main__':
    fix_payment_numbers()
