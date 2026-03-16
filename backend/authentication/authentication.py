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
        Supports both Authorization header and query parameter.
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        session_key = None
        
        # Try Authorization header first
        if auth_header and auth_header.startswith('Bearer '):
            session_key = auth_header[7:]
        # Fallback to query parameter
        elif 'session_key' in request.GET:
            session_key = request.GET.get('session_key')
        
        if not session_key:
            return None
            
        try:
            session = ServiceUserSession.objects.select_related(
                'service_user__company', 'service_user__service'
            ).get(
                session_key=session_key,
                is_active=True
            )
        except ServiceUserSession.DoesNotExist:
            raise AuthenticationFailed('Invalid or expired session')
            
        # Check expiration
        expires_at = getattr(session, 'expires_at', None)
        if expires_at and timezone.now() > expires_at:
            session.is_active = False
            session.revoked_at = timezone.now()
            session.save(update_fields=['is_active', 'revoked_at'])
            raise AuthenticationFailed('Session expired')
                
        # Update last_seen_at
        now = timezone.now()
        last_seen = getattr(session, 'last_seen_at', None)
        if not last_seen or (now - last_seen).total_seconds() > 300:
            session.last_seen_at = now
            session.save(update_fields=['last_seen_at'])
        
        request.service_user = session.service_user
        return (AnonymousUser(), session)
        
    def authenticate_header(self, request):
        """
        Return the WWW-Authenticate header value for 401 responses.
        """
        return 'Bearer'