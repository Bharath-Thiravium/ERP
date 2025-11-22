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
    
    @action(detail=False, methods=['post'])
    def setup_templates(self, request):
        """Setup default form templates for company"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            templates = FormAutomationService.setup_default_templates(session.service_user.company)
            
            return Response({
                'message': f'Setup {len(templates)} form templates successfully',
                'templates_created': len(templates)
            })
            
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
            from .optimized_pdf_export import generate_optimized_pdf
            
            # Get employee entries
            entries = EmployeeFormEntry.objects.filter(monthly_form=form)
            
            # Generate optimized PDF
            pdf_data = generate_optimized_pdf(form, session, entries)
            
            # Return PDF data directly for DRF renderer
            filename = f"{form.template.template_name.replace(' ', '_')}_{form.month.strftime('%Y_%m')}.pdf"
            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_data)
            
            return response
            
        except ImportError:
            # Fallback to simple HTML if reportlab is not available
            return self._export_html_fallback(session, form)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"PDF export error: {str(e)}")
            return Response(
                {'error': f'PDF export failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _export_html_fallback(self, session, form):
        """Fallback HTML export if PDF library is not available"""
        from django.http import HttpResponse
        
        entries = EmployeeFormEntry.objects.filter(monthly_form=form)
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{form.template.template_name}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; font-weight: bold; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .info {{ margin-bottom: 20px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{session.service_user.company.name}</h1>
                <h2>{form.template.template_name}</h2>
            </div>
            
            <div class="info">
                <p><strong>Month:</strong> {form.month.strftime('%B %Y')}</p>
                <p><strong>Generated on:</strong> {form.generated_at.strftime('%d/%m/%Y')}</p>
                <p><strong>Status:</strong> {form.status.title()}</p>
                <p><strong>Total Employees:</strong> {form.total_employees}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>S.No.</th>
                        <th>Employee Name</th>
                        <th>Employee ID</th>
        """
        
        if form.template.form_type == 'register_of_fines':
            html_content += """
                        <th>Fine Amount (₹)</th>
                        <th>Reason</th>
                        <th>Date</th>
            """
        else:
            html_content += """
                        <th>Date of Birth</th>
                        <th>Sex</th>
                        <th>Father's/Husband's Name</th>
                        <th>Nature of Employment</th>
                        <th>Permanent Address</th>
                        <th>Local Address</th>
                        <th>Date of Commencement</th>
                        <th>Date of Termination</th>
                        <th>Reasons for Termination</th>
                        <th>Remarks</th>
            """
        
        html_content += """
                    </tr>
                </thead>
                <tbody>
        """
        
        for i, entry in enumerate(entries, 1):
            html_content += f"""
                    <tr>
                        <td>{i}</td>
                        <td>{entry.employee.full_name}</td>
                        <td>{entry.employee.employee_id}</td>
            """
            
            if form.template.form_type == 'register_of_fines':
                html_content += f"""
                        <td>₹{entry.fine_amount or '0.00'}</td>
                        <td>{entry.fine_reason or 'No fine'}</td>
                        <td>{entry.fine_date.strftime('%d/%m/%Y') if entry.fine_date else '-'}</td>
                """
            else:
                html_content += f"""
                        <td>{entry.employee.date_of_birth.strftime('%d/%m/%Y') if entry.employee.date_of_birth else '-'}</td>
                        <td>{entry.employee.gender.title() if entry.employee.gender else '-'}</td>
                        <td>{entry.father_husband_name or '-'}</td>
                        <td>{entry.nature_of_employment or entry.designation or '-'}</td>
                        <td>{entry.permanent_address or '-'}</td>
                        <td>{entry.local_address or '-'}</td>
                        <td>{entry.joining_date.strftime('%d/%m/%Y') if entry.joining_date else '-'}</td>
                        <td>{entry.termination_date.strftime('%d/%m/%Y') if entry.termination_date else '-'}</td>
                        <td>{entry.termination_reason or '-'}</td>
                        <td>{entry.remarks or '-'}</td>
                """
            
            html_content += "</tr>"
        
        html_content += """
                </tbody>
            </table>
        </body>
        </html>
        """
        
        from django.http import HttpResponse
        response = HttpResponse(html_content, content_type='text/html')
        filename = f"{form.template.template_name.replace(' ', '_')}_{form.month.strftime('%Y_%m')}.html"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Allow-Origin'] = '*'
        
        return response

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


