from rest_framework import serializers
from .models import SystemConfiguration, DatabaseBackup, BackupUpload, RestoreOperation, BackupSchedule, SystemMaintenance


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
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = DatabaseBackup
        fields = ['id', 'name', 'backup_type', 'backup_level', 'service_type', 'status', 
                 'file_path', 'file_size', 'file_size_mb', 'compression', 'description', 
                 'error_message', 'company', 'company_name', 'selected_tables', 'checksum',
                 'is_encrypted', 'backup_metadata', 'retry_count', 'started_at', 
                 'completed_at', 'duration', 'created_by', 'created_at']
        read_only_fields = ['id', 'status', 'file_path', 'file_size', 'error_message',
                           'checksum', 'started_at', 'completed_at', 'created_by', 'created_at']


class BackupScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupSchedule
        fields = ['id', 'name', 'backup_type', 'frequency', 'time', 'day_of_week',
                 'day_of_month', 'retention_days', 'is_active', 'last_run', 'next_run',
                 'created_at', 'created_by']
        read_only_fields = ['id', 'last_run', 'next_run', 'created_at', 'created_by']


class BackupUploadSerializer(serializers.ModelSerializer):
    file_size_mb = serializers.ReadOnlyField()
    company_name = serializers.CharField(source='company.name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = BackupUpload
        fields = ['id', 'name', 'original_filename', 'file_path', 'file_size', 
                 'file_size_mb', 'checksum', 'status', 'validation_result', 
                 'company', 'company_name', 'uploaded_by', 'uploaded_by_name', 
                 'uploaded_at']
        read_only_fields = ['id', 'file_path', 'file_size', 'checksum', 'status',
                           'validation_result', 'uploaded_by', 'uploaded_at']


class RestoreOperationSerializer(serializers.ModelSerializer):
    source_backup_name = serializers.CharField(source='source_backup.name', read_only=True)
    source_upload_name = serializers.CharField(source='source_upload.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = RestoreOperation
        fields = ['id', 'name', 'restore_type', 'status', 'source_backup', 
                 'source_backup_name', 'source_upload', 'source_upload_name',
                 'pre_restore_backup', 'company', 'company_name', 'service_type',
                 'selected_tables', 'progress_percentage', 'error_message',
                 'started_at', 'completed_at', 'created_by', 'created_by_name', 
                 'created_at']
        read_only_fields = ['id', 'status', 'pre_restore_backup', 'progress_percentage',
                           'error_message', 'started_at', 'completed_at', 'created_by', 
                           'created_at']


class SystemMaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemMaintenance
        fields = ['id', 'title', 'maintenance_type', 'description', 'status',
                 'scheduled_at', 'started_at', 'completed_at', 'result_message',
                 'created_by', 'created_at']
        read_only_fields = ['id', 'status', 'started_at', 'completed_at', 
                           'result_message', 'created_by', 'created_at']