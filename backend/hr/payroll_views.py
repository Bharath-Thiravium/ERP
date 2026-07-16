from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta, date
from decimal import Decimal
import io
import csv
import os
from html import escape as html_escape
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch

try:
    import weasyprint
except Exception:  # pragma: no cover - fallback handled at runtime
    weasyprint = None

from django.db import transaction
from authentication.models import ServiceUserSession
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .mobile_auth import EmployeeMobileAuthentication, IsEmployeeMobileAuthenticated
from .models import (
    PayrollCycle, Payslip, PayrollSettings, SalaryComponent, PayrollReport,
    Employee, Attendance
)
from .payroll_calculations import calculate_employee_payroll_attendance


def _safe(value):
    return html_escape(str(value or ''))


def _money(value):
    return f'{Decimal(value or 0):,.2f}'


def payroll_cycle_date(value):
    return value.strftime('%d %b %Y') if value else ''


def _company_logo_file_uri(company):
    try:
        if company and company.logo and company.logo.name:
            path = company.logo.path
            if path and os.path.exists(path):
                return f'file://{path}'
    except Exception:
        return ''
    return ''
from .payroll_serializers import (
    PayrollCycleSerializer, PayslipSerializer, PayrollSettingsSerializer,
    SalaryComponentSerializer, PayrollReportSerializer, PayrollCalculationSerializer,
    PayslipBulkUpdateSerializer, PayrollDashboardSerializer
)


