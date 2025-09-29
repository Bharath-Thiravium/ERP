from rest_framework import serializers
from .models import SystemConfiguration, DatabaseBackup, BackupSchedule, SystemMaintenance


class SystemConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = ['id', 'key', 'value', 'description', 'category', 'is_encrypted', 
                 'created_at', 'updated_at', 'updated_by']
        read_only_fields = ['id', 'created_at', 'updated_at', 'updated_by']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Don't expose encrypted values in API responses
        if instance.is_encrypted:
            data['value'] = '***ENCRYPTED***'
        return data


class DatabaseBackupSerializer(serializers.ModelSerializer):
    file_size_mb = serializers.ReadOnlyField()
    duration = serializers.ReadOnlyField()

    class Meta:
        model = DatabaseBackup
        fields = ['id', 'name', 'backup_type', 'status', 'file_path', 'file_size', 
                 'file_size_mb', 'compression', 'description', 'error_message',
                 'started_at', 'completed_at', 'duration', 'created_by', 'created_at']
        read_only_fields = ['id', 'status', 'file_path', 'file_size', 'error_message',
                           'started_at', 'completed_at', 'created_by', 'created_at']


class BackupScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupSchedule
        fields = ['id', 'name', 'backup_type', 'frequency', 'time', 'day_of_week',
                 'day_of_month', 'retention_days', 'is_active', 'last_run', 'next_run',
                 'created_at', 'created_by']
        read_only_fields = ['id', 'last_run', 'next_run', 'created_at', 'created_by']


class SystemMaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemMaintenance
        fields = ['id', 'title', 'maintenance_type', 'description', 'status',
                 'scheduled_at', 'started_at', 'completed_at', 'result_message',
                 'created_by', 'created_at']
        read_only_fields = ['id', 'status', 'started_at', 'completed_at', 
                           'result_message', 'created_by', 'created_at']