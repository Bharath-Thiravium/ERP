from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """API health check endpoint"""
    return Response({
        'status': 'healthy',
        'message': 'ᗩTᕼᙓᑎᗩ\'𝔖 Backend API is running',
        'debug': settings.DEBUG,
        'version': '1.0.0'
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_info(request):
    """API information endpoint"""
    return Response({
        'name': 'ᗩTᕼᙓᑎᗩ\'𝔖 Backend API',
        'version': '1.0.0',
        'description': 'Modern ᗩTᕼᙓᑎᗩ\'𝔖 System Backend API',
        'endpoints': {
            'auth': '/api/auth/',
            'finance': '/api/finance/',
            'hr': '/api/hr/',
            'inventory': '/api/inventory/',
            'orders': '/api/orders/',
            'analytics': '/api/analytics/',
            'reports': '/api/reports/',
            'notifications': '/api/notifications/',
        },
        'websockets': {
            'notifications': '/ws/notifications/',
            'chat': '/ws/chat/',
        }
    })
