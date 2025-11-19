from django.urls import path
from .security_views import (
    SecurityOverviewView, TwoFactorSetupView, RecoveryCodesView,
    ApiKeysView, SessionsView, SecurityLogsView,
    PasswordChangeView
)
from .ip_restriction_views import (
    CompanyIpRestrictionView, CompanyIpRestrictionDetailView, CompanyIpRestrictionToggleView
)
from . import two_factor_views

urlpatterns = [
    # Security Overview
    path('overview/', SecurityOverviewView.as_view(), name='security-overview'),
    
    # Two-Factor Authentication
    path('2fa/', TwoFactorSetupView.as_view(), name='2fa-setup'),
    path('2fa/setup/', two_factor_views.setup_2fa_view, name='2fa-setup-new'),
    path('2fa/verify/', two_factor_views.verify_2fa_setup_view, name='2fa-verify'),
    path('2fa/disable/', two_factor_views.disable_2fa_view, name='2fa-disable'),
    path('2fa/status/', two_factor_views.get_2fa_status_view, name='2fa-status'),
    
    # Recovery Codes
    path('recovery-codes/', RecoveryCodesView.as_view(), name='recovery-codes'),
    
    # API Keys
    path('api-keys/', ApiKeysView.as_view(), name='api-keys'),
    path('api-keys/<int:key_id>/', ApiKeysView.as_view(), name='api-key-delete'),
    
    # IP Restrictions
    path('ip-restrictions/', CompanyIpRestrictionView.as_view(), name='ip-restrictions'),
    path('ip-restrictions/<int:restriction_id>/', CompanyIpRestrictionDetailView.as_view(), name='ip-restriction-delete'),
    path('ip-restrictions/toggle/', CompanyIpRestrictionToggleView.as_view(), name='ip-restrictions-toggle'),
    
    # Sessions
    path('sessions/', SessionsView.as_view(), name='sessions'),
    path('sessions/<int:session_id>/', SessionsView.as_view(), name='session-terminate'),
    path('sessions/terminate-all/', SessionsView.as_view(), name='sessions-terminate-all'),
    
    # Security Logs
    path('audit-logs/', SecurityLogsView.as_view(), name='security-logs'),
    
    # Password Change
    path('password-change/', PasswordChangeView.as_view(), name='password-change'),
]