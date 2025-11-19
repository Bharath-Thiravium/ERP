from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

class SystemMetrics(models.Model):
    """System performance metrics"""
    timestamp = models.DateTimeField(auto_now_add=True)
    cpu_usage = models.FloatField()  # Percentage
    memory_usage = models.FloatField()  # Percentage
    disk_usage = models.FloatField()  # Percentage
    active_users = models.IntegerField(default=0)
    api_requests_per_minute = models.IntegerField(default=0)
    database_connections = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
        ]

class ServiceHealth(models.Model):
    """Service health monitoring"""
    SERVICE_CHOICES = [
        ('finance', 'Finance'),
        ('hr', 'HR'),
        ('inventory', 'Inventory'),
        ('authentication', 'Authentication'),
        ('database', 'Database'),
    ]
    
    STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
        ('down', 'Down'),
    ]
    
    service_name = models.CharField(max_length=20, choices=SERVICE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    response_time = models.FloatField()  # milliseconds
    last_check = models.DateTimeField(auto_now=True)
    error_message = models.TextField(blank=True)
    uptime_percentage = models.FloatField(default=100.0)
    
    class Meta:
        unique_together = ['service_name']
        ordering = ['service_name']

class APIMetrics(models.Model):
    """API endpoint performance metrics"""
    endpoint = models.CharField(max_length=200)
    method = models.CharField(max_length=10)
    response_time = models.FloatField()  # milliseconds
    status_code = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['endpoint', 'timestamp']),
            models.Index(fields=['status_code']),
        ]

class SystemAlert(models.Model):
    """System alerts and notifications"""
    ALERT_TYPES = [
        ('performance', 'Performance'),
        ('security', 'Security'),
        ('service_down', 'Service Down'),
        ('high_usage', 'High Usage'),
        ('error_rate', 'High Error Rate'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']