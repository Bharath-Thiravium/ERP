import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from django.utils import timezone
from django.template.loader import render_to_string
from .email_settings_models import MasterAdminEmailSettings
import logging

logger = logging.getLogger(__name__)

class MasterAdminEmailService:
    """Master Admin Email Service for sending emails"""
    
    def __init__(self):
        self.smtp_connection = None
    
    def get_email_settings(self, master_admin):
        """Get email settings for master admin"""
        try:
            return master_admin.email_settings
        except MasterAdminEmailSettings.DoesNotExist:
            return None
    
    def create_smtp_connection(self, email_settings):
        """Create SMTP connection"""
        try:
            config = email_settings.get_smtp_config()
            
            if config['use_ssl']:
                smtp = smtplib.SMTP_SSL(config['smtp_host'], config['smtp_port'])
            else:
                smtp = smtplib.SMTP(config['smtp_host'], config['smtp_port'])
                if config['use_tls']:
                    smtp.starttls()
            
            smtp.login(config['email_address'], config['email_password'])
            return smtp
            
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {str(e)}")
            return None
    
    def send_email(self, to_email, subject, html_content, text_content, master_admin):
        """Send email using master admin settings"""
        email_settings = self.get_email_settings(master_admin)
        
        if not email_settings or not email_settings.is_active:
            logger.error("Email settings not configured or inactive")
            return False
        
        try:
            config = email_settings.get_smtp_config()
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{config['from_name']} <{config['email_address']}>"
            msg['To'] = to_email
            
            # Add text and HTML parts
            text_part = MIMEText(text_content, 'plain')
            html_part = MIMEText(html_content, 'html')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Send email
            smtp = self.create_smtp_connection(email_settings)
            if not smtp:
                return False
            
            smtp.send_message(msg)
            smtp.quit()
            
            # Update statistics
            email_settings.emails_sent_today += 1
            email_settings.total_emails_sent += 1
            email_settings.last_email_sent = timezone.now()
            email_settings.save()
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def send_login_notification(self, to_email, login_data, master_admin):
        """Send login notification email"""
        try:
            context = {
                'user_email': master_admin.user.email,
                'login_time': login_data.get('timestamp', timezone.now()),
                'ip_address': login_data.get('ip_address', 'Unknown'),
                'user_agent': login_data.get('user_agent', 'Unknown'),
                'location': login_data.get('location', 'Unknown'),
                'device_info': login_data.get('device_info', 'Unknown'),
                'company_name': master_admin.company_name,
            }
            
            subject = f"🔐 Security Alert: New Login to {master_admin.company_name} SAP System"
            
            # Escape user data to prevent XSS
            from django.utils.html import escape
            
            safe_user_email = escape(context['user_email'])
            safe_company_name = escape(context['company_name'])
            safe_ip_address = escape(context['ip_address'])
            safe_location = escape(context['location'])
            safe_device_info = escape(context['device_info'])
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Login Security Alert</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                    .content {{ padding: 30px; }}
                    .alert-box {{ background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                    .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                    .info-table th, .info-table td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
                    .info-table th {{ background-color: #f8f9fa; font-weight: bold; }}
                    .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                    .security-icon {{ font-size: 48px; margin-bottom: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="security-icon">🛡️</div>
                        <h1>Security Alert</h1>
                        <p>New login detected to your Master Admin account</p>
                    </div>
                    
                    <div class="content">
                        <div class="alert-box">
                            <h3>🔐 Login Notification</h3>
                            <p>A new login was detected for your Master Admin account in <strong>{safe_company_name}</strong> SAP System.</p>
                        </div>
                        
                        <h3>Login Details:</h3>
                        <table class="info-table">
                            <tr>
                                <th>Account</th>
                                <td>{safe_user_email}</td>
                            </tr>
                            <tr>
                                <th>Time</th>
                                <td>{context['login_time'].strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
                            </tr>
                            <tr>
                                <th>IP Address</th>
                                <td>{safe_ip_address}</td>
                            </tr>
                            <tr>
                                <th>Location</th>
                                <td>{safe_location}</td>
                            </tr>
                            <tr>
                                <th>Device</th>
                                <td>{safe_device_info}</td>
                            </tr>
                        </table>
                        
                        <div class="alert-box">
                            <h4>⚠️ Security Reminder</h4>
                            <p>If this login was not authorized by you, please:</p>
                            <ul>
                                <li>Change your password immediately</li>
                                <li>Enable two-factor authentication</li>
                                <li>Review your security settings</li>
                                <li>Contact system administrator</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated security notification from {safe_company_name} SAP System.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            SECURITY ALERT: New Login Detected
            
            Account: {safe_user_email}
            Time: {context['login_time'].strftime('%Y-%m-%d %H:%M:%S UTC')}
            IP Address: {safe_ip_address}
            Location: {safe_location}
            Device: {safe_device_info}
            
            If this login was not authorized by you, please change your password immediately.
            
            This is an automated security notification from {safe_company_name} SAP System.
            """
            
            return self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                master_admin=master_admin
            )
            
        except Exception as e:
            logger.error(f"Failed to send login notification: {str(e)}")
            return False
    
    def send_test_email(self, to_email, master_admin):
        """Send test email"""
        try:
            subject = f"✅ Test Email from {master_admin.company_name} SAP System"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Test Email</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                    .header {{ text-align: center; margin-bottom: 30px; }}
                    .success-icon {{ font-size: 48px; color: #28a745; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="success-icon">✅</div>
                        <h1>Email Configuration Test</h1>
                    </div>
                    
                    <p>Congratulations! Your Master Admin email settings are configured correctly.</p>
                    
                    <p><strong>Test Details:</strong></p>
                    <ul>
                        <li>From: {master_admin.company_name} SAP System</li>
                        <li>To: {to_email}</li>
                        <li>Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
                    </ul>
                    
                    <p>You can now receive login notifications and other security alerts.</p>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            Email Configuration Test
            
            Congratulations! Your Master Admin email settings are configured correctly.
            
            From: {master_admin.company_name} SAP System
            To: {to_email}
            Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
            
            You can now receive login notifications and other security alerts.
            """
            
            return self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                master_admin=master_admin
            )
            
        except Exception as e:
            logger.error(f"Failed to send test email: {str(e)}")
            return False