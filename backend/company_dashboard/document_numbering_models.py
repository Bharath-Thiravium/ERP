from django.db import models
from django.core.exceptions import ValidationError
from authentication.models import Company, Service
from decimal import Decimal


class DocumentNumberingConfig(models.Model):
    """Document numbering configuration for each service-company combination"""
    
    DOCUMENT_TYPE_CHOICES = [
        # Finance Service
        ('quotation', 'Quotation'),
        ('purchase_order', 'Purchase Order'),
        ('invoice', 'Invoice'),
        ('proforma_invoice', 'Proforma Invoice'),
        ('payment', 'Payment'),
        ('customer', 'Customer'),
        ('vendor', 'Vendor'),
        ('product', 'Product'),
        ('purchase_request', 'Purchase Request'),
        ('vendor_invoice', 'Vendor Invoice'),
        
        # HR Service
        ('employee', 'Employee'),
        ('department', 'Department'),
        ('designation', 'Designation'),
        ('attendance', 'Attendance'),
        ('payroll', 'Payroll'),
        ('leave_request', 'Leave Request'),
        ('recruitment', 'Recruitment'),
        ('performance_review', 'Performance Review'),
        ('training', 'Training'),
        ('expense_claim', 'Expense Claim'),
        
        # Inventory Service
        ('supplier', 'Supplier'),
        ('warehouse', 'Warehouse'),
        ('category', 'Category'),
        ('stock_entry', 'Stock Entry'),
        ('stock_transfer', 'Stock Transfer'),
        ('stock_adjustment', 'Stock Adjustment'),
        ('purchase_receipt', 'Purchase Receipt'),
        ('delivery_note', 'Delivery Note'),
        ('material_request', 'Material Request'),
        ('quality_inspection', 'Quality Inspection'),
        
        # CRM Service
        ('lead', 'Lead'),
        ('contact', 'Contact'),
        ('account', 'Account'),
        ('opportunity', 'Opportunity'),
        ('campaign', 'Campaign'),
        ('activity', 'Activity'),
        ('support_ticket', 'Support Ticket'),
        ('follow_up', 'Follow Up'),
        ('meeting', 'Meeting'),
        ('call_log', 'Call Log'),
        
        # General/System
        ('audit', 'Audit'),
        ('asset', 'Asset'),
        ('project', 'Project'),
        ('task', 'Task'),
        ('document', 'Document'),
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
    
    # Enhanced Pattern Configuration
    custom_pattern = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Custom pattern: {PREFIX}-{YEAR}-{NUMBER} or {COMPANY}-{PREFIX}-{YEAR}-{NUMBER}"
    )
    
    include_company_prefix = models.BooleanField(
        default=False,
        help_text="Include company prefix in number"
    )
    
    year_format = models.CharField(
        max_length=10,
        choices=[
            ('YY', '2-digit year (25)'),
            ('YYYY', '4-digit year (2025)'),
            ('FY', 'Financial year (2024-25)'),
            ('FY_SHORT', 'Short FY (24-25)'),
            ('NONE', 'No year'),
        ],
        default='YY'
    )
    
    separator = models.CharField(
        max_length=5,
        default='-',
        help_text="Separator between parts"
    )
    
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
        """Generate next document number atomically with custom patterns"""
        from django.db import transaction
        
        with transaction.atomic():
            # Lock the row for update to prevent race conditions
            config = DocumentNumberingConfig.objects.select_for_update().get(pk=self.pk)
            config.current_counter += 1
            config.save(update_fields=['current_counter'])
            
            # Generate number based on pattern
            if config.custom_pattern:
                return config._generate_custom_pattern()
            else:
                return config._generate_default_pattern()
    
    def _generate_custom_pattern(self):
        """Generate number using custom pattern"""
        pattern = self.custom_pattern
        
        # Replace placeholders
        replacements = {
            '{PREFIX}': self.prefix,
            '{COMPANY}': self.company.company_prefix if hasattr(self.company, 'company_prefix') else 'COMP',
            '{YEAR}': self._get_year_string(),
            '{FY}': self.financial_year,
            '{NUMBER}': str(self.current_counter).zfill(self.number_padding),
            '{SEP}': self.separator,
        }
        
        for placeholder, value in replacements.items():
            pattern = pattern.replace(placeholder, value)
        
        return pattern
    
    def _generate_default_pattern(self):
        """Generate number using default pattern"""
        parts = []
        
        # Add company prefix if enabled
        if self.include_company_prefix:
            parts.append(self.company.company_prefix if hasattr(self.company, 'company_prefix') else 'COMP')
        
        # Add document prefix
        parts.append(self.prefix)
        
        # Add year if not NONE
        if self.year_format != 'NONE':
            parts.append(self._get_year_string())
        
        # Add padded number
        parts.append(str(self.current_counter).zfill(self.number_padding))
        
        return self.separator.join(parts)
    
    def _get_year_string(self):
        """Get year string based on format"""
        if self.year_format == 'YY':
            return self.financial_year.split('-')[0][-2:]
        elif self.year_format == 'YYYY':
            return self.financial_year.split('-')[0]
        elif self.year_format == 'FY':
            return self.financial_year
        elif self.year_format == 'FY_SHORT':
            years = self.financial_year.split('-')
            return f"{years[0][-2:]}-{years[1]}"
        else:
            return ''
    
    def get_next_number_preview(self):
        """Preview what the next number would be without incrementing"""
        # Create temporary config with next counter
        temp_counter = self.current_counter + 1
        
        if self.custom_pattern:
            pattern = self.custom_pattern
            replacements = {
                '{PREFIX}': self.prefix,
                '{COMPANY}': self.company.company_prefix if hasattr(self.company, 'company_prefix') else 'COMP',
                '{YEAR}': self._get_year_string(),
                '{FY}': self.financial_year,
                '{NUMBER}': str(temp_counter).zfill(self.number_padding),
                '{SEP}': self.separator,
            }
            
            for placeholder, value in replacements.items():
                pattern = pattern.replace(placeholder, value)
            
            return pattern
        else:
            parts = []
            
            if self.include_company_prefix:
                parts.append(self.company.company_prefix if hasattr(self.company, 'company_prefix') else 'COMP')
            
            parts.append(self.prefix)
            
            if self.year_format != 'NONE':
                parts.append(self._get_year_string())
            
            parts.append(str(temp_counter).zfill(self.number_padding))
            
            return self.separator.join(parts)
    
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
        
        # Validate custom pattern
        if self.custom_pattern:
            valid_placeholders = ['{PREFIX}', '{COMPANY}', '{YEAR}', '{NUMBER}', '{SEP}']
            pattern_placeholders = [p for p in valid_placeholders if p in self.custom_pattern]
            if '{NUMBER}' not in pattern_placeholders:
                errors['custom_pattern'] = 'Custom pattern must include {NUMBER} placeholder'
        
        # Validate separator
        if len(self.separator) > 5:
            errors['separator'] = 'Separator cannot be longer than 5 characters'
        
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


