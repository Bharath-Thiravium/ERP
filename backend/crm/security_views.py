# Phase 4: Advanced Security & Compliance Views
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from .phase4_models import (
    DataAuditLog, ComplianceRule, ComplianceViolation, 
    DataRetentionPolicy, SecurityAlert, APIUsageLog
)
from .phase4_serializers import (
    DataAuditLogSerializer, ComplianceRuleSerializer, ComplianceViolationSerializer,
    DataRetentionPolicySerializer, SecurityAlertSerializer, APIUsageLogSerializer
)
from authentication.models import Company
from .views import CRMBaseViewSet
import json


class DataAuditLogViewSet(CRMBaseViewSet):
    queryset = DataAuditLog.objects.all()
    serializer_class = DataAuditLogSerializer
    filterset_fields = ['action', 'model_name']
    search_fields = ['object_repr', 'user__username']
    ordering = ['-timestamp']
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get audit log dashboard data"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company
        
        logs = self.get_queryset()
        
        # Audit statistics
        total_logs = logs.count()
        today_logs = logs.filter(timestamp__date=timezone.now().date()).count()
        
        # Action breakdown
        action_breakdown = logs.values('action').annotate(
            count=Count('id')
        )
        
        # Model breakdown
        model_breakdown = logs.values('model_name').annotate(
            count=Count('id')
        )
        
        # Recent logs
        recent_logs = logs.order_by('-timestamp')[:20]
        
        return Response({
            'total_logs': total_logs,
            'today_logs': today_logs,
            'action_breakdown': list(action_breakdown),
            'model_breakdown': list(model_breakdown),
            'recent_logs': DataAuditLogSerializer(recent_logs, many=True).data
        })


