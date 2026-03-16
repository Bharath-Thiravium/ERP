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

        # Disable cache check temporarily to fix double login issue
        # cache_key = f"login_attempts:{email}"
        # failed_attempts = cache.get(cache_key, 0)
        # 
        # if failed_attempts >= 10:  # Increased from 5 to 10
        #     raise serializers.ValidationError('Too many failed attempts. Try again later.')

        if email and password:
            # Fast authentication check
            user = authenticate(username=email, password=password)

            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Account is disabled.')
                
                # Quick master admin check
                try:
                    master_admin = user.master_admin
                    
                    # Essential security checks only
                    if master_admin.is_locked and master_admin.locked_until and master_admin.locked_until > timezone.now():
                        raise serializers.ValidationError('Account is temporarily locked.')
                    
                    # 2FA check (if enabled)
                    if master_admin.two_factor_enabled:
                        if not totp_code and not recovery_code:
                            attrs['requires_2fa'] = True
                            attrs['user'] = user
                            return attrs
                        
                        # Quick 2FA validation
                        if totp_code:
                            from .ultra_security import TwoFactorAuthManager
                            if not TwoFactorAuthManager.verify_totp_code(master_admin.two_factor_secret, totp_code):
                                # Increment failed attempts
                                cache.set(cache_key, failed_attempts + 1, 900)  # 15 minutes
                                raise serializers.ValidationError('Invalid 2FA code.')
                        elif recovery_code:
                            recovery_codes = master_admin.get_recovery_codes()
                            if recovery_code not in recovery_codes:
                                cache.set(cache_key, failed_attempts + 1, 900)
                                raise serializers.ValidationError('Invalid recovery code.')
                            master_admin.use_recovery_code(recovery_code)
                    else:
                        # Explicitly set requires_2fa to False when 2FA is disabled
                        attrs['requires_2fa'] = False
                    
                    # Disable cache operations temporarily to fix double login issue
                    # cache.delete(cache_key)
                    
                    # Debug: Log successful authentication
                    print(f"🔍 DEBUG: Successful master admin login for {email}")
                    
                except MasterAdmin.DoesNotExist:
                    # Disable cache increment temporarily to fix double login issue
                    # cache.set(cache_key, failed_attempts + 1, 900)
                    raise serializers.ValidationError('Invalid credentials.')
                
                attrs['user'] = user
                # Ensure requires_2fa is always set
                if 'requires_2fa' not in attrs:
                    attrs['requires_2fa'] = False
                return attrs
            else:
                # Increment failed attempts
                cache.set(cache_key, failed_attempts + 1, 900)
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
        
        # Disable cache check temporarily to fix double login issue
        # cache_key = f"login_attempts:{email}"
        # failed_attempts = cache.get(cache_key, 0)
        # 
        # if failed_attempts >= 10:  # Increased from 5 to 10
        #     raise serializers.ValidationError('Too many failed attempts. Try again later.')
        
        if email and password:
            # Fast authentication
            user = authenticate(username=email, password=password)
            
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Account is disabled.')
                
                # Quick company user check
                try:
                    company_user = user.company_user
                    
                    # Essential checks only
                    if company_user.is_locked and company_user.locked_until and company_user.locked_until > timezone.now():
                        raise serializers.ValidationError('Account is temporarily locked.')
                    
                    # Quick 2FA check
                    from company_dashboard.security_models import CompanySecuritySettings
                    try:
                        security_settings = CompanySecuritySettings.objects.get(company=company_user.company)
                        if security_settings.two_factor_enabled:
                            if not totp_code and not recovery_code:
                                attrs['requires_2fa'] = True
                                attrs['user'] = user
                                return attrs
                            
                            # Quick 2FA validation
                            if totp_code:
                                import pyotp
                                totp = pyotp.TOTP(security_settings.two_factor_secret)
                                if not totp.verify(totp_code):
                                    cache.set(cache_key, failed_attempts + 1, 900)
                                    raise serializers.ValidationError('Invalid 2FA code.')
                            elif recovery_code:
                                from company_dashboard.security_models import CompanyRecoveryCode
                                valid_code = CompanyRecoveryCode.objects.filter(
                                    company=company_user.company,
                                    is_used=False
                                ).first()
                                
                                if not valid_code or not valid_code.check_code(recovery_code):
                                    cache.set(cache_key, failed_attempts + 1, 900)
                                    raise serializers.ValidationError('Invalid recovery code.')
                                
                                valid_code.is_used = True
                                valid_code.used_at = timezone.now()
                                valid_code.save()
                        else:
                            # Explicitly set requires_2fa to False when 2FA is disabled
                            attrs['requires_2fa'] = False
                    except CompanySecuritySettings.DoesNotExist:
                        # No 2FA settings - explicitly set to False
                        attrs['requires_2fa'] = False
                    
                    # Quick approval check
                    if company_user.company.approval_status != 'approved':
                        if not company_user.first_login_completed:
                            attrs['first_login_required'] = True
                        else:
                            attrs['approval_pending'] = True
                    elif company_user.password_reset_by_admin:
                        attrs['force_password_reset'] = True
                    
                    # Disable cache operations temporarily to fix double login issue
                    # cache.delete(cache_key)
                    
                    # Debug: Log successful authentication
                    print(f"🔍 DEBUG: Successful company user login for {email}")
                    
                except CompanyUser.DoesNotExist:
                    # Disable cache increment temporarily to fix double login issue
                    # cache.set(cache_key, failed_attempts + 1, 900)
                    raise serializers.ValidationError('Invalid credentials.')
                
                attrs['user'] = user
                # Ensure requires_2fa is always set
                if 'requires_2fa' not in attrs:
                    attrs['requires_2fa'] = False
                return attrs
            else:
                # Disable cache increment temporarily to fix double login issue
                # cache.set(cache_key, failed_attempts + 1, 900)
                raise serializers.ValidationError('Invalid credentials.')
        else:
            raise serializers.ValidationError('Email and password required.')