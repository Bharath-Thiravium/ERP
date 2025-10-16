from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta, date
from company_dashboard.email_service import get_company_email_service
from authentication.models import Company, CompanyUser, CompanyServiceUser
from .integration_models import EmailAutomation, IntegrationLog
from .models import Invoice, Payment
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class EmailAutomationService:
    """Service for handling automated compliance and payment reminder emails"""
    
    def __init__(self, company: Company):
        self.company = company
        self.email_service = get_company_email_service(company)
    
    def process_all_automations(self):
        """Process all active email automations for the company"""
        if not self.email_service or not self.email_service.can_send_email():
            logger.warning(f"Email service not available for company {self.company.name}")
            return
        
        automations = EmailAutomation.objects.filter(
            company=self.company,
            is_active=True
        )
        
        for automation in automations:
            try:
                self.process_automation(automation)
            except Exception as e:
                logger.error(f"Error processing automation {automation.id}: {str(e)}")
                self._log_automation_error(automation, str(e))
    
    def process_automation(self, automation: EmailAutomation):
        """Process a specific email automation"""
        now = timezone.now()
        
        # Check if it's time to send
        if automation.next_send and automation.next_send > now:
            return
        
        # Get recipients
        recipients = self._get_recipients(automation)
        if not recipients:
            logger.warning(f"No recipients found for automation {automation.id}")
            return
        
        # Generate content based on automation type
        if automation.email_type == 'gst_filing':
            self._send_gst_filing_reminder(automation, recipients)
        elif automation.email_type == 'tds_filing':
            self._send_tds_filing_reminder(automation, recipients)
        elif automation.email_type == 'payment_due':
            self._send_payment_due_reminder(automation, recipients)
        elif automation.email_type == 'invoice_overdue':
            self._send_invoice_overdue_reminder(automation, recipients)
        elif automation.email_type == 'compliance_alert':
            self._send_compliance_alert(automation, recipients)
        elif automation.email_type == 'custom':
            self._send_custom_reminder(automation, recipients)
        
        # Update automation schedule
        self._update_automation_schedule(automation)
    
    def _get_recipients(self, automation: EmailAutomation) -> List[str]:
        """Get email recipients for automation"""
        recipients = list(automation.recipient_emails)
        
        if automation.include_company_admin:
            # Get company admin emails
            admin_users = CompanyUser.objects.filter(
                company=self.company,
                role='admin',
                is_active=True
            )
            recipients.extend([user.email for user in admin_users if user.email])
        
        if automation.include_finance_users:
            # Get finance service users
            finance_users = CompanyServiceUser.objects.filter(
                company=self.company,
                service_name='finance',
                is_active=True
            )
            recipients.extend([user.email for user in finance_users if user.email])
        
        # Remove duplicates and empty emails
        return list(set([email for email in recipients if email]))
    
    def _send_gst_filing_reminder(self, automation: EmailAutomation, recipients: List[str]):
        """Send GST filing reminder"""
        current_date = date.today()
        
        # Calculate GST filing due dates (11th of next month for previous month)
        if current_date.month == 12:
            next_month = 1
            next_year = current_date.year + 1
        else:
            next_month = current_date.month + 1
            next_year = current_date.year
        
        gst_due_date = date(next_year, next_month, 11)
        days_until_due = (gst_due_date - current_date).days
        
        if days_until_due <= automation.send_days_before:
            context = {
                'company_name': self.company.name,
                'due_date': gst_due_date.strftime('%d %B %Y'),
                'days_remaining': days_until_due,
                'filing_period': current_date.strftime('%B %Y'),
                'automation_title': automation.title
            }
            
            subject = self._render_template(automation.subject_template, context)
            body = self._render_template(automation.body_template, context)
            
            success = self.email_service.send_email(
                to_emails=recipients,
                subject=subject,
                html_content=self._create_html_email(body, context),
                text_content=body
            )
            
            self._log_automation_result(automation, 'gst_filing', success, len(recipients))
    
    def _send_tds_filing_reminder(self, automation: EmailAutomation, recipients: List[str]):
        """Send TDS filing reminder"""
        current_date = date.today()
        
        # TDS quarterly filing dates
        quarter_end_months = [3, 6, 9, 12]  # March, June, September, December
        
        # Find next quarter end
        next_quarter_month = None
        for month in quarter_end_months:
            if month > current_date.month:
                next_quarter_month = month
                break
        
        if not next_quarter_month:
            next_quarter_month = 3  # Next year March
            next_year = current_date.year + 1
        else:
            next_year = current_date.year
        
        # TDS filing due date is 31st of the month following quarter end
        if next_quarter_month == 12:
            tds_due_date = date(next_year + 1, 1, 31)
        else:
            tds_due_date = date(next_year, next_quarter_month + 1, 31)
        
        days_until_due = (tds_due_date - current_date).days
        
        if days_until_due <= automation.send_days_before:
            quarter_name = f"Q{(next_quarter_month // 3)} {next_year}"
            
            context = {
                'company_name': self.company.name,
                'due_date': tds_due_date.strftime('%d %B %Y'),
                'days_remaining': days_until_due,
                'quarter': quarter_name,
                'automation_title': automation.title
            }
            
            subject = self._render_template(automation.subject_template, context)
            body = self._render_template(automation.body_template, context)
            
            success = self.email_service.send_email(
                to_emails=recipients,
                subject=subject,
                html_content=self._create_html_email(body, context),
                text_content=body
            )
            
            self._log_automation_result(automation, 'tds_filing', success, len(recipients))
    
    def _send_payment_due_reminder(self, automation: EmailAutomation, recipients: List[str]):
        """Send payment due reminder for invoices"""
        due_date_threshold = date.today() + timedelta(days=automation.send_days_before)
        
        # Get invoices due within threshold
        due_invoices = Invoice.objects.filter(
            company=self.company,
            due_date__lte=due_date_threshold,
            payment_status__in=['unpaid', 'partially_paid'],
            outstanding_amount__gt=0
        ).select_related('customer')
        
        if due_invoices.exists():
            total_outstanding = sum(inv.outstanding_amount for inv in due_invoices)
            
            context = {
                'company_name': self.company.name,
                'invoice_count': due_invoices.count(),
                'total_outstanding': f"₹{total_outstanding:,.2f}",
                'due_invoices': [
                    {
                        'invoice_number': inv.invoice_number,
                        'customer_name': inv.customer.name,
                        'due_date': inv.due_date.strftime('%d %B %Y'),
                        'outstanding_amount': f"₹{inv.outstanding_amount:,.2f}"
                    }
                    for inv in due_invoices[:10]  # Limit to 10 invoices
                ],
                'automation_title': automation.title
            }
            
            subject = self._render_template(automation.subject_template, context)
            body = self._render_template(automation.body_template, context)
            
            success = self.email_service.send_email(
                to_emails=recipients,
                subject=subject,
                html_content=self._create_html_email(body, context),
                text_content=body
            )
            
            self._log_automation_result(automation, 'payment_due', success, len(recipients))
    
    def _send_invoice_overdue_reminder(self, automation: EmailAutomation, recipients: List[str]):
        """Send overdue invoice reminder"""
        overdue_invoices = Invoice.objects.filter(
            company=self.company,
            due_date__lt=date.today(),
            payment_status__in=['unpaid', 'partially_paid'],
            outstanding_amount__gt=0
        ).select_related('customer')
        
        if overdue_invoices.exists():
            total_overdue = sum(inv.outstanding_amount for inv in overdue_invoices)
            
            context = {
                'company_name': self.company.name,
                'overdue_count': overdue_invoices.count(),
                'total_overdue': f"₹{total_overdue:,.2f}",
                'overdue_invoices': [
                    {
                        'invoice_number': inv.invoice_number,
                        'customer_name': inv.customer.name,
                        'due_date': inv.due_date.strftime('%d %B %Y'),
                        'days_overdue': (date.today() - inv.due_date).days,
                        'outstanding_amount': f"₹{inv.outstanding_amount:,.2f}"
                    }
                    for inv in overdue_invoices[:10]
                ],
                'automation_title': automation.title
            }
            
            subject = self._render_template(automation.subject_template, context)
            body = self._render_template(automation.body_template, context)
            
            success = self.email_service.send_email(
                to_emails=recipients,
                subject=subject,
                html_content=self._create_html_email(body, context),
                text_content=body
            )
            
            self._log_automation_result(automation, 'invoice_overdue', success, len(recipients))
    
    def _send_compliance_alert(self, automation: EmailAutomation, recipients: List[str]):
        """Send general compliance alert"""
        context = {
            'company_name': self.company.name,
            'alert_date': date.today().strftime('%d %B %Y'),
            'automation_title': automation.title
        }
        
        subject = self._render_template(automation.subject_template, context)
        body = self._render_template(automation.body_template, context)
        
        success = self.email_service.send_email(
            to_emails=recipients,
            subject=subject,
            html_content=self._create_html_email(body, context),
            text_content=body
        )
        
        self._log_automation_result(automation, 'compliance_alert', success, len(recipients))
    
    def _send_custom_reminder(self, automation: EmailAutomation, recipients: List[str]):
        """Send custom reminder"""
        context = {
            'company_name': self.company.name,
            'current_date': date.today().strftime('%d %B %Y'),
            'automation_title': automation.title
        }
        
        subject = self._render_template(automation.subject_template, context)
        body = self._render_template(automation.body_template, context)
        
        success = self.email_service.send_email(
            to_emails=recipients,
            subject=subject,
            html_content=self._create_html_email(body, context),
            text_content=body
        )
        
        self._log_automation_result(automation, 'custom', success, len(recipients))
    
    def _render_template(self, template: str, context: Dict[str, Any]) -> str:
        """Render template with context variables"""
        for key, value in context.items():
            template = template.replace(f"{{{key}}}", str(value))
        return template
    
    def _create_html_email(self, body: str, context: Dict[str, Any]) -> str:
        """Create HTML email content"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{context.get('automation_title', 'Notification')}</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
                .content {{ background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }}
                .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
                .highlight {{ background: #fff3cd; padding: 10px; border-radius: 3px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>{context.get('automation_title', 'Notification')}</h2>
                    <p>From: {context.get('company_name', 'Your Company')}</p>
                </div>
                <div class="content">
                    {body.replace(chr(10), '<br>')}
                </div>
                <div class="footer">
                    <p>This is an automated message from AthenaSAP Finance System</p>
                    <p>Date: {context.get('current_date', date.today().strftime('%d %B %Y'))}</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _update_automation_schedule(self, automation: EmailAutomation):
        """Update automation next send time"""
        now = timezone.now()
        
        if automation.frequency == 'daily':
            next_send = now + timedelta(days=1)
        elif automation.frequency == 'weekly':
            next_send = now + timedelta(weeks=1)
        elif automation.frequency == 'monthly':
            next_send = now + timedelta(days=30)
        elif automation.frequency == 'quarterly':
            next_send = now + timedelta(days=90)
        else:
            next_send = now + timedelta(days=1)  # Default to daily
        
        # Set time to automation's send_time
        next_send = next_send.replace(
            hour=automation.send_time.hour,
            minute=automation.send_time.minute,
            second=0,
            microsecond=0
        )
        
        automation.last_sent = now
        automation.next_send = next_send
        automation.save(update_fields=['last_sent', 'next_send'])
    
    def _log_automation_result(self, automation: EmailAutomation, email_type: str, success: bool, recipient_count: int):
        """Log automation execution result"""
        IntegrationLog.objects.create(
            company=self.company,
            log_type='email_automation',
            status='success' if success else 'error',
            message=f"Email automation '{automation.title}' ({'sent' if success else 'failed'})",
            details={
                'automation_id': automation.id,
                'email_type': email_type,
                'recipient_count': recipient_count,
                'automation_title': automation.title
            },
            records_processed=recipient_count,
            records_success=recipient_count if success else 0,
            records_failed=0 if success else recipient_count
        )
    
    def _log_automation_error(self, automation: EmailAutomation, error_message: str):
        """Log automation error"""
        IntegrationLog.objects.create(
            company=self.company,
            log_type='email_automation',
            status='error',
            message=f"Email automation '{automation.title}' failed: {error_message}",
            details={
                'automation_id': automation.id,
                'error': error_message,
                'automation_title': automation.title
            }
        )

def process_company_email_automations(company_id: int):
    """Process email automations for a specific company"""
    try:
        company = Company.objects.get(id=company_id)
        service = EmailAutomationService(company)
        service.process_all_automations()
    except Company.DoesNotExist:
        logger.error(f"Company {company_id} not found")
    except Exception as e:
        logger.error(f"Error processing email automations for company {company_id}: {str(e)}")

def process_all_email_automations():
    """Process email automations for all companies"""
    companies = Company.objects.filter(is_active=True)
    for company in companies:
        try:
            service = EmailAutomationService(company)
            service.process_all_automations()
        except Exception as e:
            logger.error(f"Error processing email automations for company {company.id}: {str(e)}")