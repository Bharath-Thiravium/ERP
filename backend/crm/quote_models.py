"""
Quote generation system for CRM
"""
from django.db import models
from django.utils import timezone
from decimal import Decimal
from authentication.models import Company, CompanyServiceUser
from .models import Account, Contact, Opportunity
import uuid

class QuoteTemplate(models.Model):
    """Quote template for customization"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='quote_templates')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Template content
    header_content = models.TextField(blank=True)
    footer_content = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    
    # Styling
    primary_color = models.CharField(max_length=7, default='#3B82F6')
    secondary_color = models.CharField(max_length=7, default='#6B7280')
    logo_url = models.URLField(blank=True)
    
    # Settings
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"

class Quote(models.Model):
    """Quote model"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('converted', 'Converted to Order'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='quotes')
    quote_number = models.CharField(max_length=50, unique=True)
    
    # Relationships
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='quotes')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotes')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotes')
    template = models.ForeignKey(QuoteTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Quote details
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Dates
    quote_date = models.DateField(default=timezone.now)
    valid_until = models.DateField()
    sent_date = models.DateTimeField(null=True, blank=True)
    viewed_date = models.DateTimeField(null=True, blank=True)
    accepted_date = models.DateTimeField(null=True, blank=True)
    
    # Financial
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Additional fields
    notes = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    
    # Tracking
    view_count = models.IntegerField(default=0)
    public_id = models.UUIDField(default=uuid.uuid4, unique=True)  # For public viewing
    
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['company', 'quote_number']
    
    def __str__(self):
        return f"{self.quote_number} - {self.account.name}"
    
    def save(self, *args, **kwargs):
        if not self.quote_number:
            # Auto-generate quote number
            try:
                from authentication.utils import generate_auto_code
                self.quote_number = generate_auto_code(self.company.id, 'quote')
            except Exception:
                # Fallback
                last_quote = Quote.objects.filter(
                    company=self.company,
                    quote_number__startswith='QUO-'
                ).order_by('-id').first()
                if last_quote:
                    last_number = int(last_quote.quote_number.split('-')[-1])
                    self.quote_number = f"QUO-{last_number + 1:06d}"
                else:
                    self.quote_number = "QUO-000001"
        
        super().save(*args, **kwargs)
    
    def calculate_totals(self):
        """Calculate quote totals"""
        items = self.quote_items.all()
        self.subtotal = sum(item.total_price for item in items)
        
        # Apply discount
        if self.discount_percentage > 0:
            self.discount_amount = (self.subtotal * self.discount_percentage) / 100
        
        subtotal_after_discount = self.subtotal - self.discount_amount
        
        # Calculate tax
        self.tax_amount = (subtotal_after_discount * self.tax_rate) / 100
        
        # Calculate total
        self.total_amount = subtotal_after_discount + self.tax_amount
        
        self.save(update_fields=['subtotal', 'discount_amount', 'tax_amount', 'total_amount'])
    
    @property
    def is_expired(self):
        return timezone.now().date() > self.valid_until
    
    @property
    def days_until_expiry(self):
        if self.is_expired:
            return 0
        return (self.valid_until - timezone.now().date()).days

class QuoteItem(models.Model):
    """Quote line items"""
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='quote_items')
    
    # Item details
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Optional product reference
    product_code = models.CharField(max_length=50, blank=True)
    
    # Line order
    line_number = models.PositiveIntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['line_number']
        unique_together = ['quote', 'line_number']
    
    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        
        # Recalculate quote totals
        self.quote.calculate_totals()
    
    def __str__(self):
        return f"{self.quote.quote_number} - {self.name}"

class QuoteActivity(models.Model):
    """Track quote activities"""
    ACTIVITY_TYPES = [
        ('created', 'Created'),
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('downloaded', 'Downloaded'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('reminder_sent', 'Reminder Sent'),
    ]
    
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.TextField(blank=True)
    
    # Tracking info
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.quote.quote_number} - {self.get_activity_type_display()}"

class QuoteSignature(models.Model):
    """Digital signatures for quotes"""
    quote = models.OneToOneField(Quote, on_delete=models.CASCADE, related_name='signature')
    
    # Signature details
    signer_name = models.CharField(max_length=100)
    signer_email = models.EmailField()
    signer_title = models.CharField(max_length=100, blank=True)
    
    # Signature data
    signature_data = models.TextField()  # Base64 encoded signature image
    signature_date = models.DateTimeField(auto_now_add=True)
    
    # Verification
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    def __str__(self):
        return f"{self.quote.quote_number} - Signed by {self.signer_name}"