#!/usr/bin/env python3
"""
Debug script to test Master Admin email settings and login notifications
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/home/athenas/sap project/backend')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')

# Setup Django
django.setup()

from django.contrib.auth.models import User
from authentication.models import MasterAdmin
from authentication.email_settings_models import MasterAdminEmailSettings
from authentication.enhanced_security_models import SecuritySettings
from authentication.email_service import MasterAdminEmailService
from authentication.login_notification_service import LoginNotificationService

def test_email_settings():
    """Test Master Admin email settings"""
    print("🔍 Testing Master Admin Email Settings...")
    
    try:
        # Get first master admin
        master_admin = MasterAdmin.objects.first()
        if not master_admin:
            print("❌ No Master Admin found")
            return False
        
        print(f"✅ Found Master Admin: {master_admin.user.email}")
        
        # Check email settings
        try:
            email_settings = master_admin.email_settings
            print(f"✅ Email settings found:")
            print(f"   - Provider: {email_settings.provider}")
            print(f"   - Email: {email_settings.email_address}")
            print(f"   - Active: {email_settings.is_active}")
            print(f"   - From Name: {email_settings.from_name}")
            
            if email_settings.is_active and email_settings.email_address and email_settings.email_password:
                print("✅ Email settings are properly configured")
                return True
            else:
                print("❌ Email settings are incomplete")
                return False
                
        except MasterAdminEmailSettings.DoesNotExist:
            print("❌ No email settings found for Master Admin")
            return False
            
    except Exception as e:
        print(f"❌ Error testing email settings: {str(e)}")
        return False

def test_security_settings():
    """Test security settings for login notifications"""
    print("\n🔍 Testing Security Settings...")
    
    try:
        master_admin = MasterAdmin.objects.first()
        if not master_admin:
            print("❌ No Master Admin found")
            return False
        
        # Check security settings
        security_settings, created = SecuritySettings.objects.get_or_create(
            master_admin=master_admin,
            defaults={'login_notifications_enabled': True}
        )
        
        print(f"✅ Security settings {'created' if created else 'found'}:")
        print(f"   - Login notifications enabled: {security_settings.login_notifications_enabled}")
        print(f"   - Notification email: {security_settings.notification_email or 'Using account email'}")
        
        return security_settings.login_notifications_enabled
        
    except Exception as e:
        print(f"❌ Error testing security settings: {str(e)}")
        return False

def test_email_service():
    """Test email service functionality"""
    print("\n🔍 Testing Email Service...")
    
    try:
        master_admin = MasterAdmin.objects.first()
        if not master_admin:
            print("❌ No Master Admin found")
            return False
        
        email_service = MasterAdminEmailService()
        
        # Test email settings retrieval
        email_settings = email_service.get_email_settings(master_admin)
        if not email_settings:
            print("❌ No email settings found")
            return False
        
        if not email_settings.is_active:
            print("❌ Email settings are not active")
            return False
        
        print("✅ Email service can access settings")
        
        # Test SMTP connection (without sending)
        try:
            smtp = email_service.create_smtp_connection(email_settings)
            if smtp:
                smtp.quit()
                print("✅ SMTP connection successful")
                return True
            else:
                print("❌ SMTP connection failed")
                return False
        except Exception as e:
            print(f"❌ SMTP connection error: {str(e)}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing email service: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting Master Admin Email Debug Tests\n")
    
    # Test 1: Email Settings
    email_ok = test_email_settings()
    
    # Test 2: Security Settings
    security_ok = test_security_settings()
    
    # Test 3: Email Service
    service_ok = test_email_service()
    
    print(f"\n📊 Test Results:")
    print(f"   Email Settings: {'✅ PASS' if email_ok else '❌ FAIL'}")
    print(f"   Security Settings: {'✅ PASS' if security_ok else '❌ FAIL'}")
    print(f"   Email Service: {'✅ PASS' if service_ok else '❌ FAIL'}")
    
    if email_ok and security_ok and service_ok:
        print("\n🎉 All tests passed! Login notifications should work.")
    else:
        print("\n⚠️  Some tests failed. Check the configuration.")
        
        if not email_ok:
            print("\n🔧 To fix email settings:")
            print("   1. Go to Master Admin → Ultra Secure Settings → Email Settings")
            print("   2. Configure your email provider (Gmail, Outlook, etc.)")
            print("   3. Enter your email address and app password")
            print("   4. Click 'Save & Activate'")
        
        if not security_ok:
            print("\n🔧 To fix security settings:")
            print("   1. Go to Master Admin → Ultra Secure Settings → Enhanced Security")
            print("   2. Enable 'Login Notifications'")
        
        if not service_ok:
            print("\n🔧 To fix email service:")
            print("   1. Check your email credentials")
            print("   2. For Gmail, use App Password (not regular password)")
            print("   3. Test the email configuration")

if __name__ == "__main__":
    main()