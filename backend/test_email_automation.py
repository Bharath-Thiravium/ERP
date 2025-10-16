#!/usr/bin/env python3
"""
Test script for email automation system
Run this to test email automation functionality
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).parent
sys.path.insert(0, str(project_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
from authentication.models import Company
from finance.integration_models import EmailAutomation
from finance.email_automation_service import EmailAutomationService

def test_email_automation():
    """Test email automation functionality"""
    
    print("Email Automation System Test")
    print("=" * 40)
    
    # Get first company
    try:
        company = Company.objects.first()
        if not company:
            print("❌ No companies found. Please create a company first.")
            return
        
        print(f"✅ Testing with company: {company.name}")
        
        # Check if company has email settings
        service = EmailAutomationService(company)
        if not service.email_service or not service.email_service.can_send_email():
            print("❌ Company email service not configured.")
            print("   Please configure email settings in company dashboard first.")
            return
        
        print("✅ Company email service is configured")
        
        # Create a test automation if none exists
        automation, created = EmailAutomation.objects.get_or_create(
            company=company,
            email_type='custom',
            title='Test Email Automation',
            defaults={
                'recipient_emails': [],
                'include_company_admin': True,
                'include_finance_users': True,
                'frequency': 'daily',
                'send_days_before': 1,
                'send_time': timezone.now().time(),
                'subject_template': 'Test Email - {company_name}',
                'body_template': 'This is a test email from {company_name} sent on {current_date}.',
                'is_active': True,
                'next_send': timezone.now()
            }
        )
        
        if created:
            print("✅ Created test email automation")
        else:
            print("✅ Using existing test email automation")
        
        # Test the automation
        print("\n🔄 Processing email automation...")
        
        try:
            service.process_automation(automation)
            print("✅ Email automation processed successfully")
            
            # Check if automation was updated
            automation.refresh_from_db()
            if automation.last_sent:
                print(f"✅ Last sent: {automation.last_sent}")
            if automation.next_send:
                print(f"✅ Next send: {automation.next_send}")
                
        except Exception as e:
            print(f"❌ Email automation failed: {str(e)}")
        
        # Test all automations
        print("\n🔄 Processing all automations for company...")
        try:
            service.process_all_automations()
            print("✅ All automations processed successfully")
        except Exception as e:
            print(f"❌ Processing all automations failed: {str(e)}")
        
        print("\n📊 Email Automation Summary:")
        print(f"   Company: {company.name}")
        print(f"   Total automations: {EmailAutomation.objects.filter(company=company).count()}")
        print(f"   Active automations: {EmailAutomation.objects.filter(company=company, is_active=True).count()}")
        
        # Show recent automations
        recent_automations = EmailAutomation.objects.filter(
            company=company,
            last_sent__isnull=False
        ).order_by('-last_sent')[:5]
        
        if recent_automations:
            print(f"\n📧 Recent Email Automations:")
            for auto in recent_automations:
                print(f"   • {auto.title} - Last sent: {auto.last_sent}")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_email_automation()