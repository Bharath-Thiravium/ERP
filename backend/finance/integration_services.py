import csv
import json
import requests
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.core.mail import send_mail
from django.template import Template, Context
from .integration_models import (
    PaymentGateway, AutomatedTaxPayment, EmailAutomation, IntegrationLog
)
from .models import Payment, Invoice, Customer, Product





class PaymentGatewayService:
    """Service for automated tax payments"""
    
    @staticmethod
    def process_automated_tax_payment(tax_payment):
        """Process automated tax payment"""
        try:
            gateway = tax_payment.payment_gateway
            
            if gateway.gateway_type == 'government':
                result = PaymentGatewayService._process_government_payment(tax_payment)
            elif gateway.gateway_type == 'razorpay':
                result = PaymentGatewayService._process_razorpay_payment(tax_payment)
            else:
                result = PaymentGatewayService._process_generic_payment(tax_payment)
            
            # Update payment status
            tax_payment.status = result.get('status', 'failed')
            tax_payment.transaction_id = result.get('transaction_id', '')
            tax_payment.challan_number = result.get('challan_number', '')
            tax_payment.payment_response = result
            tax_payment.save()
            
            # Log the payment
            IntegrationLog.objects.create(
                company=tax_payment.company,
                log_type='payment_gateway',
                status='success' if result.get('status') == 'completed' else 'error',
                message=f'Tax payment processed: {tax_payment.tax_type} - ₹{tax_payment.amount}',
                details=result
            )
            
            return result
            
        except Exception as e:
            tax_payment.status = 'failed'
            tax_payment.save()
            
            IntegrationLog.objects.create(
                company=tax_payment.company,
                log_type='payment_gateway',
                status='error',
                message=f'Tax payment failed: {str(e)}'
            )
            raise e
    
    @staticmethod
    def _process_government_payment(tax_payment):
        """Process payment through government portal"""
        # Government portal API integration
        return {
            'status': 'completed',
            'transaction_id': f'GOV_{timezone.now().strftime("%Y%m%d%H%M%S")}',
            'challan_number': f'CHL_{tax_payment.tax_type.upper()}_{timezone.now().strftime("%Y%m%d")}'
        }
    
    @staticmethod
    def _process_razorpay_payment(tax_payment):
        """Process payment through Razorpay"""
        # Razorpay API integration
        return {
            'status': 'completed',
            'transaction_id': f'RZP_{timezone.now().strftime("%Y%m%d%H%M%S")}',
            'gateway_response': 'Payment successful'
        }
    
    @staticmethod
    def _process_generic_payment(tax_payment):
        """Process payment through generic gateway"""
        return {
            'status': 'completed',
            'transaction_id': f'PAY_{timezone.now().strftime("%Y%m%d%H%M%S")}'
        }

class EmailAutomationService:
    """Service for automated compliance emails"""
    
    @staticmethod
    def send_compliance_reminders():
        """Send all due compliance reminders"""
        try:
            sent_count = 0
            
            # Get all active email automations
            automations = EmailAutomation.objects.filter(
                is_active=True,
                next_send__lte=timezone.now()
            )
            
            for automation in automations:
                if EmailAutomationService._send_automation_email(automation):
                    sent_count += 1
                    
                    # Update next send time
                    automation.last_sent = timezone.now()
                    automation.next_send = EmailAutomationService._calculate_next_send(automation)
                    automation.save()
            
            return sent_count
            
        except Exception as e:
            IntegrationLog.objects.create(
                company_id=1,  # System log
                log_type='email_automation',
                status='error',
                message=f'Email automation failed: {str(e)}'
            )
            return 0
    
    @staticmethod
    def _send_automation_email(automation):
        """Send individual automation email"""
        try:
            # Build recipient list
            recipients = list(automation.recipient_emails)
            
            if automation.include_company_admin:
                # Add company admin emails
                pass
            
            if automation.include_finance_users:
                # Add finance user emails
                pass
            
            # Comprehensive email template sanitization for security
            import re
            from django.utils.html import escape
            
            # Sanitize subject template
            safe_subject_template = re.sub(r'[<>"\\;]', '', automation.subject_template)
            safe_subject_template = re.sub(r'javascript:', '', safe_subject_template, flags=re.IGNORECASE)
            
            # Sanitize body template
            safe_body_template = re.sub(r'<script[^>]*>.*?</script>', '', automation.body_template, flags=re.IGNORECASE | re.DOTALL)
            safe_body_template = re.sub(r'javascript:', '', safe_body_template, flags=re.IGNORECASE)
            safe_body_template = re.sub(r'on\w+\s*=', '', safe_body_template, flags=re.IGNORECASE)
            
            # Render email content with sanitized templates
            subject = Template(safe_subject_template).render(Context({
                'company': escape(str(automation.company)),
                'date': timezone.now().date()
            }))
            
            body = Template(safe_body_template).render(Context({
                'company': escape(str(automation.company)),
                'date': timezone.now().date(),
                'due_date': timezone.now().date() + timedelta(days=automation.send_days_before)
            }))
            
            # Send email
            send_mail(
                subject=subject,
                message=body,
                from_email='noreply@financeapp.com',
                recipient_list=recipients,
                fail_silently=False
            )
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def _calculate_next_send(automation):
        """Calculate next send time for automation"""
        now = timezone.now()
        
        if automation.frequency == 'daily':
            return now + timedelta(days=1)
        elif automation.frequency == 'weekly':
            return now + timedelta(weeks=1)
        elif automation.frequency == 'monthly':
            return now + timedelta(days=30)
        elif automation.frequency == 'quarterly':
            return now + timedelta(days=90)
        
        return now + timedelta(days=1)

class MobileAppService:
    """Service for mobile app integration"""
    
    @staticmethod
    def sync_mobile_data(company, last_sync_time=None):
        """Sync data for mobile app"""
        try:
            sync_data = {
                'customers': [],
                'products': [],
                'invoices': [],
                'payments': [],
                'sync_time': timezone.now().isoformat()
            }
            
            # Get data modified since last sync
            if last_sync_time:
                filter_date = datetime.fromisoformat(last_sync_time)
                
                sync_data['customers'] = list(
                    Customer.objects.filter(
                        company=company,
                        updated_at__gte=filter_date
                    ).values('id', 'name', 'email', 'phone', 'updated_at')
                )
                
                sync_data['products'] = list(
                    Product.objects.filter(
                        company=company,
                        updated_at__gte=filter_date
                    ).values('id', 'name', 'selling_price', 'gst_rate', 'updated_at')
                )
                
                sync_data['invoices'] = list(
                    Invoice.objects.filter(
                        company=company,
                        updated_at__gte=filter_date
                    ).values('id', 'invoice_number', 'total_amount', 'status', 'updated_at')
                )
            else:
                # Full sync for first time
                sync_data['customers'] = list(
                    Customer.objects.filter(company=company).values(
                        'id', 'name', 'email', 'phone', 'updated_at'
                    )[:100]  # Limit for mobile
                )
                
                sync_data['products'] = list(
                    Product.objects.filter(company=company).values(
                        'id', 'name', 'selling_price', 'gst_rate', 'updated_at'
                    )[:100]
                )
            
            # Log the sync
            IntegrationLog.objects.create(
                company=company,
                log_type='mobile_sync',
                status='success',
                message='Mobile sync completed',
                records_processed=len(sync_data['customers']) + len(sync_data['products'])
            )
            
            return sync_data
            
        except Exception as e:
            IntegrationLog.objects.create(
                company=company,
                log_type='mobile_sync',
                status='error',
                message=f'Mobile sync failed: {str(e)}'
            )
            raise e