from django.db import models
from django.contrib.auth.models import User
from authentication.models import Company
from decimal import Decimal

class Department(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    head = models.ForeignKey('Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_departments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'name']

    def __str__(self):
        return f"{self.company.name} - {self.name}"

class Designation(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='designations')
    title = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='designations')
    level = models.IntegerField(default=1)  # 1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Manager
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['company', 'title', 'department']

    def __str__(self):
        return f"{self.title} - {self.department.name}"

class Employee(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other')
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('terminated', 'Terminated'),
        ('resigned', 'Resigned')
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='employees')
    employee_id = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth = models.DateField()
    
    # Address Information
    address_line1 = models.CharField(max_length=200)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=50)
    state = models.CharField(max_length=50)
    pincode = models.CharField(max_length=10)
    country = models.CharField(max_length=50, default='India')
    
    # Professional Information
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='employees')
    designation = models.ForeignKey(Designation, on_delete=models.CASCADE, related_name='employees')
    reporting_manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    join_date = models.DateField()
    confirmation_date = models.DateField(null=True, blank=True)
    
    # Compliance Information
    aadhar_number = models.CharField(max_length=12, unique=True)
    pan_number = models.CharField(max_length=10, unique=True)
    uan_number = models.CharField(max_length=12, blank=True)  # PF UAN
    esi_number = models.CharField(max_length=17, blank=True)  # ESI Number
    
    # Bank Information
    bank_name = models.CharField(max_length=100)
    bank_account_number = models.CharField(max_length=20)
    bank_ifsc_code = models.CharField(max_length=11)
    bank_branch = models.CharField(max_length=100)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_employees')

    class Meta:
        unique_together = ['company', 'employee_id']

    def __str__(self):
        return f"{self.employee_id} - {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

class SalaryStructure(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='salary_structure')
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2)
    hra = models.DecimalField(max_digits=10, decimal_places=2)
    da = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Dearness Allowance
    transport_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    medical_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Deductions
    pf_applicable = models.BooleanField(default=True)
    esi_applicable = models.BooleanField(default=True)
    professional_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    effective_from = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee.full_name} - Salary Structure"

    @property
    def gross_salary(self):
        return (self.basic_salary + self.hra + self.da + 
                self.transport_allowance + self.medical_allowance + self.other_allowances)

    @property
    def pf_deduction(self):
        if self.pf_applicable:
            return self.basic_salary * Decimal('0.12')  # 12% of basic
        return Decimal('0')

    @property
    def esi_deduction(self):
        if self.esi_applicable and self.gross_salary <= 25000:  # ESI applicable up to 25k
            return self.gross_salary * Decimal('0.0175')  # 1.75%
        return Decimal('0')

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('half_day', 'Half Day'),
        ('on_leave', 'On Leave')
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    working_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='absent')
    
    # Location tracking
    check_in_location = models.CharField(max_length=200, blank=True)
    check_out_location = models.CharField(max_length=200, blank=True)
    check_in_latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    check_in_longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'date']

    def __str__(self):
        return f"{self.employee.full_name} - {self.date} - {self.status}"

class LeaveType(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='leave_types')
    name = models.CharField(max_length=50)  # Casual, Sick, Earned, Maternity, etc.
    annual_allocation = models.IntegerField()  # Days per year
    carry_forward = models.BooleanField(default=False)
    max_carry_forward = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['company', 'name']

    def __str__(self):
        return f"{self.company.name} - {self.name}"

class LeaveBalance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.IntegerField()
    allocated = models.IntegerField()
    used = models.IntegerField(default=0)
    carry_forward = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['employee', 'leave_type', 'year']

    @property
    def available(self):
        return self.allocated + self.carry_forward - self.used

    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type.name} - {self.year}"

class LeaveApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled')
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_applications')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    from_date = models.DateField()
    to_date = models.DateField()
    days_requested = models.IntegerField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Approval workflow
    approved_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type.name} - {self.from_date} to {self.to_date}"

class Payroll(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('processed', 'Processed'),
        ('paid', 'Paid')
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payrolls')
    month = models.IntegerField()
    year = models.IntegerField()
    
    # Salary components
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2)
    hra = models.DecimalField(max_digits=10, decimal_places=2)
    da = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transport_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    medical_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Deductions
    pf_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    esi_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    professional_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tds_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Attendance data
    working_days = models.IntegerField()
    present_days = models.IntegerField()
    leave_days = models.IntegerField(default=0)
    
    # Calculated amounts
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'month', 'year']

    def __str__(self):
        return f"{self.employee.full_name} - {self.month}/{self.year}"