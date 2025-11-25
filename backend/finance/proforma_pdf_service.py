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
                'items': proforma.proforma_items.all().order_by('line_number'),
            }
            
            # Add calculated fields
            context.update({
                'subtotal_before_discount': proforma.subtotal + proforma.discount_amount if proforma.discount_amount > 0 else proforma.subtotal,
                'has_taxes': proforma.total_tax > 0,
                'has_discount': proforma.discount_amount > 0,
                'has_shipping': proforma.shipping_charges > 0,
                'has_other_charges': proforma.other_charges > 0,
            })
            
            return context
            
        except Exception as e:
            logger.error(f"Error preparing context for proforma {proforma.proforma_number}: {str(e)}")
            raise
    
    def _generate_pdf_from_html(self, html_content):
        """Generate PDF from HTML content using WeasyPrint"""
        try:
            # Create HTML object
            html_doc = HTML(string=html_content, base_url=settings.BASE_DIR)
            
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
            logger.error(f"Error generating proforma preview for {proforma.proforma_number}: {str(e)}")
            raise

# Global service instance
proforma_pdf_service = ProformaInvoicePDFService()