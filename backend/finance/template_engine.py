"""
Document Template Engine
"""
from jinja2 import Environment, BaseLoader
from weasyprint import HTML, CSS
from django.template.loader import render_to_string
from django.conf import settings
import os
import base64
from io import BytesIO

class TemplateEngine:
    """Document template processing engine"""
    
    def __init__(self, company):
        self.company = company
        self.jinja_env = Environment(loader=BaseLoader())
    
    def render_document(self, template, context_data):
        """Render document using template and context data"""
        try:
            # Render HTML content
            template_obj = self.jinja_env.from_string(template.html_content)
            html_content = template_obj.render(**context_data)
            
            # Apply CSS styles
            if template.css_styles:
                css_content = template.css_styles
            else:
                css_content = self._get_default_css()
            
            return {
                'success': True,
                'html_content': html_content,
                'css_content': css_content
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Template rendering error: {str(e)}"
            }
    
    def generate_pdf(self, html_content, css_content=None):
        """Generate PDF from HTML content"""
        try:
            # Create HTML object
            html_obj = HTML(string=html_content)
            
            # Create CSS object if provided
            css_obj = None
            if css_content:
                css_obj = CSS(string=css_content)
            
            # Generate PDF
            if css_obj:
                pdf_bytes = html_obj.write_pdf(stylesheets=[css_obj])
            else:
                pdf_bytes = html_obj.write_pdf()
            
            return {
                'success': True,
                'pdf_bytes': pdf_bytes
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"PDF generation error: {str(e)}"
            }
    
    def get_invoice_context(self, invoice):
        """Get context data for invoice template"""
        return {
            'company': {
                'name': self.company.name,
                'gstin': getattr(self.company, 'gstin', ''),
                'address': getattr(self.company, 'address', ''),
                'city': getattr(self.company, 'city', ''),
                'state': getattr(self.company, 'state', ''),
                'pincode': getattr(self.company, 'pincode', ''),
                'phone': getattr(self.company, 'phone', ''),
                'email': getattr(self.company, 'email', ''),
            },
            'invoice': {
                'number': invoice.invoice_number,
                'date': invoice.invoice_date.strftime('%d/%m/%Y'),
                'due_date': invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else '',
                'subtotal': invoice.subtotal,
                'cgst_amount': invoice.cgst_amount or 0,
                'sgst_amount': invoice.sgst_amount or 0,
                'igst_amount': invoice.igst_amount or 0,
                'cess_amount': invoice.cess_amount or 0,
                'total_amount': invoice.total_amount,
                'payment_status': invoice.payment_status,
            },
            'customer': {
                'name': invoice.customer.name,
                'gstin': invoice.customer.gstin or '',
                'address': invoice.customer.address or '',
                'city': invoice.customer.city or '',
                'state': invoice.customer.state or '',
                'pincode': invoice.customer.pincode or '',
                'phone': invoice.customer.phone or '',
                'email': invoice.customer.email or '',
            },
            'items': [
                {
                    'name': item.product.name,
                    'description': item.product.description or '',
                    'hsn_code': item.product.hsn_code.code if item.product.hsn_code else '',
                    'quantity': item.quantity,
                    'unit_price': item.unit_price,
                    'line_total': item.line_total,
                    'cgst_amount': item.cgst_amount or 0,
                    'sgst_amount': item.sgst_amount or 0,
                    'igst_amount': item.igst_amount or 0,
                }
                for item in invoice.invoice_items.all()
            ]
        }
    
    def get_quotation_context(self, quotation):
        """Get context data for quotation template"""
        return {
            'company': {
                'name': self.company.name,
                'address': getattr(self.company, 'address', ''),
                'city': getattr(self.company, 'city', ''),
                'phone': getattr(self.company, 'phone', ''),
                'email': getattr(self.company, 'email', ''),
            },
            'quotation': {
                'number': quotation.quotation_number,
                'date': quotation.quotation_date.strftime('%d/%m/%Y'),
                'valid_until': quotation.valid_until.strftime('%d/%m/%Y'),
                'subtotal': quotation.subtotal,
                'total_amount': quotation.total_amount,
                'status': quotation.status,
            },
            'customer': {
                'name': quotation.customer.name,
                'address': quotation.customer.address or '',
                'city': quotation.customer.city or '',
                'phone': quotation.customer.phone or '',
                'email': quotation.customer.email or '',
            },
            'items': [
                {
                    'name': item.product.name,
                    'description': item.product.description or '',
                    'quantity': item.quantity,
                    'unit_price': item.unit_price,
                    'line_total': item.line_total,
                }
                for item in quotation.quotation_items.all()
            ]
        }
    
    def _get_default_css(self):
        """Get default CSS styles for documents"""
        return """
        @page {
            size: A4;
            margin: 1cm;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        
        .document-title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
            text-transform: uppercase;
        }
        
        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .info-box {
            width: 48%;
        }
        
        .info-box h3 {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #007bff;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        .items-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        .items-table .number {
            text-align: right;
        }
        
        .totals-section {
            float: right;
            width: 300px;
            margin-top: 20px;
        }
        
        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .totals-table td {
            padding: 5px 10px;
            border-bottom: 1px solid #ddd;
        }
        
        .totals-table .label {
            font-weight: bold;
        }
        
        .totals-table .amount {
            text-align: right;
        }
        
        .total-row {
            font-weight: bold;
            font-size: 14px;
            background-color: #f8f9fa;
        }
        
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        """
    
    def get_default_invoice_template(self):
        """Get default invoice template HTML"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Invoice {{ invoice.number }}</title>
        </head>
        <body>
            <div class="header">
                <div class="company-name">{{ company.name }}</div>
                <div>{{ company.address }}, {{ company.city }}</div>
                <div>GSTIN: {{ company.gstin }} | Phone: {{ company.phone }}</div>
            </div>
            
            <div class="document-title">TAX INVOICE</div>
            
            <div class="info-section">
                <div class="info-box">
                    <h3>Bill To:</h3>
                    <div><strong>{{ customer.name }}</strong></div>
                    <div>{{ customer.address }}</div>
                    <div>{{ customer.city }}, {{ customer.state }} - {{ customer.pincode }}</div>
                    {% if customer.gstin %}
                    <div>GSTIN: {{ customer.gstin }}</div>
                    {% endif %}
                </div>
                
                <div class="info-box">
                    <h3>Invoice Details:</h3>
                    <div><strong>Invoice No:</strong> {{ invoice.number }}</div>
                    <div><strong>Date:</strong> {{ invoice.date }}</div>
                    {% if invoice.due_date %}
                    <div><strong>Due Date:</strong> {{ invoice.due_date }}</div>
                    {% endif %}
                    <div><strong>Status:</strong> {{ invoice.payment_status|title }}</div>
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Description</th>
                        <th>HSN/SAC</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                        <th>CGST</th>
                        <th>SGST</th>
                        <th>IGST</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in items %}
                    <tr>
                        <td>{{ loop.index }}</td>
                        <td>{{ item.name }}</td>
                        <td>{{ item.hsn_code }}</td>
                        <td class="number">{{ item.quantity }}</td>
                        <td class="number">₹{{ "%.2f"|format(item.unit_price) }}</td>
                        <td class="number">₹{{ "%.2f"|format(item.line_total) }}</td>
                        <td class="number">₹{{ "%.2f"|format(item.cgst_amount) }}</td>
                        <td class="number">₹{{ "%.2f"|format(item.sgst_amount) }}</td>
                        <td class="number">₹{{ "%.2f"|format(item.igst_amount) }}</td>
                        <td class="number">₹{{ "%.2f"|format(item.line_total + item.cgst_amount + item.sgst_amount + item.igst_amount) }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            
            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="amount">₹{{ "%.2f"|format(invoice.subtotal) }}</td>
                    </tr>
                    {% if invoice.cgst_amount > 0 %}
                    <tr>
                        <td class="label">CGST:</td>
                        <td class="amount">₹{{ "%.2f"|format(invoice.cgst_amount) }}</td>
                    </tr>
                    {% endif %}
                    {% if invoice.sgst_amount > 0 %}
                    <tr>
                        <td class="label">SGST:</td>
                        <td class="amount">₹{{ "%.2f"|format(invoice.sgst_amount) }}</td>
                    </tr>
                    {% endif %}
                    {% if invoice.igst_amount > 0 %}
                    <tr>
                        <td class="label">IGST:</td>
                        <td class="amount">₹{{ "%.2f"|format(invoice.igst_amount) }}</td>
                    </tr>
                    {% endif %}
                    <tr class="total-row">
                        <td class="label">Total Amount:</td>
                        <td class="amount">₹{{ "%.2f"|format(invoice.total_amount) }}</td>
                    </tr>
                </table>
            </div>
            
            <div style="clear: both;"></div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>This is a computer generated invoice.</p>
            </div>
        </body>
        </html>
        """