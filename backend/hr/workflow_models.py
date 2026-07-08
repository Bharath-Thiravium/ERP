from django.db import models
from django.utils import timezone
from authentication.models import Company, CompanyServiceUser
from .models import Employee, _generate_configured_number


class EmployeeWorkflowStatus(models.Model):
    """Track employee onboarding workflow status"""
    WORKFLOW_STAGES = [
        ('basic_details_created', 'Basic Details Created'),
        ('credentials_shared', 'Credentials Shared'),
        ('password_reset_required', 'Password Reset Required'),
        ('password_reset_completed', 'Password Reset Completed'),
        ('profile_completion_required', 'Profile Completion Required'),
        ('profile_submitted', 'Profile Submitted for Approval'),
        ('profile_approved', 'Profile Approved'),
        ('profile_rejected', 'Profile Rejected'),
        ('induction_required', 'Induction Training Required'),
        ('induction_in_progress', 'Induction Training In Progress'),
        ('induction_completed', 'Induction Training Completed'),
        ('full_access_granted', 'Full Access Granted'),
        ('access_revoked', 'Access Revoked')
    ]
    
    ACCESS_LEVELS = [
        ('none', 'No Access'),
        ('limited', 'Limited Access - Profile Only'),
        ('training_only', 'Training Access Only'),
        ('full', 'Full Access')
    ]
    
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='workflow_status')
    current_stage = models.CharField(max_length=30, choices=WORKFLOW_STAGES, default='basic_details_created')
    access_level = models.CharField(max_length=15, choices=ACCESS_LEVELS, default='none')
    
    # Workflow tracking
    basic_details_completed_at = models.DateTimeField(null=True, blank=True)
    credentials_shared_at = models.DateTimeField(null=True, blank=True)
    password_reset_at = models.DateTimeField(null=True, blank=True)
    profile_submitted_at = models.DateTimeField(null=True, blank=True)
    profile_approved_at = models.DateTimeField(null=True, blank=True)
    profile_rejected_at = models.DateTimeField(null=True, blank=True)
    induction_started_at = models.DateTimeField(null=True, blank=True)
    induction_completed_at = models.DateTimeField(null=True, blank=True)
    full_access_granted_at = models.DateTimeField(null=True, blank=True)
    
    # Approval details
    approved_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_employee_profiles')
    rejection_reason = models.TextField(blank=True)
    
    # Notifications
    email_notifications_sent = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Employee Workflow Status'
        verbose_name_plural = 'Employee Workflow Statuses'
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.get_current_stage_display()}"
    
    def advance_to_stage(self, stage, user=None):
        """Advance employee to next workflow stage"""
        self.current_stage = stage
        now = timezone.now()
        
        # Update timestamps based on stage
        if stage == 'credentials_shared':
            self.credentials_shared_at = now
            self.access_level = 'limited'
        elif stage == 'password_reset_completed':
            self.password_reset_at = now
        elif stage == 'profile_submitted':
            self.profile_submitted_at = now
        elif stage == 'profile_approved':
            self.profile_approved_at = now
            self.approved_by = user
            self.access_level = 'training_only'
        elif stage == 'profile_rejected':
            self.profile_rejected_at = now
            self.access_level = 'limited'
        elif stage == 'induction_in_progress':
            self.induction_started_at = now
        elif stage == 'induction_completed':
            self.induction_completed_at = now
        elif stage == 'full_access_granted':
            self.full_access_granted_at = now
            self.access_level = 'full'
        
        self.save()
    
    def can_access_module(self, module_name):
        """Check if employee can access specific module based on workflow stage"""
        if self.access_level == 'none':
            return False
        elif self.access_level == 'limited':
            # Only profile completion allowed
            return module_name in ['profile', 'password_reset']
        elif self.access_level == 'training_only':
            # Only training modules allowed
            return module_name in ['profile', 'training', 'induction']
        elif self.access_level == 'full':
            # All modules allowed
            return True
        return False


