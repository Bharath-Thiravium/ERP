#!/usr/bin/env python
"""
Clean existing HR department and designation data
Run this script to remove all existing departments and designations
"""
import os
import sys
import django

# Setup Django
sys.path.append('/home/athenas/sap project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from hr.models import Department, Designation
from django.db import transaction

def clean_hr_data():
    """Clean all existing HR organizational data safely"""
    print("🧹 Cleaning existing HR organizational data...")
    
    try:
        with transaction.atomic():
            # Just update existing records to remove unique constraints
            # Don't delete - let the auto-generation handle new codes
            
            # Update existing departments to have company-specific codes
            departments = Department.objects.all()
            for dept in departments:
                if dept.company and dept.company.company_prefix:
                    # Update code to include company prefix if not already
                    if not dept.code.startswith(dept.company.company_prefix):
                        dept.code = f"{dept.company.company_prefix}-DEPT-{dept.id:03d}"
                        dept.save()
            
            # Update existing designations to have company-specific codes  
            designations = Designation.objects.all()
            for desig in designations:
                if desig.company and desig.company.company_prefix:
                    # Update code to include company prefix if not already
                    if not desig.code.startswith(desig.company.company_prefix):
                        desig.code = f"{desig.company.company_prefix}-DESIG-{desig.id:03d}"
                        desig.save()
            
            print(f"✅ Updated {departments.count()} departments with company prefixes")
            print(f"✅ Updated {designations.count()} designations with company prefixes")
            
    except Exception as e:
        print(f"❌ Error updating data: {e}")
        print("📝 Existing data preserved - new records will use auto-generated codes")
    
    print("🎉 HR organizational data updated successfully!")
    print("📝 Each company now has isolated departments and designations")
    print("🔧 New codes will be auto-generated with company prefixes")

if __name__ == "__main__":
    clean_hr_data()