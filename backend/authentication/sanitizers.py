import html
import re
from django.utils.html import escape


def sanitize_html_input(text):
    """
    Sanitize HTML input to prevent XSS attacks.
    """
    if not text:
        return text
    
    # Escape HTML entities
    sanitized = html.escape(str(text))
    
    # Remove any remaining script tags or javascript
    sanitized = re.sub(r'<script[^>]*>.*?</script>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'on\w+\s*=', '', sanitized, flags=re.IGNORECASE)
    
    return sanitized


def sanitize_json_output(data):
    """
    Sanitize data before JSON serialization to prevent XSS in API responses.
    """
    if isinstance(data, dict):
        return {key: sanitize_json_output(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [sanitize_json_output(item) for item in data]
    elif isinstance(data, str):
        return sanitize_html_input(data)
    else:
        return data


def clean_user_input(text, max_length=None):
    """
    Clean and validate user input.
    """
    if not text:
        return text
    
    # Strip whitespace
    cleaned = str(text).strip()
    
    # Sanitize HTML
    cleaned = sanitize_html_input(cleaned)
    
    # Truncate if max_length specified
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    
    return cleaned