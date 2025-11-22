from django.core.management.base import BaseCommand
from django.db import transaction
from hr.form_automation_models import MonthlyComplianceForm, ComplianceFormTemplate
from authentication.models import Company
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up monthly compliance forms that are not properly configured'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=int,
            help='Specific company ID to clean up (optional)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Delete all forms including approved ones',
        )

    def handle(self, *args, **options):
        company_id = options.get('company_id')
        dry_run = options.get('dry_run', False)
        force = options.get('force', False)
        
        self.stdout.write(
            self.style.SUCCESS('Starting compliance forms cleanup...')
        )
        
        # Get companies to process
        if company_id:
            companies = Company.objects.filter(id=company_id)
            if not companies.exists():
                self.stdout.write(
                    self.style.ERROR(f'Company with ID {company_id} not found')
                )
                return
        else:
            companies = Company.objects.all()
        
        total_deleted = 0
        
        for company in companies:
            self.stdout.write(f'\nProcessing company: {company.name}')
            
            # Get all forms for this company
            forms_query = MonthlyComplianceForm.objects.filter(company=company)
            
            if not force:
                # Only delete generated forms, keep approved ones
                forms_query = forms_query.filter(status='generated')
            
            forms_to_delete = []
            
            for form in forms_query:
                # Check if template still exists and is active
                template_exists = ComplianceFormTemplate.objects.filter(
                    id=form.template.id,
                    company=company,
                    is_active=True
                ).exists()
                
                if not template_exists:
                    forms_to_delete.append(form)
                    self.stdout.write(
                        f'  - Will delete: {form.template.template_name} ({form.month}) - Template inactive/missing'
                    )
                else:
                    # Check for duplicates (same template + month)
                    duplicate_count = MonthlyComplianceForm.objects.filter(
                        company=company,
                        template=form.template,
                        month=form.month
                    ).count()
                    
                    if duplicate_count > 1:
                        # Keep the first one, mark others for deletion
                        first_form = MonthlyComplianceForm.objects.filter(
                            company=company,
                            template=form.template,
                            month=form.month
                        ).first()
                        
                        if form.id != first_form.id:
                            forms_to_delete.append(form)
                            self.stdout.write(
                                f'  - Will delete: {form.template.template_name} ({form.month}) - Duplicate'
                            )
            
            # Delete forms
            if forms_to_delete:
                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(f'DRY RUN: Would delete {len(forms_to_delete)} forms for {company.name}')
                    )
                else:
                    with transaction.atomic():
                        for form in forms_to_delete:
                            form.delete()
                        
                        self.stdout.write(
                            self.style.SUCCESS(f'Deleted {len(forms_to_delete)} forms for {company.name}')
                        )
                        total_deleted += len(forms_to_delete)
            else:
                self.stdout.write(f'  No forms to delete for {company.name}')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'\nDRY RUN COMPLETE: Would delete {total_deleted} forms total')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\nCLEANUP COMPLETE: Deleted {total_deleted} forms total')
            )