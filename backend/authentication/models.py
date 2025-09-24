from django.db import models
from django.contrib.auth.models import AbstractUser, User
from django.utils import timezone
from django.core.validators import EmailValidator
import json


class MasterAdmin(models.Model):
    """Master Admin model with enhanced security features"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='master_admin')
    company_name = models.CharField(max_length=255)
    api_key = models.CharField(max_length=64, unique=True)
    recovery_codes = models.TextField()  # JSON stored recovery codes
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    login_attempts = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    locked_until = models.DateTimeField(null=True, blank=True)
    password_expires_at = models.DateTimeField()
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True)

    def __str__(self):
        from .sanitizers import sanitize_html_input
        return f"Master Admin - {sanitize_html_input(self.company_name)}"

    def is_password_expired(self):
        return timezone.now() > self.password_expires_at

    def get_recovery_codes(self):
        return json.loads(self.recovery_codes) if self.recovery_codes else []


class Company(models.Model):
    """Company model for managing client companies"""
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]

    # Basic info (filled by master admin)
    name = models.CharField(max_length=255)
    company_prefix = models.CharField(max_length=10, unique=True, help_text="Unique prefix for auto-generated codes (e.g., ACME, TECH)")
    email = models.EmailField(validators=[EmailValidator()])
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_companies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Approval status
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_companies')
    approved_at = models.DateTimeField(null=True, blank=True)

    # Detailed info (filled by company user)
    detailed_info_submitted = models.BooleanField(default=False)
    detailed_info_submitted_at = models.DateTimeField(null=True, blank=True)

    # Company detailed information
    business_type = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    employee_count = models.IntegerField(null=True, blank=True)
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    website = models.URLField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    gst_number = models.CharField(max_length=15, blank=True, help_text="GST Registration Number")
    registration_number = models.CharField(max_length=50, blank=True)

    # Contact person details
    contact_person_name = models.CharField(max_length=255, blank=True)
    contact_person_title = models.CharField(max_length=100, blank=True)
    contact_person_email = models.EmailField(blank=True)
    contact_person_phone = models.CharField(max_length=20, blank=True)

    # Additional details
    description = models.TextField(blank=True)
    special_requirements = models.TextField(blank=True)

    # Company branding
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)

    class Meta:
        verbose_name_plural = "Companies"
        ordering = ['-created_at']

    def __str__(self):
        from .sanitizers import sanitize_html_input
        return sanitize_html_input(self.name)


class CompanyAutoCodeSettings(models.Model):
    """Auto-code generation settings for each company"""
    CODE_TYPES = [
        ('employee', 'Employee ID'),
        ('product', 'Product Code'),
        ('invoice', 'Invoice Number'),
        ('purchase_order', 'Purchase Order'),
        ('quotation', 'Quotation Number'),
        ('customer', 'Customer ID'),
        ('vendor', 'Vendor ID'),
        ('asset', 'Asset Code'),
        ('proforma_invoice', 'Proforma Invoice'),
        ('payment', 'Payment Number'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='auto_code_settings')
    code_type = models.CharField(max_length=20, choices=CODE_TYPES)
    current_number = models.IntegerField(default=0)
    number_length = models.IntegerField(default=3, help_text="Number of digits (e.g., 3 for 001)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'code_type']
        verbose_name = 'Company Auto Code Setting'
        verbose_name_plural = 'Company Auto Code Settings'

    def __str__(self):
        return f"{self.company.name} - {self.get_code_type_display()}"

    def get_next_code(self):
        """Generate next auto code for this type"""
        self.current_number += 1
        self.save()
        number_str = str(self.current_number).zfill(self.number_length)
        
        # Map code types to their prefixes
        code_prefixes = {
            'employee': 'EMP',
            'product': 'PRD',
            'invoice': 'INV',
            'purchase_order': 'POU',
            'quotation': 'QUO',
            'customer': 'CUS',
            'vendor': 'VEN',
            'asset': 'AST',
            'proforma_invoice': 'PFI',
            'payment': 'PAY',
        }
        
        prefix = code_prefixes.get(self.code_type, self.code_type.upper()[:3])
        return f"{self.company.company_prefix}{prefix}{number_str}"


class Service(models.Model):
    """Available services in the SAP system"""
    SERVICE_TYPES = [
        ('finance', 'Finance Management'),
        ('hr', 'Human Resources'),
        ('inventory', 'Inventory Management'),
        ('orders', 'Order Management'),
        ('analytics', 'Analytics & Reporting'),
        ('crm', 'Customer Relationship Management'),
        ('procurement', 'Procurement'),
        ('manufacturing', 'Manufacturing'),
        ('quality', 'Quality Management'),
        ('maintenance', 'Maintenance'),
    ]

    name = models.CharField(max_length=100)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES, unique=True)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Pricing and features
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    features = models.JSONField(default=list)  # List of features

    def __str__(self):
        from .sanitizers import sanitize_html_input
        return sanitize_html_input(self.name)


class CompanyService(models.Model):
    """Services assigned to companies"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='company_services')
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    # Service-specific credentials
    service_password = models.CharField(max_length=128)  # Hashed password
    password_changed_at = models.DateTimeField(auto_now_add=True)
    password_expires_at = models.DateTimeField()

    class Meta:
        unique_together = ['company', 'service']

    def __str__(self):
        return f"{self.company.name} - {self.service.name}"


