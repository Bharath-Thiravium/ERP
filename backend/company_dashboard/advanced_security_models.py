from django.db import models
from django.contrib.auth.models import User
from authentication.models import Company, CompanyUser
import json
from django.utils import timezone
import hashlib

class CompanyCaptchaSettings(models.Model):
    """Captcha configuration for companies"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='captcha_settings')
    enabled = models.BooleanField(default=True)
    failed_attempts_threshold = models.IntegerField(default=3)
    captcha_type = models.CharField(max_length=20, choices=[
        ('recaptcha', 'Google reCAPTCHA'),
        ('hcaptcha', 'hCaptcha'),
        ('simple', 'Simple Math Captcha')
    ], default='simple')
    site_key = models.CharField(max_length=255, blank=True)
    secret_key = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_captcha_settings'

class CompanyDeviceFingerprint(models.Model):
    """Device fingerprinting for enhanced security"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='device_fingerprints')
    user = models.ForeignKey(CompanyUser, on_delete=models.CASCADE, related_name='device_fingerprints')
    device_id = models.CharField(max_length=64, unique=True)
    fingerprint_hash = models.CharField(max_length=64)
    
    # Device information
    user_agent = models.TextField()
    screen_resolution = models.CharField(max_length=20, blank=True)
    timezone = models.CharField(max_length=50, blank=True)
    language = models.CharField(max_length=10, blank=True)
    platform = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    browser_version = models.CharField(max_length=50, blank=True)
    os = models.CharField(max_length=100, blank=True)
    
    # Security status
    is_trusted = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    trust_score = models.IntegerField(default=50)  # 0-100
    
    # Tracking
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    login_count = models.IntegerField(default=0)
    
    # Location data
    ip_address = models.GenericIPAddressField()
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'company_device_fingerprints'
        unique_together = ['company', 'device_id']

    def generate_fingerprint_hash(self, fingerprint_data):
        """Generate hash from device fingerprint data"""
        fingerprint_string = f"{fingerprint_data.get('userAgent', '')}{fingerprint_data.get('screen', '')}{fingerprint_data.get('timezone', '')}{fingerprint_data.get('language', '')}"
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()

class CompanyGeolocationRule(models.Model):
    """Geolocation-based access rules"""
    RULE_TYPES = [
        ('allow', 'Allow'),
        ('block', 'Block'),
        ('require_2fa', 'Require 2FA'),
        ('notify', 'Notify Only')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='geolocation_rules')
    name = models.CharField(max_length=100)
    rule_type = models.CharField(max_length=20, choices=RULE_TYPES)
    
    # Location criteria
    countries = models.JSONField(default=list)  # List of country codes
    cities = models.JSONField(default=list)  # List of cities
    ip_ranges = models.JSONField(default=list)  # List of IP ranges
    
    # Time-based restrictions
    time_restrictions = models.JSONField(default=dict)  # Business hours, days
    
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=100)  # Lower number = higher priority
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_geolocation_rules'
        ordering = ['priority', 'created_at']

class CompanyThreatDetection(models.Model):
    """Advanced threat detection and monitoring"""
    THREAT_TYPES = [
        ('brute_force', 'Brute Force Attack'),
        ('suspicious_location', 'Suspicious Location'),
        ('device_anomaly', 'Device Anomaly'),
        ('time_anomaly', 'Time-based Anomaly'),
        ('velocity_attack', 'Velocity Attack'),
        ('credential_stuffing', 'Credential Stuffing'),
        ('session_hijacking', 'Session Hijacking'),
        ('privilege_escalation', 'Privilege Escalation')
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='threat_detections')
    user_email = models.EmailField()
    threat_type = models.CharField(max_length=30, choices=THREAT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    
    # Threat details
    description = models.TextField()
    evidence = models.JSONField(default=dict)  # Evidence data
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    device_id = models.CharField(max_length=64, blank=True)
    
    # AI Enhancement
    confidence_score = models.FloatField(default=0.0)  # 0.0 to 1.0
    ml_model_version = models.CharField(max_length=20, default='v1.0')
    behavioral_score = models.FloatField(default=0.0)
    
    # Response
    is_resolved = models.BooleanField(default=False)
    auto_blocked = models.BooleanField(default=False)
    admin_notified = models.BooleanField(default=False)
    response_actions = models.JSONField(default=list)
    
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'company_threat_detections'
        ordering = ['-detected_at']

class CompanySecurityAlert(models.Model):
    """Security alerts and notifications"""
    ALERT_TYPES = [
        ('login_anomaly', 'Login Anomaly'),
        ('new_device', 'New Device'),
        ('location_change', 'Location Change'),
        ('threat_detected', 'Threat Detected'),
        ('policy_violation', 'Policy Violation'),
        ('account_lockout', 'Account Lockout'),
        ('password_breach', 'Password Breach'),
        ('suspicious_activity', 'Suspicious Activity')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='company_security_alerts')
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Alert data
    user_email = models.EmailField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    
    # Status
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    severity = models.CharField(max_length=10, choices=[
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical')
    ], default='info')
    
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'company_security_alerts'
        ordering = ['-created_at']

class CompanyAdvancedSettings(models.Model):
    """Advanced security settings"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='advanced_security_settings')
    
    # Threat detection settings
    enable_threat_detection = models.BooleanField(default=True)
    brute_force_threshold = models.IntegerField(default=5)
    velocity_threshold = models.IntegerField(default=10)  # Logins per minute
    
    # Device fingerprinting
    enable_device_fingerprinting = models.BooleanField(default=True)
    auto_trust_devices = models.BooleanField(default=False)
    device_trust_duration_days = models.IntegerField(default=30)
    
    # Geolocation security
    enable_geolocation_security = models.BooleanField(default=True)
    block_unknown_locations = models.BooleanField(default=False)
    require_2fa_new_locations = models.BooleanField(default=True)
    
    # Alert settings
    email_alerts = models.BooleanField(default=True)
    sms_alerts = models.BooleanField(default=False)
    webhook_alerts = models.BooleanField(default=False)
    webhook_url = models.URLField(blank=True)
    
    # Auto-response settings
    auto_block_threats = models.BooleanField(default=True)
    auto_lockout_duration_minutes = models.IntegerField(default=60)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_advanced_security_settings'