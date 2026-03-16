"""
Security fixes for authentication module
"""
import os
import re
from pathlib import Path
from html import escape
from django.utils._os import safe_join as django_safe_join


def secure_path_join(base_path, *paths):
    """Safely join paths to prevent directory traversal attacks"""
    base = Path(base_path).resolve()
    joined = base
    
    for path in paths:
        # Remove any directory traversal attempts
        clean_path = str(path).replace('..', '').replace('/', '').replace('\\', '')
        joined = joined / clean_path
    
    # Ensure the final path is still within the base directory
    try:
        joined.resolve().relative_to(base)
        return str(joined)
    except ValueError:
        raise ValueError("Path traversal attempt detected")


def sanitize_filename(filename):
    """Validate and sanitize filename"""
    if not filename:
        raise ValueError("Filename cannot be empty")
    
    # Remove any path separators and dangerous characters
    clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Ensure it doesn't start with a dot (hidden file)
    if clean_name.startswith('.'):
        clean_name = 'file_' + clean_name[1:]
    
    # Limit length
    if len(clean_name) > 255:
        name, ext = os.path.splitext(clean_name)
        clean_name = name[:250] + ext
    
    return clean_name


def escape_content(content):
    """Escape HTML content to prevent XSS"""
    return escape(content)


def secure_file_write(filepath, content):
    """Securely write content to file"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)