def export_monthly_form_pdf(request, form_id):
    """Direct PDF export function that bypasses DRF"""
    session_key = request.GET.get('session_key')
    if not session_key:
        return HttpResponse('Session key required', status=401)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        form = get_object_or_404(MonthlyComplianceForm, id=form_id, company=session.service_user.company)
        
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            import io
            
            # Get employee entries
            entries = EmployeeFormEntry.objects.filter(monthly_form=form).select_related('employee')
            
            # Create PDF buffer
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
            
            # Container for the 'Flowable' objects
            elements = []
            
            # Define styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=30,
                alignment=1  # Center alignment
            )
            
            # Add title and header info
            elements.append(Paragraph(session.service_user.company.name, title_style))
            elements.append(Paragraph(form.template.template_name, title_style))
            elements.append(Spacer(1, 12))
            
            # Add form details
            form_info = f"""<b>Month:</b> {form.month.strftime('%B %Y')}<br/>
                           <b>Generated on:</b> {form.generated_at.strftime('%d/%m/%Y')}<br/>
                           <b>Status:</b> {form.status.title()}<br/>
                           <b>Total Employees:</b> {form.total_employees}"""
            elements.append(Paragraph(form_info, styles['Normal']))
            elements.append(Spacer(1, 20))
            
            # Create table data based on template structure
            if hasattr(form.template, 'template_structure') and form.template.template_structure and form.template.template_structure.get('fields'):
                # Dynamic template - use parsed structure
                fields = form.template.template_structure['fields']
                headers = ['S.No.'] + [field['name'] for field in fields]
                table_data = [headers]
                
                for i, entry in enumerate(entries, 1):
                    row = [str(i)]
                    for field in fields:
                        field_name = field['name']
                        # Check dynamic_data first, then fallback to legacy fields
                        if hasattr(entry, 'dynamic_data') and entry.dynamic_data and field_name in entry.dynamic_data:
                            value = entry.dynamic_data[field_name]
                        else:
                            # Fallback to legacy field mapping
                            field_lower = field_name.lower().strip()
                            if 'employee id' in field_lower:
                                value = entry.employee.employee_id
                            elif 'name' in field_lower and 'surname' in field_lower:
                                value = entry.employee.full_name
                            elif field_lower in ['name', 'employee name']:
                                value = entry.employee.full_name
                            elif 'department' in field_lower:
                                value = entry.employee.department.name if entry.employee.department else ''
                            elif 'designation' in field_lower:
                                value = entry.employee.designation.title if entry.employee.designation else ''
                            elif 'date of birth' in field_lower:
                                value = entry.employee.date_of_birth.strftime('%d/%m/%Y') if entry.employee.date_of_birth else ''
                            elif field_lower in ['sex', 'gender']:
                                value = entry.employee.gender.title() if entry.employee.gender else ''
                            elif 'father' in field_lower or 'husband' in field_lower:
                                value = getattr(entry.employee, 'father_husband_name', '') or ''
                            elif 'nature of employment' in field_lower:
                                value = getattr(entry.employee, 'nature_of_employment', '') or (entry.employee.designation.title if entry.employee.designation else '')
                            elif 'permanent address' in field_lower:
                                value = getattr(entry, 'permanent_address', '') or ''
                            elif 'local address' in field_lower:
                                value = getattr(entry, 'local_address', '') or ''
                            elif 'date of joining' in field_lower or 'date of commencement' in field_lower:
                                value = entry.employee.date_of_joining.strftime('%d/%m/%Y') if entry.employee.date_of_joining else ''
                            elif 'date of termination' in field_lower:
                                value = getattr(entry.employee, 'termination_date', None)
                                value = value.strftime('%d/%m/%Y') if value else ''
                            elif 'basic wage' in field_lower or 'basic salary' in field_lower:
                                value = str(entry.employee.base_salary) if entry.employee.base_salary else '0'
                            elif 'fine amount' in field_lower:
                                value = str(getattr(entry, 'fine_amount', 0) or 0)
                            elif 'advance amount' in field_lower:
                                value = '0'  # Default for advance
                            elif 'purpose' in field_lower:
                                value = getattr(entry, 'purpose', '') or ''
                            elif 'installment' in field_lower:
                                value = getattr(entry, 'installments', '') or ''
                            elif 'monthly deduction' in field_lower:
                                value = getattr(entry, 'monthly_deduction', '') or ''
                            elif 'balance outstanding' in field_lower:
                                value = getattr(entry, 'balance_outstanding', '') or ''
                            elif 'remarks' in field_lower:
                                value = getattr(entry, 'remarks', '') or getattr(entry.employee, 'employee_remarks', '') or ''
                            else:
                                value = '-'
                        
                        row.append(str(value) if value else '-')
                    table_data.append(row)
            elif form.template.form_type == 'register_of_fines':
                # Legacy fines template
                table_data = [['S.No.', 'Employee Name', 'Employee ID', 'Fine Amount (₹)', 'Reason', 'Date']]
                for i, entry in enumerate(entries, 1):
                    table_data.append([
                        str(i),
                        f"{entry.employee.first_name} {entry.employee.last_name}",
                        entry.employee.employee_id,
                        f"₹{entry.fine_amount or '0.00'}",
                        entry.fine_reason or 'No fine',
                        entry.fine_date.strftime('%d/%m/%Y') if entry.fine_date else '-'
                    ])
            else:
                # Legacy workmen template
                table_data = [[
                    'S.No.', 'Employee ID', 'Name & Surname', 'Date of Birth', 'Sex', 
                    "Father's/Husband's Name", 'Nature of Employment', 'Permanent Address', 
                    'Local Address', 'Date of Commencement', 'Date of Termination', 
                    'Reasons for Termination', 'Remarks'
                ]]
                for i, entry in enumerate(entries, 1):
                    table_data.append([
                        str(i),
                        entry.employee.employee_id,
                        f"{entry.employee.first_name} {entry.employee.last_name}",
                        entry.employee.date_of_birth.strftime('%d/%m/%Y') if entry.employee.date_of_birth else '-',
                        entry.employee.gender.title() if entry.employee.gender else '-',
                        entry.father_husband_name or '-',
                        entry.nature_of_employment or entry.designation or '-',
                        entry.permanent_address or '-',
                        entry.local_address or '-',
                        entry.joining_date.strftime('%d/%m/%Y') if entry.joining_date else '-',
                        entry.termination_date.strftime('%d/%m/%Y') if entry.termination_date else '-',
                        entry.termination_reason or '-',
                        entry.remarks or '-'
                    ])
            
            # Create table
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(table)
            
            # Build PDF
            doc.build(elements)
            
            # Get PDF data
            pdf_data = buffer.getvalue()
            buffer.close()
            
            # Create response
            response = HttpResponse(pdf_data, content_type='application/pdf')
            filename = f"{form.template.template_name.replace(' ', '_')}_{form.month.strftime('%Y_%m')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_data)
            
            return response
            
        except ImportError:
            # Fallback to HTML if reportlab is not available
            entries = EmployeeFormEntry.objects.filter(monthly_form=form).select_related('employee')
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>{form.template.template_name}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                    th {{ background-color: #f2f2f2; font-weight: bold; }}
                    .header {{ text-align: center; margin-bottom: 30px; }}
                    .info {{ margin-bottom: 20px; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>{session.service_user.company.name}</h1>
                    <h2>{form.template.template_name}</h2>
                </div>
                
                <div class="info">
                    <p><strong>Month:</strong> {form.month.strftime('%B %Y')}</p>
                    <p><strong>Generated on:</strong> {form.generated_at.strftime('%d/%m/%Y')}</p>
                    <p><strong>Status:</strong> {form.status.title()}</p>
                    <p><strong>Total Employees:</strong> {form.total_employees}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>S.No.</th>
                            <th>Employee Name</th>
                            <th>Employee ID</th>
            """
            
            if form.template.form_type == 'register_of_fines':
                html_content += """
                            <th>Fine Amount (₹)</th>
                            <th>Reason</th>
                            <th>Date</th>
                """
            else:
                html_content += """
                            <th>Department</th>
                            <th>Designation</th>
                            <th>Basic Wage (₹)</th>
                            <th>Joining Date</th>
                """
            
            html_content += """
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for i, entry in enumerate(entries, 1):
                html_content += f"""
                        <tr>
                            <td>{i}</td>
                            <td>{entry.employee.first_name} {entry.employee.last_name}</td>
                            <td>{entry.employee.employee_id}</td>
                """
                
                if form.template.form_type == 'register_of_fines':
                    html_content += f"""
                            <td>₹{entry.fine_amount or '0.00'}</td>
                            <td>{entry.fine_reason or 'No fine'}</td>
                            <td>{entry.fine_date.strftime('%d/%m/%Y') if entry.fine_date else '-'}</td>
                    """
                else:
                    html_content += f"""
                            <td>{entry.department or '-'}</td>
                            <td>{entry.designation or '-'}</td>
                            <td>₹{entry.basic_wage or '0.00'}</td>
                            <td>{entry.joining_date.strftime('%d/%m/%Y') if entry.joining_date else '-'}</td>
                    """
                
                html_content += "</tr>"
            
            html_content += """
                    </tbody>
                </table>
            </body>
            </html>
            """
            
            response = HttpResponse(html_content, content_type='text/html')
            filename = f"{form.template.template_name.replace(' ', '_')}_{form.month.strftime('%Y_%m')}.html"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
    except ServiceUserSession.DoesNotExist:
        return HttpResponse('Invalid session', status=401)
    except Exception as e:
        logger.error(f"PDF export error: {str(e)}")
        return HttpResponse(f'Export failed: {str(e)}', status=500)