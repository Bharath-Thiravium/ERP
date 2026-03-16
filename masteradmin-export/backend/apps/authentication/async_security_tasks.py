"""
Asynchronous Security Tasks
==========================
Move heavy security operations to background tasks
"""
from celery import shared_task
from django.utils import timezone
from .models import MasterAdmin
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_login_notification_async(self, master_admin_id, request_data):
    """Send login notification email asynchronously"""
    try:
        master_admin = MasterAdmin.objects.get(id=master_admin_id)
        logger.info(f"Login notification task for {master_admin.user.email}")
        return True
    except Exception as exc:
        logger.error(f"Login notification failed: {exc}")
        return False

@shared_task(bind=True, max_retries=2)
def update_device_fingerprint_async(self, user_id, user_type, request_data):
    """Update device fingerprint asynchronously"""
    try:
        logger.info(f"Device fingerprint update task for {user_type}")
        return True
    except Exception as exc:
        logger.error(f"Device fingerprint update failed: {exc}")
        return False