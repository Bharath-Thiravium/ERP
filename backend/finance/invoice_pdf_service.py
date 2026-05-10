"""
Invoice PDF Generation Service
Handles PDF generation for invoices with template selection
"""

import os
from django.template.loader import render_to_string
from django.conf import settings
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import logging

logger = logging.getLogger(__name__)

class InvoicePDFService:
    """Service for generating invoice PDFs with template selection"""
    
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
        
        return f'invoice_templates/{template_code}/invoice.html'
    
    def generate_invoice_pdf(self, invoice, template_code='AS'):
        """
        Generate PDF for invoice using selected template
        
        Args:
            invoice: Invoice instance
            template_code: Template code ('AS', 'BKGE', 'TC')
            
        Returns:
            bytes: PDF content as bytes
        """
        try:
            # Log template selection for debugging
            logger.info(f"Generating invoice PDF for {invoice.invoice_number} (Company: {invoice.company.name}) with template: {template_code}")
            
            # Get template path
            template_path = self.get_template_path(template_code)
            logger.info(f"Using template path: {template_path}")
            
            # Prepare context data
            context = self._prepare_context(invoice)
            
            # Render HTML template
            html_content = render_to_string(template_path, context)
            
            # Generate PDF
            pdf_bytes = self._generate_pdf_from_html(html_content)
            
            logger.info(f"Successfully generated invoice PDF for {invoice.invoice_number} using {template_code} template")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Error generating invoice PDF for {invoice.invoice_number}: {str(e)}")
            raise
    
    def generate_invoice_html(self, invoice, template_code='AS'):
        """
        Generate HTML for invoice using selected template (for preview)
        
        Args:
            invoice: Invoice instance
            template_code: Template code ('AS', 'BKGE', 'TC')
            
        Returns:
            str: HTML content
        """
        try:
            # Get template path
            template_path = self.get_template_path(template_code)
            
            # Prepare context data
            context = self._prepare_context(invoice)
            
            # Render HTML template
            html_content = render_to_string(template_path, context)
            
            logger.info(f"Successfully generated invoice HTML for {invoice.invoice_number} using {template_code} template")
            return html_content
            
        except Exception as e:
            logger.error(f"Error generating invoice HTML for {getattr(invoice, 'invoice_number', 'unknown')}: {str(e)}")
            return f"<html><body><h1>Invoice template preview error</h1><p>{str(e)}</p></body></html>"
    
    def _prepare_context(self, invoice):
        """Prepare context data for template rendering"""
        try:
            from .invoice_service import invoice_pdf_service
            context = invoice_pdf_service.prepare_invoice_context(invoice)
            return context
        except Exception as e:
            logger.error(f"Error preparing context for invoice {getattr(invoice, 'invoice_number', '?')}: {str(e)}")
            # Fallback — still include reference_details so templates render correctly
            try:
                from .invoice_service import invoice_pdf_service
                ref_details = invoice_pdf_service._get_reference_details(invoice)
            except Exception:
                ref_details = {'manual_reference': getattr(invoice, 'reference', ''), 'quotation': None, 'purchase_order': None, 'previous_invoices': []}
            return {
                'invoice': invoice,
                'company': invoice.company,
                'customer': invoice.customer,
                'items': invoice.invoice_items.all().order_by('line_number'),
                'reference_details': ref_details,
                'company_gstin': getattr(invoice, 'company_gstin', None) or getattr(invoice.company, 'gst_number', ''),
                'logo_path': self._get_logo_path(invoice.company),
                'logo_url': self._get_logo_url(invoice.company),
            }
    
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
    
    def preview_invoice_template(self, invoice, template_code='AS'):
        """
        Generate HTML preview of invoice template
        
        Args:
            invoice: Invoice instance
            template_code: Template code ('AS', 'BKGE', 'TC')
            
        Returns:
            str: HTML content for preview
        """
        try:
            # Get template path
            template_path = self.get_template_path(template_code)
            
            # Prepare context data
            context = self._prepare_context(invoice)
            
            # Render HTML template
            html_content = render_to_string(template_path, context)
            
            logger.info(f"Successfully generated invoice preview for {invoice.invoice_number} using {template_code} template")
            return html_content
            
        except Exception as e:
            logger.error(f"Error generating invoice preview for {invoice.invoice_number}: {str(e)}")
            raise

# Global service instance
invoice_pdf_service = InvoicePDFService()