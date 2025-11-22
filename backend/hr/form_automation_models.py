from django.db import models
from django.contrib.auth.models import User
from authentication.models import Company, CompanyServiceUser
from .models import Employee
import uuid

class ComplianceFormTemplate(models.Model):
    """Template configuration for compliance forms"""
    FORM_TYPES = [
        ('register_of_fines', 'Register of Fines'),
        ('register_of_workmen', 'Register of Workmen'),
        ('custom_template', 'Custom Template'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='form_templates')
    form_type = models.CharField(max_length=50, choices=FORM_TYPES)
    template_name = models.CharField(max_length=200)
    template_file = models.FileField(upload_to='compliance_templates/', null=True, blank=True)
    file_type = models.CharField(max_length=10, choices=[('excel', 'Excel'), ('pdf', 'PDF'), ('word', 'Word')], null=True, blank=True)
    template_structure = models.JSONField(default=dict, blank=True, help_text="Parsed template structure and fields")
    is_monthly_auto_generate = models.BooleanField(default=True)
    generation_day = models.IntegerField(default=1, help_text="Day of month to generate (1-28)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.template_name} - {self.company.name}"
    
    def can_generate_today(self):
        """Check if template can be generated today based on schedule"""
        from django.utils import timezone
        today = timezone.now().date()
        current_month = today.replace(day=1)
        
        # Check if already generated for current month
        existing_form = self.monthlycomplianceform_set.filter(
            month=current_month
        ).exists()
        
        if existing_form:
            return False  # Already generated for this month
        
        return today.day >= self.generation_day and self.is_active

class MonthlyComplianceForm(models.Model):
    """Monthly generated compliance forms"""
    STATUS_CHOICES = [
        ('generated', 'Generated'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('submitted', 'Submitted to Authority'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='monthly_forms')
    template = models.ForeignKey(ComplianceFormTemplate, on_delete=models.CASCADE)
    month = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generated')
    total_employees = models.IntegerField(default=0)
    auto_generated = models.BooleanField(default=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['company', 'template', 'month']
        ordering = ['-month']

    def __str__(self):
        return f"{self.template.form_type} - {self.month.strftime('%B %Y')} - {self.company.name}"
    
    def is_current_month(self):
        """Check if this form is for current month"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.month.year == today.year and self.month.month == today.month

class EmployeeFormEntry(models.Model):
    """Individual employee entries in monthly forms"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    monthly_form = models.ForeignKey(MonthlyComplianceForm, on_delete=models.CASCADE, related_name='employee_entries')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    
    # Register of Fines specific fields
    fine_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fine_reason = models.TextField(blank=True)
    fine_date = models.DateField(null=True, blank=True)
    
    # Register of Workmen specific fields - Form XIII compliant
    designation = models.CharField(max_length=200, blank=True)
    department = models.CharField(max_length=200, blank=True)
    joining_date = models.DateField(null=True, blank=True)
    basic_wage = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Additional Form XIII fields
    father_husband_name = models.CharField(max_length=200, blank=True, help_text="Father's/Husband's name")
    nature_of_employment = models.CharField(max_length=200, blank=True, help_text="Nature of employment")
    permanent_address = models.TextField(blank=True, help_text="Permanent address")
    local_address = models.TextField(blank=True, help_text="Local address")
    termination_date = models.DateField(null=True, blank=True, help_text="Date of termination")
    termination_reason = models.TextField(blank=True, help_text="Reason for termination")
    
    # Common fields
    remarks = models.TextField(blank=True)
    
    # Dynamic template data
    dynamic_data = models.JSONField(default=dict, blank=True, help_text="Dynamic data based on template structure")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['monthly_form', 'employee']

    def __str__(self):
        return f"{self.employee.full_name} - {self.monthly_form.template.form_type}"

class FormGenerationSchedule(models.Model):
    """Scheduling system for automated form generation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='form_schedules')
    template = models.ForeignKey(ComplianceFormTemplate, on_delete=models.CASCADE)
    scheduled_date = models.DateTimeField()
    is_executed = models.BooleanField(default=False)
    executed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Schedule: {self.template.form_type} - {self.scheduled_date}"