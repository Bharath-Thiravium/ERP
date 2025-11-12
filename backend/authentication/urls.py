from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import master_admin_settings
from . import services_management
from . import enhanced_security_views
from .service_views import ActiveServicesView
from .email_settings_views import (
    master_admin_email_settings_view,
    test_master_admin_email_view,
    email_provider_templates_view,
    email_usage_stats_view
)

# Create router for ViewSets
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),

    # Master Admin endpoints
    path('master-admin/login/', views.MasterAdminLoginView.as_view(), name='master_admin_login'),
    path('master-admin/change-password/', views.MasterAdminPasswordChangeView.as_view(), name='master_admin_password_change'),
    path('master-admin/profile/', views.MasterAdminProfileView.as_view(), name='master_admin_profile'),
    
    # Ultra-Secure Master Admin Settings Dashboard
    path('master-admin/settings/', master_admin_settings.MasterAdminSettingsView.as_view(), name='master_admin_settings'),
    path('master-admin/settings/password/', master_admin_settings.MasterAdminPasswordChangeView.as_view(), name='master_admin_ultra_password_change'),
    path('master-admin/settings/api-key/', master_admin_settings.MasterAdminAPIKeyManagementView.as_view(), name='master_admin_api_key'),
    path('master-admin/settings/recovery-codes/', master_admin_settings.MasterAdminRecoveryCodesView.as_view(), name='master_admin_recovery_codes'),
    path('master-admin/settings/two-factor/', master_admin_settings.MasterAdminTwoFactorView.as_view(), name='master_admin_two_factor'),
    path('master-admin/settings/security-log/', master_admin_settings.MasterAdminSecurityLogView.as_view(), name='master_admin_security_log'),
    path('master-admin/settings/security-status/', master_admin_settings.MasterAdminSecurityStatusView.as_view(), name='master_admin_security_status'),
    
    # Phase 3: Enhanced Security
    path('master-admin/security-settings/', enhanced_security_views.security_settings_view, name='enhanced_security_settings'),
    path('master-admin/ip-restrictions/', enhanced_security_views.ip_restrictions_view, name='ip_restrictions'),
    path('master-admin/ip-restrictions/<int:pk>/', enhanced_security_views.ip_restriction_detail_view, name='ip_restriction_detail'),
    path('master-admin/device-fingerprints/', enhanced_security_views.device_fingerprints_view, name='device_fingerprints'),
    path('master-admin/device-fingerprints/<uuid:device_id>/', enhanced_security_views.device_fingerprint_detail_view, name='device_fingerprint_detail'),
    path('master-admin/login-notifications/', enhanced_security_views.login_notifications_view, name='login_notifications'),
    path('master-admin/login-notifications/test/', enhanced_security_views.test_login_notification_view, name='test_login_notification'),
    path('master-admin/notification-email/', enhanced_security_views.notification_email_view, name='notification_email'),
    
    # Master Admin Email Settings
    path('master-admin/email-settings/', master_admin_email_settings_view, name='master_admin_email_settings'),
    path('master-admin/email-settings/test/', test_master_admin_email_view, name='test_master_admin_email'),
    path('master-admin/email-settings/providers/', email_provider_templates_view, name='email_provider_templates'),
    path('master-admin/email-settings/usage/', email_usage_stats_view, name='email_usage_stats'),

    # Company User endpoints
    path('company/login/', views.CompanyUserLoginView.as_view(), name='company_user_login'),
    path('company/update-logo/', views.CompanyLogoUpdateView.as_view(), name='company_logo_update'),

    # Service User endpoints
    path('service-user/login/', views.ServiceUserLoginView.as_view(), name='service_user_login'),
    path('service-user/logout/', views.ServiceUserLogoutView.as_view(), name='service_user_logout'),
    path('service-user/change-password/', views.ServiceUserPasswordChangeView.as_view(), name='service_user_password_change'),
    path('service-user/company/<int:company_id>/', views.ServiceUserCompanyView.as_view(), name='service_user_company'),
    path('company-profile/', views.CompanyProfileView.as_view(), name='company_profile'),

    # Company Service Users (for company admins)
    path('company/service-users/', views.CompanyServiceUserListCreateView.as_view(), name='company_service_users'),
    path('company/service-users/<int:pk>/', views.CompanyServiceUserDetailView.as_view(), name='company_service_user_detail'),

    # Services
    path('services/', views.ServiceListView.as_view(), name='service_list'),
    path('services/active/', ActiveServicesView.as_view(), name='active_services'),
    
    # Services Management (Master Admin)
    path('master-admin/services/', services_management.get_all_services, name='master_admin_services'),
    path('master-admin/services/create/', services_management.create_service, name='master_admin_create_service'),
    path('master-admin/services/<int:service_id>/update/', services_management.update_service, name='master_admin_update_service'),
    path('master-admin/services/<int:service_id>/delete/', services_management.delete_service, name='master_admin_delete_service'),
    path('master-admin/services/<int:service_id>/toggle/', services_management.toggle_service_status, name='master_admin_toggle_service'),

    # Companies (Master Admin)
    path('companies/', views.CompanyListCreateView.as_view(), name='company_list_create'),
    path('companies/<int:pk>/', views.CompanyDetailView.as_view(), name='company_detail'),
    path('companies/<int:company_id>/detailed-info/', views.CompanyDetailedInfoView.as_view(), name='company_detailed_info'),
    path('companies/<int:company_id>/approve/', views.CompanyApprovalView.as_view(), name='company_approval'),
    path('companies/<int:company_id>/service-credentials/', views.CompanyServiceCredentialsView.as_view(), name='company_service_credentials'),
    path('companies/<int:company_id>/reset-password/', views.CompanyPasswordResetView.as_view(), name='company_password_reset'),

    # Company Services
    path('company/services/', views.CompanyServicesView.as_view(), name='company_services'),
    path('company/assigned-services/', views.CompanyAssignedServicesView.as_view(), name='company_assigned_services'),
    path('company/request-services/', views.RequestServiceAccessView.as_view(), name='request_service_access'),
    path('services/<int:service_id>/access/', views.ServiceAccessView.as_view(), name='service_access'),
    path('services/<int:service_id>/change-password/', views.ServicePasswordChangeView.as_view(), name='service_password_change'),

    # Security
    path('security-logs/', views.SecurityLogView.as_view(), name='security_logs'),

    # Token validation
    path('validate-token/', views.ValidateTokenView.as_view(), name='validate_token'),
    
    # Mobile app logout
    path('logout/', views.mobile_logout, name='mobile_logout'),
    
    # Auto-code generation (testing)
    path('generate-auto-code/', views.GenerateAutoCodeView.as_view(), name='generate_auto_code'),
]
