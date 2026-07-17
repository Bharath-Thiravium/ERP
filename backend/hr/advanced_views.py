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
                    'severity': alert.priority,
                    'title': alert.title,
                    'description': alert.message,
                    'due_date': alert.due_date,
                    'created_at': alert.created_at,
                    'employee': None  # ComplianceAlert model doesn't have employee field
                })
            
            return Response(alerts_data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def resolve_alert(self, request, pk=None):
        """Resolve a compliance alert"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            from .statutory_models import ComplianceAlert
            
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            alert = ComplianceAlert.objects.get(id=pk, company=company)
            alert.is_resolved = True
            alert.resolved_date = timezone.now()
            alert.resolved_by = session.service_user
            alert.save()
            
            return Response({'message': 'Alert resolved successfully'})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
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
            
            # Use default dates if not provided
            from datetime import datetime, timedelta
            end_date = request.query_params.get('end_date', datetime.now().strftime('%Y-%m-%d'))
            start_date = request.query_params.get('start_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
            
            generator = AdvancedReportGenerator(company)
            report_buffer = generator.generate_audit_trail_report(start_date, end_date)
            
            response = HttpResponse(report_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="audit_trail_{start_date}_{end_date}.pdf"'
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def scorecard(self, request):
        """Generate compliance scorecard PDF"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            generator = AdvancedReportGenerator(company)
            report_buffer = generator.generate_compliance_scorecard_pdf()
            
            response = HttpResponse(report_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="compliance_scorecard.pdf"'
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def returns_summary(self, request):
        """Generate government returns summary PDF"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            generator = AdvancedReportGenerator(company)
            report_buffer = generator.generate_returns_summary_pdf()
            
            response = HttpResponse(report_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="returns_summary.pdf"'
            
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
            from .statutory_models import ComplianceAlert, GovernmentReturn
            from django.db.models import Count
            from datetime import datetime, timedelta
            
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            # Calculate real compliance trends from last 6 months
            end_date = datetime.now()
            start_date = end_date - timedelta(days=180)
            
            # Monthly alert trends. Historical scores cannot be reconstructed from
            # current alerts without a stored monthly snapshot, so do not invent
            # them from alert counts.
            alert_trends = []
            
            for i in range(6):
                month_start = end_date - timedelta(days=30 * (5-i))
                month_end = end_date - timedelta(days=30 * (4-i))
                
                alerts_count = ComplianceAlert.objects.filter(
                    company=company,
                    created_at__gte=month_start,
                    created_at__lt=month_end
                ).count()
                
                alert_trends.append({
                    'month': month_start.strftime('%b'),
                    'alerts': alerts_count
                })
            
            # Category scores based on real compliance status
            generator = AdvancedReportGenerator(company)
            
            category_scores = {
                'PF': generator._calculate_pf_compliance_score(),
                'ESI': generator._calculate_esi_compliance_score(),
                'PT': generator._calculate_pt_compliance_score(),
                'TDS': generator._calculate_tds_compliance_score(),
                'Labor Law': generator._calculate_labor_law_compliance_score()
            }
            
            trends_data = {
                'monthly_scores': [],
                'category_scores': category_scores,
                'alert_trends': alert_trends,
                'note': 'Monthly compliance scores require stored period snapshots and are not inferred from alert counts.'
            }
            
            return Response(trends_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AutomationViewSet(viewsets.ViewSet):
    """Compatibility endpoints for automation features not yet configured."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def unavailable(self):
        return Response(
            {
                'error': 'Statutory automation is not configured.',
                'detail': 'Generate returns and record official filing details from Statutory > Government Returns.'
            },
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )
    
    @action(detail=False, methods=['post'])
    def trigger_ecr_generation(self, request):
        """Manually trigger ECR generation"""
        return self.unavailable()

        # Retained below only for compatibility with older deployments.
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
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            alerts = ComplianceEngine(session.service_user.company).run_compliance_checks()
            return Response({
                'message': f'Compliance check completed with {len(alerts)} unresolved finding(s).',
                'alerts_count': len(alerts),
            })
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def task_status(self, request):
        """Get task status"""
        return self.unavailable()

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
    
    @action(detail=False, methods=['post'])
    def create_task(self, request):
        """Create a new automation task"""
        return self.unavailable()

        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            # Handle multiple possible field names
            task_name = request.data.get('task_name') or request.data.get('name') or request.data.get('taskName')
            task_type = request.data.get('task_type') or request.data.get('type') or request.data.get('taskType')
            schedule = request.data.get('schedule') or request.data.get('frequency') or request.data.get('cron')
            
            # Use defaults if not provided
            if not task_name:
                task_name = 'Custom Compliance Task'
            if not task_type:
                task_type = 'compliance_check'
            if not schedule:
                schedule = 'Daily'
            
            # Mock task creation (in real implementation, this would create actual scheduled tasks)
            from datetime import datetime, timedelta
            now = datetime.now()
            
            task_data = {
                'id': f"custom_{company.id}_{int(timezone.now().timestamp())}",
                'name': task_name,
                'type': task_type,
                'schedule': schedule,
                'status': 'Active',
                'enabled': True,
                'created_at': timezone.now().isoformat(),
                'company': company.name,
                'company_id': company.id,
                'description': request.data.get('description', f'Automated {task_type} task'),
                'last_run': 'Never',
                'next_run': (now + timedelta(days=1)).strftime('%m/%d/%Y, %H:%M:%S %p')
            }
            
            # Store in session (in real app, store in database)
            if not hasattr(request.session, 'created_tasks'):
                request.session['created_tasks'] = []
            request.session['created_tasks'].append(task_data)
            request.session.modified = True
            
            return Response({
                'message': 'Task created successfully',
                'task': task_data
            }, status=status.HTTP_201_CREATED)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def scheduled_tasks(self, request):
        """Get scheduled tasks status"""
        return self.unavailable()

        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            from datetime import datetime, timedelta
            now = datetime.now()
            
            # Get created tasks from session or database (mock implementation)
            created_tasks = getattr(request.session, 'created_tasks', [])
            
            # Default system tasks + created tasks
            scheduled_tasks = [
                {
                    'id': 'daily_compliance',
                    'name': 'Daily Compliance Check',
                    'schedule': 'Daily at 8:00 AM',
                    'last_run': (now - timedelta(days=1)).strftime('%m/%d/%Y, %H:%M:%S %p'),
                    'next_run': (now + timedelta(days=1)).replace(hour=8, minute=0).strftime('%m/%d/%Y, %H:%M:%S %p'),
                    'status': 'Active',
                    'enabled': True
                },
                {
                    'id': 'monthly_ecr',
                    'name': 'Monthly ECR Generation',
                    'schedule': '1st of every month at 9:00 AM',
                    'last_run': now.replace(day=1, hour=9, minute=0).strftime('%m/%d/%Y, %H:%M:%S %p'),
                    'next_run': (now.replace(day=1, hour=9, minute=0) + timedelta(days=32)).replace(day=1).strftime('%m/%d/%Y, %H:%M:%S %p'),
                    'status': 'Active',
                    'enabled': True
                },
                {
                    'id': 'compliance_monitoring',
                    'name': f'{company.name} Compliance Monitoring',
                    'schedule': 'Every Monday at 10:00 AM',
                    'last_run': (now - timedelta(days=now.weekday())).replace(hour=10, minute=0).strftime('%m/%d/%Y, %H:%M:%S %p'),
                    'next_run': (now + timedelta(days=7-now.weekday())).replace(hour=10, minute=0).strftime('%m/%d/%Y, %H:%M:%S %p'),
                    'status': 'Active',
                    'enabled': True
                }
            ]
            
            # Add created tasks
            for task in created_tasks:
                if task.get('company_id') == company.id:
                    scheduled_tasks.append(task)
            
            return Response(scheduled_tasks)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def toggle_task(self, request, pk=None):
        """Toggle task on/off"""
        return self.unavailable()

        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            enabled = request.data.get('enabled', True)
            
            return Response({
                'message': f'Task {"enabled" if enabled else "disabled"} successfully',
                'task_id': pk,
                'enabled': enabled
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def task_settings(self, request, pk=None):
        """Get task settings"""
        return self.unavailable()

        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Mock settings for the task
            settings = {
                'task_id': pk,
                'notifications': True,
                'email_alerts': True,
                'retry_attempts': 3,
                'timeout': 300
            }
            
            return Response(settings)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IntegrationViewSet(viewsets.ViewSet):
    """Government portal integration views"""
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
    def portal_status(self, request):
        """Get government portal connection status"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            from .statutory_models import StatutorySettings
            statutory_settings = StatutorySettings.objects.filter(company=company).first()

            def portal_details(configured):
                return {
                    'status': 'Not integrated',
                    'configured': configured,
                    'last_sync': None,
                    'next_sync': None,
                    'message': (
                        'Registration details are configured; filing is manual.'
                        if configured else
                        'Configure statutory registration details before generating returns.'
                    ),
                }

            portal_status = {
                'epfo': portal_details(bool(statutory_settings and statutory_settings.pf_establishment_code)),
                'esic': portal_details(bool(statutory_settings and statutory_settings.esi_employer_code)),
                'income_tax': portal_details(bool(statutory_settings and statutory_settings.tan_number)),
                'professional_tax': portal_details(bool(statutory_settings and statutory_settings.pt_registration_number)),
            }
            
            return Response(portal_status)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def sync_portal(self, request):
        """Manually sync with government portal"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        if not ServiceUserSession.objects.filter(session_key=session_key, is_active=True).exists():
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(
            {
                'error': 'Direct government portal sync is not configured.',
                'detail': 'File through the official portal, then record the acknowledgment number and filing date.'
            },
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )
    
    @action(detail=False, methods=['get'])
    def submission_history(self, request):
        """Get government submission history"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            from .statutory_models import GovernmentReturn
            
            # Real submission history from database
            returns = GovernmentReturn.objects.filter(
                company=company
            ).order_by('-created_at')[:10]  # Last 10 submissions
            
            submissions = []
            for return_obj in returns:
                portal_map = {
                    'pf_ecr': 'EPFO',
                    'esi_return': 'ESIC',
                    'pt_return': 'Professional Tax',
                    'tds_24q': 'Income Tax'
                }
                
                submissions.append({
                    'date': return_obj.created_at.strftime('%Y-%m-%d'),
                    'type': return_obj.get_return_type_display(),
                    'portal': portal_map.get(return_obj.return_type, 'Unknown'),
                    'status': return_obj.status.title(),
                    'reference': return_obj.acknowledgment_number or ''
                })

            return Response(submissions)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
