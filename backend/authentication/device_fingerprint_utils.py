"""
Device Fingerprinting Utilities
===============================
Utilities for creating and managing device fingerprints during login
"""
import uuid
from django.utils import timezone
from .enhanced_security_models import DeviceFingerprint, SecuritySettings


def get_device_info(request):
    """Extract device information from request"""
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Parse browser info
    browser = 'Unknown'
    os = 'Unknown'
    
    if 'Chrome' in user_agent:
        browser = 'Chrome'
    elif 'Firefox' in user_agent:
        browser = 'Firefox'
    elif 'Safari' in user_agent:
        browser = 'Safari'
    elif 'Edge' in user_agent:
        browser = 'Edge'
    
    if 'Windows' in user_agent:
        os = 'Windows'
    elif 'Mac' in user_agent:
        os = 'macOS'
    elif 'Linux' in user_agent:
        os = 'Linux'
    elif 'Android' in user_agent:
        os = 'Android'
    elif 'iOS' in user_agent:
        os = 'iOS'
    
    return {
        'browser': browser,
        'os': os,
        'user_agent': user_agent,
        'device_name': f"{browser} on {os}"
    }


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip


def create_or_update_device_fingerprint(master_admin, request):
    """Create or update device fingerprint for master admin"""
    try:
        # Check if device fingerprinting is enabled
        settings, _ = SecuritySettings.objects.get_or_create(
            master_admin=master_admin,
            defaults={'device_fingerprinting_enabled': True}
        )
        
        if not settings.device_fingerprinting_enabled:
            return None
        
        # Get device info
        device_info = get_device_info(request)
        ip_address = get_client_ip(request)
        
        # Create unique fingerprint based on browser + OS + IP
        fingerprint_key = f"{device_info['browser']}_{device_info['os']}_{ip_address}"
        
        # Check if device already exists
        device, created = DeviceFingerprint.objects.get_or_create(
            master_admin=master_admin,
            browser=device_info['browser'],
            os=device_info['os'],
            ip_address=ip_address,
            defaults={
                'device_name': device_info['device_name'],
                'location': 'Unknown',  # Could integrate with IP geolocation
                'is_trusted': False  # New devices start untrusted
            }
        )
        
        if not created:
            # Update last seen
            device.last_seen = timezone.now()
            device.save()
        
        return device
        
    except Exception as e:
        print(f"Error creating device fingerprint: {e}")
        return None


def is_device_trusted(master_admin, request):
    """Check if current device is trusted"""
    try:
        device_info = get_device_info(request)
        ip_address = get_client_ip(request)
        
        device = DeviceFingerprint.objects.filter(
            master_admin=master_admin,
            browser=device_info['browser'],
            os=device_info['os'],
            ip_address=ip_address,
            is_trusted=True
        ).first()
        
        return device is not None
        
    except Exception:
        return False


def get_device_fingerprints(master_admin):
    """Get all device fingerprints for master admin"""
    return DeviceFingerprint.objects.filter(
        master_admin=master_admin
    ).order_by('-last_seen')