from html import escape
from django.db import models
from django.core.validators import RegexValidator, EmailValidator
from django.utils import timezone
from authentication.models import Company, CompanyServiceUser
from decimal import Decimal
import json


def _generate_configured_number(company, document_type):
    if getattr(company, 'use_document_numbering', False):
        from authentication.models import Service
        from company_dashboard.document_numbering_models import DocumentNumberingConfig

        service = Service.objects.get(service_type='hr')
        today = timezone.now().date()
        if today.month >= 4:
            financial_year = f"{today.year}-{str(today.year + 1)[-2:]}"
        else:
            financial_year = f"{today.year - 1}-{str(today.year)[-2:]}"

        config = DocumentNumberingConfig.objects.filter(
            company=company,
            service=service,
            document_type=document_type,
            financial_year=financial_year,
            is_active=True,
        ).first()
        if not config:
            raise ValueError(
                f"Document numbering is not configured for HR {document_type}. "
                "Set it up in Company > Document Numbering before creating records."
            )
        return config.get_next_number()

    from authentication.utils import generate_auto_code
    return generate_auto_code(company.id, document_type)


class FlexibleJSONField(models.JSONField):
    """JSONField that accepts strings and converts them to lists"""
    
    def to_python(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                if value.strip():
                    return [skill.strip() for skill in value.split(',') if skill.strip()]
                return []
        return super().to_python(value)


class Department(models.Model):
    """Department model for organizing employees"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)  # Company-scoped generated code
    description = models.TextField(blank=True)
    manager = models.ForeignKey('Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_departments')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'code']
        ordering = ['name']
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['company', 'code']),
        ]

    def __str__(self):
        from .security_fixes import sanitize_department_name
        return escape(f"{self.code} - {sanitize_department_name(self.name)}")

    def save(self, *args, **kwargs):
        if not self.code:
            # Auto-generate code with company prefix
            try:
                self.code = _generate_configured_number(self.company, 'department')
            except Exception:
                if getattr(self.company, 'use_document_numbering', False):
                    raise
                # Fallback if auto-code fails
                last_dept = Department.objects.filter(
                    company=self.company,
                    code__startswith=f'{self.company.company_prefix}-DEPT-'
                ).order_by('-id').first()
                if last_dept:
                    last_number = int(last_dept.code.split('-')[-1])
                    self.code = f"{self.company.company_prefix}-DEPT-{last_number + 1:03d}"
                else:
                    self.code = f"{self.company.company_prefix}-DEPT-001"
        super().save(*args, **kwargs)


class Designation(models.Model):
    """Job designation/position model"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='designations')
    title = models.CharField(max_length=100)
    code = models.CharField(max_length=50)  # Company-scoped generated code
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='designations')
    level = models.CharField(max_length=20, choices=[
        ('entry', 'Entry Level'),
        ('junior', 'Junior'),
        ('mid', 'Mid Level'),
        ('senior', 'Senior'),
        ('lead', 'Lead'),
        ('manager', 'Manager'),
        ('director', 'Director'),
        ('executive', 'Executive')
    ], default='entry')
    min_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    max_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'code']
        ordering = ['title']
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['company', 'code']),
            models.Index(fields=['department', 'is_active']),
        ]

    def __str__(self):
        from .security_fixes import sanitize_designation_title, sanitize_department_name
        return escape(f"{sanitize_designation_title(self.title)} - {sanitize_department_name(self.department.name)}")

    def save(self, *args, **kwargs):
        if not self.code:
            # Auto-generate code with company prefix
            try:
                self.code = _generate_configured_number(self.company, 'designation')
            except Exception:
                if getattr(self.company, 'use_document_numbering', False):
                    raise
                # Fallback if auto-code fails
                last_desig = Designation.objects.filter(
                    company=self.company,
                    code__startswith=f'{self.company.company_prefix}-DESIG-'
                ).order_by('-id').first()
                if last_desig:
                    last_number = int(last_desig.code.split('-')[-1])
                    self.code = f"{self.company.company_prefix}-DESIG-{last_number + 1:03d}"
                else:
                    self.code = f"{self.company.company_prefix}-DESIG-001"
        super().save(*args, **kwargs)


