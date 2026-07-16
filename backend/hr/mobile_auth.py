from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission

from .models import EmployeeMobileSession


class EmployeeMobileAuthentication(BaseAuthentication):
    """Bearer-token authentication for employee mobile app sessions."""

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        session_key = None

        if auth_header and auth_header.startswith('Bearer '):
            session_key = auth_header[7:]

        if not session_key:
            session_key = request.query_params.get('session_key') or request.GET.get('session_key')

        if not session_key:
            return None

        try:
            session = EmployeeMobileSession.objects.select_related(
                'employee__company', 'employee__department', 'employee__designation'
            ).get(session_key=session_key, is_active=True)
        except EmployeeMobileSession.DoesNotExist:
            raise AuthenticationFailed('Invalid or expired employee session')

        now = timezone.now()
        if session.expires_at and now > session.expires_at:
            session.is_active = False
            session.revoked_at = now
            session.save(update_fields=['is_active', 'revoked_at'])
            raise AuthenticationFailed('Employee session expired')

        if not session.last_seen_at or (now - session.last_seen_at).total_seconds() > 300:
            session.last_seen_at = now
            session.save(update_fields=['last_seen_at'])

        request.employee = session.employee
        request.employee_mobile_session = session
        return (AnonymousUser(), session)


class IsEmployeeMobileAuthenticated(BasePermission):
    """Require a validated employee mobile session."""

    def has_permission(self, request, view):
        return hasattr(request, 'employee') and getattr(request, 'employee', None) is not None
