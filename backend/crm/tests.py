from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from authentication.models import Company
from .models import Lead, Contact, Account, Opportunity
from .serializers import (
    LeadSerializer, ContactSerializer, AccountSerializer, OpportunitySerializer,
    ActivitySerializer,
)
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


class _MockServiceUser:
    """Minimal stand-in for authentication.models.CompanyServiceUser for serializer-level tests."""
    def __init__(self, company, created_by=None):
        self.company = company
        self.created_by = created_by


class _MockRequest:
    """Minimal stand-in for a DRF request carrying request.service_user, as set by
    ServiceUserSessionAuthentication."""
    def __init__(self, company, created_by=None):
        self.service_user = _MockServiceUser(company, created_by)


class CRMPhase1SecurityTest(TestCase):
    """Regression tests for CRM Phase 1 critical security fixes:
    cross-company FK injection, duplicate detection, and per-company unique identifiers."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='crmphase1user', email='crmphase1@example.com', password='testpass123'
        )
        self.company_a = Company.objects.create(
            name="CRM Company A", company_prefix="CCA", email="a@crmcompany.com", created_by=self.user
        )
        self.company_b = Company.objects.create(
            name="CRM Company B", company_prefix="CCB", email="b@crmcompany.com", created_by=self.user
        )
        self.request_a = _MockRequest(self.company_a, created_by=self.user)

        self.account_a = Account.objects.create(
            company=self.company_a, account_id="ACC-A-001", name="Account A", created_by=self.user
        )
        self.account_b = Account.objects.create(
            company=self.company_b, account_id="ACC-B-001", name="Account B", created_by=self.user
        )
        self.contact_a = Contact.objects.create(
            company=self.company_a, contact_id="CONT-A-001", first_name="Alice", last_name="A",
            email="alice@a.com", created_by=self.user
        )
        self.contact_b = Contact.objects.create(
            company=self.company_b, contact_id="CONT-B-001", first_name="Bob", last_name="B",
            email="bob@b.com", created_by=self.user
        )
        self.lead_b = Lead.objects.create(
            company=self.company_b, lead_id="LEAD-B-001", first_name="Cross", last_name="Tenant",
            email="cross@b.com", created_by=self.user
        )

    def test_opportunity_serializer_rejects_cross_company_account(self):
        """A Company A caller must not be able to create an Opportunity against Company B's account."""
        serializer = OpportunitySerializer(
            data={
                'name': 'Cross-tenant Opp', 'account': self.account_b.id,
                'amount': '1000.00', 'expected_close_date': timezone.now().date().isoformat(),
            },
            context={'request': self.request_a},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('account', serializer.errors)

    def test_opportunity_serializer_rejects_cross_company_contact(self):
        """A Company A caller must not be able to link an Opportunity to Company B's contact."""
        serializer = OpportunitySerializer(
            data={
                'name': 'Cross-tenant Opp 2', 'account': self.account_a.id, 'contact': self.contact_b.id,
                'amount': '1000.00', 'expected_close_date': timezone.now().date().isoformat(),
            },
            context={'request': self.request_a},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('contact', serializer.errors)

    def test_account_serializer_rejects_cross_company_primary_contact(self):
        """A Company A caller must not be able to set Company B's contact as an Account's primary_contact."""
        serializer = AccountSerializer(
            data={'name': 'New Account', 'primary_contact': self.contact_b.id},
            context={'request': self.request_a},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('primary_contact', serializer.errors)

    def test_activity_serializer_rejects_cross_company_lead(self):
        """A Company A caller must not be able to attach an Activity to Company B's lead."""
        serializer = ActivitySerializer(
            data={
                'subject': 'Cross-tenant activity', 'activity_type': 'call',
                'lead': self.lead_b.id, 'due_date': timezone.now().isoformat(),
                'assigned_to': self.user.id,
            },
            context={'request': self.request_a},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('lead', serializer.errors)

    def test_lead_serializer_rejects_duplicate_email_same_company(self):
        """Creating a second lead with the same email in the same company must be rejected."""
        Lead.objects.create(
            company=self.company_a, lead_id="LEAD-A-DUP", first_name="First", last_name="One",
            email="dup@a.com", created_by=self.user
        )
        serializer = LeadSerializer(
            data={'first_name': 'Second', 'last_name': 'Two', 'email': 'dup@a.com'},
            context={'request': self.request_a},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_lead_serializer_allows_same_email_different_company(self):
        """The same email may exist as a Lead in two different companies (no cross-tenant leak in the check)."""
        Lead.objects.create(
            company=self.company_b, lead_id="LEAD-B-DUP", first_name="Other", last_name="Co",
            email="shared@x.com", created_by=self.user
        )
        serializer = LeadSerializer(
            data={'first_name': 'This', 'last_name': 'Co', 'email': 'shared@x.com'},
            context={'request': self.request_a},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_contact_serializer_rejects_duplicate_email_same_company(self):
        """Creating a second contact with the same email in the same company must be rejected."""
        serializer = ContactSerializer(
            data={'first_name': 'Alicia', 'last_name': 'Dup', 'email': 'alice@a.com'},
            context={'request': self.request_a},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_account_serializer_rejects_duplicate_name_same_company(self):
        """Creating a second account with the same (case-insensitive) name in the same company is rejected."""
        serializer = AccountSerializer(
            data={'name': 'account a'},
            context={'request': self.request_a},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)

    def test_opportunity_serializer_rejects_duplicate_name_for_same_account(self):
        """Creating a second opportunity with the same name against the same account is rejected."""
        Opportunity.objects.create(
            company=self.company_a, opportunity_id="OPP-A-001", name="Renewal Deal",
            account=self.account_a, amount=Decimal('500.00'),
            expected_close_date=timezone.now().date(), owner=self.user, created_by=self.user
        )
        serializer = OpportunitySerializer(
            data={
                'name': 'Renewal Deal', 'account': self.account_a.id, 'owner': self.user.id,
                'amount': '750.00', 'expected_close_date': timezone.now().date().isoformat(),
            },
            context={'request': self.request_a},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)

    def test_lead_id_unique_per_company_not_globally(self):
        """Two different companies may each have a lead with the same lead_id."""
        Lead.objects.create(
            company=self.company_a, lead_id="LEAD-SHARED-001", first_name="A", last_name="Co",
            email="a-shared@a.com", created_by=self.user
        )
        # Should NOT raise IntegrityError even though lead_id matches company_a's lead
        Lead.objects.create(
            company=self.company_b, lead_id="LEAD-SHARED-001", first_name="B", last_name="Co",
            email="b-shared@b.com", created_by=self.user
        )
        self.assertEqual(Lead.objects.filter(lead_id="LEAD-SHARED-001").count(), 2)

    def test_lead_id_still_unique_within_same_company(self):
        """The same lead_id cannot be reused twice within the same company."""
        Lead.objects.create(
            company=self.company_a, lead_id="LEAD-DUPID-001", first_name="A", last_name="One",
            email="one@a.com", created_by=self.user
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Lead.objects.create(
                    company=self.company_a, lead_id="LEAD-DUPID-001", first_name="A", last_name="Two",
                    email="two@a.com", created_by=self.user
                )

    def _build_view_request(self, path='/api/crm/leads/1/convert_to_opportunity/'):
        """Build a real DRF Request (so filter backends/query_params work) with
        request.service_user attached, as ServiceUserSessionAuthentication would."""
        from rest_framework.test import APIRequestFactory
        from rest_framework.request import Request
        factory = APIRequestFactory()
        django_request = factory.post(path, {})
        request = Request(django_request)
        request.service_user = _MockServiceUser(self.company_a, created_by=self.user)
        return request

    def test_lead_conversion_end_to_end(self):
        """Full LeadViewSet.convert_to_opportunity flow: creates Account, Contact, and
        Opportunity atomically and marks the Lead as won."""
        from .viewsets import LeadViewSet

        lead = Lead.objects.create(
            company=self.company_a, lead_id="LEAD-CONV-001", first_name="Conv", last_name="Ertme",
            email="convert@a.com", company_name="ConvertCo", estimated_value=Decimal('5000.00'),
            created_by=self.user
        )

        request = self._build_view_request()
        view = LeadViewSet()
        view.kwargs = {'pk': lead.pk}
        view.request = request
        view.format_kwarg = None

        response = view.convert_to_opportunity(request, pk=lead.pk)

        self.assertEqual(response.status_code, 200)
        lead.refresh_from_db()
        self.assertEqual(lead.status, 'won')

        created_account = Account.objects.get(name="ConvertCo")
        self.assertEqual(created_account.company_id, self.company_a.id)

        created_contact = Contact.objects.get(email="convert@a.com")
        self.assertEqual(created_contact.company_id, self.company_a.id)

        created_opportunity = Opportunity.objects.get(account=created_account)
        self.assertEqual(created_opportunity.company_id, self.company_a.id)
        self.assertEqual(created_opportunity.amount, Decimal('5000.00'))

    def test_lead_conversion_rejects_already_converted_lead(self):
        """Converting an already-won lead a second time must be rejected, not silently duplicate records."""
        from .viewsets import LeadViewSet

        lead = Lead.objects.create(
            company=self.company_a, lead_id="LEAD-CONV-002", first_name="Already", last_name="Won",
            email="already-won@a.com", status='won', created_by=self.user
        )

        request = self._build_view_request()
        view = LeadViewSet()
        view.kwargs = {'pk': lead.pk}
        view.request = request
        view.format_kwarg = None

        response = view.convert_to_opportunity(request, pk=lead.pk)
        self.assertEqual(response.status_code, 400)

    def test_viewset_queryset_excludes_other_company_data(self):
        """CompanyScopedModelViewSet.get_queryset() must never return another company's rows."""
        from .viewsets import LeadViewSet, AccountViewSet
        from django.http import Http404

        Lead.objects.create(
            company=self.company_a, lead_id="LEAD-ISO-001", first_name="A", last_name="Iso",
            email="iso-a@a.com", created_by=self.user
        )
        lead_b = Lead.objects.create(
            company=self.company_b, lead_id="LEAD-ISO-002", first_name="B", last_name="Iso",
            email="iso-b@b.com", created_by=self.user
        )

        request = self._build_view_request()
        view = LeadViewSet()
        view.request = request
        view.format_kwarg = None
        queryset = view.get_queryset()

        self.assertTrue(queryset.filter(lead_id="LEAD-ISO-001").exists())
        self.assertFalse(queryset.filter(lead_id="LEAD-ISO-002").exists())

        # Company A must not be able to retrieve Company B's account by ID (404, not the object)
        view2 = AccountViewSet()
        view2.request = request
        view2.format_kwarg = None
        view2.kwargs = {'pk': self.account_b.pk}
        with self.assertRaises(Http404):
            view2.get_object()