from celery import shared_task
from django.utils import timezone
from datetime import datetime, timedelta
from authentication.models import Company
from .models import Employee
from .compliance_engine import ComplianceEngine
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_compliance_checks():
    """Run daily compliance checks for all companies"""
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            engine = ComplianceEngine(company)
            alerts = engine.run_compliance_checks()
            logger.info(f"Generated {len(alerts)} compliance alerts for {company.name}")
        except Exception as e:
            logger.error(f"Error running compliance checks for {company.name}: {str(e)}")

@shared_task
def generate_monthly_ecr():
    """Direct users to the approved-payslip government return workflow."""
    logger.warning(
        "Legacy scheduled ECR generation is disabled. Generate PF ECR from "
        "Statutory > Government Returns after payroll approval."
    )
    return {'status': 'disabled', 'reason': 'approved_payroll_required'}

@shared_task
def generate_monthly_esi_report():
    """Direct users to the approved-payslip government return workflow."""
    logger.warning(
        "Legacy scheduled ESI generation is disabled. Generate the ESI return "
        "from Statutory > Government Returns after payroll approval."
    )
    return {'status': 'disabled', 'reason': 'approved_payroll_required'}

@shared_task
def submit_government_returns():
    """Keep filing explicit until an approved government API is configured.

    Returns are generated in the dashboard and marked filed only after the user
    records the official portal acknowledgment. An unattended task must never
    claim that a statutory return was submitted.
    """
    logger.warning(
        "Automatic government return submission is disabled. Generate the "
        "return, file it on the official portal, and record its acknowledgment."
    )
    return {'status': 'disabled', 'reason': 'official_acknowledgment_required'}

@shared_task
def send_compliance_reminders():
    """Send compliance reminders to HR teams"""
    from django.core.mail import send_mail
    from django.conf import settings
    
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            # Get pending compliance items
            engine = ComplianceEngine(company)
            alerts = engine.run_compliance_checks()
            
            if alerts:
                # Send email reminder
                subject = f"Compliance Reminders - {company.name}"
                message = f"You have {len(alerts)} pending compliance items."
                
                hr_emails = list(
                    company.service_users.filter(
                        service__name__icontains='human',
                        is_active=True,
                        role__in=['admin', 'manager'],
                    ).exclude(email='').values_list('email', flat=True).distinct()
                )
                if not hr_emails:
                    hr_emails = [
                        email for email in [company.contact_person_email, company.email]
                        if email
                    ]
                if not hr_emails:
                    logger.warning(
                        "Skipped compliance reminder for %s: no HR/company email configured",
                        company.name,
                    )
                    continue
                
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    hr_emails,
                    fail_silently=False,
                )
                
                logger.info(f"Sent compliance reminders to {company.name}")
        except Exception as e:
            logger.error(f"Error sending reminders for {company.name}: {str(e)}")

@shared_task
def backup_statutory_data():
    """Backup statutory data for compliance"""
    from django.core.management import call_command
    import os
    
    try:
        # Create backup directory
        backup_dir = f"/tmp/statutory_backup_{timezone.now().strftime('%Y%m%d')}"
        os.makedirs(backup_dir, exist_ok=True)
        
        # Backup statutory models
        call_command('dumpdata', 'hr.statutorysettings', 'hr.employeestatutorydetails', 
                    'hr.payslipstatutorydetails', 'hr.governmentreturn', 'hr.compliancealert',
                    output=f"{backup_dir}/statutory_data.json")
        
        logger.info(f"Statutory data backed up to {backup_dir}")
    except Exception as e:
        logger.error(f"Error backing up statutory data: {str(e)}")

@shared_task
def generate_compliance_reports():
    """Generate monthly compliance reports"""
    from .advanced_reports import AdvancedReportGenerator
    
    companies = Company.objects.filter(is_active=True)
    current_month = timezone.now().month
    current_year = timezone.now().year
    
    for company in companies:
        try:
            generator = AdvancedReportGenerator(company)
            
            # Generate statutory summary report
            summary_report = generator.generate_statutory_summary_report(current_month, current_year)
            
            # Generate compliance scorecard
            scorecard = generator.generate_compliance_scorecard()
            
            logger.info(f"Generated compliance reports for {company.name}")
        except Exception as e:
            logger.error(f"Error generating reports for {company.name}: {str(e)}")

