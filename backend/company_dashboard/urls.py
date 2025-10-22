from django.urls import path, include
from . import views, email_views

urlpatterns = [
    # Dashboard Overview
    path('overview/', views.company_dashboard_overview, name='company_dashboard_overview'),
    
    # Service Analytics
    path('service-utilization/', views.service_utilization_stats, name='service_utilization_stats'),
    path('analytics/', views.analytics_dashboard, name='analytics_dashboard'),
    
    # User Activity Monitoring
    path('user-activities/', views.service_user_activities, name='service_user_activities'),
    path('activity-logs/', views.activity_logs, name='activity_logs'),
    path('log-activity/', views.log_activity, name='log_activity'),
    
    # Notifications
    path('notifications/', views.CompanyNotificationListView.as_view(), name='company_notifications'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    
    # Email Settings
    path('email-settings/', email_views.CompanyEmailSettingsView.as_view(), name='company_email_settings'),
    path('email-settings/test/', email_views.test_email_configuration, name='test_email_configuration'),
    path('email-settings/providers/', email_views.email_provider_templates, name='email_provider_templates'),
    path('email-settings/usage/', email_views.email_usage_stats, name='email_usage_stats'),
    
    # Domain Settings
    path('domain/', views.company_domain_settings, name='company_domain_settings'),
    
    # Security Settings
    path('security/', include('company_dashboard.security_urls')),
    
    # Advanced Security (Phase 4)
    path('advanced-security/', include('company_dashboard.advanced_security_urls')),
    
    # Government API Credentials Management (Phase 1)
    path('government-api/', include('company_dashboard.government_credentials_urls')),
]