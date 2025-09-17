from django.core.management.base import BaseCommand
from authentication.models import Company
from hr.models import Department, Designation

class Command(BaseCommand):
    help = 'Create sample HR data for testing'

    def handle(self, *args, **options):
        # Get the first company (assuming it exists)
        try:
            company = Company.objects.first()
            if not company:
                self.stdout.write(self.style.ERROR('No company found. Please create a company first.'))
                return

            # Create departments
            departments_data = [
                {'name': 'Human Resources', 'description': 'Manages employee relations and policies'},
                {'name': 'Information Technology', 'description': 'Handles technology infrastructure and development'},
                {'name': 'Finance & Accounting', 'description': 'Manages financial operations and accounting'},
                {'name': 'Sales & Marketing', 'description': 'Drives sales and marketing initiatives'},
                {'name': 'Operations', 'description': 'Manages day-to-day business operations'},
                {'name': 'Customer Support', 'description': 'Provides customer service and support'},
            ]

            for dept_data in departments_data:
                department, created = Department.objects.get_or_create(
                    name=dept_data['name'],
                    company=company,
                    defaults={'description': dept_data['description']}
                )
                if created:
                    self.stdout.write(f'Created department: {department.name}')

            # Create designations for each department
            designations_data = [
                {'title': 'Manager', 'level': 5},
                {'title': 'Senior Developer', 'level': 4},
                {'title': 'Developer', 'level': 3},
                {'title': 'Analyst', 'level': 3},
                {'title': 'Executive', 'level': 2},
                {'title': 'Associate', 'level': 2},
                {'title': 'Specialist', 'level': 3},
            ]

            # Create designations for all departments
            departments = Department.objects.filter(company=company)
            for dept in departments:
                for desig_data in designations_data:
                    designation, created = Designation.objects.get_or_create(
                        title=desig_data['title'],
                        company=company,
                        department=dept,
                        defaults={'level': desig_data['level']}
                    )
                    if created:
                        self.stdout.write(f'Created designation: {designation.title} in {dept.name}')

            self.stdout.write(self.style.SUCCESS('Successfully created sample HR data'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating sample data: {str(e)}'))