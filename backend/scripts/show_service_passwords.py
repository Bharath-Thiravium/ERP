#!/usr/bin/env python3
"""
Show service passwords for companies
"""

import os
import sys
import django

# Add Django project to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Company, CompanyService, Service, CompanyUser
from django.contrib.auth.models import User

def show_service_passwords():
    """Show service passwords for all companies"""
    
    print("=== SERVICE PASSWORDS FOR ALL COMPANIES ===\n")
    
    companies = Company.objects.filter(approval_status='approved')
    
    for company in companies:
        print(f"🏢 Company: {company.name}")
        print(f"   Status: {company.approval_status}")
        
        # Get company users
        company_users = CompanyUser.objects.filter(company=company)
        print(f"   Users: {', '.join([cu.user.email for cu in company_users])}")
        
        # Get assigned services
        company_services = CompanyService.objects.filter(company=company, is_active=True)
        print(f"   Assigned Services: {company_services.count()}")
        
        for cs in company_services:
            print(f"   📋 Service: {cs.service.name}")
            print(f"      Type: {cs.service.service_type}")
            print(f"      Service ID: {cs.service.id}")
            print(f"      🔑 Password: {cs.service_password}")
            print(f"      Active: {cs.is_active}")
            print(f"      Assigned: {cs.assigned_at.strftime('%Y-%m-%d')}")
            print()
        
        print("-" * 50)
        print()

if __name__ == "__main__":
    show_service_passwords()
