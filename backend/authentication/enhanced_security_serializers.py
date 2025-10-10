from rest_framework import serializers
from .enhanced_security_models import IPRestriction, DeviceFingerprint, LoginNotification, SecuritySettings

class IPRestrictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IPRestriction
        fields = ['id', 'ip_address', 'description', 'is_active', 'created_at', 'last_used']
        read_only_fields = ['id', 'created_at', 'last_used']

class DeviceFingerprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceFingerprint
        fields = ['id', 'device_name', 'browser', 'os', 'ip_address', 'location', 
                 'is_trusted', 'first_seen', 'last_seen']
        read_only_fields = ['id', 'first_seen', 'last_seen']

class LoginNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginNotification
        fields = ['id', 'email_sent', 'ip_address', 'location', 'device_info', 'timestamp']
        read_only_fields = ['id', 'timestamp']

class SecuritySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecuritySettings
        fields = ['ip_restrictions_enabled', 'device_fingerprinting_enabled', 
                 'login_notifications_enabled', 'captcha_after_failed_attempts',
                 'max_failed_attempts', 'lockout_duration_minutes', 'updated_at']
        read_only_fields = ['updated_at']