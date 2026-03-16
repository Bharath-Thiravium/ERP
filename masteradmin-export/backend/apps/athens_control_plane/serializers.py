from rest_framework import serializers
from django.contrib.auth.models import User
from authentication.models import Company, CompanyUser
from .models import (
    AthensTenantLink, AthensSubscription, AthensAuditLog, 
    AthensPlatformSettings, AthensModuleSubscription,
    DEFAULT_MODULES_SUSTAINABILITY
)


class AthensTenantSerializer(serializers.ModelSerializer):
    """Serializer for Athens tenant (Company) management"""
    company_name = serializers.CharField(source='name', read_only=True)
    company_email = serializers.EmailField(source='email', read_only=True)
    company_prefix = serializers.CharField(read_only=True)
    approval_status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    athens_status = serializers.SerializerMethodField()
    enabled_modules = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id', 'company_name', 'company_email', 'company_prefix', 
            'approval_status', 'created_at', 'athens_status', 
            'enabled_modules', 'subscription_status'
        ]

    def get_athens_status(self, obj):
        try:
            athens_link = obj.athens_tenant
            return {
                'is_active': athens_link.is_active,
                'synced_at': athens_link.synced_at,
                'master_admin': athens_link.master_admin.email if athens_link.master_admin else None
            }
        except AthensTenantLink.DoesNotExist:
            return {'is_active': False, 'synced_at': None, 'master_admin': None}

    def get_enabled_modules(self, obj):
        try:
            return obj.athens_tenant.enabled_modules
        except AthensTenantLink.DoesNotExist:
            return []

    def get_subscription_status(self, obj):
        try:
            subscription = obj.athens_subscription
            return {
                'plan': subscription.plan,
                'status': subscription.status,
                'seats': subscription.seats
            }
        except AthensSubscription.DoesNotExist:
            return {'plan': 'none', 'status': 'inactive', 'seats': 0}


class AthensTenantCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new Athens tenants (companies)"""
    class Meta:
        model = Company
        fields = ['name', 'email', 'company_prefix', 'phone', 'address']

    def validate_company_prefix(self, value):
        if Company.objects.filter(company_prefix=value).exists():
            raise serializers.ValidationError("Company prefix already exists")
        return value.upper()


class AthensTenantUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating Athens tenant details"""
    class Meta:
        model = Company
        fields = ['name', 'email', 'phone', 'address']


class AthensModulesSerializer(serializers.Serializer):
    """Serializer for managing Athens sustainability modules"""
    enabled_modules = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of enabled sustainability modules"
    )

    def validate_enabled_modules(self, value):
        # Validate that all modules are from the allowed list
        invalid_modules = [m for m in value if m not in DEFAULT_MODULES_SUSTAINABILITY]
        if invalid_modules:
            raise serializers.ValidationError(
                f"Invalid modules: {invalid_modules}. "
                f"Allowed modules: {DEFAULT_MODULES_SUSTAINABILITY}"
            )
        return value


class AthensMasterUserSerializer(serializers.ModelSerializer):
    """Serializer for Athens master users (company admins)"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = CompanyUser
        fields = [
            'id', 'company', 'company_name', 'user_email', 
            'user_first_name', 'user_last_name', 'created_at',
            'first_login_completed', 'last_login_at'
        ]


class AthensMasterUserCreateSerializer(serializers.Serializer):
    """Serializer for creating Athens master users"""
    company_id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    force_password_reset = serializers.BooleanField(default=True)

    def validate_company_id(self, value):
        try:
            Company.objects.get(id=value)
        except Company.DoesNotExist:
            raise serializers.ValidationError("Company does not exist")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists")
        return value


class AthensSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Athens subscriptions"""
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = AthensSubscription
        fields = [
            'id', 'company', 'company_name', 'plan', 'status', 
            'seats', 'start_date', 'end_date', 'payment_provider',
            'created_at', 'updated_at'
        ]


class AthensAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for Athens audit logs"""
    actor_email = serializers.CharField(source='actor.email', read_only=True)

    class Meta:
        model = AthensAuditLog
        fields = [
            'id', 'actor', 'actor_email', 'action', 'entity_type', 
            'entity_id', 'before_data', 'after_data', 'ip_address',
            'user_agent', 'created_at'
        ]


class AthensPlatformSettingsSerializer(serializers.ModelSerializer):
    """Serializer for Athens platform settings"""
    class Meta:
        model = AthensPlatformSettings
        fields = [
            'platform_name', 'platform_url', 'support_email',
            'session_timeout_minutes', 'require_mfa', 'max_login_attempts',
            'password_expiry_days', 'updated_at'
        ]


class AthensMetricsOverviewSerializer(serializers.Serializer):
    """Serializer for Athens metrics overview"""
    total_tenants = serializers.IntegerField()
    active_tenants = serializers.IntegerField()
    total_subscriptions = serializers.IntegerField()
    active_subscriptions = serializers.IntegerField()
    total_modules_enabled = serializers.IntegerField()
    recent_activity_count = serializers.IntegerField()