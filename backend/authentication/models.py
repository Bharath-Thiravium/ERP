from html import escape
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
        from html import escape
        return escape(f"Master Admin - {self.company_name}")

    def is_password_expired(self):
        return timezone.now() > self.password_expires_at

    def get_recovery_codes(self):
        return json.loads(self.recovery_codes) if self.recovery_codes else []
    
    def use_recovery_code(self, code):
        """Mark a recovery code as used"""
        codes = self.get_recovery_codes()
        if code in codes:
            codes.remove(code)
            self.recovery_codes = json.dumps(codes)
            self.save()
            return True
        return False


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
    pan_number = models.CharField(max_length=10, blank=True, help_text="PAN Card Number")
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
    
    # Domain settings
    domain_name = models.CharField(max_length=255, blank=True, help_text="Company domain (e.g., athenas.co.in)")
    
    # Banking details (used in invoice/quotation PDF templates)
    bank_name = models.CharField(max_length=100, blank=True, help_text="Bank name for payment details on documents")
    bank_account_number = models.CharField(max_length=20, blank=True, help_text="Bank account number")
    bank_ifsc_code = models.CharField(max_length=11, blank=True, help_text="IFSC code")
    bank_branch = models.CharField(max_length=100, blank=True, help_text="Bank branch name")
    bank_account_holder = models.CharField(max_length=200, blank=True, help_text="Account holder name (if different from company name)")
    bank_account_type = models.CharField(max_length=20, blank=True, default='Current', help_text="Account type e.g. Current, Savings")
    
    # Document numbering system control
    use_document_numbering = models.BooleanField(default=False, help_text="Enable centralized document numbering system")

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
        ('inventory_purchase_order', 'Inventory Purchase Order'),
        ('quotation', 'Quotation Number'),
        ('customer', 'Customer ID'),
        ('vendor', 'Vendor ID'),
        ('supplier', 'Supplier Code'),
        ('warehouse', 'Warehouse Code'),
        ('category', 'Category Code'),
        ('audit', 'Audit Number'),
        ('asset', 'Asset Code'),
        ('proforma_invoice', 'Proforma Invoice'),
        ('payment', 'Payment Number'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='auto_code_settings')
    code_type = models.CharField(max_length=30, choices=CODE_TYPES)
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
        return escape(f"{self.company.name} - {self.get_code_type_display()}")

    def get_next_code(self):
        """Generate next auto code for this company and type with isolation"""
        from django.db import transaction
        with transaction.atomic():
            # Refresh from database to get latest counter for this company
            self.refresh_from_db()
            self.current_number += 1
            self.save(update_fields=['current_number'])
            
            number_str = str(self.current_number).zfill(self.number_length)
            
            # Map code types to their prefixes
            code_prefixes = {
                'employee': 'EMP',
                'product': 'PRD',
                'invoice': 'INV',
                'purchase_order': 'POU',
                'inventory_purchase_order': 'IPO',
                'quotation': 'QUO',
                'customer': 'CUS',
                'vendor': 'VEN',
                'supplier': 'SUP',
                'warehouse': 'WH',
                'category': 'CAT',
                'audit': 'AUD',
                'asset': 'AST',
                'proforma_invoice': 'PFI',
                'payment': 'PAY',
            }
            
            prefix = code_prefixes.get(self.code_type, self.code_type.upper()[:3])
            return escape(f"{self.company.company_prefix}{prefix}{number_str}")


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
    service_type = models.CharField(max_length=30, choices=SERVICE_TYPES, unique=True)
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
        return escape(f"{self.company.name} - {self.service.name}")


