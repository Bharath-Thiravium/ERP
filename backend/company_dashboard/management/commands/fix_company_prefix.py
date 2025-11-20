"""
Django management command to fix company prefix for existing document numbering configurations
"""
from django.core.management.base import BaseCommand
from company_dashboard.document_numbering_models import DocumentNumberingConfig
from authentication.models import Company

class Command(BaseCommand):
    help = 'Fix company prefix for existing document numbering configurations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-prefix',
            type=str,
            help='Company prefix to fix (e.g., EXMTS)',
            required=True
        )

    def handle(self, *args, **options):
        company_prefix = options['company_prefix']
        
        try:
            company = Company.objects.get(company_prefix=company_prefix)
            
            # Get all document numbering configs for this company
            configs = DocumentNumberingConfig.objects.filter(company=company)
            
            updated_count = 0
            for config in configs:
                if not config.include_company_prefix:
                    config.include_company_prefix = True
                    config.save(update_fields=['include_company_prefix'])
                    updated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"Updated {config.document_type} config to include company prefix")
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f"Updated {updated_count} configurations for company {company.name}")
            )
            
        except Company.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Company with prefix {company_prefix} not found")
            )