class Employee(models.Model):
    """Comprehensive employee model with AI-enhanced features"""
    EMPLOYMENT_TYPE_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('intern', 'Intern'),
        ('consultant', 'Consultant')
    ]

    WORK_MODE_CHOICES = [
        ('office', 'Office'),
        ('remote', 'Remote'),
        ('hybrid', 'Hybrid')
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('terminated', 'Terminated'),
        ('resigned', 'Resigned'),
        ('on_leave', 'On Leave')
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='employees')
    employee_id = models.CharField(max_length=50, db_index=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(validators=[EmailValidator()])
    phone = models.CharField(max_length=15, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other')
    ], blank=True)
    
    # Register of Workmen Required Fields
    father_husband_name = models.CharField(max_length=100, blank=True, help_text="Father's or Husband's name as per Form XIII")
    nature_of_employment = models.CharField(max_length=100, blank=True, help_text="Nature of employment/work description")
    employee_signature = models.ImageField(upload_to='employee_signatures/', null=True, blank=True, help_text="Digital signature of employee")
    termination_reason = models.TextField(blank=True, help_text="Reason for termination if applicable")
    termination_date = models.DateField(null=True, blank=True, help_text="Date of termination if applicable")
    employee_remarks = models.TextField(blank=True, help_text="General remarks about employee")

    # Employment Details
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='employees')
    designation = models.ForeignKey(Designation, on_delete=models.CASCADE, related_name='employees')
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default='full_time')
    work_mode = models.CharField(max_length=10, choices=WORK_MODE_CHOICES, default='office')
    date_of_joining = models.DateField()
    date_of_leaving = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    reporting_manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')

    # Compensation
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='INR')

    # Contact Information - Permanent Address
    permanent_address_line1 = models.CharField(max_length=255, blank=True, help_text="Permanent address line 1")
    permanent_address_line2 = models.CharField(max_length=255, blank=True, help_text="Permanent address line 2")
    permanent_city = models.CharField(max_length=100, blank=True)
    permanent_state = models.CharField(max_length=100, blank=True)
    permanent_pincode = models.CharField(max_length=10, blank=True)
    permanent_country = models.CharField(max_length=100, default='India')
    
    # Local/Current Address
    local_address_line1 = models.CharField(max_length=255, blank=True, help_text="Local/current address line 1")
    local_address_line2 = models.CharField(max_length=255, blank=True, help_text="Local/current address line 2")
    local_city = models.CharField(max_length=100, blank=True)
    local_state = models.CharField(max_length=100, blank=True)
    local_pincode = models.CharField(max_length=10, blank=True)
    local_country = models.CharField(max_length=100, default='India')
    
    # Legacy fields for backward compatibility
    address_line1 = models.CharField(max_length=255, blank=True, help_text="Deprecated: Use permanent_address_line1")
    address_line2 = models.CharField(max_length=255, blank=True, help_text="Deprecated: Use permanent_address_line2")
    city = models.CharField(max_length=100, blank=True, help_text="Deprecated: Use permanent_city")
    state = models.CharField(max_length=100, blank=True, help_text="Deprecated: Use permanent_state")
    pincode = models.CharField(max_length=10, blank=True, help_text="Deprecated: Use permanent_pincode")
    country = models.CharField(max_length=100, default='India', help_text="Deprecated: Use permanent_country")

    # Government IDs & Statutory Information
    aadhar_number = models.CharField(max_length=12, blank=True, validators=[
        RegexValidator(regex=r'^[0-9]{12}$', message='Enter valid 12-digit Aadhar number')
    ])
    pan_number = models.CharField(max_length=10, blank=True, validators=[
        RegexValidator(regex=r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', message='Enter valid PAN number')
    ])
    
    # PF & ESI Information (Required for statutory compliance)
    pf_number = models.CharField(max_length=50, blank=True, help_text="Provident Fund Number")
    uan_number = models.CharField(max_length=12, blank=True, validators=[
        RegexValidator(regex=r'^[0-9]{12}$', message='Enter valid 12-digit UAN number')
    ], help_text="Universal Account Number for PF")
    esi_number = models.CharField(max_length=17, blank=True, validators=[
        RegexValidator(regex=r'^[0-9]{10}[0-9]{7}$', message='Enter valid 17-digit ESI number')
    ], help_text="Employee State Insurance Number")
    
    # Banking Information (Required for salary processing)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=20, blank=True)
    bank_ifsc_code = models.CharField(max_length=11, blank=True, validators=[
        RegexValidator(regex=r'^[A-Z]{4}0[A-Z0-9]{6}$', message='Enter valid IFSC code')
    ])
    bank_branch = models.CharField(max_length=100, blank=True)
    
    # Emergency Contact Information
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True)
    emergency_contact_address = models.TextField(blank=True)

    # AI-Enhanced Fields
    skills = FlexibleJSONField(default=list, blank=True, help_text="List of employee skills")
    performance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="AI-calculated performance score")
    engagement_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Employee engagement score")
    retention_risk = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High')
    ], default='low', help_text="AI-predicted retention risk")

    # Profile Picture & Face Recognition
    profile_picture = models.ImageField(upload_to='employee_photos/', null=True, blank=True)
    face_photo = models.ImageField(upload_to='employee_faces/', null=True, blank=True, help_text="Photo for face recognition attendance")
    face_encoding = models.JSONField(default=list, blank=True, help_text="Face encoding data for recognition")

    # Mobile App Authentication
    mobile_app_password = models.CharField(max_length=128, blank=True, help_text="Password for mobile app login")
    mobile_app_enabled = models.BooleanField(default=False, help_text="Enable mobile app access")
    last_mobile_login = models.DateTimeField(null=True, blank=True)
    mobile_device_id = models.CharField(max_length=255, blank=True, help_text="Last registered mobile device")

    # Audit Fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_employees')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'employee_id']
        constraints = [
            models.UniqueConstraint(fields=['company', 'email'], name='unique_employee_email_per_company')
        ]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['email']),
            models.Index(fields=['company', 'status']),
            models.Index(fields=['department', 'designation']),
        ]

    def __str__(self):
        from .security_fixes import sanitize_employee_name
        return escape(f"{self.employee_id} - {sanitize_employee_name(self.first_name)} {sanitize_employee_name(self.last_name)}")

    @property
    def full_name(self):
        return escape(f"{self.first_name} {self.last_name}")

    def save(self, *args, **kwargs):
        if not self.employee_id:
            # Auto-generate employee ID using company prefix
            try:
                self.employee_id = _generate_configured_number(self.company, 'employee')
            except Exception as e:
                if getattr(self.company, 'use_document_numbering', False):
                    raise
                # Fallback to old system if auto-code fails
                last_employee = Employee.objects.filter(
                    company=self.company,
                    employee_id__startswith='EMP-'
                ).order_by('-id').first()
                if last_employee:
                    last_number = int(last_employee.employee_id.split('-')[-1])
                    self.employee_id = f"EMP-{last_number + 1:06d}"
                else:
                    self.employee_id = "EMP-000001"
        super().save(*args, **kwargs)


