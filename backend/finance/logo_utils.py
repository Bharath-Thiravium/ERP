"""
Shared logo URL helper for PDF services.
Returns absolute HTTPS URL so logos load correctly from blob: origins (browser preview)
and file:// URI for WeasyPrint PDF generation.
"""
import os
from django.conf import settings


def get_absolute_logo_url(company):
    """
    Return absolute https:// URL for company logo.
    Works from blob: origin (browser preview) because it's a full URL.
    Falls back to empty string if no logo.
    """
    try:
        if company and hasattr(company, 'logo') and company.logo and company.logo.name:
            relative = company.logo.url          # e.g. /media/company_logos/x.png
            # Build absolute URL from ALLOWED_HOSTS
            hosts = getattr(settings, 'ALLOWED_HOSTS', [])
            # Pick the production domain (not localhost/IP)
            domain = next(
                (h for h in hosts if '.' in h and not h.startswith('127') and not h.startswith('72')),
                hosts[0] if hosts else 'localhost'
            )
            scheme = 'https' if not domain.startswith('localhost') else 'http'
            return f'{scheme}://{domain}{relative}'
    except Exception:
        pass
    return ''


def get_logo_file_path(company):
    """
    Return file:// URI for WeasyPrint PDF rendering.
    """
    try:
        if company and hasattr(company, 'logo') and company.logo and company.logo.name:
            path = company.logo.path
            if os.path.exists(path):
                return f'file://{path}'
    except Exception:
        pass
    return ''