@shared_task
def sync_employee_data():
    """Report that government employee sync is unavailable.

    This task previously logged a successful sync without transmitting data.
    """
    logger.warning(
        "Government employee sync is disabled because no approved connector is configured."
    )
    return {'status': 'disabled', 'reason': 'connector_not_configured'}

@shared_task
def validate_statutory_calculations():
    """Validate statutory calculations for accuracy"""
    from .statutory_calculations import StatutoryCalculator
    
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            calculator = StatutoryCalculator(company)
            employees = Employee.objects.filter(company=company, status='active')
            
            validation_errors = []
            
            for employee in employees:
                # Validate PF calculation
                pf_result = calculator.calculate_pf(employee, employee.base_salary)
                if pf_result['employee_pf'] < 0 or pf_result['employer_pf'] < 0:
                    validation_errors.append(f"Invalid PF calculation for {employee.first_name}")
                
                # Validate ESI calculation
                esi_result = calculator.calculate_esi(
                    employee,
                    employee.base_salary,
                    eligibility_wages=employee.base_salary,
                )
                if esi_result['employee_esi'] < 0 or esi_result['employer_esi'] < 0:
                    validation_errors.append(f"Invalid ESI calculation for {employee.first_name}")
            
            if validation_errors:
                logger.warning(f"Validation errors for {company.name}: {validation_errors}")
            else:
                logger.info(f"All statutory calculations validated for {company.name}")
                
        except Exception as e:
            logger.error(f"Error validating calculations for {company.name}: {str(e)}")

@shared_task
def cleanup_old_alerts():
    """Cleanup old compliance alerts"""
    from .statutory_models import ComplianceAlert
    
    try:
        # Delete alerts older than 90 days
        cutoff_date = timezone.now() - timedelta(days=90)
        deleted_count = ComplianceAlert.objects.filter(created_at__lt=cutoff_date).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old compliance alerts")
    except Exception as e:
        logger.error(f"Error cleaning up old alerts: {str(e)}")

@shared_task
def update_statutory_rates():
    """Never overwrite company-approved statutory rates with mock values."""
    logger.warning(
        "Automatic statutory rate updates are disabled. Rates require an "
        "authoritative source review and company approval."
    )
    return {'status': 'disabled', 'reason': 'authoritative_source_required'}

# Form Automation Tasks
@shared_task
def generate_monthly_forms_task(company_id=None, month_date=None):
    """
    Celery task to generate monthly compliance forms
    """
    from .form_automation_service import FormAutomationService
    
    try:
        if month_date is None:
            month_date = timezone.now().date().replace(day=1)
        elif isinstance(month_date, str):
            month_date = datetime.strptime(month_date, '%Y-%m-%d').date()
        
        if company_id:
            companies = Company.objects.filter(id=company_id, is_active=True)
        else:
            companies = Company.objects.filter(is_active=True)
        
        total_generated = 0
        
        for company in companies:
            try:
                # Setup default templates if not exists
                FormAutomationService.setup_default_templates(company)
                
                # Generate forms
                generated_forms = FormAutomationService.generate_monthly_forms(
                    company.id, 
                    month_date
                )
                
                total_generated += len(generated_forms)
                
                logger.info(f'Generated {len(generated_forms)} forms for company {company.name}')
                
            except Exception as e:
                logger.error(f'Error generating forms for company {company.id}: {str(e)}')
        
        logger.info(f'Monthly forms generation completed. Total generated: {total_generated}')
        return {
            'success': True,
            'total_generated': total_generated,
            'companies_processed': companies.count()
        }
        
    except Exception as e:
        logger.error(f'Error in generate_monthly_forms_task: {str(e)}')
        return {
            'success': False,
            'error': str(e)
        }

@shared_task
def setup_company_form_templates_task(company_id):
    """
    Setup default form templates for a new company
    """
    from .form_automation_service import FormAutomationService
    
    try:
        company = Company.objects.get(id=company_id)
        templates = FormAutomationService.setup_default_templates(company)
        
        logger.info(f'Setup {len(templates)} form templates for company {company.name}')
        
        return {
            'success': True,
            'templates_created': len(templates)
        }
        
    except Exception as e:
        logger.error(f'Error setting up templates for company {company_id}: {str(e)}')
        return {
            'success': False,
            'error': str(e)
        }
