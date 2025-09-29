from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
import sys

class Command(BaseCommand):
    help = 'Test email configuration and send a test email'

    def add_arguments(self, parser):
        parser.add_argument(
            '--to',
            type=str,
            help='Email address to send test email to',
            required=True
        )

    def handle(self, *args, **options):
        recipient_email = options['to']
        
        self.stdout.write('🔧 Testing email configuration...')
        
        # Check email settings
        if not settings.EMAIL_HOST_USER:
            self.stdout.write(self.style.ERROR('❌ EMAIL_HOST_USER not configured'))
            return
            
        if not settings.EMAIL_HOST_PASSWORD:
            self.stdout.write(self.style.ERROR('❌ EMAIL_HOST_PASSWORD not configured'))
            return
            
        self.stdout.write(f'✅ Email Host: {settings.EMAIL_HOST}')
        self.stdout.write(f'✅ Email Port: {settings.EMAIL_PORT}')
        self.stdout.write(f'✅ Email User: {settings.EMAIL_HOST_USER}')
        self.stdout.write(f'✅ Use TLS: {settings.EMAIL_USE_TLS}')
        
        try:
            self.stdout.write(f'📧 Sending test email to {recipient_email}...')
            
            send_mail(
                subject='🎉 SAP System Email Test - Success!',
                message=f'''
Hello!

This is a test email from your SAP Enterprise System.

✅ Gmail SMTP is working correctly!
✅ Real-time email service is operational
✅ Your finance module can now send emails instantly

Email Configuration:
- Host: {settings.EMAIL_HOST}
- Port: {settings.EMAIL_PORT}
- From: {settings.DEFAULT_FROM_EMAIL}

Your email service is ready for:
📄 Quotations
📄 Proforma Invoices  
📄 Tax Invoices

Best regards,
Your SAP System
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )
            
            self.stdout.write(self.style.SUCCESS('🎉 Test email sent successfully!'))
            self.stdout.write('✅ Your Gmail SMTP service is working perfectly!')
            self.stdout.write('✅ You can now send emails from your finance module!')
            
        except Exception as e:
            error_msg = str(e)
            self.stdout.write(self.style.ERROR(f'❌ Email test failed: {error_msg}'))
            
            # Provide specific troubleshooting advice
            if "Authentication failed" in error_msg:
                self.stdout.write(self.style.WARNING('💡 Troubleshooting: Gmail authentication failed'))
                self.stdout.write('   1. Ensure 2-Factor Authentication is enabled on your Gmail')
                self.stdout.write('   2. Use App Password, not your regular Gmail password')
                self.stdout.write('   3. Check EMAIL_HOST_USER matches your Gmail address')
                
            elif "Connection timed out" in error_msg:
                self.stdout.write(self.style.WARNING('💡 Troubleshooting: Connection timeout'))
                self.stdout.write('   1. Check your internet connection')
                self.stdout.write('   2. Verify firewall allows SMTP traffic on port 587')
                self.stdout.write('   3. Try increasing EMAIL_TIMEOUT in settings')
                
            elif "Daily sending quota exceeded" in error_msg:
                self.stdout.write(self.style.WARNING('💡 Troubleshooting: Daily limit reached'))
                self.stdout.write('   1. Gmail free accounts have 500 emails/day limit')
                self.stdout.write('   2. Wait 24 hours for quota reset')
                self.stdout.write('   3. Consider Google Workspace for higher limits')