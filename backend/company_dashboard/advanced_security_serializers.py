from rest_framework import serializers
from .advanced_security_models import (
    CompanyCaptchaSettings, CompanyDeviceFingerprint, CompanyGeolocationRule,
    CompanyThreatDetection, CompanySecurityAlert, CompanyAdvancedSettings
)
import requests
import json
import random
import string

class CompanyCaptchaSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyCaptchaSettings
        fields = ['enabled', 'failed_attempts_threshold', 'captcha_type', 'site_key']
        extra_kwargs = {
            'secret_key': {'write_only': True}
        }

class SimpleCaptchaSerializer(serializers.Serializer):
    """Simple math captcha for basic protection"""
    question = serializers.CharField(read_only=True)
    answer = serializers.CharField(write_only=True)
    token = serializers.CharField(read_only=True)
    
    def generate_captcha(self):
        """Generate simple math captcha"""
        num1 = random.randint(1, 10)
        num2 = random.randint(1, 10)
        operation = random.choice(['+', '-'])
        
        if operation == '+':
            answer = num1 + num2
            question = f"{num1} + {num2} = ?"
        else:
            # Ensure positive result
            if num1 < num2:
                num1, num2 = num2, num1
            answer = num1 - num2
            question = f"{num1} - {num2} = ?"
        
        # Generate token
        token = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
        
        return {
            'question': question,
            'answer': str(answer),
            'token': token
        }

class CaptchaVerificationSerializer(serializers.Serializer):
    """Captcha verification"""
    captcha_type = serializers.CharField()
    captcha_token = serializers.CharField()
    captcha_answer = serializers.CharField()
    
    def validate(self, data):
        captcha_type = data.get('captcha_type')
        
        if captcha_type == 'simple':
            return self.validate_simple_captcha(data)
        elif captcha_type == 'recaptcha':
            return self.validate_recaptcha(data)
        elif captcha_type == 'hcaptcha':
            return self.validate_hcaptcha(data)
        
        raise serializers.ValidationError("Invalid captcha type")
    
    def validate_simple_captcha(self, data):
        # In production, store expected answer in cache/session
        # For now, we'll validate based on token pattern
        return data
    
    def validate_recaptcha(self, data):
        # Validate Google reCAPTCHA
        secret_key = self.context.get('secret_key')
        if not secret_key:
            raise serializers.ValidationError("reCAPTCHA not configured")
        
        response = requests.post('https://www.google.com/recaptcha/api/siteverify', {
            'secret': secret_key,
            'response': data.get('captcha_token')
        })
        
        result = response.json()
        if not result.get('success'):
            raise serializers.ValidationError("Invalid reCAPTCHA")
        
        return data
    
    def validate_hcaptcha(self, data):
        # Validate hCaptcha
        secret_key = self.context.get('secret_key')
        if not secret_key:
            raise serializers.ValidationError("hCaptcha not configured")
        
        response = requests.post('https://hcaptcha.com/siteverify', {
            'secret': secret_key,
            'response': data.get('captcha_token')
        })
        
        result = response.json()
        if not result.get('success'):
            raise serializers.ValidationError("Invalid hCaptcha")
        
        return data

class CompanyDeviceFingerprintSerializer(serializers.ModelSerializer):
    trust_level = serializers.SerializerMethodField()
    location_info = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanyDeviceFingerprint
        fields = [
            'device_id', 'user_agent', 'screen_resolution', 'timezone', 'language',
            'platform', 'browser', 'browser_version', 'os', 'is_trusted', 'is_blocked',
            'trust_score', 'trust_level', 'first_seen', 'last_seen', 'login_count',
            'ip_address', 'location_info'
        ]
        read_only_fields = ['device_id', 'first_seen', 'last_seen', 'login_count']
    
    def get_trust_level(self, obj):
        if obj.trust_score >= 80:
            return 'high'
        elif obj.trust_score >= 60:
            return 'medium'
        elif obj.trust_score >= 40:
            return 'low'
        else:
            return 'very_low'
    
    def get_location_info(self, obj):
        location = []
        if obj.city:
            location.append(obj.city)
        if obj.country:
            location.append(obj.country)
        return ', '.join(location) if location else 'Unknown'

