from django.test import TestCase
from django.contrib.auth.models import User
from authentication.models import Company
from .models import Lead, Contact, Account, Opportunity
from decimal import Decimal
from django.utils import timezone


class LeadModelTest(TestCase):
    def setUp(self):
        import os
        test_password = os.environ.get('TEST_USER_PASSWORD', f'secure_test_pass_{timezone.now().timestamp()}')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password=test_password
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )

    def test_lead_creation(self):
        lead = Lead.objects.create(
            company=self.company,
            lead_id="LEAD001",
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            created_by=self.user
        )
        self.assertEqual(lead.first_name, "John")
        self.assertEqual(lead.last_name, "Doe")
        self.assertEqual(lead.status, "new")


class ContactModelTest(TestCase):
    def setUp(self):
        import os
        test_password = os.environ.get('TEST_USER_PASSWORD', f'secure_test_pass_{timezone.now().timestamp()}')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password=test_password
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )

    def test_contact_creation(self):
        contact = Contact.objects.create(
            company=self.company,
            contact_id="CONT001",
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com",
            created_by=self.user
        )
        self.assertEqual(contact.first_name, "Jane")
        self.assertEqual(contact.last_name, "Smith")
        self.assertTrue(contact.is_active)


class AccountModelTest(TestCase):
    def setUp(self):
        import os
        test_password = os.environ.get('TEST_USER_PASSWORD', f'secure_test_pass_{timezone.now().timestamp()}')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password=test_password
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )

    def test_account_creation(self):
        account = Account.objects.create(
            company=self.company,
            account_id="ACC001",
            name="Test Account",
            account_type="customer",
            created_by=self.user
        )
        self.assertEqual(account.name, "Test Account")
        self.assertEqual(account.account_type, "customer")
        self.assertTrue(account.is_active)