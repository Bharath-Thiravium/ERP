from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Company, MasterAdmin, CompanyUser, Service
from django.utils import timezone
from datetime import timedelta

class CompanyModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_company_creation(self):
        company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )
        self.assertEqual(company.name, "Test Company")
        self.assertEqual(company.company_prefix, "TEST")
        self.assertEqual(company.approval_status, 'pending')

    def test_company_str_method(self):
        company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST", 
            email="test@company.com",
            created_by=self.user
        )
        self.assertEqual(str(company), "Test Company")

class MasterAdminModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )

    def test_master_admin_creation(self):
        master_admin = MasterAdmin.objects.create(
            user=self.user,
            company_name="Admin Company",
            api_key="test-api-key",
            recovery_codes="[]",
            password_expires_at=timezone.now() + timedelta(days=90)
        )
        self.assertEqual(master_admin.company_name, "Admin Company")
        self.assertFalse(master_admin.is_password_expired())

class AuthAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.master_admin = MasterAdmin.objects.create(
            user=self.user,
            company_name="Test Company",
            api_key="test-api-key",
            recovery_codes="[]",
            password_expires_at=timezone.now() + timedelta(days=90)
        )

    def test_master_admin_login_invalid_credentials(self):
        response = self.client.post('/api/auth/master-admin/login/', {
            'email': 'wrong@example.com',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_service_list_requires_authentication(self):
        response = self.client.get('/api/auth/services/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class ServiceModelTest(TestCase):
    def test_service_creation(self):
        service = Service.objects.create(
            name="Finance Service",
            service_type="finance",
            description="Financial management service"
        )
        self.assertEqual(service.name, "Finance Service")
        self.assertEqual(service.service_type, "finance")
        self.assertTrue(service.is_active)