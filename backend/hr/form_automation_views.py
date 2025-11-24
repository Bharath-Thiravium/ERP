from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.renderers import BaseRenderer
from django.http import HttpResponse

class PDFRenderer(BaseRenderer):
    media_type = 'application/pdf'
    format = 'pdf'
    charset = None
    render_style = 'binary'

    def render(self, data, media_type=None, renderer_context=None):
        return data
from django.utils import timezone
from datetime import datetime, timedelta
from authentication.models import ServiceUserSession
from .form_automation_models import ComplianceFormTemplate, MonthlyComplianceForm, EmployeeFormEntry
from .form_automation_service import FormAutomationService

from .serializers import (
    ComplianceFormTemplateSerializer, 
    MonthlyComplianceFormSerializer, 
    EmployeeFormEntrySerializer,
    ComplianceFormTemplateCreateSerializer
)
import logging
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)

class ComplianceFormTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing compliance form templates"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = ComplianceFormTemplateSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ComplianceFormTemplateCreateSerializer
        elif self.action in ['update', 'partial_update']:
            # Use partial serializer for updates
            class PartialUpdateSerializer(serializers.ModelSerializer):
                class Meta:
                    model = ComplianceFormTemplate
                    fields = ['generation_day', 'is_monthly_auto_generate', 'is_active']
            return PartialUpdateSerializer
        return ComplianceFormTemplateSerializer
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return ComplianceFormTemplate.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return ComplianceFormTemplate.objects.filter(
                company=session.service_user.company
            ).order_by('-created_at')
        except ServiceUserSession.DoesNotExist:
            return ComplianceFormTemplate.objects.none()
    
    def perform_create(self, serializer):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer.save(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['get'])
    def active_templates(self, request):
        """Get active templates that can generate forms today"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            templates = ComplianceFormTemplate.objects.filter(
                company=session.service_user.company,
                is_active=True
            )
            
            # Filter templates that can generate today
            available_templates = [t for t in templates if t.can_generate_today()]
            
            serializer = self.get_serializer(available_templates, many=True)
            return Response(serializer.data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['post'])
    def create_common_templates(self, request):
        """Create common templates for current company"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Create Form XIII template
            template, created = ComplianceFormTemplate.objects.get_or_create(
                company=session.service_user.company,
                template_name='Form XIII - Register of Workmen',
                defaults={
                    'form_type': 'register_of_workmen',
                    'template_structure': {
                        'fields': [
                            {'name': 'Employee ID', 'type': 'text'},
                            {'name': 'Name and surname of workmen', 'type': 'text'},
                            {'name': 'Date of Birth mm/dd/yyyy', 'type': 'date'},
                            {'name': 'Sex', 'type': 'text'},
                            {'name': "Father's/Husband's Name", 'type': 'text'},
                            {'name': 'Nature of Employment/Designation', 'type': 'text'},
                            {'name': 'Permanent Address', 'type': 'text'},
                            {'name': 'Local Address', 'type': 'text'},
                            {'name': 'Date of Commencement of Employment', 'type': 'date'},
                            {'name': 'Signature of workmen', 'type': 'text'},
                            {'name': 'Date of termination of employment', 'type': 'date'},
                            {'name': 'Reasons for termination', 'type': 'text'},
                            {'name': 'Remarks', 'type': 'text'}
                        ]
                    },
                    'generation_day': 1,
                    'is_active': True
                }
            )
            
            return Response({
                'message': 'Common templates created successfully',
                'created': created
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

class MonthlyComplianceFormViewSet(viewsets.ModelViewSet):
    """ViewSet for managing monthly compliance forms"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = MonthlyComplianceFormSerializer
    
    def list(self, request, *args, **kwargs):
        """Override list to return data in expected format"""
        queryset = self.get_queryset()
        
        # Filter by current month or history based on query param
        filter_type = request.query_params.get('filter', 'all')
        if filter_type == 'current_month':
            from django.utils import timezone
            today = timezone.now().date()
            queryset = queryset.filter(
                month__year=today.year,
                month__month=today.month
            )
        elif filter_type == 'history':
            from django.utils import timezone
            today = timezone.now().date()
            queryset = queryset.exclude(
                month__year=today.year,
                month__month=today.month
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': queryset.count()
        })
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return MonthlyComplianceForm.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return MonthlyComplianceForm.objects.filter(
                company=session.service_user.company
            ).order_by('-month')
        except ServiceUserSession.DoesNotExist:
            return MonthlyComplianceForm.objects.none()
    
    @action(detail=False, methods=['post'])
    def generate_monthly_forms(self, request):
        """Generate monthly forms for current month"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            month_str = request.data.get('month')
            template_id = request.data.get('template_id')
            
            if month_str:
                month_date = datetime.strptime(month_str, '%Y-%m-%d').date()
            else:
                month_date = timezone.now().date().replace(day=1)
            
            if template_id:
                # Generate form for specific template
                template = ComplianceFormTemplate.objects.get(
                    id=template_id, 
                    company=session.service_user.company
                )
                generated_form = FormAutomationService.generate_form_for_template(
                    template, month_date
                )
                generated_forms = [generated_form] if generated_form else []
            else:
                # Generate all forms
                generated_forms = FormAutomationService.generate_monthly_forms(
                    session.service_user.company.id, 
                    month_date
                )
            
            serializer = self.get_serializer(generated_forms, many=True)
            return Response({
                'message': f'Generated {len(generated_forms)} forms successfully',
                'forms': serializer.data
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error generating monthly forms: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def approve_form(self, request, pk=None):
        """Approve a monthly form"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            form = self.get_object()
            form.status = 'approved'
            form.approved_by = session.service_user
            form.approved_at = timezone.now()
            form.save()
            
            return Response({'message': 'Form approved successfully'})
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for forms"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            current_month = timezone.now().date().replace(day=1)
            
            stats = {
                'current_month_forms': MonthlyComplianceForm.objects.filter(
                    company=session.service_user.company,
                    month=current_month
                ).count(),
                'pending_approval': MonthlyComplianceForm.objects.filter(
                    company=session.service_user.company,
                    status='generated'
                ).count(),
                'approved_forms': MonthlyComplianceForm.objects.filter(
                    company=session.service_user.company,
                    status='approved'
                ).count(),
                'total_employees': session.service_user.company.employees.filter(status='active').count(),
                'total_templates': ComplianceFormTemplate.objects.filter(
                    company=session.service_user.company,
                    is_active=True
                ).count()
            }
            
            return Response(stats)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    

    
    @action(detail=True, methods=['get'], renderer_classes=[PDFRenderer])
    def export_pdf(self, request, pk=None):
        """Export form as PDF"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            form = self.get_object()
            
            from django.http import HttpResponse
            
            from .weasyprint_pdf_export import generate_weasyprint_pdf
            
            # Get employee entries
            entries = EmployeeFormEntry.objects.filter(monthly_form=form)
            
            # Generate PDF using WeasyPrint
            pdf_data = generate_weasyprint_pdf(form, session, entries)
            
            # Return PDF data directly for DRF renderer
            filename = f"{form.template.template_name.replace(' ', '_')}_{form.month.strftime('%Y_%m')}.pdf"
            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_data)
            
            return response
            

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"PDF export error: {str(e)}")
            return Response(
                {'error': f'PDF export failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    


class EmployeeFormEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing employee form entries"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = EmployeeFormEntrySerializer
    
    def list(self, request, *args, **kwargs):
        """Override list to return data in expected format"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': queryset.count()
        })
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return EmployeeFormEntry.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = EmployeeFormEntry.objects.filter(
                monthly_form__company=session.service_user.company
            ).select_related('employee', 'monthly_form')
            
            # Filter by form if provided
            form_id = self.request.query_params.get('form_id')
            if form_id:
                queryset = queryset.filter(monthly_form_id=form_id)
            
            return queryset.order_by('employee__first_name', 'employee__last_name')
        except ServiceUserSession.DoesNotExist:
            return EmployeeFormEntry.objects.none()


