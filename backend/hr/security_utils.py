"""
Security utilities for HR compliance system
"""
import re
from django.core.exceptions import ValidationError
from django.utils.html import escape
from django.db import connection


class SecurityValidator:
    """Security validation utilities"""
    
    @staticmethod
    def validate_session_key(session_key):
        """Validate session key format"""
        if not session_key or len(session_key) < 10:
            raise ValidationError("Invalid session key")
        # Allow only alphanumeric and safe characters
        if not re.match(r'^[a-zA-Z0-9_-]+$', session_key):
            raise ValidationError("Invalid session key format")
        return session_key
    
    @staticmethod
    def sanitize_input(value):
        """Sanitize user input to prevent XSS"""
        if isinstance(value, str):
            return escape(value.strip())
        return value
    
    @staticmethod
    def validate_file_path(file_path):
        """Validate file path to prevent path traversal"""
        if not file_path:
            return None
        
        # Remove any path traversal attempts
        clean_path = re.sub(r'\.\./', '', file_path)
        clean_path = re.sub(r'\.\.\\', '', clean_path)
        
        # Only allow safe characters
        if not re.match(r'^[a-zA-Z0-9_/.-]+$', clean_path):
            raise ValidationError("Invalid file path")
        
        return clean_path
    
    @staticmethod
    def validate_sql_params(params):
        """Validate SQL parameters to prevent injection"""
        if isinstance(params, dict):
            for key, value in params.items():
                if isinstance(value, str):
                    # Check for SQL injection patterns
                    dangerous_patterns = [
                        r'union\s+select', r'drop\s+table', r'delete\s+from',
                        r'insert\s+into', r'update\s+set', r'exec\s*\(',
                        r'script\s*>', r'<\s*script'
                    ]
                    for pattern in dangerous_patterns:
                        if re.search(pattern, value.lower()):
                            raise ValidationError(f"Invalid input detected: {key}")
        return params


def secure_session_check(request):
    """Secure session validation"""
    try:
        auth_header = request.headers.get('Authorization', '')
        session_key = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
        
        if not session_key:
            session_key = request.query_params.get('session_key') if hasattr(request, 'query_params') else None
        
        if not session_key and request.method in ['POST', 'PUT', 'PATCH']:
            session_key = getattr(request, 'data', {}).get('session_key')
        
        if session_key:
            return SecurityValidator.validate_session_key(session_key)
        
        return None
    except Exception:
        return None


def validate_year_param(year_str):
    """Validate year parameter"""
    try:
        year = int(year_str)
        if 2020 <= year <= 2030:
            return year
        return None
    except (ValueError, TypeError):
        return None


def validate_month_param(month_str):
    """Validate month parameter"""
    try:
        month = int(month_str)
        if 1 <= month <= 12:
            return month
        return None
    except (ValueError, TypeError):
        return None


def sanitize_filename(filename):
    """Sanitize filename for security"""
    import re
    if not filename:
        return None
    # Remove dangerous characters
    clean_name = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
    return clean_name[:100]  # Limit length