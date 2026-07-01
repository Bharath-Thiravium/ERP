# Phase 4: Integration & Mobile Optimization + Advanced Security & Compliance Serializers
from rest_framework import serializers
from .phase4_models import (
    ThirdPartyIntegration, IntegrationLog, MobileDevice, MobileSync,
    DataAuditLog, ComplianceRule, ComplianceViolation, DataRetentionPolicy,
    SecurityAlert, APIUsageLog
)
from .serializers import validate_same_company


class ThirdPartyIntegrationSerializer(serializers.ModelSerializer):
    # Virtual field: accepts plaintext on write, never exposed on read.
    # Backed by ThirdPartyIntegration.encrypted_api_key (Fernet-encrypted at rest).
    api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = ThirdPartyIntegration
        fields = [
            'id', 'company', 'name', 'integration_type', 'provider',
            'api_endpoint', 'api_key', 'webhook_url', 'config_data',
            'status', 'last_sync', 'sync_frequency',
            'created_by', 'created_at', 'updated_at',
        ]

    def create(self, validated_data):
        api_key = validated_data.pop('api_key', '')
        instance = ThirdPartyIntegration(**validated_data)
        instance.set_api_key(api_key)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        api_key = validated_data.pop('api_key', None)
        instance = super().update(instance, validated_data)
        if api_key is not None:
            instance.set_api_key(api_key)
            instance.save()
        return instance


class IntegrationLogSerializer(serializers.ModelSerializer):
    integration_name = serializers.CharField(source='integration.name', read_only=True)

    class Meta:
        model = IntegrationLog
        fields = '__all__'

    def validate_integration(self, value):
        return validate_same_company(value, self.context, 'Integration')


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

    def validate_device(self, value):
        return validate_same_company(value, self.context, 'Mobile device')


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

    def validate_rule(self, value):
        return validate_same_company(value, self.context, 'Compliance rule')


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