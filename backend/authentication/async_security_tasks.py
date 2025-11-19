"""
Asynchronous Security Tasks
==========================
Move heavy security operations to background tasks
"""
from celery import shared_task
from django.utils import timezone
from .models import MasterAdmin, CompanyUser
from .login_notification_service import LoginNotificationService
from company_dashboard.threat_detection_engine import threat_monitor
from company_dashboard.geolocation_service import geolocation_service
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_login_notification_async(self, master_admin_id, request_data):
    """Send login notification email asynchronously"""
    try:
        master_admin = MasterAdmin.objects.get(id=master_admin_id)
        
        # Reconstruct minimal request object
        class MockRequest:
            def __init__(self, data):
                self.META = data.get('META', {})
        
        mock_request = MockRequest(request_data)
        
        # Send notification
        result = LoginNotificationService.create_and_send_notification(
            master_admin, mock_request
        )
        
        logger.info(f"Login notification sent for {master_admin.user.email}: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Login notification failed: {exc}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60, exc=exc)
        return False

@shared_task(bind=True, max_retries=2)
def run_threat_detection_async(self, company_id, user_email, ip_address, user_agent, success):
    """Run AI threat detection asynchronously"""
    try:
        from authentication.models import Company
        company = Company.objects.get(id=company_id)
        
        threats = threat_monitor.monitor_login_attempt(
            company, user_email, ip_address, user_agent, success
        )
        
        logger.info(f"Threat detection completed for {user_email}: {len(threats)} threats")
        return len(threats)
        
    except Exception as exc:
        logger.error(f"Threat detection failed: {exc}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=30, exc=exc)
        return 0

@shared_task(bind=True, max_retries=2)
def send_company_login_alert_async(self, company_id, user_email, ip_address, device_info):
    """Send company login alert asynchronously"""
    try:
        from authentication.models import Company
        from company_dashboard.email_alert_service import CompanyEmailAlertService
        
        company = Company.objects.get(id=company_id)
        email_service = CompanyEmailAlertService(company)
        
        if email_service.can_send_emails():
            result = email_service.send_login_alert(
                user_email=user_email,
                ip_address=ip_address,
                location=f"Location for {ip_address}",
                device_info=device_info,
                admin_email=email_service.email_settings.smtp_username
            )
            logger.info(f"Company login alert sent: {result}")
            return result
        
        return False
        
    except Exception as exc:
        logger.error(f"Company login alert failed: {exc}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=30, exc=exc)
        return False

@shared_task(bind=True, max_retries=2)
def update_device_fingerprint_async(self, user_id, user_type, request_data):
    """Update device fingerprint asynchronously"""
    try:
        if user_type == 'master_admin':
            user = MasterAdmin.objects.get(id=user_id)
        else:
            user = CompanyUser.objects.get(id=user_id)
        
        # Reconstruct minimal request object
        class MockRequest:
            def __init__(self, data):
                self.META = data.get('META', {})
        
        mock_request = MockRequest(request_data)
        
        # Update device fingerprint
        if user_type == 'master_admin':
            from .device_fingerprint_utils import create_or_update_device_fingerprint
            device = create_or_update_device_fingerprint(user, mock_request)
        else:
            from company_dashboard.device_management_views import DeviceManagementView
            device_view = DeviceManagementView()
            fingerprint_data = {
                'userAgent': request_data.get('META', {}).get('HTTP_USER_AGENT', ''),
                'screen': '',
                'timezone': '',
                'language': '',
                'platform': ''
            }
            device_view._register_device_fingerprint(
                user, fingerprint_data, request_data.get('ip_address', '127.0.0.1')
            )
        
        logger.info(f"Device fingerprint updated for {user_type}")
        return True
        
    except Exception as exc:
        logger.error(f"Device fingerprint update failed: {exc}")
        return False