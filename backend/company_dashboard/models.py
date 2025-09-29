from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from authentication.models import Company, Service, CompanyServiceUser
import json
from django.core.exceptions import ValidationError
from cryptography.fernet import Fernet
from django.conf import settings
import base64
import os

class ServiceUtilization(models.Model):
    """Track service usage statistics for companies"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='service_utilizations')
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    last_activity = models.DateTimeField(null=True, blank=True)
    usage_percentage = models.FloatField(default=0.0)
    data_volume = models.BigIntegerField(default=0)  # Total records/transactions
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'service']
        verbose_name = 'Service Utilization'
        verbose_name_plural = 'Service Utilizations'

    def __str__(self):
        return f"{self.company.name} - {self.service.name} Utilization"

class CompanyAnalytics(models.Model):
    """Company-wide analytics and insights"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='analytics')
    total_data_entries = models.BigIntegerField(default=0)
    most_used_service = models.CharField(max_length=50, blank=True)
    least_used_service = models.CharField(max_length=50, blank=True)
    monthly_growth = models.FloatField(default=0.0)
    service_adoption_rate = models.JSONField(default=dict)  # {service_type: percentage}
    system_health = models.CharField(
        max_length=20, 
        choices=[('excellent', 'Excellent'), ('good', 'Good'), ('fair', 'Fair'), ('poor', 'Poor')],
        default='good'
    )
    last_calculated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Company Analytics'
        verbose_name_plural = 'Company Analytics'

    def __str__(self):
        return f"{self.company.name} Analytics"

class ServiceUserActivity(models.Model):
    """Track service user activities and sessions"""
    service_user = models.ForeignKey(CompanyServiceUser, on_delete=models.CASCADE, related_name='activities')
    service_type = models.CharField(max_length=50)
    last_login = models.DateTimeField(null=True, blank=True)
    total_sessions = models.IntegerField(default=0)
    actions_performed = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[('active', 'Active'), ('inactive', 'Inactive')],
        default='inactive'
    )
    session_duration = models.DurationField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['service_user', 'service_type']
        verbose_name = 'Service User Activity'
        verbose_name_plural = 'Service User Activities'

    def __str__(self):
        return f"{self.service_user.username} - {self.service_type} Activity"

