from django.urls import path, include
from . import advanced_security_views
from .enhanced_threat_views import EnhancedThreatDetectionView, ThreatAnalyticsView, simulate_threat
from .device_management_views import DeviceManagementView, create_sample_devices
from .cleanup_views import clear_sample_data
from .test_threat_views import test_threat_detection

urlpatterns = [
    # Captcha endpoints
    path('captcha/', advanced_security_views.CaptchaView.as_view(), name='captcha'),
    
    # Device fingerprinting
    path('device-fingerprinting/', advanced_security_views.DeviceFingerprintingView.as_view(), name='device_fingerprinting'),
    
    # Geolocation security
    path('geolocation-rules/', advanced_security_views.GeolocationSecurityView.as_view(), name='geolocation_rules'),
    path('geolocation-rules/<int:rule_id>/', advanced_security_views.GeolocationSecurityView.as_view(), name='geolocation_rule_detail'),
    
    # New Geolocation endpoints
    path('geolocation/', include('company_dashboard.geolocation_urls')),
    
    # Threat detection
    path('threat-detection/', advanced_security_views.ThreatDetectionView.as_view(), name='threat_detection'),
    
    # Enhanced AI Threat Detection
    path('enhanced-threats/', EnhancedThreatDetectionView.as_view(), name='enhanced_threats'),
    path('enhanced-threats/<int:threat_id>/', EnhancedThreatDetectionView.as_view(), name='enhanced_threat_detail'),
    path('threat-analytics/', ThreatAnalyticsView.as_view(), name='threat_analytics'),
    path('simulate-threat/', simulate_threat, name='simulate_threat'),
    
    # Device Management
    path('device-management/', DeviceManagementView.as_view(), name='device_management'),
    path('device-management/<str:device_id>/', DeviceManagementView.as_view(), name='device_management_detail'),
    path('create-sample-devices/', create_sample_devices, name='create_sample_devices'),
    path('clear-sample-data/', clear_sample_data, name='clear_sample_data'),
    path('test-threat-detection/', test_threat_detection, name='test_threat_detection'),
    
    # Security alerts
    path('security-alerts/', advanced_security_views.SecurityAlertsView.as_view(), name='security_alerts'),
    path('security-alerts/<int:alert_id>/', advanced_security_views.SecurityAlertsView.as_view(), name='security_alert_detail'),
    
    # Advanced settings
    path('advanced-settings/', advanced_security_views.AdvancedSecuritySettingsView.as_view(), name='advanced_settings'),
    
    # Advanced dashboard
    path('advanced-dashboard/', advanced_security_views.AdvancedSecurityDashboardView.as_view(), name='advanced_dashboard'),
]