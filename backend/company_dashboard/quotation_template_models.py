from django.db import models
from authentication.models import Company

class CompanyQuotationTemplateSettings(models.Model):
    """Quotation and PO template selection for companies"""
    
    TEMPLATE_CHOICES = [
        ('AS', 'AS Template - Clean & Simple'),
        ('BKGE', 'BKGE Template - Professional'),
        ('TC', 'TC Template - Detailed Terms')
    ]
    
    company = models.OneToOneField(
        Company, 
        on_delete=models.CASCADE, 
        related_name='quotation_template_settings'
    )
    
    selected_template = models.CharField(
        max_length=10, 
        choices=TEMPLATE_CHOICES, 
        default='AS',
        help_text="Template style for all quotations"
    )
    
    # PO Template Settings
    selected_po_template = models.CharField(
        max_length=10, 
        choices=TEMPLATE_CHOICES, 
        default='AS',
        help_text="Template style for all purchase orders"
    )
    
    # Proforma Invoice Template Settings
    selected_proforma_template = models.CharField(
        max_length=10, 
        choices=TEMPLATE_CHOICES, 
        default='AS',
        help_text="Template style for all proforma invoices"
    )
    
    # Invoice Template Settings
    selected_invoice_template = models.CharField(
        max_length=10, 
        choices=TEMPLATE_CHOICES, 
        default='AS',
        help_text="Template style for all invoices"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Company Quotation Template Settings'
        verbose_name_plural = 'Company Quotation Template Settings'
    
    def __str__(self):
        return f"{self.company.name} - {self.get_selected_template_display()}"