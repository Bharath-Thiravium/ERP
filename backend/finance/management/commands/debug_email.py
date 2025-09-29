from django.core.management.base import BaseCommand
from django.conf import settings
from finance.models import Quotation
from finance.email_utils import send_quotation_email
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Debug email sending for quotations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--quotation-id',
            type=int,
            help='Quotation ID to send email for',
            required=True
        )
        parser.add_argument(
            '--to',
            type=str,
            help='Email address to send to',
            required=True
        )

    def handle(self, *args, **options):
        quotation_id = options['quotation_id']
        recipient_email = options['to']
        
        self.stdout.write('🔍 Debugging email sending...')
        
        # Check email settings
        self.stdout.write(f'✅ Email Backend: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'✅ Email Host: {settings.EMAIL_HOST}')
        self.stdout.write(f'✅ Email User: {settings.EMAIL_HOST_USER}')
        self.stdout.write(f'✅ Default From: {settings.DEFAULT_FROM_EMAIL}')
        
        try:
            # Get quotation
            quotation = Quotation.objects.get(id=quotation_id)
            self.stdout.write(f'✅ Found quotation: {quotation.quotation_number}')
            
            # Send email with debug info
            self.stdout.write(f'📧 Sending email to: {recipient_email}')
            success, message = send_quotation_email(quotation, recipient_email, "This is a debug test email.")
            
            if success:
                self.stdout.write(self.style.SUCCESS(f'🎉 {message}'))
            else:
                self.stdout.write(self.style.ERROR(f'❌ {message}'))
                
        except Quotation.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Quotation with ID {quotation_id} not found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())