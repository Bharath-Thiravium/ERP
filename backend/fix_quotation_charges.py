#!/usr/bin/env python
"""
Script to fix existing quotations that have shipping_charges or other_charges
but they weren't saved to the database due to the bug in calculate_totals()

This script will re-calculate and save all quotations to ensure the charges are persisted.
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Quotation
from decimal import Decimal

def fix_quotations():
    """Re-calculate and save all quotations to fix missing shipping/other charges"""
    
    print("=" * 80)
    print("FIXING QUOTATION SHIPPING AND OTHER CHARGES")
    print("=" * 80)
    
    # Get all quotations
    quotations = Quotation.objects.all()
    total_count = quotations.count()
    
    print(f"\nFound {total_count} quotations to process...")
    
    fixed_count = 0
    skipped_count = 0
    
    for quotation in quotations:
        print(f"\nProcessing: {quotation.quotation_number}")
        print(f"  Current shipping_charges: {quotation.shipping_charges}")
        print(f"  Current other_charges: {quotation.other_charges}")
        
        # Store original values
        original_shipping = quotation.shipping_charges
        original_other = quotation.other_charges
        original_total = quotation.total_amount
        
        # Re-calculate totals (this will now save shipping_charges and other_charges)
        try:
            quotation.calculate_totals()
            
            # Check if anything changed
            if (quotation.shipping_charges != original_shipping or 
                quotation.other_charges != original_other or
                quotation.total_amount != original_total):
                
                print(f"  ✅ FIXED - New values:")
                print(f"     shipping_charges: {original_shipping} → {quotation.shipping_charges}")
                print(f"     other_charges: {original_other} → {quotation.other_charges}")
                print(f"     total_amount: {original_total} → {quotation.total_amount}")
                fixed_count += 1
            else:
                print(f"  ⏭️  SKIPPED - No changes needed")
                skipped_count += 1
                
        except Exception as e:
            print(f"  ❌ ERROR: {str(e)}")
            continue
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total quotations processed: {total_count}")
    print(f"Fixed: {fixed_count}")
    print(f"Skipped (no changes): {skipped_count}")
    print(f"Errors: {total_count - fixed_count - skipped_count}")
    print("=" * 80)

if __name__ == '__main__':
    fix_quotations()