class EmployeeMobileSession(models.Model):
    """Authenticated mobile app session for an employee self-service login."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='mobile_sessions')
    session_key = models.CharField(max_length=128, unique=True, db_index=True)
    device_id = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField()
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'is_active']),
            models.Index(fields=['session_key', 'is_active']),
        ]

    def __str__(self):
        return escape(f"{self.employee.employee_id} mobile session")


class JobPosting(models.Model):
    """AI-enhanced job postings for recruitment"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='job_postings')
    title = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='job_postings')
    designation = models.ForeignKey(Designation, on_delete=models.CASCADE, related_name='job_postings')
    
    # Job Details
    description = models.TextField()
    requirements = models.TextField()
    responsibilities = models.TextField()
    employment_type = models.CharField(max_length=20, choices=Employee.EMPLOYMENT_TYPE_CHOICES, default='full_time')
    work_mode = models.CharField(max_length=10, choices=Employee.WORK_MODE_CHOICES, default='office')
    
    # Compensation
    min_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    max_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # AI Features
    required_skills = models.JSONField(default=list, help_text="List of required skills for AI matching")
    ai_screening_enabled = models.BooleanField(default=True, help_text="Enable AI-powered candidate screening")
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('closed', 'Closed')
    ], default='draft')
    
    # Dates
    posted_date = models.DateTimeField(null=True, blank=True)
    application_deadline = models.DateField(null=True, blank=True)
    
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_job_postings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        from .security_fixes import sanitize_job_title, sanitize_department_name
        return escape(f"{sanitize_job_title(self.title)} - {sanitize_department_name(self.department.name)}")


