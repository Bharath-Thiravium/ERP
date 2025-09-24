#!/usr/bin/env python3

import os
import sys
import django

# Setup Django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from hr.models import Employee, Department, Designation
from authentication.models import Company

def create_sample_employees():
    """Create sample employees for testing"""
    
    # Get or create company
    company = Company.objects.first()
    if not company:
        print("❌ No company found! Please create a company first.")
        return
    
    # Create department
    dept, created = Department.objects.get_or_create(
        company=company,
        name="Field Staff",
        defaults={'description': 'Field employees'}
    )
    
    # Create designation
    desig, created = Designation.objects.get_or_create(
        company=company,
        title="Field Worker",
        department=dept,
        defaults={'level': 1}
    )
    
    # Sample employees data
    employees_data = [
        {
            'employee_id': 'EMP001',
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@company.com',
            'phone': '9999999001'
        },
        {
            'employee_id': 'EMP002', 
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane.smith@company.com',
            'phone': '9999999002'
        },
        {
            'employee_id': 'EMP003',
            'first_name': 'Mike',
            'last_name': 'Johnson',
            'email': 'mike.johnson@company.com', 
            'phone': '9999999003'
        },
        {
            'employee_id': 'EMP004',
            'first_name': 'Sarah',
            'last_name': 'Wilson',
            'email': 'sarah.wilson@company.com',
            'phone': '9999999004'
        },
        {
            'employee_id': 'EMP005',
            'first_name': 'David',
            'last_name': 'Brown',
            'email': 'david.brown@company.com',
            'phone': '9999999005'
        }
    ]
    
    print("👥 Creating sample employees...")
    
    for emp_data in employees_data:
        employee, created = Employee.objects.get_or_create(
            company=company,
            employee_id=emp_data['employee_id'],
            defaults={
                'first_name': emp_data['first_name'],
                'last_name': emp_data['last_name'],
                'email': emp_data['email'],
                'phone': emp_data['phone'],
                'gender': 'M',
                'date_of_birth': '1990-01-01',
                'department': dept,
                'designation': desig,
                'join_date': '2024-01-01',
                'aadhar_number': f"12345678901{emp_data['employee_id'][-1]}",
                'pan_number': f"ABCDE123{emp_data['employee_id'][-1]}F",
                'bank_name': 'Test Bank',
                'bank_account_number': f"123456789{emp_data['employee_id'][-1]}",
                'bank_ifsc_code': 'TEST0001234',
                'bank_branch': 'Test Branch',
                'attendance_method': 'mobile_gps',
                'status': 'active',
                'address_line1': 'Test Address',
                'city': 'Test City',
                'state': 'Test State',
                'pincode': '123456'
            }
        )
        
        if created:
            print(f"✅ Created employee: {emp_data['employee_id']} - {emp_data['first_name']} {emp_data['last_name']}")
        else:
            print(f"ℹ️  Employee already exists: {emp_data['employee_id']}")
    
    print("\n📋 Employee Login Credentials:")
    print("=" * 50)
    for emp_data in employees_data:
        print(f"Employee ID: {emp_data['employee_id']} | Name: {emp_data['first_name']} {emp_data['last_name']}")
    print("=" * 50)
    print("\n✅ Sample employees created successfully!")
    print("📱 Employees can now login to mobile app with their Employee ID")

if __name__ == "__main__":
    create_sample_employees()