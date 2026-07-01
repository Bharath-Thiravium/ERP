"""
Calendar integration for CRM (Google Calendar/Outlook Calendar)
"""
import logging
from datetime import datetime, timedelta
from django.utils import timezone
import requests
import json

logger = logging.getLogger('crm_calendar')

class CalendarIntegrationBase:
    """Base class for calendar integrations"""
    
    def __init__(self, company_id, credentials):
        self.company_id = company_id
        self.credentials = credentials
    
    def create_event(self, event_data):
        """Create calendar event - to be implemented by subclasses"""
        raise NotImplementedError
    
    def update_event(self, event_id, event_data):
        """Update calendar event - to be implemented by subclasses"""
        raise NotImplementedError
    
    def delete_event(self, event_id):
        """Delete calendar event - to be implemented by subclasses"""
        raise NotImplementedError
    
    def get_events(self, start_date, end_date):
        """Get calendar events - to be implemented by subclasses"""
        raise NotImplementedError

class GoogleCalendarIntegration(CalendarIntegrationBase):
    """Google Calendar integration"""
    
    def __init__(self, company_id, credentials):
        super().__init__(company_id, credentials)
        self.base_url = 'https://www.googleapis.com/calendar/v3'
        self.access_token = credentials.get('access_token')
        self.refresh_token = credentials.get('refresh_token')
        self.calendar_id = credentials.get('calendar_id', 'primary')
    
    def _get_headers(self):
        """Get authorization headers"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def _refresh_access_token(self):
        """Refresh access token"""
        try:
            from django.conf import settings
            response = requests.post('https://oauth2.googleapis.com/token', data={
                'client_id': settings.GOOGLE_CLIENT_ID,
                'client_secret': settings.GOOGLE_CLIENT_SECRET,
                'refresh_token': self.refresh_token,
                'grant_type': 'refresh_token'
            })
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                self._update_stored_credentials(token_data)
                return True
        except Exception as e:
            logger.error(f"Failed to refresh Google Calendar token: {str(e)}")
        
        return False
    
    def _update_stored_credentials(self, token_data):
        """Update stored credentials"""
        from .models import CalendarIntegration
        try:
            integration = CalendarIntegration.objects.get(
                company_id=self.company_id,
                provider='google'
            )
            credentials = integration.get_credentials()
            credentials['access_token'] = token_data['access_token']
            if 'refresh_token' in token_data:
                credentials['refresh_token'] = token_data['refresh_token']
            integration.set_credentials(credentials)
            integration.save()
        except CalendarIntegration.DoesNotExist:
            pass
    
    def create_event(self, event_data):
        """Create Google Calendar event"""
        try:
            # Convert CRM event data to Google Calendar format
            google_event = self._convert_to_google_format(event_data)
            
            response = requests.post(
                f'{self.base_url}/calendars/{self.calendar_id}/events',
                headers=self._get_headers(),
                json=google_event
            )
            
            if response.status_code == 401:
                if self._refresh_access_token():
                    response = requests.post(
                        f'{self.base_url}/calendars/{self.calendar_id}/events',
                        headers=self._get_headers(),
                        json=google_event
                    )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'event_id': result['id'],
                    'html_link': result.get('htmlLink', ''),
                    'hangout_link': result.get('hangoutLink', '')
                }
            else:
                logger.error(f"Google Calendar create failed: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Google Calendar create error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def update_event(self, event_id, event_data):
        """Update Google Calendar event"""
        try:
            google_event = self._convert_to_google_format(event_data)
            
            response = requests.put(
                f'{self.base_url}/calendars/{self.calendar_id}/events/{event_id}',
                headers=self._get_headers(),
                json=google_event
            )
            
            if response.status_code == 401:
                if self._refresh_access_token():
                    response = requests.put(
                        f'{self.base_url}/calendars/{self.calendar_id}/events/{event_id}',
                        headers=self._get_headers(),
                        json=google_event
                    )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'event_id': result['id'],
                    'updated': result.get('updated', '')
                }
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Google Calendar update error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def delete_event(self, event_id):
        """Delete Google Calendar event"""
        try:
            response = requests.delete(
                f'{self.base_url}/calendars/{self.calendar_id}/events/{event_id}',
                headers=self._get_headers()
            )
            
            if response.status_code == 401:
                if self._refresh_access_token():
                    response = requests.delete(
                        f'{self.base_url}/calendars/{self.calendar_id}/events/{event_id}',
                        headers=self._get_headers()
                    )
            
            if response.status_code == 204:
                return {'success': True}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Google Calendar delete error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_events(self, start_date, end_date):
        """Get Google Calendar events"""
        try:
            params = {
                'timeMin': start_date.isoformat() + 'Z',
                'timeMax': end_date.isoformat() + 'Z',
                'singleEvents': True,
                'orderBy': 'startTime'
            }
            
            response = requests.get(
                f'{self.base_url}/calendars/{self.calendar_id}/events',
                headers=self._get_headers(),
                params=params
            )
            
            if response.status_code == 401:
                if self._refresh_access_token():
                    response = requests.get(
                        f'{self.base_url}/calendars/{self.calendar_id}/events',
                        headers=self._get_headers(),
                        params=params
                    )
            
            if response.status_code == 200:
                result = response.json()
                events = []
                
                for item in result.get('items', []):
                    events.append(self._convert_from_google_format(item))
                
                return {'success': True, 'events': events}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Google Calendar get events error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _convert_to_google_format(self, event_data):
        """Convert CRM event data to Google Calendar format"""
        google_event = {
            'summary': event_data['title'],
            'description': event_data.get('description', ''),
            'start': {
                'dateTime': event_data['start_time'].isoformat(),
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': event_data['end_time'].isoformat(),
                'timeZone': 'UTC'
            }
        }
        
        # Add attendees
        if 'attendees' in event_data:
            google_event['attendees'] = [
                {'email': email} for email in event_data['attendees']
            ]
        
        # Add location
        if 'location' in event_data:
            google_event['location'] = event_data['location']
        
        # Add reminders
        if event_data.get('reminders'):
            google_event['reminders'] = {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 60},
                    {'method': 'popup', 'minutes': 15}
                ]
            }
        
        # Add conference data for video meetings
        if event_data.get('create_meeting'):
            google_event['conferenceData'] = {
                'createRequest': {
                    'requestId': f"crm_{event_data.get('crm_activity_id', 'unknown')}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            }
        
        return google_event
    
    def _convert_from_google_format(self, google_event):
        """Convert Google Calendar event to CRM format"""
        start_time = google_event['start'].get('dateTime', google_event['start'].get('date'))
        end_time = google_event['end'].get('dateTime', google_event['end'].get('date'))
        
        return {
            'id': google_event['id'],
            'title': google_event.get('summary', ''),
            'description': google_event.get('description', ''),
            'start_time': start_time,
            'end_time': end_time,
            'location': google_event.get('location', ''),
            'attendees': [a['email'] for a in google_event.get('attendees', [])],
            'html_link': google_event.get('htmlLink', ''),
            'hangout_link': google_event.get('hangoutLink', ''),
            'status': google_event.get('status', 'confirmed')
        }

class OutlookCalendarIntegration(CalendarIntegrationBase):
    """Outlook Calendar integration using Microsoft Graph API"""
    
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
    
    def create_event(self, event_data):
        """Create Outlook Calendar event"""
        try:
            outlook_event = self._convert_to_outlook_format(event_data)
            
            response = requests.post(
                f'{self.base_url}/me/events',
                headers=self._get_headers(),
                json=outlook_event
            )
            
            if response.status_code == 201:
                result = response.json()
                return {
                    'success': True,
                    'event_id': result['id'],
                    'web_link': result.get('webLink', ''),
                    'online_meeting_url': result.get('onlineMeeting', {}).get('joinUrl', '')
                }
            else:
                logger.error(f"Outlook Calendar create failed: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Outlook Calendar create error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def update_event(self, event_id, event_data):
        """Update Outlook Calendar event"""
        try:
            outlook_event = self._convert_to_outlook_format(event_data)
            
            response = requests.patch(
                f'{self.base_url}/me/events/{event_id}',
                headers=self._get_headers(),
                json=outlook_event
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'event_id': result['id']
                }
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Outlook Calendar update error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def delete_event(self, event_id):
        """Delete Outlook Calendar event"""
        try:
            response = requests.delete(
                f'{self.base_url}/me/events/{event_id}',
                headers=self._get_headers()
            )
            
            if response.status_code == 204:
                return {'success': True}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Outlook Calendar delete error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_events(self, start_date, end_date):
        """Get Outlook Calendar events"""
        try:
            params = {
                '$filter': f"start/dateTime ge '{start_date.isoformat()}' and end/dateTime le '{end_date.isoformat()}'",
                '$orderby': 'start/dateTime',
                '$select': 'id,subject,body,start,end,location,attendees,webLink,onlineMeeting'
            }
            
            response = requests.get(
                f'{self.base_url}/me/events',
                headers=self._get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                result = response.json()
                events = []
                
                for item in result.get('value', []):
                    events.append(self._convert_from_outlook_format(item))
                
                return {'success': True, 'events': events}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Outlook Calendar get events error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _convert_to_outlook_format(self, event_data):
        """Convert CRM event data to Outlook format"""
        outlook_event = {
            'subject': event_data['title'],
            'body': {
                'contentType': 'HTML',
                'content': event_data.get('description', '')
            },
            'start': {
                'dateTime': event_data['start_time'].isoformat(),
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': event_data['end_time'].isoformat(),
                'timeZone': 'UTC'
            }
        }
        
        # Add attendees
        if 'attendees' in event_data:
            outlook_event['attendees'] = [
                {
                    'emailAddress': {'address': email, 'name': email},
                    'type': 'required'
                } for email in event_data['attendees']
            ]
        
        # Add location
        if 'location' in event_data:
            outlook_event['location'] = {
                'displayName': event_data['location']
            }
        
        # Add online meeting
        if event_data.get('create_meeting'):
            outlook_event['isOnlineMeeting'] = True
            outlook_event['onlineMeetingProvider'] = 'teamsForBusiness'
        
        return outlook_event
    
    def _convert_from_outlook_format(self, outlook_event):
        """Convert Outlook event to CRM format"""
        return {
            'id': outlook_event['id'],
            'title': outlook_event.get('subject', ''),
            'description': outlook_event.get('body', {}).get('content', ''),
            'start_time': outlook_event['start']['dateTime'],
            'end_time': outlook_event['end']['dateTime'],
            'location': outlook_event.get('location', {}).get('displayName', ''),
            'attendees': [a['emailAddress']['address'] for a in outlook_event.get('attendees', [])],
            'web_link': outlook_event.get('webLink', ''),
            'online_meeting_url': outlook_event.get('onlineMeeting', {}).get('joinUrl', '')
        }

class CalendarIntegrationManager:
    """Manage calendar integrations"""
    
    @staticmethod
    def get_integration(company_id, provider):
        """Get calendar integration for company"""
        from .models import CalendarIntegration
        
        try:
            integration = CalendarIntegration.objects.get(
                company_id=company_id,
                provider=provider,
                is_active=True
            )
            
            if provider == 'google':
                return GoogleCalendarIntegration(company_id, integration.get_credentials())
            elif provider == 'outlook':
                return OutlookCalendarIntegration(company_id, integration.get_credentials())
            
        except CalendarIntegration.DoesNotExist:
            pass
        
        return None
    
    @staticmethod
    def sync_crm_activity_to_calendar(activity, provider='google'):
        """Sync CRM activity to calendar"""
        integration = CalendarIntegrationManager.get_integration(
            activity.company.id, provider
        )
        
        if integration:
            event_data = {
                'title': activity.subject,
                'description': activity.description,
                'start_time': activity.due_date,
                'end_time': activity.due_date + timedelta(minutes=activity.duration_minutes),
                'attendees': [activity.contact.email] if activity.contact and activity.contact.email else [],
                'location': getattr(activity, 'location', ''),
                'create_meeting': activity.activity_type in ['meeting', 'demo'],
                'crm_activity_id': activity.id
            }
            
            result = integration.create_event(event_data)
            
            if result['success']:
                # Store calendar event ID in activity
                activity.calendar_event_id = result['event_id']
                activity.calendar_provider = provider
                if 'html_link' in result:
                    activity.calendar_link = result['html_link']
                elif 'web_link' in result:
                    activity.calendar_link = result['web_link']
                activity.save()
                
                return result
        
        return {'success': False, 'error': 'Calendar integration not configured'}
    
    @staticmethod
    def update_calendar_event(activity):
        """Update calendar event when CRM activity changes"""
        if hasattr(activity, 'calendar_event_id') and activity.calendar_event_id:
            provider = getattr(activity, 'calendar_provider', 'google')
            integration = CalendarIntegrationManager.get_integration(
                activity.company.id, provider
            )
            
            if integration:
                event_data = {
                    'title': activity.subject,
                    'description': activity.description,
                    'start_time': activity.due_date,
                    'end_time': activity.due_date + timedelta(minutes=activity.duration_minutes),
                    'attendees': [activity.contact.email] if activity.contact and activity.contact.email else [],
                    'location': getattr(activity, 'location', ''),
                }
                
                return integration.update_event(activity.calendar_event_id, event_data)
        
        return {'success': False, 'error': 'No calendar event to update'}
    
    @staticmethod
    def delete_calendar_event(activity):
        """Delete calendar event when CRM activity is deleted"""
        if hasattr(activity, 'calendar_event_id') and activity.calendar_event_id:
            provider = getattr(activity, 'calendar_provider', 'google')
            integration = CalendarIntegrationManager.get_integration(
                activity.company.id, provider
            )
            
            if integration:
                return integration.delete_event(activity.calendar_event_id)
        
        return {'success': False, 'error': 'No calendar event to delete'}