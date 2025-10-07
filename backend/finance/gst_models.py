# GST Compliance Models for Indian Finance System
from django.db import models
from django.core.validators import RegexValidator
from authentication.models import Company, CompanyServiceUser
from decimal import Decimal


class GSTRateMaster(models.Model):
    """Master table for GST rates with HSN/SAC codes"""
    
    RATE_TYPE_CHOICES = [
        ('hsn', 'HSN Code (Goods)'),
        ('sac', 'SAC Code (Services)'),
    ]
    
    code = models.CharField(max_length=20, unique=True, db_index=True)
    rate_type = models.CharField(max_length=10, choices=RATE_TYPE_CHOICES)
    description = models.TextField()
    current_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'finance_gst_rate_master'
        ordering = ['code']
        indexes = [
            models.Index(fields=['code', 'effective_from']),
            models.Index(fields=['rate_type', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.current_rate}%"


class StateCodeMaster(models.Model):
    """Indian state codes for GST calculation"""
    
    state_name = models.CharField(max_length=100, unique=True)
    state_code = models.CharField(max_length=2, unique=True, validators=[
        RegexValidator(regex=r'^[0-9]{2}$', message='State code must be 2 digits')
    ])
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'finance_state_codes'
        ordering = ['state_name']
    
    def __str__(self):
        return f"{self.state_code} - {self.state_name}"


class GSTTransaction(models.Model):
    """GST transaction tracking for compliance"""
    
    TRANSACTION_TYPE_CHOICES = [
        ('sale', 'Sale'),
        ('purchase', 'Purchase'),
        ('credit_note', 'Credit Note'),
        ('debit_note', 'Debit Note'),
    ]
    
    GST_TYPE_CHOICES = [
        ('igst', 'IGST (Inter-State)'),
        ('cgst_sgst', 'CGST + SGST (Intra-State)'),
        ('exempt', 'GST Exempt'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    document_number = models.CharField(max_length=100)
    document_date = models.DateField()
    
    # Customer/Supplier details
    party_name = models.CharField(max_length=255)
    party_gstin = models.CharField(max_length=15, blank=True)
    party_state_code = models.CharField(max_length=2)
    
    # GST calculation
    gst_type = models.CharField(max_length=20, choices=GST_TYPE_CHOICES)
    taxable_amount = models.DecimalField(max_digits=15, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_tax = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Compliance tracking
    is_filed_in_gstr1 = models.BooleanField(default=False)
    gstr1_filing_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'finance_gst_transactions'
        ordering = ['-document_date']
        indexes = [
            models.Index(fields=['company', 'document_date']),
            models.Index(fields=['party_gstin', 'document_date']),
        ]


class GSTReturn(models.Model):
    """GST return filing tracking"""
    
    RETURN_TYPE_CHOICES = [
        ('gstr1', 'GSTR-1 (Outward Supplies)'),
        ('gstr3b', 'GSTR-3B (Summary Return)'),
        ('gstr2a', 'GSTR-2A (Auto-populated)'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generated', 'Generated'),
        ('filed', 'Filed'),
        ('accepted', 'Accepted by Portal'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    return_type = models.CharField(max_length=10, choices=RETURN_TYPE_CHOICES)
    return_period = models.CharField(max_length=7)  # Format: MM-YYYY
    filing_date = models.DateField(null=True, blank=True)
    
    # Return summary
    total_taxable_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_transactions = models.PositiveIntegerField(default=0)
    
    # Filing details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    acknowledgment_number = models.CharField(max_length=50, blank=True)
    
    # File attachments
    return_file = models.FileField(upload_to='gst_returns/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'finance_gst_returns'
        unique_together = ['company', 'return_type', 'return_period']
        ordering = ['-return_period']


class InputTaxCredit(models.Model):
    """Input Tax Credit tracking"""
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    supplier_gstin = models.CharField(max_length=15)
    supplier_name = models.CharField(max_length=255)
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    
    # ITC details
    taxable_amount = models.DecimalField(max_digits=15, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # ITC status
    is_itc_claimed = models.BooleanField(default=False)
    itc_claim_date = models.DateField(null=True, blank=True)
    is_itc_reversed = models.BooleanField(default=False)
    reversal_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'finance_input_tax_credit'
        ordering = ['-invoice_date']