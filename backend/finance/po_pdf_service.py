"""
WeasyPrint PDF Generation Service for Purchase Orders
Generates PDFs using selectable templates (AS/BKGE/TC)
"""

import io
from django.template.loader import render_to_string
from django.conf import settings
import weasyprint
from pathlib import Path
from types import SimpleNamespace

class POPDFService:
    """Service for generating purchase order PDFs with selectable templates"""
    
    TEMPLATE_MAPPING = {
        'AS': 'po_templates/AS/purchase_order.html',
        'BKGE': 'po_templates/BKGE/purchase_order.html', 
        'TC': 'po_templates/TC/purchase_order.html'
    }
    
    def __init__(self):
        self._base_template_path = None
    
    @property
    def base_template_path(self):
        """Lazy loading of base template path to avoid settings access at import time"""
        if self._base_template_path is None:
            self._base_template_path = Path(settings.BASE_DIR) / 'finance' / 'templates'
        return self._base_template_path
    
    def get_company_po_template(self, company):
        """Get the selected PO template for a company"""
        try:
            # Import here to avoid circular imports
            from company_dashboard.quotation_template_models import CompanyQuotationTemplateSettings
            
            template_settings = CompanyQuotationTemplateSettings.objects.filter(company=company).first()
            if template_settings and hasattr(template_settings, 'selected_po_template'):
                return template_settings.selected_po_template
        except Exception as e:
            print(f"Error getting company PO template: {str(e)}")
        return 'AS'  # Default template
    
    def generate_po_html(self, purchase_order, template_name=None):
        """Generate HTML content for purchase order using specified template"""
        try:
            # Use provided template or get company's selected template
            if not template_name:
                template_name = self.get_company_po_template(purchase_order.company)
            
            # Get template path
            template_path = self.TEMPLATE_MAPPING.get(template_name, self.TEMPLATE_MAPPING['AS'])
            
            # Prepare context data with complete company information
            context = {
                'purchase_order': purchase_order,
                'company': purchase_order.company,
                'customer': purchase_order.customer,
                'items': self._get_po_items(purchase_order),
                'company_gstin': getattr(purchase_order, 'company_gstin', None) or getattr(purchase_order.company, 'gst_number', ''),
                'logo_path': self._get_logo_path(purchase_order.company),
                'logo_url': self._get_logo_url(purchase_order.company),
            }
            
            # Company model has: name, email, phone, address, gst_number
            # Templates expect: name, email, phone, address_line1, address_line2, city, state, pincode, gst_number
            # Parse address field to extract components
            company = purchase_order.company
            if hasattr(company, 'address') and company.address:
                import re
                address_parts = [part.strip() for part in company.address.split(',') if part.strip()]
                
                # Initialize all fields
                company.address_line1 = ''
                company.address_line2 = ''
                company.city = ''
                company.state = ''
                company.pincode = ''
                
                if len(address_parts) > 0:
                    # Last part might contain state and pincode
                    last_part = address_parts[-1]
                    pincode_match = re.search(r'\b(\d{6})\b', last_part)
                    
                    if pincode_match:
                        company.pincode = pincode_match.group(1)
                        company.state = last_part.replace(company.pincode, '').strip(' -')
                    else:
                        company.state = last_part
                    
                    # Second last part is city
                    if len(address_parts) >= 2:
                        company.city = address_parts[-2]
                    
                    # First part is address_line1
                    if len(address_parts) >= 1:
                        company.address_line1 = address_parts[0]
                    
                    # Middle parts (if any) go to address_line2
                    if len(address_parts) >= 4:
                        company.address_line2 = ', '.join(address_parts[1:-2])
            else:
                # Set defaults if no address
                company.address_line1 = ''
                company.address_line2 = ''
                company.city = ''
                company.state = ''
                company.pincode = ''
            
            # Render HTML template
            html_content = render_to_string(template_path, context)
            return html_content
            
        except Exception as e:
            print(f"Error generating PO HTML: {str(e)}")
            return f"<html><body><h1>Error generating preview</h1><p>{str(e)}</p></body></html>"
    
    def _get_logo_path(self, company):
        from finance.logo_utils import get_logo_file_path
        return get_logo_file_path(company)

    def _get_logo_url(self, company):
        from finance.logo_utils import get_absolute_logo_url
        return get_absolute_logo_url(company)

    def _get_po_items(self, purchase_order):
        """Get PO items, handling both real and mock objects"""
        try:
            items = purchase_order.po_items.all()
            # Check if it's a queryset (real object) or list (mock)
            if hasattr(items, 'order_by'):
                return items
            else:
                # For mock objects, return as is
                return items
        except AttributeError:
            # Fallback for mock objects
            return getattr(purchase_order, 'po_items', SimpleNamespace(all=lambda: []))().all()
    
    def generate_po_pdf(self, purchase_order):
        """Generate PDF for purchase order using company's selected template"""
        try:
            # Get HTML content
            html_content = self.generate_po_html(purchase_order)
            
            # Generate PDF using WeasyPrint
            pdf_buffer = io.BytesIO()
            
            # WeasyPrint configuration - CSS is embedded in HTML
            html_doc = weasyprint.HTML(string=html_content, base_url='https://sap.athenas.co.in')
            
            # Generate PDF without external CSS (styles are in HTML)
            html_doc.write_pdf(pdf_buffer)
            
            # Return the bytes content
            pdf_buffer.seek(0)
            return pdf_buffer.getvalue()
            
        except Exception as e:
            print(f"Error generating PO PDF with WeasyPrint: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback to default template
            try:
                return self._generate_fallback_pdf(purchase_order)
            except Exception as fallback_error:
                print(f"Error generating fallback PDF: {str(fallback_error)}")
                # Return empty bytes as last resort
                return b''
    
    def _generate_fallback_pdf(self, purchase_order):
        """Generate a simple fallback PDF if template fails"""
        try:
            fallback_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Purchase Order</title>
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
                    <div class="company">{purchase_order.company.name}</div>
                    <div class="title">PURCHASE ORDER</div>
                    <div>PO #: {purchase_order.internal_po_number}</div>
                    <div>Date: {purchase_order.po_date.strftime('%d/%m/%Y')}</div>
                </div>
                
                <div>
                    <strong>To:</strong><br>
                    {purchase_order.customer.name}<br>
                    {purchase_order.customer.billing_address_line1 or ''}<br>
                    {purchase_order.customer.billing_city or ''}, {purchase_order.customer.billing_state or ''}
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
            
            for i, item in enumerate(purchase_order.po_items.all(), 1):
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
                    <div>Subtotal: ₹{purchase_order.subtotal:.2f}</div>
                    <div>Tax: ₹{purchase_order.total_tax:.2f}</div>
                    <div><strong>Total: ₹{purchase_order.total_amount:.2f}</strong></div>
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
po_pdf_service = POPDFService()