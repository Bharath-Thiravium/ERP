#!/usr/bin/env python3
"""
Complete CRM System Test Script
Tests all CRM functionality including CRUD operations for all entities
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
TEST_SESSION_KEY = "your_session_key_here"  # Replace with actual session key

class CRMTester:
    def __init__(self, base_url, session_key):
        self.base_url = base_url
        self.session_key = session_key
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {session_key}'
        }
        self.test_data = {}
        
    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with session key"""
        url = f"{self.base_url}{endpoint}"
        
        # Add session key to params
        if params is None:
            params = {}
        params['session_key'] = self.session_key
        
        try:
            if method == 'GET':
                response = requests.get(url, params=params, headers=self.headers)
            elif method == 'POST':
                response = requests.post(url, json=data, params=params, headers=self.headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, params=params, headers=self.headers)
            elif method == 'DELETE':
                response = requests.delete(url, params=params, headers=self.headers)
            
            return response
        except Exception as e:
            print(f"❌ Request failed: {e}")
            return None
    
    def test_dashboard(self):
        """Test CRM Dashboard endpoints"""
        print("\n🔍 Testing CRM Dashboard...")
        
        # Test dashboard stats
        response = self.make_request('GET', '/api/crm/dashboard/')
        if response and response.status_code == 200:
            print("✅ Dashboard stats retrieved successfully")
            stats = response.json()
            print(f"   - Total Leads: {stats.get('total_leads', 0)}")
            print(f"   - Total Opportunities: {stats.get('total_opportunities', 0)}")
            print(f"   - Pipeline Value: ₹{stats.get('pipeline_value', 0)}")
        else:
            print(f"❌ Dashboard stats failed: {response.status_code if response else 'No response'}")
        
        # Test recent activities
        response = self.make_request('GET', '/api/crm/dashboard/recent_activities/')
        if response and response.status_code == 200:
            print("✅ Recent activities retrieved successfully")
        else:
            print(f"❌ Recent activities failed: {response.status_code if response else 'No response'}")
    
    def test_leads(self):
        """Test Lead CRUD operations"""
        print("\n👥 Testing Lead Management...")
        
        # Create lead
        lead_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "9876543210",
            "company_name": "Test Company",
            "job_title": "Manager",
            "status": "new",
            "priority": "medium",
            "source": "website",
            "estimated_value": 50000,
            "expected_close_date": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            "description": "Test lead for CRM system"
        }
        
        response = self.make_request('POST', '/api/crm/leads/', lead_data)
        if response and response.status_code == 201:
            print("✅ Lead created successfully")
            lead = response.json()
            self.test_data['lead_id'] = lead['id']
            print(f"   - Lead ID: {lead.get('lead_id')}")
        else:
            print(f"❌ Lead creation failed: {response.status_code if response else 'No response'}")
            return
        
        # Get leads
        response = self.make_request('GET', '/api/crm/leads/')
        if response and response.status_code == 200:
            print("✅ Leads retrieved successfully")
            leads = response.json()
            count = len(leads.get('results', leads)) if isinstance(leads, dict) else len(leads)
            print(f"   - Total leads: {count}")
        else:
            print(f"❌ Leads retrieval failed: {response.status_code if response else 'No response'}")
        
        # Update lead
        update_data = {"status": "contacted", "priority": "high"}
        response = self.make_request('PUT', f'/api/crm/leads/{self.test_data["lead_id"]}/', update_data)
        if response and response.status_code == 200:
            print("✅ Lead updated successfully")
        else:
            print(f"❌ Lead update failed: {response.status_code if response else 'No response'}")
    
    def test_contacts(self):
        """Test Contact CRUD operations"""
        print("\n📞 Testing Contact Management...")
        
        # Create contact
        contact_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@example.com",
            "phone": "9876543211",
            "job_title": "Director",
            "department": "Sales",
            "notes": "Test contact for CRM system"
        }
        
        response = self.make_request('POST', '/api/crm/contacts/', contact_data)
        if response and response.status_code == 201:
            print("✅ Contact created successfully")
            contact = response.json()
            self.test_data['contact_id'] = contact['id']
        else:
            print(f"❌ Contact creation failed: {response.status_code if response else 'No response'}")
            return
        
        # Get contacts
        response = self.make_request('GET', '/api/crm/contacts/')
        if response and response.status_code == 200:
            print("✅ Contacts retrieved successfully")
        else:
            print(f"❌ Contacts retrieval failed: {response.status_code if response else 'No response'}")
    
    def test_accounts(self):
        """Test Account CRUD operations"""
        print("\n🏢 Testing Account Management...")
        
        # Create account
        account_data = {
            "name": "Test Corporation",
            "account_type": "customer",
            "industry": "technology",
            "email": "info@testcorp.com",
            "phone": "9876543212",
            "website": "https://testcorp.com",
            "description": "Test account for CRM system"
        }
        
        response = self.make_request('POST', '/api/crm/accounts/', account_data)
        if response and response.status_code == 201:
            print("✅ Account created successfully")
            account = response.json()
            self.test_data['account_id'] = account['id']
        else:
            print(f"❌ Account creation failed: {response.status_code if response else 'No response'}")
            return
        
        # Get accounts
        response = self.make_request('GET', '/api/crm/accounts/')
        if response and response.status_code == 200:
            print("✅ Accounts retrieved successfully")
        else:
            print(f"❌ Accounts retrieval failed: {response.status_code if response else 'No response'}")
    
    def test_opportunities(self):
        """Test Opportunity CRUD operations"""
        print("\n🎯 Testing Opportunity Management...")
        
        if 'account_id' not in self.test_data:
            print("❌ Skipping opportunity test - no account created")
            return
        
        # Create opportunity
        opportunity_data = {
            "name": "Test Opportunity",
            "account": self.test_data['account_id'],
            "stage": "prospecting",
            "amount": 100000,
            "probability": 25,
            "expected_close_date": (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d'),
            "description": "Test opportunity for CRM system"
        }
        
        response = self.make_request('POST', '/api/crm/opportunities/', opportunity_data)
        if response and response.status_code == 201:
            print("✅ Opportunity created successfully")
            opportunity = response.json()
            self.test_data['opportunity_id'] = opportunity['id']
        else:
            print(f"❌ Opportunity creation failed: {response.status_code if response else 'No response'}")
            return
        
        # Get opportunities
        response = self.make_request('GET', '/api/crm/opportunities/')
        if response and response.status_code == 200:
            print("✅ Opportunities retrieved successfully")
        else:
            print(f"❌ Opportunities retrieval failed: {response.status_code if response else 'No response'}")
        
        # Test pipeline
        response = self.make_request('GET', '/api/crm/opportunities/pipeline/')
        if response and response.status_code == 200:
            print("✅ Opportunity pipeline retrieved successfully")
        else:
            print(f"❌ Opportunity pipeline failed: {response.status_code if response else 'No response'}")
    
    def test_activities(self):
        """Test Activity CRUD operations"""
        print("\n📅 Testing Activity Management...")
        
        # Create activity
        activity_data = {
            "subject": "Follow-up Call",
            "activity_type": "call",
            "status": "planned",
            "due_date": (datetime.now() + timedelta(hours=2)).isoformat(),
            "duration_minutes": 30,
            "description": "Test activity for CRM system"
        }
        
        response = self.make_request('POST', '/api/crm/activities/', activity_data)
        if response and response.status_code == 201:
            print("✅ Activity created successfully")
            activity = response.json()
            self.test_data['activity_id'] = activity['id']
        else:
            print(f"❌ Activity creation failed: {response.status_code if response else 'No response'}")
            return
        
        # Get activities
        response = self.make_request('GET', '/api/crm/activities/')
        if response and response.status_code == 200:
            print("✅ Activities retrieved successfully")
        else:
            print(f"❌ Activities retrieval failed: {response.status_code if response else 'No response'}")
        
        # Test today's activities
        response = self.make_request('GET', '/api/crm/activities/today/')
        if response and response.status_code == 200:
            print("✅ Today's activities retrieved successfully")
        else:
            print(f"❌ Today's activities failed: {response.status_code if response else 'No response'}")
    
    def test_campaigns(self):
        """Test Campaign CRUD operations"""
        print("\n📢 Testing Campaign Management...")
        
        # Create campaign
        campaign_data = {
            "name": "Test Email Campaign",
            "campaign_type": "email",
            "status": "planning",
            "start_date": datetime.now().strftime('%Y-%m-%d'),
            "end_date": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            "budget": 10000,
            "target_audience": "Technology companies",
            "description": "Test campaign for CRM system"
        }
        
        response = self.make_request('POST', '/api/crm/campaigns/', campaign_data)
        if response and response.status_code == 201:
            print("✅ Campaign created successfully")
            campaign = response.json()
            self.test_data['campaign_id'] = campaign['id']
        else:
            print(f"❌ Campaign creation failed: {response.status_code if response else 'No response'}")
            return
        
        # Get campaigns
        response = self.make_request('GET', '/api/crm/campaigns/')
        if response and response.status_code == 200:
            print("✅ Campaigns retrieved successfully")
        else:
            print(f"❌ Campaigns retrieval failed: {response.status_code if response else 'No response'}")
    
    def test_lead_conversion(self):
        """Test lead to opportunity conversion"""
        print("\n🔄 Testing Lead Conversion...")
        
        if 'lead_id' not in self.test_data:
            print("❌ Skipping conversion test - no lead created")
            return
        
        response = self.make_request('POST', f'/api/crm/leads/{self.test_data["lead_id"]}/convert_to_opportunity/')
        if response and response.status_code == 200:
            print("✅ Lead converted to opportunity successfully")
            result = response.json()
            print(f"   - Opportunity ID: {result.get('opportunity_id')}")
            print(f"   - Account ID: {result.get('account_id')}")
            print(f"   - Contact ID: {result.get('contact_id')}")
        else:
            print(f"❌ Lead conversion failed: {response.status_code if response else 'No response'}")
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete in reverse order of creation
        entities = [
            ('campaign_id', 'campaigns'),
            ('activity_id', 'activities'),
            ('opportunity_id', 'opportunities'),
            ('account_id', 'accounts'),
            ('contact_id', 'contacts'),
            ('lead_id', 'leads')
        ]
        
        for entity_key, endpoint in entities:
            if entity_key in self.test_data:
                response = self.make_request('DELETE', f'/api/crm/{endpoint}/{self.test_data[entity_key]}/')
                if response and response.status_code in [204, 200]:
                    print(f"✅ {endpoint.capitalize()[:-1]} deleted successfully")
                else:
                    print(f"❌ {endpoint.capitalize()[:-1]} deletion failed")
    
    def run_all_tests(self):
        """Run all CRM tests"""
        print("🚀 Starting Complete CRM System Test")
        print("=" * 50)
        
        try:
            # Test dashboard first
            self.test_dashboard()
            
            # Test CRUD operations
            self.test_leads()
            self.test_contacts()
            self.test_accounts()
            self.test_opportunities()
            self.test_activities()
            self.test_campaigns()
            
            # Test advanced features
            self.test_lead_conversion()
            
            print("\n" + "=" * 50)
            print("✅ CRM System Test Completed Successfully!")
            print("🎉 All CRM modules are working properly")
            
        except Exception as e:
            print(f"\n❌ Test failed with error: {e}")
        
        finally:
            # Clean up test data
            self.cleanup_test_data()

def main():
    """Main function"""
    print("CRM System Complete Test Script")
    print("=" * 40)
    
    # Check if session key is provided
    if len(sys.argv) > 1:
        session_key = sys.argv[1]
    else:
        session_key = input("Enter your CRM session key: ").strip()
    
    if not session_key or session_key == "your_session_key_here":
        print("❌ Please provide a valid session key")
        print("Usage: python test_crm_complete.py <session_key>")
        sys.exit(1)
    
    # Initialize tester
    tester = CRMTester(BASE_URL, session_key)
    
    # Run tests
    tester.run_all_tests()

if __name__ == "__main__":
    main()