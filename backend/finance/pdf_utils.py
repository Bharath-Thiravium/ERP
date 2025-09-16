import os
from io import BytesIO
from django.conf import settings
from django.template.loader import render_to_string
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from decimal import Decimal
import datetime


class InvoicePDFGenerator:
    """Generate professional PDF invoices with company branding"""
    
    def __init__(self, invoice, company_logo_path=None):
        self.invoice = invoice
        self.company_logo_path = company_logo_path
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Company name style
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),  # Athenas blue
            alignment=TA_CENTER,
            spaceAfter=12
        ))
        
        # Invoice title style
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1e40af'),
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#374151'),
            spaceBefore=12,
            spaceAfter=6
        ))
        
        # Address style
        self.styles.add(ParagraphStyle(
            name='Address',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6b7280'),
            leftIndent=0
        ))
        
        # Table header style
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.white,
            alignment=TA_CENTER
        ))
    
    def generate_pdf(self):
        """Generate the complete PDF invoice"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build the PDF content
        story = []
        
        # Add company header
        story.extend(self.build_header())
        
        # Add invoice details
        story.extend(self.build_invoice_details())
        
        # Add customer details
        story.extend(self.build_customer_details())
        
        # Add items table
        story.extend(self.build_items_table())
        
        # Add totals
        story.extend(self.build_totals())
        
        # Add footer
        story.extend(self.build_footer())
        
        # Build PDF
        doc.build(story)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        return pdf_data
    
    def build_header(self):
        """Build company header section"""
        elements = []
        
        # Company logo (if available)
        if self.company_logo_path and os.path.exists(self.company_logo_path):
            try:
                logo = Image(self.company_logo_path, width=2*inch, height=1*inch)
                logo.hAlign = 'CENTER'
                elements.append(logo)
                elements.append(Spacer(1, 12))
            except:
                pass  # Skip logo if there's an error
        
        # Company name
        company_name = getattr(self.invoice.company, 'name', 'Your Company Name')
        elements.append(Paragraph(company_name, self.styles['CompanyName']))
        
        # Company address (if available)
        if hasattr(self.invoice.company, 'address'):
            address_lines = [
                getattr(self.invoice.company, 'address', ''),
                f"{getattr(self.invoice.company, 'city', '')}, {getattr(self.invoice.company, 'state', '')} {getattr(self.invoice.company, 'pincode', '')}",
                f"Phone: {getattr(self.invoice.company, 'phone', '')}",
                f"Email: {getattr(self.invoice.company, 'email', '')}",
            ]
            address_text = '<br/>'.join([line for line in address_lines if line.strip()])
            if address_text:
                elements.append(Paragraph(address_text, self.styles['Address']))
        
        elements.append(Spacer(1, 20))
        
        # Invoice title
        elements.append(Paragraph('INVOICE', self.styles['InvoiceTitle']))
        elements.append(Spacer(1, 20))
        
        return elements
    
    def build_invoice_details(self):
        """Build invoice details section"""
        elements = []
        
        # Invoice details table
        invoice_data = [
            ['Invoice Number:', self.invoice.invoice_number],
            ['Invoice Date:', self.invoice.invoice_date.strftime('%d/%m/%Y')],
            ['Due Date:', self.invoice.due_date.strftime('%d/%m/%Y') if self.invoice.due_date else 'N/A'],
            ['Payment Status:', self.invoice.payment_status.title()],
        ]
        
        invoice_table = Table(invoice_data, colWidths=[2*inch, 3*inch])
        invoice_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(invoice_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def build_customer_details(self):
        """Build customer details section"""
        elements = []
        
        elements.append(Paragraph('Bill To:', self.styles['SectionHeader']))
        
        # Customer details
        customer_lines = [
            self.invoice.customer_details.get('name', ''),
            self.invoice.customer_details.get('address', ''),
            f"{self.invoice.customer_details.get('city', '')}, {self.invoice.customer_details.get('state', '')} {self.invoice.customer_details.get('pincode', '')}",
            f"Phone: {self.invoice.customer_details.get('phone', '')}",
            f"Email: {self.invoice.customer_details.get('email', '')}",
        ]
        
        if self.invoice.customer_details.get('gst_number'):
            customer_lines.append(f"GST Number: {self.invoice.customer_details['gst_number']}")
        
        customer_text = '<br/>'.join([line for line in customer_lines if line.strip()])
        elements.append(Paragraph(customer_text, self.styles['Address']))
        elements.append(Spacer(1, 20))
        
        return elements
    
    def build_items_table(self):
        """Build items table"""
        elements = []
        
        elements.append(Paragraph('Items:', self.styles['SectionHeader']))
        
        # Table headers
        headers = ['S.No.', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount', 'Tax', 'Total']
        
        # Table data
        table_data = [headers]
        
        for i, item in enumerate(self.invoice.invoice_items.all(), 1):
            row = [
                str(i),
                f"{item.product_name}\n{item.description}" if item.description else item.product_name,
                item.hsn_sac_code or '',
                str(item.quantity),
                f"₹{float(item.rate):,.2f}",
                f"₹{float(item.amount):,.2f}",
                f"₹{float(item.tax_amount):,.2f}",
                f"₹{float(item.line_total):,.2f}",
            ]
            table_data.append(row)
        
        # Create table
        table = Table(table_data, colWidths=[0.5*inch, 2.5*inch, 0.8*inch, 0.6*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch])
        
        # Table style
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # S.No.
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Description
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),  # HSN/SAC
            ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Qty
            ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),  # Amounts
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def build_totals(self):
        """Build totals section"""
        elements = []
        
        # Totals data
        totals_data = [
            ['Subtotal:', f"₹{float(self.invoice.subtotal):,.2f}"],
            ['Tax Amount:', f"₹{float(self.invoice.total_tax):,.2f}"],
            ['Total Amount:', f"₹{float(self.invoice.total_amount):,.2f}"],
        ]
        
        if float(self.invoice.paid_amount) > 0:
            totals_data.append(['Paid Amount:', f"₹{float(self.invoice.paid_amount):,.2f}"])
            totals_data.append(['Outstanding:', f"₹{float(self.invoice.outstanding_amount):,.2f}"])
        
        # Create totals table
        totals_table = Table(totals_data, colWidths=[2*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (-2, -2), (-1, -2), 2, colors.HexColor('#1e40af')),
            ('BACKGROUND', (-2, -1), (-1, -1), colors.HexColor('#f3f4f6')),
        ]))
        
        # Right align the totals table
        totals_table.hAlign = 'RIGHT'
        elements.append(totals_table)
        elements.append(Spacer(1, 30))
        
        return elements
    
    def build_footer(self):
        """Build footer section"""
        elements = []
        
        # Terms and conditions
        elements.append(Paragraph('Terms & Conditions:', self.styles['SectionHeader']))
        terms_text = """
        1. Payment is due within 30 days of invoice date.<br/>
        2. Late payments may incur additional charges.<br/>
        3. All disputes must be reported within 7 days of invoice date.<br/>
        4. This is a computer-generated invoice and does not require a signature.
        """
        elements.append(Paragraph(terms_text, self.styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Thank you message
        thank_you = Paragraph(
            'Thank you for your business!',
            ParagraphStyle(
                name='ThankYou',
                parent=self.styles['Normal'],
                fontSize=12,
                textColor=colors.HexColor('#1e40af'),
                alignment=TA_CENTER,
                spaceBefore=20
            )
        )
        elements.append(thank_you)
        
        return elements


def generate_invoice_pdf(invoice, company_logo_path=None):
    """Generate PDF for an invoice"""
    generator = InvoicePDFGenerator(invoice, company_logo_path)
    return generator.generate_pdf()


def create_pdf_response(pdf_data, filename):
    """Create HTTP response for PDF download"""
    response = HttpResponse(pdf_data, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
