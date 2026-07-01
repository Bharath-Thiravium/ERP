"""
Optimized Authentication Serializers
===================================
Lightweight serializers for faster login processing
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.cache import cache
from .models import MasterAdmin, CompanyUser

class FastMasterAdminLoginSerializer(serializers.Serializer):
    """Optimized Master Admin login serializer"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    totp_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    recovery_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        totp_code = attrs.get('totp_code', '')
        recovery_code = attrs.get('recovery_code', '')

        cache_key = f"login_attempts:{email}"
        try:
            failed_attempts = cache.get(cache_key, 0)
        except Exception:
            failed_attempts = 0

        if failed_attempts >= 10:
            raise serializers.ValidationError('Too many failed attempts. Try again later.')

        if email and password:
            user = authenticate(username=email, password=password)

            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Account is disabled.')

                try:
                    master_admin = user.master_admin

                    if master_admin.is_locked and master_admin.locked_until and master_admin.locked_until > timezone.now():
                        raise serializers.ValidationError('Account is temporarily locked.')

                    if master_admin.two_factor_enabled:
                        if not totp_code and not recovery_code:
                            attrs['requires_2fa'] = True
                            attrs['user'] = user
                            return attrs

                        if totp_code:
                            from .ultra_security import TwoFactorAuthManager
                            if not TwoFactorAuthManager.verify_totp_code(master_admin.two_factor_secret, totp_code):
                                try:
                                    cache.set(cache_key, failed_attempts + 1, 900)
                                except Exception:
                                    pass
                                raise serializers.ValidationError('Invalid 2FA code.')
                        elif recovery_code:
                            recovery_codes = master_admin.get_recovery_codes()
                            if recovery_code not in recovery_codes:
                                try:
                                    cache.set(cache_key, failed_attempts + 1, 900)
                                except Exception:
                                    pass
                                raise serializers.ValidationError('Invalid recovery code.')
                            master_admin.use_recovery_code(recovery_code)
                    else:
                        attrs['requires_2fa'] = False

                    try:
                        cache.delete(cache_key)
                    except Exception:
                        pass

                except MasterAdmin.DoesNotExist:
                    try:
                        cache.set(cache_key, failed_attempts + 1, 900)
                    except Exception:
                        pass
                    raise serializers.ValidationError('Invalid credentials.')

                attrs['user'] = user
                if 'requires_2fa' not in attrs:
                    attrs['requires_2fa'] = False
                return attrs
            else:
                try:
                    cache.set(cache_key, failed_attempts + 1, 900)
                except Exception:
                    pass
                raise serializers.ValidationError('Invalid credentials.')
        else:
            raise serializers.ValidationError('Email and password required.')

class FastCompanyUserLoginSerializer(serializers.Serializer):
    """Optimized Company User login serializer"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    totp_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    recovery_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        totp_code = attrs.get('totp_code', '')
        recovery_code = attrs.get('recovery_code', '')

        cache_key = f"login_attempts:{email}"
        try:
            failed_attempts = cache.get(cache_key, 0)
        except Exception:
            failed_attempts = 0

        if failed_attempts >= 10:
            raise serializers.ValidationError('Too many failed attempts. Try again later.')

        if email and password:
            user = authenticate(username=email, password=password)

            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Account is disabled.')

                try:
                    company_user = user.company_user

                    if company_user.is_locked and company_user.locked_until and company_user.locked_until > timezone.now():
                        raise serializers.ValidationError('Account is temporarily locked.')

                    from company_dashboard.security_models import CompanySecuritySettings
                    try:
                        security_settings = CompanySecuritySettings.objects.get(company=company_user.company)
                        if security_settings.two_factor_enabled:
                            if not totp_code and not recovery_code:
                                attrs['requires_2fa'] = True
                                attrs['user'] = user
                                return attrs

                            if totp_code:
                                import pyotp
                                totp = pyotp.TOTP(security_settings.two_factor_secret)
                                if not totp.verify(totp_code):
                                    try:
                                        cache.set(cache_key, failed_attempts + 1, 900)
                                    except Exception:
                                        pass
                                    raise serializers.ValidationError('Invalid 2FA code.')
                            elif recovery_code:
                                from company_dashboard.security_models import CompanyRecoveryCode
                                valid_code = CompanyRecoveryCode.objects.filter(
                                    company=company_user.company,
                                    is_used=False
                                ).first()

                                if not valid_code or not valid_code.check_code(recovery_code):
                                    try:
                                        cache.set(cache_key, failed_attempts + 1, 900)
                                    except Exception:
                                        pass
                                    raise serializers.ValidationError('Invalid recovery code.')

                                valid_code.is_used = True
                                valid_code.used_at = timezone.now()
                                valid_code.save()
                        else:
                            attrs['requires_2fa'] = False
                    except CompanySecuritySettings.DoesNotExist:
                        attrs['requires_2fa'] = False

                    if company_user.company.approval_status != 'approved':
                        if not company_user.first_login_completed:
                            attrs['first_login_required'] = True
                        else:
                            attrs['approval_pending'] = True
                    elif company_user.password_reset_by_admin:
                        attrs['force_password_reset'] = True

                    try:
                        cache.delete(cache_key)
                    except Exception:
                        pass

                except CompanyUser.DoesNotExist:
                    try:
                        cache.set(cache_key, failed_attempts + 1, 900)
                    except Exception:
                        pass
                    raise serializers.ValidationError('Invalid credentials.')

                attrs['user'] = user
                if 'requires_2fa' not in attrs:
                    attrs['requires_2fa'] = False
                return attrs
            else:
                try:
                    cache.set(cache_key, failed_attempts + 1, 900)
                except Exception:
                    pass
                raise serializers.ValidationError('Invalid credentials.')
        else:
            raise serializers.ValidationError('Email and password required.')