from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from calendar import monthrange
from datetime import datetime, timedelta, date
from decimal import Decimal

from authentication.models import ServiceUserSession
from .security_utils import SecurityValidator, secure_session_check
from .error_handlers import handle_compliance_errors, safe_get_session, log_compliance_action, ComplianceError
from .statutory_models import (
    StatutorySettings,
    EmployeeStatutoryDetails,
    GovernmentReturn,
    ComplianceAlert,
    PayslipStatutoryDetails,
    MinimumWageRate,
    LaborLawCompliance
)
from .statutory_serializers import (
    StatutorySettingsSerializer,
    EmployeeStatutoryDetailsSerializer,
    GovernmentReturnSerializer,
    ComplianceAlertSerializer,
    PayslipStatutoryDetailsSerializer,
    MinimumWageRateSerializer,
    LaborLawComplianceSerializer,
    StatutoryComplianceDashboardSerializer,
    PFECRSerializer,
    ESIReturnSerializer,
    ProfessionalTaxReturnSerializer,
    TDS24QSerializer,
    Form16Serializer,
    BankAdviceSerializer,
    ComplianceValidationSerializer
)
from .models import Employee, Payslip, PayrollCycle


def _next_month_due_date(year, month, day):
    """Return a due date in the month following the payroll period."""
    if month == 12:
        return date(year + 1, 1, day)
    return date(year, month + 1, day)


def _approved_period_payslips(company, month, year, employee_ids=None):
    """Use immutable payroll output as the source for statutory returns."""
    period_start = date(year, month, 1)
    period_end = date(year, month, monthrange(year, month)[1])
    payslips = Payslip.objects.filter(
        employee__company=company,
        status__in=['approved', 'paid'],
        payroll_cycle__start_date__lte=period_end,
        payroll_cycle__end_date__gte=period_start,
    ).select_related('employee', 'payroll_cycle', 'statutory_details')
    if employee_ids:
        payslips = payslips.filter(employee_id__in=employee_ids)
    return payslips.order_by('employee_id', '-updated_at')


