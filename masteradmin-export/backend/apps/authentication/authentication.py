from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from .models import ServiceUserSession


class ServiceUserSessionAuthentication(BaseAuthentication):
    """
    Authentication class for service user sessions using Bearer token in Authorization header.
    
    Parses Authorization header "Bearer <session_key>" and validates ServiceUserSession.
    Sets request.service_user for use in views and permissions.
    """
    
    def authenticate(self, request):
        """
        Authenticate the request using service user session key.
        
        Returns:
            tuple: (user, auth) where user is linked Django user when available
            None: If no authentication is attempted
            
        Raises:
            AuthenticationFailed: If authentication fails
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        session_key = auth_header[7:]  # Remove 'Bearer ' prefix
        
        if not session_key:
            raise AuthenticationFailed('Invalid token format')
            
        try:
            session = ServiceUserSession.objects.select_related(
                'service_user__company', 'service_user__service'
            ).get(
                session_key=session_key,
                is_active=True
            )
        except ServiceUserSession.DoesNotExist:
            raise AuthenticationFailed('Invalid or expired session')
            
        # Check expiration and revoke if expired
        expires_at = getattr(session, 'expires_at', None)
        if expires_at and timezone.now() > expires_at:
            session.is_active = False
            session.revoked_at = timezone.now()
            session.save(update_fields=['is_active', 'revoked_at'])
            raise AuthenticationFailed('Session expired')
                
        # Update last_seen_at periodically (avoid updating every request)
        now = timezone.now()
        last_seen = getattr(session, 'last_seen_at', None)
        if not last_seen or (now - last_seen).total_seconds() > 300:  # Update every 5 minutes
            session.last_seen_at = now
            session.save(update_fields=['last_seen_at'])
        
        # Set service_user on request for use in views/permissions
        request.service_user = session.service_user
        
        # Return AnonymousUser since CompanyServiceUser is not linked to Django User
        return (AnonymousUser(), session)
        
    def authenticate_header(self, request):
        """
        Return the WWW-Authenticate header value for 401 responses.
        """
        return 'Bearer'