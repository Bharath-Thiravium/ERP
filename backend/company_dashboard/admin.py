from django.contrib import admin
from .models import (
    ServiceUtilization, CompanyAnalytics, ServiceUserActivity,
    CompanyNotification, ServiceConfiguration, ActivityLog
)

@admin.register(ServiceUtilization)
class ServiceUtilizationAdmin(admin.ModelAdmin):
    list_display = ['company', 'service', 'total_users', 'active_users', 'usage_percentage', 'last_activity']
    list_filter = ['service__service_type', 'company', 'last_activity']
    search_fields = ['company__name', 'service__name']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(CompanyAnalytics)
class CompanyAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['company', 'total_data_entries', 'monthly_growth', 'system_health', 'last_calculated']
    list_filter = ['system_health', 'last_calculated']
    search_fields = ['company__name']
    readonly_fields = ['last_calculated']

@admin.register(ServiceUserActivity)
class ServiceUserActivityAdmin(admin.ModelAdmin):
    list_display = ['service_user', 'service_type', 'status', 'total_sessions', 'last_login']
    list_filter = ['service_type', 'status', 'last_login']
    search_fields = ['service_user__username', 'service_user__full_name']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(CompanyNotification)
class CompanyNotificationAdmin(admin.ModelAdmin):
    list_display = ['company', 'title', 'type', 'priority', 'read', 'created_at']
    list_filter = ['type', 'priority', 'read', 'created_at']
    search_fields = ['company__name', 'title', 'message']
    readonly_fields = ['created_at', 'read_at']

@admin.register(ServiceConfiguration)
class ServiceConfigurationAdmin(admin.ModelAdmin):
    list_display = ['company', 'service', 'data_retention_days', 'backup_enabled', 'updated_at']
    list_filter = ['service__service_type', 'backup_enabled', 'auto_archive']
    search_fields = ['company__name', 'service__name']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['company', 'user', 'action_type', 'service_type', 'timestamp']
    list_filter = ['action_type', 'service_type', 'timestamp']
    search_fields = ['company__name', 'user__email', 'description']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'