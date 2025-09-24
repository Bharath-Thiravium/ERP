#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('/home/athenas/sap project/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from hr.models import Designation
from authentication.models import Company

def create_default_designations():
    from hr.models import Department
    
    # Get the first company
    company = Company.objects.first()
    if not company:
        print('No company found. Please create a company first.')
        return

    # Create default departments first
    departments_data = [
        {'name': 'Engineering', 'description': 'Software development and technical operations'},
        {'name': 'Human Resources', 'description': 'Employee management and HR operations'},
        {'name': 'Finance', 'description': 'Financial management and accounting'},
        {'name': 'Sales', 'description': 'Sales and customer acquisition'},
        {'name': 'Marketing', 'description': 'Marketing and brand management'},
    ]
    
    departments = {}
    for dept_data in departments_data:
        dept, created = Department.objects.get_or_create(
            name=dept_data['name'],
            company=company,
            defaults={'description': dept_data['description']}
        )
        departments[dept_data['name']] = dept
        if created:
            print(f'Created department: {dept.name}')

    # Create default designations
    designations = [
        {'title': 'Software Engineer', 'department': 'Engineering', 'level': 2},
        {'title': 'Senior Software Engineer', 'department': 'Engineering', 'level': 3},
        {'title': 'Team Lead', 'department': 'Engineering', 'level': 4},
        {'title': 'Project Manager', 'department': 'Engineering', 'level': 4},
        {'title': 'HR Manager', 'department': 'Human Resources', 'level': 5},
        {'title': 'Finance Manager', 'department': 'Finance', 'level': 5},
        {'title': 'Sales Executive', 'department': 'Sales', 'level': 2},
        {'title': 'Marketing Executive', 'department': 'Marketing', 'level': 2},
        {'title': 'Business Analyst', 'department': 'Engineering', 'level': 3},
        {'title': 'Quality Assurance Engineer', 'department': 'Engineering', 'level': 2},
    ]

    created_count = 0
    for designation_data in designations:
        department = departments[designation_data['department']]
        designation, created = Designation.objects.get_or_create(
            title=designation_data['title'],
            company=company,
            department=department,
            defaults={'level': designation_data['level']}
        )
        if created:
            created_count += 1
            print(f'Created: {designation.title} in {department.name}')
        else:
            print(f'Already exists: {designation.title} in {department.name}')

    print(f'Total designations created: {created_count}')
    print(f'Total designations in database: {Designation.objects.filter(company=company).count()}')

if __name__ == '__main__':
    create_default_designations()