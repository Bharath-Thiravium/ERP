"""
Security fixes for Finance module
"""
from html import escape
from django.utils.html import strip_tags


def sanitize_finance_input(input_string):
    """Sanitize finance input to prevent XSS attacks"""
    if not input_string:
        return ""
    
    # Strip HTML tags and escape remaining content
    cleaned = strip_tags(str(input_string))
    escaped = escape(cleaned)
    
    return escaped


def sanitize_customer_name(name):
    """Sanitize customer name for safe display"""
    if not name:
        return ""
    
    return sanitize_finance_input(name)


def sanitize_product_name(name):
    """Sanitize product name for safe display"""
    if not name:
        return ""
    
    return sanitize_finance_input(name)


def sanitize_invoice_reference(reference):
    """Sanitize invoice reference for safe display"""
    if not reference:
        return ""
    
    return sanitize_finance_input(reference)