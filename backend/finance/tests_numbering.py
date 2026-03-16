from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from datetime import timezone as dt_timezone

from authentication.models import Company
from finance.models import NumberingRule, NumberingCounter
from finance.numbering import generate_number


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

        counter = NumberingCounter.objects.get(company=self.company, module='invoice', scope_key='')
        self.assertEqual(counter.next_value, 3)
        self.assertEqual(counter.scope_key, '')
        self.assertEqual(rule.padding, 4)

    def test_yearly_scope_resets_counter(self):
        NumberingRule.objects.create(
            company=self.company,
            module='quotation',
            template='{PREFIX}{SEP}{YY}{SEP}{SEQ}',
            prefix='QT',
            separator='-',
            padding=3,
            reset_scope='yearly',
            start_from=10,
        )

        dt_2023 = timezone.datetime(2023, 12, 31, tzinfo=dt_timezone.utc)
        dt_2024 = timezone.datetime(2024, 1, 1, tzinfo=dt_timezone.utc)

        val_2023 = generate_number(self.company, 'quotation', dt=dt_2023)
        val_2024 = generate_number(self.company, 'quotation', dt=dt_2024)

        self.assertEqual(val_2023, 'QT-23-010')
        self.assertEqual(val_2024, 'QT-24-010')

        counter_2023 = NumberingCounter.objects.get(company=self.company, module='quotation', scope_key='2023')
        counter_2024 = NumberingCounter.objects.get(company=self.company, module='quotation', scope_key='2024')
        self.assertEqual(counter_2023.next_value, 11)
        self.assertEqual(counter_2024.next_value, 11)

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
