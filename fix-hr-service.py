#!/usr/bin/env python3

import os
import sys
import django

# Setup Django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from hr.models import Employee, Department, Designation, Attendance
from authentication.models import Company, ServiceUser
from django.utils import timezone
from datetime import datetime, timedelta

def fix_hr_service():
    """Fix HR service board issues"""
    
    print("🔧 Fixing HR Service Board Issues...")
    
    # 1. Create sample company if none exists
    company = Company.objects.first()
    if not company:
        print("❌ No company found! Please create a company first.")
        return
    
    print(f"✅ Using company: {company.name}")
    
    # 2. Create sample departments
    dept, created = Department.objects.get_or_create(
        company=company,
        name="Field Staff",
        defaults={'description': 'Field employees'}
    )
    if created:
        print("✅ Created Field Staff department")
    
    # 3. Create sample designation
    desig, created = Designation.objects.get_or_create(
        company=company,
        title="Field Worker",
        department=dept,
        defaults={'level': 1}
    )
    if created:
        print("✅ Created Field Worker designation")
    
    # 4. Create sample employees with photos
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
        }
    ]
    
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
    
    # 5. Create sample attendance records
    today = timezone.now().date()
    for i in range(3):  # Last 3 days
        date = today - timedelta(days=i)
        
        for employee in Employee.objects.filter(company=company):
            attendance, created = Attendance.objects.get_or_create(
                employee=employee,
                date=date,
                defaults={
                    'status': 'present',
                    'check_in_time': '09:00:00',
                    'check_out_time': '18:00:00' if i > 0 else None,  # Today no checkout yet
                    'working_hours': 8.0 if i > 0 else 0.0,
                    'attendance_method': 'mobile',
                    'check_in_location': 'Office',
                    'is_within_geofence': True
                }
            )
            
            if created:
                print(f"✅ Created attendance for {employee.employee_id} on {date}")
    
    # 6. Check service users
    hr_service_users = ServiceUser.objects.filter(service__service_type='hr', company=company)
    if hr_service_users.exists():
        print(f"✅ Found {hr_service_users.count()} HR service users")
        for user in hr_service_users:
            print(f"   - {user.username} ({user.email})")
    else:
        print("⚠️  No HR service users found. Please create one in Django admin.")
    
    print("\n🎉 HR Service Board Fix Complete!")
    print("\n📋 Summary:")
    print(f"   - Company: {company.name}")
    print(f"   - Departments: {Department.objects.filter(company=company).count()}")
    print(f"   - Employees: {Employee.objects.filter(company=company).count()}")
    print(f"   - Attendance Records: {Attendance.objects.filter(employee__company=company).count()}")
    print(f"   - HR Service Users: {hr_service_users.count()}")
    
    print("\n🔑 Next Steps:")
    print("1. Start backend: python manage.py runserver 0.0.0.0:8000")
    print("2. Start frontend: cd frontend && npm run dev")
    print("3. Login to HR service with service user credentials")
    print("4. Check HR dashboard and employee management")

if __name__ == "__main__":
    fix_hr_service()