class JobApplication(models.Model):
    """AI-enhanced job applications with automated screening"""
    job_posting = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name='applications')
    application_number = models.CharField(max_length=50, blank=True, db_index=True)
    
    # Candidate Information
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField()
    phone = models.CharField(max_length=15)
    
    # Professional Details
    current_position = models.CharField(max_length=100, blank=True)
    current_company = models.CharField(max_length=100, blank=True)
    total_experience = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    relevant_experience = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    current_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notice_period = models.CharField(max_length=50, blank=True)
    
    # Contact & Location
    current_location = models.CharField(max_length=100, blank=True)
    willing_to_relocate = models.BooleanField(default=False)
    linkedin_profile = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    
    # Education & Skills
    education_details = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    languages = models.JSONField(default=list, blank=True)
    
    # Application Materials
    resume = models.FileField(upload_to='resumes/', blank=True, help_text="Upload resume/CV")
    cover_letter = models.TextField(blank=True)
    
    # Source Tracking
    application_source = models.CharField(max_length=50, default='direct', choices=[
        ('direct', 'Direct Application'),
        ('whatsapp', 'WhatsApp Share'),
        ('linkedin', 'LinkedIn Share'),
        ('gmail', 'Gmail Share'),
        ('outlook', 'Outlook Share'),
        ('facebook', 'Facebook Share'),
        ('twitter', 'Twitter Share'),
        ('instagram', 'Instagram Share'),
        ('telegram', 'Telegram Share'),
        ('other_email', 'Other Email Share'),
        ('copy_link', 'Copy Link Share')
    ], help_text="Source platform from which application was submitted")
    share_id = models.CharField(max_length=100, blank=True, help_text="Share tracking ID if from social media")
    
    # AI Screening Results
    ai_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="AI-calculated candidate score")
    skill_match_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Skills matching percentage")
    ai_screening_notes = models.TextField(blank=True, help_text="AI-generated screening notes")
    
    # Application Status
    status = models.CharField(max_length=20, choices=[
        ('submitted', 'Submitted'),
        ('screening', 'AI Screening'),
        ('shortlisted', 'Shortlisted'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('interviewed', 'Interviewed'),
        ('offer_sent', 'Offer Sent'),
        ('offer_accepted', 'Offer Accepted'),
        ('offer_rejected', 'Offer Rejected'),
        ('selected', 'Selected'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn')
    ], default='submitted')
    
    # Interview Details
    interview_date = models.DateTimeField(null=True, blank=True)
    interview_notes = models.TextField(blank=True)
    interviewer = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='application_interviews')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.first_name} {self.last_name} - {self.job_posting.title}")

    @property
    def full_name(self):
        return escape(f"{self.first_name} {self.last_name}")

    def save(self, *args, **kwargs):
        if not self.application_number:
            company = self.job_posting.company
            try:
                self.application_number = _generate_configured_number(company, 'recruitment')
            except Exception:
                if getattr(company, 'use_document_numbering', False):
                    raise
                last_application = JobApplication.objects.filter(
                    job_posting__company=company,
                    application_number__startswith='REC-'
                ).order_by('-id').first()
                if last_application:
                    last_number = int(last_application.application_number.split('-')[-1])
                    self.application_number = f"REC-{last_number + 1:06d}"
                else:
                    self.application_number = "REC-000001"
        super().save(*args, **kwargs)


class AttendanceSystem(models.Model):
    """Attendance system configuration for companies"""
    SYSTEM_TYPES = [
        ('biometric', 'Biometric (Fingerprint/Card)'),
        ('face_recognition', 'Face Recognition'),
        ('mobile_app', 'Mobile App with Face & GPS'),
        ('manual', 'Manual Entry'),
        ('hybrid', 'Multiple Methods')
    ]
    
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='attendance_system')
    system_type = models.CharField(max_length=20, choices=SYSTEM_TYPES, default='manual')
    
    # System Settings
    enable_biometric = models.BooleanField(default=False)
    enable_face_recognition = models.BooleanField(default=False)
    enable_mobile_app = models.BooleanField(default=True)
    enable_manual_entry = models.BooleanField(default=True)
    
    # Geo-location settings
    enable_geo_fencing = models.BooleanField(default=False)
    office_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    office_longitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    geo_fence_radius = models.IntegerField(default=100, help_text="Radius in meters")
    
    # Time settings
    work_start_time = models.TimeField(default='09:00')
    work_end_time = models.TimeField(default='18:00')
    grace_period_minutes = models.IntegerField(default=15)
    
    # Face recognition settings
    face_match_threshold = models.DecimalField(max_digits=3, decimal_places=2, default=0.6)
    require_face_for_checkin = models.BooleanField(default=False)
    require_face_for_checkout = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return escape(f"{self.company.name} - {self.get_system_type_display()}")


