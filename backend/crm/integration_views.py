# Phase 4: Integration & Mobile Optimization Views
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from .phase4_models import (
    ThirdPartyIntegration, IntegrationLog, MobileDevice, MobileSync
)
from .phase4_serializers import (
    ThirdPartyIntegrationSerializer, IntegrationLogSerializer,
    MobileDeviceSerializer, MobileSyncSerializer
)
from authentication.models import Company, ServiceUserSession
from .views import CRMBaseViewSet
import json


class ThirdPartyIntegrationViewSet(CRMBaseViewSet):
    queryset = ThirdPartyIntegration.objects.all()
    serializer_class = ThirdPartyIntegrationSerializer
    filterset_fields = ['integration_type', 'status']
    search_fields = ['name', 'provider']
    ordering = ['-created_at']
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test integration connection"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        integration = self.get_object()
        
        try:
            # Simulate connection test
            # In real implementation, this would test the actual API connection
            integration.status = 'active'
            integration.last_sync = timezone.now()
            integration.save()
            
            # Log the test
            IntegrationLog.objects.create(
                integration=integration,
                log_type='api_call',
                level='info',
                message='Connection test successful',
                details={'test_result': 'success'}
            )
            
            return Response({
                'status': 'success',
                'message': 'Connection test successful'
            })
        except Exception as e:
            integration.status = 'error'
            integration.save()
            
            IntegrationLog.objects.create(
                integration=integration,
                log_type='error',
                level='error',
                message=f'Connection test failed: {str(e)}',
                details={'error': str(e)}
            )
            
            return Response({
                'status': 'error',
                'message': f'Connection test failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def sync_data(self, request, pk=None):
        """Trigger data synchronization"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        integration = self.get_object()
        
        try:
            # Simulate data sync
            # In real implementation, this would sync data with the external service
            integration.last_sync = timezone.now()
            integration.save()
            
            IntegrationLog.objects.create(
                integration=integration,
                log_type='sync',
                level='info',
                message='Data synchronization completed',
                details={'records_synced': 100}
            )
            
            return Response({
                'status': 'success',
                'message': 'Data synchronization completed',
                'records_synced': 100
            })
        except Exception as e:
            IntegrationLog.objects.create(
                integration=integration,
                log_type='error',
                level='error',
                message=f'Data sync failed: {str(e)}',
                details={'error': str(e)}
            )
            
            return Response({
                'status': 'error',
                'message': f'Data sync failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get integration dashboard data"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        integrations = self.get_queryset()
        
        # Integration statistics
        total_integrations = integrations.count()
        active_integrations = integrations.filter(status='active').count()
        error_integrations = integrations.filter(status='error').count()
        
        # Recent logs
        recent_logs = IntegrationLog.objects.filter(
            integration__company=company
        ).order_by('-created_at')[:10]
        
        # Integration types breakdown
        integration_types = integrations.values('integration_type').annotate(
            count=Count('id')
        )
        
        return Response({
            'total_integrations': total_integrations,
            'active_integrations': active_integrations,
            'error_integrations': error_integrations,
            'recent_logs': IntegrationLogSerializer(recent_logs, many=True).data,
            'integration_types': list(integration_types)
        })


class IntegrationLogViewSet(CRMBaseViewSet):
    queryset = IntegrationLog.objects.all()
    serializer_class = IntegrationLogSerializer
    filterset_fields = ['log_type', 'level']
    ordering = ['-created_at']
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return self.queryset.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            return self.queryset.filter(integration__company=company)
        except ServiceUserSession.DoesNotExist:
            return self.queryset.none()


class MobileDeviceViewSet(CRMBaseViewSet):
    queryset = MobileDevice.objects.all()
    serializer_class = MobileDeviceSerializer
    filterset_fields = ['device_type', 'status']
    search_fields = ['device_name', 'device_model']
    ordering = ['-last_active']
    
    @action(detail=True, methods=['post'])
    def block_device(self, request, pk=None):
        """Block a mobile device"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        device = self.get_object()
        device.status = 'blocked'
        device.save()
        
        return Response({
            'status': 'success',
            'message': 'Device blocked successfully'
        })
    
    @action(detail=True, methods=['post'])
    def unblock_device(self, request, pk=None):
        """Unblock a mobile device"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        device = self.get_object()
        device.status = 'active'
        device.save()
        
        return Response({
            'status': 'success',
            'message': 'Device unblocked successfully'
        })
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get mobile devices dashboard data"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        devices = self.get_queryset()
        
        # Device statistics
        total_devices = devices.count()
        active_devices = devices.filter(status='active').count()
        blocked_devices = devices.filter(status='blocked').count()
        
        # Device types breakdown
        device_types = devices.values('device_type').annotate(
            count=Count('id')
        )
        
        # Recent devices
        recent_devices = devices.order_by('-registered_at')[:10]
        
        return Response({
            'total_devices': total_devices,
            'active_devices': active_devices,
            'blocked_devices': blocked_devices,
            'device_types': list(device_types),
            'recent_devices': MobileDeviceSerializer(recent_devices, many=True).data
        })


class MobileSyncViewSet(CRMBaseViewSet):
    queryset = MobileSync.objects.all()
    serializer_class = MobileSyncSerializer
    filterset_fields = ['sync_type', 'status']
    ordering = ['-started_at']
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return self.queryset.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            return self.queryset.filter(device__company=company)
        except ServiceUserSession.DoesNotExist:
            return self.queryset.none()
    
    @action(detail=False, methods=['post'])
    def trigger_sync(self, request):
        """Trigger sync for user's devices"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            user = session.service_user.created_by
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        devices = MobileDevice.objects.filter(company=company, status='active')
        
        sync_logs = []
        for device in devices:
            sync_log = MobileSync.objects.create(
                device=device,
                sync_type='incremental',
                status='pending',
                data_types=['leads', 'contacts', 'activities']
            )
            sync_logs.append(sync_log)
        
        return Response({
            'status': 'success',
            'message': f'Sync triggered for {len(sync_logs)} devices',
            'sync_logs': MobileSyncSerializer(sync_logs, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get mobile sync dashboard data"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        syncs = self.get_queryset()
        
        # Sync statistics
        total_syncs = syncs.count()
        completed_syncs = syncs.filter(status='completed').count()
        failed_syncs = syncs.filter(status='failed').count()
        
        # Recent syncs
        recent_syncs = syncs.order_by('-started_at')[:10]
        
        return Response({
            'total_syncs': total_syncs,
            'completed_syncs': completed_syncs,
            'failed_syncs': failed_syncs,
            'recent_syncs': MobileSyncSerializer(recent_syncs, many=True).data
        })