class CompanyNotification(models.Model):
    """Company-specific notifications and alerts"""
    NOTIFICATION_TYPES = [
        ('service_update', 'Service Update'),
        ('user_activity', 'User Activity'),
        ('system_alert', 'System Alert'),
        ('maintenance', 'Maintenance'),
        ('security', 'Security Alert'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    service_type = models.CharField(max_length=50, blank=True, null=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Company Notification'
        verbose_name_plural = 'Company Notifications'

    def __str__(self):
        return f"{self.company.name} - {self.title}"

class ServiceConfiguration(models.Model):
    """Service configuration settings per company"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='service_configurations')
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    custom_settings = models.JSONField(default=dict)
    feature_toggles = models.JSONField(default=dict)
    access_restrictions = models.JSONField(default=list)
    data_retention_days = models.IntegerField(default=365)
    backup_enabled = models.BooleanField(default=True)
    auto_archive = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'service']
        verbose_name = 'Service Configuration'
        verbose_name_plural = 'Service Configurations'

    def __str__(self):
        return f"{self.company.name} - {self.service.name} Config"

class ActivityLog(models.Model):
    """Log all company dashboard activities"""
    ACTION_TYPES = [
        ('login', 'User Login'),
        ('logout', 'User Logout'),
        ('create_user', 'Create Service User'),
        ('delete_user', 'Delete Service User'),
        ('access_service', 'Access Service'),
        ('update_settings', 'Update Settings'),
        ('upload_logo', 'Upload Logo'),
        ('change_password', 'Change Password'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='activity_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    description = models.TextField()
    service_type = models.CharField(max_length=50, blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'

    def __str__(self):
        return f"{self.company.name} - {self.action_type} - {self.timestamp}"

class CompanyEmailSettings(models.Model):
    """Email configuration settings for each company"""
    EMAIL_PROVIDERS = [
        ('gmail', 'Gmail'),
        ('outlook', 'Outlook/Hotmail'),
        ('yahoo', 'Yahoo Mail'),
        ('hostinger', 'Hostinger Email'),
        ('custom_smtp', 'Custom SMTP'),
        ('sendgrid', 'SendGrid'),
        ('mailgun', 'Mailgun'),
        ('ses', 'Amazon SES'),
    ]

    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='email_settings')
    
    # Basic Settings
    from_email = models.EmailField(help_text="Official email address for sending emails")
    from_name = models.CharField(max_length=255, help_text="Display name for emails")
    reply_to_email = models.EmailField(blank=True, help_text="Reply-to email address")
    
    # Provider Settings
    email_provider = models.CharField(max_length=20, choices=EMAIL_PROVIDERS, default='gmail')
    
    # SMTP Configuration
    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.IntegerField(default=587)
    smtp_username = models.CharField(max_length=255, blank=True)
    smtp_password = models.TextField(blank=True)  # Encrypted
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    
    # API-based Services (SendGrid, Mailgun, etc.)
    api_key = models.TextField(blank=True)  # Encrypted
    api_secret = models.TextField(blank=True)  # Encrypted
    
    # Settings
    is_active = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    daily_limit = models.IntegerField(default=500, help_text="Daily email sending limit")
    emails_sent_today = models.IntegerField(default=0)
    last_reset_date = models.DateField(auto_now_add=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_test_sent = models.DateTimeField(null=True, blank=True)
    test_status = models.CharField(max_length=20, default='pending')  # pending, success, failed

    class Meta:
        verbose_name = 'Company Email Settings'
        verbose_name_plural = 'Company Email Settings'

    def __str__(self):
        return f"{self.company.name} - {self.from_email}"
    
    def _is_encrypted(self, data):
        """Check if data is already encrypted"""
        if not data:
            return False
        try:
            # Try to decode base64 and check if it starts with Fernet token prefix
            decoded = base64.b64decode(data.encode())
            return decoded.startswith(b'gAAAAA')
        except Exception:
            return False
    
    def save(self, *args, **kwargs):
        """Override save to ensure passwords are encrypted"""
        # Only encrypt if the password appears to be plain text
        if self.smtp_password and not self._is_encrypted(self.smtp_password):
            self.smtp_password = self._encrypt_data(self.smtp_password)
        
        if self.api_key and not self._is_encrypted(self.api_key):
            self.api_key = self._encrypt_data(self.api_key)
        
        if self.api_secret and not self._is_encrypted(self.api_secret):
            self.api_secret = self._encrypt_data(self.api_secret)
        
        super().save(*args, **kwargs)

    def clean(self):
        """Validate email settings based on provider"""
        if self.email_provider == 'custom_smtp':
            if not all([self.smtp_host, self.smtp_username, self.smtp_password]):
                raise ValidationError("SMTP settings are required for custom SMTP provider")
        
        elif self.email_provider in ['sendgrid', 'mailgun', 'ses']:
            if not self.api_key:
                raise ValidationError(f"API key is required for {self.email_provider}")

    def get_smtp_config(self):
        """Get SMTP configuration based on provider"""
        configs = {
            'gmail': {
                'host': 'smtp.gmail.com',
                'port': 587,
                'use_tls': True,
                'use_ssl': False
            },
            'outlook': {
                'host': 'smtp-mail.outlook.com',
                'port': 587,
                'use_tls': True,
                'use_ssl': False
            },
            'yahoo': {
                'host': 'smtp.mail.yahoo.com',
                'port': 587,
                'use_tls': True,
                'use_ssl': False
            },
            'hostinger': {
                'host': 'smtp.hostinger.com',
                'port': 587,
                'use_tls': True,
                'use_ssl': False
            },
            'custom_smtp': {
                'host': self.smtp_host,
                'port': self.smtp_port,
                'use_tls': self.use_tls,
                'use_ssl': self.use_ssl
            }
        }
        
        return configs.get(self.email_provider, configs['custom_smtp'])

    def reset_daily_count_if_needed(self):
        """Reset daily email count if it's a new day"""
        from django.utils import timezone
        today = timezone.now().date()
        
        if self.last_reset_date < today:
            self.emails_sent_today = 0
            self.last_reset_date = today
            self.save(update_fields=['emails_sent_today', 'last_reset_date'])

    def can_send_email(self):
        """Check if company can send more emails today"""
        self.reset_daily_count_if_needed()
        return self.is_active and self.emails_sent_today < self.daily_limit

    def increment_email_count(self):
        """Increment daily email count"""
        self.emails_sent_today += 1
        self.save(update_fields=['emails_sent_today'])
    
    @staticmethod
    def _get_encryption_key():
        """Get or create encryption key for sensitive data"""
        key = getattr(settings, 'EMAIL_ENCRYPTION_KEY', None)
        if not key:
            # Generate a new key if not set
            key = Fernet.generate_key()
            # In production, this should be stored securely
        return key
    
    def _encrypt_data(self, data):
        """Encrypt sensitive data"""
        if not data:
            return ''
        
        try:
            key = self._get_encryption_key()
            f = Fernet(key)
            encrypted_data = f.encrypt(data.encode())
            return base64.b64encode(encrypted_data).decode()
        except Exception:
            # Fallback to plain text if encryption fails
            return data
    
    def _decrypt_data(self, encrypted_data):
        """Decrypt sensitive data"""
        if not encrypted_data:
            return ''
        
        try:
            key = self._get_encryption_key()
            f = Fernet(key)
            decoded_data = base64.b64decode(encrypted_data.encode())
            return f.decrypt(decoded_data).decode()
        except Exception:
            # Return as-is if decryption fails (might be plain text)
            return encrypted_data
    
    def set_smtp_password(self, password):
        """Set encrypted SMTP password"""
        self.smtp_password = self._encrypt_data(password)
    
    def get_smtp_password(self):
        """Get decrypted SMTP password"""
        return self._decrypt_data(self.smtp_password)
    
    def set_api_key(self, api_key):
        """Set encrypted API key"""
        self.api_key = self._encrypt_data(api_key)
    
    def get_api_key(self):
        """Get decrypted API key"""
        return self._decrypt_data(self.api_key)
    
    def set_api_secret(self, api_secret):
        """Set encrypted API secret"""
        self.api_secret = self._encrypt_data(api_secret)
    
    def get_api_secret(self):
        """Get decrypted API secret"""
        return self._decrypt_data(self.api_secret)