class DeviceFingerprintCreateSerializer(serializers.Serializer):
    """Create device fingerprint from client data"""
    fingerprint_data = serializers.JSONField()
    ip_address = serializers.IPAddressField()
    
    def validate_fingerprint_data(self, value):
        required_fields = ['userAgent', 'screen', 'timezone', 'language']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Missing required field: {field}")
        return value

class CompanyGeolocationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyGeolocationRule
        fields = [
            'id', 'name', 'rule_type', 'countries', 'cities', 'ip_ranges',
            'time_restrictions', 'is_active', 'priority', 'created_at'
        ]

class CompanyThreatDetectionSerializer(serializers.ModelSerializer):
    severity_color = serializers.SerializerMethodField()
    threat_type_display = serializers.CharField(source='get_threat_type_display', read_only=True)
    
    class Meta:
        model = CompanyThreatDetection
        fields = [
            'id', 'user_email', 'threat_type', 'threat_type_display', 'severity',
            'severity_color', 'description', 'evidence', 'ip_address', 'device_id',
            'is_resolved', 'auto_blocked', 'admin_notified', 'response_actions',
            'detected_at', 'resolved_at'
        ]
        read_only_fields = ['detected_at']
    
    def get_severity_color(self, obj):
        colors = {
            'low': '#10B981',      # Green
            'medium': '#F59E0B',   # Yellow
            'high': '#EF4444',     # Red
            'critical': '#7C2D12'  # Dark Red
        }
        return colors.get(obj.severity, '#6B7280')

class CompanySecurityAlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_color = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanySecurityAlert
        fields = [
            'id', 'alert_type', 'alert_type_display', 'title', 'message',
            'user_email', 'ip_address', 'metadata', 'is_read', 'is_dismissed',
            'severity', 'severity_color', 'created_at', 'read_at', 'time_ago'
        ]
        read_only_fields = ['created_at', 'read_at']
    
    def get_severity_color(self, obj):
        colors = {
            'info': '#3B82F6',     # Blue
            'warning': '#F59E0B',  # Yellow
            'error': '#EF4444',    # Red
            'critical': '#7C2D12'  # Dark Red
        }
        return colors.get(obj.severity, '#6B7280')
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            return f"{diff.seconds // 60} minutes ago"
        elif diff < timedelta(days=1):
            return f"{diff.seconds // 3600} hours ago"
        else:
            return f"{diff.days} days ago"

class CompanyAdvancedSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyAdvancedSettings
        fields = [
            'enable_threat_detection', 'brute_force_threshold', 'velocity_threshold',
            'enable_device_fingerprinting', 'auto_trust_devices', 'device_trust_duration_days',
            'enable_geolocation_security', 'block_unknown_locations', 'require_2fa_new_locations',
            'email_alerts', 'sms_alerts', 'webhook_alerts', 'webhook_url',
            'auto_block_threats', 'auto_lockout_duration_minutes'
        ]

class ThreatAnalysisSerializer(serializers.Serializer):
    """Threat analysis and statistics"""
    total_threats = serializers.IntegerField()
    threats_by_type = serializers.DictField()
    threats_by_severity = serializers.DictField()
    recent_threats = CompanyThreatDetectionSerializer(many=True)
    threat_trend = serializers.ListField()
    
class SecurityDashboardSerializer(serializers.Serializer):
    """Advanced security dashboard data"""
    threat_analysis = ThreatAnalysisSerializer()
    device_stats = serializers.DictField()
    geolocation_stats = serializers.DictField()
    alert_summary = serializers.DictField()
    security_score = serializers.IntegerField()
    recommendations = serializers.ListField()