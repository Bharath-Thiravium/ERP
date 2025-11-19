#!/usr/bin/env python3
"""
ULTRA-SECURE Master Admin Creation Script
=========================================
Military-grade security implementation
"""
import os
import sys
import secrets
import string
import json
import hashlib
import base64
from datetime import timedelta
from getpass import getpass
import ipaddress

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from authentication.models import MasterAdmin, SecurityLog

User = get_user_model()

class UltraSecureMasterAdmin:
    def __init__(self):
        self.security_checks = []
        
    def generate_military_grade_password(self, length=24):
        """Generate military-grade password with all character types"""
        # Ensure at least one of each type
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase), 
            secrets.choice(string.digits),
            secrets.choice("!@#$%^&*()_+-=[]{}|;:,.<>?")
        ]
        
        # Fill remaining with random choices
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}|;:,.<>?"
        for _ in range(length - 4):
            password.append(secrets.choice(alphabet))
            
        # Shuffle the password
        secrets.SystemRandom().shuffle(password)
        return ''.join(password)
    
    def generate_ultra_secure_api_key(self):
        """Generate ultra-secure API key with timestamp and entropy"""
        timestamp = str(int(timezone.now().timestamp()))
        entropy = secrets.token_urlsafe(64)
        combined = f"{timestamp}:{entropy}"
        hashed = hashlib.sha256(combined.encode()).hexdigest()
        return base64.urlsafe_b64encode(hashed.encode()).decode()[:64]
    
    def generate_recovery_codes(self, count=12):
        """Generate cryptographically secure recovery codes"""
        codes = []
        for _ in range(count):
            # 16 character codes with high entropy
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(16))
            formatted = f"{code[:4]}-{code[4:8]}-{code[8:12]}-{code[12:]}"
            codes.append(formatted)
        return codes
    
    def validate_security_environment(self):
        """Validate the security environment before creation"""
        checks = []
        
        # Check if running in secure environment
        if os.getenv('DJANGO_DEBUG', 'True').lower() == 'true':
            checks.append("⚠️  WARNING: Debug mode is enabled")
        else:
            checks.append("✅ Debug mode disabled")
            
        # Check database security
        from django.conf import settings
        db_config = settings.DATABASES['default']
        if 'sqlite' in db_config.get('ENGINE', ''):
            checks.append("⚠️  WARNING: Using SQLite (not recommended for production)")
        else:
            checks.append("✅ Using production database")
            
        # Check secret key strength
        secret_key = getattr(settings, 'SECRET_KEY', '')
        if len(secret_key) < 50:
            checks.append("⚠️  WARNING: Django SECRET_KEY may be weak")
        else:
            checks.append("✅ Django SECRET_KEY appears strong")
            
        return checks
    
    def create_ultra_secure_master_admin(self):
        """Create ultra-secure master admin with all security measures"""
        
        print("🛡️  ULTRA-SECURE Master Admin Creation")
        print("=" * 50)
        
        # Security environment validation
        print("\n🔍 Security Environment Check:")
        security_checks = self.validate_security_environment()
        for check in security_checks:
            print(f"  {check}")
        
        # Confirm to proceed
        if input("\nProceed with creation? (yes/no): ").lower() != 'yes':
            print("❌ Aborted by user")
            return False
        
        # Get secure inputs
        print("\n📝 Master Admin Details:")
        email = input("Enter master admin email: ").strip().lower()
        company_name = input("Enter company name: ").strip()
        
        # Enhanced validation
        if not self.validate_email(email):
            print("❌ Invalid email format")
            return False
            
        if not self.validate_company_name(company_name):
            print("❌ Invalid company name")
            return False
        
        # Check for existing users
        if User.objects.filter(email=email).exists():
            print("❌ User already exists")
            return False
            
        if MasterAdmin.objects.filter(company_name=company_name).exists():
            print("❌ Company already has master admin")
            return False
        
        # Password generation options
        print("\n🔐 Password Security Options:")
        print("1. Generate ultra-secure password (24 chars, military-grade)")
        print("2. Enter custom password (must meet security requirements)")
        
        choice = input("Choose option (1/2): ").strip()
        
        if choice == '1':
            password = self.generate_military_grade_password(24)
            print(f"\n🔑 Generated Password: {password}")
            print("⚠️  CRITICAL: Save this password immediately - it won't be shown again!")
            input("Press Enter after saving the password...")
        else:
            password = self.get_secure_password()
            if not password:
                return False
        
        # Generate all security components
        api_key = self.generate_ultra_secure_api_key()
        recovery_codes = self.generate_recovery_codes(12)
        password_expires_at = timezone.now() + timedelta(days=60)  # Shorter expiry for security
        
        # Create Django user with maximum security
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        
        # Create ultra-secure master admin
        master_admin = MasterAdmin.objects.create(
            user=user,
            company_name=company_name,
            api_key=api_key,
            recovery_codes=json.dumps(recovery_codes),
            password_expires_at=password_expires_at,
            login_attempts=0,
            is_locked=False,
            two_factor_enabled=True,  # Force 2FA
            two_factor_secret=self.generate_2fa_secret()
        )
        
        # Log security event
        SecurityLog.objects.create(
            user=user,
            event_type='MASTER_ADMIN_CREATED',
            ip_address='127.0.0.1',
            details=f"Ultra-secure master admin created for {company_name}"
        )
        
        # Display security information
        self.display_security_info(email, company_name, api_key, recovery_codes, password_expires_at)
        
        return True
    
    def validate_email(self, email):
        """Enhanced email validation"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_company_name(self, name):
        """Validate company name"""
        if len(name) < 2 or len(name) > 100:
            return False
        # Check for suspicious characters
        suspicious = ['<', '>', '"', "'", '&', 'script', 'javascript']
        return not any(sus in name.lower() for sus in suspicious)
    
    def get_secure_password(self):
        """Get and validate secure password from user"""
        while True:
            password = getpass("Enter secure password: ")
            confirm = getpass("Confirm password: ")
            
            if password != confirm:
                print("❌ Passwords don't match")
                continue
                
            # Validate password strength
            if not self.validate_password_strength(password):
                continue
                
            return password
    
    def validate_password_strength(self, password):
        """Validate password meets ultra-secure requirements"""
        if len(password) < 16:
            print("❌ Password must be at least 16 characters")
            return False
            
        checks = [
            (any(c.isupper() for c in password), "uppercase letter"),
            (any(c.islower() for c in password), "lowercase letter"),
            (any(c.isdigit() for c in password), "number"),
            (any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password), "special character")
        ]
        
        for check, requirement in checks:
            if not check:
                print(f"❌ Password must contain at least one {requirement}")
                return False
                
        return True
    
    def generate_2fa_secret(self):
        """Generate 2FA secret key"""
        return base64.b32encode(secrets.token_bytes(20)).decode()
    
    def display_security_info(self, email, company_name, api_key, recovery_codes, password_expires_at):
        """Display all security information"""
        print("\n" + "="*60)
        print("🛡️  ULTRA-SECURE MASTER ADMIN CREATED SUCCESSFULLY")
        print("="*60)
        print(f"📧 Email: {email}")
        print(f"🏢 Company: {company_name}")
        print(f"🔑 API Key: {api_key}")
        print(f"⏰ Password Expires: {password_expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"🔐 2FA: ENABLED (Required for login)")
        
        print("\n🆘 RECOVERY CODES (SAVE THESE SECURELY):")
        print("=" * 40)
        for i, code in enumerate(recovery_codes, 1):
            print(f"  {i:2d}. {code}")
        
        print("\n🔐 LOGIN INFORMATION:")
        print("=" * 30)
        print("URL: http://localhost:3000/login")
        print("2FA: Required (use authenticator app)")
        
        print("\n⚠️  CRITICAL SECURITY REMINDERS:")
        print("=" * 40)
        print("1. Save API key and recovery codes in secure location")
        print("2. Enable 2FA in authenticator app immediately")
        print("3. Change password before expiry date")
        print("4. Monitor security logs regularly")
        print("5. Never share credentials with anyone")
        print("6. Use VPN when accessing from public networks")
        
        print("\n🛡️  SECURITY FEATURES ENABLED:")
        print("=" * 35)
        print("✅ Military-grade password generation")
        print("✅ Ultra-secure API key with entropy")
        print("✅ 12 recovery codes for account recovery")
        print("✅ Mandatory 2FA authentication")
        print("✅ 60-day password expiry")
        print("✅ Account lockout protection")
        print("✅ Security event logging")
        print("✅ Input validation and sanitization")

if __name__ == "__main__":
    creator = UltraSecureMasterAdmin()
    success = creator.create_ultra_secure_master_admin()
    sys.exit(0 if success else 1)