class AttendancePolicy(models.Model):
    """Company-wide attendance rules used by leave and payroll calculations."""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='attendance_policy')

    weekly_off_days = models.JSONField(default=list, blank=True, help_text="Python weekdays: Monday=0, Sunday=6")
    full_day_min_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.00)
    half_day_min_hours = models.DecimalField(max_digits=4, decimal_places=2, default=4.00)
    overtime_after_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.00)

    paid_holiday_payable = models.BooleanField(default=True)
    paid_leave_payable = models.BooleanField(default=True)
    unpaid_leave_deductible = models.BooleanField(default=True)
    exclude_weekoffs_from_leave = models.BooleanField(default=True)
    exclude_holidays_from_leave = models.BooleanField(default=True)
    lock_attendance_after_payroll = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return escape(f"{self.company.name} - Attendance Policy")


class AttendanceDayOverride(models.Model):
    """Company calendar override for one-off working days or special off days."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='attendance_day_overrides')
    date = models.DateField()
    is_working_day = models.BooleanField(default=True)
    title = models.CharField(max_length=120, blank=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'date']
        ordering = ['date']

    def __str__(self):
        status = 'Working Day' if self.is_working_day else 'Non-working Day'
        return escape(f"{self.company.name} - {self.date} - {status}")


class Attendance(models.Model):
    """Enhanced attendance tracking with multiple methods"""
    ATTENDANCE_METHODS = [
        ('biometric', 'Biometric'),
        ('face_recognition', 'Face Recognition'),
        ('mobile_app', 'Mobile App'),
        ('manual', 'Manual Entry'),
        ('web_portal', 'Web Portal')
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    attendance_number = models.CharField(max_length=50, blank=True, db_index=True)
    date = models.DateField()
    
    # Check-in/out times
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    
    # Attendance method
    check_in_method = models.CharField(max_length=20, choices=ATTENDANCE_METHODS, null=True, blank=True)
    check_out_method = models.CharField(max_length=20, choices=ATTENDANCE_METHODS, null=True, blank=True)
    
    # Location data
    check_in_location = models.CharField(max_length=255, blank=True)
    check_out_location = models.CharField(max_length=255, blank=True)
    check_in_latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    check_in_longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    check_out_latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    check_out_longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    # Face recognition data
    check_in_face_image = models.ImageField(upload_to='attendance_faces/', null=True, blank=True)
    check_out_face_image = models.ImageField(upload_to='attendance_faces/', null=True, blank=True)
    face_match_score = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    
    # Biometric data
    biometric_device_id = models.CharField(max_length=50, blank=True)
    biometric_template_id = models.CharField(max_length=100, blank=True)
    
    # Work details
    work_mode = models.CharField(max_length=10, choices=Employee.WORK_MODE_CHOICES, default='office')
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    break_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('half_day', 'Half Day'),
        ('late', 'Late'),
        ('early_departure', 'Early Departure'),
        ('leave', 'On Leave'),
        ('holiday', 'Holiday')
    ], default='present')
    
    # Validation flags
    is_valid_checkin_location = models.BooleanField(default=True)
    is_valid_checkout_location = models.BooleanField(default=True)
    is_valid_face_match = models.BooleanField(default=True)
    
    # Additional data
    notes = models.TextField(blank=True)
    approved_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_attendance')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'date']
        ordering = ['-date']

    def __str__(self):
        return escape(f"{self.employee.full_name} - {self.date}")

    def save(self, *args, **kwargs):
        policy = AttendancePolicy.objects.filter(company=self.employee.company).first()
        if policy and policy.lock_attendance_after_payroll:
            locked_cycle = PayrollCycle.objects.filter(
                company=self.employee.company,
                start_date__lte=self.date,
                end_date__gte=self.date,
                status__in=['approved', 'processing', 'completed'],
            ).first()
            if locked_cycle:
                from django.core.exceptions import ValidationError
                raise ValidationError(
                    f"Attendance for {self.date} is locked because payroll cycle "
                    f"{locked_cycle.name} is {locked_cycle.status}."
                )

        if not self.attendance_number:
            company = self.employee.company
            try:
                self.attendance_number = _generate_configured_number(company, 'attendance')
            except Exception:
                if getattr(company, 'use_document_numbering', False):
                    raise
                last_attendance = Attendance.objects.filter(
                    employee__company=company,
                    attendance_number__startswith='ATT-'
                ).order_by('-id').first()
                if last_attendance:
                    last_number = int(last_attendance.attendance_number.split('-')[-1])
                    self.attendance_number = f"ATT-{last_number + 1:06d}"
                else:
                    self.attendance_number = "ATT-000001"
        super().save(*args, **kwargs)
    
    def calculate_hours(self):
        """Calculate total working hours with proper timezone handling"""
        if self.check_in_time and self.check_out_time:
            # Ensure both times are timezone-aware
            from django.utils import timezone as tz
            
            check_in = self.check_in_time
            check_out = self.check_out_time
            
            # Make timezone-aware if needed
            if check_in.tzinfo is None:
                check_in = tz.make_aware(check_in)
            if check_out.tzinfo is None:
                check_out = tz.make_aware(check_out)
            
            # Calculate time difference
            delta = check_out - check_in
            total_minutes = delta.total_seconds() / 60
            break_minutes = float(self.break_hours) * 60
            
            # Calculate total hours (minimum 0)
            calculated_hours = max(0, (total_minutes - break_minutes) / 60)
            self.total_hours = round(calculated_hours, 2)
            
            # Don't call save() here to avoid recursion - let the caller handle it
    
    def is_late(self):
        """Check if employee is late"""
        if not self.check_in_time:
            return False

        try:
            system = self.employee.company.attendance_system
        except AttendanceSystem.DoesNotExist:
            return False
        expected_time = system.work_start_time
        grace_period = system.grace_period_minutes
        
        from datetime import datetime, timedelta
        expected_datetime = datetime.combine(self.date, expected_time)
        grace_datetime = expected_datetime + timedelta(minutes=grace_period)
        
        return self.check_in_time.time() > grace_datetime.time()


class PerformanceReview(models.Model):
    """AI-enhanced performance reviews"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='performance_reviews')
    review_number = models.CharField(max_length=50, blank=True, db_index=True)
    reviewer = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='conducted_reviews')
    review_period_start = models.DateField()
    review_period_end = models.DateField()
    
    # Performance Metrics
    goals_achievement = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Percentage of goals achieved")
    quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    productivity_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    collaboration_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overall_rating = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # AI Insights
    ai_performance_prediction = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="AI-predicted future performance")
    improvement_suggestions = models.JSONField(default=list, help_text="AI-generated improvement suggestions")
    
    # Comments
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    goals_for_next_period = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved')
    ], default='draft')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.employee.full_name} - {self.review_period_start} to {self.review_period_end}")

    def save(self, *args, **kwargs):
        if not self.review_number:
            company = self.employee.company
            try:
                self.review_number = _generate_configured_number(company, 'performance_review')
            except Exception:
                if getattr(company, 'use_document_numbering', False):
                    raise
                last_review = PerformanceReview.objects.filter(
                    employee__company=company,
                    review_number__startswith='PR-'
                ).order_by('-id').first()
                if last_review:
                    last_number = int(last_review.review_number.split('-')[-1])
                    self.review_number = f"PR-{last_number + 1:06d}"
                else:
                    self.review_number = "PR-000001"
        super().save(*args, **kwargs)


