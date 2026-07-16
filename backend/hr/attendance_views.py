from rest_framework import viewsets, status, permissions
from django.utils._os import safe_join
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import datetime, timedelta, date
import json
import base64
import numpy as np
from PIL import Image
import io

from authentication.models import ServiceUserSession
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .mobile_auth import EmployeeMobileAuthentication, IsEmployeeMobileAuthenticated
from .models import AttendanceSystem, AttendancePolicy, AttendanceDayOverride, Attendance, AttendanceDevice, AttendanceLog, Employee
from .attendance_serializers import (
    AttendanceSystemSerializer, AttendancePolicySerializer, AttendanceDayOverrideSerializer,
    AttendanceSerializer, AttendanceDeviceSerializer, MobileAttendanceSerializer, FaceRecognitionSerializer
)
from .attendance_calendar import get_day_status, is_company_working_day


def _get_company_attendance_system(company):
    system, _ = AttendanceSystem.objects.get_or_create(company=company)
    expected = {
        'manual': {
            'enable_manual_entry': True,
            'enable_mobile_app': False,
            'enable_biometric': False,
            'enable_geo_fencing': False,
            'require_face_for_checkin': False,
            'require_face_for_checkout': False,
        },
        'mobile_app': {
            'enable_manual_entry': False,
            'enable_mobile_app': True,
            'enable_biometric': False,
        },
        'biometric': {
            'enable_manual_entry': False,
            'enable_mobile_app': False,
            'enable_biometric': True,
            'enable_geo_fencing': False,
            'require_face_for_checkin': False,
            'require_face_for_checkout': False,
        },
    }
    if system.system_type in ['face_recognition', 'hybrid']:
        system.system_type = 'biometric' if system.system_type == 'face_recognition' else 'manual'

    normalized = expected.get(system.system_type, expected['manual'])
    dirty_fields = []
    for field, value in normalized.items():
        if getattr(system, field) != value:
            setattr(system, field, value)
            dirty_fields.append(field)
    if dirty_fields:
        system.save(update_fields=['system_type', *dirty_fields, 'updated_at'])
    return system


def _serialize_mobile_attendance_settings(system):
    return {
        'system_type': system.system_type,
        'enable_mobile_app': system.enable_mobile_app,
        'enable_geo_fencing': system.enable_geo_fencing,
        'geo_fence_radius': system.geo_fence_radius,
        'office_latitude': system.office_latitude,
        'office_longitude': system.office_longitude,
        'work_start_time': system.work_start_time,
        'work_end_time': system.work_end_time,
        'grace_period_minutes': system.grace_period_minutes,
        'enable_face_recognition': system.enable_face_recognition,
        'require_face_for_checkin': system.require_face_for_checkin,
        'require_face_for_checkout': system.require_face_for_checkout,
        'face_match_threshold': system.face_match_threshold,
    }


class AttendanceSystemViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    serializer_class = AttendanceSystemSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return AttendanceSystem.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return AttendanceSystem.objects.filter(company=session.service_user.company).order_by('id')
        except ServiceUserSession.DoesNotExist:
            return AttendanceSystem.objects.none()

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
            
            # Remove session_key from data if present
            data = request.data.copy()
            data.pop('session_key', None)
            
            # Check if attendance system already exists for this company
            existing_system = AttendanceSystem.objects.filter(company=session.service_user.company).first()
            if existing_system:
                # Update existing system
                serializer = self.get_serializer(existing_system, data=data, partial=True)
                if not serializer.is_valid():
                    return Response({'error': 'Validation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                # Create new system
                serializer = self.get_serializer(data=data)
                if not serializer.is_valid():
                    return Response({'error': 'Validation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
                serializer.save(company=session.service_user.company)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AttendancePolicyViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    serializer_class = AttendancePolicySerializer

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
            return AttendancePolicy.objects.none()
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return AttendancePolicy.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return AttendancePolicy.objects.none()

    def list(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            policy, _ = AttendancePolicy.objects.get_or_create(
                company=session.service_user.company,
                defaults={'weekly_off_days': [6]}
            )
            return Response({'results': [self.get_serializer(policy).data]})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            data = request.data.copy()
            data.pop('session_key', None)
            policy, _ = AttendancePolicy.objects.get_or_create(
                company=session.service_user.company,
                defaults={'weekly_off_days': [6]}
            )
            serializer = self.get_serializer(policy, data=data, partial=True)
            if not serializer.is_valid():
                return Response({'error': 'Validation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class AttendanceDayOverrideViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    serializer_class = AttendanceDayOverrideSerializer

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
            return AttendanceDayOverride.objects.none()
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return AttendanceDayOverride.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return AttendanceDayOverride.objects.none()

    def list(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = self.get_queryset()
            year = request.query_params.get('year')
            month = request.query_params.get('month')
            if year:
                queryset = queryset.filter(date__year=int(year))
            if month:
                queryset = queryset.filter(date__month=int(month))
            return Response({'results': self.get_serializer(queryset, many=True).data})
        except (ValueError, TypeError):
            return Response({'error': 'Invalid year or month'}, status=status.HTTP_400_BAD_REQUEST)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            data = request.data.copy()
            data.pop('session_key', None)
            override_date = data.get('date')
            if not override_date:
                return Response({'error': 'Date is required'}, status=status.HTTP_400_BAD_REQUEST)
            is_working_day = data.get('is_working_day', True)
            if isinstance(is_working_day, str):
                is_working_day = is_working_day.lower() in {'1', 'true', 'yes', 'on'}
            override, _ = AttendanceDayOverride.objects.update_or_create(
                company=session.service_user.company,
                date=override_date,
                defaults={
                    'is_working_day': bool(is_working_day),
                    'title': data.get('title', ''),
                    'reason': data.get('reason', ''),
                }
            )
            return Response(self.get_serializer(override).data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class AttendanceViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Attendance.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            queryset = Attendance.objects.filter(
                employee__company=session.service_user.company
            ).select_related('employee', 'employee__department')
            
            # Filter by date range
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            # Filter by employee
            employee_id = self.request.query_params.get('employee_id')
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            
            # Filter by department
            department_id = self.request.query_params.get('department_id')
            if department_id:
                queryset = queryset.filter(employee__department_id=department_id)
            
            return queryset.order_by('-date', '-check_in_time')
        except ServiceUserSession.DoesNotExist:
            return Attendance.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            today = date.today()
            
            # Today's stats
            today_attendance = Attendance.objects.filter(
                employee__company=company,
                date=today
            )
            
            total_employees = Employee.objects.filter(company=company, status='active').count()
            present_today = today_attendance.filter(status='present').count()
            late_today = today_attendance.filter(status='late').count()
            absent_today = total_employees - today_attendance.count()
            
            # This week's stats
            week_start = today - timedelta(days=today.weekday())
            week_attendance = Attendance.objects.filter(
                employee__company=company,
                date__gte=week_start,
                date__lte=today
            )
            
            avg_attendance = week_attendance.filter(status__in=['present', 'late']).count() / 7 if week_attendance.exists() else 0
            
            # Attendance by method
            method_stats = today_attendance.values('check_in_method').annotate(count=Count('id'))
            
            return Response({
                'today': {
                    'total_employees': total_employees,
                    'present': present_today,
                    'late': late_today,
                    'absent': absent_today,
                    'attendance_rate': round((present_today + late_today) / total_employees * 100, 1) if total_employees > 0 else 0
                },
                'week': {
                    'avg_attendance': round(avg_attendance, 1)
                },
                'methods': list(method_stats)
            })
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'])
    def manual_entry(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            employee_id = request.data.get('employee_id')
            attendance_date = request.data.get('date')
            check_in_time = request.data.get('check_in_time')
            check_out_time = request.data.get('check_out_time')
            attendance_status = request.data.get('status', 'present')
            notes = request.data.get('notes', '')

            valid_statuses = {'present', 'absent', 'late', 'half_day', 'leave', 'holiday'}
            if attendance_status not in valid_statuses:
                return Response({'error': 'Invalid attendance status'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not employee_id or not attendance_date:
                return Response({'error': 'Employee and date are required'}, status=status.HTTP_400_BAD_REQUEST)

            timed_statuses = {'present', 'late', 'half_day'}
            if attendance_status in timed_statuses and not all([check_in_time, check_out_time]):
                return Response({'error': 'Check-in time and check-out time are required for this status'}, status=status.HTTP_400_BAD_REQUEST)
            
            employee = Employee.objects.get(id=employee_id, company=session.service_user.company)
            from datetime import date as date_cls
            target_date = date_cls.fromisoformat(attendance_date) if isinstance(attendance_date, str) else attendance_date
            day_status = get_day_status(employee.company, target_date)
            if not day_status['is_working_day']:
                return Response({
                    'error': f"Cannot mark attendance on {day_status['label']}. Mark this date as a working day in Leave Calendar if office is open.",
                    'day_status': day_status['source'],
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if employee has approved leave for this date
            from .leave_models import LeaveApplication
            approved_leave = LeaveApplication.objects.filter(
                employee=employee,
                status='approved',
                from_date__lte=target_date,
                to_date__gte=target_date
            ).first()
            
            if approved_leave:
                return Response({
                    'error': f'Cannot mark attendance - Employee has approved {approved_leave.leave_type.name} on this date',
                    'leave_details': {
                        'leave_type': approved_leave.leave_type.name,
                        'from_date': approved_leave.from_date,
                        'to_date': approved_leave.to_date,
                        'reason': approved_leave.reason
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            if attendance_status == 'leave' and not approved_leave:
                return Response({'error': 'No approved leave found for this employee on this date'}, status=status.HTTP_400_BAD_REQUEST)

            if attendance_status == 'holiday':
                from .leave_models import Holiday
                holiday_exists = Holiday.objects.filter(
                    company=session.service_user.company,
                    date=target_date
                ).exists()
                if not holiday_exists and day_status['source'] != 'weekly_off':
                    return Response({'error': 'No holiday or weekly off configured for this date'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if attendance already exists for this date
            existing_attendance = Attendance.objects.filter(
                employee=employee,
                date=target_date
            ).first()
            
            if existing_attendance:
                serializer = self.get_serializer(existing_attendance)
                return Response({
                    'message': 'Attendance already marked for this employee on this date',
                    'already_exists': True,
                    'attendance': serializer.data
                }, status=status.HTTP_200_OK)
            
            check_in_dt = None
            check_out_dt = None
            if check_in_time and check_out_time:
                # Parse time strings properly with timezone awareness
                from datetime import datetime
                from django.utils import timezone as tz

                # Parse the datetime strings and ensure they're timezone-aware
                check_in_dt = datetime.fromisoformat(check_in_time.replace('Z', '+00:00'))
                check_out_dt = datetime.fromisoformat(check_out_time.replace('Z', '+00:00'))

                # Convert to local timezone if needed
                if check_in_dt.tzinfo is None:
                    check_in_dt = tz.make_aware(check_in_dt)
                if check_out_dt.tzinfo is None:
                    check_out_dt = tz.make_aware(check_out_dt)

                if check_out_dt <= check_in_dt:
                    return Response({'error': 'Check-out time must be after check-in time'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create new attendance record
            attendance = Attendance.objects.create(
                employee=employee,
                date=target_date,
                check_in_time=check_in_dt,
                check_out_time=check_out_dt,
                check_in_method='manual' if check_in_dt else None,
                check_out_method='manual' if check_out_dt else None,
                status=attendance_status,
                notes=notes
            )
            
            # Calculate working hours
            if check_in_dt and check_out_dt:
                attendance.calculate_hours()
            attendance.save()
            
            serializer = self.get_serializer(attendance)
            return Response({
                'message': 'Attendance marked successfully',
                'attendance': serializer.data
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': f'Invalid time format: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Failed to mark attendance: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_employee_profile(request):
    employee = request.employee
    return Response({
        'employee': {
            'id': employee.id,
            'employee_id': employee.employee_id,
            'first_name': employee.first_name,
            'last_name': employee.last_name,
            'full_name': employee.full_name,
            'email': employee.email,
            'phone': employee.phone,
            'department': employee.department.name,
            'designation': employee.designation.title,
            'profile_picture': request.build_absolute_uri(employee.profile_picture.url) if employee.profile_picture else None,
            'date_of_joining': employee.date_of_joining,
            'work_mode': employee.work_mode,
        },
        'company': {
            'id': employee.company.id,
            'name': employee.company.name,
            'company_code': employee.company.company_prefix,
            'logo': request.build_absolute_uri(employee.company.logo.url) if employee.company.logo else None,
        }
    })


@api_view(['GET'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_attendance_settings(request):
    system = _get_company_attendance_system(request.employee.company)
    return Response(_serialize_mobile_attendance_settings(system))


@api_view(['GET'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_today_attendance(request):
    attendance = Attendance.objects.filter(employee=request.employee, date=date.today()).first()
    return Response({
        'attendance': AttendanceSerializer(attendance, context={'request': request}).data if attendance else None
    })


@api_view(['GET'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_attendance_history(request):
    days = int(request.query_params.get('days', 30))
    days = min(max(days, 1), 90)
    start_date = date.today() - timedelta(days=days)
    records = Attendance.objects.filter(
        employee=request.employee,
        date__gte=start_date,
        date__lte=date.today()
    ).order_by('-date')
    return Response({'results': AttendanceSerializer(records, many=True, context={'request': request}).data})


@api_view(['POST'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_validate_location(request):
    employee = request.employee
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    if not latitude or not longitude:
        return Response({'error': 'Latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)

    system = _get_company_attendance_system(employee.company)
    if not system.enable_geo_fencing:
        return Response({'isValid': True, 'distance': 0, 'message': 'Geo-fence disabled - location accepted'})

    is_valid = validate_employee_location(latitude, longitude, system)
    distance = 0
    if system.office_latitude and system.office_longitude:
        from math import radians, cos, sin, asin, sqrt
        lat1, lon1 = radians(float(latitude)), radians(float(longitude))
        lat2, lon2 = radians(float(system.office_latitude)), radians(float(system.office_longitude))
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        distance = int(6371000 * (2 * asin(sqrt(a))))

    return Response({
        'isValid': is_valid,
        'distance': distance,
        'allowedRadius': system.geo_fence_radius,
        'message': f'You are {distance}m from office' + (' (within allowed range)' if is_valid else ' (outside allowed range)')
    })


@api_view(['POST'])
@authentication_classes([EmployeeMobileAuthentication])
@permission_classes([IsEmployeeMobileAuthenticated])
def mobile_mark_attendance(request):
    employee = request.employee
    data = request.data.copy()
    data['employee_id'] = employee.employee_id
    serializer = MobileAttendanceSerializer(data=data)
    if not serializer.is_valid():
        return Response({'error': 'Validation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    validated = serializer.validated_data
    system = _get_company_attendance_system(employee.company)
    if not system.enable_mobile_app:
        return Response({'error': 'Mobile attendance is disabled by HR'}, status=status.HTTP_403_FORBIDDEN)

    today = date.today()
    day_status = get_day_status(employee.company, today)
    if not day_status['is_working_day']:
        return Response({
            'error': f"Attendance is closed today: {day_status['label']}",
            'day_status': day_status['source'],
        }, status=status.HTTP_400_BAD_REQUEST)

    from .leave_models import LeaveApplication
    approved_leave = LeaveApplication.objects.filter(
        employee=employee,
        status='approved',
        from_date__lte=today,
        to_date__gte=today
    ).first()
    if approved_leave:
        return Response({
            'error': f'Cannot mark attendance - You have approved {approved_leave.leave_type.name} today',
            'leave_details': {
                'leave_type': approved_leave.leave_type.name,
                'from_date': approved_leave.from_date,
                'to_date': approved_leave.to_date
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    action = validated['action']
    requires_face = (
        (action == 'checkin' and system.require_face_for_checkin) or
        (action == 'checkout' and system.require_face_for_checkout)
    )
    if requires_face and 'face_image' not in request.FILES:
        return Response({'error': 'Face photo is required by HR attendance settings'}, status=status.HTTP_400_BAD_REQUEST)

    if system.enable_geo_fencing and not validate_employee_location(validated.get('latitude'), validated.get('longitude'), system):
        return Response({'error': 'You are outside the allowed office geo-fence'}, status=status.HTTP_400_BAD_REQUEST)

    attendance, _ = Attendance.objects.get_or_create(
        employee=employee,
        date=today,
        defaults={'status': 'present'}
    )
    current_time = timezone.now()

    if action == 'checkin':
        if attendance.check_in_time:
            return Response({'error': 'Already checked in today'}, status=status.HTTP_400_BAD_REQUEST)
        attendance.check_in_time = current_time
        attendance.check_in_method = 'mobile_app'
        attendance.check_in_latitude = validated.get('latitude')
        attendance.check_in_longitude = validated.get('longitude')
        attendance.check_in_location = validated.get('location_name', '')
        attendance.is_valid_checkin_location = True
        if 'face_image' in request.FILES:
            attendance.check_in_face_image = request.FILES['face_image']
            face_result = validate_face_recognition(employee, request.FILES['face_image']) if employee.face_photo else {'is_valid': True, 'score': 1.0}
            if not face_result['is_valid']:
                return Response({'error': 'Face recognition failed', 'message': face_result['message']}, status=status.HTTP_400_BAD_REQUEST)
            attendance.is_valid_face_match = True
            attendance.face_match_score = face_result['score']
        if attendance.is_late():
            attendance.status = 'late'
    else:
        if not attendance.check_in_time:
            return Response({'error': 'Must check in first'}, status=status.HTTP_400_BAD_REQUEST)
        if attendance.check_out_time:
            return Response({'error': 'Already checked out today'}, status=status.HTTP_400_BAD_REQUEST)
        attendance.check_out_time = current_time
        attendance.check_out_method = 'mobile_app'
        attendance.check_out_latitude = validated.get('latitude')
        attendance.check_out_longitude = validated.get('longitude')
        attendance.check_out_location = validated.get('location_name', '')
        attendance.is_valid_checkout_location = True
        if 'face_image' in request.FILES:
            attendance.check_out_face_image = request.FILES['face_image']
            face_result = validate_face_recognition(employee, request.FILES['face_image']) if employee.face_photo else {'is_valid': True, 'score': 1.0}
            if not face_result['is_valid']:
                return Response({'error': 'Face recognition failed', 'message': face_result['message']}, status=status.HTTP_400_BAD_REQUEST)
            attendance.is_valid_face_match = True
            attendance.face_match_score = face_result['score']
        attendance.calculate_hours()

    attendance.save()
    return Response({
        'message': f'Successfully {action}',
        'attendance': AttendanceSerializer(attendance, context={'request': request}).data
    })


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def mobile_attendance(request):
    """Mobile app attendance check-in/out with face recognition and GPS"""
    serializer = MobileAttendanceSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'error': 'Validation failed',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        employee = Employee.objects.get(employee_id=data['employee_id'], company=request.service_user.company)
        today = date.today()
        day_status = get_day_status(employee.company, today)
        if not day_status['is_working_day']:
            return Response({
                'error': f"Attendance is closed today: {day_status['label']}",
                'day_status': day_status['source'],
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if employee has approved leave for today
        from .leave_models import LeaveApplication
        approved_leave = LeaveApplication.objects.filter(
            employee=employee,
            status='approved',
            from_date__lte=today,
            to_date__gte=today
        ).first()
        
        if approved_leave:
            return Response({
                'error': f'Cannot mark attendance - You have approved {approved_leave.leave_type.name} today',
                'leave_details': {
                    'leave_type': approved_leave.leave_type.name,
                    'from_date': approved_leave.from_date,
                    'to_date': approved_leave.to_date
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={'status': 'present'}
        )
        
        current_time = timezone.now()
        
        if data['action'] == 'checkin':
            if attendance.check_in_time:
                return Response({'error': 'Already checked in today'}, status=status.HTTP_400_BAD_REQUEST)
            
            attendance.check_in_time = current_time
            attendance.check_in_method = 'mobile_app'
            attendance.check_in_latitude = data.get('latitude')
            attendance.check_in_longitude = data.get('longitude')
            attendance.check_in_location = data.get('location_name', '')
            
            # Validate location if geo-fencing is enabled
            if hasattr(employee.company, 'attendance_system') and employee.company.attendance_system.enable_geo_fencing:
                attendance.is_valid_checkin_location = validate_employee_location(
                    data.get('latitude'), data.get('longitude'), employee.company.attendance_system
                )
            
            # Process face image if provided
            if 'face_image' in request.FILES:
                attendance.check_in_face_image = request.FILES['face_image']
                
                # Face recognition validation against employee's registered face
                if employee.face_photo:
                    face_match_result = validate_face_recognition(employee, request.FILES['face_image'])
                    if not face_match_result['is_valid']:
                        return Response({
                            'error': 'Face recognition failed',
                            'message': face_match_result['message']
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    attendance.is_valid_face_match = face_match_result['is_valid']
                    attendance.face_match_score = face_match_result['score']
                else:
                    # No face photo registered, skip validation but log the image
                    attendance.is_valid_face_match = True
                    attendance.face_match_score = 1.0
            
            # Check if late
            if attendance.is_late():
                attendance.status = 'late'
                
        elif data['action'] == 'checkout':
            if not attendance.check_in_time:
                return Response({'error': 'Must check in first'}, status=status.HTTP_400_BAD_REQUEST)
            if attendance.check_out_time:
                return Response({'error': 'Already checked out today'}, status=status.HTTP_400_BAD_REQUEST)
            
            attendance.check_out_time = current_time
            attendance.check_out_method = 'mobile_app'
            attendance.check_out_latitude = data.get('latitude')
            attendance.check_out_longitude = data.get('longitude')
            attendance.check_out_location = data.get('location_name', '')
            
            if 'face_image' in request.FILES:
                attendance.check_out_face_image = request.FILES['face_image']
                
                # Face recognition validation for checkout
                if employee.face_photo:
                    face_match_result = validate_face_recognition(employee, request.FILES['face_image'])
                    if not face_match_result['is_valid']:
                        return Response({
                            'error': 'Face recognition failed',
                            'message': face_match_result['message']
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    attendance.is_valid_face_match = face_match_result['is_valid']
                    attendance.face_match_score = face_match_result['score']
                else:
                    # No face photo registered, skip validation but log the image
                    attendance.is_valid_face_match = True
                    attendance.face_match_score = 1.0
            
            attendance.calculate_hours()
        
        attendance.save()
        
        serializer = AttendanceSerializer(attendance)
        return Response({
            'message': f'Successfully {data["action"]}',
            'attendance': serializer.data
        })
        
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def face_recognition_attendance(request):
    """Enhanced face recognition attendance endpoint"""
    serializer = FaceRecognitionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'error': 'Validation failed',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    # This endpoint is deprecated - use mobile attendance endpoint instead
    return Response({
        'error': 'Face recognition endpoint deprecated',
        'message': 'Please use mobile attendance endpoint for face recognition',
        'redirect': '/api/hr/attendance/mobile/'
    }, status=status.HTTP_410_GONE)


def validate_face_recognition(employee, face_image):
    """Validate face recognition against employee's stored face"""
    try:
        # Check if employee has a face photo (not profile picture)
        if not employee.face_photo:
            return {
                'is_valid': False,
                'score': 0.0,
                'message': 'No face photo registered for employee. Please register face photo first.'
            }
        
        # Try to import face_recognition library
        try:
            import face_recognition
            import numpy as np
            from PIL import Image
            import io
        except ImportError:
            # Face recognition library not installed, allow attendance with warning
            return {
                'is_valid': True,
                'score': 1.0,
                'message': 'Face recognition library not available - attendance allowed without verification'
            }
        
        # Load employee's reference face image
        try:
            reference_image = face_recognition.load_image_file(employee.face_photo.path)
            reference_encodings = face_recognition.face_encodings(reference_image)
            
            if not reference_encodings:
                return {
                    'is_valid': False,
                    'score': 0.0,
                    'message': 'No face detected in registered face photo. Please re-register face photo.'
                }
            
            reference_encoding = reference_encodings[0]
        except Exception as e:
            return {
                'is_valid': False,
                'score': 0.0,
                'message': 'Error processing registered face photo.'
            }
        
        # Load and process the uploaded image
        try:
            # Convert uploaded file to image
            image_data = face_image.read()
            face_image.seek(0)  # Reset file pointer
            
            # Load image using face_recognition
            uploaded_image = face_recognition.load_image_file(io.BytesIO(image_data))
            uploaded_encodings = face_recognition.face_encodings(uploaded_image)
            
            if not uploaded_encodings:
                return {
                    'is_valid': False,
                    'score': 0.0,
                    'message': 'No face detected in captured photo. Please take a clear photo showing your face.'
                }
            
            uploaded_encoding = uploaded_encodings[0]
        except Exception as e:
            return {
                'is_valid': False,
                'score': 0.0,
                'message': 'Error processing captured photo.'
            }
        
        # Compare faces
        face_distances = face_recognition.face_distance([reference_encoding], uploaded_encoding)
        face_distance = face_distances[0]
        
        # Convert distance to similarity score (0-1, where 1 is perfect match)
        similarity_score = 1 - face_distance
        
        # Get threshold from attendance system or use default
        threshold = 0.6
        if hasattr(employee.company, 'attendance_system') and employee.company.attendance_system:
            threshold = float(employee.company.attendance_system.face_match_threshold)
        
        is_match = similarity_score >= threshold
        
        if is_match:
            return {
                'is_valid': True,
                'score': round(similarity_score, 3),
                'message': f'Face recognition successful - {round(similarity_score * 100, 1)}% match'
            }
        else:
            return {
                'is_valid': False,
                'score': round(similarity_score, 3),
                'message': f'Face does not match registered photo. Similarity: {round(similarity_score * 100, 1)}% (Required: {round(threshold * 100, 1)}%)'
            }
            
    except Exception as e:
        return {
            'is_valid': False,
            'score': 0.0,
            'message': f'Face recognition system error: {str(e)}'
        }


def validate_employee_location(latitude, longitude, attendance_system):
    """Validate if employee is within geo-fence"""
    if not latitude or not longitude:
        return False
    
    if not attendance_system.office_latitude or not attendance_system.office_longitude:
        return True  # No office location set, allow all
    
    # Calculate distance using Haversine formula
    from math import radians, cos, sin, asin, sqrt
    
    lat1, lon1 = radians(float(latitude)), radians(float(longitude))
    lat2, lon2 = radians(float(attendance_system.office_latitude)), radians(float(attendance_system.office_longitude))
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    distance = 6371000 * c  # Distance in meters
    
    return distance <= attendance_system.geo_fence_radius


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def validate_location(request):
    """Validate employee location against geo-fence settings"""
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')

    if not latitude or not longitude:
        return Response({
            'error': 'Latitude and longitude are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get this company's attendance system only (not the first one across all companies)
        attendance_systems = AttendanceSystem.objects.filter(
            company=request.service_user.company,
            enable_geo_fencing=True,
            office_latitude__isnull=False,
            office_longitude__isnull=False
        ).first()

        if not attendance_systems:
            return Response({
                'isValid': True,
                'message': 'No geo-fence configured - location accepted',
                'distance': 0
            })
        
        # Calculate distance using Haversine formula
        from math import radians, cos, sin, asin, sqrt
        
        lat1, lon1 = radians(float(latitude)), radians(float(longitude))
        lat2, lon2 = radians(float(attendance_systems.office_latitude)), radians(float(attendance_systems.office_longitude))
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        distance = int(6371000 * c)  # Distance in meters
        
        is_valid = distance <= attendance_systems.geo_fence_radius
        
        return Response({
            'isValid': is_valid,
            'distance': distance,
            'allowedRadius': attendance_systems.geo_fence_radius,
            'message': f'You are {distance}m from office' + (' (within allowed range)' if is_valid else ' (outside allowed range)')
        })
        
    except Exception as e:
        return Response({
            'isValid': True,  # Allow attendance if validation fails
            'message': 'Location validation unavailable',
            'distance': 0
        })


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def biometric_sync(request):
    """Sync attendance data from biometric devices"""
    device_id = request.data.get('device_id')
    attendance_logs = request.data.get('logs', [])

    try:
        device = AttendanceDevice.objects.get(device_id=device_id, company=request.service_user.company)

        for log_data in attendance_logs:
            employee_id = log_data.get('employee_id')
            timestamp = log_data.get('timestamp')
            log_type = log_data.get('type')  # 'in' or 'out'
            
            try:
                employee = Employee.objects.get(employee_id=employee_id, company=device.company)
                
                # Create attendance log
                AttendanceLog.objects.create(
                    device=device,
                    employee=employee,
                    timestamp=timestamp,
                    log_type=log_type,
                    raw_data=log_data
                )
                
                # Process into attendance record
                attendance_date = datetime.fromisoformat(timestamp).date()
                attendance, created = Attendance.objects.get_or_create(
                    employee=employee,
                    date=attendance_date,
                    defaults={'status': 'present'}
                )
                
                if log_type == 'in' and not attendance.check_in_time:
                    attendance.check_in_time = timestamp
                    attendance.check_in_method = 'biometric'
                    attendance.biometric_device_id = device_id
                elif log_type == 'out' and not attendance.check_out_time:
                    attendance.check_out_time = timestamp
                    attendance.check_out_method = 'biometric'
                    attendance.calculate_hours()
                
                attendance.save()
                
            except Employee.DoesNotExist:
                continue
        
        device.last_sync = timezone.now()
        device.save()
        
        return Response({'message': f'Synced {len(attendance_logs)} records'})
        
    except AttendanceDevice.DoesNotExist:
        return Response({'error': 'Device not found'}, status=status.HTTP_404_NOT_FOUND)
