from django.core.management.base import BaseCommand
from hr.form_automation_models import ComplianceFormTemplate
from authentication.models import Company

class Command(BaseCommand):
    help = 'Create common Form XIII template for all companies'

    def handle(self, *args, **options):
        
        # Get all companies
        companies = Company.objects.all()
        
        for company in companies:
            # Create Form XIII template for each company
            template, created = ComplianceFormTemplate.objects.get_or_create(
                company=company,
                template_name='Form XIII - Register of Workmen',
                defaults={
                    'form_type': 'register_of_workmen',
                    'template_structure': {
                        'fields': [
                            {'name': 'Employee ID', 'type': 'text'},
                            {'name': 'Name and surname of workmen', 'type': 'text'},
                            {'name': 'Date of Birth mm/dd/yyyy', 'type': 'date'},
                            {'name': 'Sex', 'type': 'text'},
                            {'name': "Father's/Husband's Name", 'type': 'text'},
                            {'name': 'Nature of Employment/Designation', 'type': 'text'},
                            {'name': 'Permanent Address', 'type': 'text'},
                            {'name': 'Local Address', 'type': 'text'},
                            {'name': 'Date of Commencement of Employment', 'type': 'date'},
                            {'name': 'Signature of workmen', 'type': 'text'},
                            {'name': 'Date of termination of employment', 'type': 'date'},
                            {'name': 'Reasons for termination', 'type': 'text'},
                            {'name': 'Remarks', 'type': 'text'}
                        ]
                    },
                    'generation_day': 1,
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(f'Created Form XIII for {company.name}')
        
        self.stdout.write(
            self.style.SUCCESS('Successfully created Form XIII template for all companies')
        )