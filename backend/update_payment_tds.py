#!/usr/bin/env python3
"""
Script to update payments with TDS information.
Use this if payments were created without TDS data but TDS was actually deducted.
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Payment

def update_payment_with_tds(payment_number, gross_amount, tds_rate, tds_section='194C'):
    """
    Update a payment with TDS information.
    
    Args:
        payment_number: Payment number (e.g., 'PAY-25-000042')
        gross_amount: Total invoice amount before TDS (e.g., 76800.00)
        tds_rate: TDS percentage (e.g., 10.00 for 10%)
        tds_section: TDS section (default: '194C')
    """
    try:
        payment = Payment.objects.get(payment_number=payment_number)
        
        # Calculate TDS amount and net amount
        gross = Decimal(str(gross_amount))
        rate = Decimal(str(tds_rate))
        tds_amount = (gross * rate) / Decimal('100')
        net_amount = gross - tds_amount
        
        # Store original values for comparison
        original_amount = payment.amount
        
        # Update payment with TDS information
        payment.amount = gross
        payment.tds_amount = tds_amount
        payment.tds_rate = rate
        payment.tds_section = tds_section
        payment.tds_applicable = True
        payment.net_amount_received = net_amount
        payment.save()
        
        print(f"✓ Updated {payment_number}")
        print(f"  Original Amount: ₹{original_amount}")
        print(f"  Gross Amount: ₹{gross}")
        print(f"  TDS Amount: ₹{tds_amount} ({rate}%)")
        print(f"  Net Received: ₹{net_amount}")
        print(f"  TDS Section: {tds_section}")
        print()
        
        return True
        
    except Payment.DoesNotExist:
        print(f"✗ Payment {payment_number} not found")
        return False
    except Exception as e:
        print(f"✗ Error updating {payment_number}: {str(e)}")
        return False


def mark_tds_certificate_received(payment_number, form16a_number=None):
    """
    Mark TDS certificate as received for a payment.
    
    Args:
        payment_number: Payment number
        form16a_number: Form 16A certificate number (optional)
    """
    try:
        payment = Payment.objects.get(payment_number=payment_number)
        payment.tds_certificate_received = True
        if form16a_number:
            payment.form16a_number = form16a_number
        payment.save()
        
        print(f"✓ Marked TDS certificate received for {payment_number}")
        if form16a_number:
            print(f"  Form 16A Number: {form16a_number}")
        print()
        
        return True
        
    except Payment.DoesNotExist:
        print(f"✗ Payment {payment_number} not found")
        return False
    except Exception as e:
        print(f"✗ Error updating {payment_number}: {str(e)}")
        return False


def example_usage():
    """Show example usage of the functions"""
    print("=" * 80)
    print("EXAMPLE USAGE")
    print("=" * 80)
    print("""
# Example 1: Update a payment with TDS information
# If customer paid ₹69,120 after deducting 10% TDS from ₹76,800 invoice

update_payment_with_tds(
    payment_number='PAY-25-000042',
    gross_amount=76800.00,
    tds_rate=10.00,
    tds_section='194C'
)

# Example 2: Mark TDS certificate as received
mark_tds_certificate_received(
    payment_number='PAY-25-000042',
    form16a_number='FORM16A-2024-001'
)

# Example 3: Bulk update multiple payments
payments_to_update = [
    ('PAY-25-000042', 76800.00, 10.00, '194C'),
    ('PAY-25-000043', 68400.00, 10.00, '194C'),
    ('PAY-25-000044', 44756.40, 10.00, '194C'),
]

for payment_number, gross, rate, section in payments_to_update:
    update_payment_with_tds(payment_number, gross, rate, section)
    """)


if __name__ == '__main__':
    print("=" * 80)
    print("PAYMENT TDS UPDATE UTILITY")
    print("=" * 80)
    print()
    
    # Show example usage
    example_usage()
    
    print("\n" + "=" * 80)
    print("INTERACTIVE MODE")
    print("=" * 80)
    print()
    
    # Interactive mode
    while True:
        print("\nOptions:")
        print("1. Update payment with TDS")
        print("2. Mark TDS certificate received")
        print("3. Exit")
        
        choice = input("\nEnter choice (1-3): ").strip()
        
        if choice == '1':
            payment_number = input("Payment Number: ").strip()
            gross_amount = input("Gross Amount (before TDS): ").strip()
            tds_rate = input("TDS Rate (e.g., 10 for 10%): ").strip()
            tds_section = input("TDS Section (default 194C): ").strip() or '194C'
            
            try:
                update_payment_with_tds(
                    payment_number,
                    float(gross_amount),
                    float(tds_rate),
                    tds_section
                )
            except ValueError:
                print("✗ Invalid amount or rate. Please enter numeric values.")
                
        elif choice == '2':
            payment_number = input("Payment Number: ").strip()
            form16a_number = input("Form 16A Number (optional): ").strip() or None
            mark_tds_certificate_received(payment_number, form16a_number)
            
        elif choice == '3':
            print("\nExiting...")
            break
        else:
            print("Invalid choice. Please enter 1, 2, or 3.")
