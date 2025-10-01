from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from authentication.models import Company


class SystemConfiguration(models.Model):
    """System-wide configuration settings"""
    key = models.CharField(max_length=255, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, default='general')
    is_encrypted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'system_configuration'
        ordering = ['category', 'key']

    def __str__(self):
        return f"{self.category}.{self.key}"


class DatabaseBackup(models.Model):
    """Enhanced multi-tenant database backup system"""
    
    BACKUP_LEVEL_CHOICES = [
        ('system', 'Complete System'),
        ('company', 'Company Data'),
        ('service', 'Service Data'),
        ('table', 'Specific Tables'),
        ('incremental', 'Incremental Changes'),
    ]
    
    BACKUP_TYPE_CHOICES = [
        ('full', 'Full Backup'),
        ('schema', 'Schema Only'),
        ('data', 'Data Only'),
        ('selective', 'Selective Tables'),
    ]
    
    SERVICE_TYPE_CHOICES = [
        ('all', 'All Services'),
        ('finance', 'Finance Service'),
        ('hr', 'HR Service'),
        ('inventory', 'Inventory Service'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    COMPRESSION_CHOICES = [
        ('none', 'No Compression'),
        ('gzip', 'Gzip Compression'),
        ('bzip2', 'Bzip2 Compression'),
    ]
    
    # Basic backup info
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    backup_level = models.CharField(max_length=20, choices=BACKUP_LEVEL_CHOICES, default='system')
    backup_type = models.CharField(max_length=20, choices=BACKUP_TYPE_CHOICES, default='full')
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES, default='all')
    
    # Multi-tenant support
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    selected_tables = models.JSONField(default=list, blank=True)
    
    # Status and processing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    compression = models.CharField(max_length=20, choices=COMPRESSION_CHOICES, default='gzip')
    is_encrypted = models.BooleanField(default=True)
    
    # File information
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    checksum = models.CharField(max_length=64, blank=True)
    encryption_key = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    # Error handling
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Metadata
    backup_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'database_backups'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'backup_level']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['backup_level', 'service_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.backup_level} - {self.status})"

    @property
    def duration(self):
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None

    @property
    def file_size_mb(self):
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return 0
    
    @property
    def scope_display(self):
        """Human readable backup scope"""
        if self.backup_level == 'company' and self.company:
            return f"Company: {self.company.name}"
        elif self.backup_level == 'service':
            return f"Service: {self.get_service_type_display()}"
        elif self.backup_level == 'table' and self.selected_tables:
            return f"Tables: {', '.join(self.selected_tables[:3])}{'...' if len(self.selected_tables) > 3 else ''}"
        return self.get_backup_level_display()


class BackupUpload(models.Model):
    """Track uploaded backup files"""
    
    STATUS_CHOICES = [
        ('uploading', 'Uploading'),
        ('validating', 'Validating'),
        ('ready', 'Ready for Restore'),
        ('failed', 'Validation Failed'),
    ]
    
    name = models.CharField(max_length=200)
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    checksum = models.CharField(max_length=64)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploading')
    
    # Validation results
    is_valid_backup = models.BooleanField(default=False)
    backup_metadata = models.JSONField(default=dict, blank=True)
    validation_errors = models.JSONField(default=list, blank=True)
    
    # Multi-tenant info
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    detected_backup_level = models.CharField(max_length=20, blank=True)
    detected_service_type = models.CharField(max_length=20, blank=True)
    
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'backup_uploads'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.name} - {self.status}"


class RestoreOperation(models.Model):
    """Track restore operations with rollback capability"""
    
    RESTORE_TYPE_CHOICES = [
        ('full_replace', 'Full Replace'),
        ('selective_merge', 'Selective Merge'),
        ('company_only', 'Company Data Only'),
        ('service_only', 'Service Data Only'),
        ('table_only', 'Specific Tables'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('pre_backup', 'Creating Pre-Restore Backup'),
        ('restoring', 'Restoring Data'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('rolled_back', 'Rolled Back'),
    ]
    
    name = models.CharField(max_length=200)
    restore_type = models.CharField(max_length=20, choices=RESTORE_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Source backup
    source_backup = models.ForeignKey(DatabaseBackup, on_delete=models.CASCADE, null=True, blank=True)
    source_upload = models.ForeignKey(BackupUpload, on_delete=models.CASCADE, null=True, blank=True)
    
    # Pre-restore backup for rollback
    pre_restore_backup = models.ForeignKey(
        DatabaseBackup, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='restore_operations'
    )
    
    # Restore scope
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    selected_tables = models.JSONField(default=list, blank=True)
    service_type = models.CharField(max_length=20, blank=True)
    
    # Progress tracking
    total_steps = models.IntegerField(default=0)
    completed_steps = models.IntegerField(default=0)
    current_step = models.CharField(max_length=200, blank=True)
    
    # Timestamps
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Results
    error_message = models.TextField(blank=True)
    restore_log = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'restore_operations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.status}"
    
    @property
    def progress_percentage(self):
        if self.total_steps > 0:
            return round((self.completed_steps / self.total_steps) * 100, 1)
        return 0


class BackupSchedule(models.Model):
    """Automated backup schedules"""
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    name = models.CharField(max_length=255)
    backup_type = models.CharField(max_length=20, choices=DatabaseBackup.BACKUP_TYPE_CHOICES, default='full')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    time = models.TimeField()
    day_of_week = models.IntegerField(null=True, blank=True)
    day_of_month = models.IntegerField(null=True, blank=True)
    retention_days = models.IntegerField(default=30)
    is_active = models.BooleanField(default=True)
    last_run = models.DateTimeField(null=True, blank=True)
    next_run = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'backup_schedules'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.frequency})"


class SystemMaintenance(models.Model):
    """System maintenance records"""
    MAINTENANCE_TYPES = [
        ('database', 'Database Maintenance'),
        ('cleanup', 'File Cleanup'),
        ('optimization', 'Performance Optimization'),
        ('security', 'Security Update'),
        ('backup', 'Backup Maintenance'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=255)
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPES)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    scheduled_at = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    result_message = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'system_maintenance'
        ordering = ['-scheduled_at']

    def __str__(self):
        return f"{self.title} - {self.status}"