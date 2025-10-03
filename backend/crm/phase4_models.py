# Phase 4: Integration & Mobile Optimization + Advanced Security & Compliance Models
from django.db import models
from django.contrib.auth.models import User
from authentication.models import Company
from django.utils import timezone
import json


class ThirdPartyIntegration(models.Model):
    INTEGRATION_TYPE_CHOICES = [
        ('email_service', 'Email Service'),
        ('calendar', 'Calendar'),
        ('social_media', 'Social Media'),
        ('accounting', 'Accounting'),
        ('payment', 'Payment Gateway'),
        ('telephony', 'Telephony'),
        ('marketing', 'Marketing Platform'),
        ('analytics', 'Analytics'),
        ('storage', 'Cloud Storage'),
        ('custom', 'Custom API'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('error', 'Error'),
        ('pending', 'Pending Setup'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='integrations')
    name = models.CharField(max_length=200)
    integration_type = models.CharField(max_length=20, choices=INTEGRATION_TYPE_CHOICES)
    provider = models.CharField(max_length=100)  # e.g., 'Gmail', 'Outlook', 'Slack'
    
    # Configuration
    api_endpoint = models.URLField(blank=True)
    api_key = models.CharField(max_length=500, blank=True)  # Encrypted
    webhook_url = models.URLField(blank=True)
    config_data = models.JSONField(default=dict)  # Additional configuration
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    last_sync = models.DateTimeField(null=True, blank=True)
    sync_frequency = models.IntegerField(default=60)  # Minutes
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_integrations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.provider}"


class IntegrationLog(models.Model):
    LOG_TYPE_CHOICES = [
        ('sync', 'Data Sync'),
        ('webhook', 'Webhook'),
        ('api_call', 'API Call'),
        ('error', 'Error'),
        ('auth', 'Authentication'),
    ]
    
    LEVEL_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]

    integration = models.ForeignKey(ThirdPartyIntegration, on_delete=models.CASCADE, related_name='logs')
    log_type = models.CharField(max_length=20, choices=LOG_TYPE_CHOICES)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='info')
    message = models.TextField()
    details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.integration.name} - {self.get_level_display()}"


class MobileDevice(models.Model):
    DEVICE_TYPE_CHOICES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
        ('web', 'Web Mobile'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('blocked', 'Blocked'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mobile_devices')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='mobile_devices')
    
    device_id = models.CharField(max_length=200, unique=True)
    device_name = models.CharField(max_length=200)
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPE_CHOICES)
    device_model = models.CharField(max_length=100, blank=True)
    os_version = models.CharField(max_length=50, blank=True)
    app_version = models.CharField(max_length=50, blank=True)
    
    # Push Notifications
    push_token = models.CharField(max_length=500, blank=True)
    push_enabled = models.BooleanField(default=True)
    
    # Security
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_active = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Tracking
    registered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_active']

    def __str__(self):
        return f"{self.user.username} - {self.device_name}"


class MobileSync(models.Model):
    SYNC_TYPE_CHOICES = [
        ('full', 'Full Sync'),
        ('incremental', 'Incremental'),
        ('push', 'Push Update'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    device = models.ForeignKey(MobileDevice, on_delete=models.CASCADE, related_name='sync_logs')
    sync_type = models.CharField(max_length=20, choices=SYNC_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Sync Details
    data_types = models.JSONField(default=list)  # ['leads', 'contacts', 'activities']
    records_synced = models.IntegerField(default=0)
    errors = models.JSONField(default=list)
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.device.device_name} - {self.get_sync_type_display()}"


class DataAuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('export', 'Export'),
        ('import', 'Import'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_logs')
    
    # Action Details
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)  # e.g., 'Lead', 'Contact'
    object_id = models.CharField(max_length=100)
    object_repr = models.CharField(max_length=200)
    
    # Changes
    changes = models.JSONField(default=dict)  # Before/after values
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=100, blank=True)
    
    # Timing
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action} {self.model_name}"


class ComplianceRule(models.Model):
    RULE_TYPE_CHOICES = [
        ('gdpr', 'GDPR'),
        ('ccpa', 'CCPA'),
        ('hipaa', 'HIPAA'),
        ('sox', 'SOX'),
        ('custom', 'Custom'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('draft', 'Draft'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='compliance_rules')
    name = models.CharField(max_length=200)
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES)
    description = models.TextField()
    
    # Rule Configuration
    conditions = models.JSONField(default=dict)  # Rule conditions
    actions = models.JSONField(default=list)  # Actions to take
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_compliance_rules')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_rule_type_display()})"


class ComplianceViolation(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='compliance_violations')
    rule = models.ForeignKey(ComplianceRule, on_delete=models.CASCADE, related_name='violations')
    
    # Violation Details
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    # Context
    affected_records = models.JSONField(default=list)
    violation_data = models.JSONField(default=dict)
    
    # Resolution
    resolution_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_violations')
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    detected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.title} - {self.get_severity_display()}"


class DataRetentionPolicy(models.Model):
    RETENTION_TYPE_CHOICES = [
        ('time_based', 'Time Based'),
        ('event_based', 'Event Based'),
        ('manual', 'Manual'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('draft', 'Draft'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='retention_policies')
    name = models.CharField(max_length=200)
    description = models.TextField()
    
    # Policy Configuration
    retention_type = models.CharField(max_length=20, choices=RETENTION_TYPE_CHOICES)
    retention_period_days = models.IntegerField(null=True, blank=True)
    data_types = models.JSONField(default=list)  # ['leads', 'contacts', etc.]
    conditions = models.JSONField(default=dict)
    
    # Actions
    archive_before_delete = models.BooleanField(default=True)
    notify_before_delete = models.BooleanField(default=True)
    notification_days = models.IntegerField(default=30)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_retention_policies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_executed = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class SecurityAlert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('suspicious_login', 'Suspicious Login'),
        ('data_breach', 'Data Breach'),
        ('unauthorized_access', 'Unauthorized Access'),
        ('compliance_violation', 'Compliance Violation'),
        ('integration_failure', 'Integration Failure'),
        ('system_anomaly', 'System Anomaly'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='security_alerts')
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    # Alert Data
    alert_data = models.JSONField(default=dict)
    affected_users = models.ManyToManyField(User, blank=True, related_name='security_alerts')
    
    # Response
    response_actions = models.JSONField(default=list)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_security_alerts')
    
    # Resolution
    resolution_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_security_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.get_severity_display()}"


class APIUsageLog(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='api_usage_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_usage_logs')
    
    # Request Details
    endpoint = models.CharField(max_length=200)
    method = models.CharField(max_length=10)  # GET, POST, PUT, DELETE
    status_code = models.IntegerField()
    response_time_ms = models.IntegerField()
    
    # Request Data
    request_data = models.JSONField(default=dict)
    response_size_bytes = models.IntegerField(default=0)
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timing
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.status_code}"