from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from authentication.permissions import IsCompanyUser
from .threat_detection_engine import threat_monitor
from .security_models import CompanySecurityLog

@api_view(['POST'])
@permission_classes([IsCompanyUser])
def test_threat_detection(request):
    """Test threat detection by creating fake security logs"""
    company_user = request.user.company_user
    
    # Create some fake failed login attempts
    for i in range(3):
        CompanySecurityLog.objects.create(
            company=company_user.company,
            user_email=request.user.email,
            action='failed_login',
            ip_address='192.168.1.100',
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=False,
            details=f'Test failed login attempt #{i+1}',
            timestamp=timezone.now() - timedelta(minutes=i)
        )
    
    # Trigger threat detection
    threats = threat_monitor.monitor_login_attempt(
        company_user.company,
        request.user.email,
        '192.168.1.100',
        request.META.get('HTTP_USER_AGENT', ''),
        success=False
    )
    
    return Response({
        'message': f'Created 3 test failed login attempts and triggered threat detection',
        'threats_detected': len(threats),
        'threat_types': [t['type'] for t in threats] if threats else []
    })