from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from authentication.models import Company, CompanyUser
from .security_models import CompanySecuritySettings, CompanyRecoveryCode
import pyotp
import qrcode
import io
import base64
import secrets
import string


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def setup_2fa_view(request):
    """Setup 2FA for company user"""
    if not hasattr(request.user, 'company_user'):
        return Response({
            'error': 'Only company users can setup 2FA.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    company_user = request.user.company_user
    company = company_user.company
    
    # Get or create security settings
    security_settings, created = CompanySecuritySettings.objects.get_or_create(
        company=company,
        defaults={'two_factor_enabled': False}
    )
    
    if security_settings.two_factor_enabled:
        return Response({
            'error': '2FA is already enabled. Disable it first to set up again.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate secret key
    secret = pyotp.random_base32()
    
    # Create TOTP object
    totp = pyotp.TOTP(secret)
    
    # Generate QR code
    provisioning_uri = totp.provisioning_uri(
        name=request.user.email,
        issuer_name=f"{company.name} - SAP System"
    )
    
    # Create QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    # Convert to base64 image
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Store secret temporarily (not enabled yet)
    security_settings.two_factor_secret = secret
    security_settings.save()
    
    return Response({
        'qr_code': f"data:image/png;base64,{qr_code_base64}",
        'secret': secret,
        'message': 'Scan the QR code with your authenticator app and verify with a code to enable 2FA.'
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_2fa_setup_view(request):
    """Verify 2FA setup with code"""
    if not hasattr(request.user, 'company_user'):
        return Response({
            'error': 'Only company users can verify 2FA.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    company_user = request.user.company_user
    company = company_user.company
    code = request.data.get('code')
    
    if not code:
        return Response({
            'error': 'Verification code is required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        security_settings = CompanySecuritySettings.objects.get(company=company)
    except CompanySecuritySettings.DoesNotExist:
        return Response({
            'error': 'No 2FA setup in progress. Please start setup first.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not security_settings.two_factor_secret:
        return Response({
            'error': 'No 2FA setup in progress. Please start setup first.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify the code
    totp = pyotp.TOTP(security_settings.two_factor_secret)
    if totp.verify(code):
        # Generate recovery codes
        recovery_codes = []
        for _ in range(10):
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            recovery_codes.append(code)
            
            # Store recovery code
            recovery_code_obj = CompanyRecoveryCode(company=company)
            recovery_code_obj.set_code(code)
            recovery_code_obj.save()
        
        # Enable 2FA
        security_settings.two_factor_enabled = True
        security_settings.save()
        
        return Response({
            'message': '2FA enabled successfully!',
            'recovery_codes': recovery_codes,
            'warning': 'Save these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device.'
        })
    else:
        return Response({
            'error': 'Invalid verification code. Please try again.'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def disable_2fa_view(request):
    """Disable 2FA for company user"""
    if not hasattr(request.user, 'company_user'):
        return Response({
            'error': 'Only company users can disable 2FA.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    company_user = request.user.company_user
    company = company_user.company
    password = request.data.get('password')
    
    if not password:
        return Response({
            'error': 'Password is required to disable 2FA.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify password
    if not request.user.check_password(password):
        return Response({
            'error': 'Invalid password.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        security_settings = CompanySecuritySettings.objects.get(company=company)
        
        # Disable 2FA
        security_settings.two_factor_enabled = False
        security_settings.two_factor_secret = ''
        security_settings.save()
        
        # Delete recovery codes
        CompanyRecoveryCode.objects.filter(company=company).delete()
        
        return Response({
            'message': '2FA disabled successfully.'
        })
    except CompanySecuritySettings.DoesNotExist:
        return Response({
            'error': '2FA is not enabled.'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_2fa_status_view(request):
    """Get 2FA status for company user"""
    if not hasattr(request.user, 'company_user'):
        return Response({
            'error': 'Only company users can check 2FA status.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    company_user = request.user.company_user
    company = company_user.company
    
    try:
        security_settings = CompanySecuritySettings.objects.get(company=company)
        recovery_codes_count = CompanyRecoveryCode.objects.filter(
            company=company, 
            is_used=False
        ).count()
        
        return Response({
            'two_factor_enabled': security_settings.two_factor_enabled,
            'has_recovery_codes': recovery_codes_count > 0,
            'recovery_codes_count': recovery_codes_count
        })
    except CompanySecuritySettings.DoesNotExist:
        return Response({
            'two_factor_enabled': False,
            'has_recovery_codes': False,
            'recovery_codes_count': 0
        })