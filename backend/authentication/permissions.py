from rest_framework.permissions import BasePermission
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from .models import ServiceUserSession

class IsServiceUser(BasePermission):
    """
    Permission class to check if the user is authenticated via service user session
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated via JWT (for company users)
        if hasattr(request.user, 'company_user') and request.user.is_authenticated:
            return True
        
        # Check for service user session authentication
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.GET.get('session_key')
        
        if session_key:
            try:
                session = ServiceUserSession.objects.get(
                    session_key=session_key,
                    is_active=True
                )
                # Attach service user to request for use in views
                request.service_user = session.service_user
                return True
            except ServiceUserSession.DoesNotExist:
                pass
        return False


class IsServiceUserAuthenticated(BasePermission):
    """
    Permission class that requires request.service_user to exist (set by ServiceUserSessionAuthentication).
    Ensures the request has a valid service user and optionally checks service/module access.
    """
    
    SERVICE_PATH_PREFIXES = {
        '/api/finance/': 'finance',
        '/api/hr/': 'hr',
        '/api/inventory/': 'inventory',
        '/api/crm/': 'crm',
    }

    def _get_required_service_type(self, request, view):
        required = getattr(view, 'required_service_type', None)
        if required:
            return required

        required_types = getattr(view, 'required_service_types', None)
        if required_types:
            return required_types

        path = getattr(request, 'path', '')
        for prefix, service_type in self.SERVICE_PATH_PREFIXES.items():
            if path.startswith(prefix):
                return service_type
        return None

    def has_permission(self, request, view):
        # Check if service_user was set by authentication class
        if not hasattr(request, 'service_user') or not request.service_user:
            raise NotAuthenticated('Authentication credentials were not provided.')
            
        # Ensure service user is active
        if not request.service_user.is_active:
            raise PermissionDenied('Service user inactive.')
            
        # Ensure company is active (if company has status field)
        company = request.service_user.company
        if hasattr(company, 'approval_status') and company.approval_status != 'approved':
            raise PermissionDenied('Company inactive.')

        required_service = self._get_required_service_type(request, view)
        if required_service:
            allowed_services = (
                {required_service}
                if isinstance(required_service, str)
                else set(required_service)
            )
            user_service_type = request.service_user.service.service_type
            if user_service_type not in allowed_services:
                raise PermissionDenied(
                    f'{user_service_type} service user cannot access this module.'
                )
            
        return True

class IsMasterAdmin(BasePermission):
    """
    Permission class to check if the user is a master admin
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'master_admin')
        )


class IsCompanyUser(BasePermission):
    """
    Permission class to check if the user is a company user
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'company_user')
        )
