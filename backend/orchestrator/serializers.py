from rest_framework import serializers
from .models import ErrorPattern, FixMethod, WorkflowExecution, AmazonQHistory

class FixMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = FixMethod
        fields = ['id', 'method_description', 'status', 'success_count', 'failure_count', 
                  'confidence_score', 'created_at', 'updated_at']

class ErrorPatternSerializer(serializers.ModelSerializer):
    fix_methods = FixMethodSerializer(many=True, read_only=True)
    
    class Meta:
        model = ErrorPattern
        fields = ['error_hash', 'error_type', 'error_message', 'file_path', 'line_number',
                  'occurrence_count', 'first_seen', 'last_seen', 'fix_methods']

class WorkflowExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowExecution
        fields = ['workflow_id', 'workflow_name', 'started_at', 'completed_at', 'status']

class AmazonQHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AmazonQHistory
        fields = ['session_id', 'query', 'response', 'timestamp']
