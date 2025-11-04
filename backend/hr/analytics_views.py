from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from django.db.models import Q, Count, Sum, Avg, F, Case, When, IntegerField
from django.utils import timezone
from datetime import datetime, timedelta, date
from decimal import Decimal

from authentication.models import ServiceUserSession
from .models import Employee, Attendance, PayrollCycle, Payslip, Department, Designation


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def hr_analytics_dashboard(request):
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Employee Analytics
        total_employees = Employee.objects.filter(company=company).count()
        active_employees = Employee.objects.filter(company=company, status='active').count()
        inactive_employees = total_employees - active_employees
        
        # Department-wise distribution
        dept_distribution = list(Employee.objects.filter(company=company, status='active')
                                .values('department__name')
                                .annotate(count=Count('id'))
                                .order_by('-count'))
        
        # Designation-wise distribution
        designation_distribution = list(Employee.objects.filter(company=company, status='active')
                                      .values('designation__title')
                                      .annotate(count=Count('id'))
                                      .order_by('-count'))
        
        # Attendance Analytics (Last 30 days)
        thirty_days_ago = date.today() - timedelta(days=30)
        attendance_data = []
        
        for i in range(30):
            current_date = thirty_days_ago + timedelta(days=i)
            present_count = Attendance.objects.filter(
                employee__company=company,
                date=current_date,
                status__in=['present', 'late']
            ).count()
            
            attendance_data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'present': present_count,
                'total_employees': active_employees
            })
        
        # Payroll Analytics (Last 6 months) - Remove status filter to show all cycles
        six_months_ago = date.today() - timedelta(days=180)
        payroll_trends = []
        
        cycles = PayrollCycle.objects.filter(
            company=company,
            start_date__gte=six_months_ago
        ).order_by('start_date')
        
        for cycle in cycles:
            payroll_trends.append({
                'month': cycle.start_date.strftime('%Y-%m'),
                'cycle_name': cycle.name,
                'total_gross': float(cycle.total_gross),
                'total_net': float(cycle.total_net),
                'total_employees': cycle.total_employees,
                'status': cycle.status
            })
        
        # Debug payroll data
        total_payroll_cycles = PayrollCycle.objects.filter(company=company).count()
        total_payslips = Payslip.objects.filter(payroll_cycle__company=company).count()
        
        # Top Performers (Based on attendance)
        top_performers = list(Employee.objects.filter(company=company, status='active')
                            .annotate(
                                attendance_rate=Avg(
                                    Case(
                                        When(attendance_records__status__in=['present', 'late'], then=1),
                                        default=0,
                                        output_field=IntegerField()
                                    )
                                )
                            )
                            .order_by('-attendance_rate')[:10])
        
        performer_data = []
        for emp in top_performers:
            recent_attendance = Attendance.objects.filter(
                employee=emp,
                date__gte=thirty_days_ago
            )
            present_days = recent_attendance.filter(status__in=['present', 'late']).count()
            total_days = recent_attendance.count()
            attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
            
            performer_data.append({
                'employee_name': emp.full_name,
                'employee_id': emp.employee_id,
                'department': emp.department.name,
                'attendance_rate': round(attendance_rate, 1)
            })
        
        # Salary Analytics
        salary_stats = Employee.objects.filter(company=company, status='active').aggregate(
            avg_salary=Avg('base_salary'),
            min_salary=Sum('base_salary'),
            max_salary=Sum('base_salary'),
            total_salary_cost=Sum('base_salary')
        )
        
        # Recent Hires (Last 3 months)
        three_months_ago = date.today() - timedelta(days=90)
        recent_hires = Employee.objects.filter(
            company=company,
            date_of_joining__gte=three_months_ago
        ).count()
        
        return Response({
            'employee_overview': {
                'total_employees': total_employees,
                'active_employees': active_employees,
                'inactive_employees': inactive_employees,
                'recent_hires': recent_hires
            },
            'department_distribution': dept_distribution,
            'designation_distribution': designation_distribution,
            'attendance_trends': attendance_data,
            'payroll_trends': payroll_trends,
            'top_performers': performer_data,
            'salary_analytics': {
                'average_salary': float(salary_stats['avg_salary'] or 0),
                'total_salary_cost': float(salary_stats['total_salary_cost'] or 0)
            },
            'debug_info': {
                'total_payroll_cycles': total_payroll_cycles,
                'total_payslips': total_payslips,
                'company_id': company.id
            }
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def attendance_analytics(request):
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Get date range from query params
        start_date = request.query_params.get('start_date', (date.today() - timedelta(days=30)).strftime('%Y-%m-%d'))
        end_date = request.query_params.get('end_date', date.today().strftime('%Y-%m-%d'))
        
        # Attendance summary
        attendance_summary = Attendance.objects.filter(
            employee__company=company,
            date__gte=start_date,
            date__lte=end_date
        ).aggregate(
            total_records=Count('id'),
            present_count=Count('id', filter=Q(status='present')),
            late_count=Count('id', filter=Q(status='late')),
            absent_count=Count('id', filter=Q(status='absent')),
            avg_hours=Avg('total_hours')
        )
        
        # Department-wise attendance
        dept_attendance = list(Attendance.objects.filter(
            employee__company=company,
            date__gte=start_date,
            date__lte=end_date
        ).values('employee__department__name')
         .annotate(
             present=Count('id', filter=Q(status='present')),
             late=Count('id', filter=Q(status='late')),
             absent=Count('id', filter=Q(status='absent')),
             total=Count('id')
         ))
        
        # Daily attendance trends
        daily_trends = list(Attendance.objects.filter(
            employee__company=company,
            date__gte=start_date,
            date__lte=end_date
        ).values('date')
         .annotate(
             present=Count('id', filter=Q(status='present')),
             late=Count('id', filter=Q(status='late')),
             absent=Count('id', filter=Q(status='absent'))
         ).order_by('date'))
        
        return Response({
            'summary': attendance_summary,
            'department_wise': dept_attendance,
            'daily_trends': daily_trends
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def payroll_analytics(request):
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Payroll summary
        payroll_summary = PayrollCycle.objects.filter(company=company).aggregate(
            total_cycles=Count('id'),
            total_gross=Sum('total_gross'),
            total_net=Sum('total_net'),
            avg_gross=Avg('total_gross')
        )
        
        # Monthly payroll trends
        monthly_trends = list(PayrollCycle.objects.filter(company=company)
                            .extra(select={'month': "DATE_TRUNC('month', start_date)"})
                            .values('month')
                            .annotate(
                                total_gross=Sum('total_gross'),
                                total_net=Sum('total_net'),
                                employee_count=Sum('total_employees')
                            ).order_by('month'))
        
        # Department-wise salary distribution
        dept_salary = list(Employee.objects.filter(company=company, status='active')
                         .values('department__name')
                         .annotate(
                             avg_salary=Avg('base_salary'),
                             total_salary=Sum('base_salary'),
                             employee_count=Count('id')
                         ))
        
        return Response({
            'summary': payroll_summary,
            'monthly_trends': monthly_trends,
            'department_salary': dept_salary
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)