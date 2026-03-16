from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.db import transaction, models
from datetime import timedelta
import pyotp
import secrets
import string
from .security_models import (
    CompanySecuritySettings, CompanyRecoveryCode, CompanyApiKey,
    CompanyIpRestriction, CompanyUserSession, CompanySecurityLog,
    CompanyPasswordHistory, CompanyLoginAttempt
)
from .security_serializers import (
    CompanySecuritySettingsSerializer, TwoFactorSetupSerializer,
    TwoFactorVerifySerializer, CompanyRecoveryCodeSerializer,
    CompanyApiKeySerializer, CompanyApiKeyCreateSerializer,
    CompanyIpRestrictionSerializer, CompanyUserSessionSerializer,
    CompanySecurityLogSerializer, PasswordChangeSerializer,
    SecurityOverviewSerializer
)
from authentication.models import CompanyUser
from authentication.permissions import IsCompanyUser
import logging

logger = logging.getLogger(__name__)

class SecurityOverviewView(APIView):
    permission_classes = [IsCompanyUser]

    def get(self, request):
        user = request.user
        company_user = user.company_user
        company = company_user.company
        
        # Get or create security settings
        security_settings, _ = CompanySecuritySettings.objects.get_or_create(
            company=company,
            defaults={
                'session_timeout_minutes': 60,
                'max_failed_attempts': 5,
                'lockout_duration_minutes': 15,
                'password_expiry_days': 90
            }
        )
        
        # Calculate security score
        score = 50  # Base score
        if security_settings.two_factor_enabled:
            score += 20
        if security_settings.ip_restrictions_enabled:
            score += 15
        if company.recovery_codes.filter(is_used=False).exists():
            score += 10
        if company.api_keys.filter(is_active=True).exists():
            score += 5
        
        # Get metrics
        active_sessions = CompanyUserSession.objects.filter(
            user=company_user,
            expires_at__gt=timezone.now()
        ).count()
        
        failed_attempts = CompanyLoginAttempt.objects.filter(
            email=user.email,
            success=False,
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        # Password expiry
        password_age = (timezone.now() - company_user.password_changed_at).days if company_user.password_changed_at else 0
        days_until_expiry = max(0, security_settings.password_expiry_days - password_age)
        
        # Recent security events
        recent_events = CompanySecurityLog.objects.filter(
            company=company,
            timestamp__gte=timezone.now() - timedelta(days=7)
        )[:5]
        
        data = {
            'security_score': min(100, score),
            'active_sessions': active_sessions,
            'failed_attempts': failed_attempts,
            'days_until_expiry': days_until_expiry,
            'two_factor_enabled': security_settings.two_factor_enabled,
            'recovery_codes_generated': company.recovery_codes.filter(is_used=False).exists(),
            'api_keys_count': company.api_keys.filter(is_active=True).count(),
            'ip_restrictions_enabled': security_settings.ip_restrictions_enabled,
            'recent_security_events': [
                {
                    'action': event.action,
                    'timestamp': event.timestamp,
                    'success': event.success,
                    'details': event.details
                } for event in recent_events
            ]
        }
        
        serializer = SecurityOverviewSerializer(data)
        return Response(serializer.data)

class TwoFactorSetupView(APIView):
    permission_classes = [IsCompanyUser]

    def get(self, request):
        """Generate QR code for 2FA setup"""
        serializer = TwoFactorSetupSerializer()
        qr_data = serializer.generate_qr_code(request.user)
        return Response(qr_data)

    def post(self, request):
        """Verify and enable 2FA"""
        serializer = TwoFactorVerifySerializer(data=request.data)
        if serializer.is_valid():
            code = serializer.validated_data['code']
            secret = serializer.validated_data['secret']
            
            # Verify TOTP code
            totp = pyotp.TOTP(secret)
            if totp.verify(code):
                # Save secret and enable 2FA
                security_settings, _ = CompanySecuritySettings.objects.get_or_create(
                    company=request.user.company_user.company
                )
                security_settings.two_factor_secret = secret
                security_settings.two_factor_enabled = True
                security_settings.save()
                
                # Log security event
                CompanySecurityLog.objects.create(
                    company=request.user.company_user.company,
                    user_email=request.user.email,
                    action='2fa_enable',
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True,
                    details='Two-factor authentication enabled'
                )
                
                return Response({'message': '2FA enabled successfully'})
            else:
                return Response(
                    {'error': 'Invalid verification code'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Disable 2FA"""
        security_settings = CompanySecuritySettings.objects.filter(
            company=request.user.company_user.company
        ).first()
        
        if security_settings and security_settings.two_factor_enabled:
            security_settings.two_factor_enabled = False
            security_settings.two_factor_secret = None
            security_settings.save()
            
            # Log security event
            CompanySecurityLog.objects.create(
                company=request.user.company_user.company,
                user_email=request.user.email,
                action='2fa_disable',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
                details='Two-factor authentication disabled'
            )
            
            return Response({'message': '2FA disabled successfully'})
        
        return Response(
            {'error': '2FA is not enabled'},
            status=status.HTTP_400_BAD_REQUEST
        )

class RecoveryCodesView(APIView):
    permission_classes = [IsCompanyUser]

    def get(self, request):
        """Get recovery codes status"""
        codes = CompanyRecoveryCode.objects.filter(
            company=request.user.company_user.company,
            is_used=False
        )
        return Response({
            'total_codes': codes.count(),
            'unused_codes': codes.count()
        })

    def post(self, request):
        """Generate new recovery codes"""
        company = request.user.company_user.company
        
        with transaction.atomic():
            # Delete existing codes
            CompanyRecoveryCode.objects.filter(company=company).delete()
            
            # Generate 10 new codes
            codes = []
            for _ in range(10):
                code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
                recovery_code = CompanyRecoveryCode.objects.create(company=company)
                recovery_code.set_code(code)
                recovery_code.save()
                codes.append(code)
            
            # Log security event
            CompanySecurityLog.objects.create(
                company=company,
                user_email=request.user.email,
                action='recovery_codes_generate',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
                details='Recovery codes generated'
            )
            
            return Response({'codes': codes})

class ApiKeysView(APIView):
    permission_classes = [IsCompanyUser]

    def get(self, request):
        """List API keys"""
        api_keys = CompanyApiKey.objects.filter(
            company=request.user.company_user.company,
            is_active=True
        )
        serializer = CompanyApiKeySerializer(api_keys, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create new API key"""
        serializer = CompanyApiKeyCreateSerializer(data=request.data)
        if serializer.is_valid():
            api_key = serializer.save(company=request.user.company_user.company)
            key = api_key.generate_key()
            api_key.save()
            
            # Log security event
            CompanySecurityLog.objects.create(
                company=request.user.company_user.company,
                user_email=request.user.email,
                action='api_key_create',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
                details=f'API key created: {api_key.name}'
            )
            
            response_data = CompanyApiKeySerializer(api_key).data
            response_data['key'] = key  # Only show key once
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, key_id):
        """Delete API key"""
        try:
            api_key = CompanyApiKey.objects.get(
                id=key_id,
                company=request.user.company_user.company
            )
            api_key.is_active = False
            api_key.save()
            
            # Log security event
            CompanySecurityLog.objects.create(
                company=request.user.company_user.company,
                user_email=request.user.email,
                action='api_key_delete',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
                details=f'API key deleted: {api_key.name}'
            )
            
            return Response({'message': 'API key deleted successfully'})
        except CompanyApiKey.DoesNotExist:
            return Response(
                {'error': 'API key not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class IpRestrictionsView(APIView):
    permission_classes = [IsCompanyUser]

    def get(self, request):
        """List IP restrictions"""
        restrictions = CompanyIpRestriction.objects.filter(
            company=request.user.company_user.company,
            is_active=True
        )
        serializer = CompanyIpRestrictionSerializer(restrictions, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Add IP restriction"""
        serializer = CompanyIpRestrictionSerializer(data=request.data)
        if serializer.is_valid():
            restriction = serializer.save(company=request.user.company_user.company)
            
            # Log security event
            CompanySecurityLog.objects.create(
                company=request.user.company_user.company,
                user_email=request.user.email,
                action='ip_restriction_add',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
                details=f'IP restriction added: {restriction.ip_address}'
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, restriction_id):
        """Remove IP restriction"""
        try:
            restriction = CompanyIpRestriction.objects.get(
                id=restriction_id,
                company=request.user.company_user.company
            )
            restriction.is_active = False
            restriction.save()
            
            # Log security event
            CompanySecurityLog.objects.create(
                company=request.user.company_user.company,
                user_email=request.user.email,
                action='ip_restriction_remove',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
                details=f'IP restriction removed: {restriction.ip_address}'
            )
            
            return Response({'message': 'IP restriction removed successfully'})
        except CompanyIpRestriction.DoesNotExist:
            return Response(
                {'error': 'IP restriction not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class SessionsView(APIView):
    permission_classes = [IsCompanyUser]

    def get(self, request):
        """List active sessions"""
        company_user = request.user.company_user
        sessions = CompanyUserSession.objects.filter(
            user=company_user,
            expires_at__gt=timezone.now()
        )
        serializer = CompanyUserSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    def delete(self, request, session_id=None):
        """Terminate session(s)"""
        company_user = request.user.company_user
        if session_id:
            # Terminate specific session
            try:
                session = CompanyUserSession.objects.get(
                    id=session_id,
                    user=company_user
                )
                session.delete()
                
                # Log security event
                CompanySecurityLog.objects.create(
                    company=company_user.company,
                    user_email=request.user.email,
                    action='session_terminate',
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True,
                    details=f'Session terminated: {session.session_key}'
                )
                
                return Response({'message': 'Session terminated successfully'})
            except CompanyUserSession.DoesNotExist:
                return Response(
                    {'error': 'Session not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

    
    def post(self, request):
        """Terminate all other sessions"""
        company_user = request.user.company_user
        current_session_key = request.session.session_key
        
        terminated_count = CompanyUserSession.objects.filter(
            user=company_user
        ).exclude(session_key=current_session_key).delete()[0]
        
        # Log security event
        CompanySecurityLog.objects.create(
            company=company_user.company,
            user_email=request.user.email,
            action='session_terminate_all',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=True,
            details=f'Terminated {terminated_count} sessions'
        )
        
        return Response({'message': f'Terminated {terminated_count} sessions'})

class SecurityLogsView(APIView):
    permission_classes = [IsCompanyUser]

    def get(self, request):
        """Get security audit logs"""
        logs = CompanySecurityLog.objects.filter(
            company=request.user.company_user.company
        )
        
        # Filter by action type
        action = request.query_params.get('action')
        if action:
            logs = logs.filter(action=action)
        
        # Filter by success status
        success = request.query_params.get('success')
        if success is not None:
            logs = logs.filter(success=success.lower() == 'true')
        
        # Search
        search = request.query_params.get('search')
        if search:
            logs = logs.filter(
                models.Q(user_email__icontains=search) |
                models.Q(details__icontains=search) |
                models.Q(ip_address__icontains=search)
            )
        
        # Pagination
        logs = logs[:100]  # Limit to 100 recent logs
        
        serializer = CompanySecurityLogSerializer(logs, many=True)
        return Response(serializer.data)

class PasswordChangeView(APIView):
    permission_classes = [IsCompanyUser]

    def post(self, request):
        """Change password with enhanced security"""
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            django_user = request.user
            company_user = django_user.company_user  # Get CompanyUser instance
            current_password = serializer.validated_data['current_password']
            new_password = serializer.validated_data['new_password']
            force_logout_all = serializer.validated_data['force_logout_all']
            
            # Verify current password
            if not django_user.check_password(current_password):
                return Response(
                    {'error': 'Current password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check password history
            recent_passwords = CompanyPasswordHistory.objects.filter(
                user=company_user
            ).order_by('-created_at')[:5]
            
            for old_password in recent_passwords:
                if check_password(new_password, old_password.password_hash):
                    return Response(
                        {'error': 'Cannot reuse recent passwords'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            with transaction.atomic():
                # Save current password to history
                CompanyPasswordHistory.objects.create(
                    user=company_user,
                    password_hash=django_user.password
                )
                
                # Update password
                django_user.set_password(new_password)
                company_user.password_changed_at = timezone.now()
                company_user.must_change_password = False
                company_user.password_reset_by_admin = False
                company_user.is_password_reset_required = False
                company_user.is_autogenerated_password = False
                django_user.save()
                company_user.save()
                
                # Terminate all sessions if requested
                if force_logout_all:
                    CompanyUserSession.objects.filter(user=company_user).delete()
                
                # Log security event
                CompanySecurityLog.objects.create(
                    company=company_user.company,
                    user_email=django_user.email,
                    action='password_change',
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True,
                    details='Password changed successfully'
                )
                
                return Response({'message': 'Password changed successfully'})
        
        logger.warning(
            "Password change validation failed for user %s: %s",
            getattr(request.user, 'email', 'unknown'),
            serializer.errors
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
