from django.db import models
from django.core.validators import RegexValidator
from authentication.models import Company, CompanyServiceUser
from .models import Customer, Product, Invoice, Payment

class Branch(models.Model):
    """Branch/Location model for multi-location GST handling"""
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='branches')
    branch_code = models.CharField(max_length=20, unique=True)
    branch_name = models.CharField(max_length=200)
    
    # Address Information
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    state_code = models.CharField(max_length=2, help_text="2-digit state code")
    pincode = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default='India')
    
    # GST Information
    gstin = models.CharField(
        max_length=15,
        validators=[RegexValidator(
            regex=r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
            message='Enter a valid GSTIN number'
        )],
        help_text="15-digit GST Identification Number for this branch"
    )
    
    # Contact Information
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_head_office = models.BooleanField(default=False)
    
    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'branch_code']
        ordering = ['-is_head_office', 'branch_name']
    
    def __str__(self):
        return f"{self.branch_code} - {self.branch_name}"

class TDSSection(models.Model):
    """TDS Section master for multiple deductee scenarios"""
    
    section_code = models.CharField(max_length=10, unique=True, help_text="e.g., 194A, 194C, 194J")
    section_name = models.CharField(max_length=200)
    description = models.TextField()
    
    # TDS Rates for different scenarios
    individual_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    company_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    non_resident_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Threshold limits
    threshold_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    exemption_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Applicability
    applicable_to_individuals = models.BooleanField(default=True)
    applicable_to_companies = models.BooleanField(default=True)
    applicable_to_non_residents = models.BooleanField(default=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['section_code']
    
    def __str__(self):
        return f"{self.section_code} - {self.section_name}"
    
    def get_applicable_rate(self, deductee_type='company'):
        """Get applicable TDS rate based on deductee type"""
        if deductee_type == 'individual':
            return self.individual_rate
        elif deductee_type == 'non_resident':
            return self.non_resident_rate
        else:
            return self.company_rate

class ReverseChargeTransaction(models.Model):
    """Reverse Charge mechanism for specific transactions"""
    
    TRANSACTION_TYPES = [
        ('import_services', 'Import of Services'),
        ('gta_services', 'Goods Transport Agency Services'),
        ('legal_services', 'Legal Services'),
        ('manpower_services', 'Manpower Supply Services'),
        ('security_services', 'Security Services'),
        ('other', 'Other Specified Services'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True)
    
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    supplier_name = models.CharField(max_length=255)
    supplier_gstin = models.CharField(max_length=15, blank=True)
    
    # Transaction Details
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    taxable_value = models.DecimalField(max_digits=15, decimal_places=2)
    
    # GST Calculation
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    total_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Compliance
    is_filed_in_gstr2 = models.BooleanField(default=False)
    gstr2_filing_date = models.DateField(null=True, blank=True)
    
    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-invoice_date']
    
    def save(self, *args, **kwargs):
        # Auto-calculate tax amounts
        if self.cgst_rate > 0 and self.sgst_rate > 0:
            self.cgst_amount = (self.taxable_value * self.cgst_rate) / 100
            self.sgst_amount = (self.taxable_value * self.sgst_rate) / 100
            self.igst_amount = 0
        elif self.igst_rate > 0:
            self.igst_amount = (self.taxable_value * self.igst_rate) / 100
            self.cgst_amount = 0
            self.sgst_amount = 0
        
        self.total_tax = self.cgst_amount + self.sgst_amount + self.igst_amount
        self.total_amount = self.taxable_value + self.total_tax
        
        super().save(*args, **kwargs)

class ImportExportTransaction(models.Model):
    """Import/Export transactions for international compliance"""
    
    TRANSACTION_TYPES = [
        ('import', 'Import'),
        ('export', 'Export'),
    ]
    
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('JPY', 'Japanese Yen'),
        ('AUD', 'Australian Dollar'),
        ('CAD', 'Canadian Dollar'),
        ('SGD', 'Singapore Dollar'),
        ('INR', 'Indian Rupee'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    
    # Counterparty Details
    counterparty_name = models.CharField(max_length=255)
    counterparty_country = models.CharField(max_length=100)
    counterparty_address = models.TextField()
    counterparty_tax_id = models.CharField(max_length=50, blank=True)
    
    # Transaction Details
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    
    # Financial Details
    foreign_currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    foreign_amount = models.DecimalField(max_digits=15, decimal_places=2)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4)
    inr_amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Customs and Shipping
    bill_of_entry_number = models.CharField(max_length=50, blank=True)
    bill_of_entry_date = models.DateField(null=True, blank=True)
    port_code = models.CharField(max_length=10, blank=True)
    shipping_bill_number = models.CharField(max_length=50, blank=True)
    
    # GST Details (for imports)
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    customs_duty = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Compliance
    is_filed_in_gstr1 = models.BooleanField(default=False)
    is_filed_in_gstr2 = models.BooleanField(default=False)
    
    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-invoice_date']
    
    def save(self, *args, **kwargs):
        # Auto-calculate INR amount
        self.inr_amount = self.foreign_amount * self.exchange_rate
        
        # Calculate IGST for imports
        if self.transaction_type == 'import' and self.igst_rate > 0:
            self.igst_amount = (self.inr_amount * self.igst_rate) / 100
        
        super().save(*args, **kwargs)

class InterStateTransaction(models.Model):
    """Inter-state transaction tracking for GST compliance"""
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    source_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='outgoing_transactions')
    destination_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='incoming_transactions', null=True, blank=True)
    
    # Customer/Supplier Details
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    supplier_name = models.CharField(max_length=255, blank=True)
    supplier_gstin = models.CharField(max_length=15, blank=True)
    
    # Transaction Details
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, null=True, blank=True)
    transaction_date = models.DateField()
    
    # GST Calculation
    taxable_value = models.DecimalField(max_digits=15, decimal_places=2)
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # E-way Bill Details
    eway_bill_number = models.CharField(max_length=20, blank=True)
    eway_bill_date = models.DateField(null=True, blank=True)
    vehicle_number = models.CharField(max_length=20, blank=True)
    
    # Compliance Status
    is_filed_in_gstr1 = models.BooleanField(default=False)
    gstr1_filing_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-transaction_date']
    
    def save(self, *args, **kwargs):
        # Auto-calculate IGST amount
        self.igst_amount = (self.taxable_value * self.igst_rate) / 100
        super().save(*args, **kwargs)

class AdvancedTDSDeductee(models.Model):
    """Advanced TDS deductee management for multiple scenarios"""
    
    DEDUCTEE_TYPES = [
        ('individual', 'Individual'),
        ('company', 'Company'),
        ('partnership', 'Partnership Firm'),
        ('trust', 'Trust'),
        ('non_resident', 'Non-Resident'),
        ('government', 'Government'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    
    # Deductee Details
    deductee_name = models.CharField(max_length=255)
    deductee_type = models.CharField(max_length=20, choices=DEDUCTEE_TYPES)
    pan_number = models.CharField(max_length=10)
    
    # Address
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    
    # TDS Configuration
    default_tds_section = models.ForeignKey(TDSSection, on_delete=models.SET_NULL, null=True)
    is_lower_deduction_certificate = models.BooleanField(default=False)
    lower_deduction_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    certificate_number = models.CharField(max_length=50, blank=True)
    certificate_valid_from = models.DateField(null=True, blank=True)
    certificate_valid_to = models.DateField(null=True, blank=True)
    
    # Threshold Management
    annual_threshold = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    current_year_payments = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'pan_number']
        ordering = ['deductee_name']
    
    def get_applicable_tds_rate(self):
        """Get applicable TDS rate considering lower deduction certificate"""
        if self.is_lower_deduction_certificate and self.certificate_valid_from and self.certificate_valid_to:
            from datetime import date
            today = date.today()
            if self.certificate_valid_from <= today <= self.certificate_valid_to:
                return self.lower_deduction_rate
        
        if self.default_tds_section:
            return self.default_tds_section.get_applicable_rate(self.deductee_type)
        
        return 0.00
    
    def is_threshold_exceeded(self, additional_amount=0):
        """Check if threshold is exceeded with additional amount"""
        total_amount = self.current_year_payments + additional_amount
        return total_amount > self.annual_threshold