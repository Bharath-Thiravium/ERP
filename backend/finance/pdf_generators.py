"""PDF Response Generators for Finance Documents"""

from django.http import HttpResponse

from .po_pdf_service import po_pdf_service
from .proforma_pdf_service import proforma_pdf_service
from .invoice_pdf_service import invoice_pdf_service
from .quotation_pdf_service import quotation_pdf_service


def _get_company_template(company, field):
    """Lookup company's selected template for a given field."""
    try:
        from company_dashboard.quotation_template_models import CompanyQuotationTemplateSettings
        import logging
        logger = logging.getLogger(__name__)
        
        settings = CompanyQuotationTemplateSettings.objects.filter(company=company).first()
        if settings:
            template_code = getattr(settings, field, 'AS')
            logger.info(f"Company '{company.name}' template for {field}: {template_code}")
            return template_code
        else:
            logger.warning(f"No template settings found for company '{company.name}', using default 'AS'")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching template for company '{company.name}': {str(e)}")
    return 'AS'


def generate_quotation_pdf_response(quotation, company):
    """Generate PDF response for quotation using company selected template"""
    template_code = _get_company_template(company, 'selected_template')
    pdf_bytes = quotation_pdf_service.generate_quotation_pdf(quotation, template=template_code)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="quotation_{quotation.quotation_number}.pdf"'
    return response


def generate_purchase_order_pdf_response(purchase_order, company):
    """Generate PDF response for purchase order using company selected template"""
    template_code = _get_company_template(company, 'selected_po_template')
    pdf_bytes = po_pdf_service.generate_po_pdf(purchase_order)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="po_{purchase_order.internal_po_number}.pdf"'
    return response


def generate_proforma_pdf_response(proforma, company):
    """Generate PDF response for proforma invoice using company selected template"""
    template_code = _get_company_template(company, 'selected_proforma_template')
    pdf_bytes = proforma_pdf_service.generate_proforma_pdf(proforma, template_code=template_code)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="proforma_{proforma.proforma_number}.pdf"'
    return response


def generate_invoice_pdf_response(invoice, company):
    """Generate PDF response for invoice using company selected template"""
    template_code = _get_company_template(company, 'selected_invoice_template')
    pdf_bytes = invoice_pdf_service.generate_invoice_pdf(invoice, template_code=template_code)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="invoice_{invoice.invoice_number}.pdf"'
    return response
