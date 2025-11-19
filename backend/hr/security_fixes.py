"""
Security fixes for HR module
"""
from html import escape
from django.utils.html import strip_tags


def sanitize_hr_input(input_string):
    """Sanitize HR input to prevent XSS attacks"""
    if not input_string:
        return ""
    
    # Strip HTML tags and escape remaining content
    cleaned = strip_tags(str(input_string))
    escaped = escape(cleaned)
    
    return escaped


def sanitize_department_name(name):
    """Sanitize department name for safe display"""
    if not name:
        return ""
    
    return sanitize_hr_input(name)


def sanitize_designation_title(title):
    """Sanitize designation title for safe display"""
    if not title:
        return ""
    
    return sanitize_hr_input(title)


def sanitize_employee_name(name):
    """Sanitize employee name for safe display"""
    if not name:
        return ""
    
    return sanitize_hr_input(name)


def sanitize_job_title(title):
    """Sanitize job title for safe display"""
    if not title:
        return ""
    
    return sanitize_hr_input(title)