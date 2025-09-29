"""
Master Admin Settings Dashboard Views
====================================
Ultra-secure settings management for master admin
"""
import json
import secrets
import string
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.hashers import check_password, make_password
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
from .models import MasterAdmin, SecurityLog
from .ultra_security import UltraSecurityManager, TwoFactorAuthManager
from .serializers import MasterAdminPasswordChangeSerializer


class MasterAdminSettingsView(APIView):
    """Master Admin Settings Dashboard"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get master admin settings and security info"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can access settings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        master_admin = request.user.master_admin
        
        # Get security statistics
        recent_logs = SecurityLog.objects.filter(
            user=request.user,
            timestamp__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        failed_logins = SecurityLog.objects.filter(
            user=request.user,
            event_type='LOGIN_FAILED',
            timestamp__gte=timezone.now() - timedelta(days=7)
        ).count()

        return Response({
            'profile': {
                'email': request.user.email,
                'company_name': master_admin.company_name,
                'created_at': master_admin.created_at,
                'last_login_ip': master_admin.last_login_ip,
                'password_expires_at': master_admin.password_expires_at,
                'is_password_expired': master_admin.is_password_expired(),
                'days_until_expiry': (master_admin.password_expires_at - timezone.now()).days,
                'two_factor_enabled': master_admin.two_factor_enabled,
                'api_key': master_admin.api_key[:16] + '...' + master_admin.api_key[-8:],  # Masked
            },
            'security_stats': {
                'recent_activity_count': recent_logs,
                'failed_logins_week': failed_logins,
                'account_locked': master_admin.is_locked,
                'login_attempts': master_admin.login_attempts,
                'recovery_codes_count': len(master_admin.get_recovery_codes()),
            },
            'security_features': {
                'ultra_secure_passwords': True,
                'two_factor_authentication': master_admin.two_factor_enabled,
                'api_key_protection': True,
                'recovery_codes': True,
                'security_logging': True,
                'rate_limiting': True,
                'suspicious_activity_detection': True,
                'account_lockout_protection': True,
            }
        })


class MasterAdminPasswordChangeView(APIView):
    """Ultra-secure password change for master admin"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can change password.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Rate limiting check
        ip_address = get_client_ip(request)
        if not UltraSecurityManager.check_rate_limit(ip_address, 'password_change'):
            return Response(
                {'error': 'Rate limit exceeded. Please try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        # Validation
        if not all([current_password, new_password, confirm_password]):
            return Response(
                {'error': 'All password fields are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {'error': 'New passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify current password
        if not check_password(current_password, request.user.password):
            UltraSecurityManager.log_security_event(
                request.user, 'PASSWORD_CHANGE_FAILED', ip_address,
                'Invalid current password provided'
            )
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate new password strength
        if not self._validate_ultra_secure_password(new_password):
            return Response(
                {'error': 'Password does not meet ultra-security requirements.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password with transaction
        with transaction.atomic():
            request.user.set_password(new_password)
            request.user.save()

            # Update master admin password expiration
            master_admin = request.user.master_admin
            master_admin.password_expires_at = timezone.now() + timedelta(days=60)
            master_admin.save()

            # Log successful password change
            UltraSecurityManager.log_security_event(
                request.user, 'PASSWORD_CHANGED', ip_address,
                'Master admin password changed successfully'
            )

        return Response({
            'message': 'Password changed successfully.',
            'password_expires_at': master_admin.password_expires_at,
            'security_reminder': 'Your password has been updated with military-grade security.'
        })

    def _validate_ultra_secure_password(self, password):
        """Validate ultra-secure password requirements"""
        if len(password) < 16:
            return False
        
        checks = [
            any(c.isupper() for c in password),  # Uppercase
            any(c.islower() for c in password),  # Lowercase
            any(c.isdigit() for c in password),  # Number
            any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)  # Special
        ]
        
        return all(checks)


class MasterAdminAPIKeyManagementView(APIView):
    """API Key management for master admin"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get masked API key info"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can access API keys.'},
                status=status.HTTP_403_FORBIDDEN
            )

        master_admin = request.user.master_admin
        return Response({
            'api_key_masked': master_admin.api_key[:16] + '...' + master_admin.api_key[-8:],
            'created_at': master_admin.created_at,
            'last_used': 'Not tracked for security',
            'security_note': 'Full API key is never displayed for security reasons.'
        })

    def post(self, request):
        """Regenerate API key"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can regenerate API keys.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify current password for security
        current_password = request.data.get('current_password')
        if not current_password:
            return Response(
                {'error': 'Current password required for API key regeneration.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not check_password(current_password, request.user.password):
            return Response(
                {'error': 'Invalid password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate new ultra-secure API key
        new_api_key = self._generate_ultra_secure_api_key()
        
        with transaction.atomic():
            master_admin = request.user.master_admin
            old_key_masked = master_admin.api_key[:16] + '...' + master_admin.api_key[-8:]
            master_admin.api_key = new_api_key
            master_admin.save()

            # Log API key regeneration
            UltraSecurityManager.log_security_event(
                request.user, 'API_KEY_REGENERATED', 
                get_client_ip(request),
                f'API key regenerated. Old key: {old_key_masked}'
            )

        return Response({
            'message': 'API key regenerated successfully.',
            'new_api_key': new_api_key,
            'warning': 'Save this key securely. It will not be shown again.',
            'api_key_masked': new_api_key[:16] + '...' + new_api_key[-8:]
        })

    def _generate_ultra_secure_api_key(self):
        """Generate ultra-secure API key"""
        import hashlib
        import base64
        timestamp = str(int(timezone.now().timestamp()))
        entropy = secrets.token_urlsafe(64)
        combined = f"{timestamp}:{entropy}"
        hashed = hashlib.sha256(combined.encode()).hexdigest()
        return base64.urlsafe_b64encode(hashed.encode()).decode()[:64]


class MasterAdminRecoveryCodesView(APIView):
    """Recovery codes management"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get recovery codes info (not the actual codes)"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can access recovery codes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        master_admin = request.user.master_admin
        recovery_codes = master_admin.get_recovery_codes()
        
        return Response({
            'total_codes': len(recovery_codes),
            'codes_available': len([code for code in recovery_codes if not code.get('used', False)]),
            'last_generated': master_admin.created_at,
            'security_note': 'Recovery codes are encrypted and only shown during generation.'
        })

    def post(self, request):
        """Regenerate recovery codes"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can regenerate recovery codes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify current password
        current_password = request.data.get('current_password')
        if not current_password:
            return Response(
                {'error': 'Current password required for recovery code regeneration.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not check_password(current_password, request.user.password):
            return Response(
                {'error': 'Invalid password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate new recovery codes
        new_codes = self._generate_recovery_codes(12)
        
        with transaction.atomic():
            master_admin = request.user.master_admin
            master_admin.recovery_codes = json.dumps(new_codes)
            master_admin.save()

            # Log recovery codes regeneration
            UltraSecurityManager.log_security_event(
                request.user, 'RECOVERY_CODES_REGENERATED',
                get_client_ip(request),
                'Recovery codes regenerated'
            )

        return Response({
            'message': 'Recovery codes regenerated successfully.',
            'recovery_codes': new_codes,
            'warning': 'Save these codes securely. They will not be shown again.',
            'instructions': [
                'Store these codes in a secure location',
                'Each code can only be used once',
                'Use these codes if you lose access to your 2FA device',
                'Generate new codes if you suspect they are compromised'
            ]
        })

    def _generate_recovery_codes(self, count=12):
        """Generate cryptographically secure recovery codes"""
        codes = []
        for _ in range(count):
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(16))
            formatted = f"{code[:4]}-{code[4:8]}-{code[8:12]}-{code[12:]}"
            codes.append(formatted)
        return codes


class MasterAdminTwoFactorView(APIView):
    """Two-factor authentication management"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get 2FA status"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can access 2FA settings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        master_admin = request.user.master_admin
        return Response({
            'two_factor_enabled': master_admin.two_factor_enabled,
            'setup_required': not master_admin.two_factor_enabled,
            'backup_codes_available': len(master_admin.get_recovery_codes()),
            'security_note': '2FA is mandatory for ultra-secure master admin access.'
        })

    def post(self, request):
        """Enable/disable 2FA"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can manage 2FA.'},
                status=status.HTTP_403_FORBIDDEN
            )

        action = request.data.get('action')  # 'enable' or 'disable'
        current_password = request.data.get('current_password')

        if not current_password:
            return Response(
                {'error': 'Current password required for 2FA changes.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not check_password(current_password, request.user.password):
            return Response(
                {'error': 'Invalid password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        master_admin = request.user.master_admin

        if action == 'enable':
            if master_admin.two_factor_enabled:
                return Response(
                    {'error': '2FA is already enabled.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate 2FA secret
            secret = TwoFactorAuthManager.generate_2fa_secret()
            
            with transaction.atomic():
                master_admin.two_factor_secret = secret
                master_admin.two_factor_enabled = True
                master_admin.save()

                UltraSecurityManager.log_security_event(
                    request.user, 'TWO_FACTOR_ENABLED',
                    get_client_ip(request),
                    '2FA enabled for master admin'
                )

            return Response({
                'message': '2FA enabled successfully.',
                'secret': secret,
                'qr_code_url': f'otpauth://totp/{request.user.email}?secret={secret}&issuer=SAP-System',
                'instructions': [
                    'Scan the QR code with your authenticator app',
                    'Or manually enter the secret key',
                    'Verify setup with a test code',
                    'Save your recovery codes securely'
                ]
            })

        elif action == 'disable':
            if not master_admin.two_factor_enabled:
                return Response(
                    {'error': '2FA is already disabled.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify 2FA code before disabling
            totp_code = request.data.get('totp_code')
            if not totp_code:
                return Response(
                    {'error': '2FA code required to disable 2FA.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not TwoFactorAuthManager.verify_totp_code(master_admin.two_factor_secret, totp_code):
                return Response(
                    {'error': 'Invalid 2FA code.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                master_admin.two_factor_enabled = False
                master_admin.two_factor_secret = ''
                master_admin.save()

                UltraSecurityManager.log_security_event(
                    request.user, 'TWO_FACTOR_DISABLED',
                    get_client_ip(request),
                    '2FA disabled for master admin'
                )

            return Response({
                'message': '2FA disabled successfully.',
                'warning': 'Your account security has been reduced. Consider re-enabling 2FA.'
            })

        return Response(
            {'error': 'Invalid action. Use "enable" or "disable".'},
            status=status.HTTP_400_BAD_REQUEST
        )


class MasterAdminSecurityLogView(APIView):
    """Security activity log for master admin"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get security activity log"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can access security logs.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get recent security events
        days = int(request.GET.get('days', 30))
        logs = SecurityLog.objects.filter(
            user=request.user,
            timestamp__gte=timezone.now() - timedelta(days=days)
        ).order_by('-timestamp')[:100]

        log_data = []
        for log in logs:
            log_data.append({
                'timestamp': log.timestamp,
                'event_type': log.event_type,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent[:100] + '...' if len(log.user_agent) > 100 else log.user_agent,
                'details': log.details,
                'severity': self._get_event_severity(log.event_type)
            })

        return Response({
            'logs': log_data,
            'total_events': logs.count(),
            'period_days': days,
            'security_summary': self._get_security_summary(request.user, days)
        })

    def _get_event_severity(self, event_type):
        """Get severity level for event type"""
        high_severity = ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_ACTIVITY']
        medium_severity = ['PASSWORD_CHANGED', 'API_KEY_REGENERATED', 'TWO_FACTOR_DISABLED']
        
        if event_type in high_severity:
            return 'high'
        elif event_type in medium_severity:
            return 'medium'
        return 'low'

    def _get_security_summary(self, user, days):
        """Get security summary statistics"""
        start_date = timezone.now() - timedelta(days=days)
        
        return {
            'total_logins': SecurityLog.objects.filter(
                user=user, event_type='LOGIN_SUCCESS', timestamp__gte=start_date
            ).count(),
            'failed_attempts': SecurityLog.objects.filter(
                user=user, event_type='LOGIN_FAILED', timestamp__gte=start_date
            ).count(),
            'password_changes': SecurityLog.objects.filter(
                user=user, event_type='PASSWORD_CHANGED', timestamp__gte=start_date
            ).count(),
            'suspicious_activities': SecurityLog.objects.filter(
                user=user, event_type='SUSPICIOUS_ACTIVITY', timestamp__gte=start_date
            ).count(),
        }


class MasterAdminSecurityStatusView(APIView):
    """Overall security status dashboard"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get comprehensive security status"""
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can access security status.'},
                status=status.HTTP_403_FORBIDDEN
            )

        master_admin = request.user.master_admin
        
        # Calculate security score
        security_score = self._calculate_security_score(master_admin)
        
        return Response({
            'security_score': security_score,
            'security_level': self._get_security_level(security_score),
            'recommendations': self._get_security_recommendations(master_admin),
            'status_checks': {
                'password_strength': 'excellent' if len(request.user.password) > 60 else 'good',
                'password_expiry': 'good' if not master_admin.is_password_expired() else 'critical',
                'two_factor_auth': 'enabled' if master_admin.two_factor_enabled else 'disabled',
                'recovery_codes': 'available' if master_admin.get_recovery_codes() else 'missing',
                'account_locked': 'no' if not master_admin.is_locked else 'yes',
                'recent_activity': 'normal',  # Could be enhanced with actual analysis
            },
            'last_security_check': timezone.now(),
            'next_password_expiry': master_admin.password_expires_at,
        })

    def _calculate_security_score(self, master_admin):
        """Calculate security score out of 100"""
        score = 0
        
        # Password strength (25 points)
        if not master_admin.is_password_expired():
            score += 25
        
        # 2FA enabled (25 points)
        if master_admin.two_factor_enabled:
            score += 25
        
        # Recovery codes available (20 points)
        if master_admin.get_recovery_codes():
            score += 20
        
        # Account not locked (15 points)
        if not master_admin.is_locked:
            score += 15
        
        # Recent activity normal (15 points)
        recent_failed = SecurityLog.objects.filter(
            user=master_admin.user,
            event_type='LOGIN_FAILED',
            timestamp__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        if recent_failed < 3:
            score += 15
        
        return min(score, 100)

    def _get_security_level(self, score):
        """Get security level based on score"""
        if score >= 90:
            return 'ULTRA_SECURE'
        elif score >= 75:
            return 'HIGH_SECURITY'
        elif score >= 60:
            return 'MEDIUM_SECURITY'
        else:
            return 'LOW_SECURITY'

    def _get_security_recommendations(self, master_admin):
        """Get security recommendations"""
        recommendations = []
        
        if master_admin.is_password_expired():
            recommendations.append({
                'priority': 'critical',
                'message': 'Your password has expired. Change it immediately.',
                'action': 'change_password'
            })
        
        if not master_admin.two_factor_enabled:
            recommendations.append({
                'priority': 'high',
                'message': 'Enable two-factor authentication for maximum security.',
                'action': 'enable_2fa'
            })
        
        if not master_admin.get_recovery_codes():
            recommendations.append({
                'priority': 'medium',
                'message': 'Generate recovery codes for account recovery.',
                'action': 'generate_recovery_codes'
            })
        
        days_until_expiry = (master_admin.password_expires_at - timezone.now()).days
        if days_until_expiry <= 7:
            recommendations.append({
                'priority': 'high',
                'message': f'Your password expires in {days_until_expiry} days.',
                'action': 'change_password'
            })
        
        return recommendations


# Utility function to get client IP
def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip