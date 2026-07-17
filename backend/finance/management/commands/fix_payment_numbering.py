"""
Management command: fix_payment_numbering

Permanent fix for all companies:
  1. For companies with use_document_numbering=True (dashboard numbering):
     - Ensures an active DocumentNumberingConfig exists for document_type='payment'
       for the current financial year.  If a config exists but is inactive, it is
       activated.  If none exists, one is created with sensible defaults.
  2. For ALL companies:
     - Ensures a NumberingRule (internal fallback) exists for module='customer_payment'
       so the system never raises "No numbering rule configured" either.

Run once, safe to re-run (idempotent).
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from authentication.models import Company
from finance.models import NumberingRule
from finance.numbering import _financial_year


class Command(BaseCommand):
    help = 'Ensure payment document numbering is configured for all companies'

    def handle(self, *args, **options):
        today = timezone.now().date()
        current_fy = _financial_year(today)  # e.g. '2026-27'

        companies = Company.objects.all()
        self.stdout.write(f'\nProcessing {companies.count()} companies for FY {current_fy}...\n')

        dashboard_created = dashboard_activated = dashboard_ok = 0
        rule_created = rule_ok = 0

        for company in companies:
            # ── 1. Dashboard numbering (only for companies that use it) ──────
            if getattr(company, 'use_document_numbering', False):
                result = self._ensure_dashboard_config(company, current_fy)
                if result == 'created':
                    dashboard_created += 1
                elif result == 'activated':
                    dashboard_activated += 1
                else:
                    dashboard_ok += 1

            # ── 2. Internal NumberingRule fallback (all companies) ────────────
            rule, created = NumberingRule.objects.get_or_create(
                company=company,
                module='customer_payment',
                defaults={
                    'template': '{PREFIX}-{FY_SHORT}-{NUMBER}',
                    'prefix': 'PAY',
                    'separator': '-',
                    'padding': 4,
                    'reset_scope': 'yearly',
                    'start_from': 1,
                    'allow_manual_override': False,
                },
            )
            if created:
                rule_created += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  [RULE CREATED]     {company.name} (id={company.id})'
                ))
            else:
                rule_ok += 1

        self.stdout.write('\n── Summary ──────────────────────────────────────────')
        self.stdout.write(self.style.SUCCESS(
            f'  Dashboard configs  created={dashboard_created}  activated={dashboard_activated}  already_ok={dashboard_ok}'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'  Numbering rules    created={rule_created}  already_ok={rule_ok}'
        ))
        self.stdout.write(self.style.SUCCESS('\n✓ fix_payment_numbering complete.\n'))

    # ─────────────────────────────────────────────────────────────────────────
    def _ensure_dashboard_config(self, company, financial_year: str) -> str:
        """
        Returns 'created', 'activated', or 'ok'.
        """
        from authentication.models import Service
        from company_dashboard.document_numbering_models import DocumentNumberingConfig

        try:
            service = Service.objects.get(service_type='finance')
        except Service.DoesNotExist:
            self.stdout.write(self.style.WARNING(
                f'  [SKIP] Finance service not found — cannot create dashboard config for {company.name}'
            ))
            return 'ok'

        config, created = DocumentNumberingConfig.objects.get_or_create(
            company=company,
            service=service,
            document_type='payment',
            financial_year=financial_year,
            defaults={
                'prefix': 'PAY',
                'starting_number': 1,
                'current_counter': 0,
                'number_padding': 4,
                'year_format': 'FY_SHORT',
                'separator': '-',
                'include_company_prefix': False,
                'is_active': True,
                'allow_manual_override': False,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(
                f'  [DASH CREATED]     {company.name} (id={company.id}) — PAY-{financial_year}-XXXX'
            ))
            return 'created'

        if not config.is_active:
            config.is_active = True
            config.save(update_fields=['is_active'])
            self.stdout.write(self.style.SUCCESS(
                f'  [DASH ACTIVATED]   {company.name} (id={company.id}) — config was inactive, now active'
            ))
            return 'activated'

        return 'ok'
