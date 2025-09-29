from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import CompanyEmailSettings
from .email_service import CompanyEmailService
from .serializers import CompanyEmailSettingsSerializer
import logging

logger = logging.getLogger(__name__)

class CompanyEmailSettingsView(generics.RetrieveUpdateAPIView):
    """Get, create, or update company email settings"""
    serializer_class = CompanyEmailSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        try:
            if not hasattr(self.request.user, 'company_user'):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("User is not associated with a company")
            
            company = self.request.user.company_user.company
            
            try:
                return CompanyEmailSettings.objects.get(company=company)
            except CompanyEmailSettings.DoesNotExist:
                # Create new settings if they don't exist
                return CompanyEmailSettings.objects.create(
                    company=company,
                    from_email=company.email,
                    from_name=company.name,
                    email_provider='gmail'
                )
        except Exception as e:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"Error accessing company email settings: {str(e)}")
    
    def perform_update(self, serializer):
        # Log email settings update
        company = self.request.user.company_user.company
        logger.info(f"Email settings updated for company {company.name}")
        serializer.save()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_email_configuration(request):
    """Test company email configuration"""
    try:
        print(f"🔍 DEBUG: Test email - User: {request.user.email}")
        print(f"🔍 DEBUG: Has company_user: {hasattr(request.user, 'company_user')}")
        
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'success': False, 'error': 'User is not associated with a company'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        company = request.user.company_user.company
        print(f"🔍 DEBUG: Company: {company.name}")
        email_service = CompanyEmailService(company)
        
        if not email_service.email_settings:
            return Response(
                {'success': False, 'error': 'No email settings configured'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = email_service.test_email_configuration()
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Email test failed for company {company.name}: {str(e)}")
        return Response(
            {'success': False, 'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def email_provider_templates(request):
    """Get email provider configuration templates"""
    
    templates = {
        'gmail': {
            'name': 'Gmail',
            'smtp_host': 'smtp.gmail.com',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': [
                'Enable 2-factor authentication on your Gmail account',
                'Generate an App Password for this application',
                'Use your Gmail address as username',
                'Use the App Password (not your regular password)'
            ],
            'help_url': 'https://support.google.com/accounts/answer/185833'
        },
        'outlook': {
            'name': 'Outlook/Hotmail',
            'smtp_host': 'smtp-mail.outlook.com',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': [
                'Use your full Outlook email address as username',
                'Use your regular Outlook password',
                'Ensure SMTP is enabled in your Outlook settings'
            ],
            'help_url': 'https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353'
        },
        'yahoo': {
            'name': 'Yahoo Mail',
            'smtp_host': 'smtp.mail.yahoo.com',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': [
                'Enable 2-step verification on your Yahoo account',
                'Generate an App Password for this application',
                'Use your Yahoo email address as username',
                'Use the App Password (not your regular password)'
            ],
            'help_url': 'https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html'
        },
        'hostinger': {
            'name': 'Hostinger Email',
            'smtp_host': 'smtp.hostinger.com',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': [
                'Use your full Hostinger email address as username',
                'Use your email account password',
                'Ensure SMTP is enabled in your Hostinger control panel',
                'For custom domains, use your domain email address'
            ],
            'help_url': 'https://support.hostinger.com/en/articles/1583229-how-to-set-up-an-email-client'
        },
        'sendgrid': {
            'name': 'SendGrid',
            'api_based': True,
            'instructions': [
                'Sign up for a SendGrid account',
                'Create an API key with Mail Send permissions',
                'Verify your sender identity',
                'Use the API key in the configuration'
            ],
            'help_url': 'https://docs.sendgrid.com/for-developers/sending-email/quickstart-python'
        },
        'mailgun': {
            'name': 'Mailgun',
            'api_based': True,
            'instructions': [
                'Sign up for a Mailgun account',
                'Add and verify your domain',
                'Get your API key from the dashboard',
                'Use your domain name as SMTP host'
            ],
            'help_url': 'https://documentation.mailgun.com/en/latest/quickstart.html'
        },
        'ses': {
            'name': 'Amazon SES',
            'api_based': True,
            'instructions': [
                'Set up AWS account and SES service',
                'Verify your email address or domain',
                'Create IAM user with SES permissions',
                'Use Access Key ID and Secret Access Key'
            ],
            'help_url': 'https://docs.aws.amazon.com/ses/latest/dg/send-email-getting-started.html'
        },
        'custom_smtp': {
            'name': 'Custom SMTP',
            'smtp_host': '',
            'smtp_port': 587,
            'use_tls': True,
            'use_ssl': False,
            'instructions': [
                'Get SMTP settings from your email provider',
                'Enter the correct host, port, and credentials',
                'Choose appropriate TLS/SSL settings',
                'Test the configuration before saving'
            ]
        }
    }
    
    return Response(templates)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def email_usage_stats(request):
    """Get email usage statistics for the company"""
    try:
        print(f"🔍 DEBUG: Email usage - User: {request.user.email}")
        print(f"🔍 DEBUG: Has company_user: {hasattr(request.user, 'company_user')}")
        
        if not hasattr(request.user, 'company_user'):
            return Response(
                {'error': 'User is not associated with a company'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        company = request.user.company_user.company
        print(f"🔍 DEBUG: Company: {company.name}")
        
        try:
            email_settings = CompanyEmailSettings.objects.get(company=company)
            email_settings.reset_daily_count_if_needed()
            
            stats = {
                'daily_limit': email_settings.daily_limit,
                'emails_sent_today': email_settings.emails_sent_today,
                'remaining_today': email_settings.daily_limit - email_settings.emails_sent_today,
                'is_active': email_settings.is_active,
                'is_verified': email_settings.is_verified,
                'provider': email_settings.email_provider,
                'from_email': email_settings.from_email,
                'last_test_status': email_settings.test_status,
                'last_test_sent': email_settings.last_test_sent
            }
            
        except CompanyEmailSettings.DoesNotExist:
            stats = {
                'daily_limit': 0,
                'emails_sent_today': 0,
                'remaining_today': 0,
                'is_active': False,
                'is_verified': False,
                'provider': None,
                'from_email': None,
                'last_test_status': 'not_configured',
                'last_test_sent': None
            }
        
        return Response(stats)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )