from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from company_dashboard.email_service import get_company_email_service
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
    """Send invoice via email using company-specific email settings"""
    try:
        # Get company email service
        email_service = get_company_email_service(invoice.company)
        
        if not email_service or not email_service.can_send_email():
            return False, "Company email service not configured or daily limit reached. Please configure email settings in Company Dashboard."
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf_content(invoice)
        
        # Create professional email
        subject = f"Invoice #{invoice.invoice_number} from {invoice.company.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Invoice #{invoice.invoice_number}</h2>
                
                <p>Dear {invoice.customer.name},</p>
                
                <p>Please find attached your invoice #{invoice.invoice_number}.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">Invoice Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Invoice Number:</strong> {invoice.invoice_number}</li>
                        <li><strong>Invoice Date:</strong> {invoice.invoice_date.strftime('%Y-%m-%d')}</li>
                        <li><strong>Due Date:</strong> {invoice.due_date.strftime('%Y-%m-%d')}</li>
                        <li><strong>Total Amount:</strong> ₹{invoice.total_amount:,.2f}</li>
                    </ul>
                </div>
                
                {f'<p>{message}</p>' if message else ''}
                
                <p>Thank you for your business!</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="margin: 0;"><strong>Best regards,</strong></p>
                    <p style="margin: 5px 0 0 0;">{invoice.company.name}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {invoice.customer.name},

Please find attached your invoice #{invoice.invoice_number}.

Invoice Details:
- Invoice Number: {invoice.invoice_number}
- Invoice Date: {invoice.invoice_date.strftime('%Y-%m-%d')}
- Due Date: {invoice.due_date.strftime('%Y-%m-%d')}
- Total Amount: ₹{invoice.total_amount:,.2f}

{message}

Thank you for your business!

Best regards,
{invoice.company.name}
        """
        
        # Prepare attachment with temporary file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(pdf_buffer.getvalue())
            temp_file_path = temp_file.name
        
        attachments = [{
            'name': f"Invoice_{invoice.invoice_number}.pdf",
            'path': temp_file_path
        }]
        
        try:
            success = email_service.send_email(
                to_emails=[recipient_email],
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                attachments=attachments
            )
        finally:
            try:
                os.unlink(temp_file_path)
            except:
                pass
        
        if success:
            return True, f"✅ Invoice email sent successfully to {recipient_email}"
        else:
            return False, "❌ Failed to send invoice email. Please check your email configuration."
        
    except Exception as e:
        return False, f"❌ Email failed: {str(e)}"

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
    """Send quotation via email using company-specific email settings"""
    try:
        # Get company email service
        email_service = get_company_email_service(quotation.company)
        
        if not email_service or not email_service.can_send_email():
            return False, "Company email service not configured or daily limit reached. Please configure email settings in Company Dashboard."
        
        # Generate PDF
        pdf_buffer = generate_quotation_pdf_content(quotation)
        
        # Create professional email
        subject = f"Quotation #{quotation.quotation_number} from {quotation.company.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Quotation #{quotation.quotation_number}</h2>
                
                <p>Dear {quotation.customer.name},</p>
                
                <p>Please find attached your quotation #{quotation.quotation_number}.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">Quotation Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Quotation Number:</strong> {quotation.quotation_number}</li>
                        <li><strong>Quotation Date:</strong> {quotation.quotation_date.strftime('%Y-%m-%d')}</li>
                        <li><strong>Valid Until:</strong> {quotation.valid_until.strftime('%Y-%m-%d')}</li>
                        <li><strong>Total Amount:</strong> ₹{quotation.total_amount:,.2f}</li>
                    </ul>
                </div>
                
                {f'<p>{message}</p>' if message else ''}
                
                <p>We look forward to your approval and working with you.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="margin: 0;"><strong>Best regards,</strong></p>
                    <p style="margin: 5px 0 0 0;">{quotation.company.name}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {quotation.customer.name},

Please find attached your quotation #{quotation.quotation_number}.

Quotation Details:
- Quotation Number: {quotation.quotation_number}
- Quotation Date: {quotation.quotation_date.strftime('%Y-%m-%d')}
- Valid Until: {quotation.valid_until.strftime('%Y-%m-%d')}
- Total Amount: ₹{quotation.total_amount:,.2f}

{message}

We look forward to your approval and working with you.

Best regards,
{quotation.company.name}
        """
        
        # Prepare attachment with temporary file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(pdf_buffer.getvalue())
            temp_file_path = temp_file.name
        
        attachments = [{
            'name': f"Quotation_{quotation.quotation_number}.pdf",
            'path': temp_file_path
        }]
        
        try:
            success = email_service.send_email(
                to_emails=[recipient_email],
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                attachments=attachments
            )
        finally:
            try:
                os.unlink(temp_file_path)
            except:
                pass
        
        if success:
            return True, f"✅ Quotation email sent successfully to {recipient_email}"
        else:
            return False, "❌ Failed to send quotation email. Please check your email configuration."
        
    except Exception as e:
        return False, f"❌ Email failed: {str(e)}"

