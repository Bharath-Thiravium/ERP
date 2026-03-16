from django.contrib import admin
from .models import ErrorPattern, FixMethod, WorkflowExecution, AmazonQHistory

@admin.register(ErrorPattern)
class ErrorPatternAdmin(admin.ModelAdmin):
    list_display = ['error_type', 'file_path', 'occurrence_count', 'last_seen']
    search_fields = ['error_type', 'error_message', 'file_path']
    list_filter = ['error_type', 'last_seen']

@admin.register(FixMethod)
class FixMethodAdmin(admin.ModelAdmin):
    list_display = ['error_pattern', 'status', 'confidence_score', 'success_count', 'failure_count']
    list_filter = ['status']

@admin.register(WorkflowExecution)
class WorkflowExecutionAdmin(admin.ModelAdmin):
    list_display = ['workflow_name', 'status', 'started_at', 'completed_at']
    list_filter = ['status']

@admin.register(AmazonQHistory)
class AmazonQHistoryAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'timestamp', 'error_related']
    search_fields = ['query', 'response']
