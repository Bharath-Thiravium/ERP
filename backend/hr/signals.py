from django.db.models.signals import post_save
from django.dispatch import receiver
from authentication.models import Company
from .form_automation_service import FormAutomationService
from .tasks import setup_company_form_templates_task
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Company)
def setup_form_templates_for_new_company(sender, instance, created, **kwargs):
    """
    Automatically setup form templates when a new company is created
    """
    if created:
        try:
            # Setup templates asynchronously
            setup_company_form_templates_task.delay(instance.id)
            logger.info(f'Scheduled form template setup for new company: {instance.name}')
        except Exception as e:
            logger.error(f'Error scheduling template setup for company {instance.id}: {str(e)}')
            # Fallback to synchronous setup
            try:
                FormAutomationService.setup_default_templates(instance)
                logger.info(f'Fallback: Setup form templates for company: {instance.name}')
            except Exception as fallback_error:
                logger.error(f'Fallback failed for company {instance.id}: {str(fallback_error)}')