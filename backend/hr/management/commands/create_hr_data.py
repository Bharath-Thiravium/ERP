from django.core.management.base import BaseCommand
from django.db import transaction
from authentication.models import Company
from hr.models import Department, Designation


class Command(BaseCommand):
    help = 'Create initial HR data (departments and designations)'

    def add_arguments(self, parser):
        parser.add_argument('--company-id', type=int, help='Company ID to create data for')

    def handle(self, *args, **options):
        company_id = options.get('company_id')
        
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                self.create_hr_data_for_company(company)
            except Company.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Company with ID {company_id} not found'))
        else:
            # Create for all companies
            companies = Company.objects.all()
            for company in companies:
                self.create_hr_data_for_company(company)

    def create_hr_data_for_company(self, company):
        self.stdout.write(f'Creating HR data for company: {company.name}')
        
        with transaction.atomic():
            # Create departments
            departments_data = [
                {'name': 'Engineering', 'code': 'ENG', 'description': 'Software Development and Engineering'},
                {'name': 'Human Resources', 'code': 'HR', 'description': 'Human Resources Management'},
                {'name': 'Finance', 'code': 'FIN', 'description': 'Finance and Accounting'},
                {'name': 'Sales', 'code': 'SAL', 'description': 'Sales and Business Development'},
                {'name': 'Marketing', 'code': 'MKT', 'description': 'Marketing and Communications'},
                {'name': 'Operations', 'code': 'OPS', 'description': 'Operations and Administration'},
                {'name': 'Quality Assurance', 'code': 'QA', 'description': 'Quality Assurance and Testing'},
                {'name': 'Customer Support', 'code': 'CS', 'description': 'Customer Support and Success'},
            ]
            
            created_departments = {}
            for dept_data in departments_data:
                dept, created = Department.objects.get_or_create(
                    company=company,
                    code=dept_data['code'],
                    defaults={
                        'name': dept_data['name'],
                        'description': dept_data['description']
                    }
                )
                created_departments[dept_data['code']] = dept
                if created:
                    self.stdout.write(f'  Created department: {dept.name}')
                else:
                    self.stdout.write(f'  Department already exists: {dept.name}')
            
            # Create designations
            designations_data = [
                # Engineering
                {'title': 'Software Engineer', 'code': 'SE', 'dept': 'ENG', 'level': 'junior', 'min_salary': 400000, 'max_salary': 800000},
                {'title': 'Senior Software Engineer', 'code': 'SSE', 'dept': 'ENG', 'level': 'senior', 'min_salary': 800000, 'max_salary': 1500000},
                {'title': 'Tech Lead', 'code': 'TL', 'dept': 'ENG', 'level': 'lead', 'min_salary': 1200000, 'max_salary': 2000000},
                {'title': 'Engineering Manager', 'code': 'EM', 'dept': 'ENG', 'level': 'manager', 'min_salary': 1800000, 'max_salary': 3000000},
                
                # HR
                {'title': 'HR Executive', 'code': 'HRE', 'dept': 'HR', 'level': 'junior', 'min_salary': 300000, 'max_salary': 600000},
                {'title': 'HR Manager', 'code': 'HRM', 'dept': 'HR', 'level': 'manager', 'min_salary': 800000, 'max_salary': 1500000},
                {'title': 'HR Director', 'code': 'HRD', 'dept': 'HR', 'level': 'director', 'min_salary': 1500000, 'max_salary': 2500000},
                
                # Finance
                {'title': 'Accountant', 'code': 'ACC', 'dept': 'FIN', 'level': 'junior', 'min_salary': 350000, 'max_salary': 700000},
                {'title': 'Finance Manager', 'code': 'FM', 'dept': 'FIN', 'level': 'manager', 'min_salary': 800000, 'max_salary': 1500000},
                {'title': 'CFO', 'code': 'CFO', 'dept': 'FIN', 'level': 'executive', 'min_salary': 2000000, 'max_salary': 4000000},
                
                # Sales
                {'title': 'Sales Executive', 'code': 'SXE', 'dept': 'SAL', 'level': 'junior', 'min_salary': 300000, 'max_salary': 600000},
                {'title': 'Sales Manager', 'code': 'SM', 'dept': 'SAL', 'level': 'manager', 'min_salary': 700000, 'max_salary': 1200000},
                {'title': 'VP Sales', 'code': 'VPS', 'dept': 'SAL', 'level': 'director', 'min_salary': 1500000, 'max_salary': 2500000},
                
                # Marketing
                {'title': 'Marketing Executive', 'code': 'MXE', 'dept': 'MKT', 'level': 'junior', 'min_salary': 300000, 'max_salary': 600000},
                {'title': 'Marketing Manager', 'code': 'MM', 'dept': 'MKT', 'level': 'manager', 'min_salary': 700000, 'max_salary': 1200000},
                
                # Operations
                {'title': 'Operations Executive', 'code': 'OXE', 'dept': 'OPS', 'level': 'junior', 'min_salary': 300000, 'max_salary': 600000},
                {'title': 'Operations Manager', 'code': 'OM', 'dept': 'OPS', 'level': 'manager', 'min_salary': 700000, 'max_salary': 1200000},
                
                # QA
                {'title': 'QA Engineer', 'code': 'QAE', 'dept': 'QA', 'level': 'junior', 'min_salary': 350000, 'max_salary': 700000},
                {'title': 'QA Lead', 'code': 'QAL', 'dept': 'QA', 'level': 'lead', 'min_salary': 700000, 'max_salary': 1200000},
                
                # Customer Support
                {'title': 'Support Executive', 'code': 'CSE', 'dept': 'CS', 'level': 'junior', 'min_salary': 250000, 'max_salary': 500000},
                {'title': 'Support Manager', 'code': 'CSM', 'dept': 'CS', 'level': 'manager', 'min_salary': 600000, 'max_salary': 1000000},
            ]
            
            for desig_data in designations_data:
                department = created_departments[desig_data['dept']]
                desig, created = Designation.objects.get_or_create(
                    company=company,
                    code=desig_data['code'],
                    defaults={
                        'title': desig_data['title'],
                        'department': department,
                        'level': desig_data['level'],
                        'min_salary': desig_data['min_salary'],
                        'max_salary': desig_data['max_salary']
                    }
                )
                if created:
                    self.stdout.write(f'  Created designation: {desig.title}')
                else:
                    self.stdout.write(f'  Designation already exists: {desig.title}')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created HR data for {company.name}'))