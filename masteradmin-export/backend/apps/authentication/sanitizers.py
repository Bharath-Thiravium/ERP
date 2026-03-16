"""
Input sanitization utilities for authentication module
"""
import re
from html import escape
from django.utils.html import strip_tags


def sanitize_html_input(input_string):
    """Sanitize HTML input to prevent XSS attacks"""
    if not input_string:
        return ""
    
    # Strip HTML tags and escape remaining content
    cleaned = strip_tags(str(input_string))
    escaped = escape(cleaned)
    
    return escaped


def sanitize_company_name(name):
    """Sanitize company name for safe display"""
    if not name:
        return ""
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\']', '', str(name))
    return sanitize_html_input(sanitized)


def sanitize_user_input(user_input):
    """General user input sanitization"""
    if not user_input:
        return ""
    
    # Convert to string and sanitize
    sanitized = str(user_input)
    sanitized = sanitize_html_input(sanitized)
    
    return sanitized