class ServiceDocumentTypes(models.Model):
    """Define which document types belong to which service"""
    
    SERVICE_DOCUMENT_MAPPING = {
        'finance': [
            'quotation', 'purchase_order', 'invoice', 'proforma_invoice',
            'payment', 'customer', 'vendor', 'product', 'purchase_request',
            'vendor_invoice'
        ],
        'hr': [
            'employee', 'department', 'designation', 'attendance', 'payroll',
            'leave_request', 'recruitment', 'performance_review', 'training',
            'expense_claim'
        ],
        'inventory': [
            'supplier', 'warehouse', 'category', 'stock_entry', 'stock_transfer',
            'stock_adjustment', 'purchase_receipt', 'delivery_note',
            'material_request', 'quality_inspection'
        ],
        'crm': [
            'lead', 'contact', 'account', 'opportunity', 'campaign',
            'activity', 'support_ticket', 'follow_up', 'meeting', 'call_log'
        ],
        'analytics': [
            'audit', 'project', 'task', 'document'
        ],
        'general': [
            'asset'
        ]
    }
    
    @classmethod
    def get_service_document_types(cls, service_type):
        """Get all document types for a service"""
        return cls.SERVICE_DOCUMENT_MAPPING.get(service_type, [])
    
    @classmethod
    def get_all_services_with_documents(cls):
        """Get all services with their document types"""
        return cls.SERVICE_DOCUMENT_MAPPING
    
    @classmethod
    def get_service_for_document_type(cls, document_type):
        """Get service type for a document type"""
        for service, doc_types in cls.SERVICE_DOCUMENT_MAPPING.items():
            if document_type in doc_types:
                return service
        return 'general'
    
    @classmethod
    def get_default_prefix(cls, document_type):
        """Get default prefix for document type"""
        prefix_mapping = {
            # Finance
            'quotation': 'QT',
            'purchase_order': 'PO',
            'invoice': 'INV',
            'proforma_invoice': 'PI',
            'payment': 'PAY',
            'customer': 'CUST',
            'vendor': 'VEN',
            'product': 'PRD',
            'purchase_request': 'PR',
            'vendor_invoice': 'VI',
            
            # HR
            'employee': 'EMP',
            'department': 'DEPT',
            'designation': 'DESG',
            'attendance': 'ATT',
            'payroll': 'PAY',
            'leave_request': 'LR',
            'recruitment': 'REC',
            'performance_review': 'PR',
            'training': 'TRN',
            'expense_claim': 'EXP',
            
            # Inventory
            'supplier': 'SUP',
            'warehouse': 'WH',
            'category': 'CAT',
            'stock_entry': 'SE',
            'stock_transfer': 'ST',
            'stock_adjustment': 'SA',
            'purchase_receipt': 'PR',
            'delivery_note': 'DN',
            'material_request': 'MR',
            'quality_inspection': 'QI',
            
            # CRM
            'lead': 'LEAD',
            'contact': 'CONT',
            'account': 'ACC',
            'opportunity': 'OPP',
            'campaign': 'CAMP',
            'activity': 'ACT',
            'support_ticket': 'TKT',
            'follow_up': 'FU',
            'meeting': 'MTG',
            'call_log': 'CALL',
            
            # General
            'audit': 'AUD',
            'asset': 'AST',
            'project': 'PROJ',
            'task': 'TASK',
            'document': 'DOC',
        }
        
        return prefix_mapping.get(document_type, document_type.upper()[:3])
    
    class Meta:
        managed = False  # This is a utility model, no database table needed