from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from datetime import datetime, timedelta, date
from decimal import Decimal

from authentication.models import ServiceUserSession
from .models import (
    PayrollCycle, Payslip, PayrollSettings, SalaryComponent, PayrollReport,
    Employee, Attendance
)
from .payroll_serializers import (
    PayrollCycleSerializer, PayslipSerializer, PayrollSettingsSerializer,
    SalaryComponentSerializer, PayrollReportSerializer, PayrollCalculationSerializer,
    PayslipBulkUpdateSerializer, PayrollDashboardSerializer
)


class PayrollViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PayrollCycleSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PayrollCycle.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PayrollCycle.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return PayrollCycle.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            data = request.data.copy()
            data.pop('session_key', None)
            
            serializer = self.get_serializer(data=data)
            if not serializer.is_valid():
                return Response({'error': 'Validation failed', 'details': serializer.errors}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            payroll_cycle = serializer.save(company=session.service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            # Get current/latest payroll cycle
            current_cycle = PayrollCycle.objects.filter(company=company).first()
            
            # Employee statistics
            total_employees = Employee.objects.filter(company=company, status='active').count()
            
            # Payslip statistics
            if current_cycle:
                pending_payslips = current_cycle.payslips.filter(status='draft').count()
                approved_payslips = current_cycle.payslips.filter(status='approved').count()
                total_gross = current_cycle.payslips.aggregate(Sum('gross_salary'))['gross_salary__sum'] or 0
                total_net = current_cycle.payslips.aggregate(Sum('net_salary'))['net_salary__sum'] or 0
            else:
                pending_payslips = approved_payslips = total_gross = total_net = 0
            
            # Statutory deductions summary
            statutory_deductions = {}
            if current_cycle:
                statutory_deductions = {
                    'total_pf': current_cycle.payslips.aggregate(Sum('pf_employee'))['pf_employee__sum'] or 0,
                    'total_esi': current_cycle.payslips.aggregate(Sum('esi_employee'))['esi_employee__sum'] or 0,
                    'total_pt': current_cycle.payslips.aggregate(Sum('professional_tax'))['professional_tax__sum'] or 0,
                    'total_tds': current_cycle.payslips.aggregate(Sum('tds'))['tds__sum'] or 0,
                }
            
            # Recent cycles
            recent_cycles = PayrollCycle.objects.filter(company=company)[:5]
            
            dashboard_data = {
                'current_cycle': PayrollCycleSerializer(current_cycle).data if current_cycle else None,
                'total_employees': total_employees,
                'pending_payslips': pending_payslips,
                'approved_payslips': approved_payslips,
                'total_gross_amount': total_gross,
                'total_net_amount': total_net,
                'statutory_deductions': statutory_deductions,
                'recent_cycles': PayrollCycleSerializer(recent_cycles, many=True).data
            }
            
            return Response(dashboard_data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=True, methods=['post'])
    def calculate_payroll(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            payroll_cycle = self.get_object()
            
            # Get payroll settings
            settings, created = PayrollSettings.objects.get_or_create(
                company=session.service_user.company,
                defaults={
                    'pf_enabled': True,
                    'esi_enabled': True,
                    'pt_enabled': True,
                    'tds_enabled': True
                }
            )
            
            # Get active employees
            employees = Employee.objects.filter(
                company=session.service_user.company,
                status='active'
            )
            
            payslips_created = 0
            total_gross = total_net = 0
            
            for employee in employees:
                # Get attendance data for the payroll period
                attendance_records = Attendance.objects.filter(
                    employee=employee,
                    date__gte=payroll_cycle.start_date,
                    date__lte=payroll_cycle.end_date
                )
                
                # Calculate working days and present days
                working_days = (payroll_cycle.end_date - payroll_cycle.start_date).days + 1
                present_days = attendance_records.filter(status__in=['present', 'late']).count()
                absent_days = working_days - present_days
                overtime_hours = attendance_records.aggregate(Sum('overtime_hours'))['overtime_hours__sum'] or 0
                
                # Create or update payslip
                payslip, created = Payslip.objects.get_or_create(
                    payroll_cycle=payroll_cycle,
                    employee=employee,
                    defaults={
                        'emp_id': employee.employee_id,
                        'emp_name': employee.full_name,
                        'emp_department': employee.department.name,
                        'emp_designation': employee.designation.title,
                        'working_days': working_days,
                        'present_days': present_days,
                        'absent_days': absent_days,
                        'overtime_hours': overtime_hours
                    }
                )
                
                # Calculate salary with enhanced statutory compliance
                payslip.calculate_salary()
                
                total_gross += payslip.gross_salary
                total_net += payslip.net_salary
                payslips_created += 1
            
            # Update payroll cycle totals
            payroll_cycle.total_employees = payslips_created
            payroll_cycle.total_gross = total_gross
            payroll_cycle.total_net = total_net
            payroll_cycle.total_deductions = total_gross - total_net
            payroll_cycle.status = 'calculated'
            payroll_cycle.calculated_by = session.service_user
            payroll_cycle.calculated_at = timezone.now()
            payroll_cycle.save()
            
            return Response({
                'message': f'Payroll calculated successfully for {payslips_created} employees',
                'total_gross': total_gross,
                'total_net': total_net,
                'payslips_created': payslips_created
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=True, methods=['post'])
    def approve_payroll(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            payroll_cycle = self.get_object()
            
            if payroll_cycle.status != 'calculated':
                return Response({'error': 'Payroll must be calculated before approval'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Update payroll cycle status
            payroll_cycle.status = 'approved'
            payroll_cycle.approved_by = session.service_user
            payroll_cycle.approved_at = timezone.now()
            payroll_cycle.save()
            
            # Update all payslips to approved
            payroll_cycle.payslips.update(status='approved')
            
            return Response({'message': 'Payroll approved successfully'})
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=True, methods=['post'])
    def process_payments(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            payroll_cycle = self.get_object()
            
            if payroll_cycle.status != 'approved':
                return Response({'error': 'Payroll must be approved before processing payments'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Update payroll cycle status
            payroll_cycle.status = 'completed'
            payroll_cycle.processed_by = session.service_user
            payroll_cycle.processed_at = timezone.now()
            payroll_cycle.save()
            
            # Update all payslips to paid
            payroll_cycle.payslips.update(
                status='paid',
                paid_date=timezone.now().date(),
                payment_reference=f'BATCH_{payroll_cycle.id}_{timezone.now().strftime("%Y%m%d")}'
            )
            
            return Response({'message': 'Payments processed successfully'})
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class PayslipViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PayslipSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Payslip.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = Payslip.objects.filter(
                employee__company=session.service_user.company
            ).select_related('employee', 'payroll_cycle')
            
            # Filter by payroll cycle
            cycle_id = self.request.query_params.get('cycle_id')
            if cycle_id:
                queryset = queryset.filter(payroll_cycle_id=cycle_id)
            
            # Filter by employee
            employee_id = self.request.query_params.get('employee_id')
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            
            # Filter by status
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return Payslip.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key


class PayrollSettingsViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PayrollSettingsSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PayrollSettings.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PayrollSettings.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return PayrollSettings.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Check if settings already exist
            existing_settings = PayrollSettings.objects.filter(company=session.service_user.company).first()
            if existing_settings:
                # Update existing settings
                data = request.data.copy()
                data.pop('session_key', None)
                serializer = self.get_serializer(existing_settings, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                # Create new settings
                data = request.data.copy()
                data.pop('session_key', None)
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                serializer.save(company=session.service_user.company)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def payroll_analytics(request):
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Monthly payroll trends (last 6 months)
        six_months_ago = date.today() - timedelta(days=180)
        monthly_trends = []
        
        cycles = PayrollCycle.objects.filter(
            company=company,
            start_date__gte=six_months_ago,
            status='completed'
        ).order_by('start_date')
        
        for cycle in cycles:
            monthly_trends.append({
                'month': cycle.start_date.strftime('%Y-%m'),
                'total_gross': float(cycle.total_gross),
                'total_net': float(cycle.total_net),
                'total_employees': cycle.total_employees
            })
        
        # Department-wise salary distribution
        dept_distribution = []
        departments = Employee.objects.filter(
            company=company,
            status='active'
        ).values('department__name').annotate(
            avg_salary=Avg('base_salary'),
            employee_count=Count('id')
        )
        
        for dept in departments:
            dept_distribution.append({
                'department': dept['department__name'],
                'avg_salary': float(dept['avg_salary'] or 0),
                'employee_count': dept['employee_count']
            })
        
        # Statutory compliance summary
        latest_cycle = PayrollCycle.objects.filter(company=company).first()
        compliance_summary = {}
        
        if latest_cycle:
            compliance_summary = {
                'pf_compliance': {
                    'total_employee_contribution': float(latest_cycle.payslips.aggregate(Sum('pf_employee'))['pf_employee__sum'] or 0),
                    'total_employer_contribution': float(latest_cycle.payslips.aggregate(Sum('pf_employer'))['pf_employer__sum'] or 0)
                },
                'esi_compliance': {
                    'total_employee_contribution': float(latest_cycle.payslips.aggregate(Sum('esi_employee'))['esi_employee__sum'] or 0),
                    'total_employer_contribution': float(latest_cycle.payslips.aggregate(Sum('esi_employer'))['esi_employer__sum'] or 0)
                },
                'tax_deductions': {
                    'professional_tax': float(latest_cycle.payslips.aggregate(Sum('professional_tax'))['professional_tax__sum'] or 0),
                    'tds': float(latest_cycle.payslips.aggregate(Sum('tds'))['tds__sum'] or 0)
                }
            }
        
        return Response({
            'monthly_trends': monthly_trends,
            'department_distribution': dept_distribution,
            'compliance_summary': compliance_summary
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)