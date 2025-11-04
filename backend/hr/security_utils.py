"""
Security utilities for HR module
"""
import re
from django.utils.html import escape
from django.core.exceptions import ValidationError


def sanitize_filename(filename):
    """
    Sanitize filename to prevent path traversal attacks
    """
    # Remove any path separators and dangerous characters
    sanitized = re.sub(r'[^\w\-_\.]', '', filename)
    # Ensure it doesn't start with dots or dashes
    sanitized = re.sub(r'^[\.\-]+', '', sanitized)
    return sanitized[:255]  # Limit length


def validate_session_key(session_key):
    """
    Validate session key format
    """
    if not session_key:
        return False
    
    # Session key should be alphanumeric with some special chars
    if not re.match(r'^[a-zA-Z0-9\-_]{20,}$', session_key):
        return False
    
    return True


def sanitize_html_input(text):
    """
    Sanitize HTML input to prevent XSS
    """
    if not text:
        return text
    
    return escape(str(text))


def validate_year_param(year_param):
    """
    Validate year parameter
    """
    try:
        year = int(year_param)
        if 2000 <= year <= 2100:
            return year
    except (ValueError, TypeError):
        pass
    
    raise ValidationError("Invalid year parameter")


def validate_month_param(month_param):
    """
    Validate month parameter
    """
    try:
        month = int(month_param)
        if 1 <= month <= 12:
            return month
    except (ValueError, TypeError):
        pass
    
    raise ValidationError("Invalid month parameter")


def safe_get_auth_header(request):
    """
    Safely extract session key from Authorization header
    """
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        session_key = auth_header[7:]
        if validate_session_key(session_key):
            return session_key
    return None