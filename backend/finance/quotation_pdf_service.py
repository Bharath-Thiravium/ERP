"""
WeasyPrint PDF Generation Service for Quotations
Generates PDFs using selectable templates (AS/BKGE/TC)
"""

import io
from django.template.loader import render_to_string
from django.conf import settings
import weasyprint
from pathlib import Path
from types import SimpleNamespace

class QuotationPDFService:
    """Service for generating quotation PDFs with selectable templates"""
    
    TEMPLATE_MAPPING = {
        'AS': 'finance/quotation_templates/AS/quotation.html',
        'BKGE': 'finance/quotation_templates/BKGE/quotation.html', 
        'TC': 'finance/quotation_templates/TC/quotation.html'
    }
    
    def __init__(self):
        self._base_template_path = None
    
    @property
    def base_template_path(self):
        """Lazy loading of base template path to avoid settings access at import time"""
        if self._base_template_path is None:
            self._base_template_path = Path(settings.BASE_DIR) / 'finance' / 'templates'
        return self._base_template_path
    
    def get_company_template(self, company):
        """Get the selected template for a company"""
        try:
            # Import here to avoid circular imports
            from company_dashboard.quotation_template_models import CompanyQuotationTemplateSettings
            
            template_settings = CompanyQuotationTemplateSettings.objects.filter(company=company).first()
            if template_settings:
                return template_settings.selected_template
        except Exception as e:
            print(f"Error getting company template: {str(e)}")
        return 'AS'  # Default template
    
    def generate_quotation_html(self, quotation, template_name=None):
        """Generate HTML content for quotation using specified template"""
        try:
            # Use provided template or get company's selected template
            if not template_name:
                template_name = self.get_company_template(quotation.company)
            
            # Get template path
            template_path = self.TEMPLATE_MAPPING.get(template_name, self.TEMPLATE_MAPPING['AS'])
            
            # Prepare context data with complete company information
            context = {
                'quotation': quotation,
                'company': quotation.company,
                'customer': quotation.customer,
                'items': self._get_quotation_items(quotation),
                'company_gstin': getattr(quotation, 'company_gstin', None) or getattr(quotation.company, 'gst_number', ''),
                'logo_path': self._get_logo_path(quotation.company),
                'logo_url': self._get_logo_url(quotation.company),
            }
            
            # Company model has: name, email, phone, address, gst_number
            # Templates expect: name, email, phone, address, city, state, pincode, gst_number
            # Parse address field to extract city, state, pincode if needed
            company = quotation.company
            if hasattr(company, 'address') and company.address:
                # Try to parse address for city, state, pincode
                address_parts = company.address.split(',')
                if len(address_parts) >= 2:
                    # Last part might contain state and pincode
                    last_part = address_parts[-1].strip()
                    # Look for pincode pattern (6 digits)
                    import re
                    pincode_match = re.search(r'\b(\d{6})\b', last_part)
                    if pincode_match:
                        company.pincode = pincode_match.group(1)
                        # Remove pincode from last part to get state
                        company.state = last_part.replace(company.pincode, '').strip(' -')
                    else:
                        company.state = last_part
                    
                    # Second last part might be city
                    if len(address_parts) >= 2:
                        company.city = address_parts[-2].strip()
                
            # Set defaults if not found
            if not hasattr(company, 'city'):
                company.city = ''
            if not hasattr(company, 'state'):
                company.state = ''
            if not hasattr(company, 'pincode'):
                company.pincode = ''
            
            # Render HTML template
            html_content = render_to_string(template_path, context)
            return html_content
            
        except Exception as e:
            print(f"Error generating quotation HTML: {str(e)}")
            return f"<html><body><h1>Error generating preview</h1><p>{str(e)}</p></body></html>"
    def _get_logo_path(self, company):
        """Return file:// URI for WeasyPrint."""
        from finance.logo_utils import get_logo_file_path
        return get_logo_file_path(company)

    def _get_logo_url(self, company):
        """Return absolute https:// URL for browser preview (works from blob: origin)."""
        from finance.logo_utils import get_absolute_logo_url
        return get_absolute_logo_url(company)

    def _get_quotation_items(self, quotation):
        """Get quotation items, handling both real and mock objects"""
        try:
            items = quotation.quotation_items.all()
            # Check if it's a queryset (real object) or list (mock)
            if hasattr(items, 'order_by'):
                return items
            else:
                # For mock objects, return as is
                return items
        except AttributeError:
            # Fallback for mock objects
            return getattr(quotation, 'quotation_items', SimpleNamespace(all=lambda: []))().all()
    
    def generate_quotation_pdf(self, quotation):
        """Generate PDF for quotation using company's selected template"""
        try:
            # Get HTML content
            html_content = self.generate_quotation_html(quotation)
            
            # Generate PDF using WeasyPrint
            pdf_buffer = io.BytesIO()
            
            # WeasyPrint configuration - CSS is embedded in HTML
            html_doc = weasyprint.HTML(string=html_content, base_url=str(self.base_template_path))
            
            # Generate PDF without external CSS (styles are in HTML)
            html_doc.write_pdf(pdf_buffer)
            
            # Return the bytes content
            pdf_buffer.seek(0)
            return pdf_buffer.getvalue()
            
        except Exception as e:
            print(f"Error generating quotation PDF with WeasyPrint: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback to default template
            try:
                return self._generate_fallback_pdf(quotation)
            except Exception as fallback_error:
                print(f"Error generating fallback PDF: {str(fallback_error)}")
                # Return empty bytes as last resort
                return b''
    
    def _get_base_css(self):
        """Get base CSS for all templates"""
        return """
        @page {
            size: A4;
            margin: 0.5in;
        }
        
        body {
            margin: 0;
            padding: 0;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        """
    
    def _generate_fallback_pdf(self, quotation):
        """Generate a simple fallback PDF if template fails"""
        try:
            fallback_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Quotation</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .header {{ text-align: center; margin-bottom: 30px; }}
                    .company {{ font-size: 18pt; font-weight: bold; }}
                    .title {{ font-size: 16pt; margin: 20px 0; }}
                    table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                    th, td {{ border: 1px solid #000; padding: 8px; text-align: left; }}
                    th {{ background-color: #f0f0f0; }}
                    .total {{ text-align: right; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company">{quotation.company.name}</div>
                    <div class="title">QUOTATION</div>
                    <div>Quotation #: {quotation.quotation_number}</div>
                    <div>Date: {quotation.quotation_date.strftime('%d/%m/%Y')}</div>
                </div>
                
                <div>
                    <strong>To:</strong><br>
                    {quotation.customer.name}<br>
                    {quotation.customer.billing_address_line1 or ''}<br>
                    {quotation.customer.billing_city or ''}, {quotation.customer.billing_state or ''}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for i, item in enumerate(quotation.quotation_items.all(), 1):
                fallback_html += f"""
                        <tr>
                            <td>{i}</td>
                            <td>{item.product_name}</td>
                            <td>{item.quantity} {item.unit}</td>
                            <td>₹{item.unit_price:.2f}</td>
                            <td>₹{item.line_total:.2f}</td>
                        </tr>
                """
            
            fallback_html += f"""
                    </tbody>
                </table>
                
                <div class="total">
                    <div>Subtotal: ₹{quotation.subtotal:.2f}</div>
                    <div>Tax: ₹{quotation.total_tax:.2f}</div>
                    <div><strong>Total: ₹{quotation.total_amount:.2f}</strong></div>
                </div>
            </body>
            </html>
            """
            
            pdf_buffer = io.BytesIO()
            html_doc = weasyprint.HTML(string=fallback_html)
            html_doc.write_pdf(pdf_buffer)
            pdf_buffer.seek(0)
            return pdf_buffer.getvalue()
            
        except Exception as e:
            print(f"Error generating fallback PDF: {str(e)}")
            # Return empty bytes as last resort
            return b''

# Global instance
quotation_pdf_service = QuotationPDFService()