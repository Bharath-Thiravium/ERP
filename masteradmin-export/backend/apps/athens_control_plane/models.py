from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from authentication.models import Company, MasterAdmin
import json


# Default modules for Athens Sustainability
DEFAULT_MODULES_SUSTAINABILITY = [
    "esg", "environment", "energy", "carbon", "waste", "water", 
    "compliance", "reporting", "sustainability_metrics", "green_finance"
]


class AthensTenantLink(models.Model):
    """Links SAP Company to Athens tenant concept with sustainability modules"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='athens_tenant')
    master_admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    enabled_modules = models.JSONField(default=list, help_text="List of enabled sustainability modules")
    enabled_menus = models.JSONField(default=list, help_text="List of enabled menu items")
    is_active = models.BooleanField(default=True)
    synced_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Athens Tenant Link"
        verbose_name_plural = "Athens Tenant Links"

    def __str__(self):
        return f"Athens Link - {self.company.name}"

    def save(self, *args, **kwargs):
        # Set default modules if empty
        if not self.enabled_modules:
            self.enabled_modules = DEFAULT_MODULES_SUSTAINABILITY.copy()
        super().save(*args, **kwargs)


class AthensSubscription(models.Model):
    """Subscription details for Athens Sustainability service"""
    PLAN_CHOICES = [
        ('basic', 'Basic'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('cancelled', 'Cancelled'),
        ('trial', 'Trial'),
    ]

    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='athens_subscription')
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='basic')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    seats = models.IntegerField(default=5)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    payment_provider = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Athens Subscription"
        verbose_name_plural = "Athens Subscriptions"

    def __str__(self):
        return f"{self.company.name} - {self.plan} ({self.status})"


class AthensAuditLog(models.Model):
    """Audit log for Athens control plane actions"""
    ACTION_CHOICES = [
        ('tenant_created', 'Tenant Created'),
        ('tenant_updated', 'Tenant Updated'),
        ('tenant_suspended', 'Tenant Suspended'),
        ('tenant_reactivated', 'Tenant Reactivated'),
        ('tenant_synced', 'Tenant Synced'),
        ('modules_updated', 'Modules Updated'),
        ('master_created', 'Master Created'),
        ('master_updated', 'Master Updated'),
        ('master_deleted', 'Master Deleted'),
        ('subscription_updated', 'Subscription Updated'),
        ('settings_updated', 'Settings Updated'),
    ]

    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=50)  # 'company', 'subscription', etc.
    entity_id = models.CharField(max_length=50)
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Athens Audit Log"
        verbose_name_plural = "Athens Audit Logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} - {self.entity_type}:{self.entity_id} by {self.actor}"


class AthensPlatformSettings(models.Model):
    """Platform-wide settings for Athens Sustainability"""
    id = models.IntegerField(primary_key=True, default=1)  # Singleton pattern
    platform_name = models.CharField(max_length=100, default="Athens Sustainability Platform")
    platform_url = models.URLField(default="https://sustainability.athenas.co.in")
    support_email = models.EmailField(default="support@athenas.co.in")
    session_timeout_minutes = models.IntegerField(default=60)
    require_mfa = models.BooleanField(default=True)
    max_login_attempts = models.IntegerField(default=5)
    password_expiry_days = models.IntegerField(default=90)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Athens Platform Settings"
        verbose_name_plural = "Athens Platform Settings"

    def __str__(self):
        return self.platform_name

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.id = 1
        super().save(*args, **kwargs)


class AthensModuleSubscription(models.Model):
    """Individual module subscriptions for companies"""
    PLAN_TIER_CHOICES = [
        ('basic', 'Basic'),
        ('premium', 'Premium'),
        ('enterprise', 'Enterprise'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='athens_module_subscriptions')
    module_code = models.CharField(max_length=50)
    enabled = models.BooleanField(default=True)
    plan_tier = models.CharField(max_length=20, choices=PLAN_TIER_CHOICES, default='basic')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'module_code']
        verbose_name = "Athens Module Subscription"
        verbose_name_plural = "Athens Module Subscriptions"

    def __str__(self):
        return f"{self.company.name} - {self.module_code} ({self.plan_tier})"