from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction, models
import ipaddress
import re

from .security_models import CompanyIpRestriction


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def validate_ip_address(ip_str):
    """Validate IP address or CIDR notation"""
    try:
        # Try to parse as network (CIDR)
        ipaddress.ip_network(ip_str, strict=False)
        return True
    except ValueError:
        try:
            # Try to parse as single IP
            ipaddress.ip_address(ip_str)
            return True
        except ValueError:
            return False


def is_ip_allowed(company, client_ip):
    """Check if IP is allowed based on company IP restrictions"""
    # Check if IP restrictions are enabled
    from .security_models import CompanySecuritySettings
    try:
        security_settings = CompanySecuritySettings.objects.get(company=company)
        if not security_settings.ip_restrictions_enabled:
            return True  # IP restrictions disabled = allow all
    except CompanySecuritySettings.DoesNotExist:
        return True  # No settings = allow all
    
    # Get IP restrictions for the company
    restrictions = CompanyIpRestriction.objects.filter(
        company=company,
        is_active=True
    ).order_by('-created_at')
    
    if not restrictions.exists():
        return True  # IP restrictions enabled but no rules configured = allow all
    
    try:
        client_ip_obj = ipaddress.ip_address(client_ip)
    except ValueError:
        return True  # Unparseable IP = allow (fail open for login)
    
    # Process rules in priority order
    for restriction in restrictions:
        try:
            network = ipaddress.ip_network(restriction.ip_address, strict=False)
            if client_ip_obj in network:
                return restriction.restriction_type == 'allow'
        except ValueError:
            continue
    
    # No matching rule = allow (allowlist model: only explicitly blocked IPs are denied)
    return True


class CompanyIpRestrictionView(APIView):
    """Company IP restriction management"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get IP restrictions for company"""
        if not hasattr(request.user, 'company_user'):
            return Response({'error': 'Only company users can access IP restrictions'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        company = request.user.company_user.company
        
        # Get IP restrictions
        restrictions = CompanyIpRestriction.objects.filter(
            company=company
        ).order_by('-created_at')
        
        # Check if IP restrictions are enabled from security settings
        from .security_models import CompanySecuritySettings
        try:
            security_settings = CompanySecuritySettings.objects.get(company=company)
            is_enabled = security_settings.ip_restrictions_enabled
        except CompanySecuritySettings.DoesNotExist:
            is_enabled = False
        
        restrictions_data = []
        for restriction in restrictions:
            restrictions_data.append({
                'id': restriction.id,
                'ip_address': restriction.ip_address,
                'rule_type': restriction.restriction_type,
                'description': restriction.description,
                'is_active': restriction.is_active,
                'created_at': restriction.created_at.isoformat()
            })
        
        return Response({
            'restrictions': restrictions_data,
            'is_enabled': is_enabled,
            'current_ip': get_client_ip(request)
        })
    
    def post(self, request):
        """Create new IP restriction"""
        if not hasattr(request.user, 'company_user'):
            return Response({'error': 'Only company users can create IP restrictions'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        company = request.user.company_user.company
        
        ip_address = request.data.get('ip_address', '').strip()
        restriction_type = request.data.get('rule_type', 'allow')
        description = request.data.get('description', '')
        
        # Validate IP address
        if not ip_address:
            return Response({'error': 'IP address is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if not validate_ip_address(ip_address):
            return Response({'error': 'Invalid IP address or CIDR notation'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if restriction_type not in ['allow', 'deny']:
            return Response({'error': 'Rule type must be allow or deny'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if IP restrictions are enabled
        from .security_models import CompanySecuritySettings
        try:
            security_settings = CompanySecuritySettings.objects.get(company=company)
            is_enabled = security_settings.ip_restrictions_enabled
        except CompanySecuritySettings.DoesNotExist:
            is_enabled = False
        
        # Create IP restriction
        with transaction.atomic():
            restriction = CompanyIpRestriction.objects.create(
                company=company,
                ip_address=ip_address,
                restriction_type=restriction_type,
                description=description,
                is_active=is_enabled
            )
        
        return Response({
            'id': restriction.id,
            'ip_address': restriction.ip_address,
            'rule_type': restriction.restriction_type,
            'description': restriction.description,
            'is_active': restriction.is_active,
            'created_at': restriction.created_at.isoformat()
        }, status=status.HTTP_201_CREATED)


class CompanyIpRestrictionDetailView(APIView):
    """Individual IP restriction management"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, restriction_id):
        """Delete IP restriction"""
        if not hasattr(request.user, 'company_user'):
            return Response({'error': 'Only company users can delete IP restrictions'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        company = request.user.company_user.company
        
        try:
            restriction = CompanyIpRestriction.objects.get(
                id=restriction_id,
                company=company
            )
            restriction.delete()
            return Response({'message': 'IP restriction deleted successfully'})
        except CompanyIpRestriction.DoesNotExist:
            return Response({'error': 'IP restriction not found'}, 
                          status=status.HTTP_404_NOT_FOUND)


class CompanyIpRestrictionToggleView(APIView):
    """Toggle IP restrictions on/off"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Toggle IP restrictions"""
        if not hasattr(request.user, 'company_user'):
            return Response({'error': 'Only company users can toggle IP restrictions'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        company = request.user.company_user.company
        enabled = request.data.get('enabled', False)
        
        # Get or create security settings
        from .security_models import CompanySecuritySettings
        security_settings, created = CompanySecuritySettings.objects.get_or_create(
            company=company,
            defaults={'ip_restrictions_enabled': enabled}
        )
        
        # Update IP restrictions enabled flag
        security_settings.ip_restrictions_enabled = enabled
        security_settings.save()
        
        # Update existing rules if any
        updated_count = CompanyIpRestriction.objects.filter(company=company).update(is_active=enabled)
        
        return Response({
            'message': f'IP restrictions {"enabled" if enabled else "disabled"}',
            'enabled': enabled,
            'rules_affected': updated_count
        })