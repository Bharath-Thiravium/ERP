"""
Login Notification Email Service
================================
Service for sending login notification emails to Master Admin
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from django.conf import settings
from django.utils import timezone
from .enhanced_security_models import LoginNotification, SecuritySettings
import logging

logger = logging.getLogger(__name__)


class LoginNotificationService:
    """Service for sending login notification emails"""
    
    @staticmethod
    def should_send_notification(master_admin):
        """Check if login notifications are enabled"""
        try:
            settings_obj, created = SecuritySettings.objects.get_or_create(
                master_admin=master_admin,
                defaults={'login_notifications_enabled': True}
            )
            print(f'🔔 Login notifications enabled: {settings_obj.login_notifications_enabled} for {master_admin.user.email}')
            return settings_obj.login_notifications_enabled
        except Exception as e:
            print(f'❌ Error checking notification settings: {str(e)}')
            return False
    
    @staticmethod
    def get_notification_email(master_admin):
        """Get email address for notifications"""
        try:
            # Use get_or_create to ensure SecuritySettings exists
            settings, created = SecuritySettings.objects.get_or_create(
                master_admin=master_admin,
                defaults={'login_notifications_enabled': True}
            )
            
            # Priority order for notification email:
            # 1. Custom notification_email from SecuritySettings
            # 2. Email address from MasterAdminEmailSettings (if configured)
            # 3. Account email as fallback
            
            # First check SecuritySettings notification_email
            if settings.notification_email:
                return settings.notification_email
            
            # Check if email settings are configured and use that email
            try:
                from .email_settings_models import MasterAdminEmailSettings
                email_settings = MasterAdminEmailSettings.objects.get(
                    master_admin=master_admin,
                    is_active=True
                )
                return email_settings.email_address
            except MasterAdminEmailSettings.DoesNotExist:
                # Fallback to account email
                return master_admin.user.email
            
        except Exception as e:
            logger.error(f"Error getting notification email for {master_admin.user.email}: {str(e)}")
            return master_admin.user.email
    
    @staticmethod
    def create_and_send_notification(master_admin, request):
        """Create login notification record and send email"""
        try:
            print(f'📧 Starting login notification process for {master_admin.user.email}')
            
            if not LoginNotificationService.should_send_notification(master_admin):
                print(f'❌ Login notifications disabled for {master_admin.user.email}')
                return False
            
            # Get device and location info
            from .device_fingerprint_utils import get_device_info, get_client_ip
            device_info = get_device_info(request)
            ip_address = get_client_ip(request)
            location = LoginNotificationService._get_location_from_ip(ip_address)
            
            print(f'📍 Device info: {device_info}')
            print(f'🌍 Location: {location} (IP: {ip_address})')
            
            # Create notification record
            notification = LoginNotification.objects.create(
                master_admin=master_admin,
                email_sent=False,
                ip_address=ip_address,
                location=location,
                device_info=f"{device_info['device_name']} - {device_info['user_agent'][:100]}"
            )
            
            print(f'✅ Created notification record with ID: {notification.id}')
            
            # Send email
            email_sent = LoginNotificationService._send_notification_email(
                master_admin, notification, device_info
            )
            
            # Update notification record
            notification.email_sent = email_sent
            notification.save()
            
            print(f'📧 Email sent status: {email_sent}')
            return email_sent
            
        except Exception as e:
            logger.error(f"Failed to create login notification: {e}")
            print(f'❌ Login notification exception: {str(e)}')
            return False
    
    @staticmethod
    def _get_location_from_ip(ip_address):
        """Get approximate location from IP address"""
        # Simple implementation - you can integrate with IP geolocation services
        if ip_address in ['127.0.0.1', 'localhost']:
            return 'Local Development'
        
        # Validate IP address format to prevent SSRF
        import ipaddress
        try:
            ip_obj = ipaddress.ip_address(ip_address)
            # Block private/internal IP ranges
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved:
                return 'Private Network'
        except ValueError:
            return 'Invalid IP'
        
        # Disabled external API calls for security - implement with proper validation
        return 'External Location'
    
    @staticmethod
    def _send_notification_email(master_admin, notification, device_info):
        """Send login notification email"""
        try:
            to_email = LoginNotificationService.get_notification_email(master_admin)
            
            # Check if Master Admin email settings are configured
            from .email_settings_models import MasterAdminEmailSettings
            try:
                email_settings = MasterAdminEmailSettings.objects.get(
                    master_admin=master_admin,
                    is_active=True
                )
            except MasterAdminEmailSettings.DoesNotExist:
                logger.error(f"No active email settings found for {master_admin.user.email}")
                return False
            
            # Use Master Admin email service
            from .email_service import MasterAdminEmailService
            email_service = MasterAdminEmailService()
            
            login_data = {
                'timestamp': notification.timestamp,
                'ip_address': notification.ip_address,
                'user_agent': device_info.get('user_agent', ''),
                'device_info': notification.device_info,
                'location': notification.location
            }
            
            print(f'📧 Attempting to send login notification to {to_email}')
            result = email_service.send_login_notification(
                to_email=to_email,
                login_data=login_data,
                master_admin=master_admin
            )
            
            if result:
                print(f'✅ Login notification sent successfully to {to_email}')
            else:
                print(f'❌ Failed to send login notification to {to_email}')
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to send login notification email: {e}")
            print(f'❌ Login notification exception: {str(e)}')
            return False
    
    @staticmethod
    def _send_email(to_email, subject, html_content, text_content):
        """Send email using SMTP or Django email backend"""
        try:
            # Try Django email backend first
            from django.core.mail import EmailMultiAlternatives
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@athenasap.com'),
                to=[to_email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            return True
            
        except Exception as e:
            logger.error(f"Django email failed, trying SMTP: {e}")
            
            # Fallback to direct SMTP
            try:
                return LoginNotificationService._send_via_smtp(to_email, subject, html_content, text_content)
            except Exception as smtp_error:
                logger.error(f"SMTP email also failed: {smtp_error}")
                return False
    
    @staticmethod
    def _send_via_smtp(to_email, subject, html_content, text_content):
        """Send email via direct SMTP"""
        # SMTP Configuration - you can move these to Django settings
        SMTP_HOST = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        SMTP_PORT = getattr(settings, 'EMAIL_PORT', 587)
        SMTP_USER = getattr(settings, 'EMAIL_HOST_USER', '')
        SMTP_PASSWORD = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        SMTP_USE_TLS = getattr(settings, 'EMAIL_USE_TLS', True)
        
        if not SMTP_USER or not SMTP_PASSWORD:
            logger.error("SMTP credentials not configured")
            return False
        
        msg = MIMEMultipart('alternative')
        msg['From'] = formataddr(('AthenaSAP Security', SMTP_USER))
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add text and HTML parts
        text_part = MIMEText(text_content, 'plain', 'utf-8')
        html_part = MIMEText(html_content, 'html', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email
        context = ssl.create_default_context()
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls(context=context)
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        return True


# Convenience function
def send_login_notification(master_admin, request):
    """Send login notification for master admin"""
    return LoginNotificationService.create_and_send_notification(master_admin, request)