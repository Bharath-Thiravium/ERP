from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from .models import MasterAdmin
import uuid

class IPRestriction(models.Model):
    """IP address restrictions for enhanced security"""
    master_admin = models.ForeignKey(MasterAdmin, on_delete=models.CASCADE, related_name='ip_restrictions')
    ip_address = models.GenericIPAddressField()
    description = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['master_admin', 'ip_address']
        db_table = 'auth_ip_restrictions'
    
    def __str__(self):
        return f"{self.ip_address} - {self.description}"

class DeviceFingerprint(models.Model):
    """Device fingerprinting for trusted device management"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    master_admin = models.ForeignKey(MasterAdmin, on_delete=models.CASCADE, related_name='device_fingerprints')
    device_name = models.CharField(max_length=200)
    browser = models.CharField(max_length=100)
    os = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField()
    location = models.CharField(max_length=200, null=True, blank=True)
    is_trusted = models.BooleanField(default=False)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auth_device_fingerprints'
    
    def __str__(self):
        return f"{self.device_name} - {self.ip_address}"

class LoginNotification(models.Model):
    """Login notification tracking"""
    master_admin = models.ForeignKey(MasterAdmin, on_delete=models.CASCADE, related_name='login_notifications')
    email_sent = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField()
    location = models.CharField(max_length=200, null=True, blank=True)
    device_info = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'auth_login_notifications'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Login notification for {self.master_admin.email} at {self.timestamp}"

class SecuritySettings(models.Model):
    """Enhanced security settings"""
    master_admin = models.OneToOneField(MasterAdmin, on_delete=models.CASCADE, related_name='security_settings')
    ip_restrictions_enabled = models.BooleanField(default=False)
    device_fingerprinting_enabled = models.BooleanField(default=True)
    login_notifications_enabled = models.BooleanField(default=True)
    notification_email = models.EmailField(blank=True, null=True, help_text="Email to receive login notifications")
    captcha_after_failed_attempts = models.IntegerField(default=3)
    max_failed_attempts = models.IntegerField(default=5)
    lockout_duration_minutes = models.IntegerField(default=15)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auth_security_settings'
    
    def __str__(self):
        return f"Security settings for {self.master_admin.email}"