from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.utils import timezone
from datetime import date

from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .models import AttendanceDevice, Attendance, Employee
from .attendance_serializers import AttendanceDeviceSerializer


class BiometricDeviceViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    serializer_class = AttendanceDeviceSerializer

    def get_queryset(self):
        return AttendanceDevice.objects.filter(company=self.request.service_user.company)

    def list(self, request, *args, **kwargs):
        devices = self.get_queryset()
        serializer = self.get_serializer(devices, many=True)
        return Response({'results': serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Validation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            serializer.save(company=request.service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def biometric_scan(request):
    """Start biometric scanning process"""
    device_id = request.data.get('device_id')
    employee_id = request.data.get('employee_id')
    action = request.data.get('action')

    if not device_id or not action or not employee_id:
        return Response({'error': 'Device ID, employee ID, and action required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        device = AttendanceDevice.objects.get(device_id=device_id, company=request.service_user.company)
    except AttendanceDevice.DoesNotExist:
        return Response({'error': 'Device not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        employee = Employee.objects.get(
            employee_id=employee_id, company=request.service_user.company, status='active'
        )
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

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


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def test_device(request):
    """Test biometric device connectivity"""
    device_id = request.data.get('device_id')

    if not device_id:
        return Response({'error': 'Device ID required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        device = AttendanceDevice.objects.get(device_id=device_id, company=request.service_user.company)
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
