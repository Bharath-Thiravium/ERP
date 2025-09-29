from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


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
    """Database backup records"""
    BACKUP_TYPES = [
        ('full', 'Full Backup'),
        ('incremental', 'Incremental Backup'),
        ('schema', 'Schema Only'),
        ('data', 'Data Only'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    name = models.CharField(max_length=255)
    backup_type = models.CharField(max_length=20, choices=BACKUP_TYPES, default='full')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)  # Size in bytes
    compression = models.CharField(max_length=20, default='gzip')
    description = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'database_backups'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.backup_type}) - {self.status}"

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


class BackupSchedule(models.Model):
    """Automated backup schedules"""
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    name = models.CharField(max_length=255)
    backup_type = models.CharField(max_length=20, choices=DatabaseBackup.BACKUP_TYPES, default='full')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    time = models.TimeField()  # Time of day to run
    day_of_week = models.IntegerField(null=True, blank=True)  # 0=Monday, 6=Sunday (for weekly)
    day_of_month = models.IntegerField(null=True, blank=True)  # 1-31 (for monthly)
    retention_days = models.IntegerField(default=30)  # How long to keep backups
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