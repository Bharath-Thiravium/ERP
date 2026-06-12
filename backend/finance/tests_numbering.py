from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from datetime import timezone as dt_timezone

from authentication.models import Company
from finance.models import NumberingRule, NumberingCounter
from finance.numbering import generate_number
from finance.serializers import _ensure_numbering_rule


class NumberingGeneratorTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username='numbering-admin',
            email='admin@example.com',
            password='pass1234'
        )
        self.company = Company.objects.create(
            name='Numbering Co',
            company_prefix='NUMCO',
            email='admin@example.com',
            created_by=self.user,
        )

    def test_sequential_generation_with_padding(self):
        rule = NumberingRule.objects.create(
            company=self.company,
            module='invoice',
            template='{PREFIX}{SEP}{YYYY}{SEP}{SEQ}',
            prefix='INV',
            separator='-',
            padding=4,
            reset_scope='never',
            start_from=1,
        )

        dt = timezone.datetime(2024, 1, 15, tzinfo=dt_timezone.utc)
        first = generate_number(self.company, 'invoice', dt=dt)
        second = generate_number(self.company, 'invoice', dt=dt)

        self.assertEqual(first, 'INV-2024-0001')
        self.assertEqual(second, 'INV-2024-0002')

        counter = NumberingCounter.objects.get(company=self.company, module='invoice', scope_key='global')
        self.assertEqual(counter.next_value, 3)
        self.assertEqual(counter.scope_key, 'global')
        self.assertEqual(rule.padding, 4)

    def test_yearly_scope_resets_counter(self):
        NumberingRule.objects.create(
            company=self.company,
            module='quotation',
            template='{PREFIX}{SEP}{FY_SHORT}{SEP}{SEQ}',
            prefix='QT',
            separator='-',
            padding=3,
            reset_scope='yearly',
            start_from=10,
        )

        dt_2024_fy = timezone.datetime(2024, 3, 31, tzinfo=dt_timezone.utc)
        dt_2025_fy = timezone.datetime(2024, 4, 1, tzinfo=dt_timezone.utc)

        val_2024_fy = generate_number(self.company, 'quotation', dt=dt_2024_fy)
        val_2025_fy = generate_number(self.company, 'quotation', dt=dt_2025_fy)

        self.assertEqual(val_2024_fy, 'QT-2324-010')
        self.assertEqual(val_2025_fy, 'QT-2425-010')

        counter_2024_fy = NumberingCounter.objects.get(company=self.company, module='quotation', scope_key='2324')
        counter_2025_fy = NumberingCounter.objects.get(company=self.company, module='quotation', scope_key='2425')
        self.assertEqual(counter_2024_fy.next_value, 11)
        self.assertEqual(counter_2025_fy.next_value, 11)

    def test_monthly_scope_increments_per_month(self):
        NumberingRule.objects.create(
            company=self.company,
            module='purchase_order',
            template='{PREFIX}{SEP}{YYYY}{SEP}{MM}{SEP}{SEQ}',
            prefix='PO',
            separator='-',
            padding=2,
            reset_scope='monthly',
            start_from=5,
        )

        dt_jan = timezone.datetime(2024, 1, 5, tzinfo=dt_timezone.utc)
        dt_feb = timezone.datetime(2024, 2, 1, tzinfo=dt_timezone.utc)

        jan_first = generate_number(self.company, 'purchase_order', dt=dt_jan)
        jan_second = generate_number(self.company, 'purchase_order', dt=dt_jan)
        feb_first = generate_number(self.company, 'purchase_order', dt=dt_feb)

        self.assertEqual(jan_first, 'PO-2024-01-05')
        self.assertEqual(jan_second, 'PO-2024-01-06')
        self.assertEqual(feb_first, 'PO-2024-02-05')

        jan_counter = NumberingCounter.objects.get(company=self.company, module='purchase_order', scope_key='2024-01')
        feb_counter = NumberingCounter.objects.get(company=self.company, module='purchase_order', scope_key='2024-02')
        self.assertEqual(jan_counter.next_value, 7)
        self.assertEqual(feb_counter.next_value, 6)

    def test_number_token_uses_rule_padding(self):
        rule = NumberingRule.objects.create(
            company=self.company,
            module='purchase_order',
            template='{COMPANY}/{PREFIX}/{FY_SHORT}/{NUMBER}',
            prefix='PO',
            separator='/',
            padding=6,
            reset_scope='yearly',
            start_from=1,
        )

        dt = timezone.datetime(2024, 5, 15, tzinfo=dt_timezone.utc)
        value = generate_number(self.company, 'purchase_order', dt=dt)

        self.assertEqual(value, 'NUMCO/PO/2425/000001')

    def test_custom_document_numbering_supports_fy_short_placeholder(self):
        from company_dashboard.document_numbering_models import DocumentNumberingConfig
        from authentication.models import Service

        service = Service.objects.create(
            name='Test Service',
            service_type='customer',
            description='Test service for customer numbering',
            is_active=True,
        )

        config = DocumentNumberingConfig.objects.create(
            service=service,
            company=self.company,
            document_type='customer',
            financial_year='2024-25',
            prefix='CUST',
            starting_number=1,
            current_counter=0,
            number_padding=3,
            custom_pattern='SE-{PREFIX}-{FY_SHORT}-{NUMBER}',
            include_company_prefix=False,
            year_format='FY_SHORT',
            separator='-'
        )

        next_number = config.get_next_number()
        self.assertEqual(next_number, 'SE-CUST-24-25-001')

    def test_invoice_default_rule_uses_company_prefix_fy_short_and_3_digit_padding(self):
        rule = _ensure_numbering_rule(self.company, 'invoice')
        self.assertEqual(rule.template, '{COMPANY}-{PREFIX}-{FY_SHORT}-{NUMBER}')
        self.assertEqual(rule.prefix, 'INV')
        self.assertEqual(rule.padding, 3)

        rule.delete()
        rule = NumberingRule.objects.create(
            company=self.company,
            module='invoice',
            template='{COMPANY}-{PREFIX}-{FY_SHORT}-{NUMBER}',
            prefix='INV',
            separator='-',
            padding=3,
            reset_scope='yearly',
            start_from=1,
        )
        dt = timezone.datetime(2026, 5, 1, tzinfo=dt_timezone.utc)
        value = generate_number(self.company, 'invoice', dt=dt)
        self.assertEqual(value, 'NUMCO-INV-2627-001')
