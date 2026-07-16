"""
Phase 4 — Integration tests for GSTR-1 API views.

Scenarios covered (8):
  33. POST /gstr1/validate/ — no session → 401
  34. POST /gstr1/validate/ — viewer role → 403
  35. POST /gstr1/validate/ — bad date format → 400
  36. POST /gstr1/validate/ — valid request → 200 with validation structure
  37. POST /gstr1/reconcile/ — valid request → 200 with reconciliation keys
  38. POST /gstr1/export/ — blocking validation errors → 422
  39. POST /gstr1/export/ — valid data → 200 xlsx file download
  40. POST /gstr1/validation-report/ — valid request → 200 xlsx download
"""
import io
from datetime import date
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from authentication.models import Company, CompanyServiceUser, ServiceUserSession, Service
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from django.core.exceptions import FieldDoesNotExist

from finance.gstr1_repository import Gstr1DataRepository
from finance.gstr1_validation import ValidationResult, ValidationIssue

User = get_user_model()

FROM_DATE = '2024-04-01'
TO_DATE   = '2024-06-30'
COMPANY_GSTIN = '27AABCU9603R1ZX'


def _make_issue(blocking=True):
    return ValidationIssue(
        document_number='INV-001', document_date='2024-04-15',
        customer='Test', gstin='', validation_field='Test Field',
        current_value='x', error_message='Test error',
        suggested_action='Fix it', is_blocking=blocking,
    )


def _make_service_user(company, username, role, created_by):
    service, _ = Service.objects.get_or_create(
        service_type='finance',
        defaults={'name': 'Finance', 'description': 'Finance service'},
    )
    return CompanyServiceUser.objects.create(
        company=company,
        service=service,
        username=username,
        unique_service_id=f'VTCO_{username}_001',
        email=f'{username}@test.com',
        full_name=username,
        role=role,
        password='hashed_dummy',
        password_expires_at=timezone.now() + timedelta(days=365),
        created_by=created_by,
    )


class Gstr1ViewBaseTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='gstr1_view_user',
            email='gstr1view@test.com',
            password='pass1234',
        )
        self.company = Company.objects.create(
            name='View Test Co',
            company_prefix='VTCO',
            email='vtco@test.com',
            gst_number=COMPANY_GSTIN,
            created_by=self.user,
        )
        self.admin_su = _make_service_user(self.company, 'vtco_admin', 'admin', self.user)
        self.session = ServiceUserSession.objects.create(
            service_user=self.admin_su,
            session_key='test-session-key-admin',
            ip_address='127.0.0.1',
            user_agent='test',
            is_active=True,
        )
        self.viewer_user = User.objects.create_user(
            username='gstr1_viewer',
            email='viewer@test.com',
            password='pass1234',
        )
        self.viewer_su = _make_service_user(self.company, 'vtco_viewer', 'viewer', self.user)
        self.viewer_session = ServiceUserSession.objects.create(
            service_user=self.viewer_su,
            session_key='test-session-key-viewer',
            ip_address='127.0.0.1',
            user_agent='test',
            is_active=True,
        )

    def _payload(self, **kwargs):
        base = {
            'session_key': 'test-session-key-admin',
            'from_date': FROM_DATE,
            'to_date': TO_DATE,
        }
        base.update(kwargs)
        return base


# ── Validate endpoint ─────────────────────────────────────────────────────────

