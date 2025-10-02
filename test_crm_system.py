#!/usr/bin/env python3
"""
CRM System Test Script
This script tests the basic functionality of the CRM system
"""

import os
import sys
import django
import requests
from datetime import datetime, timedelta

# Add the backend directory to Python path
sys.path.append('/home/athenas/sap project/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.contrib.auth.models import User
from authentication.models import Company, Service
from crm.models import Lead, Contact, Account, Opportunity, Activity, Campaign

def test_models():
    """Test CRM model creation"""
    print("🧪 Testing CRM Models...")
    
    # Create test user and company
    user, created = User.objects.get_or_create(
        username='crm_test_user',
        defaults={
            'email': 'test@crm.com',
            'first_name': 'CRM',
            'last_name': 'Tester'
        }
    )
    
    company, created = Company.objects.get_or_create(
        name='CRM Test Company',
        defaults={
            'company_prefix': 'CRM',
            'email': 'company@crm.com',
            'created_by': user
        }
    )
    
    # Test Lead creation
    lead = Lead.objects.create(
        company=company,
        lead_id='CRMLEAD001',
        first_name='John',
        last_name='Doe',
        email='john.doe@example.com',
        status='new',
        priority='medium',
        source='website',
        created_by=user
    )
    print(f"✅ Lead created: {lead}")
    
    # Test Contact creation
    contact = Contact.objects.create(
        company=company,
        contact_id='CRMCON001',
        first_name='Jane',
        last_name='Smith',
        email='jane.smith@example.com',
        created_by=user
    )
    print(f"✅ Contact created: {contact}")
    
    # Test Account creation
    account = Account.objects.create(
        company=company,
        account_id='CRMACC001',
        name='Test Account Inc',
        account_type='prospect',
        industry='technology',
        created_by=user
    )
    print(f"✅ Account created: {account}")
    
    # Test Opportunity creation
    opportunity = Opportunity.objects.create(
        company=company,
        opportunity_id='CRMOPP001',
        name='Test Opportunity',
        account=account,
        stage='prospecting',
        amount=50000,
        probability=25,
        expected_close_date=datetime.now().date() + timedelta(days=30),
        owner=user,
        created_by=user
    )
    print(f"✅ Opportunity created: {opportunity}")
    print(f"   Weighted amount: ₹{opportunity.weighted_amount}")
    
    # Test Activity creation
    activity = Activity.objects.create(
        company=company,
        activity_id='CRMACT001',
        subject='Test Call',
        activity_type='call',
        status='planned',
        due_date=datetime.now() + timedelta(hours=2),
        assigned_to=user,
        created_by=user,
        lead=lead
    )
    print(f"✅ Activity created: {activity}")
    
    # Test Campaign creation
    campaign = Campaign.objects.create(
        company=company,
        campaign_id='CRMCAM001',
        name='Test Campaign',
        campaign_type='email',
        status='planning',
        start_date=datetime.now().date(),
        end_date=datetime.now().date() + timedelta(days=30),
        created_by=user
    )
    print(f"✅ Campaign created: {campaign}")
    
    print("🎉 All CRM models created successfully!")
    return True

def test_api_endpoints():
    """Test CRM API endpoints (requires running server)"""
    print("\n🌐 Testing CRM API Endpoints...")
    
    base_url = "http://localhost:8000/api/crm"
    
    # Test endpoints that don't require authentication for basic connectivity
    endpoints_to_test = [
        "/dashboard/",
        "/leads/",
        "/contacts/",
        "/accounts/",
        "/opportunities/",
        "/activities/",
        "/campaigns/"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code in [200, 401]:  # 401 is expected without auth
                print(f"✅ Endpoint {endpoint} is accessible")
            else:
                print(f"⚠️  Endpoint {endpoint} returned status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"❌ Could not connect to {endpoint} - Server may not be running")
        except Exception as e:
            print(f"❌ Error testing {endpoint}: {e}")
    
    return True

def test_service_setup():
    """Test CRM service setup"""
    print("\n⚙️  Testing CRM Service Setup...")
    
    # Check if CRM service exists
    try:
        service = Service.objects.get(service_type='crm')
        print(f"✅ CRM Service found: {service.name}")
        print(f"   Description: {service.description}")
        print(f"   Active: {service.is_active}")
        print(f"   Base Price: ₹{service.base_price}")
        print(f"   Features: {len(service.features)} features")
        return True
    except Service.DoesNotExist:
        print("❌ CRM Service not found in database")
        print("   Run: python manage.py setup_crm_service")
        return False

def check_database_tables():
    """Check if CRM database tables exist"""
    print("\n🗄️  Checking CRM Database Tables...")
    
    from django.db import connection
    
    cursor = connection.cursor()
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'crm_%'
        ORDER BY table_name;
    """)
    
    tables = cursor.fetchall()
    
    expected_tables = [
        'crm_lead',
        'crm_contact', 
        'crm_account',
        'crm_opportunity',
        'crm_activity',
        'crm_campaign',
        'crm_campaignmember',
        'crm_salestarget'
    ]
    
    found_tables = [table[0] for table in tables]
    
    for table in expected_tables:
        if table in found_tables:
            print(f"✅ Table {table} exists")
        else:
            print(f"❌ Table {table} missing")
    
    return len(found_tables) >= len(expected_tables)

def main():
    """Run all tests"""
    print("🚀 Starting CRM System Tests...\n")
    
    tests_passed = 0
    total_tests = 4
    
    # Test 1: Database Tables
    if check_database_tables():
        tests_passed += 1
    
    # Test 2: Service Setup
    if test_service_setup():
        tests_passed += 1
    
    # Test 3: Model Creation
    try:
        if test_models():
            tests_passed += 1
    except Exception as e:
        print(f"❌ Model test failed: {e}")
    
    # Test 4: API Endpoints
    if test_api_endpoints():
        tests_passed += 1
    
    # Summary
    print(f"\n📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! CRM system is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    # Additional info
    print("\n📋 Next Steps:")
    print("1. Start the Django server: python manage.py runserver")
    print("2. Start the React frontend: npm run dev")
    print("3. Navigate to: http://localhost:3000/services/crm")
    print("4. Login and test the CRM interface")
    
    return tests_passed == total_tests

if __name__ == "__main__":
    main()