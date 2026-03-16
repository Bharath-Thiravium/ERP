from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from authentication.models import Company, Service, CompanyServiceUser, ServiceUserSession
from finance.models import Customer, Product
import secrets

from tests_common.factories import (
    create_auth_chain, create_company, create_service_user_session,
    create_company_service_user, auth_headers, create_user
)
from tests_common.payloads import VALID_CUSTOMER_PAYLOAD


class ServiceUserAuthenticationTest(APITestCase):
    """Test the new ServiceUserSessionAuthentication system"""
    
    def setUp(self):
        # Create test companies using factories
        self.auth_chain1 = create_auth_chain(company_name="Test Company 1")
        self.auth_chain2 = create_auth_chain(company_name="Test Company 2")
        
        self.company1 = self.auth_chain1['company']
        self.company2 = self.auth_chain2['company']
        self.service_user1 = self.auth_chain1['service_user']
        self.service_user2 = self.auth_chain2['service_user']
        self.session1 = self.auth_chain1['session']
        self.session2 = self.auth_chain2['session']
        
        # Create test data for each company using valid payloads
        customer_data = VALID_CUSTOMER_PAYLOAD.copy()
        customer_data.update({
            'company': self.company1,
            'name': 'Customer 1',
            'customer_code': 'CUST001',
            'email': 'customer1@test.com',
            'created_by': self.service_user1
        })
        self.customer1 = Customer.objects.create(**customer_data)
        
        customer_data.update({
            'company': self.company2,
            'name': 'Customer 2',
            'customer_code': 'CUST002',
            'email': 'customer2@test.com',
            'created_by': self.service_user2
        })
        self.customer2 = Customer.objects.create(**customer_data)
    
    def test_no_authorization_header_returns_401(self):
        """Test that missing Authorization header returns 401"""
        url = '/api/finance/customers/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Authentication credentials were not provided', str(response.data))
    
    def test_wrong_scheme_returns_401(self):
        """Test that wrong auth scheme (e.g., 'Token x') returns 401"""
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION='Token invalid_token')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_invalid_session_key_returns_401(self):
        """Test that invalid session key returns 401"""
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Invalid or expired session', str(response.data))
    
    def test_expired_session_returns_401_and_revokes_session(self):
        """Test that expired session returns 401 and session becomes inactive"""
        from django.utils import timezone
        from datetime import timedelta
        
        # Set session as expired
        self.session1.expires_at = timezone.now() - timedelta(hours=1)
        self.session1.save()
        
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session1.session_key}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Session expired', str(response.data))
        
        # Verify session was marked as inactive and revoked
        self.session1.refresh_from_db()
        self.assertFalse(self.session1.is_active)
        self.assertIsNotNone(self.session1.revoked_at)
    
    def test_valid_session_succeeds_and_data_is_company_scoped(self):
        """Test that valid session succeeds and data is company-scoped"""
        url = '/api/finance/customers/'
        
        # Test company 1 user can only see company 1 customers
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session1.session_key}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should only see 1 customer (their company's)
        if 'results' in response.data:
            self.assertEqual(len(response.data['results']), 1)
            self.assertEqual(response.data['results'][0]['name'], 'Customer 1')
        else:
            self.assertEqual(len(response.data), 1)
            self.assertEqual(response.data[0]['name'], 'Customer 1')
    
    def test_post_with_company_payload_saves_under_session_company(self):
        """Test that POST with company in payload still saves under session company"""
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session1.session_key}')
        
        # Use valid payload and try to set different company
        data = VALID_CUSTOMER_PAYLOAD.copy()
        data.update({
            'name': 'Malicious Customer',
            'email': 'malicious@test.com',
            'company': self.company2.id  # Try to set different company
        })
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify customer was created under company1, not company2 - use response data
        customer_id = response.data['id']
        created_customer = Customer.objects.get(id=customer_id)
        self.assertEqual(created_customer.company, self.company1)
        self.assertNotEqual(created_customer.company, self.company2)
        
        # Verify customer_code is present and follows expected pattern
        self.assertIsNotNone(created_customer.customer_code)
        self.assertTrue(len(created_customer.customer_code) > 0)
    
    def test_cross_tenant_object_access_returns_404(self):
        """Test that cross-tenant object access returns 404 for retrieve/update/delete"""
        # Try to access company 2's customer with company 1's token
        url = f'/api/finance/customers/{self.customer2.id}/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session1.session_key}')
        
        # Test retrieve
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Test update
        response = self.client.patch(url, {'name': 'Updated Name'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Test delete
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_last_seen_at_updates_periodically(self):
        """Test that last_seen_at updates only periodically to avoid per-request writes"""
        from django.utils import timezone
        from datetime import timedelta
        
        # Set last_seen_at to old time
        old_time = timezone.now() - timedelta(minutes=10)
        self.session1.last_seen_at = old_time
        self.session1.save()
        
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session1.session_key}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify last_seen_at was updated
        self.session1.refresh_from_db()
        self.assertGreater(self.session1.last_seen_at, old_time)
    
    def test_inactive_service_user_returns_403(self):
        """Test that inactive service user returns 403"""
        # Deactivate service user
        self.service_user1.is_active = False
        self.service_user1.save()
        
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session1.session_key}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Service user inactive', str(response.data))
    
    def test_inactive_company_returns_403(self):
        """Test that inactive company returns 403"""
        # Set company as not approved
        self.company1.approval_status = 'suspended'
        self.company1.save()
        
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session1.session_key}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Company inactive', str(response.data))


