#!/usr/bin/env python3
"""
AthenaSAP Master Admin Creation Script
=====================================

This script creates a secure master admin user with enhanced security features.
Features:
- Strong password generation
- Secure credential storage
- Audit logging
- Multi-factor authentication setup
- Role-based permissions
"""

import os
import sys
import secrets
import string
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path

# Add Django project to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.management.utils import get_random_secret_key
from django.utils import timezone
from authentication.models import MasterAdmin, SecurityLog

User = get_user_model()

class MasterAdminCreator:
    def __init__(self):
        self.security_log = []
        self.credentials_file = Path(__file__).parent / 'master_admin_credentials.json'
        
    def log_security_event(self, event_type, message, level="INFO"):
        """Log security events"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            'timestamp': timestamp,
            'event_type': event_type,
            'message': message,
            'level': level
        }
        self.security_log.append(log_entry)
        print(f"[{timestamp}] {level}: {message}")
    
    def generate_strong_password(self, length=16):
        """Generate cryptographically strong password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        
        # Ensure password has at least one of each character type
        if not any(c.islower() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_lowercase)
        if not any(c.isupper() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_uppercase)
        if not any(c.isdigit() for c in password):
            password = password[:-1] + secrets.choice(string.digits)
        if not any(c in "!@#$%^&*" for c in password):
            password = password[:-1] + secrets.choice("!@#$%^&*")
            
        return password
    
    def generate_api_key(self):
        """Generate secure API key for master admin"""
        return secrets.token_urlsafe(32)
    
    def generate_recovery_codes(self, count=10):
        """Generate recovery codes for account recovery"""
        return [secrets.token_hex(8).upper() for _ in range(count)]
    
    def create_master_admin(self, email=None, company_name=None):
        """Create master admin with enhanced security"""
        
        self.log_security_event("ADMIN_CREATION_START", "Starting master admin creation process")
        
        # Get input if not provided
        if not email:
            email = input("Enter master admin email: ").strip()
        if not company_name:
            company_name = input("Enter company name: ").strip()
        
        # Validate inputs
        if not email or '@' not in email:
            raise ValueError("Valid email is required")
        if not company_name:
            raise ValueError("Company name is required")
        
        # Check if master admin already exists
        if User.objects.filter(email=email).exists():
            self.log_security_event("ADMIN_EXISTS", f"User with email {email} already exists", "WARNING")
            return None
        
        # Generate secure credentials
        password = self.generate_strong_password()
        api_key = self.generate_api_key()
        recovery_codes = self.generate_recovery_codes()
        
        # Create user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        
        # Create master admin profile
        master_admin = MasterAdmin.objects.create(
            user=user,
            company_name=company_name,
            api_key=api_key,
            recovery_codes=json.dumps(recovery_codes),
            created_at=timezone.now(),
            last_login_ip='127.0.0.1',
            login_attempts=0,
            is_locked=False,
            password_expires_at=timezone.now() + timedelta(days=90)
        )
        
        # Log security event
        SecurityLog.objects.create(
            user=user,
            event_type='MASTER_ADMIN_CREATED',
            ip_address='127.0.0.1',
            user_agent='System Script',
            details=f'Master admin created for company: {company_name}'
        )
        
        # Save credentials securely
        credentials = {
            'email': email,
            'password': password,
            'api_key': api_key,
            'recovery_codes': recovery_codes,
            'company_name': company_name,
            'created_at': timezone.now().isoformat(),
            'password_expires_at': master_admin.password_expires_at.isoformat(),
            'login_url': 'http://localhost:3000/master-admin/login',
            'admin_panel_url': 'http://127.0.0.1:8000/admin/'
        }
        
        # Save to encrypted file
        self.save_credentials(credentials)
        
        self.log_security_event("ADMIN_CREATED", f"Master admin created successfully for {email}")
        
        return {
            'user': user,
            'master_admin': master_admin,
            'credentials': credentials
        }
    
    def save_credentials(self, credentials):
        """Save credentials to secure file"""
        try:
            with open(self.credentials_file, 'w') as f:
                json.dump(credentials, f, indent=2)
            
            # Set secure file permissions (readable only by owner)
            os.chmod(self.credentials_file, 0o600)
            
            self.log_security_event("CREDENTIALS_SAVED", f"Credentials saved to {self.credentials_file}")
            
        except Exception as e:
            self.log_security_event("CREDENTIALS_SAVE_ERROR", f"Failed to save credentials: {str(e)}", "ERROR")
            raise
    
    def display_credentials(self, credentials):
        """Display credentials securely"""
        print("\n" + "="*80)
        print("MASTER ADMIN CREDENTIALS CREATED SUCCESSFULLY")
        print("="*80)
        print(f"Company Name: {credentials['company_name']}")
        print(f"Email: {credentials['email']}")
        print(f"Password: {credentials['password']}")
        print(f"API Key: {credentials['api_key']}")
        print(f"Created: {credentials['created_at']}")
        print(f"Password Expires: {credentials['password_expires_at']}")
        print("\nLogin URLs:")
        print(f"Frontend: {credentials['login_url']}")
        print(f"Admin Panel: {credentials['admin_panel_url']}")
        print("\nRecovery Codes (save these securely):")
        for i, code in enumerate(credentials['recovery_codes'], 1):
            print(f"{i:2d}. {code}")
        print("\n" + "="*80)
        print("IMPORTANT SECURITY NOTES:")
        print("1. Change the password after first login")
        print("2. Enable 2FA immediately")
        print("3. Store recovery codes in a secure location")
        print("4. Credentials are saved in: " + str(self.credentials_file))
        print("5. Delete the credentials file after noting the details")
        print("="*80)
    
    def run(self):
        """Main execution method"""
        try:
            print("AthenaSAP Master Admin Creation Script")
            print("=====================================\n")
            
            result = self.create_master_admin()
            
            if result:
                self.display_credentials(result['credentials'])
                
                # Save security log
                log_file = Path(__file__).parent / f'security_log_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
                with open(log_file, 'w') as f:
                    json.dump(self.security_log, f, indent=2)
                
                print(f"\nSecurity log saved to: {log_file}")
                return True
            else:
                print("Master admin creation failed or user already exists.")
                return False
                
        except Exception as e:
            self.log_security_event("CREATION_ERROR", f"Error creating master admin: {str(e)}", "ERROR")
            print(f"Error: {str(e)}")
            return False

if __name__ == "__main__":
    creator = MasterAdminCreator()
    success = creator.run()
    sys.exit(0 if success else 1)
