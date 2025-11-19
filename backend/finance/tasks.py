from celery import shared_task
from django.utils import timezone
from .email_automation_service import process_all_email_automations, process_company_email_automations
import logging

logger = logging.getLogger(__name__)

@shared_task
def process_email_automations_task():
    """Celery task to process email automations for all companies"""
    try:
        logger.info("Starting email automation processing task")
        process_all_email_automations()
        logger.info("Email automation processing task completed successfully")
        return "Email automations processed successfully"
    except Exception as e:
        logger.error(f"Email automation processing task failed: {str(e)}")
        raise e

@shared_task
def process_company_email_automations_task(company_id):
    """Celery task to process email automations for a specific company"""
    try:
        logger.info(f"Starting email automation processing for company {company_id}")
        process_company_email_automations(company_id)
        logger.info(f"Email automation processing completed for company {company_id}")
        return f"Email automations processed for company {company_id}"
    except Exception as e:
        logger.error(f"Email automation processing failed for company {company_id}: {str(e)}")
        raise e