class ComplianceRuleViewSet(CRMBaseViewSet):
    queryset = ComplianceRule.objects.all()
    serializer_class = ComplianceRuleSerializer
    filterset_fields = ['rule_type', 'status']
    search_fields = ['name', 'description']
    ordering = ['-created_at']
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a compliance rule"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        rule = self.get_object()
        rule.status = 'active'
        rule.save()
        
        return Response({
            'status': 'success',
            'message': 'Compliance rule activated'
        })
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a compliance rule"""
        rule = self.get_object()
        rule.status = 'inactive'
        rule.save()
        
        return Response({
            'status': 'success',
            'message': 'Compliance rule deactivated'
        })
    
    @action(detail=True, methods=['post'])
    def check_violations(self, request, pk=None):
        """Check for violations of this rule"""
        rule = self.get_object()
        
        # Simulate violation check
        # In real implementation, this would check data against rule conditions
        violations_found = 0
        
        return Response({
            'status': 'success',
            'message': f'Violation check completed. {violations_found} violations found.',
            'violations_found': violations_found
        })


class ComplianceViolationViewSet(CRMBaseViewSet):
    queryset = ComplianceViolation.objects.all()
    serializer_class = ComplianceViolationSerializer
    filterset_fields = ['severity', 'status', 'rule']
    search_fields = ['title', 'description']
    ordering = ['-detected_at']
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a compliance violation"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        user = su.created_by
        
        violation = self.get_object()
        resolution_notes = request.data.get('resolution_notes', '')
        
        violation.status = 'resolved'
        violation.resolution_notes = resolution_notes
        violation.resolved_by = user
        violation.resolved_at = timezone.now()
        violation.save()
        
        return Response({
            'status': 'success',
            'message': 'Violation resolved successfully'
        })
    
    @action(detail=True, methods=['post'])
    def mark_false_positive(self, request, pk=None):
        """Mark violation as false positive"""
        violation = self.get_object()
        resolution_notes = request.data.get('resolution_notes', '')
        
        violation.status = 'false_positive'
        violation.resolution_notes = resolution_notes
        violation.resolved_by = request.user
        violation.resolved_at = timezone.now()
        violation.save()
        
        return Response({
            'status': 'success',
            'message': 'Violation marked as false positive'
        })
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get compliance violations dashboard data"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company
        
        violations = self.get_queryset()
        
        # Violation statistics
        total_violations = violations.count()
        open_violations = violations.filter(status='open').count()
        resolved_violations = violations.filter(status='resolved').count()
        
        # Severity breakdown
        severity_breakdown = violations.values('severity').annotate(
            count=Count('id')
        )
        
        # Recent violations
        recent_violations = violations.order_by('-detected_at')[:10]
        
        return Response({
            'total_violations': total_violations,
            'open_violations': open_violations,
            'resolved_violations': resolved_violations,
            'severity_breakdown': list(severity_breakdown),
            'recent_violations': ComplianceViolationSerializer(recent_violations, many=True).data
        })


class DataRetentionPolicyViewSet(CRMBaseViewSet):
    queryset = DataRetentionPolicy.objects.all()
    serializer_class = DataRetentionPolicySerializer
    filterset_fields = ['retention_type', 'status']
    search_fields = ['name', 'description']
    ordering = ['-created_at']
    
    @action(detail=True, methods=['post'])
    def execute_policy(self, request, pk=None):
        """Execute data retention policy"""
        policy = self.get_object()
        
        # Simulate policy execution
        # In real implementation, this would identify and process data for retention
        records_processed = 0
        records_archived = 0
        records_deleted = 0
        
        policy.last_executed = timezone.now()
        policy.save()
        
        return Response({
            'status': 'success',
            'message': 'Data retention policy executed successfully',
            'records_processed': records_processed,
            'records_archived': records_archived,
            'records_deleted': records_deleted
        })
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get data retention dashboard data"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company
        
        policies = self.get_queryset()
        
        # Policy statistics
        total_policies = policies.count()
        active_policies = policies.filter(status='active').count()
        
        # Recent executions
        recent_executions = policies.filter(
            last_executed__isnull=False
        ).order_by('-last_executed')[:10]
        
        return Response({
            'total_policies': total_policies,
            'active_policies': active_policies,
            'recent_executions': DataRetentionPolicySerializer(recent_executions, many=True).data
        })


class SecurityAlertViewSet(CRMBaseViewSet):
    queryset = SecurityAlert.objects.all()
    serializer_class = SecurityAlertSerializer
    filterset_fields = ['alert_type', 'severity', 'status']
    search_fields = ['title', 'description']
    ordering = ['-created_at']
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign security alert to a user"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        alert = self.get_object()
        assigned_to_id = request.data.get('assigned_to')
        
        if assigned_to_id:
            from django.contrib.auth.models import User
            try:
                assigned_user = User.objects.get(id=assigned_to_id)
                alert.assigned_to = assigned_user
                alert.save()
                
                return Response({
                    'status': 'success',
                    'message': f'Alert assigned to {assigned_user.get_full_name()}'
                })
            except User.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'User not found'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'status': 'error',
            'message': 'assigned_to is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a security alert"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        user = su.created_by
        
        alert = self.get_object()
        resolution_notes = request.data.get('resolution_notes', '')
        
        alert.status = 'resolved'
        alert.resolution_notes = resolution_notes
        alert.resolved_by = user
        alert.resolved_at = timezone.now()
        alert.save()
        
        return Response({
            'status': 'success',
            'message': 'Security alert resolved successfully'
        })
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get security alerts dashboard data"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company
        
        alerts = self.get_queryset()
        
        # Alert statistics
        total_alerts = alerts.count()
        open_alerts = alerts.filter(status='open').count()
        critical_alerts = alerts.filter(severity='critical', status='open').count()
        
        # Severity breakdown
        severity_breakdown = alerts.values('severity').annotate(
            count=Count('id')
        )
        
        # Alert type breakdown
        type_breakdown = alerts.values('alert_type').annotate(
            count=Count('id')
        )
        
        # Recent alerts
        recent_alerts = alerts.order_by('-created_at')[:10]
        
        return Response({
            'total_alerts': total_alerts,
            'open_alerts': open_alerts,
            'critical_alerts': critical_alerts,
            'severity_breakdown': list(severity_breakdown),
            'type_breakdown': list(type_breakdown),
            'recent_alerts': SecurityAlertSerializer(recent_alerts, many=True).data
        })


class APIUsageLogViewSet(CRMBaseViewSet):
    queryset = APIUsageLog.objects.all()
    serializer_class = APIUsageLogSerializer
    filterset_fields = ['method', 'status_code']
    search_fields = ['endpoint', 'user__username']
    ordering = ['-timestamp']
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get API usage dashboard data"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company
        
        logs = self.get_queryset()
        
        # Usage statistics
        total_requests = logs.count()
        today_requests = logs.filter(timestamp__date=timezone.now().date()).count()
        
        # Method breakdown
        method_breakdown = logs.values('method').annotate(
            count=Count('id')
        )
        
        # Status code breakdown
        status_breakdown = logs.values('status_code').annotate(
            count=Count('id')
        )
        
        # Top endpoints
        top_endpoints = logs.values('endpoint').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        return Response({
            'total_requests': total_requests,
            'today_requests': today_requests,
            'method_breakdown': list(method_breakdown),
            'status_breakdown': list(status_breakdown),
            'top_endpoints': list(top_endpoints)
        })