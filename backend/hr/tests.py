from django.test import TestCase
from django.contrib.auth.models import User
from authentication.models import Company
from .models import Department, Employee, Attendance
from decimal import Decimal
from django.utils import timezone

class DepartmentModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )

    def test_department_creation(self):
        department = Department.objects.create(
            company=self.company,
            name="IT Department",
            code="IT001"
        )
        self.assertEqual(department.name, "IT Department")
        self.assertEqual(department.code, "IT001")
        self.assertTrue(department.is_active)

class EmployeeModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )
        self.department = Department.objects.create(
            company=self.company,
            name="IT Department",
            code="IT001"
        )
        from .models import Designation
        self.designation = Designation.objects.create(
            company=self.company,
            title="Software Engineer",
            code="SE001",
            department=self.department
        )

    def test_employee_creation(self):
        employee = Employee.objects.create(
            company=self.company,
            first_name="John",
            last_name="Doe",
            email="john.doe@company.com",
            department=self.department,
            designation=self.designation,
            date_of_joining=timezone.now().date(),
            base_salary=Decimal('50000.00')
        )
        self.assertEqual(employee.first_name, "John")
        self.assertEqual(employee.last_name, "Doe")
        self.assertTrue(len(employee.employee_id) > 0)  # Auto-generated ID exists
        self.assertEqual(employee.full_name, "John Doe")

class AttendanceModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )
        self.department = Department.objects.create(
            company=self.company,
            name="IT Department",
            code="IT001"
        )
        from .models import Designation
        self.designation = Designation.objects.create(
            company=self.company,
            title="Software Engineer",
            code="SE001",
            department=self.department
        )
        self.employee = Employee.objects.create(
            company=self.company,
            first_name="John",
            last_name="Doe",
            email="john.doe@company.com",
            department=self.department,
            designation=self.designation,
            date_of_joining=timezone.now().date(),
            base_salary=Decimal('50000.00')
        )

    def test_attendance_creation(self):
        attendance = Attendance.objects.create(
            employee=self.employee,
            date=timezone.now().date(),
            check_in_time=timezone.now(),
            status='present'
        )
        self.assertEqual(attendance.employee, self.employee)
        self.assertEqual(attendance.status, 'present')