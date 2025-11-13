from rest_framework import serializers
from django.utils._os import safe_join
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from datetime import timedelta
import secrets
import string

from .models import (
    MasterAdmin, Company, Service, CompanyService,
    CompanyUser, SecurityLog, CompanyServiceUser, ServiceUserSession
)
from .enhanced_security_models import IPRestriction, DeviceFingerprint, LoginNotification, SecuritySettings
from .email_settings_models import MasterAdminEmailSettings
from .ultra_security import TwoFactorAuthManager


class MasterAdminLoginSerializer(serializers.Serializer):
    """Master Admin login serializer with 2FA support"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    totp_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    recovery_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        totp_code = attrs.get('totp_code', '')
        recovery_code = attrs.get('recovery_code', '')

        if email and password:
            user = authenticate(username=email, password=password)

            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Account is disabled.')
                
                # Check if user is master admin
                try:
                    master_admin = user.master_admin
                    if master_admin.is_locked:
                        raise serializers.ValidationError('Account is locked.')
                    if master_admin.is_password_expired():
                        raise serializers.ValidationError('Password has expired.')
                    
                    # Check 2FA if enabled
                    if master_admin.two_factor_enabled:
                        if not totp_code and not recovery_code:
                            # First step passed, need 2FA
                            attrs['requires_2fa'] = True
                            attrs['user'] = user
                            return attrs
                        
                        # Validate 2FA code or recovery code
                        if totp_code:
                            from .ultra_security import TwoFactorAuthManager
                            if not TwoFactorAuthManager.verify_totp_code(master_admin.two_factor_secret, totp_code):
                                raise serializers.ValidationError('Invalid 2FA code.')
                        elif recovery_code:
                            # Validate recovery code
                            recovery_codes = master_admin.get_recovery_codes()
                            if recovery_code not in recovery_codes:
                                raise serializers.ValidationError('Invalid recovery code.')
                            # Mark recovery code as used (implement this in model)
                            master_admin.use_recovery_code(recovery_code)
                        else:
                            raise serializers.ValidationError('2FA code or recovery code required.')
                    
                except MasterAdmin.DoesNotExist:
                    raise serializers.ValidationError('Invalid master admin credentials.')
                
                attrs['user'] = user
                return attrs
            else:
                raise serializers.ValidationError('Invalid credentials.')
        else:
            raise serializers.ValidationError('Must include email and password.')


class ServiceSerializer(serializers.ModelSerializer):
    """Service serializer"""
    class Meta:
        model = Service
        fields = ['id', 'name', 'service_type', 'description', 'is_active', 
                 'base_price', 'features', 'created_at']
        read_only_fields = ['id', 'created_at']


class CompanyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating company with basic info"""
    services = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=True
    )
    user_email = serializers.EmailField(write_only=True)
    user_password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = Company
        fields = ['name', 'company_prefix', 'email', 'phone', 'address', 'services', 
                 'user_email', 'user_password']
    
    def validate_services(self, value):
        """Validate that all service IDs exist"""
        if not value:
            raise serializers.ValidationError("At least one service must be selected.")
        
        existing_services = Service.objects.filter(id__in=value, is_active=True)
        if len(existing_services) != len(value):
            raise serializers.ValidationError("One or more invalid service IDs.")
        
        return value
    
    def validate_user_email(self, value):
        """Validate that email is unique"""
        existing_user = User.objects.filter(email=value).first()
        if existing_user:
            print(f'🔍 DEBUG: User with email {value} already exists (ID: {existing_user.id})')
            raise serializers.ValidationError("User with this email already exists.")
        print(f'🔍 DEBUG: Email {value} is available for new user')
        return value
    
    def validate_company_prefix(self, value):
        """Validate company prefix"""
        from .utils import validate_company_prefix
        
        if not value:
            raise serializers.ValidationError("Company prefix is required.")
        
        # Convert to uppercase
        value = value.upper()
        
        # Validate format and uniqueness
        is_valid, message = validate_company_prefix(value)
        if not is_valid:
            raise serializers.ValidationError(message)
        
        return value
    
    def create(self, validated_data):
        services_data = validated_data.pop('services')
        user_email = validated_data.pop('user_email')
        user_password = validated_data.pop('user_password')

        # Create company
        company = Company.objects.create(
            created_by=self.context['request'].user,
            **validated_data
        )

        # Create user for company
        user = User.objects.create_user(
            username=user_email,
            email=user_email,
            password=user_password,
            is_active=True
        )

        # Create company user profile
        CompanyUser.objects.create(
            user=user,
            company=company,
            created_by=self.context['request'].user,
            password_expires_at=timezone.now() + timedelta(days=90),
            must_change_password=False,  # First time creation doesn't require forced password change
            password_reset_by_admin=False
        )

        # Assign services to company (without credentials - company will create them)
        services = Service.objects.filter(id__in=services_data)
        for service in services:
            CompanyService.objects.create(
                company=company,
                service=service,
                assigned_by=self.context['request'].user,
                service_password='',  # Empty - company will create service credentials
                password_expires_at=timezone.now() + timedelta(days=365)  # Extended expiry
            )

        # Initialize auto-code settings for the company
        from .utils import initialize_company_auto_codes
        try:
            initialize_company_auto_codes(company.id)
        except Exception as e:
            print(f'Warning: Failed to initialize auto-code settings: {str(e)}')

        return company
    
    def generate_service_password(self, length=12):
        """Generate secure service password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))


class CompanyListSerializer(serializers.ModelSerializer):
    """Serializer for listing companies"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    services_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = ['id', 'name', 'company_prefix', 'email', 'phone', 'approval_status', 
                 'detailed_info_submitted', 'created_at', 'created_by_name',
                 'services_count']
    
    def get_services_count(self, obj):
        return obj.company_services.filter(is_active=True).count()


