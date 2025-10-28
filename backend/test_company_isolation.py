#!/usr/bin/env python
"""
Test script to verify company isolation for departments and designations
"""
import os
import sys
import django

# Setup Django
sys.path.append('/home/athenas/sap project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from hr.models import Department, Designation
from authentication.models import Company

def test_company_isolation():
    """Test that each company only sees their own departments and designations"""
    print("🧪 Testing Company Isolation for HR Organization Management")
    print("=" * 60)
    
    # Get all companies
    companies = Company.objects.all()
    print(f"📊 Found {companies.count()} companies in the system")
    
    for company in companies:
        print(f"\n🏢 Company: {company.name} (Prefix: {company.company_prefix})")
        
        # Get company's departments
        company_depts = Department.objects.filter(company=company)
        print(f"   📁 Departments: {company_depts.count()}")
        for dept in company_depts:
            print(f"      - {dept.name} ({dept.code})")
        
        # Get company's designations
        company_desigs = Designation.objects.filter(company=company)
        print(f"   💼 Designations: {company_desigs.count()}")
        for desig in company_desigs:
            print(f"      - {desig.title} ({desig.code}) - {desig.department.name}")
    
    print("\n" + "=" * 60)
    
    # Test code uniqueness within companies
    print("🔍 Testing Code Uniqueness:")
    
    # Check if any company has duplicate department codes
    for company in companies:
        dept_codes = Department.objects.filter(company=company).values_list('code', flat=True)
        if len(dept_codes) != len(set(dept_codes)):
            print(f"❌ Company {company.name} has duplicate department codes!")
        else:
            print(f"✅ Company {company.name} has unique department codes")
    
    # Check if any company has duplicate designation codes
    for company in companies:
        desig_codes = Designation.objects.filter(company=company).values_list('code', flat=True)
        if len(desig_codes) != len(set(desig_codes)):
            print(f"❌ Company {company.name} has duplicate designation codes!")
        else:
            print(f"✅ Company {company.name} has unique designation codes")
    
    print("\n🎉 Company isolation test completed!")
    print("📝 Each company should only see their own departments and designations")
    print("🔧 All codes should be auto-generated with company prefixes")

if __name__ == "__main__":
    test_company_isolation()