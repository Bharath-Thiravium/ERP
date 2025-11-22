from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from authentication.models import Company
from hr.form_automation_service import FormAutomationService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Generate monthly compliance forms for all companies'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=str,
            help='Month in YYYY-MM format (default: current month)',
        )
        parser.add_argument(
            '--company-id',
            type=int,
            help='Generate forms for specific company only',
        )

    def handle(self, *args, **options):
        month_str = options.get('month')
        company_id = options.get('company_id')
        
        # Determine month
        if month_str:
            try:
                month_date = datetime.strptime(month_str, '%Y-%m').date().replace(day=1)
            except ValueError:
                self.stdout.write(
                    self.style.ERROR('Invalid month format. Use YYYY-MM')
                )
                return
        else:
            month_date = timezone.now().date().replace(day=1)
        
        self.stdout.write(f'Generating monthly forms for {month_date.strftime("%B %Y")}...')
        
        # Get companies
        if company_id:
            companies = Company.objects.filter(id=company_id)
            if not companies.exists():
                self.stdout.write(
                    self.style.ERROR(f'Company with ID {company_id} not found')
                )
                return
        else:
            companies = Company.objects.filter(is_active=True)
        
        total_generated = 0
        total_companies = companies.count()
        
        for company in companies:
            try:
                self.stdout.write(f'Processing company: {company.name}')
                
                # Setup default templates if not exists
                FormAutomationService.setup_default_templates(company)
                
                # Generate forms
                generated_forms = FormAutomationService.generate_monthly_forms(
                    company.id, 
                    month_date
                )
                
                total_generated += len(generated_forms)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Generated {len(generated_forms)} forms for {company.name}'
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'  ✗ Error processing {company.name}: {str(e)}'
                    )
                )
                logger.error(f'Error generating forms for company {company.id}: {str(e)}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted! Generated {total_generated} forms for {total_companies} companies.'
            )
        )