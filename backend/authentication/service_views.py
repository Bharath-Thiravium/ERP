from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .models import Service
from .serializers import ServiceSerializer


class ActiveServicesView(APIView):
    """Get all active services for service user login"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        services = Service.objects.filter(is_active=True).order_by('name')
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)