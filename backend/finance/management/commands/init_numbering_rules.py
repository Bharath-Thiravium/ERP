from django.core.management.base import BaseCommand
from authentication.models import Company
from finance.models import NumberingRule, FINANCE_NUMBERING_MODULE_CHOICES


class Command(BaseCommand):
    help = 'Initialize numbering rules for all companies for the new financial year'

    def handle(self, *args, **options):
        FINANCE_DEFAULT_TEMPLATES = {
            'quotation': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'QTN'},
            'purchase_order': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PO'},
            'proforma_invoice': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PRO'},
            'invoice': {
                'template': '{COMPANY}-{PREFIX}-{FY_SHORT}-{NUMBER}',
                'prefix': 'INV',
                'padding': 3,
            },
            'customer_payment': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PAY'},
            'purchase_request': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PR'},
            'purchase_payment': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PP'},
            'vendor_invoice': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'VINV'},
            'customer': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'CUST'},
            'vendor': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'VEN'},
            'product': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PRD'},
        }

        companies = Company.objects.all()
        
        self.stdout.write(self.style.SUCCESS(f'\nInitializing numbering rules for {companies.count()} companies...\n'))
        
        for company in companies:
            self.stdout.write(f'\nCompany: {company.name}')
            created_count = 0
            
            for module, defaults in FINANCE_DEFAULT_TEMPLATES.items():
                rule, created = NumberingRule.objects.get_or_create(
                    company=company,
                    module=module,
                    defaults={
                        'template': defaults['template'],
                        'prefix': defaults['prefix'],
                        'separator': defaults.get('separator', '-'),
                        'padding': defaults.get('padding', 6),
                        'reset_scope': defaults.get('reset_scope', 'yearly'),
                        'start_from': defaults.get('start_from', 1),
                        'allow_manual_override': defaults.get('allow_manual_override', False),
                    }
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Created rule for {module}'))
                else:
                    self.stdout.write(f'  - Rule already exists for {module}')
            
            if created_count > 0:
                self.stdout.write(self.style.SUCCESS(f'\n  Created {created_count} new numbering rules for {company.name}'))
            else:
                self.stdout.write(f'  All rules already configured for {company.name}')
        
        self.stdout.write(self.style.SUCCESS('\n✓ Numbering rules initialization complete!\n'))