class EmployeeProfileCompletion(models.Model):
    """Track employee profile completion status"""
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='profile_completion')
    
    # Required documents/information
    profile_picture_uploaded = models.BooleanField(default=False)
    face_photo_uploaded = models.BooleanField(default=False)
    personal_details_completed = models.BooleanField(default=False)
    address_details_completed = models.BooleanField(default=False)
    government_ids_completed = models.BooleanField(default=False)
    banking_details_completed = models.BooleanField(default=False)
    emergency_contact_completed = models.BooleanField(default=False)
    
    # Document uploads
    aadhar_document = models.FileField(upload_to='employee_documents/aadhar/', null=True, blank=True)
    pan_document = models.FileField(upload_to='employee_documents/pan/', null=True, blank=True)
    bank_passbook = models.FileField(upload_to='employee_documents/bank/', null=True, blank=True)
    educational_certificates = models.FileField(upload_to='employee_documents/education/', null=True, blank=True)
    experience_certificates = models.FileField(upload_to='employee_documents/experience/', null=True, blank=True)
    
    # Completion tracking
    completion_percentage = models.IntegerField(default=0)
    is_complete = models.BooleanField(default=False)
    submitted_for_approval = models.BooleanField(default=False)
    
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def calculate_completion_percentage(self):
        """Calculate profile completion percentage"""
        fields = [
            self.profile_picture_uploaded,
            self.face_photo_uploaded,
            self.personal_details_completed,
            self.address_details_completed,
            self.government_ids_completed,
            self.banking_details_completed,
            self.emergency_contact_completed
        ]
        completed = sum(1 for field in fields if field)
        self.completion_percentage = int((completed / len(fields)) * 100)
        self.is_complete = self.completion_percentage == 100
        self.save()
        return self.completion_percentage
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.completion_percentage}% Complete"


class InductionTraining(models.Model):
    """Induction training modules and completion tracking"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='induction_modules')
    training_number = models.CharField(max_length=50, blank=True, db_index=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    content = models.TextField(blank=True)
    video_url = models.URLField(blank=True)
    document = models.FileField(upload_to='induction_materials/', null=True, blank=True)
    
    # Module settings
    is_mandatory = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    estimated_duration_minutes = models.IntegerField(default=30)
    
    # Quiz/Assessment
    has_quiz = models.BooleanField(default=False)
    quiz_questions = models.JSONField(default=list, blank=True)
    passing_score = models.IntegerField(default=80)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'title']
    
    def __str__(self):
        return f"{self.company.name} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.training_number:
            try:
                self.training_number = _generate_configured_number(self.company, 'training')
            except Exception:
                if getattr(self.company, 'use_document_numbering', False):
                    raise
                last_training = InductionTraining.objects.filter(
                    company=self.company,
                    training_number__startswith='TRN-'
                ).order_by('-id').first()
                if last_training:
                    last_number = int(last_training.training_number.split('-')[-1])
                    self.training_number = f"TRN-{last_number + 1:06d}"
                else:
                    self.training_number = "TRN-000001"
        super().save(*args, **kwargs)


class EmployeeInductionProgress(models.Model):
    """Track employee progress through induction training"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='induction_progress')
    training_module = models.ForeignKey(InductionTraining, on_delete=models.CASCADE, related_name='employee_progress')
    
    # Progress tracking
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_minutes = models.IntegerField(default=0)
    
    # Quiz results
    quiz_attempted = models.BooleanField(default=False)
    quiz_score = models.IntegerField(null=True, blank=True)
    quiz_passed = models.BooleanField(default=False)
    quiz_attempts = models.IntegerField(default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='not_started')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['employee', 'training_module']
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.training_module.title} - {self.status}"


class EmployeeAccessLog(models.Model):
    """Log employee access attempts and restrictions"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='access_logs')
    module_name = models.CharField(max_length=50)
    access_granted = models.BooleanField()
    access_level_at_time = models.CharField(max_length=15)
    workflow_stage_at_time = models.CharField(max_length=30)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        status = "Granted" if self.access_granted else "Denied"
        return f"{self.employee.full_name} - {self.module_name} - {status}"
