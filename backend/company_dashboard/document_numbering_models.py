from django.db import models
from django.core.exceptions import ValidationError
from authentication.models import Company, Service
from decimal import Decimal


class DocumentNumberingConfig(models.Model):
    """Document numbering configuration for each service-company combination"""
    
    DOCUMENT_TYPE_CHOICES = [
        ('quotation', 'Quotation'),
        ('purchase_order', 'Purchase Order'),
        ('invoice', 'Invoice'),
        ('proforma_invoice', 'Proforma Invoice'),
        ('payment', 'Payment'),
        ('customer', 'Customer'),
        ('vendor', 'Vendor'),
        ('product', 'Product'),
    ]
    
    # Multi-tenant hierarchy
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='numbering_configs')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='numbering_configs')
    
    # Document configuration
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    financial_year = models.CharField(max_length=10, help_text="Format: 2024-25")
    
    # Numbering settings
    prefix = models.CharField(max_length=20, help_text="Prefix without year (e.g., QT, PO, INV)")
    starting_number = models.IntegerField(default=1)
    current_counter = models.IntegerField(default=0)
    number_padding = models.IntegerField(default=3, help_text="Number of digits for padding (e.g., 3 for 001)")
    
    # Configuration options
    is_active = models.BooleanField(default=True)
    allow_manual_override = models.BooleanField(default=False)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['service', 'company', 'document_type', 'financial_year']
        verbose_name = 'Document Numbering Configuration'
        verbose_name_plural = 'Document Numbering Configurations'
        ordering = ['-financial_year', 'document_type']
    
    def __str__(self):
        return f"{self.company.name} - {self.service.name} - {self.get_document_type_display()} ({self.financial_year})"
    
    def get_next_number(self):
        """Generate next document number atomically"""
        from django.db import transaction
        
        with transaction.atomic():
            # Lock the row for update to prevent race conditions
            config = DocumentNumberingConfig.objects.select_for_update().get(pk=self.pk)
            config.current_counter += 1
            config.save(update_fields=['current_counter'])
            
            # Generate formatted number
            year_short = config.financial_year.split('-')[0][-2:]  # Get last 2 digits of first year
            padded_number = str(config.current_counter).zfill(config.number_padding)
            
            return f"{config.prefix}-{year_short}-{padded_number}"
    
    def get_next_number_preview(self):
        """Preview what the next number would be without incrementing"""
        year_short = self.financial_year.split('-')[0][-2:]
        next_counter = self.current_counter + 1
        padded_number = str(next_counter).zfill(self.number_padding)
        
        return f"{self.prefix}-{year_short}-{padded_number}"
    
    def reset_counter_for_new_year(self):
        """Reset counter for new financial year"""
        self.current_counter = 0
        self.save(update_fields=['current_counter'])
    
    def clean(self):
        """Validate configuration"""
        errors = {}
        
        # Validate financial year format
        if self.financial_year:
            try:
                years = self.financial_year.split('-')
                if len(years) != 2:
                    raise ValueError
                start_year = int(years[0])
                end_year = int(years[1])
                if end_year != start_year + 1:
                    raise ValueError
            except (ValueError, IndexError):
                errors['financial_year'] = 'Financial year must be in format YYYY-YY (e.g., 2024-25)'
        
        # Validate prefix
        if self.prefix and not self.prefix.replace('-', '').replace('_', '').isalnum():
            errors['prefix'] = 'Prefix can only contain letters, numbers, hyphens, and underscores'
        
        # Validate starting number
        if self.starting_number < 1:
            errors['starting_number'] = 'Starting number must be at least 1'
        
        # Validate number padding
        if self.number_padding < 1 or self.number_padding > 10:
            errors['number_padding'] = 'Number padding must be between 1 and 10'
        
        if errors:
            raise ValidationError(errors)


class DocumentNumberingHistory(models.Model):
    """Track document numbering changes and manual overrides"""
    
    config = models.ForeignKey(DocumentNumberingConfig, on_delete=models.CASCADE, related_name='history')
    document_number = models.CharField(max_length=100)
    
    # Override information
    is_manual_override = models.BooleanField(default=False)
    override_reason = models.TextField(blank=True)
    
    # Audit information
    created_by = models.ForeignKey('authentication.CompanyServiceUser', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Document Numbering History'
        verbose_name_plural = 'Document Numbering Histories'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.document_number} - {self.config.document_type}"


class FinancialYearSettings(models.Model):
    """Financial year settings for companies"""
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='financial_year_settings')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='financial_year_settings')
    
    # Financial year information
    financial_year = models.CharField(max_length=10, help_text="Format: 2024-25")
    start_date = models.DateField(help_text="Financial year start date (usually April 1)")
    end_date = models.DateField(help_text="Financial year end date (usually March 31)")
    
    # Status
    is_active = models.BooleanField(default=False)
    is_current = models.BooleanField(default=False)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'service', 'financial_year']
        verbose_name = 'Financial Year Settings'
        verbose_name_plural = 'Financial Year Settings'
        ordering = ['-financial_year']
    
    def __str__(self):
        return f"{self.company.name} - {self.service.name} - {self.financial_year}"
    
    def save(self, *args, **kwargs):
        # Ensure only one current financial year per company-service
        if self.is_current:
            FinancialYearSettings.objects.filter(
                company=self.company,
                service=self.service,
                is_current=True
            ).exclude(pk=self.pk).update(is_current=False)
        
        super().save(*args, **kwargs)