from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import logging

from authentication.models import Company, CompanyUser, Service, CompanyService
from .models import (
    AthensTenantLink, AthensSubscription, AthensAuditLog, 
    AthensPlatformSettings, AthensModuleSubscription, DEFAULT_MODULES_SUSTAINABILITY
)
from .serializers import (
    AthensTenantSerializer, AthensTenantCreateSerializer, AthensTenantUpdateSerializer,
    AthensModulesSerializer, AthensMasterUserSerializer, AthensMasterUserCreateSerializer,
    AthensSubscriptionSerializer, AthensAuditLogSerializer, AthensPlatformSettingsSerializer,
    AthensMetricsOverviewSerializer
)
from .permissions import IsAthensSustainabilityMasterAdmin

# Athens module definitions based on actual Athens application structure
ATHENS_MODULES = [
    {'code': 'PTW', 'name': 'Permit to Work', 'description': 'Work permit management and approval system'},
    {'code': 'INCIDENT', 'name': 'Incident Management', 'description': 'Safety incident reporting and investigation'},
    {'code': 'SAFETY_OBS', 'name': 'Safety Observation', 'description': 'Safety observation reporting and tracking'},
    {'code': 'QUALITY', 'name': 'Quality Management', 'description': 'Quality control and assurance processes'},
    {'code': 'ENVIRONMENT', 'name': 'Environment', 'description': 'Environmental monitoring and compliance'},
    {'code': 'INDUCTION', 'name': 'Induction Training', 'description': 'Employee induction and orientation training'},
    {'code': 'JOB_TRAINING', 'name': 'Job Training', 'description': 'Job-specific training and certification'},
    {'code': 'TBT', 'name': 'Toolbox Talk', 'description': 'Daily safety briefings and toolbox talks'},
    {'code': 'INSPECTION', 'name': 'Inspection', 'description': 'Equipment and facility inspections'},
    {'code': 'MANPOWER', 'name': 'Manpower', 'description': 'Workforce planning and management'},
    {'code': 'WORKER', 'name': 'Worker Management', 'description': 'Worker profiles and documentation'},
    {'code': 'ATTENDANCE', 'name': 'Attendance', 'description': 'Employee attendance tracking'},
    {'code': 'MOM', 'name': 'Minutes of Meeting', 'description': 'Meeting minutes and action items'},
    {'code': 'PERMISSIONS', 'name': 'Permissions', 'description': 'Access control and permissions management'},
    {'code': 'AI_BOT', 'name': 'AI Assistant', 'description': 'AI-powered assistance and automation'},
    {'code': 'CHATBOX', 'name': 'Communication', 'description': 'Internal communication and messaging'},
]

logger = logging.getLogger(__name__)


