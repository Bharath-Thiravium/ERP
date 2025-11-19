# Phase 4: Integration & Mobile Optimization + Advanced Security & Compliance Serializers
from rest_framework import serializers
from .phase4_models import (
    ThirdPartyIntegration, IntegrationLog, MobileDevice, MobileSync,
    DataAuditLog, ComplianceRule, ComplianceViolation, DataRetentionPolicy,
    SecurityAlert, APIUsageLog
)


class ThirdPartyIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThirdPartyIntegration
        fields = '__all__'
        extra_kwargs = {
            'api_key': {'write_only': True}  # Don't expose API keys in responses
        }


class IntegrationLogSerializer(serializers.ModelSerializer):
    integration_name = serializers.CharField(source='integration.name', read_only=True)
    
    class Meta:
        model = IntegrationLog
        fields = '__all__'


class MobileDeviceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = MobileDevice
        fields = '__all__'
        extra_kwargs = {
            'push_token': {'write_only': True}
        }


class MobileSyncSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    
    class Meta:
        model = MobileSync
        fields = '__all__'


class DataAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = DataAuditLog
        fields = '__all__'


class ComplianceRuleSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ComplianceRule
        fields = '__all__'


class ComplianceViolationSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = ComplianceViolation
        fields = '__all__'


class DataRetentionPolicySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = DataRetentionPolicy
        fields = '__all__'


class SecurityAlertSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    affected_users_names = serializers.SerializerMethodField()
    
    class Meta:
        model = SecurityAlert
        fields = '__all__'
    
    def get_affected_users_names(self, obj):
        return [user.get_full_name() for user in obj.affected_users.all()]


class APIUsageLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = APIUsageLog
        fields = '__all__'