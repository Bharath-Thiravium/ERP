from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

def generate_invoice_pdf_content(invoice):
    """Generate PDF content for invoice"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title = Paragraph(f"Invoice #{invoice.invoice_number}", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Invoice details
    invoice_data = [
        ['Invoice Number:', invoice.invoice_number],
        ['Invoice Date:', invoice.invoice_date.strftime('%Y-%m-%d')],
        ['Due Date:', invoice.due_date.strftime('%Y-%m-%d')],
        ['Customer:', invoice.customer.name],
    ]
    
    invoice_table = Table(invoice_data, colWidths=[2*inch, 3*inch])
    invoice_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(invoice_table)
    story.append(Spacer(1, 12))
    
    # Items table
    items_data = [['Item', 'Quantity', 'Rate', 'Amount']]
    for item in invoice.invoice_items.all():
        items_data.append([
            item.product_name,
            str(item.quantity),
            f"₹{item.unit_price}",
            f"₹{item.line_total}"
        ])
    
    items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1*inch, 1*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))
    
    # Total
    total_data = [
        ['Subtotal:', f"₹{invoice.subtotal}"],
        ['Tax:', f"₹{invoice.total_tax}"],
        ['Total:', f"₹{invoice.total_amount}"],
    ]
    
    total_table = Table(total_data, colWidths=[4*inch, 2*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(total_table)
    
    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_proforma_pdf_content(proforma):
    """Generate PDF content for proforma invoice"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title = Paragraph(f"Proforma Invoice #{proforma.proforma_number}", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Proforma details
    proforma_data = [
        ['Proforma Number:', proforma.proforma_number],
        ['Proforma Date:', proforma.proforma_date.strftime('%Y-%m-%d')],
        ['Due Date:', proforma.due_date.strftime('%Y-%m-%d')],
        ['Customer:', proforma.customer.name],
    ]
    
    proforma_table = Table(proforma_data, colWidths=[2*inch, 3*inch])
    proforma_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(proforma_table)
    story.append(Spacer(1, 12))
    
    # Items table
    items_data = [['Item', 'Quantity', 'Rate', 'Amount']]
    for item in proforma.proforma_items.all():
        items_data.append([
            item.product_name,
            str(item.quantity),
            f"₹{item.unit_price}",
            f"₹{item.line_total}"
        ])
    
    items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1*inch, 1*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))
    
    # Total (Proforma invoices don't include tax)
    total_data = [
        ['Total Amount:', f"₹{proforma.total_amount}"],
    ]
    
    total_table = Table(total_data, colWidths=[4*inch, 2*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(total_table)
    
    doc.build(story)
    buffer.seek(0)
    return buffer

def send_invoice_email(invoice, recipient_email, message=""):
    """Send invoice via email"""
    try:
        # Check if using console backend (for testing)
        if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            # For testing - just return success
            return True, "Email sent to console (testing mode). Check Django console output."
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf_content(invoice)
        
        # Create email
        subject = f"Invoice #{invoice.invoice_number} from {invoice.company.name}"
        
        email_body = f"""
Dear {invoice.customer.name},

Please find attached your invoice #{invoice.invoice_number}.

Invoice Details:
- Invoice Number: {invoice.invoice_number}
- Invoice Date: {invoice.invoice_date.strftime('%Y-%m-%d')}
- Due Date: {invoice.due_date.strftime('%Y-%m-%d')}
- Total Amount: ₹{invoice.total_amount}

{message}

Thank you for your business!

Best regards,
{invoice.company.name}
        """
        
        email = EmailMessage(
            subject=subject,
            body=email_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        
        # Attach PDF
        email.attach(
            f"Invoice_{invoice.invoice_number}.pdf",
            pdf_buffer.getvalue(),
            'application/pdf'
        )
        
        # Send email
        email.send()
        return True, "Email sent successfully"
        
    except Exception as e:
        return False, str(e)

def generate_quotation_pdf_content(quotation):
    """Generate PDF content for quotation"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title = Paragraph(f"Quotation #{quotation.quotation_number}", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Quotation details
    quotation_data = [
        ['Quotation Number:', quotation.quotation_number],
        ['Quotation Date:', quotation.quotation_date.strftime('%Y-%m-%d')],
        ['Valid Until:', quotation.valid_until.strftime('%Y-%m-%d')],
        ['Customer:', quotation.customer.name],
    ]
    
    quotation_table = Table(quotation_data, colWidths=[2*inch, 3*inch])
    quotation_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(quotation_table)
    story.append(Spacer(1, 12))
    
    # Items table
    items_data = [['Item', 'Quantity', 'Rate', 'Amount']]
    for item in quotation.quotation_items.all():
        items_data.append([
            item.product_name,
            str(item.quantity),
            f"₹{item.unit_price}",
            f"₹{item.line_total}"
        ])
    
    items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1*inch, 1*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))
    
    # Total
    total_data = [
        ['Subtotal:', f"₹{quotation.subtotal}"],
        ['Tax:', f"₹{quotation.total_tax}"],
        ['Total:', f"₹{quotation.total_amount}"],
    ]
    
    total_table = Table(total_data, colWidths=[4*inch, 2*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(total_table)
    
    doc.build(story)
    buffer.seek(0)
    return buffer

def send_quotation_email(quotation, recipient_email, message=""):
    """Send quotation via email"""
    try:
        # Check if using console backend (for testing)
        if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            # For testing - just return success
            return True, "Email sent to console (testing mode). Check Django console output."
        
        # Generate PDF
        pdf_buffer = generate_quotation_pdf_content(quotation)
        
        # Create email
        subject = f"Quotation #{quotation.quotation_number} from {quotation.company.name}"
        
        email_body = f"""
Dear {quotation.customer.name},

Please find attached your quotation #{quotation.quotation_number}.

Quotation Details:
- Quotation Number: {quotation.quotation_number}
- Quotation Date: {quotation.quotation_date.strftime('%Y-%m-%d')}
- Valid Until: {quotation.valid_until.strftime('%Y-%m-%d')}
- Total Amount: ₹{quotation.total_amount}

{message}

We look forward to your approval and working with you.

Best regards,
{quotation.company.name}
        """
        
        email = EmailMessage(
            subject=subject,
            body=email_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        
        # Attach PDF
        email.attach(
            f"Quotation_{quotation.quotation_number}.pdf",
            pdf_buffer.getvalue(),
            'application/pdf'
        )
        
        # Send email
        email.send()
        return True, "Email sent successfully"
        
    except Exception as e:
        return False, str(e)

def send_proforma_email(proforma, recipient_email, message=""):
    """Send proforma invoice via email"""
    try:
        # Check if using console backend (for testing)
        if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            # For testing - just return success
            return True, "Email sent to console (testing mode). Check Django console output."
        
        # Generate PDF
        pdf_buffer = generate_proforma_pdf_content(proforma)
        
        # Create email
        subject = f"Proforma Invoice #{proforma.proforma_number} from {proforma.company.name}"
        
        email_body = f"""
Dear {proforma.customer.name},

Please find attached your proforma invoice #{proforma.proforma_number}.

Proforma Details:
- Proforma Number: {proforma.proforma_number}
- Proforma Date: {proforma.proforma_date.strftime('%Y-%m-%d')}
- Due Date: {proforma.due_date.strftime('%Y-%m-%d')}
- Total Amount: ₹{proforma.total_amount}

{message}

This is an advance bill. Please make the payment to proceed with your order.

Thank you for your business!

Best regards,
{proforma.company.name}
        """
        
        email = EmailMessage(
            subject=subject,
            body=email_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        
        # Attach PDF
        email.attach(
            f"Proforma_{proforma.proforma_number}.pdf",
            pdf_buffer.getvalue(),
            'application/pdf'
        )
        
        # Send email
        email.send()
        return True, "Email sent successfully"
        
    except Exception as e:
        return False, str(e)