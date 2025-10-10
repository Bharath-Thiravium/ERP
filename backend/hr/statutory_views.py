from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta, date
from decimal import Decimal

from authentication.models import ServiceUserSession
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


class StatutorySettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing statutory settings"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = StatutorySettingsSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return StatutorySettings.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return StatutorySettings.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return StatutorySettings.objects.none()

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
            existing_settings = StatutorySettings.objects.filter(company=session.service_user.company).first()
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
def statutory_compliance_dashboard(request):
    """Get statutory compliance dashboard data"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Get statutory settings
        statutory_settings = StatutorySettings.objects.filter(company=company).first()
        
        # PF Compliance Summary
        pf_compliance = {
            'enabled': statutory_settings.pf_enabled if statutory_settings else False,
            'total_employees': 0,
            'eligible_employees': 0,
            'monthly_contribution': 0
        }
        
        if statutory_settings and statutory_settings.pf_enabled:
            employees = Employee.objects.filter(company=company, status='active')
            pf_compliance['total_employees'] = employees.count()
            pf_compliance['eligible_employees'] = employees.filter(base_salary__lte=statutory_settings.pf_ceiling).count()
        
        # ESI Compliance Summary
        esi_compliance = {
            'enabled': statutory_settings.esi_enabled if statutory_settings else False,
            'total_employees': 0,
            'eligible_employees': 0,
            'monthly_contribution': 0
        }
        
        if statutory_settings and statutory_settings.esi_enabled:
            employees = Employee.objects.filter(company=company, status='active')
            esi_compliance['total_employees'] = employees.count()
            esi_compliance['eligible_employees'] = employees.filter(base_salary__lte=statutory_settings.esi_ceiling).count()
        
        # Professional Tax Compliance
        pt_compliance = {
            'enabled': statutory_settings.pt_enabled if statutory_settings else False,
            'state': statutory_settings.pt_state if statutory_settings else 'Maharashtra',
            'total_employees': Employee.objects.filter(company=company, status='active').count()
        }
        
        # TDS Compliance
        tds_compliance = {
            'enabled': statutory_settings.tds_enabled if statutory_settings else False,
            'total_employees': Employee.objects.filter(company=company, status='active').count(),
            'taxable_employees': 0
        }
        
        # Pending Returns
        pending_returns = list(GovernmentReturn.objects.filter(
            company=company,
            status='pending'
        ).values('return_type', 'period_month', 'period_year', 'due_date'))
        
        # Overdue Returns
        overdue_returns = list(GovernmentReturn.objects.filter(
            company=company,
            status='overdue'
        ).values('return_type', 'period_month', 'period_year', 'due_date'))
        
        # Recent Alerts
        recent_alerts = list(ComplianceAlert.objects.filter(
            company=company,
            is_resolved=False
        ).order_by('-created_at')[:5].values('title', 'priority', 'due_date', 'created_at'))
        
        # Compliance Summary
        total_compliance_items = 4  # PF, ESI, PT, TDS
        compliant_items = sum([
            statutory_settings.pf_enabled if statutory_settings else 0,
            statutory_settings.esi_enabled if statutory_settings else 0,
            statutory_settings.pt_enabled if statutory_settings else 0,
            statutory_settings.tds_enabled if statutory_settings else 0,
        ])
        
        compliance_summary = {
            'total_items': total_compliance_items,
            'compliant_items': compliant_items,
            'compliance_percentage': (compliant_items / total_compliance_items) * 100,
            'status': 'Compliant' if compliant_items == total_compliance_items else 'Needs Attention'
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
        
        return Response(dashboard_data)
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_pf_ecr(request):
    """Generate PF ECR (Electronic Challan cum Return)"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
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
        
        # Get or create government return record
        gov_return, created = GovernmentReturn.objects.get_or_create(
            company=company,
            return_type='pf_ecr',
            period_month=period_month,
            period_year=period_year,
            defaults={
                'due_date': date(period_year, period_month + 1 if period_month < 12 else 1, 15),
                'created_by': session.service_user
            }
        )
        
        # Generate ECR data (simplified)
        employees = Employee.objects.filter(company=company, status='active')
        if 'include_employees' in data and data['include_employees']:
            employees = employees.filter(id__in=data['include_employees'])
        
        ecr_data = {
            'establishment_code': company.statutory_settings.pf_establishment_code if hasattr(company, 'statutory_settings') else '',
            'period': f"{period_month:02d}/{period_year}",
            'employees': []
        }
        
        total_wages = 0
        total_pf_contribution = 0
        
        for employee in employees:
            # Get payslip for the period (simplified)
            employee_data = {
                'uan': employee.uan_number,
                'name': employee.full_name,
                'wages': float(employee.base_salary),
                'pf_contribution': float(employee.base_salary * Decimal('0.12'))
            }
            ecr_data['employees'].append(employee_data)
            total_wages += employee_data['wages']
            total_pf_contribution += employee_data['pf_contribution']
        
        # Update government return
        gov_return.return_data = ecr_data
        gov_return.total_employees = len(ecr_data['employees'])
        gov_return.total_wages = total_wages
        gov_return.total_contribution = total_pf_contribution
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
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
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
        
        # Get or create government return record
        gov_return, created = GovernmentReturn.objects.get_or_create(
            company=company,
            return_type='esi_return',
            period_month=period_month,
            period_year=period_year,
            defaults={
                'due_date': date(period_year, period_month + 1 if period_month < 12 else 1, 21),
                'created_by': session.service_user
            }
        )
        
        # Generate ESI return data (simplified)
        employees = Employee.objects.filter(company=company, status='active')
        if 'include_employees' in data and data['include_employees']:
            employees = employees.filter(id__in=data['include_employees'])
        
        esi_data = {
            'employer_code': company.statutory_settings.esi_employer_code if hasattr(company, 'statutory_settings') else '',
            'period': f"{period_month:02d}/{period_year}",
            'employees': []
        }
        
        total_wages = 0
        total_esi_contribution = 0
        
        for employee in employees:
            # Check ESI eligibility
            if employee.base_salary <= 21000:  # ESI ceiling
                employee_data = {
                    'esi_number': employee.esi_number,
                    'name': employee.full_name,
                    'wages': float(employee.base_salary),
                    'esi_contribution': float(employee.base_salary * Decimal('0.0075'))
                }
                esi_data['employees'].append(employee_data)
                total_wages += employee_data['wages']
                total_esi_contribution += employee_data['esi_contribution']
        
        # Update government return
        gov_return.return_data = esi_data
        gov_return.total_employees = len(esi_data['employees'])
        gov_return.total_wages = total_wages
        gov_return.total_contribution = total_esi_contribution
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
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
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
            
            if validation_type == 'pf_calculation':
                if not employee.uan_number:
                    result['is_compliant'] = False
                    result['issues'].append('UAN number missing')
                if employee.base_salary > 15000:  # PF ceiling
                    result['issues'].append('Salary above PF ceiling')
            
            elif validation_type == 'esi_calculation':
                if employee.base_salary <= 21000 and not employee.esi_number:
                    result['is_compliant'] = False
                    result['issues'].append('ESI number missing for eligible employee')
            
            elif validation_type == 'minimum_wage':
                # Get minimum wage for state (simplified)
                min_wage = MinimumWageRate.objects.filter(
                    state=employee.state,
                    category='skilled',  # Default category
                    is_active=True
                ).first()
                
                if min_wage and employee.base_salary < min_wage.monthly_rate:
                    result['is_compliant'] = False
                    result['issues'].append(f'Salary below minimum wage: ₹{min_wage.monthly_rate}')
            
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