class CompanyDetailSerializer(serializers.ModelSerializer):
    """Detailed company serializer"""
    services = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = Company
        fields = '__all__'
    
    def get_services(self, obj):
        """Get assigned services for the company"""
        company_services = obj.company_services.filter(is_active=True).select_related('service')
        return [{
            'id': cs.service.id,
            'name': cs.service.name,
            'service_type': cs.service.service_type,
            'description': cs.service.description,
            'base_price': cs.service.base_price,
            'assigned_at': cs.assigned_at
        } for cs in company_services]


class CompanyDetailedInfoSerializer(serializers.ModelSerializer):
    """Serializer for company detailed information submission"""
    class Meta:
        model = Company
        fields = [
            'business_type', 'industry', 'employee_count', 'annual_revenue',
            'website', 'tax_id', 'pan_number', 'gst_number', 'contact_person_name',
            'contact_person_title', 'contact_person_email', 'contact_person_phone',
            'description', 'special_requirements'
        ]
    
    def update(self, instance, validated_data):
        # Update company with detailed info
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.detailed_info_submitted = True
        instance.detailed_info_submitted_at = timezone.now()
        instance.save()
        
        return instance


class CompanyUserLoginSerializer(serializers.Serializer):
    """Company user login serializer with 2FA support"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    totp_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    recovery_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        totp_code = attrs.get('totp_code', '')
        recovery_code = attrs.get('recovery_code', '')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Account is disabled.')
                
                # Check if user is company user
                try:
                    company_user = user.company_user
                    if company_user.is_locked:
                        raise serializers.ValidationError('Account is locked.')
                    if company_user.is_password_expired():
                        raise serializers.ValidationError('Password has expired.')
                    
                    # Check 2FA if enabled
                    from company_dashboard.security_models import CompanySecuritySettings
                    try:
                        security_settings = CompanySecuritySettings.objects.get(company=company_user.company)
                        if security_settings.two_factor_enabled:
                            if not totp_code and not recovery_code:
                                # First step passed, need 2FA
                                attrs['requires_2fa'] = True
                                attrs['user'] = user
                                return attrs
                            
                            # Validate 2FA code or recovery code
                            if totp_code:
                                import pyotp
                                totp = pyotp.TOTP(security_settings.two_factor_secret)
                                if not totp.verify(totp_code):
                                    raise serializers.ValidationError('Invalid 2FA code.')
                            elif recovery_code:
                                from company_dashboard.security_models import CompanyRecoveryCode
                                recovery_codes = CompanyRecoveryCode.objects.filter(
                                    company=company_user.company,
                                    is_used=False
                                )
                                valid_code = None
                                for rc in recovery_codes:
                                    if rc.check_code(recovery_code):
                                        valid_code = rc
                                        break
                                
                                if not valid_code:
                                    raise serializers.ValidationError('Invalid recovery code.')
                                
                                # Mark recovery code as used
                                valid_code.is_used = True
                                valid_code.used_at = timezone.now()
                                valid_code.save()
                            else:
                                raise serializers.ValidationError('2FA code or recovery code required.')
                    except CompanySecuritySettings.DoesNotExist:
                        pass  # No 2FA settings, continue with normal login
                    
                    # Check if company is approved
                    if company_user.company.approval_status != 'approved':
                        if not company_user.first_login_completed:
                            attrs['first_login_required'] = True
                        else:
                            attrs['approval_pending'] = True
                    
                    # Check if password was reset by admin (only for approved companies)
                    elif company_user.password_reset_by_admin:
                        attrs['force_password_reset'] = True
                    
                except CompanyUser.DoesNotExist:
                    raise serializers.ValidationError('Invalid company user credentials.')
                
                attrs['user'] = user
                return attrs
            else:
                raise serializers.ValidationError('Invalid credentials.')
        else:
            raise serializers.ValidationError('Must include email and password.')


class CompanyServiceSerializer(serializers.ModelSerializer):
    """Company service serializer"""
    service = ServiceSerializer(read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    
    class Meta:
        model = CompanyService
        fields = ['id', 'service', 'assigned_at', 'is_active', 
                 'password_changed_at', 'password_expires_at', 'assigned_by_name']


class ServicePasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing service password"""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords don't match.")
        return attrs


class MasterAdminPasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing master admin password"""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords don't match.")
        return attrs


class MasterAdminProfileSerializer(serializers.ModelSerializer):
    """Master Admin profile serializer"""
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')

    class Meta:
        model = MasterAdmin
        fields = ['email', 'first_name', 'last_name', 'company_name',
                 'created_at', 'last_login_ip', 'password_expires_at',
                 'two_factor_enabled']
        read_only_fields = ['created_at', 'last_login_ip', 'password_expires_at']

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})

        # Update user fields
        if user_data:
            for attr, value in user_data.items():
                setattr(instance.user, attr, value)
            instance.user.save()

        # Update master admin fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance


class SecurityLogSerializer(serializers.ModelSerializer):
    """Security log serializer"""
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = SecurityLog
        fields = ['id', 'user_email', 'event_type', 'timestamp',
                 'ip_address', 'user_agent', 'details']


class CompanyServiceUserSerializer(serializers.ModelSerializer):
    """Company Service User serializer"""
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_type = serializers.CharField(source='service.service_type', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    is_password_expired = serializers.SerializerMethodField()

    class Meta:
        model = CompanyServiceUser
        fields = ['id', 'username', 'unique_service_id', 'email', 'full_name', 'role', 'is_active',
                 'service_name', 'service_type', 'company_name', 'created_by_email',
                 'created_at', 'updated_at', 'last_login', 'login_count',
                 'password_expires_at', 'password_changed_at', 'must_change_password',
                 'is_password_expired']
        read_only_fields = ['id', 'unique_service_id', 'created_at', 'updated_at', 'last_login',
                           'login_count', 'password_changed_at']

    def get_is_password_expired(self, obj):
        return obj.is_password_expired()


class CompanyServiceUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating service users"""
    service_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = CompanyServiceUser
        fields = ['username', 'email', 'full_name', 'role', 'service_id']

    def validate_service_id(self, value):
        """Validate that the service is assigned to the company"""
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'company_user'):
            raise serializers.ValidationError('Invalid user context')

        company = request.user.company_user.company
        if not CompanyService.objects.filter(company=company, service_id=value, is_active=True).exists():
            raise serializers.ValidationError('Service not assigned to your company')

        return value

    def validate_username(self, value):
        """Validate username uniqueness within company-service combination"""
        request = self.context.get('request')
        service_id = self.initial_data.get('service_id')

        if request and hasattr(request.user, 'company_user') and service_id:
            company = request.user.company_user.company
            if CompanyServiceUser.objects.filter(
                company=company,
                service_id=service_id,
                username=value
            ).exists():
                raise serializers.ValidationError(
                    'Username already exists for this service in your company'
                )

        return value

    def create(self, validated_data):
        """Create service user with generated password"""
        service_id = validated_data.pop('service_id')
        request = self.context.get('request')
        company = request.user.company_user.company
        service = Service.objects.get(id=service_id)

        # Generate random password
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

        # Format email with domain if domain is set
        email = validated_data.get('email', '')
        username = validated_data.get('username', '')
        
        if company.domain_name and username and not email:
            # If no email provided but domain is set, create email from username
            email = f"{username}@{company.domain_name}"
            validated_data['email'] = email
        elif company.domain_name and username and email and '@' not in email:
            # If email doesn't contain @, treat it as username and append domain
            email = f"{email}@{company.domain_name}"
            validated_data['email'] = email
        elif company.domain_name and username and not email.endswith(f"@{company.domain_name}"):
            # If domain is set but email doesn't match domain, suggest the format
            # For now, we'll allow it but could add validation here
            pass

        # Create service user
        service_user = CompanyServiceUser.objects.create(
            company=company,
            service=service,
            created_by=request.user,
            password=make_password(password),
            password_expires_at=timezone.now() + timedelta(days=90),
            **validated_data
        )

        # Store plain password and unique_service_id for response (will be shown once)
        service_user._plain_password = password
        service_user._unique_service_id = service_user.unique_service_id

        return service_user


