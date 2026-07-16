"""Shared utilities for document template preview views."""
from authentication.models import Company

VALID_TEMPLATES = ['AS', 'BKGE', 'TC']

TEMPLATE_INFO = [
    {
        'code': 'AS',
        'name': 'Clean & Simple Template',
        'description': 'Minimalist left-aligned header with clean typography. Subtle green/orange/purple accent borders. Grid-based layout with soft gray backgrounds.',
        'features': ['Left-aligned clean header', 'Grid-based party cards', 'Minimalist design', 'Fast loading', 'Professional appearance'],
        'best_for': 'Quick everyday documents, daily invoices, internal use',
    },
    {
        'code': 'BKGE',
        'name': 'Professional Template',
        'description': 'Modern full-width gradient header with accent colors. Navy/teal/gray banners with centered document title. Pill-shaped meta badges. Premium dark header design.',
        'features': ['Gradient banner header', 'Centered modern layout', 'Pill-shaped badges', 'Bold professional look', 'Two signature sections'],
        'best_for': 'Client presentations, executive documents, modern business',
    },
    {
        'code': 'TC',
        'name': 'Detailed Terms Template',
        'description': 'Premium gold/charcoal header. Per-line GST columns with CGST/SGST/IGST breakdown. HSN/SAC-wise tax summary table. Complete bank details. Legal declaration. 3 signatures.',
        'features': ['Premium gold/charcoal header', 'Per-line GST breakdown', 'HSN Tax Summary table', 'Complete bank details (6 fields)', 'Legal declaration clause', '3 signature blocks'],
        'best_for': 'Enterprise, CA-compliant documents, government contracts, audit requirements',
    },
]


def get_logo_context(company):
    """
    Returns dict with both logo references:
      logo_path — file:// URI for WeasyPrint PDF rendering
      logo_url  — /media/... HTTP URL for browser HTML preview
    Templates use {{ logo_url|default:logo_path }} so both cases work.
    """
    result = {'logo_path': '', 'logo_url': ''}
    try:
        if company and hasattr(company, 'logo') and company.logo and company.logo.name:
            import os
            file_path = company.logo.path
            if os.path.exists(file_path):
                result['logo_path'] = f'file://{file_path}'
                result['logo_url'] = company.logo.url   # e.g. /media/company_logos/x.png
    except Exception:
        pass
    return result


def get_preview_company(request):
    """Return company from service user session OR company JWT user."""
    # Service user session (HR/Finance employee)
    if hasattr(request, 'service_user') and getattr(request.service_user, 'company', None):
        return request.service_user.company
    # Company admin JWT login
    if hasattr(request, 'user') and request.user and request.user.is_authenticated:
        if hasattr(request.user, 'company_user'):
            return request.user.company_user.company
    return None


def build_mock_customer():
    from types import SimpleNamespace
    return SimpleNamespace(
        name='Sample Customer Pvt Ltd',
        display_name='Sample Customer Pvt Ltd',
        customer_code='CUST001',
        email='sample@example.com',
        phone='9876543210',
        gstin='27AABCU9603R1ZX',
        billing_address_line1='123 Business Street',
        billing_address_line2='',
        billing_city='Mumbai',
        billing_state='Maharashtra',
        billing_pincode='400001',
        billing_country='India',
        full_billing_address='123 Business Street, Mumbai, Maharashtra 400001',
        full_shipping_address='123 Business Street, Mumbai, Maharashtra 400001',
    )


def build_mock_item(**overrides):
    from decimal import Decimal
    from types import SimpleNamespace
    defaults = dict(
        product_name='Professional Services',
        product_code='SRV001',
        description='Consulting and advisory services',
        hsn_sac_code='998314',
        quantity=Decimal('10'),
        unit='Hours',
        unit_price=Decimal('1000.00'),
        line_total=Decimal('10000.00'),
        gst_rate=Decimal('18.00'),
        line_number=1,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)
