#!/usr/bin/env python3
"""
Reset service passwords for companies and provide new passwords
"""

import os
import sys
import django
import secrets
import string

# Add Django project to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Company, CompanyService, Service, CompanyUser
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import timedelta

def generate_service_password(length=12):
    """Generate secure service password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def reset_service_passwords():
    """Reset service passwords for all companies and provide new passwords"""
    
    print("=== RESETTING SERVICE PASSWORDS FOR ALL COMPANIES ===\n")
    
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
        
        service_credentials = []
        
        for cs in company_services:
            # Generate new password
            new_password = generate_service_password(12)
            
            # Update the service password
            cs.service_password = make_password(new_password)
            cs.password_changed_at = timezone.now()
            cs.password_expires_at = timezone.now() + timedelta(days=90)
            cs.save()
            
            service_credentials.append({
                'name': cs.service.name,
                'type': cs.service.service_type,
                'id': cs.service.id,
                'password': new_password
            })
            
            print(f"   📋 Service: {cs.service.name}")
            print(f"      Type: {cs.service.service_type}")
            print(f"      Service ID: {cs.service.id}")
            print(f"      🔑 NEW Password: {new_password}")
            print(f"      Active: {cs.is_active}")
            print()
        
        # Create credentials file for this company
        if service_credentials:
            filename = f"service_credentials_{company.name.replace(' ', '_').lower()}.txt"
            filepath = os.path.join(os.path.dirname(__file__), filename)
            
            with open(filepath, 'w') as f:
                f.write(f"SERVICE CREDENTIALS FOR {company.name.upper()}\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Company: {company.name}\n")
                f.write(f"User Email: {', '.join([cu.user.email for cu in company_users])}\n")
                f.write(f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write("SERVICE PASSWORDS:\n")
                f.write("-" * 20 + "\n")
                
                for cred in service_credentials:
                    f.write(f"\nService: {cred['name']}\n")
                    f.write(f"Type: {cred['type']}\n")
                    f.write(f"Service ID: {cred['id']}\n")
                    f.write(f"Password: {cred['password']}\n")
                
                f.write(f"\nNOTE: These passwords expire in 90 days.\n")
                f.write(f"You can change them after logging into each service.\n")
            
            print(f"   💾 Credentials saved to: {filepath}")
        
        print("-" * 50)
        print()

if __name__ == "__main__":
    print("⚠️  WARNING: This will reset ALL service passwords for ALL companies!")
    print("   New passwords will be generated and saved to credential files.")
    print()
    
    confirm = input("Are you sure you want to continue? (yes/no): ").lower().strip()
    
    if confirm == 'yes':
        reset_service_passwords()
        print("✅ Service password reset complete!")
        print("📁 Check the scripts directory for credential files.")
    else:
        print("❌ Operation cancelled.")
