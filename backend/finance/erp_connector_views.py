from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.db.models import Q
from authentication.models import ServiceUserSession
from .integration_models import ERPIntegration, IntegrationLog
from .erp_connector_service import ERPConnectorService
from .bank_integration_views import WrappedAPIView

class ERPConnectorListView(WrappedAPIView):
    """List ERP connectors"""
    
    def get(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            erp_integrations = ERPIntegration.objects.filter(
                company=session.service_user.company
            ).values(
                'id', 'erp_type', 'erp_name', 'server_url', 'database_name',
                'sync_direction', 'sync_customers', 'sync_products', 'sync_invoices', 'sync_payments',
                'auto_sync_enabled', 'sync_frequency', 'last_sync_date', 'is_active',
                'connection_status', 'created_at', 'updated_at'
            )
            
            return Response({
                'results': list(erp_integrations)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ERPConnectorCreateView(WrappedAPIView):
    """Create new ERP connector"""
    
    def post(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            data = request.data
            
            # Validate required fields
            required_fields = ['erp_type', 'erp_name']
            for field in required_fields:
                if not data.get(field):
                    return Response({'error': f'{field} is required'}, status=400)
            
            # Create ERP integration
            erp_integration = ERPIntegration.objects.create(
                company=session.service_user.company,
                erp_type=data.get('erp_type'),
                erp_name=data.get('erp_name'),
                server_url=data.get('server_url', ''),
                database_name=data.get('database_name', ''),
                username=data.get('username', ''),
                sync_direction=data.get('sync_direction', 'import'),
                sync_customers=data.get('sync_customers', True),
                sync_products=data.get('sync_products', True),
                sync_invoices=data.get('sync_invoices', True),
                sync_payments=data.get('sync_payments', True),
                auto_sync_enabled=data.get('auto_sync_enabled', False),
                sync_frequency=data.get('sync_frequency', 'daily'),
                is_active=data.get('is_active', True),
                encrypted_credentials=data.get('credentials', {})
            )
            
            return Response({
                'message': 'ERP connector created successfully',
                'erp_integration': {
                    'id': erp_integration.id,
                    'erp_name': erp_integration.erp_name,
                    'erp_type': erp_integration.erp_type,
                    'connection_status': erp_integration.connection_status
                }
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ERPConnectorDetailView(WrappedAPIView):
    """Get, update, delete ERP connector"""
    
    def get(self, request, erp_id):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            erp_integration = ERPIntegration.objects.get(
                id=erp_id,
                company=session.service_user.company
            )
            
            return Response({
                'id': erp_integration.id,
                'erp_type': erp_integration.erp_type,
                'erp_name': erp_integration.erp_name,
                'server_url': erp_integration.server_url,
                'database_name': erp_integration.database_name,
                'username': erp_integration.username,
                'sync_direction': erp_integration.sync_direction,
                'sync_customers': erp_integration.sync_customers,
                'sync_products': erp_integration.sync_products,
                'sync_invoices': erp_integration.sync_invoices,
                'sync_payments': erp_integration.sync_payments,
                'auto_sync_enabled': erp_integration.auto_sync_enabled,
                'sync_frequency': erp_integration.sync_frequency,
                'last_sync_date': erp_integration.last_sync_date,
                'is_active': erp_integration.is_active,
                'connection_status': erp_integration.connection_status,
                'created_at': erp_integration.created_at,
                'updated_at': erp_integration.updated_at
            })
            
        except ERPIntegration.DoesNotExist:
            return Response({'error': 'ERP connector not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    def put(self, request, erp_id):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            erp_integration = ERPIntegration.objects.get(
                id=erp_id,
                company=session.service_user.company
            )
            
            data = request.data
            
            # Update fields
            erp_integration.erp_name = data.get('erp_name', erp_integration.erp_name)
            erp_integration.server_url = data.get('server_url', erp_integration.server_url)
            erp_integration.database_name = data.get('database_name', erp_integration.database_name)
            erp_integration.username = data.get('username', erp_integration.username)
            erp_integration.sync_direction = data.get('sync_direction', erp_integration.sync_direction)
            erp_integration.sync_customers = data.get('sync_customers', erp_integration.sync_customers)
            erp_integration.sync_products = data.get('sync_products', erp_integration.sync_products)
            erp_integration.sync_invoices = data.get('sync_invoices', erp_integration.sync_invoices)
            erp_integration.sync_payments = data.get('sync_payments', erp_integration.sync_payments)
            erp_integration.auto_sync_enabled = data.get('auto_sync_enabled', erp_integration.auto_sync_enabled)
            erp_integration.sync_frequency = data.get('sync_frequency', erp_integration.sync_frequency)
            erp_integration.is_active = data.get('is_active', erp_integration.is_active)
            
            if data.get('credentials'):
                erp_integration.encrypted_credentials = data.get('credentials')
            
            erp_integration.save()
            
            return Response({
                'message': 'ERP connector updated successfully'
            })
            
        except ERPIntegration.DoesNotExist:
            return Response({'error': 'ERP connector not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    def delete(self, request, erp_id):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            erp_integration = ERPIntegration.objects.get(
                id=erp_id,
                company=session.service_user.company
            )
            
            erp_integration.delete()
            
            return Response({
                'message': 'ERP connector deleted successfully'
            })
            
        except ERPIntegration.DoesNotExist:
            return Response({'error': 'ERP connector not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ERPConnectorTestView(WrappedAPIView):
    """Test ERP connector connection"""
    
    def post(self, request, erp_id):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            erp_integration = ERPIntegration.objects.get(
                id=erp_id,
                company=session.service_user.company
            )
            
            # Test connection
            result = ERPConnectorService.test_connection(erp_integration)
            
            # Update connection status
            if result['success']:
                erp_integration.connection_status = 'connected'
            else:
                erp_integration.connection_status = 'error'
            erp_integration.save()
            
            return Response(result)
            
        except ERPIntegration.DoesNotExist:
            return Response({'error': 'ERP connector not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ERPConnectorSyncView(WrappedAPIView):
    """Sync data with ERP connector"""
    
    def post(self, request, erp_id):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            erp_integration = ERPIntegration.objects.get(
                id=erp_id,
                company=session.service_user.company
            )
            
            sync_type = request.data.get('sync_type', 'all')  # all, customers, products, invoices, payments
            
            # Perform sync
            sync_results = ERPConnectorService.sync_data(erp_integration, sync_type)
            
            return Response({
                'message': 'ERP sync completed successfully',
                'sync_results': sync_results
            })
            
        except ERPIntegration.DoesNotExist:
            return Response({'error': 'ERP connector not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ERPConnectorLogsView(WrappedAPIView):
    """Get ERP connector sync logs"""
    
    def get(self, request, erp_id):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            erp_integration = ERPIntegration.objects.get(
                id=erp_id,
                company=session.service_user.company
            )
            
            logs = IntegrationLog.objects.filter(
                company=session.service_user.company,
                log_type='erp_sync',
                message__icontains=erp_integration.erp_name
            ).order_by('-created_at')[:20]
            
            logs_data = []
            for log in logs:
                logs_data.append({
                    'id': log.id,
                    'status': log.status,
                    'message': log.message,
                    'details': log.details,
                    'records_processed': log.records_processed,
                    'records_success': log.records_success,
                    'records_failed': log.records_failed,
                    'processing_time': log.processing_time,
                    'created_at': log.created_at
                })
            
            return Response({
                'logs': logs_data
            })
            
        except ERPIntegration.DoesNotExist:
            return Response({'error': 'ERP connector not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ERPConnectorDashboardView(WrappedAPIView):
    """ERP connector dashboard data"""
    
    def get(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            company = session.service_user.company
            
            # Get ERP integration stats
            erp_integrations = ERPIntegration.objects.filter(company=company)
            
            total_integrations = erp_integrations.count()
            active_integrations = erp_integrations.filter(is_active=True).count()
            connected_integrations = erp_integrations.filter(connection_status='connected').count()
            auto_sync_enabled = erp_integrations.filter(auto_sync_enabled=True).count()
            
            # Get recent sync logs
            recent_logs = IntegrationLog.objects.filter(
                company=company,
                log_type='erp_sync'
            ).order_by('-created_at')[:10]
            
            logs_data = []
            for log in recent_logs:
                logs_data.append({
                    'status': log.status,
                    'message': log.message,
                    'records_processed': log.records_processed,
                    'created_at': log.created_at
                })
            
            # Get ERP type breakdown
            erp_types = {}
            for integration in erp_integrations:
                erp_type = integration.erp_type
                if erp_type not in erp_types:
                    erp_types[erp_type] = {'total': 0, 'connected': 0}
                erp_types[erp_type]['total'] += 1
                if integration.connection_status == 'connected':
                    erp_types[erp_type]['connected'] += 1
            
            return Response({
                'total_integrations': total_integrations,
                'active_integrations': active_integrations,
                'connected_integrations': connected_integrations,
                'auto_sync_enabled': auto_sync_enabled,
                'erp_types': erp_types,
                'recent_logs': logs_data
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

# Convert class-based views to function-based views for URL routing
erp_connector_list = ERPConnectorListView.as_view()
erp_connector_create = ERPConnectorCreateView.as_view()
erp_connector_detail = ERPConnectorDetailView.as_view()
erp_connector_test = ERPConnectorTestView.as_view()
erp_connector_sync = ERPConnectorSyncView.as_view()
erp_connector_logs = ERPConnectorLogsView.as_view()
erp_connector_dashboard = ERPConnectorDashboardView.as_view()