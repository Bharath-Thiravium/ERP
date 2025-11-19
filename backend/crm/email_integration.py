"""
Email integration for CRM (Gmail/Outlook)
"""
import base64
import json
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
import requests

logger = logging.getLogger('crm_email')

class EmailIntegrationBase:
    """Base class for email integrations"""
    
    def __init__(self, company_id, credentials):
        self.company_id = company_id
        self.credentials = credentials
    
    def send_email(self, to_email, subject, body, attachments=None):
        """Send email - to be implemented by subclasses"""
        raise NotImplementedError
    
    def get_emails(self, folder='inbox', limit=50):
        """Get emails - to be implemented by subclasses"""
        raise NotImplementedError
    
    def track_email(self, email_id, recipient):
        """Track email opens and clicks"""
        # Generate tracking pixel
        tracking_id = f"{self.company_id}_{email_id}_{recipient}"
        tracking_url = f"{settings.FRONTEND_URL}/api/crm/email-tracking/{tracking_id}"
        
        # Add tracking pixel to email body
        tracking_pixel = f'<img src="{tracking_url}/pixel.gif" width="1" height="1" style="display:none;">'
        
        return tracking_pixel, tracking_id

class GmailIntegration(EmailIntegrationBase):
    """Gmail integration using Gmail API"""
    
    def __init__(self, company_id, credentials):
        super().__init__(company_id, credentials)
        self.base_url = 'https://gmail.googleapis.com/gmail/v1'
        self.access_token = credentials.get('access_token')
        self.refresh_token = credentials.get('refresh_token')
    
    def _get_headers(self):
        """Get authorization headers"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def _refresh_access_token(self):
        """Refresh access token"""
        try:
            response = requests.post('https://oauth2.googleapis.com/token', data={
                'client_id': settings.GMAIL_CLIENT_ID,
                'client_secret': settings.GMAIL_CLIENT_SECRET,
                'refresh_token': self.refresh_token,
                'grant_type': 'refresh_token'
            })
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                
                # Update stored credentials
                self._update_stored_credentials(token_data)
                
                return True
        except Exception as e:
            logger.error(f"Failed to refresh Gmail token: {str(e)}")
        
        return False
    
    def _update_stored_credentials(self, token_data):
        """Update stored credentials"""
        # This would update the credentials in your database
        from .models import EmailIntegration
        try:
            integration = EmailIntegration.objects.get(
                company_id=self.company_id,
                provider='gmail'
            )
            credentials = integration.credentials
            credentials['access_token'] = token_data['access_token']
            if 'refresh_token' in token_data:
                credentials['refresh_token'] = token_data['refresh_token']
            integration.credentials = credentials
            integration.save()
        except EmailIntegration.DoesNotExist:
            pass
    
    def send_email(self, to_email, subject, body, attachments=None):
        """Send email via Gmail API"""
        try:
            # Create email message
            message = {
                'raw': self._create_message(to_email, subject, body, attachments)
            }
            
            response = requests.post(
                f'{self.base_url}/users/me/messages/send',
                headers=self._get_headers(),
                json=message
            )
            
            if response.status_code == 401:
                # Token expired, try to refresh
                if self._refresh_access_token():
                    response = requests.post(
                        f'{self.base_url}/users/me/messages/send',
                        headers=self._get_headers(),
                        json=message
                    )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'message_id': result['id'],
                    'thread_id': result['threadId']
                }
            else:
                logger.error(f"Gmail send failed: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Gmail send error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _create_message(self, to_email, subject, body, attachments=None):
        """Create email message in Gmail format"""
        import email.mime.text
        import email.mime.multipart
        import email.mime.base
        from email import encoders
        
        if attachments:
            message = email.mime.multipart.MIMEMultipart()
        else:
            message = email.mime.text.MIMEText(body, 'html')
        
        message['to'] = to_email
        message['subject'] = subject
        
        if attachments:
            message.attach(email.mime.text.MIMEText(body, 'html'))
            
            for attachment in attachments:
                part = email.mime.base.MIMEBase('application', 'octet-stream')
                part.set_payload(attachment['content'])
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {attachment["filename"]}'
                )
                message.attach(part)
        
        return base64.urlsafe_b64encode(message.as_bytes()).decode()
    
    def get_emails(self, folder='INBOX', limit=50):
        """Get emails from Gmail"""
        try:
            # Get message list
            response = requests.get(
                f'{self.base_url}/users/me/messages',
                headers=self._get_headers(),
                params={
                    'labelIds': folder,
                    'maxResults': limit
                }
            )
            
            if response.status_code == 401:
                if self._refresh_access_token():
                    response = requests.get(
                        f'{self.base_url}/users/me/messages',
                        headers=self._get_headers(),
                        params={
                            'labelIds': folder,
                            'maxResults': limit
                        }
                    )
            
            if response.status_code == 200:
                messages_data = response.json()
                emails = []
                
                for message in messages_data.get('messages', []):
                    email_data = self._get_email_details(message['id'])
                    if email_data:
                        emails.append(email_data)
                
                return {'success': True, 'emails': emails}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Gmail get emails error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _get_email_details(self, message_id):
        """Get detailed email information"""
        try:
            response = requests.get(
                f'{self.base_url}/users/me/messages/{message_id}',
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                message_data = response.json()
                
                # Extract email details
                headers = {h['name']: h['value'] for h in message_data['payload']['headers']}
                
                return {
                    'id': message_id,
                    'thread_id': message_data['threadId'],
                    'subject': headers.get('Subject', ''),
                    'from': headers.get('From', ''),
                    'to': headers.get('To', ''),
                    'date': headers.get('Date', ''),
                    'snippet': message_data.get('snippet', ''),
                    'body': self._extract_body(message_data['payload']),
                    'labels': message_data.get('labelIds', [])
                }
        except Exception as e:
            logger.error(f"Error getting email details: {str(e)}")
        
        return None
    
    def _extract_body(self, payload):
        """Extract email body from payload"""
        body = ''
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/html':
                    if 'data' in part['body']:
                        body = base64.urlsafe_b64decode(part['body']['data']).decode()
                        break
                elif part['mimeType'] == 'text/plain' and not body:
                    if 'data' in part['body']:
                        body = base64.urlsafe_b64decode(part['body']['data']).decode()
        else:
            if payload['mimeType'] in ['text/html', 'text/plain']:
                if 'data' in payload['body']:
                    body = base64.urlsafe_b64decode(payload['body']['data']).decode()
        
        return body

class OutlookIntegration(EmailIntegrationBase):
    """Outlook integration using Microsoft Graph API"""
    
    def __init__(self, company_id, credentials):
        super().__init__(company_id, credentials)
        self.base_url = 'https://graph.microsoft.com/v1.0'
        self.access_token = credentials.get('access_token')
        self.refresh_token = credentials.get('refresh_token')
    
    def _get_headers(self):
        """Get authorization headers"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def send_email(self, to_email, subject, body, attachments=None):
        """Send email via Microsoft Graph API"""
        try:
            message = {
                'message': {
                    'subject': subject,
                    'body': {
                        'contentType': 'HTML',
                        'content': body
                    },
                    'toRecipients': [
                        {
                            'emailAddress': {
                                'address': to_email
                            }
                        }
                    ]
                }
            }
            
            if attachments:
                message['message']['attachments'] = []
                for attachment in attachments:
                    message['message']['attachments'].append({
                        '@odata.type': '#microsoft.graph.fileAttachment',
                        'name': attachment['filename'],
                        'contentBytes': base64.b64encode(attachment['content']).decode()
                    })
            
            response = requests.post(
                f'{self.base_url}/me/sendMail',
                headers=self._get_headers(),
                json=message
            )
            
            if response.status_code == 202:
                return {'success': True, 'message_id': 'sent'}
            else:
                logger.error(f"Outlook send failed: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Outlook send error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_emails(self, folder='inbox', limit=50):
        """Get emails from Outlook"""
        try:
            response = requests.get(
                f'{self.base_url}/me/mailFolders/{folder}/messages',
                headers=self._get_headers(),
                params={'$top': limit, '$select': 'id,subject,from,toRecipients,receivedDateTime,bodyPreview,body'}
            )
            
            if response.status_code == 200:
                messages_data = response.json()
                emails = []
                
                for message in messages_data.get('value', []):
                    emails.append({
                        'id': message['id'],
                        'subject': message['subject'],
                        'from': message['from']['emailAddress']['address'] if message.get('from') else '',
                        'to': ', '.join([r['emailAddress']['address'] for r in message.get('toRecipients', [])]),
                        'date': message['receivedDateTime'],
                        'snippet': message['bodyPreview'],
                        'body': message['body']['content'] if message.get('body') else ''
                    })
                
                return {'success': True, 'emails': emails}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Outlook get emails error: {str(e)}")
            return {'success': False, 'error': str(e)}

class EmailIntegrationManager:
    """Manage email integrations"""
    
    @staticmethod
    def get_integration(company_id, provider):
        """Get email integration for company"""
        from .models import EmailIntegration
        
        try:
            integration = EmailIntegration.objects.get(
                company_id=company_id,
                provider=provider,
                is_active=True
            )
            
            if provider == 'gmail':
                return GmailIntegration(company_id, integration.credentials)
            elif provider == 'outlook':
                return OutlookIntegration(company_id, integration.credentials)
            
        except EmailIntegration.DoesNotExist:
            pass
        
        return None
    
    @staticmethod
    def send_crm_email(company_id, provider, to_email, subject, body, attachments=None):
        """Send CRM email"""
        integration = EmailIntegrationManager.get_integration(company_id, provider)
        
        if integration:
            # Add tracking
            tracking_pixel, tracking_id = integration.track_email(
                f"crm_{timezone.now().timestamp()}", 
                to_email
            )
            
            # Add tracking to body
            body_with_tracking = body + tracking_pixel
            
            result = integration.send_email(to_email, subject, body_with_tracking, attachments)
            
            # Log email activity
            if result['success']:
                EmailIntegrationManager._log_email_activity(
                    company_id, 'sent', to_email, subject, tracking_id
                )
            
            return result
        
        return {'success': False, 'error': 'Email integration not configured'}
    
    @staticmethod
    def _log_email_activity(company_id, activity_type, email, subject, tracking_id):
        """Log email activity"""
        from .models import EmailActivity
        
        EmailActivity.objects.create(
            company_id=company_id,
            activity_type=activity_type,
            email_address=email,
            subject=subject,
            tracking_id=tracking_id
        )

# Email tracking views
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET"])
def email_tracking_pixel(request, tracking_id):
    """Handle email tracking pixel requests"""
    try:
        # Log email open
        parts = tracking_id.split('_')
        if len(parts) >= 3:
            company_id = parts[0]
            email_id = parts[1]
            recipient = '_'.join(parts[2:])
            
            EmailIntegrationManager._log_email_activity(
                company_id, 'opened', recipient, 'Email Opened', tracking_id
            )
    except Exception as e:
        logger.error(f"Email tracking error: {str(e)}")
    
    # Return 1x1 transparent pixel
    pixel_data = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
    return HttpResponse(pixel_data, content_type='image/gif')