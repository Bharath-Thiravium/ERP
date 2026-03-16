from django.db import models
from django.conf import settings

class ErrorPattern(models.Model):
    error_hash = models.CharField(max_length=64, unique=True, db_index=True)
    error_type = models.CharField(max_length=255)
    error_message = models.TextField()
    stack_trace = models.TextField(blank=True)
    file_path = models.CharField(max_length=500)
    line_number = models.IntegerField(null=True)
    occurrence_count = models.IntegerField(default=1)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'orchestrator_error_pattern'
        indexes = [models.Index(fields=['-last_seen'])]

class FixMethod(models.Model):
    STATUS_CHOICES = [
        ('attempted', 'Attempted'),
        ('working', 'Working'),
        ('failed', 'Failed'),
    ]
    
    error_pattern = models.ForeignKey(ErrorPattern, on_delete=models.CASCADE, related_name='fix_methods')
    method_description = models.TextField()
    code_changes = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='attempted')
    success_count = models.IntegerField(default=0)
    failure_count = models.IntegerField(default=0)
    confidence_score = models.FloatField(default=0.0)
    applied_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'orchestrator_fix_method'
        ordering = ['-confidence_score', '-success_count']

class WorkflowExecution(models.Model):
    workflow_id = models.CharField(max_length=100, db_index=True)
    workflow_name = models.CharField(max_length=255)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50)
    context_data = models.JSONField(default=dict)
    errors_encountered = models.ManyToManyField(ErrorPattern, through='WorkflowError')
    
    class Meta:
        db_table = 'orchestrator_workflow_execution'

class WorkflowError(models.Model):
    workflow = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE)
    error_pattern = models.ForeignKey(ErrorPattern, on_delete=models.CASCADE)
    fix_applied = models.ForeignKey(FixMethod, on_delete=models.SET_NULL, null=True, blank=True)
    resolved = models.BooleanField(default=False)
    occurred_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'orchestrator_workflow_error'

class AmazonQHistory(models.Model):
    session_id = models.CharField(max_length=100, db_index=True)
    query = models.TextField()
    response = models.TextField()
    context = models.JSONField(default=dict)
    error_related = models.ForeignKey(ErrorPattern, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'orchestrator_amazonq_history'
        ordering = ['-timestamp']
