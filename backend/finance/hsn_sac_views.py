from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from authentication.models import ServiceUserSession
from .models import HSNCode, SACCode


class HSNCodeSearchView(APIView):
    """Search HSN codes"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')
        
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            search = request.query_params.get('search', '')
            queryset = HSNCode.objects.all()
            
            if search:
                queryset = queryset.filter(
                    Q(code__icontains=search) | Q(description__icontains=search)
                )
            
            queryset = queryset.order_by('code')[:50]
            
            results = [{
                'id': hsn.id,
                'code': hsn.code,
                'description': hsn.description,
                'gst_rate': float(hsn.gst_rate) if hsn.gst_rate else 0
            } for hsn in queryset]
            
            return Response({'results': results})
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class SACCodeSearchView(APIView):
    """Search SAC codes"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')
        
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            search = request.query_params.get('search', '')
            queryset = SACCode.objects.all()
            
            if search:
                queryset = queryset.filter(
                    Q(code__icontains=search) | Q(service_name__icontains=search)
                )
            
            queryset = queryset.order_by('code')[:50]
            
            results = [{
                'id': sac.id,
                'code': sac.code,
                'service_name': sac.service_name,
                'gst_rate': float(sac.gst_rate) if sac.gst_rate else 0
            } for sac in queryset]
            
            return Response({'results': results})
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
