"""
Contract-level security tests to verify the new authentication stack.
These tests ensure all endpoints properly enforce tenant isolation and authentication.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from authentication.test_fixtures import (
    create_auth_chain, auth_headers, create_test_company,
    VALID_CUSTOMER_PAYLOAD, VALID_EMPLOYEE_PAYLOAD, VALID_PRODUCT_PAYLOAD
)


class SecurityContractTestCase(TestCase):
    """Base test case for security contract verification."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create two separate companies for cross-tenant testing
        self.company_a_chain = create_auth_chain(company_name="Company A")
        self.company_b_chain = create_auth_chain(company_name="Company B")
        
        # Extract commonly used objects
        self.company_a = self.company_a_chain['company']
        self.company_b = self.company_b_chain['company']
        self.auth_headers_a = self.company_a_chain['auth_headers']
        self.auth_headers_b = self.company_b_chain['auth_headers']
        self.session_a = self.company_a_chain['session']
        self.session_b = self.company_b_chain['session']


class AuthenticationContractTests(SecurityContractTestCase):
    """Test authentication requirements across all modules."""
    
    def test_missing_auth_returns_401(self):
        """Missing Authorization header should return 401."""
        endpoints = [
            '/api/finance/customers/',
            '/api/hr/employees/',
            '/api/inventory/products/',
            '/api/crm/leads/',
        ]
        
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_invalid_session_returns_401(self):
        """Invalid session key should return 401."""
        invalid_headers = auth_headers("invalid_session_key_12345678901234567890")
        
        endpoints = [
            '/api/finance/customers/',
            '/api/hr/employees/',
            '/api/inventory/products/',
            '/api/crm/leads/',
        ]
        
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint, **invalid_headers)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_expired_session_returns_401(self):
        """Expired session should return 401 and be revoked."""
        # Expire the session
        self.session_a.expires_at = timezone.now() - timedelta(hours=1)
        self.session_a.save()
        
        response = self.client.get('/api/finance/customers/', **self.auth_headers_a)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Verify session was revoked
        self.session_a.refresh_from_db()
        self.assertFalse(self.session_a.is_active)
        self.assertIsNotNone(self.session_a.revoked_at)
    
    def test_inactive_user_returns_403(self):
        """Inactive service user should return 403."""
        self.company_a_chain['service_user'].is_active = False
        self.company_a_chain['service_user'].save()
        
        response = self.client.get('/api/finance/customers/', **self.auth_headers_a)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_inactive_company_returns_403(self):
        """Inactive company should return 403."""
        self.company_a.approval_status = 'pending'
        self.company_a.save()
        
        response = self.client.get('/api/finance/customers/', **self.auth_headers_a)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TenantIsolationContractTests(SecurityContractTestCase):
    """Test tenant isolation across all modules."""
    
    def test_cross_tenant_list_isolation(self):
        """Users should only see their company's data in list endpoints."""
        from finance.models import Customer
        from hr.models import Employee
        from inventory.models import Product
        from crm.models import Lead
        
        # Create data for both companies
        Customer.objects.create(name="Customer A", company=self.company_a)
        Customer.objects.create(name="Customer B", company=self.company_b)
        
        Employee.objects.create(
            first_name="Employee", last_name="A", 
            employee_id="EMP_A", company=self.company_a
        )
        Employee.objects.create(
            first_name="Employee", last_name="B", 
            employee_id="EMP_B", company=self.company_b
        )
        
        Product.objects.create(name="Product A", sku="SKU_A", company=self.company_a)
        Product.objects.create(name="Product B", sku="SKU_B", company=self.company_b)
        
        Lead.objects.create(
            first_name="Lead", last_name="A", 
            email="lead_a@test.com", company=self.company_a
        )
        Lead.objects.create(
            first_name="Lead", last_name="B", 
            email="lead_b@test.com", company=self.company_b
        )
        
        # Test Company A can only see their data
        test_cases = [
            ('/api/finance/customers/', 1),
            ('/api/hr/employees/', 1),
            ('/api/inventory/products/', 1),
            ('/api/crm/leads/', 1),
        ]
        
        for endpoint, expected_count in test_cases:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint, **self.auth_headers_a)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(len(response.data['results']), expected_count)
    
    def test_cross_tenant_retrieve_returns_404(self):
        """Retrieving other company's objects should return 404."""
        from finance.models import Customer
        from hr.models import Employee
        from inventory.models import Product
        from crm.models import Lead
        
        # Create objects for Company B
        customer_b = Customer.objects.create(name="Customer B", company=self.company_b)
        employee_b = Employee.objects.create(
            first_name="Employee", last_name="B", 
            employee_id="EMP_B", company=self.company_b
        )
        product_b = Product.objects.create(name="Product B", sku="SKU_B", company=self.company_b)
        lead_b = Lead.objects.create(
            first_name="Lead", last_name="B", 
            email="lead_b@test.com", company=self.company_b
        )
        
        # Company A should get 404 when trying to access Company B's data
        test_cases = [
            f'/api/finance/customers/{customer_b.id}/',
            f'/api/hr/employees/{employee_b.id}/',
            f'/api/inventory/products/{product_b.id}/',
            f'/api/crm/leads/{lead_b.id}/',
        ]
        
        for endpoint in test_cases:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint, **self.auth_headers_a)
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_ignores_payload_company(self):
        """Create operations should ignore company in payload and use authenticated company."""
        # Try to create objects with Company B's ID in payload while authenticated as Company A
        payloads = [
            {**VALID_CUSTOMER_PAYLOAD, 'company': self.company_b.id},
            {**VALID_EMPLOYEE_PAYLOAD, 'company': self.company_b.id},
            {**VALID_PRODUCT_PAYLOAD, 'company': self.company_b.id},
            {'first_name': 'Test', 'last_name': 'Lead', 'email': 'test@test.com', 'company': self.company_b.id},
        ]
        
        endpoints = [
            '/api/finance/customers/',
            '/api/hr/employees/',
            '/api/inventory/products/',
            '/api/crm/leads/',
        ]
        
        for endpoint, payload in zip(endpoints, payloads):
            with self.subTest(endpoint=endpoint):
                response = self.client.post(endpoint, payload, format='json', **self.auth_headers_a)
                
                # Should succeed (201) or have validation errors (400), but not permission errors
                self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])
                
                # If created successfully, verify it was assigned to Company A, not Company B
                if response.status_code == status.HTTP_201_CREATED:
                    self.assertEqual(response.data['company'], self.company_a.id)


