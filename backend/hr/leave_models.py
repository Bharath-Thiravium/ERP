from django.db import models
from django.core.validators import MinValueValidator
from authentication.models import Company, CompanyServiceUser
from .models import Employee


class LeaveType(models.Model):
    """Leave types configuration"""
    LEAVE_CATEGORIES = [
        ('earned', 'Earned Leave'),
        ('casual', 'Casual Leave'),
        ('sick', 'Sick Leave'),
        ('maternity', 'Maternity Leave'),
        ('paternity', 'Paternity Leave'),
        ('compensatory', 'Compensatory Off'),
        ('unpaid', 'Unpaid Leave'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='leave_types')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    category = models.CharField(max_length=20, choices=LEAVE_CATEGORIES)
    days_per_year = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0)])
    max_carry_forward = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_paid = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    min_days_notice = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['company', 'code']
    
    def __str__(self):
        return f"{self.name} - {self.company.name}"


class LeaveBalance(models.Model):
    """Employee leave balance tracking"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='balances')
    year = models.IntegerField()
    opening_balance = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    credited = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    used = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    closing_balance = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    class Meta:
        unique_together = ['employee', 'leave_type', 'year']
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type.name} - {self.year}"
    
    def calculate_balance(self):
        self.closing_balance = self.opening_balance + self.credited - self.used
        self.save()


class LeaveApplication(models.Model):
    """Leave application and approval workflow"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_applications')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='applications')
    from_date = models.DateField()
    to_date = models.DateField()
    total_days = models.DecimalField(max_digits=5, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    approved_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves')
    approved_date = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type.name} - {self.from_date}"


class Holiday(models.Model):
    """Company holidays calendar"""
    HOLIDAY_TYPES = [
        ('national', 'National Holiday'),
        ('regional', 'Regional Holiday'),
        ('optional', 'Optional Holiday'),
        ('company', 'Company Holiday'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='holidays')
    name = models.CharField(max_length=200)
    date = models.DateField()
    holiday_type = models.CharField(max_length=20, choices=HOLIDAY_TYPES, default='national')
    is_mandatory = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    applicable_states = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['company', 'date', 'name']
        ordering = ['date']
    
    def __str__(self):
        return f"{self.name} - {self.date}"
