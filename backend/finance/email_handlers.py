from django.core.mail import EmailMessage
from django.conf import settings


def send_quotation_email(quotation, service_user):
    """Send quotation email"""
    subject = f"Quotation {quotation.quotation_number}"
    body = f"Please find attached quotation {quotation.quotation_number}"
    
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[quotation.customer.email] if quotation.customer.email else []
    )
    
    email.send()
    
    # Update quotation status to 'sent'
    quotation.status = 'sent'
    quotation.save()
    
    return {'status': 'sent'}


def send_purchase_order_email(purchase_order, service_user):
    """Send purchase order email"""
    subject = f"Purchase Order {purchase_order.po_number}"
    body = f"Please find attached purchase order {purchase_order.po_number}"
    
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[purchase_order.customer.email] if purchase_order.customer.email else []
    )
    
    email.send()
    return {'status': 'sent'}


def send_proforma_email(proforma, service_user):
    """Send proforma invoice email"""
    subject = f"Proforma Invoice {proforma.proforma_number}"
    body = f"Please find attached proforma invoice {proforma.proforma_number}"
    
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[proforma.customer.email] if proforma.customer.email else []
    )
    
    email.send()
    return {'status': 'sent'}


def send_invoice_email(invoice, service_user):
    """Send invoice email"""
    subject = f"Invoice {invoice.invoice_number}"
    body = f"Please find attached invoice {invoice.invoice_number}"
    
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invoice.customer.email] if invoice.customer.email else []
    )
    
    email.send()
    return {'status': 'sent'}
