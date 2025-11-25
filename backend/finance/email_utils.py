from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from company_dashboard.email_service import get_company_email_service
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
import os
from django.conf import settings

def generate_invoice_pdf_content(invoice):
    """Generate professional PDF content for invoice"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Row 1: Logo and Company Details
    logo_cell = ''
    if invoice.company.logo:
        try:
            logo_path = os.path.join(settings.MEDIA_ROOT, str(invoice.company.logo))
            if os.path.exists(logo_path):
                logo_img = Image(logo_path, width=1.2*inch, height=1*inch)
                logo_cell = logo_img
        except:
            logo_cell = ''
    
    company_details = f"""{invoice.company.name}
{getattr(invoice.company, 'address', '')}
Phone: {getattr(invoice.company, 'phone', 'N/A')}
Email: {getattr(invoice.company, 'email', 'N/A')}"""
    
    row1_data = [[logo_cell, '', company_details]]
    row1_table = Table(row1_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row1_table.setStyle(TableStyle([
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (2, 0), (2, 0), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    story.append(row1_table)
    story.append(Spacer(1, 15))
    
    # Row 2: To Address and Document Info
    to_address = f"""To:
{invoice.customer.name}
{getattr(invoice.customer, 'address', '')}
Phone: {getattr(invoice.customer, 'phone', 'N/A')}
Email: {getattr(invoice.customer, 'email', 'N/A')}"""
    
    if hasattr(invoice.customer, 'gstin') and invoice.customer.gstin:
        to_address += f"\nGSTIN: {invoice.customer.gstin}"
    
    doc_info = f"""TAX INVOICE
{invoice.invoice_number}
Date: {invoice.invoice_date.strftime('%d/%m/%Y')}
Due Date: {invoice.due_date.strftime('%d/%m/%Y')}"""
    
    row2_data = [[to_address, '', doc_info]]
    row2_table = Table(row2_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row2_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    story.append(row2_table)
    story.append(Spacer(1, 15))
    
    # Row 3: Dispatched To (Shipping Address)
    if hasattr(invoice, 'shipping_address') and invoice.shipping_address:
        shipping_address = f"""{invoice.customer.name}
{invoice.shipping_address.full_address}"""
    else:
        # Fallback to customer's billing address with proper formatting
        billing_parts = []
        if hasattr(invoice.customer, 'billing_address_line1') and invoice.customer.billing_address_line1:
            billing_parts.append(invoice.customer.billing_address_line1)
        if hasattr(invoice.customer, 'billing_address_line2') and invoice.customer.billing_address_line2:
            billing_parts.append(invoice.customer.billing_address_line2)
        if hasattr(invoice.customer, 'billing_city') and invoice.customer.billing_city:
            city_state_pin = f"{invoice.customer.billing_city}"
            if hasattr(invoice.customer, 'billing_state') and invoice.customer.billing_state:
                city_state_pin += f", {invoice.customer.billing_state}"
            if hasattr(invoice.customer, 'billing_pincode') and invoice.customer.billing_pincode:
                city_state_pin += f", {invoice.customer.billing_pincode}"
            if hasattr(invoice.customer, 'billing_country') and invoice.customer.billing_country:
                city_state_pin += f", {invoice.customer.billing_country}"
            billing_parts.append(city_state_pin)
        
        billing_address = ', '.join(billing_parts) if billing_parts else 'N/A'
        shipping_address = f"""{invoice.customer.name}
{billing_address}"""
    
    dispatched_to = f"""Dispatched To:
{shipping_address}"""
    
    row3_data = [[dispatched_to, '', '']]
    row3_table = Table(row3_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row3_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(row3_table)
    story.append(Spacer(1, 20))
    
    # Row 4: Product Description with Details
    items_data = [['S.No.', 'Product Description & Details', 'Qty', 'Unit', 'Rate', 'Amount']]
    
    # Items with detailed description
    for i, item in enumerate(invoice.invoice_items.all(), 1):
        # Create detailed description
        description = item.product_name
        if hasattr(item, 'product') and item.product:
            if hasattr(item.product, 'description') and item.product.description:
                description += f"\n{item.product.description}"
            if hasattr(item.product, 'hsn_code') and item.product.hsn_code:
                description += f"\nHSN: {item.product.hsn_code.code}"
        
        items_data.append([
            str(i),
            description,
            str(item.quantity),
            getattr(item, 'unit', 'Nos'),
            f"₹{item.unit_price:,.2f}",
            f"₹{item.line_total:,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.5*inch, 2.2*inch, 0.7*inch, 0.7*inch, 1*inch, 1.1*inch])
    items_table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data styling
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # S.No.
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),  # Qty, Unit, Rate, Amount
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),     # Description
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 20))
    
    # Totals Section
    total_data = [
        ['', '', '', '', 'Subtotal:', f"₹{invoice.subtotal:,.2f}"],
    ]
    
    if hasattr(invoice, 'total_tax') and float(invoice.total_tax) > 0:
        # Add tax breakdown if available
        if hasattr(invoice, 'gst_type') and invoice.gst_type == 'cgst_sgst':
            cgst = float(invoice.total_tax) / 2
            sgst = float(invoice.total_tax) / 2
            total_data.extend([
                ['', '', '', '', 'CGST:', f"₹{cgst:,.2f}"],
                ['', '', '', '', 'SGST:', f"₹{sgst:,.2f}"],
            ])
        else:
            total_data.append(['', '', '', '', 'IGST:', f"₹{invoice.total_tax:,.2f}"])
    
    total_data.append(['', '', '', '', 'Total Amount:', f"₹{invoice.total_amount:,.2f}"])
    
    total_table = Table(total_data, colWidths=[0.5*inch, 2.5*inch, 0.7*inch, 0.7*inch, 1*inch, 1.1*inch])
    total_table.setStyle(TableStyle([
        ('FONTNAME', (4, 0), (4, -2), 'Helvetica-Bold'),
        ('FONTNAME', (4, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (4, 0), (-1, -1), 10),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('BACKGROUND', (4, -1), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (4, -1), (-1, -1), colors.white),
        ('GRID', (4, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 30))
    
    # Terms and Conditions
    if hasattr(invoice, 'terms_and_conditions') and invoice.terms_and_conditions:
        terms_title = Paragraph("<b>Terms & Conditions:</b>", styles['Normal'])
        story.append(terms_title)
        story.append(Spacer(1, 6))
        terms_content = Paragraph(invoice.terms_and_conditions, styles['Normal'])
        story.append(terms_content)
        story.append(Spacer(1, 20))
    
    # Footer
    footer_data = [
        ['Thank you for your business!', '', 'Authorized Signature'],
        ['', '', ''],
        ['', '', invoice.company.name],
    ]
    
    footer_table = Table(footer_data, colWidths=[3*inch, 1*inch, 2*inch])
    footer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(footer_table)
    
    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_proforma_pdf_content(proforma):
    """Generate professional PDF content for proforma invoice"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Row 1: Logo and Company Details
    logo_cell = ''
    if proforma.company.logo:
        try:
            logo_path = os.path.join(settings.MEDIA_ROOT, str(proforma.company.logo))
            if os.path.exists(logo_path):
                logo_img = Image(logo_path, width=1.2*inch, height=1*inch)
                logo_cell = logo_img
        except:
            logo_cell = ''
    
    company_details = f"""{proforma.company.name}
{getattr(proforma.company, 'address', '')}
Phone: {getattr(proforma.company, 'phone', 'N/A')}
Email: {getattr(proforma.company, 'email', 'N/A')}"""
    
    row1_data = [[logo_cell, '', company_details]]
    row1_table = Table(row1_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row1_table.setStyle(TableStyle([
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (2, 0), (2, 0), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    story.append(row1_table)
    story.append(Spacer(1, 15))
    
    # Row 2: To Address and Document Info
    to_address = f"""To:
{proforma.customer.name}
{getattr(proforma.customer, 'address', '')}
Phone: {getattr(proforma.customer, 'phone', 'N/A')}
Email: {getattr(proforma.customer, 'email', 'N/A')}"""
    
    if hasattr(proforma.customer, 'gstin') and proforma.customer.gstin:
        to_address += f"\nGSTIN: {proforma.customer.gstin}"
    
    doc_info = f"""PROFORMA INVOICE
{proforma.proforma_number}
Date: {proforma.proforma_date.strftime('%d/%m/%Y')}
Due Date: {proforma.due_date.strftime('%d/%m/%Y')}"""
    
    row2_data = [[to_address, '', doc_info]]
    row2_table = Table(row2_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row2_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    story.append(row2_table)
    story.append(Spacer(1, 15))
    
    # Row 3: Dispatched To (Shipping Address)
    if hasattr(proforma, 'shipping_address') and proforma.shipping_address:
        # Use the selected shipping address with full details
        shipping_address = f"""{proforma.customer.name}
{proforma.shipping_address.full_address}"""
    else:
        # Fallback to customer's billing address with proper formatting
        billing_parts = []
        if hasattr(proforma.customer, 'billing_address_line1') and proforma.customer.billing_address_line1:
            billing_parts.append(proforma.customer.billing_address_line1)
        if hasattr(proforma.customer, 'billing_address_line2') and proforma.customer.billing_address_line2:
            billing_parts.append(proforma.customer.billing_address_line2)
        if hasattr(proforma.customer, 'billing_city') and proforma.customer.billing_city:
            city_state_pin = f"{proforma.customer.billing_city}"
            if hasattr(proforma.customer, 'billing_state') and proforma.customer.billing_state:
                city_state_pin += f", {proforma.customer.billing_state}"
            if hasattr(proforma.customer, 'billing_pincode') and proforma.customer.billing_pincode:
                city_state_pin += f", {proforma.customer.billing_pincode}"
            if hasattr(proforma.customer, 'billing_country') and proforma.customer.billing_country:
                city_state_pin += f", {proforma.customer.billing_country}"
            billing_parts.append(city_state_pin)
        
        billing_address = ', '.join(billing_parts) if billing_parts else 'N/A'
        shipping_address = f"""{proforma.customer.name}
{billing_address}"""
    
    dispatched_to = f"""Dispatched To:
{shipping_address}"""
    
    row3_data = [[dispatched_to, '', '']]
    row3_table = Table(row3_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row3_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(row3_table)
    story.append(Spacer(1, 20))
    
    # Row 4: Product Description with Details
    items_data = [['S.No.', 'Product Description & Details', 'Qty', 'Unit', 'Rate', 'Amount']]
    
    # Items with detailed description
    for i, item in enumerate(proforma.proforma_items.all(), 1):
        # Create detailed description
        description = item.product_name
        if hasattr(item, 'product') and item.product:
            if hasattr(item.product, 'description') and item.product.description:
                description += f"\n{item.product.description}"
            if hasattr(item.product, 'hsn_code') and item.product.hsn_code:
                description += f"\nHSN: {item.product.hsn_code.code}"
        
        items_data.append([
            str(i),
            description,
            str(item.quantity),
            getattr(item, 'unit', 'Nos'),
            f"₹{item.unit_price:,.2f}",
            f"₹{item.line_total:,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.5*inch, 2.2*inch, 0.7*inch, 0.7*inch, 1*inch, 1.1*inch])
    items_table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data styling
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # S.No.
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),  # Qty, Unit, Rate, Amount
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),     # Description
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 20))
    
    # Totals Section
    total_data = [
        ['', '', '', '', 'Subtotal:', f"₹{proforma.subtotal:,.2f}"],
    ]
    
    if hasattr(proforma, 'total_tax') and float(proforma.total_tax) > 0:
        # Add tax breakdown if available
        if hasattr(proforma, 'gst_type') and proforma.gst_type == 'cgst_sgst':
            cgst = float(proforma.total_tax) / 2
            sgst = float(proforma.total_tax) / 2
            total_data.extend([
                ['', '', '', '', 'CGST:', f"₹{cgst:,.2f}"],
                ['', '', '', '', 'SGST:', f"₹{sgst:,.2f}"],
            ])
        else:
            total_data.append(['', '', '', '', 'IGST:', f"₹{proforma.total_tax:,.2f}"])
    
    total_data.append(['', '', '', '', 'Total Amount:', f"₹{proforma.total_amount:,.2f}"])
    
    total_table = Table(total_data, colWidths=[0.5*inch, 2.5*inch, 0.7*inch, 0.7*inch, 1*inch, 1.1*inch])
    total_table.setStyle(TableStyle([
        ('FONTNAME', (4, 0), (4, -2), 'Helvetica-Bold'),
        ('FONTNAME', (4, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (4, 0), (-1, -1), 10),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('BACKGROUND', (4, -1), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (4, -1), (-1, -1), colors.white),
        ('GRID', (4, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 30))
    
    # Terms and Conditions
    if hasattr(proforma, 'terms_and_conditions') and proforma.terms_and_conditions:
        terms_title = Paragraph("<b>Terms & Conditions:</b>", styles['Normal'])
        story.append(terms_title)
        story.append(Spacer(1, 6))
        terms_content = Paragraph(proforma.terms_and_conditions, styles['Normal'])
        story.append(terms_content)
        story.append(Spacer(1, 20))
    
    # Footer
    footer_data = [
        ['Thank you for your business!', '', 'Authorized Signature'],
        ['', '', ''],
        ['', '', proforma.company.name],
    ]
    
    footer_table = Table(footer_data, colWidths=[3*inch, 1*inch, 2*inch])
    footer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(footer_table)
    
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
        
        # Create professional email with new template
        subject = f"Invoice #{invoice.invoice_number} – Payment Due on {invoice.due_date.strftime('%B %d, %Y')} | {invoice.company.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <p>Dear {invoice.customer.name},</p>
                <br><br>
                <p>Greetings from {invoice.company.name}.</p>
                <br><br>
                <p>Please find attached Invoice #{invoice.invoice_number}, dated {invoice.invoice_date.strftime('%B %d, %Y')}, for the products/services delivered as per our agreement.</p>
                <p>The total payable amount is ₹{invoice.total_amount:,.2f}, and the payment is due on {invoice.due_date.strftime('%B %d, %Y')}.</p>
                <br><br>
                <p>We kindly request you to arrange payment within the stipulated time to ensure smooth continuation of services.</p>
                <p>If you have any clarification or queries, please feel free to reach out.</p>
                <br><br>
                {f'<p>{message}</p><br><br>' if message else ''}
                <p>We sincerely thank you for your continued trust in our services.</p>
                <br><br>
                <p>With warm regards,<br>
                {getattr(invoice.company, 'contact_person', 'Accounts Team')}<br>
                {getattr(invoice.company, 'designation', 'Accounts Executive')}<br>
                {invoice.company.name}<br>
                Bank Details: {getattr(invoice.company, 'bank_details', 'Available on request')}<br>
                Phone: {getattr(invoice.company, 'phone', '+91 9876543210')}<br>
                Email: {getattr(invoice.company, 'email', 'greenvolt.energy.pvt.ltd@gmail.com')}</p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {invoice.customer.name},

Greetings from {invoice.company.name}.

Please find attached Invoice #{invoice.invoice_number}, dated {invoice.invoice_date.strftime('%B %d, %Y')}, for the products/services delivered as per our agreement.
The total payable amount is ₹{invoice.total_amount:,.2f}, and the payment is due on {invoice.due_date.strftime('%B %d, %Y')}.

We kindly request you to arrange payment within the stipulated time to ensure smooth continuation of services.
If you have any clarification or queries, please feel free to reach out.

{message}

We sincerely thank you for your continued trust in our services.

With warm regards,
{getattr(invoice.company, 'contact_person', 'Accounts Team')}
{getattr(invoice.company, 'designation', 'Accounts Executive')}
{invoice.company.name}
Bank Details: {getattr(invoice.company, 'bank_details', 'Available on request')}
Phone: {getattr(invoice.company, 'phone', '+91 9876543210')}
Email: {getattr(invoice.company, 'email', 'greenvolt.energy.pvt.ltd@gmail.com')}
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
    """Generate professional PDF content for quotation using WeasyPrint templates"""
    try:
        from .quotation_pdf_service import quotation_pdf_service
        pdf_bytes = quotation_pdf_service.generate_quotation_pdf(quotation)
        
        # Check if PDF generation was successful
        if pdf_bytes and len(pdf_bytes) > 0:
            # Convert bytes to BytesIO buffer for compatibility
            buffer = io.BytesIO(pdf_bytes)
            return buffer
        else:
            print("WeasyPrint returned empty PDF, falling back to ReportLab")
            return generate_quotation_pdf_content_reportlab(quotation)
            
    except Exception as e:
        print(f"Error generating quotation PDF with WeasyPrint: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback to original ReportLab implementation
        return generate_quotation_pdf_content_reportlab(quotation)

def generate_quotation_pdf_content_reportlab(quotation):
    """Fallback ReportLab implementation for quotation PDF generation"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Row 1: Logo and Company Details
    logo_cell = ''
    if quotation.company.logo:
        try:
            logo_path = os.path.join(settings.MEDIA_ROOT, str(quotation.company.logo))
            if os.path.exists(logo_path):
                logo_img = Image(logo_path, width=1.2*inch, height=1*inch)
                logo_cell = logo_img
        except:
            logo_cell = ''
    
    company_details = f"""{quotation.company.name}
{getattr(quotation.company, 'address', '')}
Phone: {getattr(quotation.company, 'phone', 'N/A')}
Email: {getattr(quotation.company, 'email', 'N/A')}"""
    
    row1_data = [[logo_cell, '', company_details]]
    row1_table = Table(row1_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row1_table.setStyle(TableStyle([
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (2, 0), (2, 0), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    story.append(row1_table)
    story.append(Spacer(1, 15))
    
    # Row 2: To Address and Document Info
    to_address = f"""To:
{quotation.customer.name}
{getattr(quotation.customer, 'address', '')}
Phone: {getattr(quotation.customer, 'phone', 'N/A')}
Email: {getattr(quotation.customer, 'email', 'N/A')}"""
    
    if hasattr(quotation.customer, 'gstin') and quotation.customer.gstin:
        to_address += f"\nGSTIN: {quotation.customer.gstin}"
    
    doc_info = f"""QUOTATION
{quotation.quotation_number}
Date: {quotation.quotation_date.strftime('%d/%m/%Y')}
Valid Until: {quotation.valid_until.strftime('%d/%m/%Y')}"""
    
    row2_data = [[to_address, '', doc_info]]
    row2_table = Table(row2_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row2_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    story.append(row2_table)
    story.append(Spacer(1, 15))
    
    # Row 3: Dispatched To (Shipping Address)
    if quotation.shipping_address:
        # Use the selected shipping address with full details
        shipping_address = f"""{quotation.customer.name}
{quotation.shipping_address.full_address}"""
    else:
        # Fallback to customer's default billing address
        shipping_address = f"""{quotation.customer.name}
{quotation.customer.full_billing_address}"""
    
    dispatched_to = f"""Dispatched To:
{shipping_address}"""
    
    row3_data = [[dispatched_to, '', '']]
    row3_table = Table(row3_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row3_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(row3_table)
    story.append(Spacer(1, 20))
    
    # Row 4: Product Description with Details
    items_data = [['S.No.', 'Product Description & Details', 'Qty', 'Unit', 'Rate', 'Amount']]
    
    # Items with detailed description
    for i, item in enumerate(quotation.quotation_items.all(), 1):
        # Create detailed description
        description = item.product_name
        if hasattr(item, 'product') and item.product:
            if hasattr(item.product, 'description') and item.product.description:
                description += f"\n{item.product.description}"
            if hasattr(item.product, 'hsn_code') and item.product.hsn_code:
                description += f"\nHSN: {item.product.hsn_code.code}"
        
        items_data.append([
            str(i),
            description,
            str(item.quantity),
            getattr(item, 'unit', 'Nos'),
            f"₹{item.unit_price:,.2f}",
            f"₹{item.line_total:,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.5*inch, 2.2*inch, 0.7*inch, 0.7*inch, 1*inch, 1.1*inch])
    items_table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data styling
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # S.No.
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),  # Qty, Unit, Rate, Amount
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),     # Description
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 20))
    
    # Totals Section
    total_data = [
        ['', '', '', '', 'Subtotal:', f"₹{quotation.subtotal:,.2f}"],
    ]
    
    if float(quotation.total_tax) > 0:
        # Add tax breakdown if available
        if quotation.gst_type == 'cgst_sgst':
            cgst = float(quotation.total_tax) / 2
            sgst = float(quotation.total_tax) / 2
            total_data.extend([
                ['', '', '', '', 'CGST:', f"₹{cgst:,.2f}"],
                ['', '', '', '', 'SGST:', f"₹{sgst:,.2f}"],
            ])
        else:
            total_data.append(['', '', '', '', 'IGST:', f"₹{quotation.total_tax:,.2f}"])
    
    total_data.append(['', '', '', '', 'Total Amount:', f"₹{quotation.total_amount:,.2f}"])
    
    total_table = Table(total_data, colWidths=[0.5*inch, 2.5*inch, 0.7*inch, 0.7*inch, 1*inch, 1.1*inch])
    total_table.setStyle(TableStyle([
        ('FONTNAME', (4, 0), (4, -2), 'Helvetica-Bold'),
        ('FONTNAME', (4, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (4, 0), (-1, -1), 10),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('BACKGROUND', (4, -1), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (4, -1), (-1, -1), colors.white),
        ('GRID', (4, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 30))
    
    # Terms and Conditions
    if hasattr(quotation, 'terms_and_conditions') and quotation.terms_and_conditions:
        terms_title = Paragraph("<b>Terms & Conditions:</b>", styles['Normal'])
        story.append(terms_title)
        story.append(Spacer(1, 6))
        terms_content = Paragraph(quotation.terms_and_conditions, styles['Normal'])
        story.append(terms_content)
        story.append(Spacer(1, 20))
    
    # Footer
    footer_data = [
        ['Thank you for your business!', '', 'Authorized Signature'],
        ['', '', ''],
        ['', '', quotation.company.name],
    ]
    
    footer_table = Table(footer_data, colWidths=[3*inch, 1*inch, 2*inch])
    footer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(footer_table)
    
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
        
        # Create professional email with new template
        subject = f"Submission of Quotation – Ref #{quotation.quotation_number} | {quotation.company.name}"
        
        # Get product/service names from quotation items
        product_services = ", ".join([item.product_name for item in quotation.quotation_items.all()[:3]])  # First 3 items
        if quotation.quotation_items.count() > 3:
            product_services += " and more"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <p>Dear {quotation.customer.name},</p>
                <br><br>
                <p>Greetings from {quotation.company.name}!</p>
                <br><br>
                <p>Please find attached the quotation document (Ref: #{quotation.quotation_number}, dated {quotation.quotation_date.strftime('%d/%m/%Y')}) for the requested {product_services}.</p>
                <p>We have carefully reviewed your requirements and proposed the most suitable solution along with detailed pricing and terms.</p>
                <br><br>
                <p>Kindly review the quotation at your convenience. This quotation will remain valid until {quotation.valid_until.strftime('%d/%m/%Y')}.</p>
                <br><br>
                <p>Should you require any clarification or modification, we will be happy to assist you further.</p>
                <br><br>
                {f'<p>{message}</p><br><br>' if message else ''}
                <p>Thank you for considering our proposal. We look forward to your positive response.</p>
                <br><br>
                <p>Warm regards,<br>
                {getattr(quotation.company, 'contact_person', 'Sales Team')}<br>
                {getattr(quotation.company, 'designation', 'Sales Executive')}<br>
                {quotation.company.name}<br>
                Phone: {getattr(quotation.company, 'phone', 'N/A')}<br>
                Email: {getattr(quotation.company, 'email', 'N/A')}<br>
                Website: {getattr(quotation.company, 'website', 'N/A')}</p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {quotation.customer.name},

Greetings from {quotation.company.name}!

Please find attached the quotation document (Ref: #{quotation.quotation_number}, dated {quotation.quotation_date.strftime('%d/%m/%Y')}) for the requested {product_services}.
We have carefully reviewed your requirements and proposed the most suitable solution along with detailed pricing and terms.

Kindly review the quotation at your convenience. This quotation will remain valid until {quotation.valid_until.strftime('%d/%m/%Y')}.

Should you require any clarification or modification, we will be happy to assist you further.

{message}

Thank you for considering our proposal. We look forward to your positive response.

Warm regards,
{getattr(quotation.company, 'contact_person', 'Sales Team')}
{getattr(quotation.company, 'designation', 'Sales Executive')}
{quotation.company.name}
Phone: {getattr(quotation.company, 'phone', 'N/A')}
Email: {getattr(quotation.company, 'email', 'N/A')}
Website: {getattr(quotation.company, 'website', 'N/A')}
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

def generate_purchase_order_pdf_content(purchase_order):
    """Generate professional PDF content for purchase order"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Row 1: Logo and Company Details
    logo_cell = ''
    if purchase_order.company.logo:
        try:
            logo_path = os.path.join(settings.MEDIA_ROOT, str(purchase_order.company.logo))
            if os.path.exists(logo_path):
                logo_img = Image(logo_path, width=1.2*inch, height=1*inch)
                logo_cell = logo_img
        except:
            logo_cell = ''
    
    company_details = f"""{purchase_order.company.name}
{getattr(purchase_order.company, 'address', '')}
Phone: {getattr(purchase_order.company, 'phone', 'N/A')}
Email: {getattr(purchase_order.company, 'email', 'N/A')}"""
    
    row1_data = [[logo_cell, '', company_details]]
    row1_table = Table(row1_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row1_table.setStyle(TableStyle([
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (2, 0), (2, 0), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    story.append(row1_table)
    story.append(Spacer(1, 15))
    
    # Row 2: To Address and Document Info
    to_address = f"""To:
{purchase_order.customer.name}
{getattr(purchase_order.customer, 'billing_address_line1', '')}
Phone: {getattr(purchase_order.customer, 'phone', 'N/A')}
Email: {getattr(purchase_order.customer, 'email', 'N/A')}"""
    
    if hasattr(purchase_order.customer, 'gstin') and purchase_order.customer.gstin:
        to_address += f"\nGSTIN: {purchase_order.customer.gstin}"
    
    doc_info = f"""PURCHASE ORDER
{purchase_order.internal_po_number}
PO Date: {purchase_order.po_date.strftime('%d/%m/%Y')}
Client PO: {purchase_order.po_number}"""
    
    row2_data = [[to_address, '', doc_info]]
    row2_table = Table(row2_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row2_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    story.append(row2_table)
    story.append(Spacer(1, 15))
    
    # Row 3: Dispatched To (Shipping Address)
    if purchase_order.shipping_address:
        shipping_address = f"""{purchase_order.customer.name}
{purchase_order.shipping_address.full_address}"""
    else:
        shipping_address = f"""{purchase_order.customer.name}
{purchase_order.customer.full_billing_address}"""
    
    dispatched_to = f"""Dispatched To:
{shipping_address}"""
    
    row3_data = [[dispatched_to, '', '']]
    row3_table = Table(row3_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
    row3_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(row3_table)
    story.append(Spacer(1, 20))
    
    # Row 4: Product Description with Details
    items_data = [['S.No.', 'Product Description & Details', 'Qty', 'Unit', 'Rate', 'Amount']]
    
    for i, item in enumerate(purchase_order.po_items.all(), 1):
        description = item.product_name
        if hasattr(item, 'product') and item.product:
            if hasattr(item.product, 'description') and item.product.description:
                description += f"\n{item.product.description}"
            if hasattr(item.product, 'hsn_code') and item.product.hsn_code:
                description += f"\nHSN: {item.product.hsn_code.code}"
        
        items_data.append([
            str(i),
            description,
            str(item.quantity),
            getattr(item, 'unit', 'Nos'),
            f"₹{item.unit_price:,.2f}",
            f"₹{item.line_total:,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.5*inch, 2.2*inch, 0.7*inch, 0.7*inch, 1*inch, 1.1*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 20))
    
    # Totals Section
    total_data = [
        ['', '', '', '', 'Subtotal:', f"₹{purchase_order.subtotal:,.2f}"],
    ]
    
    if float(purchase_order.total_tax) > 0:
        if purchase_order.gst_type == 'cgst_sgst':
            cgst = float(purchase_order.total_tax) / 2
            sgst = float(purchase_order.total_tax) / 2
            total_data.extend([
                ['', '', '', '', 'CGST:', f"₹{cgst:,.2f}"],
                ['', '', '', '', 'SGST:', f"₹{sgst:,.2f}"],
            ])
        else:
            total_data.append(['', '', '', '', 'IGST:', f"₹{purchase_order.total_tax:,.2f}"])
    
    total_data.append(['', '', '', '', 'Total Amount:', f"₹{purchase_order.total_amount:,.2f}"])
    
    total_table = Table(total_data, colWidths=[0.5*inch, 2.5*inch, 0.7*inch, 0.7*inch, 1*inch, 1.1*inch])
    total_table.setStyle(TableStyle([
        ('FONTNAME', (4, 0), (4, -2), 'Helvetica-Bold'),
        ('FONTNAME', (4, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (4, 0), (-1, -1), 10),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('BACKGROUND', (4, -1), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (4, -1), (-1, -1), colors.white),
        ('GRID', (4, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 30))
    
    # Terms and Conditions
    if hasattr(purchase_order, 'terms_and_conditions') and purchase_order.terms_and_conditions:
        terms_title = Paragraph("<b>Terms & Conditions:</b>", styles['Normal'])
        story.append(terms_title)
        story.append(Spacer(1, 6))
        terms_content = Paragraph(purchase_order.terms_and_conditions, styles['Normal'])
        story.append(terms_content)
        story.append(Spacer(1, 20))
    
    # Footer
    footer_data = [
        ['Thank you for your business!', '', 'Authorized Signature'],
        ['', '', ''],
        ['', '', purchase_order.company.name],
    ]
    
    footer_table = Table(footer_data, colWidths=[3*inch, 1*inch, 2*inch])
    footer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(footer_table)
    
    doc.build(story)
    buffer.seek(0)
    return buffer

def send_purchase_order_email(purchase_order, recipient_email, message=""):
    """Send purchase order via email using company-specific email settings"""
    try:
        # Get company email service
        email_service = get_company_email_service(purchase_order.company)
        
        if not email_service or not email_service.can_send_email():
            return False, "Company email service not configured or daily limit reached. Please configure email settings in Company Dashboard."
        
        # Generate PDF
        pdf_buffer = generate_purchase_order_pdf_content(purchase_order)
        
        # Get product/service names from PO items
        product_services = ", ".join([item.product_name for item in purchase_order.po_items.all()[:3]])
        if purchase_order.po_items.count() > 3:
            product_services += " and more"
        if not product_services:
            product_services = "goods/services"
        
        # Create professional email with new template
        subject = f"Purchase Order #{purchase_order.internal_po_number} – {purchase_order.company.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <p>Dear {purchase_order.vendor.name if hasattr(purchase_order, 'vendor') and purchase_order.vendor else purchase_order.customer.name},</p>
                <br><br>
                <p>Warm greetings from {purchase_order.company.name}!</p>
                <br><br>
                <p>We are pleased to share with you the official Purchase Order #{purchase_order.internal_po_number}, dated {purchase_order.po_date.strftime('%B %d, %Y')}, for the procurement of {product_services}.</p>
                <p>Please find the PO attached to this email.</p>
                <br><br>
                <p>Kindly acknowledge receipt and confirm acceptance at your earliest convenience.</p>
                <p>Should there be any queries regarding the order or delivery schedule, please feel free to contact us.</p>
                <br><br>
                {f'<p>{message}</p><br><br>' if message else ''}
                <p>We truly appreciate your continued support and partnership.</p>
                <br><br>
                <p>Sincerely,<br>
                {getattr(purchase_order.company, 'contact_person', 'Sales Team')}<br>
                {getattr(purchase_order.company, 'designation', 'Sales Executive')}<br>
                {purchase_order.company.name}<br>
                Phone: {getattr(purchase_order.company, 'phone', '+91 9876543210')}<br>
                Email: {getattr(purchase_order.company, 'email', 'greenvolt.energy.pvt.ltd@gmail.com')}</p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {purchase_order.vendor.name if hasattr(purchase_order, 'vendor') and purchase_order.vendor else purchase_order.customer.name},

Warm greetings from {purchase_order.company.name}!

We are pleased to share with you the official Purchase Order #{purchase_order.internal_po_number}, dated {purchase_order.po_date.strftime('%B %d, %Y')}, for the procurement of {product_services}.
Please find the PO attached to this email.

Kindly acknowledge receipt and confirm acceptance at your earliest convenience.
Should there be any queries regarding the order or delivery schedule, please feel free to contact us.

{message}

We truly appreciate your continued support and partnership.

Sincerely,
{getattr(purchase_order.company, 'contact_person', 'Sales Team')}
{getattr(purchase_order.company, 'designation', 'Sales Executive')}
{purchase_order.company.name}
Phone: {getattr(purchase_order.company, 'phone', '+91 9876543210')}
Email: {getattr(purchase_order.company, 'email', 'greenvolt.energy.pvt.ltd@gmail.com')}
        """
        
        # Prepare attachment with temporary file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(pdf_buffer.getvalue())
            temp_file_path = temp_file.name
        
        attachments = [{
            'name': f"PurchaseOrder_{purchase_order.internal_po_number}.pdf",
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
            return True, f"✅ Purchase order email sent successfully to {recipient_email}"
        else:
            return False, "❌ Failed to send purchase order email. Please check your email configuration."
        
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
        
        # Get product/service names from proforma items
        product_services = ", ".join([item.product_name for item in proforma.proforma_items.all()[:3]])
        if proforma.proforma_items.count() > 3:
            product_services += " and more"
        if not product_services:
            product_services = "goods/services"
        
        # Create professional email with new template
        subject = f"Proforma Invoice #{proforma.proforma_number} for Your Reference – {proforma.company.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <p>Dear {proforma.customer.name},</p>
                <br><br>
                <p>Hope this message finds you well.</p>
                <br><br>
                <p>Please find attached the Proforma Invoice (Ref: #{proforma.proforma_number}, dated {proforma.proforma_date.strftime('%B %d, %Y')}) for the proposed order of {product_services}.</p>
                <p>The document includes a breakdown of the estimated cost, terms, and other relevant details.</p>
                <br><br>
                <p>Kindly review the information and confirm if everything is in order.</p>
                <p>To proceed with the order, we request you to arrange the payment as per the terms mentioned in the Proforma Invoice.</p>
                <br><br>
                <p>Upon receipt of your confirmation and payment, we will initiate the necessary processing steps immediately.</p>
                <br><br>
                {f'<p>{message}</p><br><br>' if message else ''}
                <p>Thank you for your attention. We remain available for any queries or support.</p>
                <br><br>
                <p>Best regards,<br>
                {getattr(proforma.company, 'contact_person', 'Sales Team')}<br>
                {getattr(proforma.company, 'designation', 'Sales Executive')}<br>
                {proforma.company.name}<br>
                Phone: {getattr(proforma.company, 'phone', '+91 9876543210')}<br>
                Email: {getattr(proforma.company, 'email', 'greenvolt.energy.pvt.ltd@gmail.com')}</p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {proforma.customer.name},

Hope this message finds you well.

Please find attached the Proforma Invoice (Ref: #{proforma.proforma_number}, dated {proforma.proforma_date.strftime('%B %d, %Y')}) for the proposed order of {product_services}.
The document includes a breakdown of the estimated cost, terms, and other relevant details.

Kindly review the information and confirm if everything is in order.
To proceed with the order, we request you to arrange the payment as per the terms mentioned in the Proforma Invoice.

Upon receipt of your confirmation and payment, we will initiate the necessary processing steps immediately.

{message}

Thank you for your attention. We remain available for any queries or support.

Best regards,
{getattr(proforma.company, 'contact_person', 'Sales Team')}
{getattr(proforma.company, 'designation', 'Sales Executive')}
{proforma.company.name}
Phone: {getattr(proforma.company, 'phone', '+91 9876543210')}
Email: {getattr(proforma.company, 'email', 'greenvolt.energy.pvt.ltd@gmail.com')}
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