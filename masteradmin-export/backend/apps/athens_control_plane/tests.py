from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from authentication.models import Company, MasterAdmin, Service, CompanyService
from .models import (
    AthensTenantLink, AthensSubscription, AthensAuditLog, 
    AthensPlatformSettings, AthensModuleSubscription,
    DEFAULT_MODULES_SUSTAINABILITY
)


class AthensControlPlaneTestCase(APITestCase):
    """Base test case for Athens control plane tests"""
    
    def setUp(self):
        # Create master admin user
        self.master_user = User.objects.create_user(
            username='master@test.com',
            email='master@test.com',
            password='testpass123'
        )
        
        # Create master admin profile
        self.master_admin = MasterAdmin.objects.create(
            user=self.master_user,
            company_name='Test Master Company',
            api_key='test-api-key',
            recovery_codes='[]',
            password_expires_at=timezone.now() + timezone.timedelta(days=90)
        )
        
        # Get or create Athens Sustainability service
        self.athens_service, _ = Service.objects.get_or_create(
            service_type='athens_sustainability',
            defaults={
                'name': 'Athens Sustainability',
                'description': 'Sustainability management platform',
                'is_active': True
            }
        )
        
        # Create test company
        self.company = Company.objects.create(
            name='Test Company',
            company_prefix='TEST',
            email='test@company.com',
            created_by=self.master_user,
            approval_status='approved'
        )
        
        # Assign Athens service to company
        CompanyService.objects.create(
            company=self.company,
            service=self.athens_service,
            assigned_by=self.master_user,
            service_password='hashed_password',
            password_expires_at=timezone.now() + timezone.timedelta(days=90)
        )
        
        # Create regular user (non-master admin)
        self.regular_user = User.objects.create_user(
            username='regular@test.com',
            email='regular@test.com',
            password='testpass123'
        )

    def authenticate_master_admin(self):
        """Helper to authenticate as master admin"""
        self.client.force_authenticate(user=self.master_user)

    def authenticate_regular_user(self):
        """Helper to authenticate as regular user"""
        self.client.force_authenticate(user=self.regular_user)


