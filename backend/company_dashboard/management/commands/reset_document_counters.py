from django.core.management.base import BaseCommand
from django.db import transaction
from company_dashboard.document_numbering_models import DocumentNumberingConfig
from authentication.models import Company


class Command(BaseCommand):
    help = 'Reset document numbering counters for a company'

    def add_arguments(self, parser):
        parser.add_argument('--company-id', type=int, help='Company ID to reset counters for')
        parser.add_argument('--company-prefix', type=str, help='Company prefix to reset counters for')
        parser.add_argument('--all', action='store_true', help='Reset counters for all companies')

    def handle(self, *args, **options):
        if options['all']:
            with transaction.atomic():
                reset_count = DocumentNumberingConfig.objects.all().update(current_counter=0)
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully reset {reset_count} counters for all companies')
                )
        elif options['company_id']:
            try:
                company = Company.objects.get(id=options['company_id'])
                with transaction.atomic():
                    reset_count = DocumentNumberingConfig.objects.filter(
                        company=company
                    ).update(current_counter=0)
                    self.stdout.write(
                        self.style.SUCCESS(f'Successfully reset {reset_count} counters for {company.name}')
                    )
            except Company.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Company with ID {options["company_id"]} not found')
                )
        elif options['company_prefix']:
            try:
                company = Company.objects.get(company_prefix=options['company_prefix'])
                with transaction.atomic():
                    reset_count = DocumentNumberingConfig.objects.filter(
                        company=company
                    ).update(current_counter=0)
                    self.stdout.write(
                        self.style.SUCCESS(f'Successfully reset {reset_count} counters for {company.name}')
                    )
            except Company.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Company with prefix {options["company_prefix"]} not found')
                )
        else:
            self.stdout.write(
                self.style.ERROR('Please provide --company-id, --company-prefix, or --all')
            )