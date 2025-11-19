from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from authentication.models import ServiceUserSession
from .unit_models import Unit
from .unit_serializers import UnitSerializer, UnitCreateSerializer


class UnitListCreateView(APIView):
    """List and create units for company"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def get(self, request):
        """Get units for company"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            # Get units for this company only
            queryset = Unit.objects.filter(company=service_user.company, is_active=True)

            # Add search functionality
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(code__icontains=search) | Q(name__icontains=search)
                )

            queryset = queryset.order_by('name')
            serializer = UnitSerializer(queryset, many=True)
            return Response({'results': serializer.data})

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def post(self, request):
        """Create new unit for company"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            serializer = UnitCreateSerializer(data=request.data)
            if serializer.is_valid():
                # Check if unit code already exists for this company
                if Unit.objects.filter(
                    company=service_user.company,
                    code=serializer.validated_data['code']
                ).exists():
                    return Response(
                        {'code': ['Unit with this code already exists for your company']},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                unit = serializer.save(
                    company=service_user.company,
                    created_by=service_user
                )
                response_serializer = UnitSerializer(unit)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)