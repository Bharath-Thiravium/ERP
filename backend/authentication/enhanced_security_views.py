from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import MasterAdmin
from .enhanced_security_models import IPRestriction, DeviceFingerprint, LoginNotification, SecuritySettings
from .enhanced_security_serializers import (
    IPRestrictionSerializer, DeviceFingerprintSerializer, 
    LoginNotificationSerializer, SecuritySettingsSerializer
)
from .permissions import IsMasterAdmin

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated, IsMasterAdmin])
def security_settings_view(request):
    """Get or update security settings"""
    master_admin = request.user.master_admin
    
    # Get or create security settings
    settings, created = SecuritySettings.objects.get_or_create(
        master_admin=master_admin,
        defaults={
            'ip_restrictions_enabled': False,
            'device_fingerprinting_enabled': True,
            'login_notifications_enabled': True,
            'captcha_after_failed_attempts': 3,
            'max_failed_attempts': 5,
            'lockout_duration_minutes': 15
        }
    )
    
    if request.method == 'GET':
        serializer = SecuritySettingsSerializer(settings)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = SecuritySettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated, IsMasterAdmin])
def ip_restrictions_view(request):
    """Get all IP restrictions or add new one"""
    master_admin = request.user.master_admin
    
    if request.method == 'GET':
        restrictions = IPRestriction.objects.filter(master_admin=master_admin)
        serializer = IPRestrictionSerializer(restrictions, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = IPRestrictionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(master_admin=master_admin)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE', 'PATCH'])
@permission_classes([permissions.IsAuthenticated, IsMasterAdmin])
def ip_restriction_detail_view(request, pk):
    """Update or delete specific IP restriction"""
    master_admin = request.user.master_admin
    restriction = get_object_or_404(IPRestriction, pk=pk, master_admin=master_admin)
    
    if request.method == 'DELETE':
        restriction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    elif request.method == 'PATCH':
        serializer = IPRestrictionSerializer(restriction, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsMasterAdmin])
def device_fingerprints_view(request):
    """Get all device fingerprints"""
    master_admin = request.user.master_admin
    devices = DeviceFingerprint.objects.filter(master_admin=master_admin)
    serializer = DeviceFingerprintSerializer(devices, many=True)
    return Response(serializer.data)

@api_view(['DELETE', 'PATCH'])
@permission_classes([permissions.IsAuthenticated, IsMasterAdmin])
def device_fingerprint_detail_view(request, device_id):
    """Update or delete specific device fingerprint"""
    master_admin = request.user.master_admin
    device = get_object_or_404(DeviceFingerprint, id=device_id, master_admin=master_admin)
    
    if request.method == 'DELETE':
        device.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    elif request.method == 'PATCH':
        serializer = DeviceFingerprintSerializer(device, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsMasterAdmin])
def login_notifications_view(request):
    """Get recent login notifications"""
    master_admin = request.user.master_admin
    notifications = LoginNotification.objects.filter(master_admin=master_admin)[:20]
    serializer = LoginNotificationSerializer(notifications, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsMasterAdmin])
def test_login_notification_view(request):
    """Test login notification system"""
    master_admin = request.user.master_admin
    
    # Create test notification
    notification = LoginNotification.objects.create(
        master_admin=master_admin,
        email_sent=True,
        ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
        location='Test Location',
        device_info='Test Device - Browser Test'
    )
    
    serializer = LoginNotificationSerializer(notification)
    return Response({
        'message': 'Test notification created successfully',
        'notification': serializer.data
    })