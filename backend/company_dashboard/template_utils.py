"""Shared utilities for document template preview views."""
from authentication.models import Company

VALID_TEMPLATES = ['AS', 'BKGE', 'TC']

TEMPLATE_INFO = [
    {
        'code': 'AS',
        'name': 'Clean & Simple Template',
        'description': 'Clean 3-column header with logo panel, essential fields, single signature. Best for everyday use.',
        'features': ['Logo panel', 'Bill To / Ship To', 'GST breakdown', 'Single signature'],
        'best_for': 'Small and medium businesses',
    },
    {
        'code': 'BKGE',
        'name': 'Professional Template',
        'description': 'Teal-accented header, compliance fields (Place of Supply, Reverse Charge), Amount in Words, Payment Terms table, 2 signatures.',
        'features': ['Logo panel', 'Place of Supply', 'Reverse Charge', 'Amount in Words', 'Payment Terms table', '2 signatures'],
        'best_for': 'Growing businesses and client-facing documents',
    },
    {
        'code': 'TC',
        'name': 'Detailed Terms Template',
        'description': 'Premium gold/charcoal header, per-line GST columns, HSN/SAC-wise tax summary, bank details, declaration, 3 signatures.',
        'features': ['Logo panel', 'Per-line CGST/SGST/IGST', 'HSN Tax Summary table', 'Bank details', 'Declaration', '3 signatures'],
        'best_for': 'Enterprise, CA-compliant, and high-value transactions',
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
