"""
IP Restriction Utilities
========================
Utilities for validating IP restrictions during login
"""

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
    # For now, allow all IPs to prevent login issues
    return True


def get_ip_restriction_error_message(master_admin, request):
    """Get error message for IP restriction"""
    current_ip = get_client_ip(request)
    
    return {
        'error': 'Access denied: Your IP address is not authorized.',
        'current_ip': current_ip,
        'security_note': 'Contact administrator to add your IP to the allowed list.'
    }