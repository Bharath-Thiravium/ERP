from django.core.management.base import BaseCommand
from django.utils import timezone
from finance.email_automation_service import process_all_email_automations
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Process email automations for all companies'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=int,
            help='Process automations for specific company only'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(f'Starting email automation processing at {timezone.now()}')
        )
        
        try:
            if options['company_id']:
                from finance.email_automation_service import process_company_email_automations
                process_company_email_automations(options['company_id'])
                self.stdout.write(
                    self.style.SUCCESS(f'Processed email automations for company {options["company_id"]}')
                )
            else:
                process_all_email_automations()
                self.stdout.write(
                    self.style.SUCCESS('Processed email automations for all companies')
                )
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error processing email automations: {str(e)}')
            )
            logger.error(f'Email automation processing failed: {str(e)}')