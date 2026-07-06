from rest_framework import serializers
from common.models import DataSharingPolicy, SyncApprovalRequest
from .models import (
    ServiceUtilization, CompanyAnalytics, ServiceUserActivity,
    CompanyNotification, ServiceConfiguration, ActivityLog, CompanyEmailSettings
)


class DataSharingPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSharingPolicy
        fields = [
            'id',
            'crm_to_finance_customers',
            'finance_to_crm_customers',
            'inventory_to_finance_products',
            'finance_to_inventory_products',
            'crm_opportunity_to_finance_quotation',
            'auto_sync_enabled',
            'require_manual_approval',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SyncApprovalRequestSerializer(serializers.ModelSerializer):
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)

    class Meta:
        model = SyncApprovalRequest
        fields = [
            'id',
            'request_type',
            'request_type_display',
            'source_service',
            'target_service',
            'source_model',
            'source_object_id',
            'target_model',
            'target_object_id',
            'title',
            'summary',
            'suggested_data',
            'approval_data',
            'status',
            'status_display',
            'error_message',
            'requested_at',
            'reviewed_at',
            'reviewed_by_email',
        ]
        read_only_fields = fields

class ServiceUtilizationSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_type = serializers.CharField(source='service.service_type', read_only=True)
    
    class Meta:
        model = ServiceUtilization
        fields = [
            'id', 'service_name', 'service_type', 'total_users', 
            'active_users', 'last_activity', 'usage_percentage', 
            'data_volume', 'created_at', 'updated_at'
        ]

class CompanyAnalyticsSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = CompanyAnalytics
        fields = [
            'id', 'company_name', 'total_data_entries', 'most_used_service',
            'least_used_service', 'monthly_growth', 'service_adoption_rate',
            'system_health', 'last_calculated'
        ]

class ServiceUserActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='service_user.username', read_only=True)
    full_name = serializers.CharField(source='service_user.full_name', read_only=True)
    
    class Meta:
        model = ServiceUserActivity
        fields = [
            'id', 'username', 'full_name', 'service_type', 'last_login',
            'total_sessions', 'actions_performed', 'status', 'session_duration',
            'created_at', 'updated_at'
        ]

class CompanyNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyNotification
        fields = [
            'id', 'type', 'service_type', 'title', 'message', 'priority',
            'metadata', 'read', 'read_at', 'created_at', 'expires_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']

class ServiceConfigurationSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_type = serializers.CharField(source='service.service_type', read_only=True)
    
    class Meta:
        model = ServiceConfiguration
        fields = [
            'id', 'service_name', 'service_type', 'custom_settings',
            'feature_toggles', 'access_restrictions', 'data_retention_days',
            'backup_enabled', 'auto_archive', 'created_at', 'updated_at'
        ]

class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'company_name', 'user_email', 'action_type', 'description',
            'service_type', 'ip_address', 'user_agent', 'metadata', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

class CompanyEmailSettingsSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = CompanyEmailSettings
        fields = [
            'id', 'company_name', 'from_email', 'from_name', 'reply_to_email',
            'email_provider', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
            'use_tls', 'use_ssl', 'api_key', 'api_secret', 'is_active', 'is_verified',
            'daily_limit', 'emails_sent_today', 'test_status', 'last_test_sent',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_name', 'emails_sent_today', 'test_status', 'last_test_sent', 'created_at', 'updated_at']
        extra_kwargs = {
            'smtp_password': {'write_only': True},
            'api_key': {'write_only': True},
            'api_secret': {'write_only': True}
        }
    
    def validate(self, data):
        """Validate email settings based on provider"""
        email_provider = data.get('email_provider')
        
        if email_provider == 'custom_smtp':
            required_fields = ['smtp_host', 'smtp_username', 'smtp_password']
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError(f"{field} is required for custom SMTP")
        
        elif email_provider in ['sendgrid', 'mailgun', 'ses']:
            if not data.get('api_key'):
                raise serializers.ValidationError(f"API key is required for {email_provider}")
        
        elif email_provider in ['gmail', 'outlook', 'yahoo', 'hostinger']:
            required_fields = ['smtp_username', 'smtp_password']
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError(f"{field} is required for {email_provider}")
        
        return data
    
    def create(self, validated_data):
        """Create email settings with encrypted sensitive data"""
        instance = CompanyEmailSettings(**validated_data)
        
        # Handle encrypted fields
        if 'smtp_password' in validated_data:
            instance.set_smtp_password(validated_data['smtp_password'])
        if 'api_key' in validated_data:
            instance.set_api_key(validated_data['api_key'])
        if 'api_secret' in validated_data:
            instance.set_api_secret(validated_data['api_secret'])
        
        instance.save()
        return instance
    
    def update(self, instance, validated_data):
        """Update email settings with encrypted sensitive data"""
        # Handle encrypted fields separately
        if 'smtp_password' in validated_data:
            instance.set_smtp_password(validated_data.pop('smtp_password'))
        if 'api_key' in validated_data:
            instance.set_api_key(validated_data.pop('api_key'))
        if 'api_secret' in validated_data:
            instance.set_api_secret(validated_data.pop('api_secret'))
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
    
    def to_representation(self, instance):
        """Custom representation to hide sensitive data"""
        data = super().to_representation(instance)
        
        # Never return actual passwords/keys in API responses
        if instance.smtp_password:
            data['smtp_password'] = '••••••••'
        if instance.api_key:
            data['api_key'] = '••••••••'
        if instance.api_secret:
            data['api_secret'] = '••••••••'
        
        return data
