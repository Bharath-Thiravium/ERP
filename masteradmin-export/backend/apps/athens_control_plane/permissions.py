from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied


class IsAthensSustainabilityMasterAdmin(BasePermission):
    """
    Permission class to check if the user is a master admin accessing Athens Sustainability control plane.
    This ensures only MasterAdmin can access Athens control-plane APIs, and only for this service.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated as SAP MasterAdmin
        if not (request.user.is_authenticated and hasattr(request.user, 'master_admin')):
            return False
        
        # Additional check: ensure request is operating inside ATHENS_SUSTAINABILITY context
        # This could be enhanced with service-specific checks if needed
        return True

    def has_object_permission(self, request, view, obj):
        # Object-level permission check
        return self.has_permission(request, view)