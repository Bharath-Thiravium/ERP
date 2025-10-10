from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta
from authentication.models import ServiceUserSession
from .models import Employee
from .compliance_engine import ComplianceEngine
from .advanced_reports import AdvancedReportGenerator
from .tasks import run_compliance_checks, generate_monthly_ecr
import json

class ComplianceViewSet(viewsets.ViewSet):
    """Advanced compliance management views"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get compliance dashboard data"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            generator = AdvancedReportGenerator(company)
            dashboard_data = generator.generate_compliance_dashboard_data()
            
            return Response(dashboard_data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def run_checks(self, request):
        """Manually trigger compliance checks"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            engine = ComplianceEngine(company)
            alerts = engine.run_compliance_checks()
            
            return Response({
                'message': f'Generated {len(alerts)} compliance alerts',
                'alerts_count': len(alerts)
            })
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def scorecard(self, request):
        """Get compliance scorecard"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            generator = AdvancedReportGenerator(company)
            scorecard = generator.generate_compliance_scorecard()
            
            return Response(scorecard)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Get compliance alerts"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            from .statutory_models import ComplianceAlert
            
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            alerts = ComplianceAlert.objects.filter(
                company=company,
                is_resolved=False
            ).order_by('-created_at')
            
            alerts_data = []
            for alert in alerts:
                alerts_data.append({
                    'id': alert.id,
                    'type': alert.alert_type,
                    'severity': alert.severity,
                    'title': alert.title,
                    'description': alert.description,
                    'due_date': alert.due_date,
                    'created_at': alert.created_at,
                    'employee': f"{alert.employee.first_name} {alert.employee.last_name}" if alert.employee else None
                })
            
            return Response(alerts_data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def resolve_alert(self, request, pk=None):
        """Resolve a compliance alert"""
        try:
            from .statutory_models import ComplianceAlert
            
            alert = ComplianceAlert.objects.get(id=pk, company=request.user.company)
            alert.is_resolved = True
            alert.resolved_at = timezone.now()
            alert.resolved_by = request.user
            alert.resolution_notes = request.data.get('notes', '')
            alert.save()
            
            return Response({'message': 'Alert resolved successfully'})
        except ComplianceAlert.DoesNotExist:
            return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdvancedReportsViewSet(viewsets.ViewSet):
    """Advanced reporting views"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
    
    @action(detail=False, methods=['get'])
    def statutory_summary(self, request):
        """Generate statutory summary report"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            month = int(request.query_params.get('month', timezone.now().month))
            year = int(request.query_params.get('year', timezone.now().year))
            
            generator = AdvancedReportGenerator(company)
            report_buffer = generator.generate_statutory_summary_report(month, year)
            
            response = HttpResponse(report_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="statutory_summary_{month}_{year}.pdf"'
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def audit_trail(self, request):
        """Generate audit trail report"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            if not start_date or not end_date:
                return Response({'error': 'start_date and end_date are required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            generator = AdvancedReportGenerator(company)
            report_buffer = generator.generate_audit_trail_report(start_date, end_date)
            
            response = HttpResponse(report_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="audit_trail_{start_date}_{end_date}.pdf"'
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def compliance_trends(self, request):
        """Get compliance trends data"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            # Mock trend data - in production, calculate from historical data
            trends_data = {
                'monthly_scores': [
                    {'month': 'Jan', 'score': 85},
                    {'month': 'Feb', 'score': 88},
                    {'month': 'Mar', 'score': 92},
                    {'month': 'Apr', 'score': 89},
                    {'month': 'May', 'score': 94},
                    {'month': 'Jun', 'score': 96}
                ],
                'category_scores': {
                    'PF': 95,
                    'ESI': 92,
                    'PT': 88,
                    'TDS': 90,
                    'Labor Law': 85
                },
                'alert_trends': [
                    {'month': 'Jan', 'alerts': 12},
                    {'month': 'Feb', 'alerts': 8},
                    {'month': 'Mar', 'alerts': 5},
                    {'month': 'Apr', 'alerts': 7},
                    {'month': 'May', 'alerts': 3},
                    {'month': 'Jun', 'alerts': 2}
                ]
            }
            
            return Response(trends_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AutomationViewSet(viewsets.ViewSet):
    """Automation and task management views"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'])
    def trigger_ecr_generation(self, request):
        """Manually trigger ECR generation"""
        try:
            # Trigger async task
            task = generate_monthly_ecr.delay()
            
            return Response({
                'message': 'ECR generation triggered',
                'task_id': task.id
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def trigger_compliance_check(self, request):
        """Manually trigger compliance check"""
        try:
            # Trigger async task
            task = run_compliance_checks.delay()
            
            return Response({
                'message': 'Compliance check triggered',
                'task_id': task.id
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def task_status(self, request):
        """Get task status"""
        try:
            from celery.result import AsyncResult
            
            task_id = request.query_params.get('task_id')
            if not task_id:
                return Response({'error': 'task_id is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            result = AsyncResult(task_id)
            
            return Response({
                'task_id': task_id,
                'status': result.status,
                'result': result.result if result.ready() else None
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def scheduled_tasks(self, request):
        """Get scheduled tasks status"""
        try:
            # Mock scheduled tasks data
            scheduled_tasks = [
                {
                    'name': 'Daily Compliance Check',
                    'schedule': 'Daily at 8:00 AM',
                    'last_run': '2024-01-07 08:00:00',
                    'next_run': '2024-01-08 08:00:00',
                    'status': 'Active'
                },
                {
                    'name': 'Monthly ECR Generation',
                    'schedule': '1st of every month at 9:00 AM',
                    'last_run': '2024-01-01 09:00:00',
                    'next_run': '2024-02-01 09:00:00',
                    'status': 'Active'
                },
                {
                    'name': 'Weekly Compliance Reminders',
                    'schedule': 'Every Monday at 10:00 AM',
                    'last_run': '2024-01-01 10:00:00',
                    'next_run': '2024-01-08 10:00:00',
                    'status': 'Active'
                }
            ]
            
            return Response(scheduled_tasks)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IntegrationViewSet(viewsets.ViewSet):
    """Government portal integration views"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['get'])
    def portal_status(self, request):
        """Get government portal connection status"""
        try:
            # Mock portal status
            portal_status = {
                'epfo': {
                    'status': 'Connected',
                    'last_sync': '2024-01-07 10:30:00',
                    'next_sync': '2024-01-08 10:30:00'
                },
                'esic': {
                    'status': 'Connected',
                    'last_sync': '2024-01-07 11:00:00',
                    'next_sync': '2024-01-08 11:00:00'
                },
                'income_tax': {
                    'status': 'Connected',
                    'last_sync': '2024-01-07 09:00:00',
                    'next_sync': '2024-01-10 09:00:00'
                },
                'professional_tax': {
                    'status': 'Disconnected',
                    'last_sync': '2024-01-05 14:00:00',
                    'next_sync': 'Manual sync required'
                }
            }
            
            return Response(portal_status)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def sync_portal(self, request):
        """Manually sync with government portal"""
        try:
            portal = request.data.get('portal')
            if not portal:
                return Response({'error': 'portal is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Mock sync operation
            return Response({
                'message': f'Sync initiated for {portal}',
                'status': 'In Progress'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def submission_history(self, request):
        """Get government submission history"""
        try:
            # Mock submission history
            submissions = [
                {
                    'date': '2024-01-01',
                    'type': 'ECR',
                    'portal': 'EPFO',
                    'status': 'Submitted',
                    'reference': 'ECR202401001'
                },
                {
                    'date': '2024-01-01',
                    'type': 'ESI Return',
                    'portal': 'ESIC',
                    'status': 'Submitted',
                    'reference': 'ESI202401001'
                },
                {
                    'date': '2023-12-31',
                    'type': 'TDS Return',
                    'portal': 'Income Tax',
                    'status': 'Submitted',
                    'reference': 'TDS202312001'
                }
            ]
            
            return Response(submissions)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)