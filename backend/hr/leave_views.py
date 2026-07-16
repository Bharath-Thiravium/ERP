from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import datetime, date
from decimal import Decimal
import calendar as cal_module
from django.core.exceptions import ValidationError

from django.db import transaction
from authentication.models import ServiceUserSession
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .mobile_auth import EmployeeMobileAuthentication, IsEmployeeMobileAuthenticated
from .leave_models import LeaveType, LeaveBalance, LeaveApplication, Holiday
from .models import Employee
from .attendance_calendar import calculate_leave_days
from .security_utils import SecurityValidator, secure_session_check, validate_year_param, validate_month_param, sanitize_filename
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from company_dashboard.models import CompanyNotification
from company_dashboard.serializers import CompanyNotificationSerializer


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

    def _get_context_company(self):
        request = self.context.get('request')
        service_user = getattr(request, 'service_user', None) if request else None
        return service_user.company if service_user else None

    def validate_employee(self, value):
        company = self._get_context_company()
        if company is not None and value.company_id != company.id:
            raise serializers.ValidationError('Employee not found or access denied.')
        return value

    def validate_leave_type(self, value):
        company = self._get_context_company()
        if company is not None and value.company_id != company.id:
            raise serializers.ValidationError('Leave type not found or access denied.')
        return value

    def validate_approved_by(self, value):
        if value is None:
            return value
        company = self._get_context_company()
        if company is not None and value.company_id != company.id:
            raise serializers.ValidationError('Approver not found or access denied.')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        from_date = attrs.get('from_date', getattr(self.instance, 'from_date', None))
        to_date = attrs.get('to_date', getattr(self.instance, 'to_date', None))
        if from_date and to_date and to_date < from_date:
            raise serializers.ValidationError({'to_date': 'To date cannot be before from date.'})
        return attrs


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['id', 'name', 'date', 'holiday_type', 'is_mandatory', 'description', 'applicable_states', 'created_at']
        read_only_fields = ['id', 'created_at']


class LeaveTypeViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
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

    def _check_duplicate(self, company, name, code, exclude_pk=None):
        """Check for duplicate name or code within the company, optionally excluding current instance."""
        qs = LeaveType.objects.filter(company=company)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        if qs.filter(code__iexact=code).exists():
            return f'Leave type with code "{code.upper()}" already exists.'
        if qs.filter(name__iexact=name).exists():
            return f'Leave type with name "{name}" already exists.'
        return None

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            error = self._check_duplicate(
                company,
                request.data.get('name', ''),
                request.data.get('code', '')
            )
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def update(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            instance = self.get_object()
            # For PATCH, fall back to existing values if field not provided
            name = request.data.get('name', instance.name)
            code = request.data.get('code', instance.code)
            error = self._check_duplicate(company, name, code, exclude_pk=instance.pk)
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            partial = kwargs.pop('partial', False)
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            leave_type = self.get_object()
            leave_type.is_active = not leave_type.is_active
            leave_type.save()
            return Response({'id': leave_type.id, 'is_active': leave_type.is_active})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
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
    
    @action(detail=False, methods=['post'], url_path='initialize')
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
    
    @action(detail=False, methods=['post'], url_path='recalculate')
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
                    recalculated_days = calculate_leave_days(
                        company,
                        leave_app.from_date,
                        leave_app.to_date,
                    )
                    if recalculated_days != leave_app.total_days:
                        leave_app.total_days = recalculated_days
                        leave_app.save(update_fields=['total_days', 'updated_at'])
                    balance.used += Decimal(str(recalculated_days))
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
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
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

            if application.status == 'approved':
                return Response({'message': 'Leave already approved'})

            with transaction.atomic():
                if application.status in ['rejected', 'cancelled']:
                    return Response({'error': f'Cannot approve {application.status} leave'}, status=status.HTTP_400_BAD_REQUEST)

                days = Decimal(str(application.total_days))
                if days <= 0:
                    return Response({'error': 'No payable leave days in selected date range'}, status=status.HTTP_400_BAD_REQUEST)

                if application.leave_type.is_paid:
                    existing_balance = LeaveBalance.objects.select_for_update().filter(
                        employee=application.employee,
                        leave_type=application.leave_type,
                        year=application.from_date.year,
                    ).first()
                    available = existing_balance.closing_balance if existing_balance else application.leave_type.days_per_year
                    if Decimal(str(available)) < days:
                        return Response({
                            'error': f'Insufficient leave balance. Available {available}, requested {days}.'
                        }, status=status.HTTP_400_BAD_REQUEST)

                application.status = 'approved'
                application.approved_date = timezone.now()
                application.save()

                balance, created = LeaveBalance.objects.select_for_update().get_or_create(
                    employee=application.employee,
                    leave_type=application.leave_type,
                    year=application.from_date.year,
                    defaults={
                        'opening_balance': 0,
                        'credited': application.leave_type.days_per_year,
                        'used': days,
                        'closing_balance': application.leave_type.days_per_year - days,
                    }
                )
                if not created:
                    balance.used += days
                    balance.calculate_balance()

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
                    # Fix #6: include leaves that span into this month, not just start in it
                    if year_param:
                        yr = int(year_param)
                        last_day = cal_module.monthrange(yr, month)[1]
                        month_start = date(yr, month, 1)
                        month_end = date(yr, month, last_day)
                        queryset = self.get_queryset().filter(
                            from_date__lte=month_end,
                            to_date__gte=month_start
                        )
                    else:
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
        import io
        from django.http import HttpResponse

        headers = ['Employee', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Reason']
        rows = [
            [
                str(app.employee.full_name)[:100],
                str(app.leave_type.name)[:50],
                str(app.from_date),
                str(app.to_date),
                str(app.total_days),
                app.status,
                str(app.reason)[:200] if app.reason else '',
            ]
            for app in queryset
        ]

        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{sanitize_filename("leave_applications.csv")}"'
            writer = csv.writer(response)
            writer.writerow(headers)
            writer.writerows(rows)
            return response

        if format_type == 'excel':
            import openpyxl
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = 'Leave Applications'
            ws.append(headers)
            for row in rows:
                ws.append(row)
            buf = io.BytesIO()
            wb.save(buf)
            buf.seek(0)
            response = HttpResponse(
                buf.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{sanitize_filename("leave_applications.xlsx")}"'
            return response

        if format_type == 'pdf':
            from reportlab.lib.pagesizes import landscape, A4
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet
            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
            styles = getSampleStyleSheet()
            elements = [Paragraph('Leave Applications Report', styles['Title'])]
            t = Table([headers] + rows, repeatRows=1)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F81BD')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#DCE6F1')]),
            ]))
            elements.append(t)
            doc.build(elements)
            buf.seek(0)
            response = HttpResponse(buf.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{sanitize_filename("leave_applications.pdf")}"'
            return response

        return Response({'error': 'Export format not supported'}, status=status.HTTP_400_BAD_REQUEST)
    
    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            data = request.data.copy()
            employee_id = data.get('employee')
            from_date_value = data.get('from_date')
            to_date_value = data.get('to_date')
            if employee_id and from_date_value and to_date_value:
                employee = Employee.objects.get(id=employee_id, company=session.service_user.company)
                from_dt = datetime.strptime(from_date_value, '%Y-%m-%d').date() if isinstance(from_date_value, str) else from_date_value
                to_dt = datetime.strptime(to_date_value, '%Y-%m-%d').date() if isinstance(to_date_value, str) else to_date_value
                data['total_days'] = calculate_leave_days(employee.company, from_dt, to_dt)
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)


class HolidayViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
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


@api_view(['GET'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_leave_types(request):
    leave_types = LeaveType.objects.filter(company=request.employee.company, is_active=True).order_by('name')
    return Response({'results': LeaveTypeSerializer(leave_types, many=True).data})


@api_view(['GET'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_leave_balances(request):
    year = request.query_params.get('year') or timezone.now().year
    balances = LeaveBalance.objects.filter(
        employee=request.employee,
        year=year,
    ).select_related('leave_type').order_by('leave_type__name')
    return Response({'results': LeaveBalanceSerializer(balances, many=True).data})


@api_view(['GET', 'POST'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_leave_applications(request):
    employee = request.employee

    if request.method == 'GET':
        applications = LeaveApplication.objects.filter(employee=employee).select_related('leave_type').order_by('-created_at')
        return Response({'results': LeaveApplicationSerializer(applications, many=True, context={'request': request}).data})

    leave_type_id = request.data.get('leave_type')
    from_date_value = request.data.get('from_date')
    to_date_value = request.data.get('to_date')
    reason = request.data.get('reason', '').strip()
    if not all([leave_type_id, from_date_value, to_date_value, reason]):
        return Response({'error': 'Leave type, dates, and reason are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        leave_type = LeaveType.objects.get(id=leave_type_id, company=employee.company, is_active=True)
        from_dt = datetime.strptime(from_date_value, '%Y-%m-%d').date()
        to_dt = datetime.strptime(to_date_value, '%Y-%m-%d').date()
        if to_dt < from_dt:
            return Response({'error': 'To date cannot be before from date'}, status=status.HTTP_400_BAD_REQUEST)

        total_days = calculate_leave_days(employee.company, from_dt, to_dt)
        if total_days <= 0:
            return Response({'error': 'Selected dates do not include any working leave days'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            application = LeaveApplication.objects.create(
                employee=employee,
                leave_type=leave_type,
                from_date=from_dt,
                to_date=to_dt,
                total_days=total_days,
                reason=reason,
                status='pending',
            )
            CompanyNotification.objects.create(
                company=employee.company,
                type='user_activity',
                service_type='hr',
                title=f'Leave request from {employee.full_name}',
                message=(
                    f'{leave_type.name}: {from_dt:%d %b %Y} to {to_dt:%d %b %Y} '
                    f'({total_days} day(s)). Review required.'
                ),
                priority='high',
                metadata={
                    'navigate_to': 'hr-leave',
                    'leave_application_id': application.id,
                    'employee_id': employee.id,
                    'employee_number': employee.employee_id,
                },
            )
        return Response({
            'message': 'Leave request submitted for HR approval',
            'application': LeaveApplicationSerializer(application, context={'request': request}).data,
        }, status=status.HTTP_201_CREATED)
    except LeaveType.DoesNotExist:
        return Response({'error': 'Leave type not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def hr_notifications(request):
    notifications = CompanyNotification.objects.filter(
        company=request.service_user.company,
        service_type='hr',
    )[:30]
    return Response({'results': CompanyNotificationSerializer(notifications, many=True).data})


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def mark_hr_notification_read(request, notification_id):
    notification = CompanyNotification.objects.filter(
        id=notification_id,
        company=request.service_user.company,
        service_type='hr',
    ).first()
    if notification is None:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    notification.read = True
    notification.read_at = timezone.now()
    notification.save(update_fields=['read', 'read_at'])
    return Response({'message': 'Notification marked as read'})
    
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
