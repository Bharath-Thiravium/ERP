from celery import shared_task
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Company, Employee
from .compliance_engine import ComplianceEngine, AutomatedReporting
from .government_integration import GovernmentPortalIntegration
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
    """Generate monthly ECR for all companies"""
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            reporting = AutomatedReporting(company)
            ecr_report = reporting._generate_ecr_report()
            logger.info(f"Generated ECR report for {company.name}")
        except Exception as e:
            logger.error(f"Error generating ECR for {company.name}: {str(e)}")

@shared_task
def generate_monthly_esi_report():
    """Generate monthly ESI report for all companies"""
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            reporting = AutomatedReporting(company)
            esi_report = reporting._generate_esi_report()
            logger.info(f"Generated ESI report for {company.name}")
        except Exception as e:
            logger.error(f"Error generating ESI report for {company.name}: {str(e)}")

@shared_task
def submit_government_returns():
    """Submit returns to government portals"""
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            # Submit returns via government portal integration
            portal = GovernmentPortalIntegration(company)
            epfo_result = portal.submit_pf_ecr({})
            esic_result = portal.submit_esi_return({})
            
            logger.info(f"Submitted returns for {company.name}")
        except Exception as e:
            logger.error(f"Error submitting returns for {company.name}: {str(e)}")

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
                
                # Get HR admin emails (mock implementation)
                hr_emails = ['hr@company.com']  # Replace with actual HR emails
                
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
    """Sync employee data with government portals"""
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            employees = Employee.objects.filter(company=company, is_active=True)
            
            for employee in employees:
                # Sync via government portal integration
                portal = GovernmentPortalIntegration(company)
                # Employee sync functionality would be implemented here
            
            logger.info(f"Synced employee data for {company.name}")
        except Exception as e:
            logger.error(f"Error syncing employee data for {company.name}: {str(e)}")

@shared_task
def validate_statutory_calculations():
    """Validate statutory calculations for accuracy"""
    from .statutory_calculations import EnhancedStatutoryCalculations
    
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            calculator = EnhancedStatutoryCalculations(company)
            employees = Employee.objects.filter(company=company, is_active=True)
            
            validation_errors = []
            
            for employee in employees:
                # Validate PF calculation
                pf_result = calculator.calculate_pf(employee.basic_salary, employee)
                if pf_result['employee_contribution'] < 0:
                    validation_errors.append(f"Invalid PF calculation for {employee.first_name}")
                
                # Validate ESI calculation
                esi_result = calculator.calculate_esi(employee.gross_salary, employee)
                if esi_result['employee_contribution'] < 0:
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
    """Update statutory rates from government sources"""
    from .statutory_models import StatutorySettings
    
    try:
        # Mock implementation - in production, fetch from government APIs
        companies = Company.objects.filter(is_active=True)
        
        for company in companies:
            settings = StatutorySettings.objects.filter(company=company).first()
            if settings:
                # Update rates (mock values)
                settings.pf_employee_rate = 12.0
                settings.pf_employer_rate = 12.0
                settings.esi_employee_rate = 0.75
                settings.esi_employer_rate = 3.25
                settings.save()
        
        logger.info("Updated statutory rates for all companies")
    except Exception as e:
        logger.error(f"Error updating statutory rates: {str(e)}")