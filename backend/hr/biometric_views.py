from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.utils import timezone
from datetime import date

from authentication.models import ServiceUserSession
from .models import AttendanceDevice, Attendance, Employee
from .attendance_serializers import AttendanceDeviceSerializer


class BiometricDeviceViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = AttendanceDeviceSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return AttendanceDevice.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return AttendanceDevice.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return AttendanceDevice.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
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
            devices = AttendanceDevice.objects.filter(company=session.service_user.company)
            
            serializer = self.get_serializer(devices, many=True)
            return Response({'results': serializer.data})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Remove session_key from data if present
            data = request.data.copy()
            data.pop('session_key', None)
            
            serializer = self.get_serializer(data=data)
            if not serializer.is_valid():
                return Response({'error': 'Validation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer.save(company=session.service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def biometric_scan(request):
    """Start biometric scanning process"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    device_id = request.data.get('device_id')
    action = request.data.get('action')
    
    if not device_id or not action:
        return Response({'error': 'Device ID and action required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        
        # Check if device exists
        try:
            device = AttendanceDevice.objects.get(device_id=device_id, company=session.service_user.company)
        except AttendanceDevice.DoesNotExist:
            return Response({'error': 'Device not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # In real implementation, this would communicate with biometric hardware
        # For now, we'll simulate the process but require actual employee selection
        # This is a placeholder - real biometric devices would identify the employee automatically
        
        # Get the first active employee for demo (in real system, biometric would identify employee)
        employee = Employee.objects.filter(company=session.service_user.company, status='active').first()
        
        if not employee:
            return Response({'error': 'No active employees found'}, status=status.HTTP_404_NOT_FOUND)
        
        today = date.today()
        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={'status': 'present'}
        )
        
        current_time = timezone.now()
        
        if action == 'checkin':
            if attendance.check_in_time:
                return Response({'error': 'Already checked in today'}, status=status.HTTP_400_BAD_REQUEST)
            
            attendance.check_in_time = current_time
            attendance.check_in_method = 'biometric'
            attendance.biometric_device_id = device_id
        else:
            if not attendance.check_in_time:
                return Response({'error': 'Must check in first'}, status=status.HTTP_400_BAD_REQUEST)
            if attendance.check_out_time:
                return Response({'error': 'Already checked out today'}, status=status.HTTP_400_BAD_REQUEST)
            
            attendance.check_out_time = current_time
            attendance.check_out_method = 'biometric'
            attendance.calculate_hours()
        
        attendance.save()
        
        return Response({
            'message': f'{action.title()} successful',
            'employee_name': employee.full_name,
            'employee_id': employee.employee_id,
            'device_name': device.device_name,
            'action': action,
            'status': 'success',
            'timestamp': current_time.isoformat()
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def test_device(request):
    """Test biometric device connectivity"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    device_id = request.data.get('device_id')
    
    if not device_id:
        return Response({'error': 'Device ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        
        # Check if device exists in database
        try:
            device = AttendanceDevice.objects.get(device_id=device_id, company=session.service_user.company)
        except AttendanceDevice.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Device not found in system',
                'device_id': device_id,
                'status': 'not_found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # In real implementation, this would ping the actual device
        # For now, return device status from database
        return Response({
            'success': device.is_active,
            'message': 'Device test completed' if device.is_active else 'Device is inactive',
            'device_id': device_id,
            'device_name': device.device_name,
            'ip_address': device.ip_address,
            'status': 'online' if device.is_active else 'offline',
            'last_sync': device.last_sync.isoformat() if device.last_sync else None
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)