class AttendanceDevice(models.Model):
    """Biometric and other attendance devices"""
    DEVICE_TYPES = [
        ('fingerprint', 'Fingerprint Scanner'),
        ('face_scanner', 'Face Recognition Scanner'),
        ('card_reader', 'RFID/Card Reader'),
        ('mobile_app', 'Mobile Application'),
        ('web_terminal', 'Web Terminal')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='attendance_devices')
    device_id = models.CharField(max_length=50, unique=True)
    device_name = models.CharField(max_length=100)
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES)
    location = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return escape(f"{self.device_name} ({self.device_id})")


class AttendanceLog(models.Model):
    """Raw attendance logs from devices"""
    device = models.ForeignKey(AttendanceDevice, on_delete=models.CASCADE, related_name='logs')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_logs')
    timestamp = models.DateTimeField()
    log_type = models.CharField(max_length=10, choices=[('in', 'Check In'), ('out', 'Check Out')])
    raw_data = models.JSONField(default=dict, blank=True)
    processed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return escape(f"{self.employee.full_name} - {self.log_type} - {self.timestamp}")


class SalaryComponent(models.Model):
    """Configurable salary components"""
    COMPONENT_TYPES = [
        ('earning', 'Earning'),
        ('deduction', 'Deduction'),
        ('employer_contribution', 'Employer Contribution')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='salary_components')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    component_type = models.CharField(max_length=25, choices=COMPONENT_TYPES)
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_statutory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['company', 'code']
    
    def __str__(self):
        return escape(f"{self.name} ({self.component_type})")


