"""
Proforma Invoice PDF Generation Service
Handles PDF generation for proforma invoices with template selection
"""

import os
from django.template.loader import render_to_string
from django.conf import settings
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import logging
from types import SimpleNamespace

logger = logging.getLogger(__name__)

class ProformaInvoicePDFService:
    """Service for generating proforma invoice PDFs with template selection"""
    
    TEMPLATE_CHOICES = {
        'AS': 'AS Template - Clean & Simple',
        'BKGE': 'BKGE Template - Professional', 
        'TC': 'TC Template - Detailed Terms'
    }
    
    def __init__(self):
        self.font_config = FontConfiguration()
    
    def get_template_path(self, template_code):
        """Get the template path for the given template code"""
        if template_code not in self.TEMPLATE_CHOICES:
            template_code = 'AS'  # Default fallback
        
        return f'proforma_templates/{template_code}/proforma_invoice.html'
    
    def generate_proforma_pdf(self, proforma, template_code='AS'):
        """
        Generate PDF for proforma invoice using selected template
        
        Args:
            proforma: ProformaInvoice instance
            template_code: Template code ('AS', 'BKGE', 'TC')
            
        Returns:
            bytes: PDF content as bytes
        """
        try:
            # Get template path
            template_path = self.get_template_path(template_code)
            
            # Prepare context data
            context = self._prepare_context(proforma)
            
            # Render HTML template
            html_content = render_to_string(template_path, context)
            
            # Generate PDF
            pdf_bytes = self._generate_pdf_from_html(html_content)
            
            logger.info(f"Successfully generated proforma PDF for {proforma.proforma_number} using {template_code} template")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Error generating proforma PDF for {proforma.proforma_number}: {str(e)}")
            raise
    
    def _prepare_context(self, proforma):
        """Prepare context data for template rendering"""
        try:
            # Get company information
            company = proforma.company
            
            # Prepare context
            context = {
                'proforma': proforma,
                'company': company,
                'customer': proforma.customer,
                'items': self._get_items(proforma),
                'company_gstin': getattr(proforma, 'company_gstin', None) or getattr(company, 'gst_number', ''),
                'logo_path': self._get_logo_path(company),
                'logo_url': self._get_logo_url(company),
            }
            
            # Add calculated fields
            shipping_address_obj = self._resolve_effective_shipping_address(proforma)
            if shipping_address_obj is not None:
                # Ensure templates that reference proforma.shipping_address still work
                # Handle both Django model instances and SimpleNamespace mock objects
                if hasattr(proforma, '_state'):
                    proforma._state.fields_cache['shipping_address'] = shipping_address_obj
                else:
                    # For mock objects (SimpleNamespace), set as attribute
                    proforma.shipping_address = shipping_address_obj

            shipping_label = 'Same as Billing Address'
            shipping_address_text = getattr(proforma.customer, 'full_billing_address', 'Billing Address')
            if shipping_address_obj is not None:
                shipping_label = getattr(shipping_address_obj, 'label', 'Shipping Address')
                shipping_address_text = getattr(shipping_address_obj, 'full_address', shipping_address_text)

            context.update({
                'subtotal_before_discount': proforma.subtotal + proforma.discount_amount if proforma.discount_amount > 0 else proforma.subtotal,
                'has_taxes': proforma.total_tax > 0,
                'has_discount': proforma.discount_amount > 0,
                'has_shipping': proforma.shipping_charges > 0,
                'has_other_charges': proforma.other_charges > 0,
                'has_specific_shipping': shipping_address_obj is not None,
                'shipping_info': {
                    'label': shipping_label,
                    'address': shipping_address_text
                }
            })
            
            return context
        except Exception as e:
            logger.error(f"Error preparing context for proforma {getattr(proforma, 'proforma_number', 'unknown')}: {str(e)}")
            raise

    def _resolve_effective_shipping_address(self, proforma):
        """Resolve the shipping address used for rendering proforma PDFs."""
        # Priority 1: Proforma-specific shipping address
        if getattr(proforma, 'shipping_address', None):
            return proforma.shipping_address

        # Priority 2: Purchase order shipping address
        if hasattr(proforma, 'purchase_order') and proforma.purchase_order and getattr(proforma.purchase_order, 'shipping_address', None):
            return proforma.purchase_order.shipping_address

        # Priority 3: Quotation shipping address
        if hasattr(proforma, 'quotation') and proforma.quotation and getattr(proforma.quotation, 'shipping_address', None):
            return proforma.quotation.shipping_address

        # Priority 4: Customer default shipping address
        if proforma.customer:
            default_shipping = getattr(proforma.customer, 'shipping_addresses', None)
            if default_shipping is not None:
                default_shipping = proforma.customer.shipping_addresses.filter(is_default=True).first()
                if default_shipping:
                    return default_shipping

            if getattr(proforma.customer, 'shipping_same_as_billing', False) is False:
                if getattr(proforma.customer, 'full_shipping_address', None):
                    return SimpleNamespace(
                        label='Customer Shipping Address',
                        full_address=proforma.customer.full_shipping_address,
                        address_line1=proforma.customer.shipping_address_line1,
                        address_line2=proforma.customer.shipping_address_line2,
                        city=proforma.customer.shipping_city,
                        state=proforma.customer.shipping_state,
                        pincode=proforma.customer.shipping_pincode,
                        country=proforma.customer.shipping_country or proforma.customer.billing_country
                    )

        return None

    def _get_logo_path(self, company):
        from finance.logo_utils import get_logo_file_path
        return get_logo_file_path(company)

    def _get_logo_url(self, company):
        from finance.logo_utils import get_absolute_logo_url
        return get_absolute_logo_url(company)

    def _get_items(self, proforma):
        """Get items with proper ordering, handling both real and mock objects"""
        try:
            items = proforma.proforma_items.all()
            # Check if it's a queryset (real object) or list (mock)
            if hasattr(items, 'order_by'):
                return items.order_by('line_number')
            else:
                # For mock objects, sort by line_number if available
                return sorted(items, key=lambda x: getattr(x, 'line_number', 0))
        except AttributeError:
            # Fallback for mock objects
            return getattr(proforma, 'proforma_items', SimpleNamespace(all=lambda: []))().all()
    
    def _generate_pdf_from_html(self, html_content):
        """Generate PDF from HTML content using WeasyPrint"""
        try:
            # Create HTML object
            html_doc = HTML(string=html_content, base_url='https://sap.athenas.co.in')
            
            # Generate PDF
            pdf_bytes = html_doc.write_pdf(font_config=self.font_config)
            
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Error generating PDF from HTML: {str(e)}")
            raise
    
    def get_available_templates(self):
        """Get list of available templates"""
        return [
            {'code': code, 'name': name} 
            for code, name in self.TEMPLATE_CHOICES.items()
        ]
    
    def preview_proforma_template(self, proforma, template_code='AS'):
        """
        Generate HTML preview of proforma invoice template
        
        Args:
            proforma: ProformaInvoice instance
            template_code: Template code ('AS', 'BKGE', 'TC')
            
        Returns:
            str: HTML content for preview
        """
        try:
            # Get template path
            template_path = self.get_template_path(template_code)
            
            # Prepare context data
            context = self._prepare_context(proforma)
            
            # Render HTML template
            html_content = render_to_string(template_path, context)
            
            logger.info(f"Successfully generated proforma preview for {proforma.proforma_number} using {template_code} template")
            return html_content
            
        except Exception as e:
            logger.error(f"Error generating proforma preview for {getattr(proforma, 'proforma_number', 'unknown')}: {str(e)}")
            return f"<html><body><h1>Proforma template preview error</h1><p>{str(e)}</p></body></html>"

# Global service instance
proforma_pdf_service = ProformaInvoicePDFService()
