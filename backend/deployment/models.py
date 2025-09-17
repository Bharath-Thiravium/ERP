from django.db import models
from django.contrib.auth.models import User

class DeploymentLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('rollback', 'Rollback'),
    ]
    
    webhook_id = models.CharField(max_length=100, unique=True)
    repository = models.CharField(max_length=200)
    branch = models.CharField(max_length=100)
    commit_hash = models.CharField(max_length=40)
    commit_message = models.TextField()
    author = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    logs = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    rollback_commit = models.CharField(max_length=40, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        
    def __str__(self):
        return f"{self.repository} - {self.commit_hash[:8]} - {self.status}"