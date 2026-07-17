from django.db import models
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from authentication.models import Company, CompanyServiceUser
from .models import Employee, Payslip
from .compliance_validators import ComplianceValidators, DataIntegrityValidator


class StatutorySettings(models.Model):
    """Company statutory compliance settings"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='statutory_settings')
    
    # PF Settings
    pf_establishment_code = models.CharField(max_length=50, blank=True, help_text="PF Establishment Code")
    pf_extension_code = models.CharField(max_length=10, blank=True, help_text="PF Extension Code")
    pf_enabled = models.BooleanField(default=False)
    pf_employee_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    pf_employer_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    pf_ceiling = models.DecimalField(max_digits=10, decimal_places=2, default=15000)
    
    # ESI Settings  
    esi_employer_code = models.CharField(max_length=20, blank=True, help_text="ESI Employer Code")
    esi_local_office = models.CharField(max_length=100, blank=True, help_text="ESI Local Office")
    esi_enabled = models.BooleanField(default=False)
    esi_employee_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.75)
    esi_employer_rate = models.DecimalField(max_digits=5, decimal_places=2, default=3.25)
    esi_ceiling = models.DecimalField(max_digits=10, decimal_places=2, default=21000)
    
    # Professional Tax
    pt_registration_number = models.CharField(max_length=50, blank=True, help_text="PT Registration Number")
    pt_state = models.CharField(max_length=50, default='Maharashtra', choices=[
        ('Maharashtra', 'Maharashtra'),
        ('Karnataka', 'Karnataka'),
        ('West Bengal', 'West Bengal'),
        ('Assam', 'Assam'),
        ('Gujarat', 'Gujarat'),
        ('Tamil Nadu', 'Tamil Nadu'),
    ])
    pt_enabled = models.BooleanField(default=False)
    pt_slabs = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Company-verified monthly PT slabs. Each item contains min_salary, "
            "max_salary (optional), and amount."
        ),
    )
    
    # TDS Settings
    tan_number = models.CharField(max_length=10, blank=True, validators=[
        RegexValidator(regex=r'^[A-Z]{4}[0-9]{5}[A-Z]{1}$', message='Enter valid TAN number')
    ], help_text="Tax Deduction Account Number")
    tds_circle = models.CharField(max_length=100, blank=True, help_text="TDS Circle")
    tds_enabled = models.BooleanField(default=False)
    overtime_enabled = models.BooleanField(default=False)
    
    # Labor Law Settings
    working_hours_per_day = models.IntegerField(default=8)
    working_days_per_week = models.IntegerField(default=6)
    overtime_rate_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=2.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        """Validate statutory settings data"""
        try:
            DataIntegrityValidator.validate_statutory_settings({
                'pf_employee_rate': self.pf_employee_rate,
                'pf_employer_rate': self.pf_employer_rate,
                'esi_employee_rate': self.esi_employee_rate,
                'esi_employer_rate': self.esi_employer_rate,
                'tan_number': self.tan_number
            })
        except ValidationError as e:
            raise ValidationError(f"Statutory settings validation failed: {str(e)}")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Statutory Settings - {self.company.name}"


class EmployeeStatutoryDetails(models.Model):
    """Employee statutory compliance details"""
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='statutory_details')
    
    # UAN Details
    uan_number = models.CharField(max_length=12, blank=True, validators=[
        RegexValidator(regex=r'^[0-9]{12}$', message='Enter valid 12-digit UAN number')
    ], help_text="Universal Account Number")
    pf_account_number = models.CharField(max_length=50, blank=True, help_text="PF Account Number")
    pf_nomination_submitted = models.BooleanField(default=False)
    
    # ESI Details
    esi_ip_number = models.CharField(max_length=17, blank=True, validators=[
        RegexValidator(regex=r'^[0-9]{10}[0-9]{7}$', message='Enter valid 17-digit ESI IP number')
    ], help_text="ESI Insurance Person Number")
    esi_dispensary = models.CharField(max_length=100, blank=True, help_text="ESI Dispensary")
    
    # Identity Verification
    aadhaar_pan_linked = models.BooleanField(default=False, help_text="Aadhaar-PAN linking status")
    bank_verified = models.BooleanField(default=False, help_text="Bank account verification status")
    kyc_completed = models.BooleanField(default=False, help_text="KYC completion status")
    
    # Minimum Wage Category
    wage_category = models.CharField(max_length=20, choices=[
        ('skilled', 'Skilled'),
        ('semi_skilled', 'Semi-Skilled'),
        ('unskilled', 'Unskilled'),
    ], default='skilled')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Statutory Details - {self.employee.full_name}"


class GovernmentReturn(models.Model):
    """Government return filing tracking"""
    RETURN_TYPES = [
        ('pf_ecr', 'PF ECR'),
        ('esi_return', 'ESI Return'),
        ('pt_return', 'Professional Tax Return'),
        ('tds_24q', 'TDS 24Q Return'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generated', 'Generated'),
        ('filed', 'Filed'),
        ('overdue', 'Overdue'),
        ('rejected', 'Rejected'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='government_returns')
    return_type = models.CharField(max_length=20, choices=RETURN_TYPES)
    period_month = models.IntegerField()
    period_year = models.IntegerField()
    
    # Filing Details
    generated_date = models.DateField(null=True, blank=True)
    filed_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Return Data
    return_data = models.JSONField(default=dict, help_text="Return calculation data")
    file_path = models.CharField(max_length=500, blank=True, help_text="Generated file path")
    acknowledgment_number = models.CharField(max_length=50, blank=True, help_text="Government acknowledgment number")
    
    # Financial Summary
    total_employees = models.IntegerField(default=0)
    total_wages = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_contribution = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_returns')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'return_type', 'period_month', 'period_year']
        ordering = ['-period_year', '-period_month']
    
    def __str__(self):
        return f"{self.get_return_type_display()} - {self.period_month}/{self.period_year}"


class ComplianceAlert(models.Model):
    """Compliance alerts and notifications"""
    ALERT_TYPES = [
        ('filing_due', 'Filing Due'),
        ('license_renewal', 'License Renewal'),
        ('compliance_violation', 'Compliance Violation'),
        ('document_expiry', 'Document Expiry'),
        ('wage_violation', 'Minimum Wage Violation'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='compliance_alerts')
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    is_resolved = models.BooleanField(default=False)
    resolved_date = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_compliance_alerts')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', '-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.company.name}"


class PayslipStatutoryDetails(models.Model):
    """Enhanced statutory details for existing payslips"""
    payslip = models.OneToOneField(Payslip, on_delete=models.CASCADE, related_name='statutory_details')
    
    # Enhanced PF Calculations
    pf_wages = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="PF eligible wages")
    pf_ceiling_applied = models.BooleanField(default=False, help_text="PF ceiling limit applied")
    eps_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="EPS contribution")
    
    # Enhanced ESI Calculations  
    esi_wages = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="ESI eligible wages")
    esi_ceiling_applied = models.BooleanField(default=False, help_text="ESI ceiling limit applied")
    esi_days = models.IntegerField(default=0, help_text="ESI contribution days")
    
    # Enhanced TDS Calculations
    hra_exemption = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="HRA exemption amount")
    standard_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=50000, help_text="Standard deduction")
    taxable_income = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Taxable income")
    tax_slab = models.CharField(max_length=20, blank=True, help_text="Applied tax slab")
    
    # Professional Tax by State
    pt_state = models.CharField(max_length=50, default='Maharashtra', help_text="Professional tax state")
    pt_slab = models.CharField(max_length=20, blank=True, help_text="Professional tax slab")
    pt_exemption_applied = models.BooleanField(default=False)
    
    # Labor Law Compliance
    working_days_in_month = models.IntegerField(default=0)
    overtime_hours_calculated = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    overtime_rate_applied = models.DecimalField(max_digits=5, decimal_places=2, default=2.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Statutory Details - {self.payslip.emp_name} - {self.payslip.payroll_cycle.name}"


class MinimumWageRate(models.Model):
    """State-wise minimum wage rates"""
    state = models.CharField(max_length=50)
    category = models.CharField(max_length=20, choices=[
        ('skilled', 'Skilled'),
        ('semi_skilled', 'Semi-Skilled'),
        ('unskilled', 'Unskilled'),
    ])
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2)
    monthly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['state', 'category', 'effective_from']
        ordering = ['-effective_from']
    
    def __str__(self):
        return f"{self.state} - {self.category} - ₹{self.monthly_rate}"


class LaborLawCompliance(models.Model):
    """Labor law compliance tracking"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='labor_compliance')
    
    # Shops & Establishments
    shops_establishment_license = models.CharField(max_length=100, blank=True)
    license_expiry_date = models.DateField(null=True, blank=True)
    
    # Contract Labor License
    contract_labor_license = models.CharField(max_length=100, blank=True)
    contract_license_expiry = models.DateField(null=True, blank=True)
    
    # Factory License (if applicable)
    factory_license = models.CharField(max_length=100, blank=True)
    factory_license_expiry = models.DateField(null=True, blank=True)
    
    # Compliance Status
    working_hours_compliant = models.BooleanField(default=True)
    overtime_compliant = models.BooleanField(default=True)
    minimum_wage_compliant = models.BooleanField(default=True)
    
    last_audit_date = models.DateField(null=True, blank=True)
    next_audit_due = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Labor Compliance - {self.company.name}"
