from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from django.conf import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from .models import CompanyEmailSettings
from .advanced_security_models import CompanyAdvancedSettings

logger = logging.getLogger(__name__)

class CompanyEmailAlertService:
    """Email alert service using Company's configured email settings"""
    
    def __init__(self, company):
        self.company = company
        self.email_settings = self._get_email_settings()
        self.advanced_settings = self._get_advanced_settings()
    
    def _get_email_settings(self):
        """Get company email settings"""
        try:
            return CompanyEmailSettings.objects.get(company=self.company)
        except CompanyEmailSettings.DoesNotExist:
            return None
    
    def _get_advanced_settings(self):
        """Get advanced security settings"""
        try:
            return CompanyAdvancedSettings.objects.get(company=self.company)
        except CompanyAdvancedSettings.DoesNotExist:
            return None
    
    def can_send_emails(self):
        """Check if email alerts are enabled and configured"""
        return (
            self.email_settings and 
            self.advanced_settings and 
            self.advanced_settings.email_alerts and
            self.email_settings.smtp_host and
            self.email_settings.smtp_username
        )
    
    def send_login_alert(self, user_email, ip_address, location=None, device_info=None, admin_email=None):
        """Send login notification email to company admin"""
        if not self.can_send_emails():
            return False
            
        try:
            # Send alert to company admin email (configured SMTP username)
            recipient_email = admin_email or self.email_settings.smtp_username
            
            subject = f"🔐 Login Alert - {self.company.name}"
            
            context = {
                'company_name': self.company.name,
                'user_email': user_email,
                'ip_address': ip_address,
                'location': location or 'Unknown',
                'device_info': device_info or 'Unknown Device',
                'login_time': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
                'dashboard_url': f"{settings.FRONTEND_URL}/company"
            }
            
            message = f"""
🔐 LOGIN ALERT - {self.company.name}

A user has logged into your company dashboard:

👤 User: {user_email}
🌐 IP Address: {ip_address}
📍 Location: {location or 'Unknown'}
💻 Device: {device_info or 'Unknown Device'}
⏰ Time: {context['login_time']}

If this wasn't you or an authorized user, please review your security settings immediately.

View Dashboard: {context['dashboard_url']}

---
This is an automated security alert from {self.company.name}
            """.strip()
            
            return self._send_email(subject, message, [recipient_email])
            
        except Exception as e:
            logger.error(f"Failed to send login alert: {e}")
            return False
    
    def send_security_alert(self, alert_type, title, message, user_email=None, severity='warning'):
        """Send security alert email"""
        if not self.can_send_emails():
            return False
            
        try:
            severity_icons = {
                'critical': '🚨',
                'high': '⚠️',
                'warning': '⚠️',
                'info': 'ℹ️'
            }
            
            icon = severity_icons.get(severity, '⚠️')
            subject = f"{icon} Security Alert - {self.company.name}"
            
            email_message = f"""
{icon} SECURITY ALERT - {self.company.name}

Alert Type: {alert_type.upper()}
Severity: {severity.upper()}

{title}

{message}

⏰ Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

Please review your security dashboard for more details:
{settings.FRONTEND_URL}/company

---
This is an automated security alert from {self.company.name}
            """.strip()
            
            # Send to user if specified, otherwise to company admin
            recipients = [user_email] if user_email else [self.company.admin_email]
            if not recipients[0]:
                recipients = [self.email_settings.smtp_username]  # Fallback to SMTP user
            
            return self._send_email(subject, email_message, recipients)
            
        except Exception as e:
            logger.error(f"Failed to send security alert: {e}")
            return False
    
    def send_threat_detection_alert(self, threat):
        """Send threat detection alert"""
        severity_map = {
            'critical': '🚨 CRITICAL',
            'high': '⚠️ HIGH',
            'medium': '⚠️ MEDIUM', 
            'low': 'ℹ️ LOW'
        }
        
        severity_label = severity_map.get(threat.severity, '⚠️ UNKNOWN')
        
        title = f"Threat Detected: {threat.get_threat_type_display()}"
        message = f"""
{severity_label} THREAT DETECTED

Threat Type: {threat.get_threat_type_display()}
Description: {threat.description}
User: {threat.user_email}
IP Address: {threat.ip_address}
Confidence Score: {int(threat.confidence_score * 100) if threat.confidence_score else 'N/A'}%

{f'Auto-blocked: Yes' if threat.auto_blocked else 'Status: Active - Review Required'}
        """.strip()
        
        return self.send_security_alert(
            'threat_detection', 
            title, 
            message, 
            threat.user_email,
            threat.severity
        )
    
    def send_new_device_alert(self, device):
        """Send new device detection alert"""
        title = "New Device Detected"
        message = f"""
A new device has been detected logging into your company dashboard:

Device Details:
- Browser: {device.browser} {device.browser_version}
- Operating System: {device.os}
- Location: {device.city}, {device.country}
- IP Address: {device.ip_address}
- Trust Score: {device.trust_score}%

User: {device.user.user.email}

If this device is not recognized, please review your security settings.
        """.strip()
        
        return self.send_security_alert(
            'new_device',
            title,
            message,
            device.user.user.email,
            'warning'
        )
    
    def _send_email(self, subject, message, recipients):
        """Send email using company SMTP settings"""
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.email_settings.smtp_username
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(message, 'plain'))
            
            # Connect to SMTP server
            server = smtplib.SMTP(self.email_settings.smtp_host, self.email_settings.smtp_port)
            
            if self.email_settings.use_tls:
                server.starttls()
            
            # Login and send
            server.login(self.email_settings.smtp_username, self.email_settings.get_smtp_password())
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email alert sent successfully to {recipients}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False