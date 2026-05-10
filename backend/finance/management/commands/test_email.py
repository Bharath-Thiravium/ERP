from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from finance.models import Invoice, Quotation, Payment
from finance.email_service import FinanceEmailService
from company_dashboard.models import CompanyEmailSettings


class Command(BaseCommand):
    help = 'Test email sending functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            choices=['simple', 'invoice', 'quotation', 'receipt'],
            default='simple',
            help='Type of email to send'
        )
        parser.add_argument(
            '--to',
            type=str,
            required=True,
            help='Recipient email address'
        )
        parser.add_argument(
            '--id',
            type=int,
            help='ID of invoice/quotation/payment (required for invoice/quotation/receipt types)'
        )

    def handle(self, *args, **options):
        email_type = options['type']
        recipient = options['to']
        doc_id = options.get('id')

        self.stdout.write(self.style.WARNING(f'\n🔍 Testing {email_type} email to {recipient}...\n'))

        try:
            if email_type == 'simple':
                self._send_simple_test_email(recipient)
            elif email_type == 'invoice':
                if not doc_id:
                    self.stdout.write(self.style.ERROR('❌ --id is required for invoice emails'))
                    return
                self._send_invoice_email(doc_id, recipient)
            elif email_type == 'quotation':
                if not doc_id:
                    self.stdout.write(self.style.ERROR('❌ --id is required for quotation emails'))
                    return
                self._send_quotation_email(doc_id, recipient)
            elif email_type == 'receipt':
                if not doc_id:
                    self.stdout.write(self.style.ERROR('❌ --id is required for receipt emails'))
                    return
                self._send_receipt_email(doc_id, recipient)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))

    def _send_simple_test_email(self, recipient):
        """Send a simple test email"""
        self.stdout.write('📧 Sending simple test email...')
        
        # Check email settings
        email_settings = CompanyEmailSettings.objects.filter(is_active=True).first()
        if email_settings:
            self.stdout.write(f'✅ Found active email settings for: {email_settings.company.name}')
            self.stdout.write(f'   From: {email_settings.from_email}')
            self.stdout.write(f'   SMTP: {email_settings.smtp_host}:{email_settings.smtp_port}')
        else:
            self.stdout.write(self.style.WARNING('⚠️  No active email settings found'))
        
        send_mail(
            subject='Test Email from SAP System',
            message='This is a test email from your SAP system. If you receive this, email is working correctly!',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        
        self.stdout.write(self.style.SUCCESS(f'✅ Simple test email sent to {recipient}'))

    def _send_invoice_email(self, invoice_id, recipient):
        """Send invoice email"""
        self.stdout.write(f'📧 Sending invoice email for ID {invoice_id}...')
        
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            self.stdout.write(f'✅ Found invoice: {invoice.invoice_number}')
            self.stdout.write(f'   Customer: {invoice.customer.name}')
            self.stdout.write(f'   Amount: {invoice.currency} {invoice.total_amount:,.2f}')
            
            success = FinanceEmailService.send_invoice_email(invoice, recipient, attach_pdf=False)
            
            if success:
                self.stdout.write(self.style.SUCCESS(f'✅ Invoice email sent to {recipient}'))
            else:
                self.stdout.write(self.style.ERROR('❌ Failed to send invoice email'))
                
        except Invoice.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Invoice with ID {invoice_id} not found'))

    def _send_quotation_email(self, quotation_id, recipient):
        """Send quotation email"""
        self.stdout.write(f'📧 Sending quotation email for ID {quotation_id}...')
        
        try:
            quotation = Quotation.objects.get(id=quotation_id)
            self.stdout.write(f'✅ Found quotation: {quotation.quotation_number}')
            self.stdout.write(f'   Customer: {quotation.customer.name}')
            self.stdout.write(f'   Amount: {quotation.currency} {quotation.total_amount:,.2f}')
            
            success = FinanceEmailService.send_quotation_email(quotation, recipient, attach_pdf=False)
            
            if success:
                self.stdout.write(self.style.SUCCESS(f'✅ Quotation email sent to {recipient}'))
            else:
                self.stdout.write(self.style.ERROR('❌ Failed to send quotation email'))
                
        except Quotation.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Quotation with ID {quotation_id} not found'))

    def _send_receipt_email(self, payment_id, recipient):
        """Send receipt email"""
        self.stdout.write(f'📧 Sending receipt email for payment ID {payment_id}...')
        
        try:
            payment = Payment.objects.get(id=payment_id)
            self.stdout.write(f'✅ Found payment for invoice: {payment.invoice.invoice_number}')
            self.stdout.write(f'   Customer: {payment.invoice.customer.name}')
            self.stdout.write(f'   Amount: {payment.invoice.currency} {payment.amount:,.2f}')
            
            success = FinanceEmailService.send_receipt_email(payment, recipient, attach_pdf=False)
            
            if success:
                self.stdout.write(self.style.SUCCESS(f'✅ Receipt email sent to {recipient}'))
            else:
                self.stdout.write(self.style.ERROR('❌ Failed to send receipt email'))
                
        except Payment.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Payment with ID {payment_id} not found'))
