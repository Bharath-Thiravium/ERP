from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Service, MasterAdmin
from .serializers import ServiceSerializer
from .ultra_security import UltraSecurityManager
import json

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_services(request):
    """Get all services for master admin"""
    try:
        # Verify master admin
        master_admin = get_object_or_404(MasterAdmin, user=request.user)
        
        services = Service.objects.all().order_by('name')
        serializer = ServiceSerializer(services, many=True)
        
        return Response({
            'success': True,
            'services': serializer.data,
            'total_count': services.count()
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_service(request):
    """Create new service"""
    try:
        # Verify master admin
        master_admin = get_object_or_404(MasterAdmin, user=request.user)
        
        data = request.data
        
        # Validate required fields
        required_fields = ['name', 'service_type', 'description', 'base_price']
        for field in required_fields:
            if not data.get(field):
                return Response({
                    'success': False,
                    'error': f'{field} is required'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if service_type already exists
        if Service.objects.filter(service_type=data['service_type']).exists():
            return Response({
                'success': False,
                'error': 'Service type already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse features
        features = data.get('features', [])
        if isinstance(features, str):
            try:
                features = json.loads(features)
            except:
                features = [f.strip() for f in features.split(',') if f.strip()]
        
        with transaction.atomic():
            service = Service.objects.create(
                name=data['name'],
                service_type=data['service_type'],
                description=data['description'],
                base_price=float(data['base_price']),
                features=features,
                is_active=data.get('is_active', True)
            )
            
            # Log security event
            UltraSecurityManager.log_security_event(
                request.user,
                'SERVICE_CREATED',
                request.META.get('REMOTE_ADDR', ''),
                f'Created service: {service.name}'
            )
        
        serializer = ServiceSerializer(service)
        return Response({
            'success': True,
            'service': serializer.data,
            'message': 'Service created successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_service(request, service_id):
    """Update existing service"""
    try:
        # Verify master admin
        master_admin = get_object_or_404(MasterAdmin, user=request.user)
        
        service = get_object_or_404(Service, id=service_id)
        data = request.data
        
        # Parse features
        features = data.get('features', service.features)
        if isinstance(features, str):
            try:
                features = json.loads(features)
            except:
                features = [f.strip() for f in features.split(',') if f.strip()]
        
        with transaction.atomic():
            service.name = data.get('name', service.name)
            service.description = data.get('description', service.description)
            service.base_price = float(data.get('base_price', service.base_price))
            service.features = features
            service.is_active = data.get('is_active', service.is_active)
            service.save()
            
            # Log security event
            UltraSecurityManager.log_security_event(
                request.user,
                'SERVICE_UPDATED',
                request.META.get('REMOTE_ADDR', ''),
                f'Updated service: {service.name}'
            )
        
        serializer = ServiceSerializer(service)
        return Response({
            'success': True,
            'service': serializer.data,
            'message': 'Service updated successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_service(request, service_id):
    """Delete service (soft delete by setting inactive)"""
    try:
        # Verify master admin
        master_admin = get_object_or_404(MasterAdmin, user=request.user)
        
        service = get_object_or_404(Service, id=service_id)
        
        with transaction.atomic():
            service.is_active = False
            service.save()
            
            # Log security event
            UltraSecurityManager.log_security_event(
                request.user,
                'SERVICE_DELETED',
                request.META.get('REMOTE_ADDR', ''),
                f'Deleted service: {service.name}'
            )
        
        return Response({
            'success': True,
            'message': 'Service deleted successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_service_status(request, service_id):
    """Toggle service active status"""
    try:
        # Verify master admin
        master_admin = get_object_or_404(MasterAdmin, user=request.user)
        
        service = get_object_or_404(Service, id=service_id)
        
        with transaction.atomic():
            service.is_active = not service.is_active
            service.save()
            
            # Log security event
            status_text = 'activated' if service.is_active else 'deactivated'
            UltraSecurityManager.log_security_event(
                request.user,
                'SERVICE_STATUS_CHANGED',
                request.META.get('REMOTE_ADDR', ''),
                f'Service {status_text}: {service.name}'
            )
        
        serializer = ServiceSerializer(service)
        return Response({
            'success': True,
            'service': serializer.data,
            'message': f'Service {"activated" if service.is_active else "deactivated"} successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)