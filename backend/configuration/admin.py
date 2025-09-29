from django.contrib import admin
from .models import SystemConfiguration, DatabaseBackup, BackupSchedule, SystemMaintenance


@admin.register(SystemConfiguration)
class SystemConfigurationAdmin(admin.ModelAdmin):
    list_display = ['key', 'category', 'is_encrypted', 'updated_at', 'updated_by']
    list_filter = ['category', 'is_encrypted', 'created_at']
    search_fields = ['key', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DatabaseBackup)
class DatabaseBackupAdmin(admin.ModelAdmin):
    list_display = ['name', 'backup_type', 'status', 'file_size_mb', 'created_at', 'created_by']
    list_filter = ['backup_type', 'status', 'compression', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['status', 'file_path', 'file_size', 'started_at', 'completed_at', 'created_at']


@admin.register(BackupSchedule)
class BackupScheduleAdmin(admin.ModelAdmin):
    list_display = ['name', 'backup_type', 'frequency', 'is_active', 'last_run', 'next_run']
    list_filter = ['backup_type', 'frequency', 'is_active']
    search_fields = ['name']
    readonly_fields = ['last_run', 'next_run', 'created_at']


@admin.register(SystemMaintenance)
class SystemMaintenanceAdmin(admin.ModelAdmin):
    list_display = ['title', 'maintenance_type', 'status', 'scheduled_at', 'created_by']
    list_filter = ['maintenance_type', 'status', 'scheduled_at']
    search_fields = ['title', 'description']
    readonly_fields = ['started_at', 'completed_at', 'created_at']