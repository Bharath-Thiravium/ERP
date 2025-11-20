from django.core.management.base import BaseCommand
from company_dashboard.document_numbering_reset import reset_all_counters_for_company, reset_document_counter
from authentication.models import Company


class Command(BaseCommand):
    help = 'Reset document numbering counters for a company'

    def add_arguments(self, parser):
        parser.add_argument('--company-id', type=int, help='Company ID to reset counters for')
        parser.add_argument('--company-prefix', type=str, help='Company prefix to reset counters for')
        parser.add_argument('--document-type', type=str, help='Specific document type to reset (optional)')
        parser.add_argument('--all', action='store_true', help='Reset all counters for the company')

    def handle(self, *args, **options):
        company_id = options.get('company_id')
        company_prefix = options.get('company_prefix')
        document_type = options.get('document_type')
        reset_all = options.get('all')

        # Find company
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Company with ID {company_id} not found'))
                return
        elif company_prefix:
            try:
                company = Company.objects.get(company_prefix=company_prefix)
            except Company.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Company with prefix {company_prefix} not found'))
                return
        else:
            self.stdout.write(self.style.ERROR('Please provide either --company-id or --company-prefix'))
            return

        # Reset counters
        if reset_all or not document_type:
            result = reset_all_counters_for_company(company.id)
            self.stdout.write(self.style.SUCCESS(f'Company: {company.name} ({company.company_prefix})'))
            self.stdout.write(self.style.SUCCESS(result))
        else:
            result = reset_document_counter(company.id, document_type)
            self.stdout.write(self.style.SUCCESS(f'Company: {company.name} ({company.company_prefix})'))
            self.stdout.write(self.style.SUCCESS(result))