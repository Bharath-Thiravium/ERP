from rest_framework import viewsets, status, permissions
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
from .models import AttendanceSystem, Attendance, AttendanceDevice, AttendanceLog, Employee
from .attendance_serializers import (
    AttendanceSystemSerializer, AttendanceSerializer, AttendanceDeviceSerializer,
    MobileAttendanceSerializer, FaceRecognitionSerializer
)


class AttendanceSystemViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = AttendanceSystemSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return AttendanceSystem.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return AttendanceSystem.objects.filter(company=session.service_user.company)
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


class AttendanceViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
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
            
            employee = Employee.objects.get(id=employee_id, company=session.service_user.company)
            
            attendance, created = Attendance.objects.get_or_create(
                employee=employee,
                date=attendance_date,
                defaults={
                    'check_in_method': 'manual',
                    'check_out_method': 'manual',
                    'status': 'present'
                }
            )
            
            # Convert time strings to datetime objects
            if check_in_time:
                from datetime import datetime
                attendance.check_in_time = datetime.fromisoformat(check_in_time)
            if check_out_time:
                from datetime import datetime
                attendance.check_out_time = datetime.fromisoformat(check_out_time)
                
            attendance.save()
            if attendance.check_in_time and attendance.check_out_time:
                attendance.calculate_hours()
            
            serializer = self.get_serializer(attendance)
            return Response(serializer.data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def mobile_attendance(request):
    """Mobile app attendance check-in/out with face recognition and GPS"""
    serializer = MobileAttendanceSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    try:
        employee = Employee.objects.get(employee_id=data['employee_id'])
        today = date.today()
        
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
                attendance.is_valid_checkin_location = validate_location(
                    data.get('latitude'), data.get('longitude'), employee.company.attendance_system
                )
            
            # Process face image if provided
            if 'face_image' in request.FILES:
                attendance.check_in_face_image = request.FILES['face_image']
                # Here you would implement face recognition matching
                attendance.is_valid_face_match = True  # Placeholder
                attendance.face_match_score = 0.95  # Placeholder
            
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
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def face_recognition_attendance(request):
    """Face recognition attendance endpoint"""
    serializer = FaceRecognitionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    face_image = data['face_image']
    
    # Here you would implement face recognition logic
    # For now, we'll return a placeholder response
    
    try:
        # Placeholder: In real implementation, you'd:
        # 1. Extract face encoding from the image
        # 2. Compare with stored employee face encodings
        # 3. Find the best match above threshold
        
        # For demo, we'll assume we found an employee
        employee = Employee.objects.filter(face_encoding__isnull=False).first()
        
        if not employee:
            return Response({'error': 'No face match found'}, status=status.HTTP_404_NOT_FOUND)
        
        today = date.today()
        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={'status': 'present'}
        )
        
        current_time = timezone.now()
        
        if data['action'] == 'checkin':
            attendance.check_in_time = current_time
            attendance.check_in_method = 'face_recognition'
            attendance.check_in_face_image = face_image
            attendance.face_match_score = 0.95  # Placeholder
            attendance.is_valid_face_match = True
        else:
            attendance.check_out_time = current_time
            attendance.check_out_method = 'face_recognition'
            attendance.check_out_face_image = face_image
            attendance.calculate_hours()
        
        attendance.save()
        
        return Response({
            'message': f'Face recognized - {data["action"]} successful',
            'employee': {
                'id': employee.id,
                'name': employee.full_name,
                'employee_id': employee.employee_id
            },
            'match_score': 0.95
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def validate_location(latitude, longitude, attendance_system):
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
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def biometric_sync(request):
    """Sync attendance data from biometric devices"""
    device_id = request.data.get('device_id')
    attendance_logs = request.data.get('logs', [])
    
    try:
        device = AttendanceDevice.objects.get(device_id=device_id)
        
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