@api_view(['GET'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_payslips(request):
    """Return payslips for the logged-in employee mobile session."""
    employee = request.employee
    payslips = (
        Payslip.objects
        .filter(employee=employee, employee__company=employee.company)
        .select_related('employee', 'payroll_cycle')
        .order_by('-payroll_cycle__start_date', '-created_at')
    )

    status_filter = request.query_params.get('status')
    if status_filter:
        payslips = payslips.filter(status=status_filter)

    return Response({
        'count': payslips.count(),
        'results': PayslipSerializer(payslips, many=True).data,
    })


class PayrollViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
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

            with transaction.atomic():
                # Get active employees
                employees = Employee.objects.filter(
                    company=session.service_user.company,
                    status='active'
                )

                payslips_created = 0
                total_gross = total_net = 0

                for employee in employees:
                    attendance_summary = calculate_employee_payroll_attendance(
                        employee,
                        payroll_cycle.start_date,
                        payroll_cycle.end_date,
                    )

                    # Create or update payslip
                    payslip, created = Payslip.objects.get_or_create(
                        payroll_cycle=payroll_cycle,
                        employee=employee,
                        defaults={
                            'emp_id': employee.employee_id,
                            'emp_name': employee.full_name,
                            'emp_department': employee.department.name,
                            'emp_designation': employee.designation.title,
                            'working_days': attendance_summary['working_days'],
                            'present_days': attendance_summary['present_days'],
                            'absent_days': attendance_summary['absent_days'],
                            'overtime_hours': attendance_summary['overtime_hours']
                        }
                    )
                    payslip.emp_id = employee.employee_id
                    payslip.emp_name = employee.full_name
                    payslip.emp_department = employee.department.name
                    payslip.emp_designation = employee.designation.title
                    payslip.working_days = attendance_summary['working_days']
                    payslip.present_days = attendance_summary['present_days']
                    payslip.absent_days = attendance_summary['absent_days']
                    payslip.overtime_hours = attendance_summary['overtime_hours']
                    payslip.status = 'calculated'

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

            with transaction.atomic():
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

            with transaction.atomic():
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
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
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

            department = self.request.query_params.get('department')
            if department:
                queryset = queryset.filter(emp_department__iexact=department)

            search = self.request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    Q(emp_name__icontains=search) |
                    Q(emp_id__icontains=search) |
                    Q(employee__email__icontains=search) |
                    Q(emp_department__icontains=search) |
                    Q(emp_designation__icontains=search)
                )
            
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

    def list(self, request, *args, **kwargs):
        if request.query_params.get('export') == 'csv':
            queryset = self.filter_queryset(self.get_queryset())
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="payslips.csv"'

            writer = csv.writer(response)
            writer.writerow([
                'Employee ID', 'Employee Name', 'Department', 'Designation',
                'Payroll Cycle', 'Working Days', 'Paid Days', 'Absent Days',
                'Basic Salary', 'Gross Salary', 'Total Deductions', 'Net Salary',
                'Status', 'Payment Reference', 'Paid Date'
            ])
            for payslip in queryset:
                writer.writerow([
                    payslip.emp_id,
                    payslip.emp_name,
                    payslip.emp_department,
                    payslip.emp_designation,
                    payslip.payroll_cycle.name,
                    payslip.working_days,
                    payslip.present_days,
                    payslip.absent_days,
                    payslip.basic_salary,
                    payslip.gross_salary,
                    payslip.total_deductions,
                    payslip.net_salary,
                    payslip.status,
                    payslip.payment_reference,
                    payslip.paid_date or '',
                ])
            return response

        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            payslip = self.get_object()
            
            if weasyprint is None:
                return Response({'error': 'WeasyPrint is not available'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            company = session.service_user.company
            logo_uri = _company_logo_file_uri(company)
            logo_block = (
                f'<img src="{logo_uri}" alt="{_safe(company.name)} logo" />'
                if logo_uri else
                f'<div class="logo-fallback">{_safe((company.name or "C")[:1]).upper()}</div>'
            )
            period = f'{payroll_cycle_date(payslip.payroll_cycle.start_date)} - {payroll_cycle_date(payslip.payroll_cycle.end_date)}'
            earnings = [
                ('Basic Salary', payslip.basic_salary),
                ('HRA', payslip.hra),
                ('Conveyance Allowance', payslip.conveyance_allowance),
                ('Medical Allowance', payslip.medical_allowance),
                ('Special Allowance', payslip.special_allowance),
                ('Overtime', payslip.overtime_amount),
                ('Bonus', payslip.bonus),
                ('Incentive', payslip.incentive),
                ('Other Earnings', payslip.other_earnings),
            ]
            deductions = [
                ('Provident Fund', payslip.pf_employee),
                ('ESI', payslip.esi_employee),
                ('Professional Tax', payslip.professional_tax),
                ('TDS', payslip.tds),
                ('Loan Deduction', payslip.loan_deduction),
                ('Advance Deduction', payslip.advance_deduction),
                ('Other Deductions', payslip.other_deductions),
            ]
            max_rows = max(len(earnings), len(deductions))
            salary_rows = []
            for index in range(max_rows):
                earning = earnings[index] if index < len(earnings) else ('', '')
                deduction = deductions[index] if index < len(deductions) else ('', '')
                salary_rows.append(
                    '<tr>'
                    f'<td>{_safe(earning[0])}</td><td class="amount">{_money(earning[1]) if earning[0] else ""}</td>'
                    f'<td>{_safe(deduction[0])}</td><td class="amount">{_money(deduction[1]) if deduction[0] else ""}</td>'
                    '</tr>'
                )

            html = f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{ size: A4; margin: 22mm 16mm; }}
    * {{ box-sizing: border-box; }}
    body {{ font-family: Inter, DejaVu Sans, Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.45; }}
    .header {{ display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 18px; }}
    .brand {{ display: flex; gap: 14px; align-items: center; }}
    .logo {{ width: 62px; height: 62px; border: 1px solid #e5e7eb; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden; }}
    .logo img {{ max-width: 54px; max-height: 54px; object-fit: contain; }}
    .logo-fallback {{ width: 44px; height: 44px; border-radius: 12px; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; }}
    h1 {{ margin: 0; font-size: 24px; letter-spacing: .04em; }}
    h2 {{ margin: 0 0 6px; font-size: 16px; }}
    .muted {{ color: #6b7280; }}
    .doc-box {{ text-align: right; }}
    .badge {{ display: inline-block; padding: 5px 10px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-weight: 700; text-transform: uppercase; font-size: 10px; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin: 18px 0; }}
    .metric {{ border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fbfdff; }}
    .metric .label {{ color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }}
    .metric .value {{ font-size: 16px; font-weight: 800; margin-top: 4px; }}
    .panel {{ border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; margin-top: 14px; }}
    .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th {{ background: #111827; color: #fff; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }}
    td {{ border-bottom: 1px solid #e5e7eb; padding: 9px 10px; vertical-align: top; }}
    .amount {{ text-align: right; font-variant-numeric: tabular-nums; }}
    .total-row td {{ background: #f3f4f6; font-weight: 800; border-bottom: 0; }}
    .net {{ margin-top: 18px; border-radius: 16px; padding: 16px 18px; background: linear-gradient(135deg, #16a34a, #059669); color: white; display: flex; justify-content: space-between; align-items: center; }}
    .net .label {{ font-size: 12px; opacity: .9; text-transform: uppercase; letter-spacing: .08em; }}
    .net .value {{ font-size: 26px; font-weight: 900; }}
    .footer {{ margin-top: 24px; color: #6b7280; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 12px; }}
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">{logo_block}</div>
      <div>
        <h2>{_safe(company.name)}</h2>
        <div class="muted">Payroll Department</div>
        <div class="muted">{_safe(getattr(company, 'email', ''))}</div>
      </div>
    </div>
    <div class="doc-box">
      <h1>SALARY SLIP</h1>
      <div class="muted">Period: {_safe(period)}</div>
      <div class="muted">Pay Date: {_safe(payroll_cycle_date(payslip.payroll_cycle.pay_date))}</div>
      <div style="margin-top: 8px;"><span class="badge">{_safe(payslip.status)}</span></div>
    </div>
  </div>

  <div class="grid">
    <div class="metric"><div class="label">Employee</div><div class="value">{_safe(payslip.emp_name)}</div><div class="muted">{_safe(payslip.emp_id)}</div></div>
    <div class="metric"><div class="label">Department</div><div class="value">{_safe(payslip.emp_department)}</div><div class="muted">{_safe(payslip.emp_designation)}</div></div>
    <div class="metric"><div class="label">Paid Days</div><div class="value">{_safe(payslip.present_days)}</div><div class="muted">of {_safe(payslip.working_days)} working days</div></div>
    <div class="metric"><div class="label">Absent Days</div><div class="value">{_safe(payslip.absent_days)}</div><div class="muted">{_safe(payslip.overtime_hours)} overtime hours</div></div>
  </div>

  <div class="panel">
    <table>
      <thead>
        <tr><th>Earnings</th><th class="amount">Amount</th><th>Deductions</th><th class="amount">Amount</th></tr>
      </thead>
      <tbody>
        {''.join(salary_rows)}
        <tr class="total-row">
          <td>Gross Salary</td><td class="amount">Rs {_money(payslip.gross_salary)}</td>
          <td>Total Deductions</td><td class="amount">Rs {_money(payslip.total_deductions)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="net">
    <div>
      <div class="label">Net Salary Payable</div>
      <div>Payment Method: {_safe(payslip.get_payment_method_display())}</div>
    </div>
    <div class="value">Rs {_money(payslip.net_salary)}</div>
  </div>

  <div class="footer">
    This is a system-generated payslip. Please contact HR/payroll for corrections before payment processing.
  </div>
</body>
</html>
"""
            pdf_buffer = io.BytesIO()
            weasyprint.HTML(string=html, base_url=request.build_absolute_uri('/')).write_pdf(pdf_buffer)
            pdf_buffer.seek(0)

            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="payslip_{payslip.emp_id}_{payslip.payroll_cycle.name}.pdf"'
            return response
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Payslip.DoesNotExist:
            return Response({'error': 'Payslip not found'}, status=status.HTTP_404_NOT_FOUND)


class PayrollSettingsViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
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
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def payroll_analytics(request):
    try:
        company = request.service_user.company

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