def send_proforma_email(proforma, recipient_email, message=""):
    """Send proforma invoice via email using company-specific email settings"""
    try:
        # Get company email service
        email_service = get_company_email_service(proforma.company)
        
        if not email_service or not email_service.can_send_email():
            return False, "Company email service not configured or daily limit reached. Please configure email settings in Company Dashboard."
        
        # Generate PDF
        pdf_buffer = generate_proforma_pdf_content(proforma)
        
        # Create professional email
        subject = f"Proforma Invoice #{proforma.proforma_number} from {proforma.company.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Proforma Invoice #{proforma.proforma_number}</h2>
                
                <p>Dear {proforma.customer.name},</p>
                
                <p>Please find attached your proforma invoice #{proforma.proforma_number}.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">Proforma Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Proforma Number:</strong> {proforma.proforma_number}</li>
                        <li><strong>Proforma Date:</strong> {proforma.proforma_date.strftime('%Y-%m-%d')}</li>
                        <li><strong>Due Date:</strong> {proforma.due_date.strftime('%Y-%m-%d')}</li>
                        <li><strong>Total Amount:</strong> ₹{proforma.total_amount:,.2f}</li>
                    </ul>
                </div>
                
                {f'<p>{message}</p>' if message else ''}
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;"><strong>Note:</strong> This is an advance bill. Please make the payment to proceed with your order.</p>
                </div>
                
                <p>Thank you for your business!</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="margin: 0;"><strong>Best regards,</strong></p>
                    <p style="margin: 5px 0 0 0;">{proforma.company.name}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {proforma.customer.name},

Please find attached your proforma invoice #{proforma.proforma_number}.

Proforma Details:
- Proforma Number: {proforma.proforma_number}
- Proforma Date: {proforma.proforma_date.strftime('%Y-%m-%d')}
- Due Date: {proforma.due_date.strftime('%Y-%m-%d')}
- Total Amount: ₹{proforma.total_amount:,.2f}

{message}

This is an advance bill. Please make the payment to proceed with your order.

Thank you for your business!

Best regards,
{proforma.company.name}
        """
        
        # Prepare attachment with temporary file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(pdf_buffer.getvalue())
            temp_file_path = temp_file.name
        
        attachments = [{
            'name': f"Proforma_{proforma.proforma_number}.pdf",
            'path': temp_file_path
        }]
        
        try:
            success = email_service.send_email(
                to_emails=[recipient_email],
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                attachments=attachments
            )
        finally:
            try:
                os.unlink(temp_file_path)
            except:
                pass
        
        if success:
            return True, f"✅ Proforma email sent successfully to {recipient_email}"
        else:
            return False, "❌ Failed to send proforma email. Please check your email configuration."
        
    except Exception as e:
        return False, f"❌ Email failed: {str(e)}"