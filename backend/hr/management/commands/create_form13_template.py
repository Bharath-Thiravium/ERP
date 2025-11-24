from django.core.management.base import BaseCommand
from hr.form_automation_models import ComplianceFormTemplate
from authentication.models import Company

class Command(BaseCommand):
    help = 'Create Form XIII template based on Excel structure'

    def add_arguments(self, parser):
        parser.add_argument('--company-id', type=int, required=True, help='Company ID')

    def handle(self, *args, **options):
        company_id = options['company_id']
        
        try:
            company = Company.objects.get(id=company_id)
            
            # Create Form XIII template with exact structure from Excel
            template, created = ComplianceFormTemplate.objects.get_or_create(
                company=company,
                template_name='Form XIII - Register of Workmen Employed by Contractor',
                defaults={
                    'form_type': 'register_of_workmen',
                    'template_structure': {
                        'title': 'FORM XIII',
                        'subtitle': '[see rule 75]',
                        'description': 'Register of Workmen Employed by Contractor',
                        'fields': [
                            {'name': 'Employee ID', 'type': 'text', 'width': '80px'},
                            {'name': 'Name and surname of workmen', 'type': 'text', 'width': '150px'},
                            {'name': 'Date of Birth mm/dd/yyyy', 'type': 'date', 'width': '100px'},
                            {'name': 'Sex', 'type': 'text', 'width': '50px'},
                            {'name': "Father's/Husband's Name", 'type': 'text', 'width': '120px'},
                            {'name': 'Nature of Employment/Designation', 'type': 'text', 'width': '120px'},
                            {'name': 'Permanent Address', 'type': 'text', 'width': '150px'},
                            {'name': 'Local Address', 'type': 'text', 'width': '150px'},
                            {'name': 'Date of Commencement of Employment', 'type': 'date', 'width': '120px'},
                            {'name': 'Signature of workmen', 'type': 'text', 'width': '100px'},
                            {'name': 'Date of termination of employment', 'type': 'date', 'width': '120px'},
                            {'name': 'Reasons for termination', 'type': 'text', 'width': '120px'},
                            {'name': 'Remarks', 'type': 'text', 'width': '100px'}
                        ],
                        'header_info': [
                            '1. Name and Address of Contractor.',
                            '2. Name and Address of establishment in/under which contract is carried on.',
                            '3. Nature and location of work.',
                            '4. Name and address of Principal Employer.'
                        ]
                    },
                    'generation_day': 1,
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created Form XIII template for {company.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Form XIII template already exists for {company.name}')
                )
                
        except Company.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Company with ID {company_id} not found')
            )