class CompanyScopedViewSetTest(APITestCase):
    """Test the CompanyScopedModelViewSet functionality"""
    
    def setUp(self):
        # Use factory for proper setup
        self.auth_chain = create_auth_chain(company_name="Test Company")
        self.company = self.auth_chain['company']
        self.service_user = self.auth_chain['service_user']
        self.session = self.auth_chain['session']
    
    def test_created_by_is_automatically_set(self):
        """Test that created_by is automatically set to the service user"""
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session.session_key}')
        
        data = VALID_CUSTOMER_PAYLOAD.copy()
        data.update({
            'name': 'Test Customer',
            'email': 'test@customer.com'
        })
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify created_by was set automatically - use response data instead of hardcoded customer_code
        customer_id = response.data['id']
        customer = Customer.objects.get(id=customer_id)
        self.assertEqual(customer.created_by, self.service_user)
        
        # Verify customer_code is present and follows expected pattern
        self.assertIsNotNone(customer.customer_code)
        self.assertTrue(len(customer.customer_code) > 0)
    
    def test_company_is_automatically_set(self):
        """Test that company is automatically set from the service user"""
        url = '/api/finance/customers/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session.session_key}')
        
        data = VALID_CUSTOMER_PAYLOAD.copy()
        data.update({
            'name': 'Test Customer',
            'email': 'test@customer.com'
        })
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify company was set automatically - use response data instead of hardcoded customer_code
        customer_id = response.data['id']
        customer = Customer.objects.get(id=customer_id)
        self.assertEqual(customer.company, self.company)
        
        # Verify customer_code is present and follows expected pattern
        self.assertIsNotNone(customer.customer_code)
        self.assertTrue(len(customer.customer_code) > 0)


class TenantIsolationIntegrationTest(APITestCase):
    """Integration tests for complete tenant isolation"""
    
    def setUp(self):
        # Create multiple companies with data using factories
        self.auth_chain_a = create_auth_chain(company_name="Company A")
        self.auth_chain_b = create_auth_chain(company_name="Company B")
        
        self.company_a = self.auth_chain_a['company']
        self.company_b = self.auth_chain_b['company']
        self.user_a = self.auth_chain_a['service_user']
        self.user_b = self.auth_chain_b['service_user']
        self.session_a = self.auth_chain_a['session']
        self.session_b = self.auth_chain_b['session']
        
        # Create test data for each company using valid payloads
        customer_data_a = VALID_CUSTOMER_PAYLOAD.copy()
        customer_data_a.update({
            'company': self.company_a,
            'name': 'Customer A',
            'customer_code': 'CUSTA001',
            'email': 'customera@test.com',
            'created_by': self.user_a
        })
        self.customer_a = Customer.objects.create(**customer_data_a)
        
        customer_data_b = VALID_CUSTOMER_PAYLOAD.copy()
        customer_data_b.update({
            'company': self.company_b,
            'name': 'Customer B',
            'customer_code': 'CUSTB001',
            'email': 'customerb@test.com',
            'created_by': self.user_b
        })
        self.customer_b = Customer.objects.create(**customer_data_b)
    
    def test_complete_tenant_isolation(self):
        """Test complete isolation between tenants across all operations"""
        
        # Test LIST operations
        url = '/api/finance/customers/'
        
        # Company A should only see their customers
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session_a.session_key}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        if 'results' in response.data:
            customer_names = [c['name'] for c in response.data['results']]
        else:
            customer_names = [c['name'] for c in response.data]
            
        self.assertIn('Customer A', customer_names)
        self.assertNotIn('Customer B', customer_names)
        
        # Company B should only see their customers
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session_b.session_key}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        if 'results' in response.data:
            customer_names = [c['name'] for c in response.data['results']]
        else:
            customer_names = [c['name'] for c in response.data]
            
        self.assertIn('Customer B', customer_names)
        self.assertNotIn('Customer A', customer_names)
        
        # Test RETRIEVE operations - cross-tenant access should fail
        url_a = f'/api/finance/customers/{self.customer_a.id}/'
        url_b = f'/api/finance/customers/{self.customer_b.id}/'
        
        # Company A can access their own customer
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session_a.session_key}')
        response = self.client.get(url_a)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # But cannot access Company B's customer
        response = self.client.get(url_b)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Test CREATE operations - data should be isolated
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session_a.session_key}')
        data = VALID_CUSTOMER_PAYLOAD.copy()
        data.update({
            'name': 'New Customer A',
            'email': 'newcustomera@test.com'
        })
        response = self.client.post('/api/finance/customers/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify it was created under Company A - use response data
        customer_id = response.data['id']
        new_customer = Customer.objects.get(id=customer_id)
        self.assertEqual(new_customer.company, self.company_a)
        self.assertEqual(new_customer.created_by, self.user_a)
        
        # Verify customer_code is present and follows expected pattern
        self.assertIsNotNone(new_customer.customer_code)
        self.assertTrue(len(new_customer.customer_code) > 0)
        
        # Company B should not see this new customer
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session_b.session_key}')
        response = self.client.get('/api/finance/customers/')
        
        if 'results' in response.data:
            customer_ids = [c['id'] for c in response.data['results']]
        else:
            customer_ids = [c['id'] for c in response.data]
            
        self.assertNotIn(new_customer.id, customer_ids)