class ServiceUserLoginSerializer(serializers.Serializer):
    """Service User login serializer"""
    unique_service_id = serializers.CharField()
    password = serializers.CharField(write_only=True)
    service_type = serializers.CharField()

    def validate(self, attrs):
        unique_service_id = attrs.get('unique_service_id')
        password = attrs.get('password')
        service_type = attrs.get('service_type')

        if unique_service_id and password and service_type:
            try:
                # Find service by type
                service = Service.objects.get(service_type=service_type, is_active=True)

                # Find service user by unique_service_id
                service_user = CompanyServiceUser.objects.get(
                    unique_service_id=unique_service_id,
                    service=service,
                    is_active=True
                )

                # Check password
                if not check_password(password, service_user.password):
                    raise serializers.ValidationError('Invalid credentials.')

                # Check if password expired
                if service_user.is_password_expired():
                    raise serializers.ValidationError('Password has expired.')

                # Check if company is approved
                if service_user.company.approval_status != 'approved':
                    raise serializers.ValidationError('Company not approved.')

                attrs['service_user'] = service_user
                return attrs

            except (Service.DoesNotExist, CompanyServiceUser.DoesNotExist):
                raise serializers.ValidationError('Invalid credentials.')

        raise serializers.ValidationError('Must include unique_service_id, password, and service_type.')


class CompanyUserPasswordChangeSerializer(serializers.Serializer):
    """Company user password change serializer"""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError('New passwords do not match.')
        return attrs


class ServiceUserPasswordChangeSerializer(serializers.Serializer):
    """Service user password change serializer"""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError('New passwords do not match.')
        return attrs

    def validate_current_password(self, value):
        """Validate current password"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'service_user'):
            raise serializers.ValidationError('Invalid user context')

        if not check_password(value, request.service_user.password):
            raise serializers.ValidationError('Current password is incorrect.')

        return value


class MasterAdminEmailSettingsSerializer(serializers.ModelSerializer):
    """Master Admin Email Settings serializer"""
    
    class Meta:
        model = MasterAdminEmailSettings
        fields = ['provider', 'smtp_host', 'smtp_port', 'use_tls', 'use_ssl',
                 'email_address', 'email_password', 'from_name', 'is_active',
                 'emails_sent_today', 'total_emails_sent', 'last_email_sent']
        extra_kwargs = {
            'emails_sent_today': {'read_only': True},
            'total_emails_sent': {'read_only': True},
            'last_email_sent': {'read_only': True},
        }
    
    def validate_email_address(self, value):
        """Validate email address format"""
        if not value or '@' not in value:
            raise serializers.ValidationError('Please enter a valid email address')
        
        # Additional security validation
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError('Invalid email format')
        
        return value
    
    def validate(self, attrs):
        """Validate provider-specific settings"""
        provider = attrs.get('provider')
        
        if provider == 'custom':
            if not attrs.get('smtp_host'):
                raise serializers.ValidationError({
                    'smtp_host': 'SMTP host is required for custom provider'
                })
            if not attrs.get('smtp_port'):
                raise serializers.ValidationError({
                    'smtp_port': 'SMTP port is required for custom provider'
                })
        
        return attrs
