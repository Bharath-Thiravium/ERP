from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from authentication.models import Company, Service, CompanyService
from .models import Lead, Contact, Account, Opportunity, Activity, Campaign
import json


class CRMModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.company = Company.objects.create(
            name='Test Company',
            company_prefix='TEST',
            email='company@test.com',
            created_by=self.user
        )

    def test_lead_creation(self):
        lead = Lead.objects.create(
            company=self.company,
            lead_id='TESTLEAD001',
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            status='new',
            priority='medium',
            source='website',
            created_by=self.user
        )
        
        self.assertEqual(lead.first_name, 'John')
        self.assertEqual(lead.last_name, 'Doe')
        self.assertEqual(lead.status, 'new')
        self.assertEqual(str(lead), 'John Doe - ')

    def test_contact_creation(self):
        contact = Contact.objects.create(
            company=self.company,
            contact_id='TESTCON001',
            first_name='Jane',
            last_name='Smith',
            email='jane@example.com',
            created_by=self.user
        )
        
        self.assertEqual(contact.first_name, 'Jane')
        self.assertEqual(contact.last_name, 'Smith')
        self.assertEqual(str(contact), 'Jane Smith')

    def test_account_creation(self):
        account = Account.objects.create(
            company=self.company,
            account_id='TESTACC001',
            name='Test Account Inc',
            account_type='prospect',
            industry='technology',
            created_by=self.user
        )
        
        self.assertEqual(account.name, 'Test Account Inc')
        self.assertEqual(account.account_type, 'prospect')
        self.assertEqual(str(account), 'Test Account Inc')

    def test_opportunity_creation(self):
        account = Account.objects.create(
            company=self.company,
            account_id='TESTACC001',
            name='Test Account Inc',
            created_by=self.user
        )
        
        opportunity = Opportunity.objects.create(
            company=self.company,
            opportunity_id='TESTOPP001',
            name='Test Opportunity',
            account=account,
            stage='prospecting',
            amount=50000,
            probability=25,
            expected_close_date='2024-12-31',
            owner=self.user,
            created_by=self.user
        )
        
        self.assertEqual(opportunity.name, 'Test Opportunity')
        self.assertEqual(opportunity.amount, 50000)
        self.assertEqual(opportunity.weighted_amount, 12500)  # 50000 * 0.25


class CRMAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.company = Company.objects.create(
            name='Test Company',
            company_prefix='TEST',
            email='company@test.com',
            created_by=self.user
        )
        
        # Create CRM service
        self.service = Service.objects.create(
            name='CRM Service',
            service_type='crm',
            description='Test CRM Service'
        )
        
        # Assign service to company
        CompanyService.objects.create(
            company=self.company,
            service=self.service,
            assigned_by=self.user,
            service_password='hashed_password',
            password_expires_at='2024-12-31'
        )
        
        self.client.force_authenticate(user=self.user)

    def test_dashboard_stats(self):
        url = reverse('dashboard-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_leads', response.data)
        self.assertIn('total_opportunities', response.data)
        self.assertIn('total_accounts', response.data)
        self.assertIn('total_contacts', response.data)

    def test_create_lead(self):
        url = reverse('lead-list')
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john@example.com',
            'status': 'new',
            'priority': 'medium',
            'source': 'website'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Lead.objects.count(), 1)
        lead = Lead.objects.first()
        self.assertEqual(lead.first_name, 'John')
        self.assertTrue(lead.lead_id.startswith('TEST'))

    def test_create_contact(self):
        url = reverse('contact-list')
        data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane@example.com',
            'job_title': 'Manager'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Contact.objects.count(), 1)
        contact = Contact.objects.first()
        self.assertEqual(contact.first_name, 'Jane')
        self.assertTrue(contact.contact_id.startswith('TEST'))

    def test_create_account(self):
        url = reverse('account-list')
        data = {
            'name': 'Test Account Inc',
            'account_type': 'prospect',
            'industry': 'technology',
            'email': 'contact@testaccount.com'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Account.objects.count(), 1)
        account = Account.objects.first()
        self.assertEqual(account.name, 'Test Account Inc')
        self.assertTrue(account.account_id.startswith('TEST'))

    def test_create_opportunity(self):
        # First create an account
        account = Account.objects.create(
            company=self.company,
            account_id='TESTACC001',
            name='Test Account Inc',
            created_by=self.user
        )
        
        url = reverse('opportunity-list')
        data = {
            'name': 'Test Opportunity',
            'account': account.id,
            'stage': 'prospecting',
            'amount': 50000,
            'probability': 25,
            'expected_close_date': '2024-12-31',
            'owner': self.user.id
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Opportunity.objects.count(), 1)
        opportunity = Opportunity.objects.first()
        self.assertEqual(opportunity.name, 'Test Opportunity')
        self.assertTrue(opportunity.opportunity_id.startswith('TEST'))

    def test_lead_conversion(self):
        # Create a lead
        lead = Lead.objects.create(
            company=self.company,
            lead_id='TESTLEAD001',
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            company_name='John Corp',
            estimated_value=25000,
            created_by=self.user
        )
        
        url = reverse('lead-convert-to-opportunity', kwargs={'pk': lead.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if account, contact, and opportunity were created
        self.assertEqual(Account.objects.count(), 1)
        self.assertEqual(Contact.objects.count(), 1)
        self.assertEqual(Opportunity.objects.count(), 1)
        
        # Check lead status updated
        lead.refresh_from_db()
        self.assertEqual(lead.status, 'won')

    def test_opportunity_stage_update(self):
        # Create account and opportunity
        account = Account.objects.create(
            company=self.company,
            account_id='TESTACC001',
            name='Test Account Inc',
            created_by=self.user
        )
        
        opportunity = Opportunity.objects.create(
            company=self.company,
            opportunity_id='TESTOPP001',
            name='Test Opportunity',
            account=account,
            stage='prospecting',
            amount=50000,
            probability=25,
            expected_close_date='2024-12-31',
            owner=self.user,
            created_by=self.user
        )
        
        url = reverse('opportunity-update-stage', kwargs={'pk': opportunity.pk})
        data = {'stage': 'qualification'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.stage, 'qualification')

    def test_activity_completion(self):
        activity = Activity.objects.create(
            company=self.company,
            activity_id='TESTACT001',
            subject='Test Call',
            activity_type='call',
            status='planned',
            due_date='2024-01-15 10:00:00',
            assigned_to=self.user,
            created_by=self.user
        )
        
        url = reverse('activity-complete', kwargs={'pk': activity.pk})
        data = {'outcome': 'Successful call, follow up scheduled'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, 'completed')
        self.assertEqual(activity.outcome, 'Successful call, follow up scheduled')
        self.assertIsNotNone(activity.completed_at)