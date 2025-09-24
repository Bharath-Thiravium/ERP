#!/usr/bin/env python3
"""
Test script for Enhanced Onboarding System
Run this after setting up the enhanced onboarding system
"""

import os
import sys
import django
from datetime import date, timedelta

# Setup Django
sys.path.append('/home/athenas/sap project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Company, ServiceUser, ServiceUserSession
from hr.models import Employee, Department, Designation, SalaryStructure, LeaveType, LeaveBalance, WorkSchedule
from hr.complete_models import OnboardingTemplate, OnboardingTask, OnboardingProcess, OnboardingTaskProgress, JobApplication, JobPosting
from decimal import Decimal

def create_test_data():
    """Create test data for enhanced onboarding system"""
    
    print("🚀 Setting up Enhanced Onboarding Test Data...")
    
    # Get or create test company
    company, created = Company.objects.get_or_create(
        name="Test Company Ltd",
        defaults={
            'email': 'test@company.com',
            'phone': '9876543210',
            'address': 'Test Address',
            'city': 'Test City',
            'state': 'Test State',
            'pincode': '123456',
            'gst_number': 'TEST123456789',
            'status': 'approved'
        }
    )
    
    if created:
        print(f"✅ Created test company: {company.name}")
    else:
        print(f"✅ Using existing company: {company.name}")
    
    # Create HR service user
    hr_user, created = ServiceUser.objects.get_or_create(
        company=company,
        service_type='hr',
        defaults={
            'full_name': 'HR Manager',
            'email': 'hr@testcompany.com',
            'role': 'HR Manager',
            'is_active': True
        }
    )
    
    if created:
        print(f"✅ Created HR service user: {hr_user.full_name}")
    
    # Create session for testing
    session, created = ServiceUserSession.objects.get_or_create(
        service_user=hr_user,
        defaults={
            'session_key': 'test_session_key_123',
            'is_active': True
        }
    )
    
    if created:
        print(f"✅ Created test session: {session.session_key}")
    
    # Create departments
    departments_data = [
        {'name': 'Engineering', 'description': 'Software Development Team'},
        {'name': 'Human Resources', 'description': 'HR and Admin Team'},
        {'name': 'Sales', 'description': 'Sales and Marketing Team'},
        {'name': 'Finance', 'description': 'Finance and Accounting Team'}
    ]
    
    departments = []
    for dept_data in departments_data:
        dept, created = Department.objects.get_or_create(
            company=company,
            name=dept_data['name'],
            defaults={'description': dept_data['description']}
        )
        departments.append(dept)
        if created:
            print(f"✅ Created department: {dept.name}")
    
    # Create designations
    designations_data = [
        {'title': 'Software Engineer', 'department': departments[0], 'level': 2},
        {'title': 'Senior Software Engineer', 'department': departments[0], 'level': 3},
        {'title': 'HR Executive', 'department': departments[1], 'level': 2},
        {'title': 'Sales Executive', 'department': departments[2], 'level': 2},
        {'title': 'Accountant', 'department': departments[3], 'level': 2}
    ]
    
    designations = []
    for des_data in designations_data:
        des, created = Designation.objects.get_or_create(
            company=company,
            title=des_data['title'],
            department=des_data['department'],
            defaults={'level': des_data['level']}
        )
        designations.append(des)
        if created:
            print(f"✅ Created designation: {des.title}")
    
    # Create leave types
    leave_types_data = [
        {'name': 'Casual Leave', 'annual_allocation': 12, 'carry_forward': False},
        {'name': 'Sick Leave', 'annual_allocation': 7, 'carry_forward': False},
        {'name': 'Earned Leave', 'annual_allocation': 21, 'carry_forward': True, 'max_carry_forward': 5},
        {'name': 'Personal Leave', 'annual_allocation': 5, 'carry_forward': False}
    ]
    
    for leave_data in leave_types_data:
        leave_type, created = LeaveType.objects.get_or_create(
            company=company,
            name=leave_data['name'],
            defaults={
                'annual_allocation': leave_data['annual_allocation'],
                'carry_forward': leave_data['carry_forward'],
                'max_carry_forward': leave_data.get('max_carry_forward', 0),
                'is_active': True
            }
        )
        if created:
            print(f"✅ Created leave type: {leave_type.name}")
    
    # Create job posting and application for testing
    job_posting, created = JobPosting.objects.get_or_create(
        company=company,
        title='Software Engineer',
        department=departments[0],
        defaults={
            'employment_type': 'full_time',
            'location': 'Bangalore',
            'salary_min': Decimal('400000'),
            'salary_max': Decimal('800000'),
            'description': 'We are looking for a talented Software Engineer...',
            'requirements': 'Bachelor\'s degree in Computer Science, 2+ years experience',
            'experience_required': '2-4 years',
            'skills_required': ['Python', 'Django', 'React', 'PostgreSQL'],
            'status': 'active'
        }
    )
    
    if created:
        print(f"✅ Created job posting: {job_posting.title}")
    
    # Create job application
    job_application, created = JobApplication.objects.get_or_create(
        job_posting=job_posting,
        candidate_email='john.doe@example.com',
        defaults={
            'candidate_name': 'John Doe',
            'candidate_phone': '9876543210',
            'experience_years': 3,
            'current_salary': Decimal('500000'),
            'expected_salary': Decimal('700000'),
            'notice_period': '30 days',
            'status': 'selected'
        }
    )
    
    if created:
        print(f"✅ Created job application: {job_application.candidate_name}")
    
    # Create onboarding template
    template, created = OnboardingTemplate.objects.get_or_create(
        company=company,
        name='Software Engineer Onboarding',
        defaults={
            'department': departments[0],
            'description': 'Complete onboarding process for software engineers',
            'duration_days': 30,
            'is_active': True
        }
    )
    
    if created:
        print(f"✅ Created onboarding template: {template.name}")
        
        # Create onboarding tasks
        tasks_data = [
            {
                'title': 'Document Verification',
                'description': 'Verify and collect all required documents (Aadhar, PAN, etc.)',
                'task_type': 'document',
                'due_days': 1,
                'is_mandatory': True,
                'assigned_to_role': 'HR',
                'order': 1
            },
            {
                'title': 'IT Setup',
                'description': 'Setup email account, system access, and equipment allocation',
                'task_type': 'system_access',
                'due_days': 2,
                'is_mandatory': True,
                'assigned_to_role': 'IT',
                'order': 2
            },
            {
                'title': 'Welcome Orientation',
                'description': 'Company introduction, policies, and culture orientation',
                'task_type': 'orientation',
                'due_days': 3,
                'is_mandatory': True,
                'assigned_to_role': 'HR',
                'order': 3
            },
            {
                'title': 'Team Introduction',
                'description': 'Meet team members and understand role responsibilities',
                'task_type': 'meeting',
                'due_days': 5,
                'is_mandatory': True,
                'assigned_to_role': 'Manager',
                'order': 4
            },
            {
                'title': 'Technical Setup',
                'description': 'Setup development environment and access to repositories',
                'task_type': 'system_access',
                'due_days': 7,
                'is_mandatory': True,
                'assigned_to_role': 'Tech Lead',
                'order': 5
            },
            {
                'title': 'First Week Review',
                'description': 'Review progress and address any concerns',
                'task_type': 'meeting',
                'due_days': 7,
                'is_mandatory': True,
                'assigned_to_role': 'Manager',
                'order': 6
            },
            {
                'title': 'Probation Review Setup',
                'description': 'Schedule probation review meetings and set goals',
                'task_type': 'other',
                'due_days': 14,
                'is_mandatory': True,
                'assigned_to_role': 'HR',
                'order': 7
            }
        ]
        
        for task_data in tasks_data:
            OnboardingTask.objects.create(template=template, **task_data)
        
        print(f"✅ Created {len(tasks_data)} onboarding tasks")
    
    print("\n🎉 Enhanced Onboarding Test Data Setup Complete!")
    print("\n📋 Test Data Summary:")
    print(f"   • Company: {company.name}")
    print(f"   • HR User: {hr_user.full_name}")
    print(f"   • Session Key: {session.session_key}")
    print(f"   • Departments: {len(departments)}")
    print(f"   • Designations: {len(designations)}")
    print(f"   • Leave Types: {LeaveType.objects.filter(company=company).count()}")
    print(f"   • Job Applications: {JobApplication.objects.filter(job_posting__company=company).count()}")
    print(f"   • Onboarding Templates: {OnboardingTemplate.objects.filter(company=company).count()}")
    
    print("\n🔗 API Testing URLs:")
    print(f"   • Dashboard: /api/hr/enhanced-onboarding/onboarding_dashboard/?session_key={session.session_key}")
    print(f"   • Create Employee: POST /api/hr/enhanced-onboarding/create_employee_with_onboarding/")
    print(f"   • Update Task: POST /api/hr/enhanced-onboarding/update_task_progress/")
    
    return {
        'company': company,
        'hr_user': hr_user,
        'session_key': session.session_key,
        'job_application': job_application,
        'departments': departments,
        'designations': designations
    }

def test_employee_creation():
    """Test the enhanced employee creation process"""
    
    print("\n🧪 Testing Enhanced Employee Creation...")
    
    # This would normally be done via API call
    # Here we simulate the process
    
    test_data = create_test_data()
    
    # Simulate employee data from frontend
    employee_data = {
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john.doe@testcompany.com',
        'phone': '9876543210',
        'gender': 'M',
        'date_of_birth': '1990-01-01',
        'address_line1': '123 Test Street',
        'city': 'Bangalore',
        'state': 'Karnataka',
        'pincode': '560001',
        'department': test_data['departments'][0].id,
        'designation': test_data['designations'][0].id,
        'join_date': date.today(),
        'aadhar_number': '123456789012',
        'pan_number': 'ABCDE1234F',
        'bank_name': 'Test Bank',
        'bank_account_number': '1234567890',
        'bank_ifsc_code': 'TEST0001234',
        'bank_branch': 'Test Branch',
        'candidate_id': test_data['job_application'].id
    }
    
    salary_data = {
        'basic_salary': 50000,
        'hra': 20000,
        'transport_allowance': 2000,
        'medical_allowance': 1500,
        'other_allowances': 0
    }
    
    print("✅ Employee data prepared")
    print("✅ Salary structure configured")
    print("✅ Ready for API integration")
    
    return employee_data, salary_data

if __name__ == "__main__":
    try:
        # Create test data
        test_data = create_test_data()
        
        # Test employee creation process
        employee_data, salary_data = test_employee_creation()
        
        print("\n🎯 Next Steps:")
        print("1. Start your Django server: python manage.py runserver")
        print("2. Start your React frontend: pnpm run dev")
        print("3. Navigate to HR Service → Onboarding")
        print("4. Click 'Enhanced Onboarding' for the test candidate")
        print("5. Complete the 6-step onboarding process")
        
        print("\n✨ Features to Test:")
        print("• 6-step onboarding pipeline with salary structure")
        print("• Automatic salary calculation with deductions")
        print("• Leave balance allocation")
        print("• Work schedule creation")
        print("• Onboarding task tracking")
        print("• Progress monitoring")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()