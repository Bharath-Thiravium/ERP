from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from company_dashboard.models import CompanyEmailSettings
import logging

logger = logging.getLogger(__name__)


class FinanceEmailService:
    """Service for sending finance-related emails (invoices, quotations, receipts)"""
    
    @staticmethod
    def send_invoice_email(invoice, recipient_email, attach_pdf=True):
        """Send invoice email to customer"""
        try:
            company = invoice.company
            email_settings = CompanyEmailSettings.objects.filter(
                company=company, is_active=True
            ).first()
            
            if not email_settings:
                logger.error(f"No active email settings for company {company.name}")
                return False
            
            context = {
                'invoice_number': invoice.invoice_number,
                'invoice_date': invoice.invoice_date.strftime('%d %b %Y'),
                'due_date': invoice.due_date.strftime('%d %b %Y') if invoice.due_date else 'N/A',
                'customer_name': invoice.customer.name,
                'total_amount': f"{invoice.total_amount:,.2f}",
                'currency': invoice.currency or 'INR',
                'payment_link': f"{settings.FRONTEND_URL}/finance/invoices/{invoice.id}",
                'company_name': company.name,
                'company_email': email_settings.from_email,
                'company_phone': company.phone or '',
            }
            
            html_content = render_to_string('email/invoice_email.html', context)
            
            subject = f"Invoice {invoice.invoice_number} from {company.name}"
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=f"Please find attached invoice {invoice.invoice_number}",
                from_email=email_settings.from_email,
                to=[recipient_email],
            )
            email.attach_alternative(html_content, "text/html")
            
            # TODO: Attach PDF if requested
            # if attach_pdf:
            #     pdf_content = generate_invoice_pdf(invoice)
            #     email.attach(f"{invoice.invoice_number}.pdf", pdf_content, 'application/pdf')
            
            email.send()
            logger.info(f"✅ Invoice email sent to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send invoice email: {str(e)}")
            return False
    
    @staticmethod
    def send_quotation_email(quotation, recipient_email, attach_pdf=True):
        """Send quotation email to customer"""
        try:
            company = quotation.company
            email_settings = CompanyEmailSettings.objects.filter(
                company=company, is_active=True
            ).first()
            
            if not email_settings:
                logger.error(f"No active email settings for company {company.name}")
                return False
            
            context = {
                'quotation_number': quotation.quotation_number,
                'quotation_date': quotation.quotation_date.strftime('%d %b %Y'),
                'valid_until': quotation.valid_until.strftime('%d %b %Y') if quotation.valid_until else 'N/A',
                'customer_name': quotation.customer.name,
                'total_amount': f"{quotation.total_amount:,.2f}",
                'currency': quotation.currency or 'INR',
                'quotation_link': f"{settings.FRONTEND_URL}/finance/quotations/{quotation.id}",
                'company_name': company.name,
                'company_email': email_settings.from_email,
                'company_phone': company.phone or '',
            }
            
            html_content = render_to_string('email/quotation_email.html', context)
            
            subject = f"Quotation {quotation.quotation_number} from {company.name}"
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=f"Please find attached quotation {quotation.quotation_number}",
                from_email=email_settings.from_email,
                to=[recipient_email],
            )
            email.attach_alternative(html_content, "text/html")
            
            email.send()
            logger.info(f"✅ Quotation email sent to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send quotation email: {str(e)}")
            return False
    
    @staticmethod
    def send_receipt_email(payment, recipient_email, attach_pdf=True):
        """Send payment receipt email to customer"""
        try:
            invoice = payment.invoice
            company = invoice.company
            email_settings = CompanyEmailSettings.objects.filter(
                company=company, is_active=True
            ).first()
            
            if not email_settings:
                logger.error(f"No active email settings for company {company.name}")
                return False
            
            context = {
                'receipt_number': f"RCP-{payment.id:06d}",
                'payment_date': payment.payment_date.strftime('%d %b %Y'),
                'payment_method': payment.payment_method,
                'invoice_number': invoice.invoice_number,
                'customer_name': invoice.customer.name,
                'amount_paid': f"{payment.amount:,.2f}",
                'currency': invoice.currency or 'INR',
                'receipt_link': f"{settings.FRONTEND_URL}/finance/payments/{payment.id}",
                'company_name': company.name,
                'company_email': email_settings.from_email,
                'company_phone': company.phone or '',
            }
            
            html_content = render_to_string('email/receipt_email.html', context)
            
            subject = f"Payment Receipt for Invoice {invoice.invoice_number}"
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=f"Thank you for your payment",
                from_email=email_settings.from_email,
                to=[recipient_email],
            )
            email.attach_alternative(html_content, "text/html")
            
            email.send()
            logger.info(f"✅ Receipt email sent to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send receipt email: {str(e)}")
            return False
