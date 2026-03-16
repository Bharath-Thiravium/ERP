import hashlib
import json
import traceback
from datetime import datetime
from typing import Dict, List, Optional
from django.utils import timezone
from .models import ErrorPattern, FixMethod, WorkflowExecution, WorkflowError, AmazonQHistory

class OrchestratorAgent:
    def __init__(self):
        self.current_workflow = None
    
    def start_workflow(self, workflow_name: str, context: Dict) -> WorkflowExecution:
        self.current_workflow = WorkflowExecution.objects.create(
            workflow_id=f"{workflow_name}_{datetime.now().timestamp()}",
            workflow_name=workflow_name,
            status='running',
            context_data=context
        )
        return self.current_workflow
    
    def capture_error(self, error: Exception, file_path: str = '', line_number: int = None) -> ErrorPattern:
        error_hash = self._generate_error_hash(error, file_path)
        stack = traceback.format_exc()
        
        pattern, created = ErrorPattern.objects.get_or_create(
            error_hash=error_hash,
            defaults={
                'error_type': type(error).__name__,
                'error_message': str(error),
                'stack_trace': stack,
                'file_path': file_path,
                'line_number': line_number,
            }
        )
        
        if not created:
            pattern.occurrence_count += 1
            pattern.last_seen = timezone.now()
            pattern.save()
        
        if self.current_workflow:
            WorkflowError.objects.create(
                workflow=self.current_workflow,
                error_pattern=pattern
            )
        
        return pattern
    
    def get_best_fix(self, error_pattern: ErrorPattern) -> Optional[FixMethod]:
        return error_pattern.fix_methods.filter(status='working').order_by('-confidence_score').first()
    
    def record_fix_attempt(self, error_pattern: ErrorPattern, method_desc: str, 
                          code_changes: Dict, user=None) -> FixMethod:
        fix = FixMethod.objects.create(
            error_pattern=error_pattern,
            method_description=method_desc,
            code_changes=code_changes,
            status='attempted',
            applied_by=user
        )
        return fix
    
    def mark_fix_success(self, fix_method: FixMethod):
        fix_method.success_count += 1
        fix_method.status = 'working'
        fix_method.confidence_score = self._calculate_confidence(fix_method)
        fix_method.save()
        
        if self.current_workflow:
            WorkflowError.objects.filter(
                workflow=self.current_workflow,
                error_pattern=fix_method.error_pattern,
                resolved=False
            ).update(resolved=True, fix_applied=fix_method)
    
    def mark_fix_failure(self, fix_method: FixMethod):
        fix_method.failure_count += 1
        fix_method.status = 'failed'
        fix_method.confidence_score = self._calculate_confidence(fix_method)
        fix_method.save()
    
    def complete_workflow(self, status: str = 'completed'):
        if self.current_workflow:
            self.current_workflow.completed_at = timezone.now()
            self.current_workflow.status = status
            self.current_workflow.save()
    
    def log_amazonq_interaction(self, session_id: str, query: str, response: str, 
                                context: Dict, error_pattern: ErrorPattern = None):
        AmazonQHistory.objects.create(
            session_id=session_id,
            query=query,
            response=response,
            context=context,
            error_related=error_pattern
        )
    
    def get_error_insights(self, error_pattern: ErrorPattern) -> Dict:
        fixes = error_pattern.fix_methods.all()
        working_fixes = fixes.filter(status='working')
        
        return {
            'error_type': error_pattern.error_type,
            'occurrence_count': error_pattern.occurrence_count,
            'first_seen': error_pattern.first_seen,
            'last_seen': error_pattern.last_seen,
            'working_fixes_count': working_fixes.count(),
            'best_fix': self._serialize_fix(self.get_best_fix(error_pattern)),
            'all_fixes': [self._serialize_fix(f) for f in fixes],
            'related_amazonq_queries': list(
                AmazonQHistory.objects.filter(error_related=error_pattern)
                .values('query', 'response', 'timestamp')[:5]
            )
        }
    
    def _generate_error_hash(self, error: Exception, file_path: str) -> str:
        content = f"{type(error).__name__}:{str(error)}:{file_path}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _calculate_confidence(self, fix_method: FixMethod) -> float:
        total = fix_method.success_count + fix_method.failure_count
        if total == 0:
            return 0.0
        return (fix_method.success_count / total) * 100
    
    def _serialize_fix(self, fix: Optional[FixMethod]) -> Optional[Dict]:
        if not fix:
            return None
        return {
            'id': fix.id,
            'description': fix.method_description,
            'status': fix.status,
            'confidence_score': fix.confidence_score,
            'success_count': fix.success_count,
            'failure_count': fix.failure_count,
        }
