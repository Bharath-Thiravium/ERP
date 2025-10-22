from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from authentication.models import Company, CompanyUser
import secrets
import string
import json
from datetime import datetime, timedelta
from django.utils import timezone

class CompanySecuritySettings(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='security_settings')
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True, null=True)
    ip_restrictions_enabled = models.BooleanField(default=False)
    session_timeout_minutes = models.IntegerField(default=60)
    max_failed_attempts = models.IntegerField(default=5)
    lockout_duration_minutes = models.IntegerField(default=15)
    password_expiry_days = models.IntegerField(default=90)
    require_password_change = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_security_settings'

class CompanyRecoveryCode(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='recovery_codes')
    code_hash = models.CharField(max_length=255)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'company_recovery_codes'

    def set_code(self, code):
        self.code_hash = make_password(code)

    def check_code(self, code):
        return check_password(code, self.code_hash)

class CompanyApiKey(models.Model):
    PERMISSION_CHOICES = [
        ('read', 'Read'),
        ('write', 'Write'),
        ('admin', 'Admin'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100)
    key_prefix = models.CharField(max_length=10)
    key_hash = models.CharField(max_length=255)
    permissions = models.JSONField(default=list)
    last_used = models.DateTimeField(null=True, blank=True)
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'company_api_keys'

    def generate_key(self):
        key = 'ak_' + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        self.key_prefix = key[:10]
        self.key_hash = make_password(key)
        return key

    def check_key(self, key):
        return check_password(key, self.key_hash)

class CompanyIpRestriction(models.Model):
    RESTRICTION_TYPES = [
        ('allow', 'Allow'),
        ('deny', 'Deny'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ip_restrictions')
    ip_address = models.GenericIPAddressField()
    restriction_type = models.CharField(max_length=5, choices=RESTRICTION_TYPES)
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'company_ip_restrictions'
        unique_together = ['company', 'ip_address']

class CompanyUserSession(models.Model):
    user = models.ForeignKey(CompanyUser, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, unique=True)
    device_type = models.CharField(max_length=20, default='desktop')
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField()
    location = models.CharField(max_length=100, blank=True)
    user_agent = models.TextField(blank=True)
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'company_user_sessions'

    def is_expired(self):
        return timezone.now() > self.expires_at

class CompanySecurityLog(models.Model):
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('password_change', 'Password Change'),
        ('2fa_enable', '2FA Enable'),
        ('2fa_disable', '2FA Disable'),
        ('api_key_create', 'API Key Create'),
        ('api_key_delete', 'API Key Delete'),
        ('ip_restriction_add', 'IP Restriction Add'),
        ('ip_restriction_remove', 'IP Restriction Remove'),
        ('session_terminate', 'Session Terminate'),
        ('failed_login', 'Failed Login'),
        ('account_locked', 'Account Locked'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='security_logs')
    user_email = models.EmailField()
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    success = models.BooleanField()
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'company_security_logs'
        ordering = ['-timestamp']

class CompanyPasswordHistory(models.Model):
    user = models.ForeignKey(CompanyUser, on_delete=models.CASCADE, related_name='password_history')
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'company_password_history'
        ordering = ['-created_at']

class CompanyLoginAttempt(models.Model):
    email = models.EmailField()
    ip_address = models.GenericIPAddressField()
    success = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'company_login_attempts'
        ordering = ['-timestamp']