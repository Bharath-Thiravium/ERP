from django.contrib import admin
from .models import (
    AthensTenantLink, AthensSubscription, AthensAuditLog, 
    AthensPlatformSettings, AthensModuleSubscription
)


@admin.register(AthensTenantLink)
class AthensTenantLinkAdmin(admin.ModelAdmin):
    list_display = ['company', 'is_active', 'synced_at', 'created_at']
    list_filter = ['is_active', 'created_at', 'synced_at']
    search_fields = ['company__name', 'company__email']
    readonly_fields = ['created_at', 'updated_at', 'synced_at']
    filter_horizontal = []

    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing an existing object
            return self.readonly_fields + ['company']
        return self.readonly_fields


@admin.register(AthensSubscription)
class AthensSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['company', 'plan', 'status', 'seats', 'start_date', 'end_date']
    list_filter = ['plan', 'status', 'created_at']
    search_fields = ['company__name', 'company__email']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'start_date'


@admin.register(AthensAuditLog)
class AthensAuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'entity_type', 'entity_id', 'actor', 'created_at']
    list_filter = ['action', 'entity_type', 'created_at']
    search_fields = ['entity_id', 'actor__email']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False  # Audit logs should not be manually created

    def has_change_permission(self, request, obj=None):
        return False  # Audit logs should not be modified

    def has_delete_permission(self, request, obj=None):
        return False  # Audit logs should not be deleted


@admin.register(AthensPlatformSettings)
class AthensPlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ['platform_name', 'platform_url', 'support_email', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']

    def has_add_permission(self, request):
        # Only allow one settings instance
        return not AthensPlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False  # Don't allow deletion of settings


@admin.register(AthensModuleSubscription)
class AthensModuleSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['company', 'module_code', 'enabled', 'plan_tier', 'created_at']
    list_filter = ['enabled', 'plan_tier', 'module_code', 'created_at']
    search_fields = ['company__name', 'module_code']
    readonly_fields = ['created_at', 'updated_at']