#!/usr/bin/env python3
"""
SECURE Master Admin Creation Script
==================================
"""
import os
import sys
import secrets
import string
import json
from datetime import timedelta
from getpass import getpass

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from authentication.models import MasterAdmin

User = get_user_model()

def generate_secure_password(length=16):
    """Generate cryptographically strong password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

def generate_api_key():
    """Generate secure API key"""
    return secrets.token_urlsafe(48)

def generate_recovery_codes(count=10):
    """Generate recovery codes"""
    codes = []
    for _ in range(count):
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        codes.append(f"{code[:4]}-{code[4:]}")
    return codes

def create_secure_master_admin():
    """Create master admin securely without storing credentials"""
    
    print("🔒 SECURE Master Admin Creation")
    print("=" * 40)
    
    # Get input securely
    email = input("Enter master admin email: ").strip()
    company_name = input("Enter company name: ").strip()
    
    # Validate inputs
    if not email or '@' not in email:
        print("❌ Valid email is required")
        return False
    if not company_name:
        print("❌ Company name is required")
        return False
    
    # Check if user exists
    if User.objects.filter(email=email).exists():
        print("❌ User already exists")
        return False
    
    # Get password choice
    choice = input("Generate password automatically? (y/n): ").lower()
    if choice == 'y':
        password = generate_secure_password()
        print(f"✅ Generated password: {password}")
        print("⚠️  SAVE THIS PASSWORD SECURELY - IT WON'T BE STORED")
    else:
        password = getpass("Enter password: ")
        confirm = getpass("Confirm password: ")
        if password != confirm:
            print("❌ Passwords don't match")
            return False
    
    # Create user
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    
    # Generate security components
    api_key = generate_api_key()
    recovery_codes = generate_recovery_codes()
    password_expires_at = timezone.now() + timedelta(days=90)  # 90 days expiry
    
    # Create master admin with all required fields
    master_admin = MasterAdmin.objects.create(
        user=user,
        company_name=company_name,
        api_key=api_key,
        recovery_codes=json.dumps(recovery_codes),
        password_expires_at=password_expires_at,
        login_attempts=0,
        is_locked=False,
        two_factor_enabled=False
    )
    
    print("✅ Master admin created successfully!")
    print(f"📧 Email: {email}")
    print(f"🏢 Company: {company_name}")
    print(f"🔑 API Key: {api_key}")
    print(f"⏰ Password expires: {password_expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n🔐 Recovery Codes (SAVE THESE SECURELY):")
    for i, code in enumerate(recovery_codes, 1):
        print(f"  {i:2d}. {code}")
    print("\n🔐 Login URL: http://localhost:3000/master-admin/login")
    print("\n⚠️  IMPORTANT: Save the API key and recovery codes securely!")
    
    return True

if __name__ == "__main__":
    success = create_secure_master_admin()
    sys.exit(0 if success else 1)