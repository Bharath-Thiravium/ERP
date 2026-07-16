from django.db import transaction
from django.db.models import Sum
from django.db.models.signals import post_delete, post_save
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


def _sync_payroll_cycle_after_payslip_delete(payroll_cycle_id):
    from .models import PayrollCycle, Payslip

    try:
        cycle = PayrollCycle.objects.get(id=payroll_cycle_id)
    except PayrollCycle.DoesNotExist:
        return

    payslips = Payslip.objects.filter(payroll_cycle=cycle)
    if not payslips.exists():
        cycle.delete()
        return

    totals = payslips.aggregate(
        total_gross=Sum('gross_salary'),
        total_deductions=Sum('total_deductions'),
        total_net=Sum('net_salary'),
    )
    cycle.total_employees = payslips.count()
    cycle.total_gross = totals['total_gross'] or 0
    cycle.total_deductions = totals['total_deductions'] or 0
    cycle.total_net = totals['total_net'] or 0
    cycle.save(update_fields=['total_employees', 'total_gross', 'total_deductions', 'total_net', 'updated_at'])


@receiver(post_delete, sender='hr.Payslip')
def sync_payroll_cycle_after_payslip_delete(sender, instance, **kwargs):
    payroll_cycle_id = instance.payroll_cycle_id
    if payroll_cycle_id:
        transaction.on_commit(lambda: _sync_payroll_cycle_after_payslip_delete(payroll_cycle_id))