class AthensPermissionsTestCase(AthensControlPlaneTestCase):
    """Test Athens control plane permissions"""
    
    def test_master_admin_can_access_athens_endpoints(self):
        """Test that master admin can access Athens control plane endpoints"""
        self.authenticate_master_admin()
        
        response = self.client.get('/api/athens-sust-admin/tenants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_regular_user_cannot_access_athens_endpoints(self):
        """Test that regular users cannot access Athens control plane endpoints"""
        self.authenticate_regular_user()
        
        response = self.client.get('/api/athens-sust-admin/tenants/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_access_athens_endpoints(self):
        """Test that unauthenticated users cannot access Athens control plane endpoints"""
        response = self.client.get('/api/athens-sust-admin/tenants/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AthensTenantsTestCase(AthensControlPlaneTestCase):
    """Test Athens tenants management"""
    
    def test_list_tenants(self):
        """Test listing Athens tenants"""
        self.authenticate_master_admin()
        
        response = self.client.get('/api/athens-sust-admin/tenants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['company_name'], 'Test Company')

    def test_create_tenant(self):
        """Test creating a new Athens tenant"""
        self.authenticate_master_admin()
        
        data = {
            'name': 'New Test Company',
            'company_prefix': 'NEWTEST',
            'email': 'newtest@company.com',
            'phone': '+1234567890',
            'address': '123 Test Street'
        }
        
        response = self.client.post('/api/athens-sust-admin/tenants/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that Athens tenant link was created
        new_company = Company.objects.get(company_prefix='NEWTEST')
        self.assertTrue(hasattr(new_company, 'athens_tenant'))
        self.assertEqual(new_company.athens_tenant.enabled_modules, DEFAULT_MODULES_SUSTAINABILITY)

    def test_sync_tenant(self):
        """Test syncing a tenant (creating AthensTenantLink)"""
        self.authenticate_master_admin()
        
        response = self.client.post(f'/api/athens-sust-admin/tenants/{self.company.id}/sync/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'synced')
        self.assertTrue(response.data['created'])
        
        # Check that Athens tenant link was created
        self.company.refresh_from_db()
        self.assertTrue(hasattr(self.company, 'athens_tenant'))

    def test_suspend_tenant(self):
        """Test suspending a tenant"""
        self.authenticate_master_admin()
        
        # First sync the tenant
        self.client.post(f'/api/athens-sust-admin/tenants/{self.company.id}/sync/')
        
        response = self.client.post(f'/api/athens-sust-admin/tenants/{self.company.id}/suspend/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'suspended')
        
        # Check that tenant is suspended
        self.company.refresh_from_db()
        self.assertFalse(self.company.athens_tenant.is_active)

    def test_reactivate_tenant(self):
        """Test reactivating a suspended tenant"""
        self.authenticate_master_admin()
        
        # First sync and suspend the tenant
        self.client.post(f'/api/athens-sust-admin/tenants/{self.company.id}/sync/')
        self.client.post(f'/api/athens-sust-admin/tenants/{self.company.id}/suspend/')
        
        response = self.client.post(f'/api/athens-sust-admin/tenants/{self.company.id}/reactivate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'reactivated')
        
        # Check that tenant is active
        self.company.refresh_from_db()
        self.assertTrue(self.company.athens_tenant.is_active)


class AthensModulesTestCase(AthensControlPlaneTestCase):
    """Test Athens modules management"""
    
    def setUp(self):
        super().setUp()
        # Create Athens tenant link
        self.athens_link = AthensTenantLink.objects.create(
            company=self.company,
            master_admin=self.master_user,
            enabled_modules=DEFAULT_MODULES_SUSTAINABILITY.copy(),
            is_active=True
        )

    def test_get_tenant_modules(self):
        """Test getting tenant modules"""
        self.authenticate_master_admin()
        
        response = self.client.get(f'/api/athens-sust-admin/tenants/{self.company.id}/modules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['enabled_modules'], DEFAULT_MODULES_SUSTAINABILITY)
        self.assertEqual(response.data['available_modules'], DEFAULT_MODULES_SUSTAINABILITY)

    def test_update_tenant_modules(self):
        """Test updating tenant modules"""
        self.authenticate_master_admin()
        
        new_modules = ['esg', 'environment', 'carbon']
        data = {'enabled_modules': new_modules}
        
        response = self.client.patch(f'/api/athens-sust-admin/tenants/{self.company.id}/modules/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['enabled_modules'], new_modules)
        
        # Check that module subscriptions were created
        module_subscriptions = AthensModuleSubscription.objects.filter(company=self.company)
        self.assertEqual(module_subscriptions.count(), len(new_modules))

    def test_update_tenant_modules_invalid(self):
        """Test updating tenant modules with invalid module codes"""
        self.authenticate_master_admin()
        
        invalid_modules = ['invalid_module', 'another_invalid']
        data = {'enabled_modules': invalid_modules}
        
        response = self.client.patch(f'/api/athens-sust-admin/tenants/{self.company.id}/modules/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AthensAuditLogTestCase(AthensControlPlaneTestCase):
    """Test Athens audit logging"""
    
    def test_audit_log_created_on_tenant_sync(self):
        """Test that audit log is created when tenant is synced"""
        self.authenticate_master_admin()
        
        # Sync tenant
        self.client.post(f'/api/athens-sust-admin/tenants/{self.company.id}/sync/')
        
        # Check audit log was created
        audit_logs = AthensAuditLog.objects.filter(
            action='tenant_synced',
            entity_type='company',
            entity_id=str(self.company.id)
        )
        self.assertEqual(audit_logs.count(), 1)
        self.assertEqual(audit_logs.first().actor, self.master_user)

    def test_audit_log_created_on_modules_update(self):
        """Test that audit log is created when modules are updated"""
        self.authenticate_master_admin()
        
        # Create Athens tenant link first
        AthensTenantLink.objects.create(
            company=self.company,
            master_admin=self.master_user,
            enabled_modules=DEFAULT_MODULES_SUSTAINABILITY.copy(),
            is_active=True
        )
        
        # Update modules
        new_modules = ['esg', 'environment']
        data = {'enabled_modules': new_modules}
        self.client.patch(f'/api/athens-sust-admin/tenants/{self.company.id}/modules/', data)
        
        # Check audit log was created
        audit_logs = AthensAuditLog.objects.filter(
            action='modules_updated',
            entity_type='company',
            entity_id=str(self.company.id)
        )
        self.assertEqual(audit_logs.count(), 1)


class AthensMetricsTestCase(AthensControlPlaneTestCase):
    """Test Athens metrics"""
    
    def setUp(self):
        super().setUp()
        # Create Athens tenant link and subscription
        AthensTenantLink.objects.create(
            company=self.company,
            master_admin=self.master_user,
            enabled_modules=DEFAULT_MODULES_SUSTAINABILITY.copy(),
            is_active=True
        )
        AthensSubscription.objects.create(
            company=self.company,
            plan='basic',
            status='active',
            seats=5
        )

    def test_metrics_overview(self):
        """Test getting Athens metrics overview"""
        self.authenticate_master_admin()
        
        response = self.client.get('/api/athens-sust-admin/metrics/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data['total_tenants'], 1)
        self.assertEqual(data['active_tenants'], 1)
        self.assertEqual(data['total_subscriptions'], 1)
        self.assertEqual(data['active_subscriptions'], 1)


class AthensSettingsTestCase(AthensControlPlaneTestCase):
    """Test Athens platform settings"""
    
    def test_get_settings(self):
        """Test getting platform settings"""
        self.authenticate_master_admin()
        
        response = self.client.get('/api/athens-sust-admin/settings/1/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['platform_name'], 'Athens Sustainability Platform')

    def test_update_settings(self):
        """Test updating platform settings"""
        self.authenticate_master_admin()
        
        data = {
            'platform_name': 'Updated Athens Platform',
            'support_email': 'updated@athenas.co.in',
            'session_timeout_minutes': 120
        }
        
        response = self.client.patch('/api/athens-sust-admin/settings/1/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['platform_name'], 'Updated Athens Platform')
        
        # Check audit log was created
        audit_logs = AthensAuditLog.objects.filter(action='settings_updated')
        self.assertEqual(audit_logs.count(), 1)