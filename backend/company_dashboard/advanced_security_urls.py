from django.urls import path
from . import advanced_security_views

urlpatterns = [
    # Captcha endpoints
    path('captcha/', advanced_security_views.CaptchaView.as_view(), name='captcha'),
    
    # Device fingerprinting
    path('device-fingerprinting/', advanced_security_views.DeviceFingerprintingView.as_view(), name='device_fingerprinting'),
    
    # Geolocation security
    path('geolocation-rules/', advanced_security_views.GeolocationSecurityView.as_view(), name='geolocation_rules'),
    path('geolocation-rules/<int:rule_id>/', advanced_security_views.GeolocationSecurityView.as_view(), name='geolocation_rule_detail'),
    
    # Threat detection
    path('threat-detection/', advanced_security_views.ThreatDetectionView.as_view(), name='threat_detection'),
    
    # Security alerts
    path('security-alerts/', advanced_security_views.SecurityAlertsView.as_view(), name='security_alerts'),
    path('security-alerts/<int:alert_id>/', advanced_security_views.SecurityAlertsView.as_view(), name='security_alert_detail'),
    
    # Advanced settings
    path('advanced-settings/', advanced_security_views.AdvancedSecuritySettingsView.as_view(), name='advanced_settings'),
    
    # Advanced dashboard
    path('advanced-dashboard/', advanced_security_views.AdvancedSecurityDashboardView.as_view(), name='advanced_dashboard'),
]