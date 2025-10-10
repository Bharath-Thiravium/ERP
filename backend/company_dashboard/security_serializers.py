from rest_framework import serializers
from .security_models import (
    CompanySecuritySettings, CompanyRecoveryCode, CompanyApiKey,
    CompanyIpRestriction, CompanyUserSession, CompanySecurityLog,
    CompanyPasswordHistory, CompanyLoginAttempt
)
from authentication.models import CompanyUser
import pyotp
import qrcode
import io
import base64

class CompanySecuritySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySecuritySettings
        fields = [
            'two_factor_enabled', 'ip_restrictions_enabled', 'session_timeout_minutes',
            'max_failed_attempts', 'lockout_duration_minutes', 'password_expiry_days',
            'require_password_change', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class TwoFactorSetupSerializer(serializers.Serializer):
    def generate_qr_code(self, user):
        secret = pyotp.random_base32()
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name="Athena's SAP System"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            'secret': secret,
            'qr_code': f"data:image/png;base64,{qr_code_data}",
            'manual_entry_key': secret
        }

class TwoFactorVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6, min_length=6)
    secret = serializers.CharField(max_length=32)

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("Code must be 6 digits")
        return value

class CompanyRecoveryCodeSerializer(serializers.ModelSerializer):
    code = serializers.CharField(write_only=True)
    
    class Meta:
        model = CompanyRecoveryCode
        fields = ['id', 'code', 'is_used', 'used_at', 'created_at']
        read_only_fields = ['id', 'is_used', 'used_at', 'created_at']

class CompanyApiKeySerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)
    
    class Meta:
        model = CompanyApiKey
        fields = [
            'id', 'name', 'key', 'key_prefix', 'permissions', 'last_used',
            'usage_count', 'is_active', 'created_at', 'expires_at'
        ]
        read_only_fields = ['id', 'key', 'key_prefix', 'last_used', 'usage_count', 'created_at']

class CompanyApiKeyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyApiKey
        fields = ['name', 'permissions', 'expires_at']

class CompanyIpRestrictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyIpRestriction
        fields = [
            'id', 'ip_address', 'restriction_type', 'description',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class CompanyUserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyUserSession
        fields = [
            'id', 'session_key', 'device_type', 'browser', 'os',
            'ip_address', 'location', 'is_current', 'created_at',
            'last_activity', 'expires_at'
        ]
        read_only_fields = ['id', 'session_key', 'created_at', 'last_activity']

class CompanySecurityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySecurityLog
        fields = [
            'id', 'user_email', 'action', 'ip_address', 'user_agent',
            'success', 'details', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=12)
    confirm_password = serializers.CharField(write_only=True)
    force_logout_all = serializers.BooleanField(default=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New passwords do not match")
        
        # Password complexity validation
        password = data['new_password']
        if not any(c.isupper() for c in password):
            raise serializers.ValidationError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in password):
            raise serializers.ValidationError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in password):
            raise serializers.ValidationError("Password must contain at least one number")
        if not any(c in '!@#$%^&*(),.?":{}|<>' for c in password):
            raise serializers.ValidationError("Password must contain at least one special character")
        
        return data

class SecurityOverviewSerializer(serializers.Serializer):
    security_score = serializers.IntegerField()
    active_sessions = serializers.IntegerField()
    failed_attempts = serializers.IntegerField()
    days_until_expiry = serializers.IntegerField()
    two_factor_enabled = serializers.BooleanField()
    recovery_codes_generated = serializers.BooleanField()
    api_keys_count = serializers.IntegerField()
    ip_restrictions_enabled = serializers.BooleanField()
    recent_security_events = serializers.ListField(child=serializers.DictField())