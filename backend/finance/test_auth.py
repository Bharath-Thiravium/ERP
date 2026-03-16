from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from authentication.models import ServiceUserSession

@api_view(['GET'])
@permission_classes([AllowAny])
def test_session_auth(request):
    session_key = request.GET.get('session_key')
    
    if not session_key:
        return Response({'error': 'No session_key provided'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        return Response({
            'success': True,
            'user': session.service_user.username,
            'company': session.service_user.company.name,
            'company_id': session.service_user.company.id
        })
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)
