"""
Security utilities for CRM module
Provides input validation, sanitization, and security helpers
"""
import re
import html
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)

class CRMSecurityValidator:
    """Security validator for CRM inputs"""
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
        r'(--|/\*|\*/)',
        r'(\bOR\b.*=.*\bOR\b)',
        r'(\bAND\b.*=.*\bAND\b)',
        r'(\'.*\bOR\b.*\')',
        r'(\".*\bOR\b.*\")',
    ]
    
    # XSS patterns
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe[^>]*>.*?</iframe>',
        r'<object[^>]*>.*?</object>',
        r'<embed[^>]*>.*?</embed>',
    ]
    
    @classmethod
    def sanitize_input(cls, value):
        """Sanitize user input to prevent XSS and injection attacks"""
        if not isinstance(value, str):
            return value
        
        # Remove HTML tags
        value = strip_tags(value)
        
        # HTML encode special characters
        value = html.escape(value)
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        return value.strip()
    
    @classmethod
    def validate_sql_injection(cls, value):
        """Check for SQL injection patterns"""
        if not isinstance(value, str):
            return True
        
        value_upper = value.upper()
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_upper, re.IGNORECASE):
                logger.warning(f"SQL injection attempt detected: {value}")
                return False
        return True
    
    @classmethod
    def validate_xss(cls, value):
        """Check for XSS patterns"""
        if not isinstance(value, str):
            return True
        
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"XSS attempt detected: {value}")
                return False
        return True
    
    @classmethod
    def validate_email_format(cls, email):
        """Validate email format"""
        try:
            validate_email(email)
            return True
        except ValidationError:
            return False
    
    @classmethod
    def validate_phone_number(cls, phone):
        """Validate phone number format"""
        if not phone:
            return True
        
        # Remove common phone number characters
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        # Check if it's a valid format (10-15 digits, optionally starting with +)
        pattern = r'^\+?[\d]{10,15}$'
        return bool(re.match(pattern, cleaned))
    
    @classmethod
    def validate_numeric_field(cls, value, field_name):
        """Validate numeric fields"""
        if value is None:
            return True
        
        try:
            float(value)
            return True
        except (ValueError, TypeError):
            logger.warning(f"Invalid numeric value for {field_name}: {value}")
            return False
    
    @classmethod
    def validate_json_field(cls, value):
        """Validate JSON field content"""
        if not value:
            return True
        
        if isinstance(value, (list, dict)):
            # Convert to string for validation
            import json
            try:
                json_str = json.dumps(value)
                return cls.validate_xss(json_str) and cls.validate_sql_injection(json_str)
            except (TypeError, ValueError):
                return False
        
        return cls.validate_xss(str(value)) and cls.validate_sql_injection(str(value))


def secure_response_wrapper(func):
    """Decorator to add security headers to responses"""
    def wrapper(*args, **kwargs):
        response = func(*args, **kwargs)
        
        if hasattr(response, 'headers'):
            # Add security headers
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        return response
    return wrapper


def validate_request_data(data, required_fields=None, optional_fields=None):
    """Validate request data for security issues"""
    errors = {}
    
    if required_fields:
        for field in required_fields:
            if field not in data or not data[field]:
                errors[field] = f"{field} is required"
    
    # Validate all string fields
    all_fields = (required_fields or []) + (optional_fields or [])
    for field in all_fields:
        if field in data and data[field]:
            value = data[field]
            
            # SQL injection check
            if not CRMSecurityValidator.validate_sql_injection(value):
                errors[field] = f"{field} contains invalid characters"
            
            # XSS check
            if not CRMSecurityValidator.validate_xss(value):
                errors[field] = f"{field} contains invalid content"
            
            # Email validation
            if 'email' in field.lower() and not CRMSecurityValidator.validate_email_format(value):
                errors[field] = f"{field} is not a valid email address"
            
            # Phone validation
            if 'phone' in field.lower() and not CRMSecurityValidator.validate_phone_number(value):
                errors[field] = f"{field} is not a valid phone number"
    
    return errors


def rate_limit_key(request, viewset_name):
    """Generate rate limit key for requests"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.META.get('REMOTE_ADDR', 'unknown')
    
    return f"crm_rate_limit:{viewset_name}:{session_key}"


class SecurityMiddleware:
    """Security middleware for CRM requests"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Pre-process request
        if hasattr(request, 'data') and request.data:
            # Sanitize request data
            for key, value in request.data.items():
                if isinstance(value, str):
                    request.data[key] = CRMSecurityValidator.sanitize_input(value)
        
        response = self.get_response(request)
        
        # Post-process response
        if hasattr(response, 'headers'):
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
        
        return response