from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import datetime
from django.core.exceptions import ValidationError

from authentication.models import ServiceUserSession
from .leave_models import LeaveType, LeaveBalance, LeaveApplication, Holiday
from .models import Employee
from .security_utils import safe_get_auth_header, validate_year_param, validate_month_param, sanitize_filename
from rest_framework import serializers


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['id', 'name', 'code', 'category', 'days_per_year', 'carry_forward', 'max_carry_forward', 'is_paid', 'requires_approval', 'min_days_notice', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = LeaveBalance
        fields = '__all__'


class LeaveApplicationSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = LeaveApplication
        fields = '__all__'


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = '__all__'


class LeaveTypeViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = LeaveTypeSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return LeaveType.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return LeaveType.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return LeaveType.objects.none()

    def get_session_key(self):
        auth_header = self.request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            session_key = auth_header[7:]
        else:
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
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=session.service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = LeaveBalanceSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return LeaveBalance.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return LeaveBalance.objects.filter(
                employee__company=session.service_user.company
            ).select_related('employee', 'leave_type')
        except ServiceUserSession.DoesNotExist:
            return LeaveBalance.objects.none()

    def get_session_key(self):
        auth_header = self.request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            session_key = auth_header[7:]
        else:
            session_key = self.request.query_params.get('session_key')
            if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
                session_key = self.request.data.get('session_key')
        return session_key
    
    def list(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = self.get_queryset()
            
            # Apply filters with validation
            year_param = request.query_params.get('year')
            employee = request.query_params.get('employee')
            
            if year_param:
                try:
                    year = validate_year_param(year_param)
                    queryset = queryset.filter(year=year)
                except ValidationError:
                    return Response({'error': 'Invalid year parameter'}, status=status.HTTP_400_BAD_REQUEST)
            
            if employee and employee != 'all':
                try:
                    employee_id = int(employee)
                    queryset = queryset.filter(employee_id=employee_id)
                except (ValueError, TypeError):
                    return Response({'error': 'Invalid employee parameter'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Handle export
            export_format = request.query_params.get('export')
            if export_format == 'csv':
                return self.export_csv(queryset)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({'results': serializer.data})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    
    def export_csv(self, queryset):
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        filename = sanitize_filename('leave_balances.csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        writer.writerow(['Employee', 'Leave Type', 'Year', 'Opening Balance', 'Credited', 'Used', 'Closing Balance'])
        
        for balance in queryset:
            writer.writerow([
                str(balance.employee.full_name)[:100],  # Limit length
                str(balance.leave_type.name)[:50],
                balance.year,
                balance.opening_balance,
                balance.credited,
                balance.used,
                balance.closing_balance
            ])
        
        return response
    
    @action(detail=False, methods=['post'])
    def initialize_balances(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            year = request.data.get('year', timezone.now().year)
            
            employees = Employee.objects.filter(company=company, status='active')
            leave_types = LeaveType.objects.filter(company=company, is_active=True)
            
            created_count = 0
            for employee in employees:
                for leave_type in leave_types:
                    balance, created = LeaveBalance.objects.get_or_create(
                        employee=employee,
                        leave_type=leave_type,
                        year=year,
                        defaults={
                            'opening_balance': 0,
                            'credited': leave_type.days_per_year,
                            'used': 0,
                            'closing_balance': leave_type.days_per_year
                        }
                    )
                    if created:
                        created_count += 1
            
            return Response({
                'message': f'Initialized {created_count} leave balance records',
                'year': year
            })
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['post'])
    def recalculate_balances(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            year = request.data.get('year', timezone.now().year)
            
            # Get all approved leave applications for the year
            approved_leaves = LeaveApplication.objects.filter(
                employee__company=company,
                status='approved',
                from_date__year=year
            )
            
            # Reset all balances for the year
            balances = LeaveBalance.objects.filter(
                employee__company=company,
                year=year
            )
            
            for balance in balances:
                balance.used = 0
                balance.calculate_balance()
            
            # Recalculate used leave from approved applications
            from decimal import Decimal
            updated_count = 0
            for leave_app in approved_leaves:
                try:
                    balance = LeaveBalance.objects.get(
                        employee=leave_app.employee,
                        leave_type=leave_app.leave_type,
                        year=year
                    )
                    balance.used += Decimal(str(leave_app.total_days))
                    balance.calculate_balance()
                    updated_count += 1
                except LeaveBalance.DoesNotExist:
                    continue
            
            return Response({
                'message': f'Recalculated {updated_count} leave balance records',
                'year': year
            })
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class LeaveApplicationViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = LeaveApplicationSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return LeaveApplication.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return LeaveApplication.objects.filter(
                employee__company=session.service_user.company
            ).select_related('employee', 'leave_type', 'approved_by')
        except ServiceUserSession.DoesNotExist:
            return LeaveApplication.objects.none()

    def get_session_key(self):
        auth_header = self.request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            session_key = auth_header[7:]
        else:
            session_key = self.request.query_params.get('session_key')
            if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
                session_key = self.request.data.get('session_key')
        return session_key

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            application = self.get_object()
            
            application.status = 'approved'
            application.approved_date = timezone.now()
            application.save()
            
            # Update leave balance
            try:
                balance = LeaveBalance.objects.get(
                    employee=application.employee,
                    leave_type=application.leave_type,
                    year=application.from_date.year
                )
                from decimal import Decimal
                balance.used += Decimal(str(application.total_days))
                balance.calculate_balance()
            except LeaveBalance.DoesNotExist:
                # Create balance if it doesn't exist
                LeaveBalance.objects.create(
                    employee=application.employee,
                    leave_type=application.leave_type,
                    year=application.from_date.year,
                    opening_balance=0,
                    credited=application.leave_type.days_per_year,
                    used=Decimal(str(application.total_days)),
                    closing_balance=application.leave_type.days_per_year - Decimal(str(application.total_days))
                )
            
            return Response({'message': 'Leave approved successfully'})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            application = self.get_object()
            
            application.status = 'rejected'
            application.rejection_reason = request.data.get('reason', '')
            application.save()
            
            return Response({'message': 'Leave rejected successfully'})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    
    def list(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = self.get_queryset()
            
            # Handle stats request
            if request.query_params.get('stats'):
                return self.get_statistics(queryset)
            
            # Apply filters with validation
            year_param = request.query_params.get('year')
            month_param = request.query_params.get('month')
            status_filter = request.query_params.get('status')
            employee = request.query_params.get('employee')
            
            if year_param:
                try:
                    year = validate_year_param(year_param)
                    queryset = queryset.filter(from_date__year=year)
                except ValidationError:
                    return Response({'error': 'Invalid year parameter'}, status=status.HTTP_400_BAD_REQUEST)
            
            if month_param:
                try:
                    month = validate_month_param(month_param)
                    queryset = queryset.filter(from_date__month=month)
                except ValidationError:
                    return Response({'error': 'Invalid month parameter'}, status=status.HTTP_400_BAD_REQUEST)
            
            if status_filter and status_filter in ['pending', 'approved', 'rejected', 'cancelled']:
                queryset = queryset.filter(status=status_filter)
            
            if employee:
                try:
                    employee_id = int(employee)
                    queryset = queryset.filter(employee_id=employee_id)
                except (ValueError, TypeError):
                    return Response({'error': 'Invalid employee parameter'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Handle export
            export_format = request.query_params.get('export')
            if export_format in ['pdf', 'excel', 'csv']:
                return self.export_data(queryset, export_format)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({'results': serializer.data})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    
    def get_statistics(self, queryset):
        from django.db.models import Count, Sum
        
        stats = {
            'total_applications': queryset.count(),
            'approved_applications': queryset.filter(status='approved').count(),
            'pending_applications': queryset.filter(status='pending').count(),
            'rejected_applications': queryset.filter(status='rejected').count(),
            'total_leave_days': queryset.aggregate(Sum('total_days'))['total_days__sum'] or 0,
        }
        
        # Most used leave type
        most_used = queryset.values('leave_type__name').annotate(
            count=Count('id')
        ).order_by('-count').first()
        stats['most_used_leave_type'] = most_used['leave_type__name'] if most_used else 'N/A'
        
        # Department wise stats
        dept_stats = queryset.values('employee__department__name').annotate(
            applications=Count('id'),
            total_days=Sum('total_days')
        ).order_by('-total_days')
        stats['department_wise_stats'] = [
            {
                'department': item['employee__department__name'] or 'No Department',
                'applications': item['applications'],
                'total_days': item['total_days'] or 0
            }
            for item in dept_stats
        ]
        
        # Monthly trends
        from django.db.models.functions import Extract
        monthly_stats = queryset.annotate(
            year=Extract('from_date', 'year'),
            month=Extract('from_date', 'month')
        ).values('year', 'month').annotate(
            applications=Count('id'),
            days=Sum('total_days')
        ).order_by('year', 'month')
        stats['monthly_trends'] = [
            {
                'month': f"{item['year']}-{item['month']:02d}",
                'applications': item['applications'],
                'days': item['days'] or 0
            }
            for item in monthly_stats
        ]
        
        return Response(stats)
    
    def export_data(self, queryset, format_type):
        import csv
        from django.http import HttpResponse
        
        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            filename = sanitize_filename('leave_applications.csv')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            writer = csv.writer(response)
            writer.writerow(['Employee', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Reason'])
            
            for app in queryset:
                writer.writerow([
                    str(app.employee.full_name)[:100],
                    str(app.leave_type.name)[:50],
                    app.from_date,
                    app.to_date,
                    app.total_days,
                    app.status,
                    str(app.reason)[:200] if app.reason else ''
                ])
            
            return response
        
        return Response({'error': 'Export format not supported'}, status=status.HTTP_400_BAD_REQUEST)
    
    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class HolidayViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = HolidaySerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Holiday.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Holiday.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Holiday.objects.none()

    def get_session_key(self):
        auth_header = self.request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            session_key = auth_header[7:]
        else:
            session_key = self.request.query_params.get('session_key')
            if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
                session_key = self.request.data.get('session_key')
        return session_key
    
    def list(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = self.get_queryset()
            
            # Apply filters with validation
            year_param = request.query_params.get('year')
            if year_param:
                try:
                    year = validate_year_param(year_param)
                    queryset = queryset.filter(date__year=year)
                except ValidationError:
                    return Response({'error': 'Invalid year parameter'}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({'results': serializer.data})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    
    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=session.service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