def _require_period_payslips(company, month, year, employee_ids=None):
    payslips = list(_approved_period_payslips(company, month, year, employee_ids))
    if not payslips:
        return None, Response(
            {'error': 'Approve payroll for the selected period before generating a statutory return.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    seen_employees = set()
    duplicates = set()
    for payslip in payslips:
        if payslip.employee_id in seen_employees:
            duplicates.add(payslip.emp_name or payslip.employee.full_name)
        seen_employees.add(payslip.employee_id)
    if duplicates:
        return None, Response(
            {'error': 'Multiple approved payroll cycles overlap this period.', 'employees': sorted(duplicates)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return payslips, None


def _decimal_string(value):
    return format(Decimal(value or 0).quantize(Decimal('0.01')), 'f')


class StatutorySettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing statutory settings"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = StatutorySettingsSerializer

    def get_queryset(self):
        try:
            session_key = secure_session_check(self.request)
            if not session_key:
                return StatutorySettings.objects.none()
            
            session = safe_get_session(session_key)
            return StatutorySettings.objects.filter(company=session.service_user.company)
        except (ComplianceError, Exception):
            return StatutorySettings.objects.none()

    def get_session_key(self):
        return secure_session_check(self.request)

    @handle_compliance_errors
    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        session = safe_get_session(session_key)
        
        # Sanitize input data
        data = {k: SecurityValidator.sanitize_input(v) for k, v in request.data.items()}
        data.pop('session_key', None)
        
        # Check if settings already exist
        existing_settings = StatutorySettings.objects.filter(company=session.service_user.company).first()
        if existing_settings:
            serializer = self.get_serializer(existing_settings, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            log_compliance_action('UPDATE_STATUTORY_SETTINGS', session.service_user.company, session.service_user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=session.service_user.company)
            log_compliance_action('CREATE_STATUTORY_SETTINGS', session.service_user.company, session.service_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmployeeStatutoryDetailsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing employee statutory details"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = EmployeeStatutoryDetailsSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return EmployeeStatutoryDetails.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return EmployeeStatutoryDetails.objects.filter(
                employee__company=session.service_user.company
            ).select_related('employee')
        except ServiceUserSession.DoesNotExist:
            return EmployeeStatutoryDetails.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key


class GovernmentReturnViewSet(viewsets.ModelViewSet):
    """ViewSet for managing government returns"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = GovernmentReturnSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return GovernmentReturn.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = GovernmentReturn.objects.filter(company=session.service_user.company)
            
            # Filter by return type
            return_type = self.request.query_params.get('return_type')
            if return_type:
                queryset = queryset.filter(return_type=return_type)
            
            # Filter by status
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            # Filter by year
            year = self.request.query_params.get('year')
            if year:
                queryset = queryset.filter(period_year=year)
            
            return queryset.order_by('-period_year', '-period_month')
        except ServiceUserSession.DoesNotExist:
            return GovernmentReturn.objects.none()

    @action(detail=True, methods=['get'])
    def view_return(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            gov_return = self.get_object()
            serializer = self.get_serializer(gov_return)
            return Response(serializer.data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=True, methods=['post'])
    def submit_return(self, request, pk=None):
        """Record filing completed on the official portal.

        This application does not submit to EPFO/ESIC/TRACES. It records the
        acknowledgment returned by the relevant government portal.
        """
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            gov_return = self.get_object()
            if gov_return.status != 'generated':
                return Response({'error': 'Return must be generated before filing can be recorded'}, status=status.HTTP_400_BAD_REQUEST)

            acknowledgment_number = str(request.data.get('acknowledgment_number', '')).strip()
            if not acknowledgment_number:
                return Response(
                    {'error': 'Government portal acknowledgment number is required'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            filed_date_value = request.data.get('filed_date')
            try:
                filed_date = datetime.strptime(filed_date_value, '%Y-%m-%d').date() if filed_date_value else date.today()
            except (TypeError, ValueError):
                return Response({'error': 'Filed date must be in YYYY-MM-DD format'}, status=status.HTTP_400_BAD_REQUEST)
            if filed_date > date.today():
                return Response({'error': 'Filed date cannot be in the future'}, status=status.HTTP_400_BAD_REQUEST)

            gov_return.status = 'filed'
            gov_return.filed_date = filed_date
            gov_return.acknowledgment_number = acknowledgment_number
            gov_return.save(update_fields=['status', 'filed_date', 'acknowledgment_number', 'updated_at'])
            log_compliance_action('RECORD_GOVERNMENT_RETURN_FILING', gov_return.company, session.service_user)
            return Response({
                'message': 'Government portal filing recorded successfully',
                'acknowledgment_number': gov_return.acknowledgment_number,
            })
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key


class ComplianceAlertViewSet(viewsets.ModelViewSet):
    """ViewSet for managing compliance alerts"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = ComplianceAlertSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return ComplianceAlert.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = ComplianceAlert.objects.filter(company=session.service_user.company)
            
            # Filter by resolved status
            is_resolved = self.request.query_params.get('is_resolved')
            if is_resolved is not None:
                queryset = queryset.filter(is_resolved=is_resolved.lower() == 'true')
            
            # Filter by priority
            priority = self.request.query_params.get('priority')
            if priority:
                queryset = queryset.filter(priority=priority)
            
            return queryset.order_by('-priority', '-created_at')
        except ServiceUserSession.DoesNotExist:
            return ComplianceAlert.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark alert as resolved"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            alert = self.get_object()
            
            alert.is_resolved = True
            alert.resolved_date = timezone.now()
            alert.resolved_by = session.service_user
            alert.save()
            
            serializer = self.get_serializer(alert)
            return Response(serializer.data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@handle_compliance_errors
def statutory_compliance_dashboard(request):
    """Get statutory compliance dashboard data"""
    session_key = secure_session_check(request)
    session = safe_get_session(session_key)
    company = session.service_user.company

    statutory_settings = StatutorySettings.objects.filter(company=company).first()
    employees = Employee.objects.filter(company=company, status='active')
    latest_cycle = PayrollCycle.objects.filter(
        company=company,
        status__in=['approved', 'completed']
    ).order_by('-end_date', '-updated_at').first()
    latest_payslips = Payslip.objects.none()
    if latest_cycle:
        latest_payslips = Payslip.objects.filter(
            payroll_cycle=latest_cycle,
            status__in=['approved', 'paid']
        )

    pf_ceiling = statutory_settings.pf_ceiling if statutory_settings else Decimal('15000')
    esi_ceiling = statutory_settings.esi_ceiling if statutory_settings else Decimal('21000')
    pf_eligible = employees.filter(
        Q(base_salary__lte=pf_ceiling) |
        Q(uan_number__gt='') |
        Q(pf_number__gt='') |
        Q(statutory_details__uan_number__gt='') |
        Q(statutory_details__pf_account_number__gt='')
    ).distinct()
    pf_contributions = latest_payslips.aggregate(
        employee=Sum('pf_employee'), employer=Sum('pf_employer')
    )
    esi_contributions = latest_payslips.aggregate(
        employee=Sum('esi_employee'), employer=Sum('esi_employer')
    )

    pf_compliance = {
        'enabled': statutory_settings.pf_enabled if statutory_settings else False,
        'total_employees': employees.count(),
        'eligible_employees': pf_eligible.count(),
        'monthly_contribution': (
            (pf_contributions['employee'] or Decimal('0')) +
            (pf_contributions['employer'] or Decimal('0'))
        )
    }

    esi_compliance = {
        'enabled': statutory_settings.esi_enabled if statutory_settings else False,
        'total_employees': employees.count(),
        'eligible_employees': employees.filter(base_salary__lte=esi_ceiling).count(),
        'monthly_contribution': (
            (esi_contributions['employee'] or Decimal('0')) +
            (esi_contributions['employer'] or Decimal('0'))
        )
    }

    pt_compliance = {
        'enabled': statutory_settings.pt_enabled if statutory_settings else False,
        'state': statutory_settings.pt_state if statutory_settings else '',
        'total_employees': latest_payslips.filter(professional_tax__gt=0).count()
    }

    tds_compliance = {
        'enabled': statutory_settings.tds_enabled if statutory_settings else False,
        'total_employees': employees.count(),
        'taxable_employees': latest_payslips.filter(tds__gt=0).count()
    }

    GovernmentReturn.objects.filter(
        company=company,
        status__in=['pending', 'generated'],
        due_date__lt=timezone.localdate()
    ).update(status='overdue')

    pending_returns = list(GovernmentReturn.objects.filter(
        company=company,
        status__in=['pending', 'generated']
    ).values('return_type', 'period_month', 'period_year', 'due_date'))

    overdue_returns = list(GovernmentReturn.objects.filter(
        company=company,
        status='overdue'
    ).values('return_type', 'period_month', 'period_year', 'due_date'))

    recent_alerts = list(ComplianceAlert.objects.filter(
        company=company,
        is_resolved=False
    ).order_by('-created_at')[:5].values('title', 'priority', 'due_date', 'created_at'))

    configured_schemes = []
    if statutory_settings:
        scheme_checks = [
            (statutory_settings.pf_enabled, bool(statutory_settings.pf_establishment_code)),
            (statutory_settings.esi_enabled, bool(statutory_settings.esi_employer_code)),
            (
                statutory_settings.pt_enabled,
                bool(statutory_settings.pt_registration_number and statutory_settings.pt_state)
            ),
            (statutory_settings.tds_enabled, bool(statutory_settings.tan_number)),
        ]
        configured_schemes = [is_configured for enabled, is_configured in scheme_checks if enabled]

    total_compliance_items = len(configured_schemes)
    compliant_items = sum(configured_schemes)
    percentage = (
        compliant_items / total_compliance_items * 100
        if total_compliance_items else 0
    )
    if not total_compliance_items:
        readiness_status = 'Not Configured'
    elif compliant_items < total_compliance_items or overdue_returns:
        readiness_status = 'Needs Attention'
    else:
        readiness_status = 'Configuration Ready'

    compliance_summary = {
        'total_items': total_compliance_items,
        'compliant_items': compliant_items,
        'compliance_percentage': round(percentage, 2),
        'status': readiness_status
    }
    
    dashboard_data = {
        'pf_compliance': pf_compliance,
        'esi_compliance': esi_compliance,
        'pt_compliance': pt_compliance,
        'tds_compliance': tds_compliance,
        'pending_returns': pending_returns,
        'overdue_returns': overdue_returns,
        'recent_alerts': recent_alerts,
        'compliance_summary': compliance_summary
    }
    
    log_compliance_action('VIEW_COMPLIANCE_DASHBOARD', company, session.service_user)
    return Response(dashboard_data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_pf_ecr(request):
    """Generate PF ECR (Electronic Challan cum Return)"""
    auth_header = request.headers.get('Authorization', '')
    session_key = auth_header[7:] if auth_header.startswith('Bearer ') else None
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        serializer = PFECRSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        period_month = data['period_month']
        period_year = data['period_year']
        
        payslips, error_response = _require_period_payslips(
            company, period_month, period_year, data.get('include_employees')
        )
        if error_response:
            return error_response

        gov_return, created = GovernmentReturn.objects.get_or_create(
            company=company,
            return_type='pf_ecr',
            period_month=period_month,
            period_year=period_year,
            defaults={
                'due_date': _next_month_due_date(period_year, period_month, 15),
                'created_by': session.service_user
            }
        )
        if not created and gov_return.status == 'filed':
            return Response(
                {'error': 'This PF return is already filed and cannot be regenerated'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        gov_return.due_date = _next_month_due_date(period_year, period_month, 15)
        
        ecr_data = {
            'establishment_code': company.statutory_settings.pf_establishment_code if hasattr(company, 'statutory_settings') else '',
            'period': f"{period_month:02d}/{period_year}",
            'employees': []
        }
        
        total_wages = Decimal('0')
        total_pf_contribution = Decimal('0')

        for payslip in payslips:
            statutory_details = getattr(payslip, 'statutory_details', None)
            wages = statutory_details.pf_wages if statutory_details else payslip.basic_salary
            employee_contribution = payslip.pf_employee
            employer_contribution = payslip.pf_employer
            if employee_contribution <= 0 and employer_contribution <= 0:
                continue
            employee_data = {
                'employee_id': payslip.emp_id or payslip.employee.employee_id,
                'uan': payslip.employee.uan_number,
                'name': payslip.emp_name or payslip.employee.full_name,
                'wages': _decimal_string(wages),
                'employee_contribution': _decimal_string(employee_contribution),
                'employer_contribution': _decimal_string(employer_contribution),
                'eps_contribution': _decimal_string(statutory_details.eps_contribution if statutory_details else 0),
            }
            ecr_data['employees'].append(employee_data)
            total_wages += wages
            total_pf_contribution += employee_contribution + employer_contribution
        
        # Update government return
        gov_return.return_data = ecr_data
        gov_return.total_employees = len(ecr_data['employees'])
        gov_return.total_wages = total_wages.quantize(Decimal('0.01'))
        gov_return.total_contribution = total_pf_contribution.quantize(Decimal('0.01'))
        gov_return.status = 'generated'
        gov_return.generated_date = date.today()
        gov_return.save()
        
        return Response({
            'message': 'PF ECR generated successfully',
            'return_id': gov_return.id,
            'total_employees': gov_return.total_employees,
            'total_wages': gov_return.total_wages,
            'total_contribution': gov_return.total_contribution
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_esi_return(request):
    """Generate ESI return"""
    auth_header = request.headers.get('Authorization', '')
    session_key = auth_header[7:] if auth_header.startswith('Bearer ') else None
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        serializer = ESIReturnSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        period_month = data['period_month']
        period_year = data['period_year']

        payslips, error_response = _require_period_payslips(
            company, period_month, period_year, data.get('include_employees')
        )
        if error_response:
            return error_response

        gov_return, created = GovernmentReturn.objects.get_or_create(
            company=company,
            return_type='esi_return',
            period_month=period_month,
            period_year=period_year,
            defaults={
                'due_date': _next_month_due_date(period_year, period_month, 21),
                'created_by': session.service_user
            }
        )
        if not created and gov_return.status == 'filed':
            return Response(
                {'error': 'This ESI return is already filed and cannot be regenerated'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        gov_return.due_date = _next_month_due_date(period_year, period_month, 21)
        
        esi_data = {
            'employer_code': company.statutory_settings.esi_employer_code if hasattr(company, 'statutory_settings') else '',
            'period': f"{period_month:02d}/{period_year}",
            'employees': []
        }
        
        total_wages = Decimal('0')
        total_esi_contribution = Decimal('0')

        for payslip in payslips:
            statutory_details = getattr(payslip, 'statutory_details', None)
            wages = statutory_details.esi_wages if statutory_details else payslip.gross_salary
            employee_contribution = payslip.esi_employee
            employer_contribution = payslip.esi_employer
            if employee_contribution <= 0 and employer_contribution <= 0:
                continue
            employee_data = {
                'employee_id': payslip.emp_id or payslip.employee.employee_id,
                'esi_number': payslip.employee.esi_number,
                'name': payslip.emp_name or payslip.employee.full_name,
                'wages': _decimal_string(wages),
                'employee_contribution': _decimal_string(employee_contribution),
                'employer_contribution': _decimal_string(employer_contribution),
                'contribution_days': statutory_details.esi_days if statutory_details else int(payslip.present_days),
            }
            esi_data['employees'].append(employee_data)
            total_wages += wages
            total_esi_contribution += employee_contribution + employer_contribution
        
        # Update government return
        gov_return.return_data = esi_data
        gov_return.total_employees = len(esi_data['employees'])
        gov_return.total_wages = total_wages.quantize(Decimal('0.01'))
        gov_return.total_contribution = total_esi_contribution.quantize(Decimal('0.01'))
        gov_return.status = 'generated'
        gov_return.generated_date = date.today()
        gov_return.save()
        
        return Response({
            'message': 'ESI return generated successfully',
            'return_id': gov_return.id,
            'total_employees': gov_return.total_employees,
            'total_wages': gov_return.total_wages,
            'total_contribution': gov_return.total_contribution
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def validate_compliance(request):
    """Validate statutory compliance for employees"""
    auth_header = request.headers.get('Authorization', '')
    session_key = auth_header[7:] if auth_header.startswith('Bearer ') else None
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        serializer = ComplianceValidationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        validation_type = data['validation_type']
        statutory_settings = StatutorySettings.objects.filter(company=company).first()

        scheme_flags = {
            'pf_calculation': 'pf_enabled',
            'esi_calculation': 'esi_enabled',
        }
        enabled_field = scheme_flags.get(validation_type)
        if enabled_field and (
            not statutory_settings or not getattr(statutory_settings, enabled_field)
        ):
            return Response(
                {'error': f'{validation_type.replace("_calculation", "").upper()} is not enabled for this company'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        employees = Employee.objects.filter(company=company, status='active')
        if 'employee_ids' in data and data['employee_ids']:
            employees = employees.filter(id__in=data['employee_ids'])
        
        validation_results = []
        
        for employee in employees:
            result = {
                'employee_id': employee.employee_id,
                'employee_name': employee.full_name,
                'validation_type': validation_type,
                'is_compliant': True,
                'issues': []
            }

            employee_statutory = getattr(employee, 'statutory_details', None)
            
            if validation_type == 'pf_calculation':
                existing_member = bool(
                    employee.uan_number
                    or employee.pf_number
                    or (employee_statutory and employee_statutory.uan_number)
                    or (employee_statutory and employee_statutory.pf_account_number)
                )
                eligible = employee.base_salary <= statutory_settings.pf_ceiling or existing_member
                if eligible and not existing_member:
                    result['is_compliant'] = False
                    result['issues'].append('UAN/PF account number missing for PF-eligible employee')
                if not eligible:
                    result['issues'].append('Employee is outside the configured PF eligibility ceiling')
            
            elif validation_type == 'esi_calculation':
                eligible = employee.base_salary <= statutory_settings.esi_ceiling
                has_esi_number = bool(
                    employee.esi_number
                    or (employee_statutory and employee_statutory.esi_ip_number)
                )
                if eligible and not has_esi_number:
                    result['is_compliant'] = False
                    result['issues'].append('ESI number missing for eligible employee')
                if not eligible:
                    result['issues'].append('Employee is outside the configured ESI eligibility ceiling')
            
            elif validation_type == 'minimum_wage':
                employee_state = employee.permanent_state or employee.state
                wage_category = (
                    employee_statutory.wage_category if employee_statutory else 'skilled'
                )
                today = timezone.localdate()
                min_wage = MinimumWageRate.objects.filter(
                    state__iexact=employee_state,
                    category=wage_category,
                    is_active=True,
                    effective_from__lte=today,
                ).filter(
                    Q(effective_to__isnull=True) | Q(effective_to__gte=today)
                ).order_by('-effective_from').first()
                
                if min_wage and employee.base_salary < min_wage.monthly_rate:
                    result['is_compliant'] = False
                    result['issues'].append(f'Salary below minimum wage: ₹{min_wage.monthly_rate}')
                elif not employee_state:
                    result['is_compliant'] = False
                    result['issues'].append('Employee permanent state is missing')
                elif not min_wage:
                    result['is_compliant'] = False
                    result['issues'].append(
                        f'No active minimum wage rate configured for {employee_state} ({wage_category})'
                    )
            
            validation_results.append(result)
        
        # Summary
        total_employees = len(validation_results)
        compliant_employees = sum(1 for r in validation_results if r['is_compliant'])
        
        return Response({
            'validation_type': validation_type,
            'total_employees': total_employees,
            'compliant_employees': compliant_employees,
            'compliance_percentage': (compliant_employees / total_employees * 100) if total_employees > 0 else 0,
            'results': validation_results
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_pt_return(request):
    auth_header = request.headers.get('Authorization', '')
    session_key = auth_header[7:] if auth_header.startswith('Bearer ') else None
    if not session_key:
        session_key = request.data.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        serializer = ProfessionalTaxReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        period_month = serializer.validated_data['period_month']
        period_year = serializer.validated_data['period_year']

        payslips, error_response = _require_period_payslips(company, period_month, period_year)
        if error_response:
            return error_response

        gov_return, created = GovernmentReturn.objects.get_or_create(
            company=company,
            return_type='pt_return',
            period_month=period_month,
            period_year=period_year,
            defaults={
                'due_date': _next_month_due_date(period_year, period_month, 7),
                'created_by': session.service_user
            }
        )
        if not created and gov_return.status == 'filed':
            return Response(
                {'error': 'This Professional Tax return is already filed and cannot be regenerated'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        gov_return.due_date = _next_month_due_date(period_year, period_month, 7)

        rows = []
        total_wages = Decimal('0')
        total_pt_deduction = Decimal('0')
        for payslip in payslips:
            if payslip.professional_tax <= 0:
                continue
            rows.append({
                'employee_id': payslip.emp_id or payslip.employee.employee_id,
                'name': payslip.emp_name or payslip.employee.full_name,
                'gross_wages': _decimal_string(payslip.gross_salary),
                'professional_tax': _decimal_string(payslip.professional_tax),
            })
            total_wages += payslip.gross_salary
            total_pt_deduction += payslip.professional_tax

        settings = StatutorySettings.objects.filter(company=company).first()
        gov_return.return_data = {
            'registration_number': settings.pt_registration_number if settings else '',
            'state': settings.pt_state if settings else '',
            'period': f'{period_month:02d}/{period_year}',
            'employees': rows,
        }
        gov_return.total_employees = len(rows)
        gov_return.total_wages = total_wages.quantize(Decimal('0.01'))
        gov_return.total_contribution = total_pt_deduction.quantize(Decimal('0.01'))
        gov_return.status = 'generated'
        gov_return.generated_date = date.today()
        gov_return.save()
        
        return Response({'message': 'Professional Tax return generated successfully'})
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_tds_24q(request):
    auth_header = request.headers.get('Authorization', '')
    session_key = auth_header[7:] if auth_header.startswith('Bearer ') else None
    if not session_key:
        session_key = request.data.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        serializer = TDS24QSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        period_month = serializer.validated_data['period_month']
        period_year = serializer.validated_data['period_year']

        payslips, error_response = _require_period_payslips(company, period_month, period_year)
        if error_response:
            return error_response

        gov_return, created = GovernmentReturn.objects.get_or_create(
            company=company,
            return_type='tds_24q',
            period_month=period_month,
            period_year=period_year,
            defaults={
                'due_date': _next_month_due_date(period_year, period_month, 30),
                'created_by': session.service_user
            }
        )
        if not created and gov_return.status == 'filed':
            return Response(
                {'error': 'This TDS return is already filed and cannot be regenerated'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        gov_return.due_date = _next_month_due_date(period_year, period_month, 30)

        rows = []
        total_wages = Decimal('0')
        total_tds_deduction = Decimal('0')
        for payslip in payslips:
            if payslip.tds <= 0:
                continue
            rows.append({
                'employee_id': payslip.emp_id or payslip.employee.employee_id,
                'pan': payslip.employee.pan_number,
                'name': payslip.emp_name or payslip.employee.full_name,
                'gross_wages': _decimal_string(payslip.gross_salary),
                'tds': _decimal_string(payslip.tds),
            })
            total_wages += payslip.gross_salary
            total_tds_deduction += payslip.tds

        settings = StatutorySettings.objects.filter(company=company).first()
        gov_return.return_data = {
            'tan_number': settings.tan_number if settings else '',
            'period': f'{period_month:02d}/{period_year}',
            'employees': rows,
        }
        gov_return.total_employees = len(rows)
        gov_return.total_wages = total_wages.quantize(Decimal('0.01'))
        gov_return.total_contribution = total_tds_deduction.quantize(Decimal('0.01'))
        gov_return.status = 'generated'
        gov_return.generated_date = date.today()
        gov_return.save()
        
        return Response({'message': 'TDS 24Q return generated successfully'})
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