class PayrollSettings(models.Model):
    """Company payroll configuration"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='payroll_settings')
    
    # PF Settings
    pf_enabled = models.BooleanField(default=True)
    pf_employee_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    pf_employer_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    pf_ceiling = models.DecimalField(max_digits=10, decimal_places=2, default=15000)
    
    # ESI Settings
    esi_enabled = models.BooleanField(default=True)
    esi_employee_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.75)
    esi_employer_rate = models.DecimalField(max_digits=5, decimal_places=2, default=3.25)
    esi_ceiling = models.DecimalField(max_digits=10, decimal_places=2, default=21000)
    
    # Professional Tax
    pt_enabled = models.BooleanField(default=True)
    pt_state = models.CharField(max_length=50, default='Maharashtra')
    
    # TDS Settings
    tds_enabled = models.BooleanField(default=True)
    
    # Overtime Settings
    overtime_enabled = models.BooleanField(default=True)
    overtime_rate_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=2.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PayrollCycle(models.Model):
    """Enhanced payroll processing cycles"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='payroll_cycles')
    payroll_number = models.CharField(max_length=50, blank=True, db_index=True)
    name = models.CharField(max_length=100)
    period_type = models.CharField(max_length=20, choices=[
        ('monthly', 'Monthly'),
        ('weekly', 'Weekly'),
        ('bi_weekly', 'Bi-Weekly')
    ], default='monthly')
    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()
    
    # Processing Status
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('calculating', 'Calculating'),
        ('calculated', 'Calculated'),
        ('review', 'Under Review'),
        ('approved', 'Approved'),
        ('processing', 'Processing Payment'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], default='draft')
    
    # Financial Summary
    total_employees = models.IntegerField(default=0)
    total_gross = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_net = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Approval Workflow
    calculated_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='calculated_payrolls')
    approved_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='approved_payrolls')
    processed_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='processed_payrolls')
    
    calculated_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['company', 'name']

    def __str__(self):
        return escape(f"{self.name} - {self.company.name}")

    def save(self, *args, **kwargs):
        if not self.payroll_number:
            try:
                self.payroll_number = _generate_configured_number(self.company, 'payroll')
            except Exception:
                if getattr(self.company, 'use_document_numbering', False):
                    raise
                last_cycle = PayrollCycle.objects.filter(
                    company=self.company,
                    payroll_number__startswith='PAY-'
                ).order_by('-id').first()
                if last_cycle:
                    last_number = int(last_cycle.payroll_number.split('-')[-1])
                    self.payroll_number = f"PAY-{last_number + 1:06d}"
                else:
                    self.payroll_number = "PAY-000001"
        super().save(*args, **kwargs)


