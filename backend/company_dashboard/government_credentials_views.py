from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from .government_credentials_models import CompanyGovernmentCredentials, CompanyGovernmentCredentialLog
from .government_credentials_serializers import (
    CompanyGovernmentCredentialsSerializer,
    CompanyGovernmentCredentialsCreateSerializer,
    CompanyGovernmentCredentialLogSerializer,
    GovernmentAPITestSerializer
)
from authentication.utils import get_client_ip
import logging

logger = logging.getLogger(__name__)

class CompanyGovernmentCredentialsListView(generics.ListCreateAPIView):
    """List and create government API credentials"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter credentials by company"""
        return CompanyGovernmentCredentials.objects.filter(
            company=self.request.user.company_user.company
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.request.method == 'POST':
            return CompanyGovernmentCredentialsCreateSerializer
        return CompanyGovernmentCredentialsSerializer
    
    def perform_create(self, serializer):
        """Create credentials with audit logging"""
        company = self.request.user.company_user.company
        
        with transaction.atomic():
            # Create credentials
            credential = serializer.save(
                company=company,
                created_by=self.request.user.email
            )
            
            # Log creation
            CompanyGovernmentCredentialLog.objects.create(
                credential=credential,
                action='create',
                user_email=self.request.user.email,
                ip_address=get_client_ip(self.request),
                user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
                details=f"Created {credential.get_api_type_display()} credentials for {credential.environment}",
                success=True
            )

class CompanyGovernmentCredentialsDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete government API credentials"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter credentials by company"""
        return CompanyGovernmentCredentials.objects.filter(
            company=self.request.user.company_user.company
        )
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.request.method in ['PUT', 'PATCH']:
            return CompanyGovernmentCredentialsCreateSerializer
        return CompanyGovernmentCredentialsSerializer
    
    def perform_update(self, serializer):
        """Update credentials with audit logging"""
        credential = self.get_object()
        
        with transaction.atomic():
            # Update credentials
            updated_credential = serializer.save()
            
            # Log update
            CompanyGovernmentCredentialLog.objects.create(
                credential=updated_credential,
                action='update',
                user_email=self.request.user.email,
                ip_address=get_client_ip(self.request),
                user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
                details=f"Updated {updated_credential.get_api_type_display()} credentials",
                success=True
            )
    
    def perform_destroy(self, instance):
        """Delete credentials with audit logging"""
        with transaction.atomic():
            # Log deletion before deleting
            CompanyGovernmentCredentialLog.objects.create(
                credential=instance,
                action='delete',
                user_email=self.request.user.email,
                ip_address=get_client_ip(self.request),
                user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
                details=f"Deleted {instance.get_api_type_display()} credentials",
                success=True
            )
            
            # Delete the credential
            instance.delete()

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_credential_status(request, credential_id):
    """Activate or deactivate government API credentials"""
    try:
        company = request.user.company_user.company
        credential = get_object_or_404(
            CompanyGovernmentCredentials,
            id=credential_id,
            company=company
        )
        
        # Toggle status
        credential.is_active = not credential.is_active
        credential.save()
        
        action = 'activate' if credential.is_active else 'deactivate'
        
        # Log action
        CompanyGovernmentCredentialLog.objects.create(
            credential=credential,
            action=action,
            user_email=request.user.email,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details=f"{action.title()}d {credential.get_api_type_display()} credentials",
            success=True
        )
        
        return Response({
            'message': f'Credentials {action}d successfully',
            'is_active': credential.is_active
        })
        
    except Exception as e:
        logger.error(f"Error toggling credential status: {str(e)}")
        return Response(
            {'error': 'Failed to update credential status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def test_government_api_credentials(request, credential_id):
    """Test government API credentials"""
    try:
        # Simple validation - test_type is optional, defaults to 'connection'
        test_type = request.data.get('test_type', 'connection')
        test_data = request.data.get('test_data', {})
        
        company = request.user.company_user.company
        
        # Get credential
        credential = get_object_or_404(
            CompanyGovernmentCredentials,
            id=credential_id,
            company=company
        )
        
        # Import government API services
        try:
            from finance.government_api import get_company_services
        except ImportError:
            return Response(
                {'error': 'Government API services not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Get company-specific services
        company_services = get_company_services(company)
        
        result = {'success': False, 'message': 'Test not implemented'}
        
        # Perform test based on type and API
        if credential.api_type == 'gst' and test_type == 'connection':
            # Test GST API connection using company-specific service
            try:
                # Test authentication with stored credentials
                token = company_services['gst'].get_auth_token()
                
                if token:
                    result = {'success': True, 'message': 'GST API connection successful'}
                else:
                    result = {'success': False, 'message': 'GST API authentication failed'}
                
            except Exception as e:
                result = {'success': False, 'message': f'GST API test failed: {str(e)}'}
        
        elif credential.api_type == 'gst' and test_type == 'validate_gstin':
            # Test GSTIN validation using company-specific service
            gstin = test_data.get('gstin', credential.get_gstin())
            if gstin:
                validation_result = company_services['gst'].validate_gstin(gstin)
                if validation_result.get('valid'):
                    result = {'success': True, 'message': 'GSTIN validation successful', 'data': validation_result}
                else:
                    result = {'success': False, 'message': 'GSTIN validation failed', 'data': validation_result}
            else:
                result = {'success': False, 'message': 'GSTIN required for validation test'}
        
        elif credential.api_type == 'tds' and test_type == 'connection':
            # Test TDS API connection using company-specific service
            try:
                # Test authentication with stored credentials
                token = company_services['tds'].get_auth_token()
                
                if token:
                    result = {'success': True, 'message': 'TDS API connection successful'}
                else:
                    result = {'success': False, 'message': 'TDS API authentication failed'}
                
            except Exception as e:
                result = {'success': False, 'message': f'TDS API test failed: {str(e)}'}
        
        elif credential.api_type == 'tds' and test_type == 'validate_pan':
            # Test PAN validation using company-specific service
            pan = test_data.get('pan', credential.get_pan())
            if pan:
                validation_result = company_services['tds'].validate_pan(pan)
                if validation_result.get('valid'):
                    result = {'success': True, 'message': 'PAN validation successful', 'data': validation_result}
                else:
                    result = {'success': False, 'message': 'PAN validation failed', 'data': validation_result}
            else:
                result = {'success': False, 'message': 'PAN required for validation test'}
        
        # Update credential validation status
        if result['success']:
            credential.is_validated = True
            credential.last_validated = timezone.now()
            credential.validation_error = ''
        else:
            credential.is_validated = False
            credential.validation_error = result['message']
        
        credential.save()
        
        # Log test
        CompanyGovernmentCredentialLog.objects.create(
            credential=credential,
            action='validate',
            user_email=request.user.email,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details=f"Tested {credential.get_api_type_display()} credentials - {test_type}",
            success=result['success'],
            error_message=result['message'] if not result['success'] else ''
        )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Error testing government API credentials: {str(e)}")
        return Response(
            {'error': 'Failed to test credentials'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_credential_audit_logs(request, credential_id):
    """Get audit logs for specific credential"""
    try:
        company = request.user.company_user.company
        credential = get_object_or_404(
            CompanyGovernmentCredentials,
            id=credential_id,
            company=company
        )
        
        logs = CompanyGovernmentCredentialLog.objects.filter(
            credential=credential
        ).order_by('-timestamp')[:50]  # Last 50 logs
        
        serializer = CompanyGovernmentCredentialLogSerializer(logs, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Error fetching credential audit logs: {str(e)}")
        return Response(
            {'error': 'Failed to fetch audit logs'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_api_configuration_templates(request):
    """Get configuration templates for different government APIs"""
    
    templates = {
        'gst': {
            'name': 'GST API',
            'description': 'Goods and Services Tax API for filing returns and validation',
            'required_fields': ['client_id', 'client_secret', 'username', 'gstin'],
            'optional_fields': ['password'],
            'environments': {
                'sandbox': {
                    'base_url': 'https://api.sandbox.gst.gov.in',
                    'description': 'Testing environment'
                },
                'production': {
                    'base_url': 'https://api.gst.gov.in',
                    'description': 'Live production environment'
                }
            },
            'test_options': ['connection', 'validate_gstin', 'get_rates']
        },
        'tds': {
            'name': 'TDS/Income Tax API',
            'description': 'Tax Deducted at Source and Income Tax API',
            'required_fields': ['username', 'password', 'pan', 'tan'],
            'optional_fields': ['api_key'],
            'environments': {
                'sandbox': {
                    'base_url': 'https://incometaxindiaefiling.gov.in/api/test',
                    'description': 'Testing environment'
                },
                'production': {
                    'base_url': 'https://incometaxindiaefiling.gov.in/api',
                    'description': 'Live production environment'
                }
            },
            'test_options': ['connection', 'validate_pan', 'get_rates']
        },
        'einvoice': {
            'name': 'E-Invoice API',
            'description': 'Electronic Invoice generation and IRN management',
            'required_fields': ['client_id', 'client_secret', 'gstin'],
            'optional_fields': ['username', 'password'],
            'environments': {
                'sandbox': {
                    'base_url': 'https://einvoice1.gst.gov.in/test',
                    'description': 'Testing environment'
                },
                'production': {
                    'base_url': 'https://einvoice1.gst.gov.in',
                    'description': 'Live production environment'
                }
            },
            'test_options': ['connection']
        },
        'eway_bill': {
            'name': 'E-Way Bill API',
            'description': 'Electronic Way Bill generation and management',
            'required_fields': ['username', 'password', 'gstin'],
            'optional_fields': ['api_key'],
            'environments': {
                'sandbox': {
                    'base_url': 'https://ewaybillapi.nic.in/test',
                    'description': 'Testing environment'
                },
                'production': {
                    'base_url': 'https://ewaybillapi.nic.in',
                    'description': 'Live production environment'
                }
            },
            'test_options': ['connection']
        }
    }
    
    return Response(templates)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_credentials_summary(request):
    """Get summary of all government API credentials for company"""
    try:
        company = request.user.company_user.company
        credentials = CompanyGovernmentCredentials.objects.filter(company=company)
        
        summary = {
            'total_credentials': credentials.count(),
            'active_credentials': credentials.filter(is_active=True).count(),
            'validated_credentials': credentials.filter(is_validated=True).count(),
            'by_api_type': {},
            'by_environment': {},
            'recent_activity': []
        }
        
        # Group by API type
        for api_type, display_name in CompanyGovernmentCredentials.API_TYPES:
            count = credentials.filter(api_type=api_type).count()
            if count > 0:
                summary['by_api_type'][api_type] = {
                    'name': display_name,
                    'count': count,
                    'active': credentials.filter(api_type=api_type, is_active=True).count(),
                    'validated': credentials.filter(api_type=api_type, is_validated=True).count()
                }
        
        # Group by environment
        for env, display_name in CompanyGovernmentCredentials.ENVIRONMENTS:
            count = credentials.filter(environment=env).count()
            if count > 0:
                summary['by_environment'][env] = {
                    'name': display_name,
                    'count': count,
                    'active': credentials.filter(environment=env, is_active=True).count()
                }
        
        # Recent activity
        recent_logs = CompanyGovernmentCredentialLog.objects.filter(
            credential__company=company
        ).order_by('-timestamp')[:10]
        
        for log in recent_logs:
            summary['recent_activity'].append({
                'action': log.get_action_display(),
                'api_type': log.credential.get_api_type_display(),
                'user_email': log.user_email,
                'timestamp': log.timestamp,
                'success': log.success
            })
        
        return Response(summary)
        
    except Exception as e:
        logger.error(f"Error fetching credentials summary: {str(e)}")
        return Response(
            {'error': 'Failed to fetch credentials summary'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )