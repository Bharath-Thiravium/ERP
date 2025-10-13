"""
IP Restriction Utilities
========================
Utilities for validating IP restrictions during login
"""
from .enhanced_security_models import IPRestriction, SecuritySettings


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip


def is_ip_allowed(master_admin, request):
    """Check if current IP is allowed for master admin"""
    try:
        # Check if IP restrictions are enabled
        settings, _ = SecuritySettings.objects.get_or_create(
            master_admin=master_admin,
            defaults={'ip_restrictions_enabled': False}
        )
        
        if not settings.ip_restrictions_enabled:
            return True  # IP restrictions disabled, allow all
        
        # Get current IP
        current_ip = get_client_ip(request)
        
        # Check if IP is in allowed list
        allowed_ip = IPRestriction.objects.filter(
            master_admin=master_admin,
            ip_address=current_ip,
            is_active=True
        ).first()
        
        if allowed_ip:
            # Update last used timestamp
            from django.utils import timezone
            allowed_ip.last_used = timezone.now()
            allowed_ip.save()
            return True
        
        return False  # IP not in allowed list
        
    except Exception as e:
        print(f"Error checking IP restriction: {e}")
        return True  # Allow on error to prevent lockout


def get_ip_restriction_error_message(master_admin, request):
    """Get error message for IP restriction"""
    current_ip = get_client_ip(request)
    
    # Get allowed IPs for reference
    allowed_ips = IPRestriction.objects.filter(
        master_admin=master_admin,
        is_active=True
    ).values_list('ip_address', flat=True)
    
    return {
        'error': 'Access denied: Your IP address is not authorized.',
        'current_ip': current_ip,
        'allowed_ips_count': len(allowed_ips),
        'security_note': 'Contact administrator to add your IP to the allowed list.'
    }


def add_current_ip_restriction(master_admin, request, description="Auto-added during login"):
    """Add current IP to restrictions (for first-time setup)"""
    try:
        current_ip = get_client_ip(request)
        
        # Check if IP already exists
        existing = IPRestriction.objects.filter(
            master_admin=master_admin,
            ip_address=current_ip
        ).first()
        
        if not existing:
            IPRestriction.objects.create(
                master_admin=master_admin,
                ip_address=current_ip,
                description=description,
                is_active=True
            )
            return True
        
        return False
        
    except Exception as e:
        print(f"Error adding IP restriction: {e}")
        return False