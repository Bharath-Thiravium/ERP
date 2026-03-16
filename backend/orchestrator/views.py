from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from .models import ErrorPattern, FixMethod, WorkflowExecution, AmazonQHistory
from .agent import OrchestratorAgent
from .serializers import ErrorPatternSerializer, FixMethodSerializer, WorkflowExecutionSerializer

class OrchestratorViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def error_dashboard(self, request):
        recent_errors = ErrorPattern.objects.order_by('-last_seen')[:20]
        top_errors = ErrorPattern.objects.order_by('-occurrence_count')[:10]
        
        return Response({
            'recent_errors': ErrorPatternSerializer(recent_errors, many=True).data,
            'top_errors': ErrorPatternSerializer(top_errors, many=True).data,
            'total_errors': ErrorPattern.objects.count(),
            'resolved_errors': ErrorPattern.objects.filter(fix_methods__status='working').distinct().count()
        })
    
    @action(detail=False, methods=['get'])
    def error_detail(self, request):
        error_hash = request.query_params.get('hash')
        try:
            error = ErrorPattern.objects.get(error_hash=error_hash)
            agent = OrchestratorAgent()
            insights = agent.get_error_insights(error)
            return Response(insights)
        except ErrorPattern.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
    
    @action(detail=False, methods=['post'])
    def record_fix(self, request):
        error_hash = request.data.get('error_hash')
        method_desc = request.data.get('method_description')
        code_changes = request.data.get('code_changes', {})
        
        try:
            error = ErrorPattern.objects.get(error_hash=error_hash)
            agent = OrchestratorAgent()
            fix = agent.record_fix_attempt(error, method_desc, code_changes, request.user)
            return Response(FixMethodSerializer(fix).data)
        except ErrorPattern.DoesNotExist:
            return Response({'error': 'Error pattern not found'}, status=404)
    
    @action(detail=False, methods=['post'])
    def mark_fix_status(self, request):
        fix_id = request.data.get('fix_id')
        success = request.data.get('success', False)
        
        try:
            fix = FixMethod.objects.get(id=fix_id)
            agent = OrchestratorAgent()
            if success:
                agent.mark_fix_success(fix)
            else:
                agent.mark_fix_failure(fix)
            return Response(FixMethodSerializer(fix).data)
        except FixMethod.DoesNotExist:
            return Response({'error': 'Fix not found'}, status=404)
    
    @action(detail=False, methods=['get'])
    def workflow_history(self, request):
        workflows = WorkflowExecution.objects.order_by('-started_at')[:50]
        return Response(WorkflowExecutionSerializer(workflows, many=True).data)
    
    @action(detail=False, methods=['post'])
    def log_amazonq(self, request):
        agent = OrchestratorAgent()
        error_hash = request.data.get('error_hash')
        error_pattern = None
        
        if error_hash:
            try:
                error_pattern = ErrorPattern.objects.get(error_hash=error_hash)
            except ErrorPattern.DoesNotExist:
                pass
        
        agent.log_amazonq_interaction(
            session_id=request.data.get('session_id'),
            query=request.data.get('query'),
            response=request.data.get('response'),
            context=request.data.get('context', {}),
            error_pattern=error_pattern
        )
        return Response({'status': 'logged'})
    
    @action(detail=False, methods=['get'])
    def learning_stats(self, request):
        total_fixes = FixMethod.objects.count()
        working_fixes = FixMethod.objects.filter(status='working').count()
        failed_fixes = FixMethod.objects.filter(status='failed').count()
        
        return Response({
            'total_fixes_attempted': total_fixes,
            'working_fixes': working_fixes,
            'failed_fixes': failed_fixes,
            'success_rate': (working_fixes / total_fixes * 100) if total_fixes > 0 else 0,
            'unique_errors': ErrorPattern.objects.count(),
            'total_workflows': WorkflowExecution.objects.count()
        })