class TestGstr1ValidateView(Gstr1ViewBaseTest):
    URL = '/api/finance/gstr1/validate/'

    def test_no_session_returns_401(self):
        """Scenario 33"""
        resp = self.client.post(self.URL, {'from_date': FROM_DATE, 'to_date': TO_DATE}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_viewer_role_returns_403(self):
        """Scenario 34"""
        resp = self.client.post(self.URL, {
            'session_key': 'test-session-key-viewer',
            'from_date': FROM_DATE, 'to_date': TO_DATE,
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_bad_date_format_returns_400(self):
        """Scenario 35"""
        resp = self.client.post(self.URL, {
            'session_key': 'test-session-key-admin',
            'from_date': '01-04-2024',
            'to_date': '30-06-2024',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_from_date_after_to_date_returns_400(self):
        resp = self.client.post(self.URL, {
            'session_key': 'test-session-key-admin',
            'from_date': '2024-07-01',
            'to_date': '2024-04-01',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    @patch('finance.gstr1_repository.Invoice')
    def test_repository_can_query_invoices_without_gstr1_exclusion_error(self, mock_invoice_cls):
        mock_queryset = MagicMock()
        mock_queryset.select_related.return_value = mock_queryset
        mock_queryset.prefetch_related.return_value = mock_queryset
        mock_queryset.filter.return_value = mock_queryset
        mock_queryset.order_by.return_value = mock_queryset
        mock_invoice_cls.objects = mock_queryset
        mock_invoice_cls._meta.get_field.side_effect = FieldDoesNotExist('Invoice', 'gstr1_excluded')

        Gstr1DataRepository.get_invoices(self.company, date(2024, 4, 1), date(2024, 6, 30))

        first_filter_call = mock_queryset.filter.call_args_list[0]
        kwargs = first_filter_call.kwargs
        self.assertNotIn('gstr1_excluded', kwargs)
        self.assertEqual(kwargs['company'], self.company)

    @patch('finance.gstr1_views.Gstr1DataRepository')
    @patch('finance.gstr1_views.Gstr1ValidationService')
    def test_valid_request_returns_200_with_structure(self, MockVal, MockRepo):
        """Scenario 36"""
        MockRepo.get_invoices.return_value = []
        mock_result = MagicMock()
        mock_result.to_dict.return_value = {
            'has_blocking_errors': False,
            'blocking_count': 0,
            'warning_count': 0,
            'blocking': [],
            'warnings': [],
        }
        MockVal.return_value.validate_all.return_value = mock_result

        resp = self.client.post(self.URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('has_blocking_errors', data)
        self.assertIn('blocking_count', data)
        self.assertIn('warning_count', data)


# ── Reconcile endpoint ────────────────────────────────────────────────────────

class TestGstr1ReconcileView(Gstr1ViewBaseTest):
    URL = '/api/finance/gstr1/reconcile/'

    @patch('finance.gstr1_views.Gstr1ExportService')
    @patch('finance.gstr1_views.Gstr1ReconciliationService')
    def test_valid_request_returns_reconciliation_keys(self, MockRecon, MockSvc):
        """Scenario 37"""
        MockSvc.return_value.build_all_sheets.return_value = ([], [], [], [], [], [], [])
        MockRecon.return_value.build.return_value = {
            'b2b_invoice_count': 0,
            'b2b_invoice_value': 0.0,
            'b2b_taxable_value': 0.0,
            'b2cs_taxable_value': 0.0,
            'cdnr_count': 0,
            'cdnr_value': 0.0,
            'cdnra_count': 0,
            'cdnra_value': 0.0,
            'hsn_b2b_taxable': 0.0,
            'hsn_b2c_taxable': 0.0,
            'total_igst': 0.0,
            'total_cgst': 0.0,
            'total_sgst_utgst': 0.0,
            'total_cess': 0.0,
            'total_docs_issued': 0,
            'total_docs_cancelled': 0,
            'reconciliation': {
                'b2b_vs_hsn_b2b_diff': 0.0,
                'b2c_vs_hsn_b2c_diff': 0.0,
                'b2b_hsn_match': True,
                'b2c_hsn_match': True,
            },
        }

        resp = self.client.post(self.URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('b2b_invoice_count', data)
        self.assertIn('reconciliation', data)
        self.assertIn('b2b_hsn_match', data['reconciliation'])


# ── Export endpoint ───────────────────────────────────────────────────────────

class TestGstr1ExportView(Gstr1ViewBaseTest):
    URL = '/api/finance/gstr1/export/'

    def _export_payload(self, **kwargs):
        base = self._payload(
            return_month='APRIL',
            financial_year='2024-25',
        )
        base.update(kwargs)
        return base

    @patch('finance.gstr1_views.Gstr1DataRepository')
    @patch('finance.gstr1_views.Gstr1ValidationService')
    def test_blocking_validation_errors_return_422(self, MockVal, MockRepo):
        """Scenario 38"""
        MockRepo.get_invoices.return_value = []
        mock_result = MagicMock()
        mock_result.has_blocking = True
        mock_result.blocking = [_make_issue(blocking=True)]
        mock_result.to_dict.return_value = {
            'has_blocking_errors': True,
            'blocking_count': 1,
            'warning_count': 0,
            'blocking': [vars(_make_issue())],
            'warnings': [],
        }
        MockVal.return_value.validate_all.return_value = mock_result

        resp = self.client.post(self.URL, self._export_payload(), format='json')
        self.assertEqual(resp.status_code, 422)
        data = resp.json()
        self.assertIn('error', data)
        self.assertIn('validation', data)

    @patch('finance.gstr1_views.Gstr1AuditService')
    @patch('finance.gstr1_views.Gstr1ExcelWriter')
    @patch('finance.gstr1_views.Gstr1ExportService')
    @patch('finance.gstr1_views.Gstr1DataRepository')
    @patch('finance.gstr1_views.Gstr1ValidationService')
    def test_valid_export_returns_xlsx_file(self, MockVal, MockRepo, MockSvc, MockWriter, MockAudit):
        """Scenario 39"""
        MockRepo.get_invoices.return_value = []
        mock_result = MagicMock()
        mock_result.has_blocking = False
        mock_result.warnings = []
        mock_result.to_dict.return_value = {'has_blocking_errors': False, 'blocking': [], 'warnings': []}
        MockVal.return_value.validate_all.return_value = mock_result

        MockSvc.return_value.build_all_sheets.return_value = ([], [], [], [], [], [], [])

        fake_buf = io.BytesIO(b'PK\x03\x04fake_xlsx_content')
        MockWriter.return_value.write.return_value = fake_buf
        MockAudit.log.return_value = None

        resp = self.client.post(self.URL, self._export_payload(), format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        self.assertIn('attachment', resp['Content-Disposition'])
        self.assertIn('.xlsx', resp['Content-Disposition'])

    def test_missing_return_month_returns_400(self):
        resp = self.client.post(self.URL, self._payload(financial_year='2024-25'), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_missing_financial_year_returns_400(self):
        resp = self.client.post(self.URL, self._payload(return_month='APRIL'), format='json')
        self.assertEqual(resp.status_code, 400)

    @patch('finance.gstr1_views.Gstr1DataRepository')
    @patch('finance.gstr1_views.Gstr1ValidationService')
    def test_missing_company_gstin_returns_400(self, MockVal, MockRepo):
        self.company.gst_number = ''
        self.company.save(update_fields=['gst_number'])
        resp = self.client.post(self.URL, self._export_payload(), format='json')
        self.assertEqual(resp.status_code, 400)
        # Restore
        self.company.gst_number = COMPANY_GSTIN
        self.company.save(update_fields=['gst_number'])


# ── Validation report endpoint ────────────────────────────────────────────────

class TestGstr1ValidationReportView(Gstr1ViewBaseTest):
    URL = '/api/finance/gstr1/validation-report/'

    @patch('finance.gstr1_views.Gstr1DataRepository')
    @patch('finance.gstr1_views.Gstr1ValidationService')
    def test_returns_xlsx_download(self, MockVal, MockRepo):
        """Scenario 40"""
        MockRepo.get_invoices.return_value = []
        mock_result = MagicMock()
        mock_result.blocking = [_make_issue(blocking=True)]
        mock_result.warnings = [_make_issue(blocking=False)]
        MockVal.return_value.validate_all.return_value = mock_result

        resp = self.client.post(self.URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        self.assertIn('GSTR1_Validation_Report.xlsx', resp['Content-Disposition'])

    def test_no_session_returns_401(self):
        resp = self.client.post(self.URL, {'from_date': FROM_DATE, 'to_date': TO_DATE}, format='json')
        self.assertEqual(resp.status_code, 401)