PROFILE_STATUS_CHOICES = [
    ('not_started', 'Not Started'),
    ('draft', 'Draft'),
    ('submitted', 'Submitted'),
    ('changes_requested', 'Changes Requested'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
]


class CompanyUser(models.Model):
    """Company user credentials and profile"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company_user')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_company_users')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # User type for Athens workflow
    USER_TYPE_CHOICES = [
        ('client', 'Client'),
        ('epc', 'EPC'),
        ('contractor', 'Contractor'),
    ]
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, blank=True)

    # Basic employee profile (Athens user management)
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    grade = models.CharField(max_length=1, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)

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
    password_changed_at = models.DateTimeField(null=True, blank=True)
    must_change_password = models.BooleanField(default=True)
    password_reset_by_admin = models.BooleanField(default=False)
    is_password_reset_required = models.BooleanField(default=True)
    is_autogenerated_password = models.BooleanField(default=True)

    # Athens user workflow
    profile_status = models.CharField(
        max_length=30,
        choices=PROFILE_STATUS_CHOICES,
        default='not_started'
    )
    profile_submitted_at = models.DateTimeField(null=True, blank=True)
    profile_approved_at = models.DateTimeField(null=True, blank=True)
    profile_approved_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_user_profiles'
    )
    profile_review_note = models.TextField(blank=True)
    has_completed_induction = models.BooleanField(default=False)
    induction_completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return escape(f"{self.user.email} - {self.company.name}")

    def is_password_expired(self):
        return timezone.now() > self.password_expires_at
    
    def can_access_portal(self):
        """Check if user can access portal based on workflow stage"""
        if self.is_password_reset_required:
            return False
        if self.profile_status != 'approved':
            return False
        return True
    
    def get_access_stage(self):
        """Get current access stage for workflow"""
        if self.is_password_reset_required:
            return 'must_reset_password'
        elif self.profile_status in ['not_started', 'draft']:
            return 'must_complete_profile'
        elif self.profile_status == 'submitted':
            return 'pending_approval'
        elif self.profile_status == 'changes_requested':
            return 'must_complete_profile'
        elif self.profile_status == 'approved' and not self.has_completed_induction:
            return 'approved_but_induction_pending'
        elif self.profile_status == 'approved' and self.has_completed_induction:
            return 'full_access'
        else:
            return 'must_complete_profile'
    
    def get_allowed_modules(self):
        """Get allowed modules based on current stage"""
        stage = self.get_access_stage()
        
        if stage == 'must_reset_password':
            return ['password_reset']
        elif stage == 'must_complete_profile':
            return ['profile', 'password_reset']
        elif stage == 'pending_approval':
            return ['profile']
        elif stage == 'approved_but_induction_pending':
            return ['profile', 'training', 'induction']
        elif stage == 'full_access':
            return ['all']
        else:
            return []


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
    unique_service_id = models.CharField(max_length=200, unique=True, help_text="Unique ID format: COMPANY_username_001")
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
        return escape(f"{self.username} - {self.service.name} ({self.company.name})")

    def is_password_expired(self):
        return timezone.now() > self.password_expires_at
    
    @classmethod
    def generate_unique_service_id(cls, company_prefix, username):
        """Generate unique service ID with format: COMPANY_username_001"""
        base_id = f"{company_prefix}_{username}"
        existing_count = cls.objects.filter(
            unique_service_id__startswith=base_id
        ).count()
        return f"{base_id}_{str(existing_count + 1).zfill(3)}"
    
    def save(self, *args, **kwargs):
        # Auto-generate unique_service_id if not provided
        if not self.unique_service_id:
            self.unique_service_id = self.generate_unique_service_id(
                self.company.company_prefix, 
                self.username
            )
        
        # Set default password expiration if not provided
        if not self.password_expires_at:
            from datetime import timedelta
            self.password_expires_at = timezone.now() + timedelta(days=90)
        
        super().save(*args, **kwargs)


class ServiceUserSession(models.Model):
    """Track service user login sessions with enhanced security features"""
    service_user = models.ForeignKey(CompanyServiceUser, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    # Session tracking - created_at is canonical timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    login_time = models.DateTimeField(null=True, blank=True)  # Deprecated, kept for compatibility
    last_seen_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    # Device information
    device_info = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Service User Session'
        verbose_name_plural = 'Service User Sessions'
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.service_user.username} - {self.created_at}")
    
    def revoke(self):
        """Revoke this session"""
        self.is_active = False
        self.revoked_at = timezone.now()
        self.save(update_fields=['is_active', 'revoked_at'])


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
        ('USER_DELETED', 'Service User Deleted'),
        ('UNAUTHORIZED_ACCESS', 'Unauthorized Access'),
        ('DATA_EXPORT', 'Data Export'),
        ('SETTINGS_CHANGED', 'Settings Changed'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    details = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return escape(f"{self.event_type} - {self.timestamp}")
