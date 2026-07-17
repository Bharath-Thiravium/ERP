from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.models import Company, CompanyServiceUser, Service, ServiceUserSession
from company_dashboard.models import CompanyNotification
from hr.models import Department, Designation, JobApplication, JobPosting
from hr.offer_models import JobOffer


class PublicOfferResponseTest(TestCase):
    def setUp(self):
        owner = User.objects.create_user('offer-owner', password='test-password')
        self.company = Company.objects.create(
            name='Offer Test Company',
            company_prefix='OTC',
            email='hr@example.com',
            created_by=owner,
            approval_status='approved',
        )
        department = Department.objects.create(
            company=self.company,
            name='Engineering',
            code='ENG',
        )
        designation = Designation.objects.create(
            company=self.company,
            department=department,
            title='Developer',
            code='DEV',
        )
        job = JobPosting.objects.create(
            company=self.company,
            title='Developer',
            department=department,
            designation=designation,
            description='Build software',
            requirements='Python',
            responsibilities='Development',
            status='active',
        )
        self.application = JobApplication.objects.create(
            job_posting=job,
            first_name='Candidate',
            last_name='One',
            email='candidate@example.com',
            phone='9000000000',
        )
        today = timezone.localdate()
        self.offer = JobOffer.objects.create(
            application=self.application,
            salary_offered=Decimal('600000.00'),
            joining_date=today + timedelta(days=30),
            offer_valid_until=today + timedelta(days=14),
            status='sent',
            sent_at=timezone.now(),
        )
        self.client = APIClient()

    def test_accept_updates_recruitment_and_creates_one_notification(self):
        url = reverse('public-offer-respond', kwargs={'token': self.offer.response_token})

        first = self.client.post(url, {'decision': 'accept', 'response': 'Happy to join.'}, format='json')
        second = self.client.post(url, {'decision': 'accept'}, format='json')

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.offer.refresh_from_db()
        self.application.refresh_from_db()
        self.assertEqual(self.offer.status, 'accepted')
        self.assertEqual(self.application.status, 'offer_accepted')
        self.assertEqual(self.offer.candidate_response, 'Happy to join.')
        notifications = CompanyNotification.objects.filter(
            company=self.company,
            metadata__event='offer_response',
            metadata__offer_id=self.offer.id,
        )
        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.get().metadata['navigate_to'], 'hr-candidate-onboarding')

    def test_opposite_decision_after_response_is_rejected(self):
        url = reverse('public-offer-respond', kwargs={'token': self.offer.response_token})
        self.client.post(url, {'decision': 'reject'}, format='json')

        response = self.client.post(url, {'decision': 'accept'}, format='json')

        self.assertEqual(response.status_code, 409)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'offer_rejected')


class OfferResendTest(TestCase):
    def setUp(self):
        owner = User.objects.create_user('offer-resend-owner', password='test-password')
        self.company = Company.objects.create(
            name='Offer Resend Company',
            company_prefix='ORC',
            email='hr-resend@example.com',
            created_by=owner,
            approval_status='approved',
        )
        service = Service.objects.create(
            name='Human Resources',
            service_type='hr',
            description='HR service',
        )
        service_user = CompanyServiceUser.objects.create(
            company=self.company,
            service=service,
            username='hr-manager',
            email='manager@example.com',
            full_name='HR Manager',
            password='hashed-password',
            created_by=owner,
        )
        self.session = ServiceUserSession.objects.create(
            service_user=service_user,
            session_key='offer-resend-session',
            ip_address='127.0.0.1',
            user_agent='test-client',
        )
        department = Department.objects.create(
            company=self.company,
            name='Engineering',
            code='ENG',
        )
        designation = Designation.objects.create(
            company=self.company,
            department=department,
            title='Developer',
            code='DEV',
        )
        job = JobPosting.objects.create(
            company=self.company,
            title='Developer',
            department=department,
            designation=designation,
            description='Build software',
            requirements='Python',
            responsibilities='Development',
            status='active',
        )
        self.application = JobApplication.objects.create(
            job_posting=job,
            first_name='Candidate',
            last_name='Resend',
            email='resend@example.com',
            phone='9111111111',
            status='offer_sent',
        )
        today = timezone.localdate()
        self.offer = JobOffer.objects.create(
            application=self.application,
            salary_offered=Decimal('600000.00'),
            joining_date=today + timedelta(days=30),
            offer_valid_until=today + timedelta(days=14),
            status='sent',
            sent_at=timezone.now(),
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session.session_key}')

    def offer_payload(self):
        today = timezone.localdate()
        return {
            'application_id': self.application.id,
            'salary_offered': '650000.00',
            'joining_date': (today + timedelta(days=40)).isoformat(),
            'offer_valid_until': (today + timedelta(days=20)).isoformat(),
            'benefits': 'Updated benefits',
            'terms_conditions': 'Updated terms',
            'notes': 'Reissued offer',
        }

    @patch.object(JobOffer, '_send_offer_email', return_value=True)
    def test_sent_offer_can_be_reissued_with_a_new_token(self, mocked_email):
        previous_token = self.offer.response_token

        response = self.client.post(
            reverse('offer-list-create'),
            self.offer_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.offer.refresh_from_db()
        self.application.refresh_from_db()
        self.assertNotEqual(self.offer.response_token, previous_token)
        self.assertEqual(self.offer.status, 'sent')
        self.assertEqual(self.application.status, 'offer_sent')
        mocked_email.assert_called_once()

    @patch.object(JobOffer, '_send_offer_email', return_value=True)
    def test_accepted_offer_cannot_be_reissued(self, mocked_email):
        self.offer.status = 'accepted'
        self.offer.save(update_fields=['status'])
        self.application.status = 'offer_accepted'
        self.application.save(update_fields=['status'])

        response = self.client.post(
            reverse('offer-list-create'),
            self.offer_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('already accepted', str(response.data))
        mocked_email.assert_not_called()

    @patch.object(JobOffer, '_send_offer_email', return_value=True)
    def test_legacy_offer_sent_application_without_offer_can_be_reissued(self, mocked_email):
        self.offer.delete()
        self.application.status = 'offer_sent'
        self.application.save(update_fields=['status'])

        response = self.client.post(
            reverse('offer-list-create'),
            self.offer_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            JobOffer.objects.filter(application=self.application, status='sent').exists()
        )
        mocked_email.assert_called_once()
