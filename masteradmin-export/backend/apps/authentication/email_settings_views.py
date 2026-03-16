from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
from .models import MasterAdmin
from .email_settings_models import MasterAdminEmailSettings
from .serializers import MasterAdminEmailSettingsSerializer
import logging

logger = logging.getLogger(__name__)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def master_admin_email_settings_view(request):
    """Master Admin Email Settings Management"""
    try:
        master_admin = MasterAdmin.objects.get(user=request.user)
    except MasterAdmin.DoesNotExist:
        return Response({'error': 'Master admin not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        try:
            email_settings = master_admin.email_settings
            serializer = MasterAdminEmailSettingsSerializer(email_settings)
            return Response(serializer.data)
        except MasterAdminEmailSettings.DoesNotExist:
            # Create default settings if none exist
            email_settings = MasterAdminEmailSettings.objects.create(
                master_admin=master_admin,
                provider='gmail',
                email_address='',
                email_password=User.objects.make_random_password(),  # Generate secure password
                from_name='SAP System Security',
                is_active=False
            )
            serializer = MasterAdminEmailSettingsSerializer(email_settings)
            return Response(serializer.data)
    
    elif request.method == 'POST':
        try:
            email_settings, created = MasterAdminEmailSettings.objects.get_or_create(
                master_admin=master_admin
            )
            
            serializer = MasterAdminEmailSettingsSerializer(
                email_settings, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                saved_settings = serializer.save()
                return Response(MasterAdminEmailSettingsSerializer(saved_settings).data)
            else:
                return Response({
                    'error': 'Invalid data',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error saving email settings: {str(e)}")
            return Response({
                'error': 'Failed to save email settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_master_admin_email_view(request):
    """Test Master Admin Email Configuration"""
    try:
        master_admin = MasterAdmin.objects.get(user=request.user)
        email_settings = master_admin.email_settings
        
        if not email_settings.is_active:
            return Response({
                'error': 'Email settings are not active'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Test email
        test_email = request.data.get('test_email', master_admin.user.email)
        
        try:
            from .email_service import MasterAdminEmailService
            email_service = MasterAdminEmailService()
            
            success = email_service.send_test_email(
                to_email=test_email,
                master_admin=master_admin
            )
            
            if success:
                return Response({
                    'message': f'Test email sent successfully to {test_email}'
                })
            else:
                return Response({
                    'error': 'Failed to send test email'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error sending test email: {str(e)}")
            return Response({
                'error': f'Email test failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except MasterAdmin.DoesNotExist:
        return Response({'error': 'Master admin not found'}, status=status.HTTP_404_NOT_FOUND)
    except MasterAdminEmailSettings.DoesNotExist:
        return Response({
            'error': 'Email settings not configured'
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def email_provider_templates_view(request):
    """Get Email Provider Templates"""
    templates = {
        'gmail': {
            'name': 'Gmail',
            'smtp_host': 'smtp.gmail.com',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': 'Use your Gmail address and App Password (not regular password)',
            'help_url': 'https://support.google.com/accounts/answer/185833'
        },
        'outlook': {
            'name': 'Outlook/Hotmail',
            'smtp_host': 'smtp-mail.outlook.com',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': 'Use your Outlook/Hotmail address and password',
            'help_url': 'https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353'
        },
        'yahoo': {
            'name': 'Yahoo Mail',
            'smtp_host': 'smtp.mail.yahoo.com',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': 'Use your Yahoo address and App Password',
            'help_url': 'https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html'
        },
        'hostinger': {
            'name': 'Hostinger',
            'smtp_host': 'smtp.hostinger.com',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': 'Use your Hostinger email address and password',
            'help_url': 'https://support.hostinger.com/en/articles/1583229-how-to-set-up-an-email-account'
        },
        'godaddy': {
            'name': 'GoDaddy',
            'smtp_host': 'smtpout.secureserver.net',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': 'Use your GoDaddy email address and password',
            'help_url': 'https://www.godaddy.com/help/server-and-port-settings-for-workspace-email-6949'
        },
        'custom': {
            'name': 'Custom SMTP',
            'smtp_host': '',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': 'Enter your custom SMTP server details',
            'help_url': ''
        }
    }
    
    return Response({'data': templates})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def email_usage_stats_view(request):
    """Get Email Usage Statistics"""
    try:
        master_admin = MasterAdmin.objects.get(user=request.user)
        email_settings = master_admin.email_settings
        
        stats = {
            'emails_sent_today': email_settings.emails_sent_today,
            'total_emails_sent': email_settings.total_emails_sent,
            'last_email_sent': email_settings.last_email_sent,
            'is_active': email_settings.is_active,
            'provider': email_settings.get_provider_display(),
            'from_email': email_settings.email_address,
            'from_name': email_settings.from_name,
        }
        
        return Response({'data': stats})
        
    except MasterAdmin.DoesNotExist:
        return Response({'error': 'Master admin not found'}, status=status.HTTP_404_NOT_FOUND)
    except MasterAdminEmailSettings.DoesNotExist:
        return Response({'data': None})