class Payslip(models.Model):
    """Comprehensive payslip with all salary components"""
    payroll_cycle = models.ForeignKey(PayrollCycle, on_delete=models.CASCADE, related_name='payslips')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payslips')
    
    # Basic Information
    emp_id = models.CharField(max_length=20, blank=True, default='')
    emp_name = models.CharField(max_length=100, blank=True, default='')
    emp_department = models.CharField(max_length=100, blank=True, default='')
    emp_designation = models.CharField(max_length=100, blank=True, default='')
    
    # Attendance Data
    working_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    present_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    absent_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    
    # Earnings
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    conveyance_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medical_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    special_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    incentive = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Deductions
    pf_employee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    esi_employee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    professional_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tds = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loan_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    advance_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Employer Contributions
    pf_employer = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    esi_employer = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Final Amounts
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ctc = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Status & Workflow
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('calculated', 'Calculated'),
        ('approved', 'Approved'),
        ('paid', 'Paid'),
        ('hold', 'On Hold')
    ], default='draft')
    
    # Payment Details
    payment_method = models.CharField(max_length=20, choices=[
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('cash', 'Cash')
    ], default='bank_transfer')
    
    payment_reference = models.CharField(max_length=100, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['payroll_cycle', 'employee']
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.emp_name} - {self.payroll_cycle.name}")
    
    def calculate_salary(self):
        """Enhanced statutory compliant salary calculation"""
        # Use enhanced statutory calculation
        from .statutory_calculations import calculate_enhanced_payslip
        return calculate_enhanced_payslip(self)
    
    def validate_payment_date(self):
        """Validate payment date as per Payment of Wages Act.

        Wages must be paid within 10 days of the end of the wage period (the
        Act specifies 7 days for establishments with fewer than 1000 employees
        and 10 days otherwise; 10 is used here as the safe upper bound).
        Comparing pay_date's day-of-month in isolation incorrectly rejected any
        payroll cycle that pays after the 10th of the calendar month (e.g. an
        end-of-month pay date), regardless of how soon after the period ended
        it actually was.
        """
        from django.core.exceptions import ValidationError
        days_after_period_end = (self.payroll_cycle.pay_date - self.payroll_cycle.end_date).days
        if days_after_period_end > 10:
            raise ValidationError(
                "Salary must be paid within 10 days of the wage period ending, as per Payment of Wages Act"
            )
    
    def validate_deductions(self):
        """Validate deductions do not exceed 50% as per Payment of Wages Act"""
        from django.core.exceptions import ValidationError
        if self.total_deductions > (self.gross_salary * Decimal('0.5')):
            raise ValidationError("Total deductions cannot exceed 50% of gross wages as per Payment of Wages Act")
    
    def save(self, *args, **kwargs):
        self.validate_payment_date()
        self.validate_deductions()
        super().save(*args, **kwargs)
    
    def calculate_professional_tax(self):
        """Calculate state-wise professional tax"""
        # Maharashtra PT slab
        if self.gross_salary <= 5000:
            return 0
        elif self.gross_salary <= 10000:
            return 175
        else:
            return 200
    
    def calculate_tds(self, annual_salary):
        """Simplified TDS calculation"""
        if annual_salary <= 250000:
            return 0
        elif annual_salary <= 500000:
            return (annual_salary - 250000) * 0.05
        elif annual_salary <= 1000000:
            return 12500 + (annual_salary - 500000) * 0.20
        else:
            return 112500 + (annual_salary - 1000000) * 0.30


class PayrollReport(models.Model):
    """Payroll reports and analytics"""
    REPORT_TYPES = [
        ('payroll_summary', 'Payroll Summary'),
        ('statutory_report', 'Statutory Report'),
        ('bank_advice', 'Bank Advice'),
        ('pf_report', 'PF Report'),
        ('esi_report', 'ESI Report'),
        ('tds_report', 'TDS Report')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='payroll_reports')
    payroll_cycle = models.ForeignKey(PayrollCycle, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    file_path = models.CharField(max_length=500, blank=True)
    generated_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return escape(f"{self.get_report_type_display()} - {self.payroll_cycle.name}")


# Import statutory compliance models
from .statutory_models import (
    StatutorySettings,
    EmployeeStatutoryDetails,
    GovernmentReturn,
    ComplianceAlert,
    PayslipStatutoryDetails,
    MinimumWageRate,
    LaborLawCompliance
)

# Import leave management models
from .leave_models import LeaveType, LeaveBalance, LeaveApplication, Holiday

# Import banking models
from .banking_models import BankVerification, SalaryPayment, DigitalSignature, SignedDocument

# Import ESI medical models
from .esi_medical_models import ESIMedicalBenefit

# Import workflow models
from .workflow_models import (
    EmployeeWorkflowStatus,
    EmployeeProfileCompletion,
    InductionTraining,
    EmployeeInductionProgress,
    EmployeeAccessLog
)
