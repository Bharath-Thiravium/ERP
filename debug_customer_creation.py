#!/usr/bin/env python
"""
Debug script for customer creation issues
Run this on your VPS server to diagnose the problem
"""

import os
import sys
import django

# Setup Django
sys.path.append('/path/to/your/sap-project/backend')  # Update this path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Customer
from authentication.models import Company, ServiceUserSession
from django.db import transaction

def debug_customer_creation():
    print("🔍 Debugging Customer Creation...")
    
    # Check companies
    companies = Company.objects.all()
    print(f"📊 Total Companies: {companies.count()}")
    
    for company in companies:
        print(f"\n🏢 Company: {company.name}")
        customers = Customer.objects.filter(company=company)
        print(f"   👥 Customers: {customers.count()}")
        
        # Check for duplicate customer codes
        customer_codes = [c.customer_code for c in customers if c.customer_code]
        duplicates = [code for code in customer_codes if customer_codes.count(code) > 1]
        
        if duplicates:
            print(f"   ⚠️  Duplicate codes found: {duplicates}")
        else:
            print(f"   ✅ No duplicate codes")
        
        # Test customer creation
        try:
            with transaction.atomic():
                test_customer = Customer(
                    company=company,
                    name=f"Test Customer {company.id}",
                    customer_type='business',
                    email='test@example.com'
                )
                test_customer.save()
                print(f"   ✅ Test customer created: {test_customer.customer_code}")
                
                # Clean up
                test_customer.delete()
                print(f"   🧹 Test customer deleted")
                
        except Exception as e:
            print(f"   ❌ Error creating test customer: {e}")
            print(f"   📝 Error type: {type(e).__name__}")

def check_database_constraints():
    print("\n🔍 Checking Database Constraints...")
    
    from django.db import connection
    cursor = connection.cursor()
    
    # Check unique constraints
    cursor.execute("""
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_name = 'finance_customers' 
        AND constraint_type = 'UNIQUE';
    """)
    
    constraints = cursor.fetchall()
    print(f"📋 Unique constraints: {constraints}")

if __name__ == "__main__":
    debug_customer_creation()
    check_database_constraints()
    print("\n✅ Debug complete!")