class CompanyUser(models.Model):
    """Company user credentials and profile"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company_user')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_company_users')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Login tracking
    first_login_completed = models.BooleanField(default=False)
    first_login_at = models.DateTimeField(null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    login_attempts = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    locked_until = models.DateTimeField(null=True, blank=True)

    # Password management
    password_expires_at = models.DateTimeField()
    must_change_password = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} - {self.company.name}"

    def is_password_expired(self):
        return timezone.now() > self.password_expires_at


class CompanyServiceUser(models.Model):
    """Service users created by company admin for specific services"""
    ROLE_CHOICES = [
        ('admin', 'Service Admin'),
        ('manager', 'Service Manager'),
        ('user', 'Service User'),
        ('viewer', 'Service Viewer'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='service_users')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='service_users')
    username = models.CharField(max_length=150)
    email = models.EmailField()
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    password = models.CharField(max_length=128)  # Hashed password
    is_active = models.BooleanField(default=True)

    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_service_users')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    login_count = models.IntegerField(default=0)

    # Password management
    password_expires_at = models.DateTimeField()
    password_changed_at = models.DateTimeField(auto_now_add=True)
    must_change_password = models.BooleanField(default=True)

    class Meta:
        unique_together = ['company', 'service', 'username']
        verbose_name = 'Company Service User'
        verbose_name_plural = 'Company Service Users'

    def __str__(self):
        return f"{self.username} - {self.service.name} ({self.company.name})"

    def is_password_expired(self):
        return timezone.now() > self.password_expires_at


class ServiceUserSession(models.Model):
    """Track service user login sessions"""
    service_user = models.ForeignKey(CompanyServiceUser, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    login_time = models.DateTimeField(auto_now_add=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Service User Session'
        verbose_name_plural = 'Service User Sessions'

    def __str__(self):
        return f"{self.service_user.username} - {self.login_time}"


class SecurityLog(models.Model):
    """Security audit log"""
    EVENT_TYPES = [
        ('LOGIN_SUCCESS', 'Login Success'),
        ('LOGIN_FAILED', 'Login Failed'),
        ('PASSWORD_CHANGED', 'Password Changed'),
        ('ACCOUNT_LOCKED', 'Account Locked'),
        ('ACCOUNT_UNLOCKED', 'Account Unlocked'),
        ('MASTER_ADMIN_CREATED', 'Master Admin Created'),
        ('COMPANY_CREATED', 'Company Created'),
        ('COMPANY_APPROVED', 'Company Approved'),
        ('COMPANY_DELETED', 'Company Deleted'),
        ('SERVICE_ASSIGNED', 'Service Assigned'),
        ('UNAUTHORIZED_ACCESS', 'Unauthorized Access'),
        ('DATA_EXPORT', 'Data Export'),
        ('SETTINGS_CHANGED', 'Settings Changed'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    details = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.event_type} - {self.timestamp}"
