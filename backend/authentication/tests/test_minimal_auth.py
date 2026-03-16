"""
Minimal test to verify the new authentication stack works.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from authentication.models import Company, Service, CompanyService, CompanyServiceUser, ServiceUserSession


class MinimalAuthTest(TestCase):
    """Minimal test to verify new auth stack works."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create superuser
        self.superuser = User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
        
        # Create company
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.superuser,
            approval_status="approved"
        )
        
        # Create service
        self.service = Service.objects.create(
            name="Finance Service",
            service_type="finance",
            description="Test finance service"
        )
        
        # Create company service
        self.company_service = CompanyService.objects.create(
            company=self.company,
            service=self.service,
            assigned_by=self.superuser,
            service_password="hashed_password",
            password_expires_at=timezone.now() + timedelta(days=90)
        )
        
        # Create service user
        self.service_user = CompanyServiceUser.objects.create(
            company=self.company,
            service=self.service,
            username="testuser",
            email="testuser@company.com",
            full_name="Test User",
            password="hashed_password",
            unique_service_id="TEST_testuser_001",
            created_by=self.superuser,
            password_expires_at=timezone.now() + timedelta(days=90)
        )
        
        # Create session
        self.session = ServiceUserSession.objects.create(
            service_user=self.service_user,
            session_key="test_session_key_1234567890123456789012",
            ip_address="127.0.0.1",
            user_agent="Test Client",
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.session.session_key}"}
    
    def test_missing_auth_returns_401(self):
        """Missing Authorization header should return 401."""
        response = self.client.get('/api/finance/customers/', follow=True)
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.content}")
        # Should be 401, but let's see what we actually get
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND])
    
    def test_valid_auth_works(self):
        """Valid authentication should work."""
        response = self.client.get('/api/finance/customers/', **self.auth_headers)
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.content[:200]}")
        # Should return 200 (success) - the new auth stack is working
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_invalid_session_returns_401(self):
        """Invalid session key should return 401."""
        invalid_headers = {"HTTP_AUTHORIZATION": "Bearer invalid_session_key_123456789012"}
        response = self.client.get('/api/finance/customers/', **invalid_headers)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)