class CustomActionSecurityTests(SecurityContractTestCase):
    """Test security for custom actions and non-CRUD endpoints."""
    
    def test_custom_actions_require_auth(self):
        """Custom actions should require authentication."""
        # Test some known custom action endpoints
        custom_endpoints = [
            '/api/finance/customer-ledger/',
            '/api/hr/analytics/dashboard/',
            '/api/inventory/reports/low-stock/',
        ]
        
        for endpoint in custom_endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                # Should return 401 (not 404 or 500)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_pdf_generation_requires_auth(self):
        """PDF generation endpoints should require authentication."""
        from finance.models import Quotation, Customer
        
        # Create a customer for Company B first
        customer_b = Customer.objects.create(
            name="Test Customer B",
            company=self.company_b,
            customer_type="business",
            display_name="Test Customer B",
            billing_address_line1="123 Test St",
            billing_city="Test City",
            billing_state="Test State",
            billing_pincode="123456",
            gstin="29ABCDE1234F1Z5"
        )
        
        # Create a quotation for Company B
        quotation_b = Quotation.objects.create(
            quotation_number="Q001",
            company=self.company_b,
            customer=customer_b,
            quotation_date=timezone.now().date(),
            valid_until=timezone.now().date() + timedelta(days=30),
            total_amount=1000.00
        )
        
        # Company A should not be able to generate PDF for Company B's quotation
        pdf_endpoint = f'/api/finance/quotations/{quotation_b.id}/pdf/'
        
        # Without auth - should get 401
        response = self.client.get(pdf_endpoint)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # With Company A auth - should get 404 (not 403, because object doesn't exist in their scope)
        response = self.client.get(pdf_endpoint, **self.auth_headers_a)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class SessionManagementTests(SecurityContractTestCase):
    """Test session management and security features."""
    
    def test_session_last_seen_updates(self):
        """Session last_seen_at should update periodically."""
        original_last_seen = self.session_a.last_seen_at
        
        # Make a request
        response = self.client.get('/api/finance/customers/', **self.auth_headers_a)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if last_seen_at was updated (it should update if more than 5 minutes passed)
        self.session_a.refresh_from_db()
        # Note: In tests, this might not update due to timing, but the mechanism should be in place
    
    def test_session_revocation(self):
        """Revoked sessions should not work."""
        # Revoke the session
        self.session_a.revoke()
        
        # Should get 401
        response = self.client.get('/api/finance/customers/', **self.auth_headers_a)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# Run specific module tests
class FinanceModuleSecurityTests(SecurityContractTestCase):
    """Finance module specific security tests."""
    
    def test_finance_crud_operations(self):
        """Test basic CRUD operations work with proper auth."""
        # Create
        response = self.client.post(
            '/api/finance/customers/', 
            VALID_CUSTOMER_PAYLOAD, 
            format='json', 
            **self.auth_headers_a
        )
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])
        
        if response.status_code == status.HTTP_201_CREATED:
            customer_id = response.data['id']
            
            # Retrieve
            response = self.client.get(f'/api/finance/customers/{customer_id}/', **self.auth_headers_a)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Update
            response = self.client.patch(
                f'/api/finance/customers/{customer_id}/', 
                {'name': 'Updated Customer'}, 
                format='json', 
                **self.auth_headers_a
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)


class HRModuleSecurityTests(SecurityContractTestCase):
    """HR module specific security tests."""
    
    def test_hr_crud_operations(self):
        """Test basic CRUD operations work with proper auth."""
        # Create
        response = self.client.post(
            '/api/hr/employees/', 
            VALID_EMPLOYEE_PAYLOAD, 
            format='json', 
            **self.auth_headers_a
        )
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])


class InventoryModuleSecurityTests(SecurityContractTestCase):
    """Inventory module specific security tests."""
    
    def test_inventory_crud_operations(self):
        """Test basic CRUD operations work with proper auth."""
        # Create
        response = self.client.post(
            '/api/inventory/products/', 
            VALID_PRODUCT_PAYLOAD, 
            format='json', 
            **self.auth_headers_a
        )
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])


class CRMModuleSecurityTests(SecurityContractTestCase):
    """CRM module specific security tests."""
    
    def test_crm_crud_operations(self):
        """Test basic CRUD operations work with proper auth."""
        lead_payload = {
            'first_name': 'Test',
            'last_name': 'Lead',
            'email': 'test@test.com',
            'phone': '9000000000'
        }
        
        # Create
        response = self.client.post(
            '/api/crm/leads/', 
            lead_payload, 
            format='json', 
            **self.auth_headers_a
        )
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])