def _audit(action, entity_type, entity_id, actor=None, before_data=None, after_data=None, request=None):
    """Helper function to create audit log entries. Never breaks main flow if audit fails."""
    try:
        ip_address = None
        user_agent = ''
        
        if request:
            # Get IP address
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        AthensAuditLog.objects.create(
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            before_data=before_data,
            after_data=after_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")


class AthensTenantsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Athens tenants (companies)"""
    queryset = Company.objects.all()
    permission_classes = [IsAuthenticated, IsAthensSustainabilityMasterAdmin]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AthensTenantCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AthensTenantUpdateSerializer
        return AthensTenantSerializer

    def get_queryset(self):
        # Filter to only show companies with Athens Sustainability service
        try:
            athens_service = Service.objects.get(service_type='athens_sustainability')
            return Company.objects.filter(
                company_services__service=athens_service,
                company_services__is_active=True
            ).distinct()
        except Service.DoesNotExist:
            # If service doesn't exist, return all companies for now
            return Company.objects.all()

    def perform_create(self, serializer):
        with transaction.atomic():
            company = serializer.save(
                created_by=self.request.user,
                approval_status='approved'  # Auto-approve for Athens
            )
            
            # Create Athens tenant link
            AthensTenantLink.objects.create(
                company=company,
                master_admin=self.request.user,
                enabled_modules=DEFAULT_MODULES_SUSTAINABILITY.copy(),
                is_active=True
            )
            
            # Create default subscription
            AthensSubscription.objects.create(
                company=company,
                plan='basic',
                status='trial',
                seats=5,
                end_date=timezone.now() + timedelta(days=30)
            )
            
            _audit('tenant_created', 'company', company.id, self.request.user, 
                   after_data=serializer.data, request=self.request)

    def perform_update(self, serializer):
        before_data = AthensTenantSerializer(self.get_object()).data
        company = serializer.save()
        after_data = AthensTenantSerializer(company).data
        
        _audit('tenant_updated', 'company', company.id, self.request.user,
               before_data=before_data, after_data=after_data, request=self.request)

    def perform_destroy(self, instance):
        before_data = AthensTenantSerializer(instance).data
        instance.delete()
        
        _audit('tenant_deleted', 'company', instance.id, self.request.user,
               before_data=before_data, request=self.request)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a tenant"""
        company = self.get_object()
        
        try:
            athens_link = company.athens_tenant
            before_data = {'is_active': athens_link.is_active}
            athens_link.is_active = False
            athens_link.save()
            after_data = {'is_active': athens_link.is_active}
            
            _audit('tenant_suspended', 'company', company.id, request.user,
                   before_data=before_data, after_data=after_data, request=request)
            
            return Response({'status': 'suspended'})
        except AthensTenantLink.DoesNotExist:
            return Response({'error': 'Athens tenant link not found'}, 
                          status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """Reactivate a suspended tenant"""
        company = self.get_object()
        
        try:
            athens_link = company.athens_tenant
            before_data = {'is_active': athens_link.is_active}
            athens_link.is_active = True
            athens_link.save()
            after_data = {'is_active': athens_link.is_active}
            
            _audit('tenant_reactivated', 'company', company.id, request.user,
                   before_data=before_data, after_data=after_data, request=request)
            
            return Response({'status': 'reactivated'})
        except AthensTenantLink.DoesNotExist:
            return Response({'error': 'Athens tenant link not found'}, 
                          status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Sync tenant - create AthensTenantLink if missing"""
        company = self.get_object()
        
        athens_link, created = AthensTenantLink.objects.get_or_create(
            company=company,
            defaults={
                'master_admin': request.user,
                'enabled_modules': DEFAULT_MODULES_SUSTAINABILITY.copy(),
                'is_active': True
            }
        )
        
        if created:
            # Also create default subscription if missing
            AthensSubscription.objects.get_or_create(
                company=company,
                defaults={
                    'plan': 'basic',
                    'status': 'trial',
                    'seats': 5,
                    'end_date': timezone.now() + timedelta(days=30)
                }
            )
        
        athens_link.synced_at = timezone.now()
        athens_link.save()
        
        _audit('tenant_synced', 'company', company.id, request.user, request=request)
        
        return Response({
            'status': 'synced',
            'created': created,
            'enabled_modules': athens_link.enabled_modules
        })

    @action(detail=True, methods=['get', 'patch'])
    def modules(self, request, pk=None):
        """Get or update tenant modules"""
        company = self.get_object()
        
        try:
            athens_link = company.athens_tenant
        except AthensTenantLink.DoesNotExist:
            return Response({'error': 'Athens tenant link not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'GET':
            return Response({
                'enabled_modules': athens_link.enabled_modules,
                'available_modules': DEFAULT_MODULES_SUSTAINABILITY
            })
        
        elif request.method == 'PATCH':
            serializer = AthensModulesSerializer(data=request.data)
            if serializer.is_valid():
                before_data = {'enabled_modules': athens_link.enabled_modules}
                athens_link.enabled_modules = serializer.validated_data['enabled_modules']
                athens_link.save()
                
                # Update individual module subscriptions
                AthensModuleSubscription.objects.filter(company=company).delete()
                for module_code in athens_link.enabled_modules:
                    AthensModuleSubscription.objects.create(
                        company=company,
                        module_code=module_code,
                        enabled=True,
                        plan_tier='basic'
                    )
                
                after_data = {'enabled_modules': athens_link.enabled_modules}
                _audit('modules_updated', 'company', company.id, request.user,
                       before_data=before_data, after_data=after_data, request=request)
                
                return Response({
                    'enabled_modules': athens_link.enabled_modules,
                    'status': 'updated'
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AthensMastersViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Athens master users (company admins)"""
    queryset = CompanyUser.objects.all()
    permission_classes = [IsAuthenticated, IsAthensSustainabilityMasterAdmin]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AthensMasterUserCreateSerializer
        return AthensMasterUserSerializer

    def get_queryset(self):
        # Filter to only show company users for Athens companies
        try:
            athens_service = Service.objects.get(service_type='athens_sustainability')
            return CompanyUser.objects.filter(
                company__company_services__service=athens_service,
                company__company_services__is_active=True
            ).distinct()
        except Service.DoesNotExist:
            return CompanyUser.objects.all()

    def perform_create(self, serializer):
        with transaction.atomic():
            data = serializer.validated_data
            
            # Create user
            user = User.objects.create(
                email=data['email'],
                username=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                password=make_password('TempPassword123!')  # Temporary password
            )
            
            # Create company user
            company = Company.objects.get(id=data['company_id'])
            company_user = CompanyUser.objects.create(
                user=user,
                company=company,
                created_by=self.request.user,
                must_change_password=data.get('force_password_reset', True),
                password_expires_at=timezone.now() + timedelta(days=90)
            )
            
            _audit('master_created', 'company_user', company_user.id, self.request.user,
                   after_data={'email': user.email, 'company': company.name}, request=self.request)

    def perform_destroy(self, instance):
        before_data = AthensMasterUserSerializer(instance).data
        instance.user.delete()  # This will cascade delete the CompanyUser
        
        _audit('master_deleted', 'company_user', instance.id, self.request.user,
               before_data=before_data, request=self.request)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """Reset password for a master user"""
        company_user = self.get_object()
        
        # Generate new temporary password
        new_password = 'TempPassword123!'
        company_user.user.password = make_password(new_password)
        company_user.user.save()
        
        # Set password change requirement
        company_user.must_change_password = True
        company_user.password_expires_at = timezone.now() + timedelta(days=1)
        company_user.save()
        
        _audit('password_reset', 'company_user', company_user.id, request.user,
               after_data={'email': company_user.user.email}, request=request)
        
        return Response({'status': 'Password reset successfully'})


class AthensSubscriptionsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Athens subscriptions"""
    queryset = AthensSubscription.objects.all()
    serializer_class = AthensSubscriptionSerializer
    permission_classes = [IsAuthenticated, IsAthensSustainabilityMasterAdmin]

    def perform_update(self, serializer):
        before_data = AthensSubscriptionSerializer(self.get_object()).data
        subscription = serializer.save()
        after_data = AthensSubscriptionSerializer(subscription).data
        
        _audit('subscription_updated', 'subscription', subscription.id, self.request.user,
               before_data=before_data, after_data=after_data, request=self.request)


class AthensAuditLogsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing Athens audit logs"""
    queryset = AthensAuditLog.objects.all()
    serializer_class = AthensAuditLogSerializer
    permission_classes = [IsAuthenticated, IsAthensSustainabilityMasterAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by query parameters
        tenant_id = self.request.query_params.get('tenant_id')
        actor_id = self.request.query_params.get('actor_id')
        action = self.request.query_params.get('action')
        from_date = self.request.query_params.get('from')
        to_date = self.request.query_params.get('to')
        
        if tenant_id:
            queryset = queryset.filter(entity_id=tenant_id, entity_type='company')
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)
        if action:
            queryset = queryset.filter(action=action)
        if from_date:
            queryset = queryset.filter(created_at__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__lte=to_date)
        
        return queryset


class AthensSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Athens platform settings"""
    queryset = AthensPlatformSettings.objects.all()
    serializer_class = AthensPlatformSettingsSerializer
    permission_classes = [IsAuthenticated, IsAthensSustainabilityMasterAdmin]

    def get_object(self):
        # Always return the singleton settings object
        settings, created = AthensPlatformSettings.objects.get_or_create(id=1)
        return settings

    def perform_update(self, serializer):
        before_data = AthensPlatformSettingsSerializer(self.get_object()).data
        settings = serializer.save()
        after_data = AthensPlatformSettingsSerializer(settings).data
        
        _audit('settings_updated', 'platform_settings', 1, self.request.user,
               before_data=before_data, after_data=after_data, request=self.request)


class AthensMetricsViewSet(viewsets.ViewSet):
    """ViewSet for Athens metrics and overview"""
    permission_classes = [IsAuthenticated, IsAthensSustainabilityMasterAdmin]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get Athens metrics overview"""
        range_param = request.query_params.get('range', '30d')
        
        # Calculate date range
        if range_param == '7d':
            from_date = timezone.now() - timedelta(days=7)
        elif range_param == '90d':
            from_date = timezone.now() - timedelta(days=90)
        else:  # default 30d
            from_date = timezone.now() - timedelta(days=30)
        
        # Get metrics
        total_tenants = AthensTenantLink.objects.count()
        active_tenants = AthensTenantLink.objects.filter(is_active=True).count()
        total_subscriptions = AthensSubscription.objects.count()
        active_subscriptions = AthensSubscription.objects.filter(status='active').count()
        total_modules_enabled = AthensModuleSubscription.objects.filter(enabled=True).count()
        recent_activity_count = AthensAuditLog.objects.filter(created_at__gte=from_date).count()
        
        data = {
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'total_subscriptions': total_subscriptions,
            'active_subscriptions': active_subscriptions,
            'total_modules_enabled': total_modules_enabled,
            'recent_activity_count': recent_activity_count
        }
        
        serializer = AthensMetricsOverviewSerializer(data)
        return Response(serializer.data)


class AthensModulesViewSet(viewsets.ViewSet):
    """ViewSet for managing Athens modules"""
    permission_classes = [IsAuthenticated, IsAthensSustainabilityMasterAdmin]

    def list(self, request):
        """List all available Athens modules"""
        results = []
        for i, module in enumerate(ATHENS_MODULES, 1):
            results.append({
                'id': i,
                'name': module['name'],
                'key': module['code'],
                'icon': 'shield',
                'description': module['description'],
                'is_active': True
            })
        
        return Response({'results': results})


class AthensModuleAccessViewSet(viewsets.ViewSet):
    """ViewSet for managing tenant-specific module access"""
    permission_classes = [IsAuthenticated, IsAthensSustainabilityMasterAdmin]

    def list(self, request):
        """List module access for all tenants"""
        tenant_id = request.query_params.get('tenant')
        
        if tenant_id:
            try:
                company = Company.objects.get(id=tenant_id)
                athens_link = company.athens_tenant
                return Response({
                    'tenant_id': tenant_id,
                    'company_name': company.name,
                    'enabled_modules': athens_link.enabled_modules,
                    'is_active': athens_link.is_active
                })
            except (Company.DoesNotExist, AthensTenantLink.DoesNotExist):
                return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Return all tenant module access
        athens_links = AthensTenantLink.objects.select_related('company').all()
        data = []
        for link in athens_links:
            data.append({
                'tenant_id': link.company.id,
                'company_name': link.company.name,
                'enabled_modules': link.enabled_modules,
                'is_active': link.is_active
            })
        
        return Response(data)

    @action(detail=False, methods=['get', 'patch'], url_path='tenant/(?P<tenant_id>[^/.]+)')
    def tenant_access(self, request, tenant_id=None):
        """Get or update module access for a specific tenant"""
        try:
            company = Company.objects.get(id=tenant_id)
            athens_link = company.athens_tenant
            
            if request.method == 'GET':
                # Return module access in the expected format
                module_access = []
                for i, module in enumerate(ATHENS_MODULES, 1):
                    is_enabled = module['code'] in athens_link.enabled_modules
                    module_access.append({
                        'id': i,
                        'tenant': int(tenant_id),
                        'module': i,
                        'is_enabled': is_enabled,
                        'module_name': module['name'],
                        'module_key': module['code'],
                        'tenant_name': company.name
                    })
                
                return Response(module_access)
            
            elif request.method == 'PATCH':
                return Response({'error': 'Use POST /save/ endpoint instead'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)
        except AthensTenantLink.DoesNotExist:
            return Response({'error': 'Athens tenant link not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='save')
    def save_module_access(self, request):
        """Save module access configuration for a tenant"""
        tenant_id = request.data.get('tenant_id')
        modules = request.data.get('modules', [])
        
        if not tenant_id:
            return Response({'error': 'tenant_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            company = Company.objects.get(id=tenant_id)
            athens_link = company.athens_tenant
            
            # Convert module IDs to module codes
            enabled_modules = []
            for module_data in modules:
                if module_data.get('is_enabled', False):
                    module_id = module_data.get('module_id')
                    if module_id and module_id <= len(ATHENS_MODULES):
                        module_code = ATHENS_MODULES[module_id - 1]['code']
                        enabled_modules.append(module_code)
            
            before_data = {'enabled_modules': athens_link.enabled_modules}
            athens_link.enabled_modules = enabled_modules
            athens_link.save()
            
            # Update individual module subscriptions
            AthensModuleSubscription.objects.filter(company=company).delete()
            for module_code in enabled_modules:
                AthensModuleSubscription.objects.create(
                    company=company,
                    module_code=module_code,
                    enabled=True,
                    plan_tier='basic'
                )
            
            after_data = {'enabled_modules': enabled_modules}
            _audit('modules_updated', 'company', company.id, request.user,
                   before_data=before_data, after_data=after_data, request=request)
            
            return Response({'status': 'success'})
            
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)
        except AthensTenantLink.DoesNotExist:
            return Response({'error': 'Athens tenant link not found'}, status=status.HTTP_404_NOT_FOUND)