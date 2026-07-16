from rest_framework import status, permissions
from django.utils._os import safe_join
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView, ListAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate
from django.conf import settings
from datetime import timedelta
import secrets
import string
import logging
from .utils import safe_join, validate_filename, get_safe_scripts_path
from .security_fixes import secure_path_join, sanitize_filename, escape_content, secure_file_write


from .models import (
    MasterAdmin, Company, Service, CompanyService,
    CompanyUser, SecurityLog, CompanyServiceUser, ServiceUserSession
)
from .serializers import (
    ServiceSerializer, CompanyCreateSerializer,
    CompanyListSerializer, CompanyDetailSerializer, CompanyDetailedInfoSerializer,
    CompanyServiceSerializer,
    ServicePasswordChangeSerializer, SecurityLogSerializer,
    MasterAdminPasswordChangeSerializer, MasterAdminProfileSerializer
)
from .optimized_serializers import (
    FastMasterAdminLoginSerializer, FastCompanyUserLoginSerializer
)
from notifications.models import Notification
from notifications.serializers import NotificationCreateSerializer


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_security_event(user, event_type, request, details=""):
    """Log security events"""
    SecurityLog.objects.create(
        user=user,
        event_type=event_type,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details=details
    )


@method_decorator(csrf_exempt, name='dispatch')
class MasterAdminLoginView(APIView):
    """Master Admin login endpoint"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)

            # Resolve master admin profile early for lockout enforcement
            master_admin = getattr(user, 'master_admin', None)

            if master_admin:
                # Check account lockout
                if master_admin.is_locked:
                    if master_admin.locked_until and master_admin.locked_until > timezone.now():
                        return Response(
                            {'error': 'Account is temporarily locked. Try again later.'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS
                        )
                    # Auto-unlock: lockout period has passed
                    master_admin.is_locked = False
                    master_admin.login_attempts = 0
                    master_admin.locked_until = None
                    master_admin.save(update_fields=['is_locked', 'login_attempts', 'locked_until'])

            if user.check_password(password) and user.is_active:
                if master_admin:
                    refresh = RefreshToken.for_user(user)
                    access_token = refresh.access_token

                    master_admin.last_login_ip = get_client_ip(request)
                    master_admin.login_attempts = 0
                    master_admin.is_locked = False
                    master_admin.locked_until = None
                    master_admin.save()

                    log_security_event(user, 'LOGIN_SUCCESS', request, 'Master admin login')

                    return Response({
                        'access': str(access_token),
                        'refresh': str(refresh),
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'company_name': master_admin.company_name,
                            'is_master_admin': True
                        },
                        'first_login_required': False,
                        'approval_pending': False,
                        'approval_status': 'approved'
                    })
                else:
                    return Response({'error': 'User is not a master admin'}, status=status.HTTP_403_FORBIDDEN)
            else:
                # Wrong password — track failed attempts for master admin accounts
                if master_admin:
                    master_admin.login_attempts += 1
                    if master_admin.login_attempts >= 5:
                        master_admin.is_locked = True
                        master_admin.locked_until = timezone.now() + timedelta(minutes=15)
                    master_admin.save(update_fields=['login_attempts', 'is_locked', 'locked_until'])
                    log_security_event(
                        user, 'LOGIN_FAILED', request,
                        f'Invalid password, attempt {master_admin.login_attempts}'
                    )
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ServiceListView(ListAPIView):
    """List all available services"""
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]


class CompanyListCreateView(ListCreateAPIView):
    """List and create companies (Master Admin only)"""
    serializer_class = CompanyListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only master admins can see all companies
        if hasattr(self.request.user, 'master_admin'):
            return Company.objects.select_related('created_by', 'approved_by').prefetch_related('users', 'company_services__service')
        return Company.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CompanyCreateSerializer
        return CompanyListSerializer

    def create(self, request, *args, **kwargs):
        # Only master admins can create companies
        if not hasattr(request.user, 'master_admin'):
            raise permissions.PermissionDenied("Only master admins can create companies.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            company = serializer.save()

            # Log company creation
            log_security_event(
                request.user,
                'COMPANY_CREATED',
                request,
                f'Created company: {company.name}'
            )

            # Create notification for company user about registration
            company_user = company.users.first()
            if company_user:
                Notification.objects.create(
                    recipient=company_user.user,
                    sender=request.user,
                    notification_type='company_registration',
                    priority='high',
                    title='Welcome to ᗩTᕼᙓᑎᗩ\'𝔖',
                    message=f'Your company {company.name} has been registered. Please complete your profile information.',
                    company_id=company.id
                )

        # Get the company user for credentials
        company_user = company.users.first()
        user_email = company_user.user.email if company_user else None
        
        # Prepare response with company credentials
        response_data = {
            'message': 'Company created successfully.',
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'approval_status': company.approval_status
            },
            'user_credentials': {
                'email': user_email,
                'password': serializer.validated_data.get('user_password')
            }
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


class CompanyDetailView(RetrieveUpdateDestroyAPIView):
    """Company detail view with delete functionality"""
    serializer_class = CompanyDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'master_admin'):
            return Company.objects.all()
        elif hasattr(self.request.user, 'company_user'):
            return Company.objects.filter(id=self.request.user.company_user.company.id)
        return Company.objects.none()
    
    def update(self, request, *args, **kwargs):
        """Update company with service management"""
        # Only master admins can update companies
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can update companies.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        
        # Handle services update if provided
        services_data = request.data.get('services')
        if services_data is not None:
            with transaction.atomic():
                # Get current service IDs
                current_service_ids = set(
                    instance.company_services.filter(is_active=True).values_list('service_id', flat=True)
                )
                
                # Get new service IDs from request
                new_service_ids = set(services_data)
                
                # Services to add
                services_to_add = new_service_ids - current_service_ids
                # Services to remove
                services_to_remove = current_service_ids - new_service_ids
                
                # Add new services
                for service_id in services_to_add:
                    try:
                        service = Service.objects.get(id=service_id, is_active=True)
                        CompanyService.objects.create(
                            company=instance,
                            service=service,
                            assigned_by=request.user,
                            service_password=''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12)),
                            password_expires_at=timezone.now() + timedelta(days=365)
                        )
                    except Service.DoesNotExist:
                        continue
                
                # Remove services
                instance.company_services.filter(
                    service_id__in=services_to_remove
                ).update(is_active=False)
        
        # Update other company fields
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

    def perform_destroy(self, instance):
        """Company deletion with proper cascade handling"""
        if not hasattr(self.request.user, 'master_admin'):
            raise PermissionDenied("Only master admins can delete companies")
        
        try:
            with transaction.atomic():
                # First, clean up all FK references to CompanyServiceUser to avoid constraint violations.
                service_user_ids = list(instance.service_users.values_list('id', flat=True))
                if service_user_ids:
                    from django.apps import apps
                    from django.db import models
                    from django.db import connection
                    
                    # Handle Athens project references specifically
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "UPDATE athens_project SET created_by_id = NULL WHERE created_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project SET approved_by_id = NULL WHERE approved_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_admin SET created_by_id = NULL WHERE created_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_admin SET approved_by_id = NULL WHERE approved_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_admin SET service_user_id = NULL WHERE service_user_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_user SET created_by_id = NULL WHERE created_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_user SET service_user_id = NULL WHERE service_user_id = ANY(%s)",
                            [service_user_ids]
                        )
                    
                    # Handle other models with FK references
                    for model in apps.get_models():
                        for field in model._meta.get_fields():
                            if not isinstance(field, models.ForeignKey):
                                continue
                            if field.remote_field.model != CompanyServiceUser:
                                continue
                            fk_name = field.name
                            
                            # Check if table exists before querying
                            table_name = model._meta.db_table
                            try:
                                with connection.cursor() as cursor:
                                    cursor.execute(
                                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s)",
                                        [table_name]
                                    )
                                    table_exists = cursor.fetchone()[0]
                                    
                                if not table_exists:
                                    continue
                                    
                                qs = model.objects.filter(**{f"{fk_name}__in": service_user_ids})
                                if not qs.exists():
                                    continue
                                    
                                if field.null:
                                    qs.update(**{fk_name: None})
                                else:
                                    qs.delete()
                                    
                            except Exception as e:
                                # Skip models with missing tables or other DB issues
                                print(f'⚠️ Skipping model {model._meta.label} due to error: {str(e)}')
                                continue
                
                # Now delete the company - Django will handle the rest
                instance.delete()
                
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f'🔍 COMPANY DELETE ERROR: {str(e)}')
            print(f'🔍 FULL TRACEBACK: {error_details}')
            raise Exception(f'Failed to delete company: {str(e)}')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except Exception as e:
            logging.getLogger(__name__).exception(
                "Company delete failed",
                extra={"company_id": getattr(instance, "id", None)},
            )
            return Response(
                {"error": "Failed to delete company", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_204_NO_CONTENT)




class CompanyDetailedInfoView(APIView):
    """Company detailed information submission with document upload"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, company_id):
        # Only company users can update their own company info
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can update company information.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        if company_user.company.id != company_id:
            return Response(
                {'error': 'You can only update your own company information.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company = company_user.company
        
        # Handle file uploads
        uploaded_files = {}
        for key, file in request.FILES.items():
            if file:
                # Save file with secure naming
                import os
                from django.core.files.storage import default_storage
                
                # Create secure filename
                timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
                filename = f"company_{company.id}_{key}_{timestamp}_{file.name}"
                
                # Save file
                file_path = default_storage.save(f"company_documents/{filename}", file)
                uploaded_files[key] = file_path
        
        # Prepare data for serializer (exclude files from form_data)
        form_data = {}
        for key, value in request.data.items():
            if key not in request.FILES:
                form_data[key] = value
        
        if uploaded_files:
            form_data['uploaded_documents'] = uploaded_files
        
        serializer = CompanyDetailedInfoSerializer(company, data=form_data, partial=True)

        if serializer.is_valid():
            with transaction.atomic():
                updated_company = serializer.save()
                
                # Store document paths in company model if needed
                if uploaded_files:
                    # You can add a JSONField to Company model to store document paths
                    # For now, we'll store in special_requirements as a JSON string
                    import json
                    existing_docs = {}
                    if company.special_requirements:
                        try:
                            existing_docs = json.loads(company.special_requirements)
                        except:
                            existing_docs = {}
                    
                    if 'documents' not in existing_docs:
                        existing_docs['documents'] = {}
                    
                    existing_docs['documents'].update(uploaded_files)
                    company.special_requirements = json.dumps(existing_docs)
                    company.save()

                # Mark first login as completed
                if not company_user.first_login_completed:
                    company_user.first_login_completed = True
                    company_user.first_login_at = timezone.now()
                    company_user.save()

                # Create notification for master admin
                master_admins = User.objects.filter(master_admin__isnull=False)
                for admin in master_admins:
                    Notification.objects.create(
                        recipient=admin,
                        sender=request.user,
                        notification_type='company_registration',
                        priority='high',
                        title='Company Information Submitted',
                        message=f'{company.name} has submitted their detailed information for approval.',
                        company_id=company.id,
                        metadata={
                            'company_name': company.name,
                            'company_email': company.email,
                            'submitted_by': request.user.email
                        }
                    )

                # Log the event
                log_security_event(
                    request.user,
                    'COMPANY_INFO_SUBMITTED',
                    request,
                    f'Submitted detailed info for company: {company.name}'
                )

                return Response({
                    'message': 'Company information submitted successfully. Awaiting approval.',
                    'company': CompanyDetailSerializer(updated_company).data
                })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompanyApprovalView(APIView):
    """Company approval endpoint (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id):
        # Only master admins can approve companies
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can approve companies.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company = get_object_or_404(Company, id=company_id)
        action = request.data.get('action')  # 'approve' or 'reject'

        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Action must be either "approve" or "reject".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            if action == 'approve':
                company.approval_status = 'approved'
                company.approved_by = request.user
                company.approved_at = timezone.now()
                message = f'Your company {company.name} has been approved! You can now access your dashboard.'
                notification_type = 'company_approval'
            else:
                company.approval_status = 'rejected'
                message = f'Your company {company.name} registration has been rejected. Please contact support for more information.'
                notification_type = 'company_rejection'

            company.save()

            # Notify company users
            company_users = company.users.all()
            for company_user in company_users:
                Notification.objects.create(
                    recipient=company_user.user,
                    sender=request.user,
                    notification_type=notification_type,
                    priority='high',
                    title=f'Company {action.title()}d',
                    message=message,
                    company_id=company.id
                )

            # Log the event
            log_security_event(
                request.user,
                'COMPANY_APPROVED' if action == 'approve' else 'COMPANY_REJECTED',
                request,
                f'{action.title()}d company: {company.name}'
            )

            return Response({
                'message': f'Company {action}d successfully.',
                'company': CompanyDetailSerializer(company).data
            })


@method_decorator(csrf_exempt, name='dispatch')
class CompanyUserLoginView(APIView):
    """Company user login endpoint"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = FastCompanyUserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            company_user = user.company_user
            
            # Check IP restrictions FIRST
            from company_dashboard.ip_restriction_views import is_ip_allowed
            if not is_ip_allowed(company_user.company, get_client_ip(request)):
                # Log blocked IP attempt
                log_security_event(user, 'LOGIN_FAILED', request, 'IP address not authorized')
                return Response({
                    'error': 'Access denied from this IP address. Please contact your administrator.',
                    'ip_blocked': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if 2FA is required
            requires_2fa = serializer.validated_data.get('requires_2fa', False)
            if requires_2fa is True:
                return Response({
                    'requires_2fa': True,
                    'message': '2FA code required',
                    'user_id': user.id
                })
            
            company_user = user.company_user

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            # Update login info
            company_user.last_login_at = timezone.now()
            company_user.last_login_ip = get_client_ip(request)
            company_user.login_attempts = 0
            company_user.save()

            # Create session for Active Sessions tracking
            from company_dashboard.security_models import CompanyUserSession
            from user_agents import parse
            import secrets
            import string
            
            # Generate session key
            session_key = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(40))
            
            # Parse user agent
            user_agent_string = request.META.get('HTTP_USER_AGENT', '')
            user_agent = parse(user_agent_string)
            
            # Create session
            CompanyUserSession.objects.create(
                user=company_user,
                session_key=session_key,
                device_type='mobile' if user_agent.is_mobile else 'desktop',
                browser=f"{user_agent.browser.family} {user_agent.browser.version_string}",
                os=f"{user_agent.os.family} {user_agent.os.version_string}",
                ip_address=get_client_ip(request),
                user_agent=user_agent_string,
                is_current=True,
                expires_at=timezone.now() + timezone.timedelta(hours=24)
            )
            
            # Queue background security tasks (non-blocking) - optional if Redis unavailable
            try:
                from .async_security_tasks import (
                    send_company_login_alert_async,
                    update_device_fingerprint_async,
                    run_threat_detection_async
                )
                
                # Prepare request data for async tasks
                request_data = {
                    'META': dict(request.META),
                    'ip_address': get_client_ip(request)
                }
                
                # Queue async tasks (immediate return)
                device_info = f"{user_agent.browser.family} on {user_agent.os.family}"
                send_company_login_alert_async.delay(
                    company_user.company.id, user.email, get_client_ip(request), device_info
                )
                update_device_fingerprint_async.delay(
                    company_user.id, 'company_user', request_data
                )
                run_threat_detection_async.delay(
                    company_user.company.id, user.email, get_client_ip(request),
                    request.META.get('HTTP_USER_AGENT', ''), True
                )
            except Exception as e:
                # Fallback: continue without async tasks if Redis/Celery unavailable
                print(f'⚠️ Async tasks unavailable: {e}')
            
            # Only keep critical security checks (fast operations)
            from company_dashboard.geolocation_views import check_geolocation_access
            try:
                # Quick geolocation check (cached results)
                geo_result = check_geolocation_access(
                    company_user.company,
                    get_client_ip(request),
                    user.email
                )
                
                if not geo_result['allowed']:
                    return Response({
                        'error': f'Access denied from location. Contact administrator.',
                        'location_blocked': True
                    }, status=status.HTTP_403_FORBIDDEN)
                
                if geo_result['requires_2fa']:
                    return Response({
                        'requires_2fa': True,
                        'message': '2FA required for this location',
                        'user_id': user.id,
                        'geolocation_2fa': True
                    })
                    
            except Exception as e:
                print(f'🌍 GEOLOCATION ERROR: {str(e)}')
            
            # Quick security log (essential only)
            from company_dashboard.security_models import CompanySecurityLog
            CompanySecurityLog.objects.create(
                company=company_user.company,
                user_email=user.email,
                action='login',
                ip_address=get_client_ip(request),
                success=True,
                details='Login successful'
            )
            
            # Log successful login
            log_security_event(user, 'LOGIN_SUCCESS', request, 'Company user login')

            # Get full logo URL
            logo_url = None
            if company_user.company.logo:
                logo_url = request.build_absolute_uri(company_user.company.logo.url)

            response_data = {
                'access': str(access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'company_id': company_user.company.id,
                    'company_name': company_user.company.name,
                    'company_logo': logo_url,
                    'is_company_user': True
                },
                'must_change_password': company_user.must_change_password
            }

            # Check if first login is required
            if serializer.validated_data.get('first_login_required'):
                response_data['first_login_required'] = True
                print(f'🔍 DEBUG: Setting first_login_required=True for user {user.email}')
            elif serializer.validated_data.get('approval_pending'):
                response_data['approval_pending'] = True
                response_data['approval_status'] = company_user.company.approval_status
                print(f'🔍 DEBUG: Setting approval_pending=True for user {user.email}')
            elif serializer.validated_data.get('force_password_reset'):
                response_data['force_password_reset'] = True
                print(f'🔍 DEBUG: Setting force_password_reset=True for user {user.email}')
            else:
                print(f'🔍 DEBUG: No special flags set for user {user.email}')
                print(f'🔍 DEBUG: Company status: {company_user.company.approval_status}')
                print(f'🔍 DEBUG: First login completed: {company_user.first_login_completed}')

            print(f'🔍 DEBUG: Final response_data: {response_data}')
            return Response(response_data)

        # Log failed login attempt and return attempt info
        email = request.data.get('email')
        if email:
            try:
                user = User.objects.get(email=email)
                if hasattr(user, 'company_user'):
                    company_user = user.company_user
                else:
                    return Response({'error': 'Login failed. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)
                company_user.login_attempts += 1
                
                max_attempts = 5
                remaining_attempts = max_attempts - company_user.login_attempts
                
                if company_user.login_attempts >= max_attempts:
                    company_user.is_locked = True
                    company_user.locked_until = timezone.now() + timezone.timedelta(minutes=30)
                    
                company_user.save()
                # AI-Enhanced Threat Detection for failed login
                from company_dashboard.threat_detection_engine import threat_monitor
                from company_dashboard.security_models import CompanySecurityLog
                try:
                    threats = threat_monitor.monitor_login_attempt(
                        company_user.company,
                        user.email,
                        get_client_ip(request),
                        request.META.get('HTTP_USER_AGENT', ''),
                        success=False
                    )
                    if threats:
                        print(f'🔍 THREAT DETECTION: {len(threats)} threats detected for failed login {user.email}')
                    
                    # Log failed login to Company Security Log
                    CompanySecurityLog.objects.create(
                        company=company_user.company,
                        user_email=user.email,
                        action='failed_login',
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        success=False,
                        details=f'Failed login attempt - {remaining_attempts} attempts remaining'
                    )
                except Exception as e:
                    print(f'🔍 THREAT DETECTION ERROR: {str(e)}')
                
                # Device Fingerprinting for failed attempts
                try:
                    from company_dashboard.device_management_views import DeviceManagementView
                    device_view = DeviceManagementView()
                    
                    user_agent_string = request.META.get('HTTP_USER_AGENT', '')
                    fingerprint_data = {
                        'userAgent': user_agent_string,
                        'screen': '',
                        'timezone': '',
                        'language': request.META.get('HTTP_ACCEPT_LANGUAGE', '').split(',')[0] if request.META.get('HTTP_ACCEPT_LANGUAGE') else '',
                        'platform': ''
                    }
                    
                    device_view._register_device_fingerprint(company_user, fingerprint_data, get_client_ip(request), failed_attempt=True)
                except Exception as e:
                    print(f'📱 Device fingerprinting error (failed login): {str(e)}')
                
                log_security_event(user, 'LOGIN_FAILED', request, 'Failed company user login')
                
                # Return detailed error with attempt info
                if company_user.is_locked:
                    return Response({
                        'error': 'Account locked due to too many failed attempts. Try again in 30 minutes.',
                        'locked': True,
                        'locked_until': company_user.locked_until.isoformat() if company_user.locked_until else None
                    }, status=status.HTTP_423_LOCKED)
                else:
                    return Response({
                        'error': f'Login failed. {remaining_attempts} attempts remaining.',
                        'attempts_remaining': remaining_attempts,
                        'max_attempts': max_attempts
                    }, status=status.HTTP_401_UNAUTHORIZED)
                    
            except (User.DoesNotExist, CompanyUser.DoesNotExist):
                pass

        return Response({'error': 'Login failed. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)


class CompanyServicesView(ListAPIView):
    """List company services"""
    serializer_class = CompanyServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
            if company.approval_status == 'approved':
                return CompanyService.objects.filter(company=company, is_active=True)
        return CompanyService.objects.none()


class CompanyAssignedServicesView(ListAPIView):
    """List services assigned to company (for service selection)"""
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
            if company.approval_status == 'approved':
                # Get service IDs that are assigned to this company
                assigned_service_ids = CompanyService.objects.filter(
                    company=company,
                    is_active=True
                ).values_list('service_id', flat=True)

                # Return the actual Service objects with ordering
                return Service.objects.filter(id__in=assigned_service_ids, is_active=True).order_by('name')
        return Service.objects.none()


class ServiceAccessView(APIView):
    """Service access with password verification"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, service_id):
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can access services.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        if company.approval_status != 'approved':
            return Response(
                {'error': 'Company must be approved to access services.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get company service
        try:
            company_service = CompanyService.objects.get(
                company=company,
                service_id=service_id,
                is_active=True
            )
        except CompanyService.DoesNotExist:
            return Response(
                {'error': 'Service not assigned to your company.'},
                status=status.HTTP_404_NOT_FOUND
            )

        password = request.data.get('password')
        if not password:
            return Response(
                {'error': 'Service password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify service password
        if check_password(password, company_service.service_password):
            # Log successful service access
            log_security_event(
                request.user,
                'SERVICE_ACCESS',
                request,
                f'Accessed service: {company_service.service.name}'
            )

            return Response({
                'message': 'Service access granted.',
                'service': {
                    'id': company_service.service.id,
                    'name': company_service.service.name,
                    'service_type': company_service.service.service_type,
                    'description': company_service.service.description
                }
            })
        else:
            # Log failed service access
            log_security_event(
                request.user,
                'SERVICE_ACCESS_FAILED',
                request,
                f'Failed access to service: {company_service.service.name}'
            )

            return Response(
                {'error': 'Invalid service password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class ServicePasswordChangeView(APIView):
    """Change service password"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, service_id):
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can change service passwords.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Get company service
        try:
            company_service = CompanyService.objects.get(
                company=company,
                service_id=service_id,
                is_active=True
            )
        except CompanyService.DoesNotExist:
            return Response(
                {'error': 'Service not assigned to your company.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ServicePasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            current_password = serializer.validated_data['current_password']
            new_password = serializer.validated_data['new_password']

            # Verify current password
            if check_password(current_password, company_service.service_password):
                # Update password
                company_service.service_password = make_password(new_password)
                company_service.password_changed_at = timezone.now()
                company_service.save()

                # Log password change
                log_security_event(
                    request.user,
                    'PASSWORD_CHANGED',
                    request,
                    f'Changed password for service: {company_service.service.name}'
                )

                return Response({'message': 'Service password changed successfully.'})
            else:
                return Response(
                    {'error': 'Current password is incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MasterAdminPasswordChangeView(APIView):
    """Master Admin password change endpoint"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can change their password.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = MasterAdminPasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            current_password = serializer.validated_data['current_password']
            new_password = serializer.validated_data['new_password']

            # Verify current password
            if check_password(current_password, request.user.password):
                # Update password
                request.user.set_password(new_password)
                request.user.save()

                # Update master admin password expiration
                master_admin = request.user.master_admin
                master_admin.password_expires_at = timezone.now() + timezone.timedelta(days=90)
                master_admin.save()

                # Log password change
                log_security_event(
                    request.user,
                    'PASSWORD_CHANGED',
                    request,
                    'Master admin password changed'
                )

                return Response({'message': 'Password changed successfully.'})
            else:
                return Response(
                    {'error': 'Current password is incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MasterAdminProfileView(RetrieveUpdateAPIView):
    """Master Admin profile view"""
    serializer_class = MasterAdminProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if not hasattr(self.request.user, 'master_admin'):
            raise permissions.PermissionDenied("Only master admins can access this endpoint.")
        return self.request.user.master_admin


class SecurityLogView(ListAPIView):
    """Security log view (Master Admin only)"""
    serializer_class = SecurityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'master_admin'):
            return SecurityLog.objects.all()
        return SecurityLog.objects.none()


class ValidateTokenView(APIView):
    """Validate JWT token endpoint"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Validate the current token and return user info"""
        try:
            user = request.user
            user_data = {
                'id': user.id,
                'email': user.email,
                'is_master_admin': hasattr(user, 'master_admin'),
                'is_company_user': hasattr(user, 'company_user'),
            }

            # Add additional user-specific data
            if hasattr(user, 'master_admin'):
                master_admin = user.master_admin
                user_data.update({
                    'company_name': master_admin.company_name,
                    'role': 'master_admin'
                })
            elif hasattr(user, 'company_user'):
                company_user = user.company_user
                # Get full logo URL
                logo_url = None
                if company_user.company and company_user.company.logo:
                    logo_url = request.build_absolute_uri(company_user.company.logo.url)

                user_data.update({
                    'role': 'company_user',
                    'company_id': company_user.company.id if company_user.company else None,
                    'company_name': company_user.company.name if company_user.company else None,
                    'company_logo': logo_url,
                })

            return Response({
                'valid': True,
                'user': user_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"🔍 DEBUG: Token validation error: {str(e)}")
            return Response({
                'valid': False,
                'error': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)


class RequestServiceAccessView(APIView):
    """Company users request access to services"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Only company users can request service access
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can request service access.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Check if company is approved
        if company.approval_status != 'approved':
            return Response(
                {'error': 'Company must be approved before requesting service access.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service_ids = request.data.get('service_ids', [])
        if not service_ids:
            return Response(
                {'error': 'Please select at least one service.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Get services
                services = Service.objects.filter(id__in=service_ids, is_active=True)
                if not services.exists():
                    return Response(
                        {'error': 'No valid services found.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Create CompanyService records
                created_services = []
                for service in services:
                    company_service, created = CompanyService.objects.get_or_create(
                        company=company,
                        service=service,
                        defaults={'assigned_by': request.user}
                    )
                    if created:
                        created_services.append(service.name)

                # Log the event
                log_security_event(
                    request.user,
                    'SERVICE_ACCESS_REQUESTED',
                    request,
                    f'Requested access to services: {", ".join(created_services)}'
                )

                return Response({
                    'message': f'Access requested for {len(created_services)} services successfully.',
                    'services': created_services
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to request service access: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CompanyServiceCredentialsView(APIView):
    """Get service credentials for a company (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, company_id):
        # Only master admins can access service credentials
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can access service credentials.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get company services
        company_services = CompanyService.objects.filter(
            company=company,
            is_active=True
        ).select_related('service')

        # Note: We cannot retrieve plain text passwords as they are hashed
        # This endpoint provides information about services but not passwords
        services_info = []
        for cs in company_services:
            services_info.append({
                'service_id': cs.service.id,
                'service_name': cs.service.name,
                'service_type': cs.service.service_type,
                'assigned_at': cs.assigned_at.isoformat(),
                'password_expires_at': cs.password_expires_at.isoformat(),
                'password_changed_at': cs.password_changed_at.isoformat(),
                'note': 'Password is hashed and cannot be retrieved. Use reset functionality if needed.'
            })

        return Response({
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email
            },
            'services': services_info,
            'message': 'Service passwords are hashed and cannot be retrieved. Use the reset password functionality to generate new passwords.'
        })

    def post(self, request, company_id):
        """Reset service passwords for a company"""
        # Only master admins can reset service passwords
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can reset service passwords.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get company services
        company_services = CompanyService.objects.filter(
            company=company,
            is_active=True
        ).select_related('service')

        if not company_services.exists():
            return Response(
                {'error': 'No active services found for this company.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate new passwords
        service_credentials = []
        for cs in company_services:
            # Generate new password
            new_password = self._generate_service_password()

            # Update the service password
            cs.service_password = make_password(new_password)
            cs.password_changed_at = timezone.now()
            cs.password_expires_at = timezone.now() + timezone.timedelta(days=90)
            cs.save()

            # Get service users for this service to include unique_service_id
            service_users = CompanyServiceUser.objects.filter(
                company=company,
                service=cs.service,
                is_active=True
            )
            
            unique_service_ids = [su.unique_service_id for su in service_users] if service_users.exists() else ['N/A']

            service_credentials.append({
                'service_id': cs.service.id,
                'service_name': cs.service.name,
                'service_type': cs.service.service_type,
                'password': new_password,
                'unique_service_ids': unique_service_ids
            })

        # Log security event
        log_security_event(
            request.user,
            'SERVICE_PASSWORDS_RESET',
            request,
            f'Reset service passwords for company: {company.name}'
        )

        return Response({
            'message': 'Service passwords reset successfully.',
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email
            },
            'service_credentials': service_credentials
        })

    def _generate_service_password(self, length=12):
        """Generate secure service password"""
        import string
        import secrets
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))


# Service User Views
class ServiceUserLoginView(APIView):
    """Service User login endpoint"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .serializers import ServiceUserLoginSerializer

        serializer = ServiceUserLoginSerializer(data=request.data)
        if serializer.is_valid():
            service_user = serializer.validated_data['service_user']

            # Update login info
            service_user.last_login = timezone.now()
            service_user.login_count += 1
            service_user.save()

            # Create session with expiry
            from .models import ServiceUserSession
            session_key = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(40))
            ServiceUserSession.objects.create(
                service_user=service_user,
                session_key=session_key,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                expires_at=timezone.now() + timedelta(hours=8)
            )

            return Response({
                'session_key': session_key,
                'user': {
                    'id': service_user.id,
                    'username': service_user.username,
                    'email': service_user.email,
                    'full_name': service_user.full_name,
                    'role': service_user.role,
                    'service_name': service_user.service.name,
                    'service_type': service_user.service.service_type,
                    'company_id': service_user.company.id,
                    'company_name': service_user.company.name,
                    'must_change_password': service_user.must_change_password,
                    'is_password_expired': service_user.is_password_expired()
                }
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ServiceUserLogoutView(APIView):
    """Service User logout endpoint"""
    authentication_classes = []  # Disable authentication for logout
    permission_classes = [permissions.AllowAny]  # Allow any user to logout

    def post(self, request):
        session_key = request.data.get('session_key')
        if session_key:
            from .models import ServiceUserSession
            try:
                session = ServiceUserSession.objects.get(
                    session_key=session_key,
                    is_active=True
                )
                session.logout_time = timezone.now()
                session.is_active = False
                session.save()

                return Response({'message': 'Logged out successfully'})
            except ServiceUserSession.DoesNotExist:
                # Even if session doesn't exist, return success for security
                return Response({'message': 'Logged out successfully'})

        return Response({'message': 'Logged out successfully'})  # Always return success for logout


class CompanyServiceUserListCreateView(ListCreateAPIView):
    """List and create service users for a company"""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            from .serializers import CompanyServiceUserCreateSerializer
            return CompanyServiceUserCreateSerializer
        from .serializers import CompanyServiceUserSerializer
        return CompanyServiceUserSerializer

    def get_queryset(self):
        # Only company users can access this
        if not hasattr(self.request.user, 'company_user'):
            return CompanyServiceUser.objects.none()

        company = self.request.user.company_user.company
        return CompanyServiceUser.objects.filter(company=company, is_active=True).select_related(
            'service', 'company', 'created_by'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        service_user = serializer.save()

        # Return credentials in response
        if hasattr(service_user, '_plain_password'):
            self.created_credentials = {
                'username': service_user.username,
                'unique_service_id': service_user.unique_service_id,
                'password': service_user._plain_password
            }

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        # Add credentials to response
        if hasattr(self, 'created_credentials'):
            response.data['credentials'] = self.created_credentials

        return response


class CompanyServiceUserDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a service user"""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import CompanyServiceUserSerializer
        return CompanyServiceUserSerializer

    def get_queryset(self):
        # Only company users can access this
        if not hasattr(self.request.user, 'company_user'):
            return CompanyServiceUser.objects.none()

        company = self.request.user.company_user.company
        return CompanyServiceUser.objects.filter(company=company, is_active=True).select_related(
            'service', 'company', 'created_by'
        )
    

    def post(self, request, *args, **kwargs):
        """Reset password for a service user"""
        if request.data.get('action') != 'reset_password':
            return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)

        instance = self.get_object()
        new_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

        instance.password = make_password(new_password)
        instance.must_change_password = True
        instance.password_changed_at = timezone.now()
        instance.password_expires_at = timezone.now() + timedelta(days=90)
        instance.save(update_fields=['password', 'must_change_password', 'password_changed_at', 'password_expires_at', 'updated_at'])

        ServiceUserSession.objects.filter(service_user=instance, is_active=True).update(
            is_active=False,
            revoked_at=timezone.now(),
        )

        log_security_event(
            request.user,
            'PASSWORD_CHANGED',
            request,
            f'Admin reset password for service user: {instance.username} ({instance.service.name})'
        )

        return Response({
            'message': 'Password reset successfully.',
            'username': instance.username,
            'unique_service_id': instance.unique_service_id,
            'new_password': new_password,
        }, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        """Custom delete logic to handle foreign key constraints"""
        from django.db import transaction
        
        try:
            with transaction.atomic():
                instance.is_active = False
                instance.save(update_fields=['is_active', 'updated_at'])
                ServiceUserSession.objects.filter(
                    service_user=instance,
                    is_active=True,
                ).update(
                    is_active=False,
                    revoked_at=timezone.now(),
                    logout_time=timezone.now(),
                )
                
                # Log the deletion
                log_security_event(
                    self.request.user,
                    'USER_DELETED',
                    self.request,
                    f'Deactivated service user: {instance.username} ({instance.service.name})'
                )
                
        except Exception as e:
            # Log the error for debugging
            print(f'🔍 DEBUG: Error deleting service user {instance.id}: {str(e)}')
            raise
    
    def _handle_athens_project_references(self, service_user):
        """Handle references from Athens project tables before deletion"""
        from django.db import connection
        
        # Get all Athens project references
        cursor = connection.cursor()
        
        # Update athens_project records to set created_by_id to NULL
        cursor.execute(
            "UPDATE athens_project SET created_by_id = NULL WHERE created_by_id = %s",
            [service_user.id]
        )
        
        # Update athens_project records to set approved_by_id to NULL
        cursor.execute(
            "UPDATE athens_project SET approved_by_id = NULL WHERE approved_by_id = %s",
            [service_user.id]
        )
        
        # Update athens_project_admin records
        cursor.execute(
            "UPDATE athens_project_admin SET created_by_id = NULL WHERE created_by_id = %s",
            [service_user.id]
        )
        cursor.execute(
            "UPDATE athens_project_admin SET approved_by_id = NULL WHERE approved_by_id = %s",
            [service_user.id]
        )
        cursor.execute(
            "UPDATE athens_project_admin SET service_user_id = NULL WHERE service_user_id = %s",
            [service_user.id]
        )
        
        # Update athens_project_user records
        cursor.execute(
            "UPDATE athens_project_user SET created_by_id = NULL WHERE created_by_id = %s",
            [service_user.id]
        )
        cursor.execute(
            "UPDATE athens_project_user SET service_user_id = NULL WHERE service_user_id = %s",
            [service_user.id]
        )
        
        print(f'🔍 DEBUG: Updated Athens project references for service user {service_user.id}')


class ServiceUserPasswordChangeView(APIView):
    """Change service user password"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .serializers import ServiceUserPasswordChangeSerializer

        # Get service user from session
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .models import ServiceUserSession
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Add service user to request for validation
            request.service_user = service_user

            serializer = ServiceUserPasswordChangeSerializer(
                data=request.data,
                context={'request': request}
            )

            if serializer.is_valid():
                # Update password
                new_password = serializer.validated_data['new_password']
                service_user.password = make_password(new_password)
                service_user.password_changed_at = timezone.now()
                service_user.password_expires_at = timezone.now() + timedelta(days=90)
                service_user.must_change_password = False
                service_user.save()

                return Response({'message': 'Password changed successfully'})

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_400_BAD_REQUEST)


class ServiceUserCompanyView(APIView):
    """Get company data for service users"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]

    def get(self, request, company_id):
        # Try to get session key from Authorization header first, then from query params
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.GET.get('session_key')

        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            from .models import ServiceUserSession
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Check if the requested company ID matches the service user's company
            if service_user.company.id != company_id:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

            # Return company data
            company = service_user.company
            logo_url = None
            if company.logo:
                logo_url = request.build_absolute_uri(company.logo.url)

            return Response({
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'phone': company.phone,
                'address': company.address,
                'logo': logo_url,
                'business_type': company.business_type,
                'industry': company.industry,
                'website': company.website,
                'gst_number': company.gst_number,
                'tax_id': company.tax_id,
                'registration_number': company.registration_number,
            })

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class CompanyProfileView(APIView):
    """Get company profile for service users"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Try to get session key from Authorization header first, then from query params
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.GET.get('session_key')

        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            from .models import ServiceUserSession
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user
            company = service_user.company

            # Return company data
            logo_url = None
            if company.logo:
                logo_url = request.build_absolute_uri(company.logo.url)

            return Response({
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'phone': company.phone,
                'address': company.address,
                'logo': logo_url,
                'business_type': company.business_type,
                'industry': company.industry,
                'website': company.website,
                'gst_number': company.gst_number,
                'tax_id': company.tax_id,
                'registration_number': company.registration_number,
            })

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class CompanyDetailsView(APIView):
    """Company details view and edit for company users"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get company details for the authenticated company user"""
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can access company details.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Return company data
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        return Response({
            'id': company.id,
            'name': company.name,
            'email': company.email,
            'phone': company.phone,
            'address': company.address,
            'logo': logo_url,
            'business_type': company.business_type,
            'industry': company.industry,
            'employee_count': company.employee_count,
            'annual_revenue': company.annual_revenue,
            'website': company.website,
            'gst_number': company.gst_number,
            'pan_number': company.pan_number,
            'registration_number': company.registration_number,
            'contact_person_name': company.contact_person_name,
            'contact_person_title': company.contact_person_title,
            'contact_person_email': company.contact_person_email,
            'contact_person_phone': company.contact_person_phone,
            'description': company.description,
            'domain_name': company.domain_name,
            'bank_name': company.bank_name,
            'bank_account_number': company.bank_account_number,
            'bank_ifsc_code': company.bank_ifsc_code,
            'bank_branch': company.bank_branch,
            'bank_account_holder': company.bank_account_holder,
            'bank_account_type': company.bank_account_type,
            'approval_status': company.approval_status,
            'created_at': company.created_at.isoformat() if company.created_at else None,
            'updated_at': company.updated_at.isoformat() if company.updated_at else None,
        })

    def put(self, request):
        """Update company details"""
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can update company details.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Fields that can be updated by company users
        updatable_fields = [
            'phone', 'address', 'business_type', 'industry', 'employee_count',
            'annual_revenue', 'website', 'gst_number', 'pan_number',
            'registration_number', 'contact_person_name', 'contact_person_title',
            'contact_person_email', 'contact_person_phone', 'description', 'domain_name',
            'bank_name', 'bank_account_number', 'bank_ifsc_code',
            'bank_branch', 'bank_account_holder', 'bank_account_type',
        ]

        # Update only the provided fields
        updated_fields = []
        for field in updatable_fields:
            if field in request.data:
                old_value = getattr(company, field)
                new_value = request.data[field]
                if old_value != new_value:
                    setattr(company, field, new_value)
                    updated_fields.append(field)

        if updated_fields:
            company.save()
            
            # Log the update
            log_security_event(
                request.user,
                'COMPANY_DETAILS_UPDATED',
                request,
                f'Updated company details: {", ".join(updated_fields)}'
            )

        # Return updated company data
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        return Response({
            'message': 'Company details updated successfully.',
            'updated_fields': updated_fields,
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'phone': company.phone,
                'address': company.address,
                'logo': logo_url,
                'business_type': company.business_type,
                'industry': company.industry,
                'employee_count': company.employee_count,
                'annual_revenue': company.annual_revenue,
                'website': company.website,
                'gst_number': company.gst_number,
                'pan_number': company.pan_number,
                'registration_number': company.registration_number,
                'contact_person_name': company.contact_person_name,
                'contact_person_title': company.contact_person_title,
                'contact_person_email': company.contact_person_email,
                'contact_person_phone': company.contact_person_phone,
                'description': company.description,
                'domain_name': company.domain_name,
                'bank_name': company.bank_name,
                'bank_account_number': company.bank_account_number,
                'bank_ifsc_code': company.bank_ifsc_code,
                'bank_branch': company.bank_branch,
                'bank_account_holder': company.bank_account_holder,
                'bank_account_type': company.bank_account_type,
                'approval_status': company.approval_status,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'updated_at': company.updated_at.isoformat() if company.updated_at else None,
            }
        })


class CompanyLogoUpdateView(APIView):
    """Update company logo"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print(f'🔍 DEBUG: Logo upload request from user: {request.user.email}')

        try:
            # Check if user has company_user relationship
            if not hasattr(request.user, 'company_user'):
                return Response({'error': 'User is not associated with a company'}, status=status.HTTP_400_BAD_REQUEST)

            # Get the company user
            company_user = request.user.company_user
            company = company_user.company

            # Check if logo file is provided
            if 'logo' not in request.FILES:
                return Response({'error': 'No logo file provided'}, status=status.HTTP_400_BAD_REQUEST)

            logo_file = request.FILES['logo']

            # Validate file size (5MB limit)
            if logo_file.size > 5 * 1024 * 1024:
                return Response({'error': 'File size too large. Maximum 5MB allowed.'}, status=status.HTTP_400_BAD_REQUEST)

            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
            if logo_file.content_type not in allowed_types:
                return Response({'error': 'Invalid file type. Only JPEG, PNG, and GIF are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

            # Update company logo
            company.logo = logo_file
            company.save()

            # Return updated user data with full logo URL
            logo_url = None
            if company.logo:
                logo_url = request.build_absolute_uri(company.logo.url)

            response_data = {
                'message': 'Logo updated successfully',
                'user': {
                    'id': request.user.id,
                    'email': request.user.email,
                    'company_id': company.id,
                    'company_name': company.name,
                    'company_logo': logo_url,
                    'is_company_user': True
                }
            }
            print(f'🔍 DEBUG: Logo uploaded successfully for {company.name}')
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f'🔍 DEBUG: Exception occurred: {str(e)}')
            import traceback
            traceback.print_exc()
            return Response({'error': f'Failed to update logo: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompanyPasswordResetView(APIView):
    """Reset company user password with enhanced security (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id):
        # Only master admins can reset company passwords
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can reset company passwords.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            company = Company.objects.get(id=company_id)
            company_user = company.users.first()
            
            if not company_user:
                return Response(
                    {'error': 'No company user found for this company.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            with transaction.atomic():
                # Generate new random password
                new_password = self._generate_secure_password()
                
                # Save current password to history before reset
                from company_dashboard.security_models import CompanyPasswordHistory
                CompanyPasswordHistory.objects.create(
                    user=company_user,
                    password_hash=company_user.user.password
                )
                
                # Update company user password
                company_user.user.set_password(new_password)
                company_user.user.save()
                
                # Enhanced security settings for admin reset
                company_user.must_change_password = True
                company_user.password_reset_by_admin = True
                company_user.password_changed_at = timezone.now()
                company_user.password_expires_at = timezone.now() + timezone.timedelta(days=90)
                company_user.save()
                
                # Terminate all active sessions for security
                from company_dashboard.security_models import CompanyUserSession
                CompanyUserSession.objects.filter(user=company_user).delete()
                
                # Enhanced security logging
                from company_dashboard.security_models import CompanySecurityLog
                CompanySecurityLog.objects.create(
                    company=company,
                    user_email=company_user.user.email,
                    action='password_change',
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True,
                    details=f'Password reset by master admin for company: {company.name}'
                )
                
                # Legacy security log for compatibility
                log_security_event(
                    request.user,
                    'PASSWORD_RESET',
                    request,
                    f'Reset password for company: {company.name}'
                )
                
                return Response({
                    'message': 'Password reset successfully with enhanced security.',
                    'company': {
                        'id': company.id,
                        'name': company.name,
                        'email': company.email
                    },
                    'credentials': {
                        'username': company_user.user.email,
                        'password': new_password
                    },
                    'security_actions': [
                        'Password saved to history',
                        'All active sessions terminated',
                        'Security audit log created',
                        'Password change required on next login'
                    ]
                })

        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to reset password: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_secure_password(self, length=12):
        """Generate secure random password"""
        import string
        import secrets
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    


class CompanyDetailsView(APIView):
    """Company details view and edit for company users"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get company details for the authenticated company user"""
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can access company details.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Return company data
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        return Response({
            'id': company.id,
            'name': company.name,
            'email': company.email,
            'phone': company.phone,
            'address': company.address,
            'logo': logo_url,
            'business_type': company.business_type,
            'industry': company.industry,
            'employee_count': company.employee_count,
            'annual_revenue': company.annual_revenue,
            'website': company.website,
            'gst_number': company.gst_number,
            'pan_number': company.pan_number,
            'registration_number': company.registration_number,
            'contact_person_name': company.contact_person_name,
            'contact_person_title': company.contact_person_title,
            'contact_person_email': company.contact_person_email,
            'contact_person_phone': company.contact_person_phone,
            'description': company.description,
            'domain_name': company.domain_name,
            'bank_name': company.bank_name,
            'bank_account_number': company.bank_account_number,
            'bank_ifsc_code': company.bank_ifsc_code,
            'bank_branch': company.bank_branch,
            'bank_account_holder': company.bank_account_holder,
            'bank_account_type': company.bank_account_type,
            'approval_status': company.approval_status,
            'created_at': company.created_at.isoformat() if company.created_at else None,
            'updated_at': company.updated_at.isoformat() if company.updated_at else None,
        })

    def put(self, request):
        """Update company details"""
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can update company details.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Fields that can be updated by company users
        updatable_fields = [
            'phone', 'address', 'business_type', 'industry', 'employee_count',
            'annual_revenue', 'website', 'gst_number', 'pan_number',
            'registration_number', 'contact_person_name', 'contact_person_title',
            'contact_person_email', 'contact_person_phone', 'description', 'domain_name',
            'bank_name', 'bank_account_number', 'bank_ifsc_code',
            'bank_branch', 'bank_account_holder', 'bank_account_type',
        ]







        # Update only the provided fields
        updated_fields = []
        for field in updatable_fields:
            if field in request.data:
                old_value = getattr(company, field)
                new_value = request.data[field]
                if old_value != new_value:
                    setattr(company, field, new_value)
                    updated_fields.append(field)

        if updated_fields:
            company.save()
            
            # Log the update
            log_security_event(
                request.user,
                'COMPANY_DETAILS_UPDATED',
                request,
                f'Updated company details: {", ".join(updated_fields)}'
            )

        # Return updated company data
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        return Response({
            'message': 'Company details updated successfully.',
            'updated_fields': updated_fields,
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'phone': company.phone,
                'address': company.address,
                'logo': logo_url,
                'business_type': company.business_type,
                'industry': company.industry,
                'employee_count': company.employee_count,
                'annual_revenue': company.annual_revenue,
                'website': company.website,
                'gst_number': company.gst_number,
                'pan_number': company.pan_number,
                'registration_number': company.registration_number,
                'contact_person_name': company.contact_person_name,
                'contact_person_title': company.contact_person_title,
                'contact_person_email': company.contact_person_email,
                'contact_person_phone': company.contact_person_phone,
                'description': company.description,
                'domain_name': company.domain_name,
                'bank_name': company.bank_name,
                'bank_account_number': company.bank_account_number,
                'bank_ifsc_code': company.bank_ifsc_code,
                'bank_branch': company.bank_branch,
                'bank_account_holder': company.bank_account_holder,
                'bank_account_type': company.bank_account_type,
                'approval_status': company.approval_status,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'updated_at': company.updated_at.isoformat() if company.updated_at else None,
            }
        })


class GenerateAutoCodeView(APIView):
    """Generate auto code for testing (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Only master admins can test auto-code generation
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can generate auto codes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_id = request.data.get('company_id')
        code_type = request.data.get('code_type')

        if not company_id or not code_type:
            return Response(
                {'error': 'company_id and code_type are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from .utils import generate_auto_code
            auto_code = generate_auto_code(company_id, code_type)
            
            return Response({
                'success': True,
                'auto_code': auto_code,
                'company_id': company_id,
                'code_type': code_type
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mobile_logout(request):
    """Logout endpoint — blacklists the JWT refresh token if provided."""
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken
            from rest_framework_simplejwt.exceptions import TokenError
            token = JWTRefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
    return Response({'message': 'Logged out successfully'})
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView, ListAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate
from django.conf import settings
from datetime import timedelta
import secrets
import string
import logging
from .utils import safe_join, validate_filename, get_safe_scripts_path
from .security_fixes import secure_path_join, sanitize_filename, escape_content, secure_file_write


from .models import (
    MasterAdmin, Company, Service, CompanyService,
    CompanyUser, SecurityLog, CompanyServiceUser, ServiceUserSession
)
from .serializers import (
    ServiceSerializer, CompanyCreateSerializer,
    CompanyListSerializer, CompanyDetailSerializer, CompanyDetailedInfoSerializer,
    CompanyServiceSerializer,
    ServicePasswordChangeSerializer, SecurityLogSerializer,
    MasterAdminPasswordChangeSerializer, MasterAdminProfileSerializer
)
from .optimized_serializers import (
    FastMasterAdminLoginSerializer, FastCompanyUserLoginSerializer
)
from notifications.models import Notification
from notifications.serializers import NotificationCreateSerializer


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_security_event(user, event_type, request, details=""):
    """Log security events"""
    SecurityLog.objects.create(
        user=user,
        event_type=event_type,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details=details
    )


@method_decorator(csrf_exempt, name='dispatch')
class MasterAdminLoginView(APIView):
    """Master Admin login endpoint"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)

            # Resolve master admin profile early for lockout enforcement
            master_admin = getattr(user, 'master_admin', None)

            if master_admin:
                # Check account lockout
                if master_admin.is_locked:
                    if master_admin.locked_until and master_admin.locked_until > timezone.now():
                        return Response(
                            {'error': 'Account is temporarily locked. Try again later.'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS
                        )
                    # Auto-unlock: lockout period has passed
                    master_admin.is_locked = False
                    master_admin.login_attempts = 0
                    master_admin.locked_until = None
                    master_admin.save(update_fields=['is_locked', 'login_attempts', 'locked_until'])

            if user.check_password(password) and user.is_active:
                if master_admin:
                    refresh = RefreshToken.for_user(user)
                    access_token = refresh.access_token

                    master_admin.last_login_ip = get_client_ip(request)
                    master_admin.login_attempts = 0
                    master_admin.is_locked = False
                    master_admin.locked_until = None
                    master_admin.save()

                    log_security_event(user, 'LOGIN_SUCCESS', request, 'Master admin login')

                    return Response({
                        'access': str(access_token),
                        'refresh': str(refresh),
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'company_name': master_admin.company_name,
                            'is_master_admin': True
                        },
                        'first_login_required': False,
                        'approval_pending': False,
                        'approval_status': 'approved'
                    })
                else:
                    return Response({'error': 'User is not a master admin'}, status=status.HTTP_403_FORBIDDEN)
            else:
                # Wrong password — track failed attempts for master admin accounts
                if master_admin:
                    master_admin.login_attempts += 1
                    if master_admin.login_attempts >= 5:
                        master_admin.is_locked = True
                        master_admin.locked_until = timezone.now() + timedelta(minutes=15)
                    master_admin.save(update_fields=['login_attempts', 'is_locked', 'locked_until'])
                    log_security_event(
                        user, 'LOGIN_FAILED', request,
                        f'Invalid password, attempt {master_admin.login_attempts}'
                    )
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ServiceListView(ListAPIView):
    """List all available services"""
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]


class CompanyListCreateView(ListCreateAPIView):
    """List and create companies (Master Admin only)"""
    serializer_class = CompanyListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only master admins can see all companies
        if hasattr(self.request.user, 'master_admin'):
            return Company.objects.select_related('created_by', 'approved_by').prefetch_related('users', 'company_services__service')
        return Company.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CompanyCreateSerializer
        return CompanyListSerializer

    def create(self, request, *args, **kwargs):
        # Only master admins can create companies
        if not hasattr(request.user, 'master_admin'):
            raise permissions.PermissionDenied("Only master admins can create companies.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            company = serializer.save()

            # Log company creation
            log_security_event(
                request.user,
                'COMPANY_CREATED',
                request,
                f'Created company: {company.name}'
            )

            # Create notification for company user about registration
            company_user = company.users.first()
            if company_user:
                Notification.objects.create(
                    recipient=company_user.user,
                    sender=request.user,
                    notification_type='company_registration',
                    priority='high',
                    title='Welcome to ᗩTᕼᙓᑎᗩ\'𝔖',
                    message=f'Your company {company.name} has been registered. Please complete your profile information.',
                    company_id=company.id
                )

        # Get the company user for credentials
        company_user = company.users.first()
        user_email = company_user.user.email if company_user else None
        
        # Prepare response with company credentials
        response_data = {
            'message': 'Company created successfully.',
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'approval_status': company.approval_status
            },
            'user_credentials': {
                'email': user_email,
                'password': serializer.validated_data.get('user_password')
            }
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


class CompanyDetailView(RetrieveUpdateDestroyAPIView):
    """Company detail view with delete functionality"""
    serializer_class = CompanyDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'master_admin'):
            return Company.objects.all()
        elif hasattr(self.request.user, 'company_user'):
            return Company.objects.filter(id=self.request.user.company_user.company.id)
        return Company.objects.none()
    
    def update(self, request, *args, **kwargs):
        """Update company with service management"""
        # Only master admins can update companies
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can update companies.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        
        # Handle services update if provided
        services_data = request.data.get('services')
        if services_data is not None:
            with transaction.atomic():
                # Get current service IDs
                current_service_ids = set(
                    instance.company_services.filter(is_active=True).values_list('service_id', flat=True)
                )
                
                # Get new service IDs from request
                new_service_ids = set(services_data)
                
                # Services to add
                services_to_add = new_service_ids - current_service_ids
                # Services to remove
                services_to_remove = current_service_ids - new_service_ids
                
                # Add new services
                for service_id in services_to_add:
                    try:
                        service = Service.objects.get(id=service_id, is_active=True)
                        CompanyService.objects.create(
                            company=instance,
                            service=service,
                            assigned_by=request.user,
                            service_password=''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12)),
                            password_expires_at=timezone.now() + timedelta(days=365)
                        )
                    except Service.DoesNotExist:
                        continue
                
                # Remove services
                instance.company_services.filter(
                    service_id__in=services_to_remove
                ).update(is_active=False)
        
        # Update other company fields
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

    def perform_destroy(self, instance):
        """Company deletion with proper cascade handling"""
        if not hasattr(self.request.user, 'master_admin'):
            raise PermissionDenied("Only master admins can delete companies")
        
        try:
            with transaction.atomic():
                # First, clean up all FK references to CompanyServiceUser to avoid constraint violations.
                service_user_ids = list(instance.service_users.values_list('id', flat=True))
                if service_user_ids:
                    from django.apps import apps
                    from django.db import models
                    from django.db import connection
                    
                    # Handle Athens project references specifically
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "UPDATE athens_project SET created_by_id = NULL WHERE created_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project SET approved_by_id = NULL WHERE approved_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_admin SET created_by_id = NULL WHERE created_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_admin SET approved_by_id = NULL WHERE approved_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_admin SET service_user_id = NULL WHERE service_user_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_user SET created_by_id = NULL WHERE created_by_id = ANY(%s)",
                            [service_user_ids]
                        )
                        cursor.execute(
                            "UPDATE athens_project_user SET service_user_id = NULL WHERE service_user_id = ANY(%s)",
                            [service_user_ids]
                        )
                    
                    # Handle other models with FK references
                    for model in apps.get_models():
                        for field in model._meta.get_fields():
                            if not isinstance(field, models.ForeignKey):
                                continue
                            if field.remote_field.model != CompanyServiceUser:
                                continue
                            fk_name = field.name
                            
                            # Check if table exists before querying
                            table_name = model._meta.db_table
                            try:
                                with connection.cursor() as cursor:
                                    cursor.execute(
                                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s)",
                                        [table_name]
                                    )
                                    table_exists = cursor.fetchone()[0]
                                    
                                if not table_exists:
                                    continue
                                    
                                qs = model.objects.filter(**{f"{fk_name}__in": service_user_ids})
                                if not qs.exists():
                                    continue
                                    
                                if field.null:
                                    qs.update(**{fk_name: None})
                                else:
                                    qs.delete()
                                    
                            except Exception as e:
                                # Skip models with missing tables or other DB issues
                                print(f'⚠️ Skipping model {model._meta.label} due to error: {str(e)}')
                                continue
                
                # Now delete the company - Django will handle the rest
                instance.delete()
                
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f'🔍 COMPANY DELETE ERROR: {str(e)}')
            print(f'🔍 FULL TRACEBACK: {error_details}')
            raise Exception(f'Failed to delete company: {str(e)}')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except Exception as e:
            logging.getLogger(__name__).exception(
                "Company delete failed",
                extra={"company_id": getattr(instance, "id", None)},
            )
            return Response(
                {"error": "Failed to delete company", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_204_NO_CONTENT)




class CompanyDetailedInfoView(APIView):
    """Company detailed information submission with document upload"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, company_id):
        # Only company users can update their own company info
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can update company information.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        if company_user.company.id != company_id:
            return Response(
                {'error': 'You can only update your own company information.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company = company_user.company
        
        # Handle file uploads
        uploaded_files = {}
        for key, file in request.FILES.items():
            if file:
                # Save file with secure naming
                import os
                from django.core.files.storage import default_storage
                
                # Create secure filename
                timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
                filename = f"company_{company.id}_{key}_{timestamp}_{file.name}"
                
                # Save file
                file_path = default_storage.save(f"company_documents/{filename}", file)
                uploaded_files[key] = file_path
        
        # Prepare data for serializer (exclude files from form_data)
        form_data = {}
        for key, value in request.data.items():
            if key not in request.FILES:
                form_data[key] = value
        
        if uploaded_files:
            form_data['uploaded_documents'] = uploaded_files
        
        serializer = CompanyDetailedInfoSerializer(company, data=form_data, partial=True)

        if serializer.is_valid():
            with transaction.atomic():
                updated_company = serializer.save()
                
                # Store document paths in company model if needed
                if uploaded_files:
                    # You can add a JSONField to Company model to store document paths
                    # For now, we'll store in special_requirements as a JSON string
                    import json
                    existing_docs = {}
                    if company.special_requirements:
                        try:
                            existing_docs = json.loads(company.special_requirements)
                        except:
                            existing_docs = {}
                    
                    if 'documents' not in existing_docs:
                        existing_docs['documents'] = {}
                    
                    existing_docs['documents'].update(uploaded_files)
                    company.special_requirements = json.dumps(existing_docs)
                    company.save()

                # Mark first login as completed
                if not company_user.first_login_completed:
                    company_user.first_login_completed = True
                    company_user.first_login_at = timezone.now()
                    company_user.save()

                # Create notification for master admin
                master_admins = User.objects.filter(master_admin__isnull=False)
                for admin in master_admins:
                    Notification.objects.create(
                        recipient=admin,
                        sender=request.user,
                        notification_type='company_registration',
                        priority='high',
                        title='Company Information Submitted',
                        message=f'{company.name} has submitted their detailed information for approval.',
                        company_id=company.id,
                        metadata={
                            'company_name': company.name,
                            'company_email': company.email,
                            'submitted_by': request.user.email
                        }
                    )

                # Log the event
                log_security_event(
                    request.user,
                    'COMPANY_INFO_SUBMITTED',
                    request,
                    f'Submitted detailed info for company: {company.name}'
                )

                return Response({
                    'message': 'Company information submitted successfully. Awaiting approval.',
                    'company': CompanyDetailSerializer(updated_company).data
                })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompanyApprovalView(APIView):
    """Company approval endpoint (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id):
        # Only master admins can approve companies
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can approve companies.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company = get_object_or_404(Company, id=company_id)
        action = request.data.get('action')  # 'approve' or 'reject'

        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Action must be either "approve" or "reject".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            if action == 'approve':
                company.approval_status = 'approved'
                company.approved_by = request.user
                company.approved_at = timezone.now()
                message = f'Your company {company.name} has been approved! You can now access your dashboard.'
                notification_type = 'company_approval'
            else:
                company.approval_status = 'rejected'
                message = f'Your company {company.name} registration has been rejected. Please contact support for more information.'
                notification_type = 'company_rejection'

            company.save()

            # Notify company users
            company_users = company.users.all()
            for company_user in company_users:
                Notification.objects.create(
                    recipient=company_user.user,
                    sender=request.user,
                    notification_type=notification_type,
                    priority='high',
                    title=f'Company {action.title()}d',
                    message=message,
                    company_id=company.id
                )

            # Log the event
            log_security_event(
                request.user,
                'COMPANY_APPROVED' if action == 'approve' else 'COMPANY_REJECTED',
                request,
                f'{action.title()}d company: {company.name}'
            )

            return Response({
                'message': f'Company {action}d successfully.',
                'company': CompanyDetailSerializer(company).data
            })


@method_decorator(csrf_exempt, name='dispatch')
class CompanyUserLoginView(APIView):
    """Company user login endpoint"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = FastCompanyUserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            company_user = user.company_user
            
            # Check IP restrictions FIRST
            from company_dashboard.ip_restriction_views import is_ip_allowed
            if not is_ip_allowed(company_user.company, get_client_ip(request)):
                # Log blocked IP attempt
                log_security_event(user, 'LOGIN_FAILED', request, 'IP address not authorized')
                return Response({
                    'error': 'Access denied from this IP address. Please contact your administrator.',
                    'ip_blocked': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if 2FA is required
            requires_2fa = serializer.validated_data.get('requires_2fa', False)
            if requires_2fa is True:
                return Response({
                    'requires_2fa': True,
                    'message': '2FA code required',
                    'user_id': user.id
                })
            
            company_user = user.company_user

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            # Update login info
            company_user.last_login_at = timezone.now()
            company_user.last_login_ip = get_client_ip(request)
            company_user.login_attempts = 0
            company_user.save()

            # Create session for Active Sessions tracking
            from company_dashboard.security_models import CompanyUserSession
            from user_agents import parse
            import secrets
            import string
            
            # Generate session key
            session_key = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(40))
            
            # Parse user agent
            user_agent_string = request.META.get('HTTP_USER_AGENT', '')
            user_agent = parse(user_agent_string)
            
            # Create session
            CompanyUserSession.objects.create(
                user=company_user,
                session_key=session_key,
                device_type='mobile' if user_agent.is_mobile else 'desktop',
                browser=f"{user_agent.browser.family} {user_agent.browser.version_string}",
                os=f"{user_agent.os.family} {user_agent.os.version_string}",
                ip_address=get_client_ip(request),
                user_agent=user_agent_string,
                is_current=True,
                expires_at=timezone.now() + timezone.timedelta(hours=24)
            )
            
            # Queue background security tasks (non-blocking) - optional if Redis unavailable
            try:
                from .async_security_tasks import (
                    send_company_login_alert_async,
                    update_device_fingerprint_async,
                    run_threat_detection_async
                )
                
                # Prepare request data for async tasks
                request_data = {
                    'META': dict(request.META),
                    'ip_address': get_client_ip(request)
                }
                
                # Queue async tasks (immediate return)
                device_info = f"{user_agent.browser.family} on {user_agent.os.family}"
                send_company_login_alert_async.delay(
                    company_user.company.id, user.email, get_client_ip(request), device_info
                )
                update_device_fingerprint_async.delay(
                    company_user.id, 'company_user', request_data
                )
                run_threat_detection_async.delay(
                    company_user.company.id, user.email, get_client_ip(request),
                    request.META.get('HTTP_USER_AGENT', ''), True
                )
            except Exception as e:
                # Fallback: continue without async tasks if Redis/Celery unavailable
                print(f'⚠️ Async tasks unavailable: {e}')
            
            # Only keep critical security checks (fast operations)
            from company_dashboard.geolocation_views import check_geolocation_access
            try:
                # Quick geolocation check (cached results)
                geo_result = check_geolocation_access(
                    company_user.company,
                    get_client_ip(request),
                    user.email
                )
                
                if not geo_result['allowed']:
                    return Response({
                        'error': f'Access denied from location. Contact administrator.',
                        'location_blocked': True
                    }, status=status.HTTP_403_FORBIDDEN)
                
                if geo_result['requires_2fa']:
                    return Response({
                        'requires_2fa': True,
                        'message': '2FA required for this location',
                        'user_id': user.id,
                        'geolocation_2fa': True
                    })
                    
            except Exception as e:
                print(f'🌍 GEOLOCATION ERROR: {str(e)}')
            
            # Quick security log (essential only)
            from company_dashboard.security_models import CompanySecurityLog
            CompanySecurityLog.objects.create(
                company=company_user.company,
                user_email=user.email,
                action='login',
                ip_address=get_client_ip(request),
                success=True,
                details='Login successful'
            )
            
            # Log successful login
            log_security_event(user, 'LOGIN_SUCCESS', request, 'Company user login')

            # Get full logo URL
            logo_url = None
            if company_user.company.logo:
                logo_url = request.build_absolute_uri(company_user.company.logo.url)

            response_data = {
                'access': str(access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'company_id': company_user.company.id,
                    'company_name': company_user.company.name,
                    'company_logo': logo_url,
                    'is_company_user': True
                },
                'must_change_password': company_user.must_change_password
            }

            # Check if first login is required
            if serializer.validated_data.get('first_login_required'):
                response_data['first_login_required'] = True
                print(f'🔍 DEBUG: Setting first_login_required=True for user {user.email}')
            elif serializer.validated_data.get('approval_pending'):
                response_data['approval_pending'] = True
                response_data['approval_status'] = company_user.company.approval_status
                print(f'🔍 DEBUG: Setting approval_pending=True for user {user.email}')
            elif serializer.validated_data.get('force_password_reset'):
                response_data['force_password_reset'] = True
                print(f'🔍 DEBUG: Setting force_password_reset=True for user {user.email}')
            else:
                print(f'🔍 DEBUG: No special flags set for user {user.email}')
                print(f'🔍 DEBUG: Company status: {company_user.company.approval_status}')
                print(f'🔍 DEBUG: First login completed: {company_user.first_login_completed}')

            print(f'🔍 DEBUG: Final response_data: {response_data}')
            return Response(response_data)

        # Log failed login attempt and return attempt info
        email = request.data.get('email')
        if email:
            try:
                user = User.objects.get(email=email)
                if hasattr(user, 'company_user'):
                    company_user = user.company_user
                else:
                    return Response({'error': 'Login failed. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)
                company_user.login_attempts += 1
                
                max_attempts = 5
                remaining_attempts = max_attempts - company_user.login_attempts
                
                if company_user.login_attempts >= max_attempts:
                    company_user.is_locked = True
                    company_user.locked_until = timezone.now() + timezone.timedelta(minutes=30)
                    
                company_user.save()
                # AI-Enhanced Threat Detection for failed login
                from company_dashboard.threat_detection_engine import threat_monitor
                from company_dashboard.security_models import CompanySecurityLog
                try:
                    threats = threat_monitor.monitor_login_attempt(
                        company_user.company,
                        user.email,
                        get_client_ip(request),
                        request.META.get('HTTP_USER_AGENT', ''),
                        success=False
                    )
                    if threats:
                        print(f'🔍 THREAT DETECTION: {len(threats)} threats detected for failed login {user.email}')
                    
                    # Log failed login to Company Security Log
                    CompanySecurityLog.objects.create(
                        company=company_user.company,
                        user_email=user.email,
                        action='failed_login',
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        success=False,
                        details=f'Failed login attempt - {remaining_attempts} attempts remaining'
                    )
                except Exception as e:
                    print(f'🔍 THREAT DETECTION ERROR: {str(e)}')
                
                # Device Fingerprinting for failed attempts
                try:
                    from company_dashboard.device_management_views import DeviceManagementView
                    device_view = DeviceManagementView()
                    
                    user_agent_string = request.META.get('HTTP_USER_AGENT', '')
                    fingerprint_data = {
                        'userAgent': user_agent_string,
                        'screen': '',
                        'timezone': '',
                        'language': request.META.get('HTTP_ACCEPT_LANGUAGE', '').split(',')[0] if request.META.get('HTTP_ACCEPT_LANGUAGE') else '',
                        'platform': ''
                    }
                    
                    device_view._register_device_fingerprint(company_user, fingerprint_data, get_client_ip(request), failed_attempt=True)
                except Exception as e:
                    print(f'📱 Device fingerprinting error (failed login): {str(e)}')
                
                log_security_event(user, 'LOGIN_FAILED', request, 'Failed company user login')
                
                # Return detailed error with attempt info
                if company_user.is_locked:
                    return Response({
                        'error': 'Account locked due to too many failed attempts. Try again in 30 minutes.',
                        'locked': True,
                        'locked_until': company_user.locked_until.isoformat() if company_user.locked_until else None
                    }, status=status.HTTP_423_LOCKED)
                else:
                    return Response({
                        'error': f'Login failed. {remaining_attempts} attempts remaining.',
                        'attempts_remaining': remaining_attempts,
                        'max_attempts': max_attempts
                    }, status=status.HTTP_401_UNAUTHORIZED)
                    
            except (User.DoesNotExist, CompanyUser.DoesNotExist):
                pass

        return Response({'error': 'Login failed. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)


class CompanyServicesView(ListAPIView):
    """List company services"""
    serializer_class = CompanyServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
            if company.approval_status == 'approved':
                return CompanyService.objects.filter(company=company, is_active=True)
        return CompanyService.objects.none()


class CompanyAssignedServicesView(ListAPIView):
    """List services assigned to company (for service selection)"""
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'company_user'):
            company = self.request.user.company_user.company
            if company.approval_status == 'approved':
                # Get service IDs that are assigned to this company
                assigned_service_ids = CompanyService.objects.filter(
                    company=company,
                    is_active=True
                ).values_list('service_id', flat=True)

                # Return the actual Service objects with ordering
                return Service.objects.filter(id__in=assigned_service_ids, is_active=True).order_by('name')
        return Service.objects.none()


class ServiceAccessView(APIView):
    """Service access with password verification"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, service_id):
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can access services.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        if company.approval_status != 'approved':
            return Response(
                {'error': 'Company must be approved to access services.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get company service
        try:
            company_service = CompanyService.objects.get(
                company=company,
                service_id=service_id,
                is_active=True
            )
        except CompanyService.DoesNotExist:
            return Response(
                {'error': 'Service not assigned to your company.'},
                status=status.HTTP_404_NOT_FOUND
            )

        password = request.data.get('password')
        if not password:
            return Response(
                {'error': 'Service password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify service password
        if check_password(password, company_service.service_password):
            # Log successful service access
            log_security_event(
                request.user,
                'SERVICE_ACCESS',
                request,
                f'Accessed service: {company_service.service.name}'
            )

            return Response({
                'message': 'Service access granted.',
                'service': {
                    'id': company_service.service.id,
                    'name': company_service.service.name,
                    'service_type': company_service.service.service_type,
                    'description': company_service.service.description
                }
            })
        else:
            # Log failed service access
            log_security_event(
                request.user,
                'SERVICE_ACCESS_FAILED',
                request,
                f'Failed access to service: {company_service.service.name}'
            )

            return Response(
                {'error': 'Invalid service password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class ServicePasswordChangeView(APIView):
    """Change service password"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, service_id):
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can change service passwords.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Get company service
        try:
            company_service = CompanyService.objects.get(
                company=company,
                service_id=service_id,
                is_active=True
            )
        except CompanyService.DoesNotExist:
            return Response(
                {'error': 'Service not assigned to your company.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ServicePasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            current_password = serializer.validated_data['current_password']
            new_password = serializer.validated_data['new_password']

            # Verify current password
            if check_password(current_password, company_service.service_password):
                # Update password
                company_service.service_password = make_password(new_password)
                company_service.password_changed_at = timezone.now()
                company_service.save()

                # Log password change
                log_security_event(
                    request.user,
                    'PASSWORD_CHANGED',
                    request,
                    f'Changed password for service: {company_service.service.name}'
                )

                return Response({'message': 'Service password changed successfully.'})
            else:
                return Response(
                    {'error': 'Current password is incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MasterAdminPasswordChangeView(APIView):
    """Master Admin password change endpoint"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can change their password.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = MasterAdminPasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            current_password = serializer.validated_data['current_password']
            new_password = serializer.validated_data['new_password']

            # Verify current password
            if check_password(current_password, request.user.password):
                # Update password
                request.user.set_password(new_password)
                request.user.save()

                # Update master admin password expiration
                master_admin = request.user.master_admin
                master_admin.password_expires_at = timezone.now() + timezone.timedelta(days=90)
                master_admin.save()

                # Log password change
                log_security_event(
                    request.user,
                    'PASSWORD_CHANGED',
                    request,
                    'Master admin password changed'
                )

                return Response({'message': 'Password changed successfully.'})
            else:
                return Response(
                    {'error': 'Current password is incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MasterAdminProfileView(RetrieveUpdateAPIView):
    """Master Admin profile view"""
    serializer_class = MasterAdminProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if not hasattr(self.request.user, 'master_admin'):
            raise permissions.PermissionDenied("Only master admins can access this endpoint.")
        return self.request.user.master_admin


class SecurityLogView(ListAPIView):
    """Security log view (Master Admin only)"""
    serializer_class = SecurityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'master_admin'):
            return SecurityLog.objects.all()
        return SecurityLog.objects.none()


class ValidateTokenView(APIView):
    """Validate JWT token endpoint"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Validate the current token and return user info"""
        try:
            user = request.user
            user_data = {
                'id': user.id,
                'email': user.email,
                'is_master_admin': hasattr(user, 'master_admin'),
                'is_company_user': hasattr(user, 'company_user'),
            }

            # Add additional user-specific data
            if hasattr(user, 'master_admin'):
                master_admin = user.master_admin
                user_data.update({
                    'company_name': master_admin.company_name,
                    'role': 'master_admin'
                })
            elif hasattr(user, 'company_user'):
                company_user = user.company_user
                # Get full logo URL
                logo_url = None
                if company_user.company and company_user.company.logo:
                    logo_url = request.build_absolute_uri(company_user.company.logo.url)

                user_data.update({
                    'role': 'company_user',
                    'company_id': company_user.company.id if company_user.company else None,
                    'company_name': company_user.company.name if company_user.company else None,
                    'company_logo': logo_url,
                })

            return Response({
                'valid': True,
                'user': user_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"🔍 DEBUG: Token validation error: {str(e)}")
            return Response({
                'valid': False,
                'error': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)


class RequestServiceAccessView(APIView):
    """Company users request access to services"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Only company users can request service access
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can request service access.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Check if company is approved
        if company.approval_status != 'approved':
            return Response(
                {'error': 'Company must be approved before requesting service access.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service_ids = request.data.get('service_ids', [])
        if not service_ids:
            return Response(
                {'error': 'Please select at least one service.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Get services
                services = Service.objects.filter(id__in=service_ids, is_active=True)
                if not services.exists():
                    return Response(
                        {'error': 'No valid services found.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Create CompanyService records
                created_services = []
                for service in services:
                    company_service, created = CompanyService.objects.get_or_create(
                        company=company,
                        service=service,
                        defaults={'assigned_by': request.user}
                    )
                    if created:
                        created_services.append(service.name)

                # Log the event
                log_security_event(
                    request.user,
                    'SERVICE_ACCESS_REQUESTED',
                    request,
                    f'Requested access to services: {", ".join(created_services)}'
                )

                return Response({
                    'message': f'Access requested for {len(created_services)} services successfully.',
                    'services': created_services
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to request service access: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CompanyServiceCredentialsView(APIView):
    """Get service credentials for a company (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, company_id):
        # Only master admins can access service credentials
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can access service credentials.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get company services
        company_services = CompanyService.objects.filter(
            company=company,
            is_active=True
        ).select_related('service')

        # Note: We cannot retrieve plain text passwords as they are hashed
        # This endpoint provides information about services but not passwords
        services_info = []
        for cs in company_services:
            services_info.append({
                'service_id': cs.service.id,
                'service_name': cs.service.name,
                'service_type': cs.service.service_type,
                'assigned_at': cs.assigned_at.isoformat(),
                'password_expires_at': cs.password_expires_at.isoformat(),
                'password_changed_at': cs.password_changed_at.isoformat(),
                'note': 'Password is hashed and cannot be retrieved. Use reset functionality if needed.'
            })

        return Response({
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email
            },
            'services': services_info,
            'message': 'Service passwords are hashed and cannot be retrieved. Use the reset password functionality to generate new passwords.'
        })

    def post(self, request, company_id):
        """Reset service passwords for a company"""
        # Only master admins can reset service passwords
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can reset service passwords.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get company services
        company_services = CompanyService.objects.filter(
            company=company,
            is_active=True
        ).select_related('service')

        if not company_services.exists():
            return Response(
                {'error': 'No active services found for this company.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate new passwords
        service_credentials = []
        for cs in company_services:
            # Generate new password
            new_password = self._generate_service_password()

            # Update the service password
            cs.service_password = make_password(new_password)
            cs.password_changed_at = timezone.now()
            cs.password_expires_at = timezone.now() + timezone.timedelta(days=90)
            cs.save()

            # Get service users for this service to include unique_service_id
            service_users = CompanyServiceUser.objects.filter(
                company=company,
                service=cs.service,
                is_active=True
            )
            
            unique_service_ids = [su.unique_service_id for su in service_users] if service_users.exists() else ['N/A']

            service_credentials.append({
                'service_id': cs.service.id,
                'service_name': cs.service.name,
                'service_type': cs.service.service_type,
                'password': new_password,
                'unique_service_ids': unique_service_ids
            })

        # Log security event
        log_security_event(
            request.user,
            'SERVICE_PASSWORDS_RESET',
            request,
            f'Reset service passwords for company: {company.name}'
        )

        return Response({
            'message': 'Service passwords reset successfully.',
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email
            },
            'service_credentials': service_credentials
        })

    def _generate_service_password(self, length=12):
        """Generate secure service password"""
        import string
        import secrets
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))


# Service User Views
class ServiceUserLoginView(APIView):
    """Service User login endpoint"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .serializers import ServiceUserLoginSerializer

        serializer = ServiceUserLoginSerializer(data=request.data)
        if serializer.is_valid():
            service_user = serializer.validated_data['service_user']

            # Update login info
            service_user.last_login = timezone.now()
            service_user.login_count += 1
            service_user.save()

            # Create session with expiry
            from .models import ServiceUserSession
            session_key = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(40))
            ServiceUserSession.objects.create(
                service_user=service_user,
                session_key=session_key,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                expires_at=timezone.now() + timedelta(hours=8)
            )

            return Response({
                'session_key': session_key,
                'user': {
                    'id': service_user.id,
                    'username': service_user.username,
                    'email': service_user.email,
                    'full_name': service_user.full_name,
                    'role': service_user.role,
                    'service_name': service_user.service.name,
                    'service_type': service_user.service.service_type,
                    'company_id': service_user.company.id,
                    'company_name': service_user.company.name,
                    'must_change_password': service_user.must_change_password,
                    'is_password_expired': service_user.is_password_expired()
                }
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ServiceUserLogoutView(APIView):
    """Service User logout endpoint"""
    authentication_classes = []  # Disable authentication for logout
    permission_classes = [permissions.AllowAny]  # Allow any user to logout

    def post(self, request):
        session_key = request.data.get('session_key')
        if session_key:
            from .models import ServiceUserSession
            try:
                session = ServiceUserSession.objects.get(
                    session_key=session_key,
                    is_active=True
                )
                session.logout_time = timezone.now()
                session.is_active = False
                session.save()

                return Response({'message': 'Logged out successfully'})
            except ServiceUserSession.DoesNotExist:
                # Even if session doesn't exist, return success for security
                return Response({'message': 'Logged out successfully'})

        return Response({'message': 'Logged out successfully'})  # Always return success for logout


class CompanyServiceUserListCreateView(ListCreateAPIView):
    """List and create service users for a company"""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            from .serializers import CompanyServiceUserCreateSerializer
            return CompanyServiceUserCreateSerializer
        from .serializers import CompanyServiceUserSerializer
        return CompanyServiceUserSerializer

    def get_queryset(self):
        # Only company users can access this
        if not hasattr(self.request.user, 'company_user'):
            return CompanyServiceUser.objects.none()

        company = self.request.user.company_user.company
        return CompanyServiceUser.objects.filter(company=company, is_active=True).select_related(
            'service', 'company', 'created_by'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        service_user = serializer.save()

        # Return credentials in response
        if hasattr(service_user, '_plain_password'):
            self.created_credentials = {
                'username': service_user.username,
                'unique_service_id': service_user.unique_service_id,
                'password': service_user._plain_password
            }

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        # Add credentials to response
        if hasattr(self, 'created_credentials'):
            response.data['credentials'] = self.created_credentials

        return response


class CompanyServiceUserDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a service user"""
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'put', 'patch', 'delete', 'post', 'head', 'options']

    def get_serializer_class(self):
        from .serializers import CompanyServiceUserSerializer
        return CompanyServiceUserSerializer

    def get_queryset(self):
        # Only company users can access this
        if not hasattr(self.request.user, 'company_user'):
            return CompanyServiceUser.objects.none()

        company = self.request.user.company_user.company
        return CompanyServiceUser.objects.filter(company=company, is_active=True).select_related(
            'service', 'company', 'created_by'
        )
    

    def post(self, request, *args, **kwargs):
        """Reset password for a service user"""
        if request.data.get('action') != 'reset_password':
            return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)

        instance = self.get_object()
        new_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

        instance.password = make_password(new_password)
        instance.must_change_password = True
        instance.password_changed_at = timezone.now()
        instance.password_expires_at = timezone.now() + timedelta(days=90)
        instance.save(update_fields=['password', 'must_change_password', 'password_changed_at', 'password_expires_at', 'updated_at'])

        ServiceUserSession.objects.filter(service_user=instance, is_active=True).update(
            is_active=False,
            revoked_at=timezone.now(),
        )

        log_security_event(
            request.user,
            'PASSWORD_CHANGED',
            request,
            f'Admin reset password for service user: {instance.username} ({instance.service.name})'
        )

        return Response({
            'message': 'Password reset successfully.',
            'username': instance.username,
            'unique_service_id': instance.unique_service_id,
            'new_password': new_password,
        }, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        """Custom delete logic to handle foreign key constraints"""
        from django.db import transaction
        
        try:
            with transaction.atomic():
                instance.is_active = False
                instance.save(update_fields=['is_active', 'updated_at'])
                ServiceUserSession.objects.filter(
                    service_user=instance,
                    is_active=True,
                ).update(
                    is_active=False,
                    revoked_at=timezone.now(),
                    logout_time=timezone.now(),
                )
                
                # Log the deletion
                log_security_event(
                    self.request.user,
                    'USER_DELETED',
                    self.request,
                    f'Deactivated service user: {instance.username} ({instance.service.name})'
                )
                
        except Exception as e:
            # Log the error for debugging
            print(f'🔍 DEBUG: Error deleting service user {instance.id}: {str(e)}')
            raise
    
    def _handle_athens_project_references(self, service_user):
        """Handle references from Athens project tables before deletion"""
        from django.db import connection
        
        # Get all Athens project references
        cursor = connection.cursor()
        
        # Update athens_project records to set created_by_id to NULL
        cursor.execute(
            "UPDATE athens_project SET created_by_id = NULL WHERE created_by_id = %s",
            [service_user.id]
        )
        
        # Update athens_project records to set approved_by_id to NULL
        cursor.execute(
            "UPDATE athens_project SET approved_by_id = NULL WHERE approved_by_id = %s",
            [service_user.id]
        )
        
        # Update athens_project_admin records
        cursor.execute(
            "UPDATE athens_project_admin SET created_by_id = NULL WHERE created_by_id = %s",
            [service_user.id]
        )
        cursor.execute(
            "UPDATE athens_project_admin SET approved_by_id = NULL WHERE approved_by_id = %s",
            [service_user.id]
        )
        cursor.execute(
            "UPDATE athens_project_admin SET service_user_id = NULL WHERE service_user_id = %s",
            [service_user.id]
        )
        
        # Update athens_project_user records
        cursor.execute(
            "UPDATE athens_project_user SET created_by_id = NULL WHERE created_by_id = %s",
            [service_user.id]
        )
        cursor.execute(
            "UPDATE athens_project_user SET service_user_id = NULL WHERE service_user_id = %s",
            [service_user.id]
        )
        
        print(f'🔍 DEBUG: Updated Athens project references for service user {service_user.id}')


class ServiceUserPasswordChangeView(APIView):
    """Change service user password"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .serializers import ServiceUserPasswordChangeSerializer

        # Get service user from session
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .models import ServiceUserSession
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Add service user to request for validation
            request.service_user = service_user

            serializer = ServiceUserPasswordChangeSerializer(
                data=request.data,
                context={'request': request}
            )

            if serializer.is_valid():
                # Update password
                new_password = serializer.validated_data['new_password']
                service_user.password = make_password(new_password)
                service_user.password_changed_at = timezone.now()
                service_user.password_expires_at = timezone.now() + timedelta(days=90)
                service_user.must_change_password = False
                service_user.save()

                return Response({'message': 'Password changed successfully'})

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_400_BAD_REQUEST)


class ServiceUserCompanyView(APIView):
    """Get company data for service users"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]

    def get(self, request, company_id):
        # Try to get session key from Authorization header first, then from query params
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.GET.get('session_key')

        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            from .models import ServiceUserSession
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Check if the requested company ID matches the service user's company
            if service_user.company.id != company_id:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

            # Return company data
            company = service_user.company
            logo_url = None
            if company.logo:
                logo_url = request.build_absolute_uri(company.logo.url)

            return Response({
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'phone': company.phone,
                'address': company.address,
                'logo': logo_url,
                'business_type': company.business_type,
                'industry': company.industry,
                'website': company.website,
                'gst_number': company.gst_number,
                'tax_id': company.tax_id,
                'registration_number': company.registration_number,
            })

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class CompanyProfileView(APIView):
    """Get company profile for service users"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Try to get session key from Authorization header first, then from query params
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.GET.get('session_key')

        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            from .models import ServiceUserSession
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user
            company = service_user.company

            # Return company data
            logo_url = None
            if company.logo:
                logo_url = request.build_absolute_uri(company.logo.url)

            return Response({
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'phone': company.phone,
                'address': company.address,
                'logo': logo_url,
                'business_type': company.business_type,
                'industry': company.industry,
                'website': company.website,
                'gst_number': company.gst_number,
                'tax_id': company.tax_id,
                'registration_number': company.registration_number,
            })

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class CompanyDetailsView(APIView):
    """Company details view and edit for company users"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get company details for the authenticated company user"""
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can access company details.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Return company data
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        return Response({
            'id': company.id,
            'name': company.name,
            'email': company.email,
            'phone': company.phone,
            'address': company.address,
            'logo': logo_url,
            'business_type': company.business_type,
            'industry': company.industry,
            'employee_count': company.employee_count,
            'annual_revenue': company.annual_revenue,
            'website': company.website,
            'gst_number': company.gst_number,
            'pan_number': company.pan_number,
            'registration_number': company.registration_number,
            'contact_person_name': company.contact_person_name,
            'contact_person_title': company.contact_person_title,
            'contact_person_email': company.contact_person_email,
            'contact_person_phone': company.contact_person_phone,
            'description': company.description,
            'domain_name': company.domain_name,
            'bank_name': company.bank_name,
            'bank_account_number': company.bank_account_number,
            'bank_ifsc_code': company.bank_ifsc_code,
            'bank_branch': company.bank_branch,
            'bank_account_holder': company.bank_account_holder,
            'bank_account_type': company.bank_account_type,
            'approval_status': company.approval_status,
            'created_at': company.created_at.isoformat() if company.created_at else None,
            'updated_at': company.updated_at.isoformat() if company.updated_at else None,
        })

    def put(self, request):
        """Update company details"""
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can update company details.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Fields that can be updated by company users
        updatable_fields = [
            'phone', 'address', 'business_type', 'industry', 'employee_count',
            'annual_revenue', 'website', 'gst_number', 'pan_number',
            'registration_number', 'contact_person_name', 'contact_person_title',
            'contact_person_email', 'contact_person_phone', 'description', 'domain_name',
            'bank_name', 'bank_account_number', 'bank_ifsc_code',
            'bank_branch', 'bank_account_holder', 'bank_account_type',
        ]

        # Update only the provided fields
        updated_fields = []
        for field in updatable_fields:
            if field in request.data:
                old_value = getattr(company, field)
                new_value = request.data[field]
                if old_value != new_value:
                    setattr(company, field, new_value)
                    updated_fields.append(field)

        if updated_fields:
            company.save()
            
            # Log the update
            log_security_event(
                request.user,
                'COMPANY_DETAILS_UPDATED',
                request,
                f'Updated company details: {", ".join(updated_fields)}'
            )

        # Return updated company data
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        return Response({
            'message': 'Company details updated successfully.',
            'updated_fields': updated_fields,
            'company': {
                'id': company.id,
                'name': company.name,
                'email': company.email,
                'phone': company.phone,
                'address': company.address,
                'logo': logo_url,
                'business_type': company.business_type,
                'industry': company.industry,
                'employee_count': company.employee_count,
                'annual_revenue': company.annual_revenue,
                'website': company.website,
                'gst_number': company.gst_number,
                'pan_number': company.pan_number,
                'registration_number': company.registration_number,
                'contact_person_name': company.contact_person_name,
                'contact_person_title': company.contact_person_title,
                'contact_person_email': company.contact_person_email,
                'contact_person_phone': company.contact_person_phone,
                'description': company.description,
                'domain_name': company.domain_name,
                'bank_name': company.bank_name,
                'bank_account_number': company.bank_account_number,
                'bank_ifsc_code': company.bank_ifsc_code,
                'bank_branch': company.bank_branch,
                'bank_account_holder': company.bank_account_holder,
                'bank_account_type': company.bank_account_type,
                'approval_status': company.approval_status,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'updated_at': company.updated_at.isoformat() if company.updated_at else None,
            }
        })


class CompanyLogoUpdateView(APIView):
    """Update company logo"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print(f'🔍 DEBUG: Logo upload request from user: {request.user.email}')

        try:
            # Check if user has company_user relationship
            if not hasattr(request.user, 'company_user'):
                return Response({'error': 'User is not associated with a company'}, status=status.HTTP_400_BAD_REQUEST)

            # Get the company user
            company_user = request.user.company_user
            company = company_user.company

            # Check if logo file is provided
            if 'logo' not in request.FILES:
                return Response({'error': 'No logo file provided'}, status=status.HTTP_400_BAD_REQUEST)

            logo_file = request.FILES['logo']

            # Validate file size (5MB limit)
            if logo_file.size > 5 * 1024 * 1024:
                return Response({'error': 'File size too large. Maximum 5MB allowed.'}, status=status.HTTP_400_BAD_REQUEST)

            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
            if logo_file.content_type not in allowed_types:
                return Response({'error': 'Invalid file type. Only JPEG, PNG, and GIF are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

            # Update company logo
            company.logo = logo_file
            company.save()

            # Return updated user data with full logo URL
            logo_url = None
            if company.logo:
                logo_url = request.build_absolute_uri(company.logo.url)

            response_data = {
                'message': 'Logo updated successfully',
                'user': {
                    'id': request.user.id,
                    'email': request.user.email,
                    'company_id': company.id,
                    'company_name': company.name,
                    'company_logo': logo_url,
                    'is_company_user': True
                }
            }
            print(f'🔍 DEBUG: Logo uploaded successfully for {company.name}')
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f'🔍 DEBUG: Exception occurred: {str(e)}')
            import traceback
            traceback.print_exc()
            return Response({'error': f'Failed to update logo: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompanyPasswordResetView(APIView):
    """Reset company user password with enhanced security (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id):
        # Only master admins can reset company passwords
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can reset company passwords.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            company = Company.objects.get(id=company_id)
            company_user = company.users.first()
            
            if not company_user:
                return Response(
                    {'error': 'No company user found for this company.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            with transaction.atomic():
                # Generate new random password
                new_password = self._generate_secure_password()
                
                # Save current password to history before reset
                from company_dashboard.security_models import CompanyPasswordHistory
                CompanyPasswordHistory.objects.create(
                    user=company_user,
                    password_hash=company_user.user.password
                )
                
                # Update company user password
                company_user.user.set_password(new_password)
                company_user.user.save()
                
                # Enhanced security settings for admin reset
                company_user.must_change_password = True
                company_user.password_reset_by_admin = True
                company_user.password_changed_at = timezone.now()
                company_user.password_expires_at = timezone.now() + timezone.timedelta(days=90)
                company_user.save()
                
                # Terminate all active sessions for security
                from company_dashboard.security_models import CompanyUserSession
                CompanyUserSession.objects.filter(user=company_user).delete()
                
                # Enhanced security logging
                from company_dashboard.security_models import CompanySecurityLog
                CompanySecurityLog.objects.create(
                    company=company,
                    user_email=company_user.user.email,
                    action='password_change',
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True,
                    details=f'Password reset by master admin for company: {company.name}'
                )
                
                # Legacy security log for compatibility
                log_security_event(
                    request.user,
                    'PASSWORD_RESET',
                    request,
                    f'Reset password for company: {company.name}'
                )
                
                return Response({
                    'message': 'Password reset successfully with enhanced security.',
                    'company': {
                        'id': company.id,
                        'name': company.name,
                        'email': company.email
                    },
                    'credentials': {
                        'username': company_user.user.email,
                        'password': new_password
                    },
                    'security_actions': [
                        'Password saved to history',
                        'All active sessions terminated',
                        'Security audit log created',
                        'Password change required on next login'
                    ]
                })

        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to reset password: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_secure_password(self, length=12):
        """Generate secure random password"""
        import string
        import secrets
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    


class CompanyDetailsView(APIView):
    """Company details view and edit for company users"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get company details for the authenticated company user"""
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'Only company users can access company details.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_user = request.user.company_user
        company = company_user.company

        # Return company data
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        return Response({
            'id': company.id,
            'name': company.name,
            'email': company.email,
            'phone': company.phone,
            'address': company.address,
            'logo': logo_url,
            'business_type': company.business_type,
            'industry': company.industry,
            'employee_count': company.employee_count,
            'annual_revenue': company.annual_revenue,
            'website': company.website,
            'gst_number': company.gst_number,
            'pan_number': company.pan_number,
            'registration_number': company.registration_number,
            'contact_person_name': company.contact_person_name,
            'contact_person_title': company.contact_person_title,
            'contact_person_email': company.contact_person_email,
            'contact_person_phone': company.contact_person_phone,
            'description': company.description,
            'domain_name': company.domain_name,
            'bank_name': company.bank_name,
            'bank_account_number': company.bank_account_number,
            'bank_ifsc_code': company.bank_ifsc_code,
            'bank_branch': company.bank_branch,
            'bank_account_holder': company.bank_account_holder,
            'bank_account_type': company.bank_account_type,
            'approval_status': company.approval_status,
            'created_at': company.created_at.isoformat() if company.created_at else None,
            'updated_at': company.updated_at.isoformat() if company.updated_at else None,
        })

    def put(self, request):
        """Update company details"""
        try:
            if not hasattr(request.user, 'company_user'):
                return Response(
                    {'error': 'Only company users can update company details.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            company_user = request.user.company_user
            company = company_user.company

            # Fields that can be updated by company users
            updatable_fields = [
                'phone', 'address', 'business_type', 'industry', 'employee_count',
                'annual_revenue', 'website', 'gst_number', 'pan_number',
                'registration_number', 'contact_person_name', 'contact_person_title',
                'contact_person_email', 'contact_person_phone', 'description', 'domain_name',
                'bank_name', 'bank_account_number', 'bank_ifsc_code',
                'bank_branch', 'bank_account_holder', 'bank_account_type',
            ]

            # Update only the provided fields
            # Fields that have blank=True but not null=True (must use empty string, not None)
            non_nullable_fields = ['industry', 'website', 'gst_number', 'pan_number', 'registration_number',
                                   'contact_person_name', 'contact_person_title', 'contact_person_email', 
                                   'contact_person_phone', 'description', 'domain_name', 'bank_name', 
                                   'bank_account_number', 'bank_ifsc_code', 'bank_branch', 
                                   'bank_account_holder', 'bank_account_type']
            
            updated_fields = []
            for field in updatable_fields:
                if field in request.data:
                    old_value = getattr(company, field, None)
                    new_value = request.data[field]
                    
                    # Handle empty strings for different field types
                    if new_value == '' or new_value is None:
                        if field in non_nullable_fields:
                            # CharField/URLField with blank=True but not null=True
                            new_value = ''
                        elif field in ['employee_count', 'annual_revenue']:
                            # Numeric fields - convert empty string to None
                            new_value = None
                        # else: keep None for nullable fields
                    
                    if old_value != new_value:
                        setattr(company, field, new_value)
                        updated_fields.append(field)

            if updated_fields:
                try:
                    company.save()
                    log_security_event(
                        request.user,
                        'COMPANY_DETAILS_UPDATED',
                        request,
                        f'Updated company details: {", ".join(updated_fields)}'
                    )
                except Exception as save_error:
                    print(f'🔍 DEBUG: Error saving company: {str(save_error)}')
                    import traceback
                    traceback.print_exc()
                    return Response(
                        {'error': f'Failed to save: {str(save_error)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            # Return updated company data
            logo_url = None
            if company.logo:
                logo_url = request.build_absolute_uri(company.logo.url)

            return Response({
                'message': 'Company details updated successfully.',
                'updated_fields': updated_fields,
                'company': {
                    'id': company.id,
                    'name': company.name,
                    'email': company.email,
                    'phone': company.phone,
                    'address': company.address,
                    'logo': logo_url,
                    'business_type': company.business_type,
                    'industry': company.industry,
                    'employee_count': company.employee_count,
                    'annual_revenue': company.annual_revenue,
                    'website': company.website,
                    'gst_number': company.gst_number,
                    'pan_number': company.pan_number,
                    'registration_number': company.registration_number,
                    'contact_person_name': company.contact_person_name,
                    'contact_person_title': company.contact_person_title,
                    'contact_person_email': company.contact_person_email,
                    'contact_person_phone': company.contact_person_phone,
                    'description': company.description,
                    'domain_name': company.domain_name,
                    'bank_name': company.bank_name,
                    'bank_account_number': company.bank_account_number,
                    'bank_ifsc_code': company.bank_ifsc_code,
                    'bank_branch': company.bank_branch,
                    'bank_account_holder': company.bank_account_holder,
                    'bank_account_type': company.bank_account_type,
                    'approval_status': company.approval_status,
                    'created_at': company.created_at.isoformat() if company.created_at else None,
                    'updated_at': company.updated_at.isoformat() if company.updated_at else None,
                }
            })
        except Exception as e:
            print(f'🔍 DEBUG: Error in put(): {str(e)}')
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to update: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GenerateAutoCodeView(APIView):
    """Generate auto code for testing (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Only master admins can test auto-code generation
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can generate auto codes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_id = request.data.get('company_id')
        code_type = request.data.get('code_type')

        if not company_id or not code_type:
            return Response(
                {'error': 'company_id and code_type are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from .utils import generate_auto_code
            auto_code = generate_auto_code(company_id, code_type)
            
            return Response({
                'success': True,
                'auto_code': auto_code,
                'company_id': company_id,
                'code_type': code_type
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mobile_logout(request):
    """Logout endpoint — blacklists the JWT refresh token if provided."""
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken
            from rest_framework_simplejwt.exceptions import TokenError
            token = JWTRefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
    return Response({'message': 'Logged out successfully'})
