from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from authentication.permissions import IsServiceUser
from authentication.models import ServiceUserSession
from .models import (
    Department, Designation, Employee, SalaryStructure,
    Attendance, LeaveType, LeaveBalance, LeaveApplication, Payroll
)
from .serializers import (
    DepartmentSerializer, DesignationSerializer, EmployeeSerializer, SalaryStructureSerializer,
    AttendanceSerializer, LeaveTypeSerializer, LeaveBalanceSerializer, 
    LeaveApplicationSerializer, PayrollSerializer, HRStatsSerializer, AttendanceSummarySerializer
)

class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsServiceUser]
    
    def get_queryset(self):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
        else:
            return Department.objects.none()
        
        return Department.objects.filter(company=company)
    
    def perform_create(self, serializer):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
        else:
            raise PermissionDenied("No company association found")
        
        serializer.save(company=company)

class DesignationViewSet(viewsets.ModelViewSet):
    serializer_class = DesignationSerializer
    permission_classes = [IsServiceUser]
    
    def get_queryset(self):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
        else:
            return Designation.objects.none()
        
        return Designation.objects.filter(company=company)
    
    def perform_create(self, serializer):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
        else:
            raise PermissionDenied("No company association found")
        
        serializer.save(company=company)

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsServiceUser]
    
    def get_queryset(self):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
        else:
            return Employee.objects.none()
        
        queryset = Employee.objects.filter(company=company)
        
        # Filter by department
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department_id=department)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Search by name or employee_id
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(employee_id__icontains=search) |
                Q(email__icontains=search)
            )
        
        return queryset.select_related('department', 'designation', 'reporting_manager')
    
    def perform_create(self, serializer):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
            created_by = None  # Service users don't have User objects
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
            created_by = self.request.user
        else:
            raise PermissionDenied("No company association found")
        
        serializer.save(company=company, created_by=created_by)

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsServiceUser]
    
    def get_queryset(self):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
        else:
            return Attendance.objects.none()
        
        queryset = Attendance.objects.filter(employee__company=company)
        
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)
        else:
            # Default to today
            queryset = queryset.filter(date=timezone.now().date())
        
        # Filter by employee
        employee = self.request.query_params.get('employee')
        if employee:
            queryset = queryset.filter(employee_id=employee)
        
        # Filter by department
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(employee__department_id=department)
        
        return queryset.select_related('employee', 'employee__department')
    
    @action(detail=False, methods=['post'])
    def mark_attendance(self, request):
        """Mark attendance for an employee"""
        employee_id = request.data.get('employee_id')
        action_type = request.data.get('action')  # 'check_in' or 'check_out'
        location = request.data.get('location', '')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        try:
            # Get company from service user session or company user
            if hasattr(request, 'service_user'):
                company = request.service_user.company
            elif hasattr(request.user, 'company_user'):
                company = request.user.company_user.company
            else:
                return Response({
                    'success': False,
                    'message': 'No company association found'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            employee = Employee.objects.get(
                employee_id=employee_id,
                company=company
            )
            
            today = timezone.now().date()
            attendance, created = Attendance.objects.get_or_create(
                employee=employee,
                date=today,
                defaults={'status': 'absent'}
            )
            
            if action_type == 'check_in':
                attendance.check_in_time = timezone.now().time()
                attendance.check_in_location = location
                attendance.check_in_latitude = latitude
                attendance.check_in_longitude = longitude
                attendance.status = 'present'
                
            elif action_type == 'check_out':
                attendance.check_out_time = timezone.now().time()
                attendance.check_out_location = location
                
                # Calculate working hours
                if attendance.check_in_time:
                    check_in = datetime.combine(today, attendance.check_in_time)
                    check_out = datetime.combine(today, attendance.check_out_time)
                    working_hours = (check_out - check_in).total_seconds() / 3600
                    attendance.working_hours = round(working_hours, 2)
                    
                    # Calculate overtime (assuming 8 hours standard)
                    if working_hours > 8:
                        attendance.overtime_hours = round(working_hours - 8, 2)
            
            attendance.save()
            
            return Response({
                'success': True,
                'message': f'Attendance {action_type} recorded successfully',
                'data': AttendanceSerializer(attendance).data
            })
            
        except Employee.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Employee not found'
            }, status=status.HTTP_404_NOT_FOUND)

class PayrollViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSerializer
    permission_classes = [IsServiceUser]
    
    def get_queryset(self):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
        else:
            return Payroll.objects.none()
        
        queryset = Payroll.objects.filter(employee__company=company)
        
        # Filter by month/year
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        
        # Filter by employee
        employee = self.request.query_params.get('employee')
        if employee:
            queryset = queryset.filter(employee_id=employee)
        
        return queryset.select_related('employee', 'employee__department')
    
    @action(detail=False, methods=['post'])
    def process_payroll(self, request):
        """Process payroll for a specific month/year"""
        month = request.data.get('month')
        year = request.data.get('year')
        employee_ids = request.data.get('employee_ids', [])
        
        if not month or not year:
            return Response({
                'success': False,
                'message': 'Month and year are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get company from service user session or company user
        if hasattr(request, 'service_user'):
            company = request.service_user.company
        elif hasattr(request.user, 'company_user'):
            company = request.user.company_user.company
        else:
            return Response({
                'success': False,
                'message': 'No company association found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        employees = Employee.objects.filter(company=company, status='active')
        
        if employee_ids:
            employees = employees.filter(id__in=employee_ids)
        
        processed_count = 0
        errors = []
        
        for employee in employees:
            try:
                # Get or create payroll record
                payroll, created = Payroll.objects.get_or_create(
                    employee=employee,
                    month=month,
                    year=year,
                    defaults={'status': 'draft'}
                )
                
                if not created and payroll.status == 'processed':
                    continue  # Skip already processed payroll
                
                # Get salary structure
                try:
                    salary_structure = employee.salary_structure
                except SalaryStructure.DoesNotExist:
                    errors.append(f"No salary structure found for {employee.full_name}")
                    continue
                
                # Calculate attendance data
                start_date = datetime(year, month, 1).date()
                if month == 12:
                    end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
                else:
                    end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
                
                working_days = (end_date - start_date).days + 1
                attendance_records = Attendance.objects.filter(
                    employee=employee,
                    date__range=[start_date, end_date]
                )
                
                present_days = attendance_records.filter(
                    status__in=['present', 'late', 'half_day']
                ).count()
                
                leave_days = attendance_records.filter(status='on_leave').count()
                
                # Calculate salary components
                payroll.basic_salary = salary_structure.basic_salary
                payroll.hra = salary_structure.hra
                payroll.da = salary_structure.da
                payroll.transport_allowance = salary_structure.transport_allowance
                payroll.medical_allowance = salary_structure.medical_allowance
                payroll.other_allowances = salary_structure.other_allowances
                
                # Calculate overtime
                total_overtime = attendance_records.aggregate(
                    total=Sum('overtime_hours')
                )['total'] or 0
                payroll.overtime_amount = Decimal(str(total_overtime)) * Decimal('100')  # ₹100 per hour
                
                # Calculate deductions
                payroll.pf_deduction = salary_structure.pf_deduction
                payroll.esi_deduction = salary_structure.esi_deduction
                payroll.professional_tax = salary_structure.professional_tax
                
                # Calculate totals
                payroll.gross_salary = (
                    payroll.basic_salary + payroll.hra + payroll.da +
                    payroll.transport_allowance + payroll.medical_allowance +
                    payroll.other_allowances + payroll.overtime_amount
                )
                
                payroll.total_deductions = (
                    payroll.pf_deduction + payroll.esi_deduction +
                    payroll.professional_tax + payroll.tds_deduction + payroll.other_deductions
                )
                
                payroll.net_salary = payroll.gross_salary - payroll.total_deductions
                
                # Set attendance data
                payroll.working_days = working_days
                payroll.present_days = present_days
                payroll.leave_days = leave_days
                
                payroll.status = 'processed'
                payroll.processed_at = timezone.now()
                payroll.save()
                
                processed_count += 1
                
            except Exception as e:
                errors.append(f"Error processing {employee.full_name}: {str(e)}")
        
        return Response({
            'success': True,
            'message': f'Processed payroll for {processed_count} employees',
            'processed_count': processed_count,
            'errors': errors
        })

class LeaveApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveApplicationSerializer
    permission_classes = [IsServiceUser]
    
    def get_queryset(self):
        # Get company from service user session or company user
        if hasattr(self.request, 'service_user'):
            company = self.request.service_user.company
        elif hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
        else:
            return LeaveApplication.objects.none()
        
        return LeaveApplication.objects.filter(
            employee__company=company
        ).select_related('employee', 'leave_type', 'approved_by')
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a leave application"""
        leave_application = self.get_object()
        
        # Check if user has permission to approve (manager or HR)
        leave_application.status = 'approved'
        # Get service user ID
        if hasattr(request, 'service_user'):
            leave_application.approved_by_id = request.service_user.id
        leave_application.approved_at = timezone.now()
        leave_application.save()
        
        return Response({
            'success': True,
            'message': 'Leave application approved successfully'
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a leave application"""
        leave_application = self.get_object()
        rejection_reason = request.data.get('reason', '')
        
        leave_application.status = 'rejected'
        leave_application.rejection_reason = rejection_reason
        # Get service user ID
        if hasattr(request, 'service_user'):
            leave_application.approved_by_id = request.service_user.id
        leave_application.approved_at = timezone.now()
        leave_application.save()
        
        return Response({
            'success': True,
            'message': 'Leave application rejected successfully'
        })

class HRDashboardViewSet(viewsets.ViewSet):
    """HR Dashboard statistics and analytics"""
    permission_classes = [IsServiceUser]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get HR dashboard statistics"""
        # Get company from service user session or company user
        if hasattr(request, 'service_user'):
            company = request.service_user.company
        elif hasattr(request.user, 'company_user'):
            company = request.user.company_user.company
        else:
            return Response({'error': 'No company association found'}, status=status.HTTP_401_UNAUTHORIZED)
        today = timezone.now().date()
        current_month = today.month
        current_year = today.year
        
        # Employee statistics
        total_employees = Employee.objects.filter(company=company).count()
        active_employees = Employee.objects.filter(company=company, status='active').count()
        
        # Today's attendance
        today_attendance = Attendance.objects.filter(
            employee__company=company,
            date=today
        )
        present_today = today_attendance.filter(status__in=['present', 'late']).count()
        on_leave = today_attendance.filter(status='on_leave').count()
        
        # Leave applications
        pending_leave_approvals = LeaveApplication.objects.filter(
            employee__company=company,
            status='pending'
        ).count()
        
        # Monthly payroll
        monthly_payroll = Payroll.objects.filter(
            employee__company=company,
            month=current_month,
            year=current_year
        ).aggregate(total=Sum('net_salary'))['total'] or 0
        
        # Attendance rate
        if active_employees > 0:
            attendance_rate = (present_today / active_employees) * 100
        else:
            attendance_rate = 0
        
        # Departments count
        departments_count = Department.objects.filter(company=company).count()
        
        # New joinees this month
        start_of_month = today.replace(day=1)
        new_joinees = Employee.objects.filter(
            company=company,
            join_date__gte=start_of_month,
            join_date__lte=today
        ).count()
        
        # Recent activity (last 5 activities)
        recent_activity = []
        
        # Get recent leave applications
        recent_leaves = LeaveApplication.objects.filter(
            employee__company=company
        ).order_by('-applied_at')[:3]
        
        for leave in recent_leaves:
            recent_activity.append({
                'id': f'leave_{leave.id}',
                'type': 'leave',
                'description': f'{leave.employee.full_name} applied for {leave.leave_type.name}',
                'time': f'{(timezone.now() - leave.applied_at).days} days ago'
            })
        
        # Get recent employee joins
        recent_joins = Employee.objects.filter(
            company=company,
            join_date__gte=today - timedelta(days=30)
        ).order_by('-join_date')[:2]
        
        for emp in recent_joins:
            recent_activity.append({
                'id': f'join_{emp.id}',
                'type': 'join',
                'description': f'{emp.full_name} joined as {emp.designation.title if emp.designation else "Employee"}',
                'time': f'{(today - emp.join_date).days} days ago'
            })
        
        stats_data = {
            'total_employees': total_employees,
            'active_employees': active_employees,
            'present_today': present_today,
            'on_leave': on_leave,
            'pending_leave_approvals': pending_leave_approvals,
            'monthly_payroll': monthly_payroll,
            'attendance_rate': round(attendance_rate, 2),
            'departments_count': departments_count,
            'new_joinees': new_joinees,
            'active_recruitments': 0,  # This would come from a recruitment module
            'recent_activity': recent_activity[:5]  # Limit to 5 activities
        }
        
        serializer = HRStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def attendance_summary(self, request):
        """Get attendance summary for the last 30 days"""
        # Get company from service user session or company user
        if hasattr(request, 'service_user'):
            company = request.service_user.company
        elif hasattr(request.user, 'company_user'):
            company = request.user.company_user.company
        else:
            return Response({'error': 'No company association found'}, status=status.HTTP_401_UNAUTHORIZED)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        summary_data = []
        current_date = start_date
        
        while current_date <= end_date:
            attendance_records = Attendance.objects.filter(
                employee__company=company,
                date=current_date
            )
            
            present = attendance_records.filter(status__in=['present', 'late']).count()
            absent = attendance_records.filter(status='absent').count()
            late = attendance_records.filter(status='late').count()
            on_leave = attendance_records.filter(status='on_leave').count()
            
            total = present + absent + on_leave
            attendance_rate = (present / total * 100) if total > 0 else 0
            
            summary_data.append({
                'date': current_date,
                'present': present,
                'absent': absent,
                'late': late,
                'on_leave': on_leave,
                'attendance_rate': round(attendance_rate, 2)
            })
            
            current_date += timedelta(days=1)
        
        serializer = AttendanceSummarySerializer(summary_data, many=True)
        return Response(serializer.data)