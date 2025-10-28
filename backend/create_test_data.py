#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/home/athenas/sap project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from hr.models import Department, Designation
from authentication.models import Company

def create_test_data():
    company = Company.objects.first()
    if not company:
        print("❌ No company found")
        return
    
    print(f"🏢 Creating test data for: {company.name}")
    
    # Create test department
    dept = Department.objects.create(
        company=company,
        name="Test Department",
        description="Test department for verification"
    )
    print(f"✅ Created department: {dept.name} ({dept.code})")
    
    # Create test designation
    desig = Designation.objects.create(
        company=company,
        title="Test Manager",
        department=dept,
        level="manager",
        min_salary=50000,
        max_salary=80000
    )
    print(f"✅ Created designation: {desig.title} ({desig.code})")
    
    print("🎯 Test data created successfully!")
    print("📝 You can now test the frontend and delete manually")

if __name__ == "__main__":
    create_test_data()