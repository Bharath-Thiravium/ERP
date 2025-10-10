import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from email.header import Header
from email.utils import formataddr
from email.charset import Charset
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from .models import CompanyEmailSettings
import logging
import requests
from typing import Optional, Dict, Any
from django.utils import timezone # Import timezone for test_email_configuration

logger = logging.getLogger(__name__)

class CompanyEmailService:
    """Email service for sending emails using company-specific configurations"""
    
    def __init__(self, company):
        self.company = company
        self.email_settings = None
        try:
            self.email_settings = CompanyEmailSettings.objects.get(company=company, is_active=True)
        except CompanyEmailSettings.DoesNotExist:
            logger.warning(f"No active email settings found for company {company.name}")
    
    def can_send_email(self) -> bool:
        """Check if company can send emails"""
        if not self.email_settings:
            return False
        return self.email_settings.can_send_email()
    
    def send_email(self, to_emails: list, subject: str, html_content: str, 
                   text_content: str = None, attachments: list = None) -> bool:
        """Send email using company's email configuration"""
        
        if not self.can_send_email():
            logger.error(f"Company {self.company.name} cannot send emails")
            return False
        
        try:
            if self.email_settings.email_provider in ['sendgrid', 'mailgun', 'ses']:
                success = self._send_via_api(to_emails, subject, html_content, text_content, attachments)
            else:
                success = self._send_via_smtp(to_emails, subject, html_content, text_content, attachments)
            
            if success:
                self.email_settings.increment_email_count()
                logger.info(f"Email sent successfully from {self.company.name} to {to_emails}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to send email from {self.company.name}: {str(e)}")
            return False
    
    def _send_via_smtp(self, to_emails: list, subject: str, html_content: str, 
                       text_content: str = None, attachments: list = None) -> bool:
        """Send email via SMTP"""
        
        smtp_config = self.email_settings.get_smtp_config()
        
        msg = MIMEMultipart('alternative')
        msg.set_charset('utf-8')
        
        # Use formataddr with proper UTF-8 encoding for the From header
        msg['From'] = formataddr((self.email_settings.from_name, self.email_settings.from_email))
        msg['To'] = ', '.join(to_emails)
        msg['Subject'] = subject

        if self.email_settings.reply_to_email:
            msg['Reply-To'] = self.email_settings.reply_to_email
        
        if text_content:
            text_part = MIMEText(text_content, 'plain', 'utf-8') 
            msg.attach(text_part)
        
        html_part = MIMEText(html_content, 'html', 'utf-8') 
        msg.attach(html_part)
        
        if attachments:
            for attachment in attachments:
                self._add_attachment(msg, attachment)
        
        try:
            if smtp_config['use_ssl']:
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(smtp_config['host'], smtp_config['port'], context=context)
            else:
                server = smtplib.SMTP(smtp_config['host'], smtp_config['port'])
                if smtp_config['use_tls']:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
            
            server.login(self.email_settings.smtp_username, self.email_settings.get_smtp_password())
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            logger.error(f"SMTP error for {self.company.name}: {str(e)}")
            return False
    
    def _send_via_api(self, to_emails: list, subject: str, html_content: str, 
                      text_content: str = None, attachments: list = None) -> bool:
        """Send email via API (SendGrid, Mailgun, etc.)"""
        
        if self.email_settings.email_provider == 'sendgrid':
            return self._send_via_sendgrid(to_emails, subject, html_content, text_content)
        elif self.email_settings.email_provider == 'mailgun':
            return self._send_via_mailgun(to_emails, subject, html_content, text_content)
        elif self.email_settings.email_provider == 'ses':
            return self._send_via_ses(to_emails, subject, html_content, text_content)
        
        return False
    
    def _send_via_sendgrid(self, to_emails: list, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email via SendGrid API"""
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            sg = sendgrid.SendGridAPIClient(api_key=self.email_settings.get_api_key())
            
            from_email = Email(self.email_settings.from_email, self.email_settings.from_name)
            to_list = [To(email) for email in to_emails]
            
            mail = Mail(
                from_email=from_email,
                to_emails=to_list,
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            if text_content:
                mail.add_content(Content("text/plain", text_content))
            
            response = sg.send(mail)
            return response.status_code in [200, 202]
            
        except Exception as e:
            logger.error(f"SendGrid error for {self.company.name}: {str(e)}")
            return False
    
    def _send_via_mailgun(self, to_emails: list, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email via Mailgun API"""
        try:
            domain = self.email_settings.smtp_host  # Mailgun domain
            
            response = requests.post(
                f"https://api.mailgun.net/v3/{domain}/messages",
                auth=("api", self.email_settings.get_api_key()),
                data={
                    "from": f"{self.email_settings.from_name} <{self.email_settings.from_email}>",
                    "to": to_emails,
                    "subject": subject,
                    "text": text_content or "",
                    "html": html_content
                }
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Mailgun error for {self.company.name}: {str(e)}")
            return False
    
    def _send_via_ses(self, to_emails: list, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email via Amazon SES"""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            client = boto3.client(
                'ses',
                aws_access_key_id=self.email_settings.get_api_key(),
                aws_secret_access_key=self.email_settings.get_api_secret(),
                region_name='us-east-1'  # Default region
            )
            
            destination = {'ToAddresses': to_emails}
            message = {
                'Subject': {'Data': subject},
                'Body': {'Html': {'Data': html_content}}
            }
            
            if text_content:
                message['Body']['Text'] = {'Data': text_content}
            
            response = client.send_email(
                Source=f"{self.email_settings.from_name} <{self.email_settings.from_email}>",
                Destination=destination,
                Message=message
            )
            
            return 'MessageId' in response
            
        except Exception as e:
            logger.error(f"SES error for {self.company.name}: {str(e)}")
            return False
    
    def _add_attachment(self, msg, attachment):
        """Add attachment to email message"""
        try:
            with open(attachment['path'], "rb") as attachment_file:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment_file.read())
            
            encoders.encode_base64(part)
            
            # Encode attachment filename if it contains non-ASCII
            filename_header = Header(attachment["name"], 'utf-8')
            part.add_header(
                'Content-Disposition',
                f'attachment; filename="{filename_header.encode()}"'
            )
            msg.attach(part)
        except Exception as e:
            logger.error(f"Failed to add attachment: {str(e)}")
    
    def test_email_configuration(self) -> Dict[str, Any]:
        """Test email configuration by sending a test email"""
        if not self.email_settings:
            return {'success': False, 'error': 'No email settings configured'}
        
        test_subject = f"Test Email from {self.company.name}"
        test_content = f"""
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify your email configuration for <strong>{self.company.name}</strong>.</p>
        <p>If you received this email, your email settings are working correctly!</p>
        <hr>
        <p><small>Sent from AthenaSAP System</small></p>
        """
        
        # Send test email to company's from_email
        success = self.send_email(
            to_emails=[self.email_settings.from_email],
            subject=test_subject,
            html_content=test_content,
            text_content="Email configuration test successful!"
        )
        
        # Update test status
        # from django.utils import timezone # Already imported at the top
        self.email_settings.last_test_sent = timezone.now()
        self.email_settings.test_status = 'success' if success else 'failed'
        self.email_settings.save(update_fields=['last_test_sent', 'test_status'])
        
        return {
            'success': success,
            'message': 'Test email sent successfully!' if success else 'Failed to send test email'
        }

def get_company_email_service(company) -> Optional[CompanyEmailService]:
    """Get email service for a company"""
    return CompanyEmailService(company)

def send_company_email(company, to_emails: list, subject: str, template_name: str, 
                      context: dict = None, attachments: list = None) -> bool:
    """Convenience function to send templated emails"""
    
    email_service = get_company_email_service(company)
    if not email_service:
        return False
    
    # Render template
    context = context or {}
    context.update({
        'company': company,
        'company_name': company.name,
        'company_logo': company.logo.url if company.logo else None
    })
    
    html_content = render_to_string(f'emails/{template_name}.html', context)
    text_content = render_to_string(f'emails/{template_name}.txt', context)
    
    return email_service.send_email(
        to_emails=to_emails,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        attachments=attachments
    )