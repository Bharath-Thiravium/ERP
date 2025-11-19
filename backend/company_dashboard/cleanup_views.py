from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from authentication.permissions import IsCompanyUser
from .advanced_security_models import CompanyThreatDetection, CompanySecurityAlert, CompanyDeviceFingerprint

@api_view(['DELETE'])
@permission_classes([IsCompanyUser])
def clear_sample_data(request):
    """Clear all sample/test data"""
    company_user = request.user.company_user
    
    # Clear sample threats (multiple conditions)
    threats_deleted = CompanyThreatDetection.objects.filter(
        company=company_user.company
    ).filter(
        Q(evidence__contains={'simulated': True}) |
        Q(ml_model_version='v1.0') |
        Q(user_email__contains=f'user') |
        Q(user_email__contains=f'@{company_user.company.name.lower().replace(" ", "")}.com')
    ).delete()[0]
    
    # Clear sample devices
    devices_deleted = CompanyDeviceFingerprint.objects.filter(
        company=company_user.company,
        device_id__startswith='sample_device_'
    ).delete()[0]
    
    # Clear related alerts
    alerts_deleted = CompanySecurityAlert.objects.filter(
        company=company_user.company,
        metadata__contains={'ai_detected': True}
    ).delete()[0]
    
    return Response({
        'message': 'Sample data cleared successfully',
        'threats_deleted': threats_deleted,
        'devices_deleted': devices_deleted,
        'alerts_deleted': alerts_deleted
    })