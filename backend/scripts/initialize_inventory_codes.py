#!/usr/bin/env python
"""
Initialize inventory auto-code settings for existing companies
"""
import os
import sys
import django

# Add the parent directory to the path so we can import Django settings
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Company, CompanyAutoCodeSettings

def initialize_inventory_codes():
    """Initialize inventory auto-code settings for all companies"""
    
    inventory_code_types = [
        'supplier',
        'warehouse', 
        'category',
        'audit'
    ]
    
    companies = Company.objects.all()
    
    for company in companies:
        print(f"Initializing inventory codes for: {company.name}")
        
        for code_type in inventory_code_types:
            setting, created = CompanyAutoCodeSettings.objects.get_or_create(
                company=company,
                code_type=code_type,
                defaults={
                    'current_number': 0,
                    'number_length': 3,
                    'is_active': True
                }
            )
            
            if created:
                print(f"  ✓ Created {code_type} auto-code setting")
            else:
                print(f"  - {code_type} auto-code setting already exists")
    
    print(f"\nCompleted initialization for {companies.count()} companies")

if __name__ == '__main__':
    initialize_inventory_codes()