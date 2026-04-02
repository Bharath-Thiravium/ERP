"""PDF Response Generators for Finance Documents"""

from django.http import HttpResponse

from .po_pdf_service import po_pdf_service
from .proforma_pdf_service import proforma_pdf_service
from .invoice_pdf_service import invoice_pdf_service


def generate_quotation_pdf_response(quotation, company):
    """Generate PDF response for quotation"""
    pdf_bytes = quotation_pdf_service.generate_quotation_pdf(quotation)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="quotation_{quotation.quotation_number}.pdf"'
    return response


def generate_purchase_order_pdf_response(purchase_order, company):
    """Generate PDF response for purchase order"""
    pdf_bytes = po_pdf_service.generate_po_pdf(purchase_order)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="po_{purchase_order.internal_po_number}.pdf"'
    return response


def generate_proforma_pdf_response(proforma, company):
    """Generate PDF response for proforma invoice"""
    pdf_bytes = proforma_pdf_service.generate_proforma_pdf(proforma)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="proforma_{proforma.proforma_number}.pdf"'
    return response


def generate_invoice_pdf_response(invoice, company):
    """Generate PDF response for invoice"""
    pdf_bytes = invoice_pdf_service.generate_invoice_pdf(invoice)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="invoice_{invoice.invoice_number}.pdf"'
    return response
