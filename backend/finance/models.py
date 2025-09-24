from django.db import models
from django.core.validators import RegexValidator, EmailValidator
from django.utils import timezone
from authentication.models import Company, CompanyServiceUser


class HSNCode(models.Model):
    """HSN (Harmonized System of Nomenclature) codes for goods"""
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField()
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_hsn_codes'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.description[:50]}"


class SACCode(models.Model):
    """SAC (Services Accounting Code) codes for services"""
    code = models.CharField(max_length=100, unique=True, db_index=True)
    service_name = models.CharField(max_length=255)
    description = models.TextField()
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_sac_codes'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.service_name}"


class Product(models.Model):
    """Product/Service model for finance management"""
    PRODUCT_TYPE_CHOICES = [
        ('product', 'Product (Goods)'),
        ('service', 'Service'),
    ]

    UNIT_CHOICES = [
        ('PCS', 'Pieces'),
        ('KG', 'Kilograms'),
        ('GM', 'Grams'),
        ('LITER', 'Liters'),
        ('METER', 'Meters'),
        ('SQFT', 'Square Feet'),
        ('HOUR', 'Hours'),
        ('DAY', 'Days'),
        ('MONTH', 'Months'),
        ('YEAR', 'Years'),
        ('BOX', 'Box'),
        ('SET', 'Set'),
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='products')
    product_code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    product_type = models.CharField(max_length=10, choices=PRODUCT_TYPE_CHOICES, default='product')
    description = models.TextField(blank=True)

    # Tax Information
    hsn_code = models.ForeignKey(HSNCode, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    sac_code = models.ForeignKey(SACCode, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    # Pricing
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='PCS')
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # Inventory (for products only)
    track_inventory = models.BooleanField(default=False)
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    minimum_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # Status
    is_active = models.BooleanField(default=True)

    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_products'
        ordering = ['-created_at']
        unique_together = ['company', 'product_code']

    def __str__(self):
        return f"{self.product_code} - {self.name}"

    def save(self, *args, **kwargs):
        # Auto-generate product code if not provided
        if not self.product_code:
            try:
                from authentication.utils import generate_auto_code
                self.product_code = generate_auto_code(self.company.id, 'product')
            except Exception as e:
                # Fallback to old system if auto-code fails
                if self.product_type == 'product':
                    # Generate PRD- codes for products
                    last_product = Product.objects.filter(
                        company=self.company,
                        product_type='product',
                        product_code__startswith='PRD-'
                    ).order_by('-id').first()
                    if last_product:
                        last_number = int(last_product.product_code.split('-')[-1])
                        self.product_code = f"PRD-{last_number + 1:06d}"
                    else:
                        self.product_code = "PRD-000001"
                else:
                    # Generate SER- codes for services
                    last_service = Product.objects.filter(
                        company=self.company,
                        product_type='service',
                        product_code__startswith='SER-'
                    ).order_by('-id').first()
                    if last_service:
                        last_number = int(last_service.product_code.split('-')[-1])
                        self.product_code = f"SER-{last_number + 1:06d}"
                    else:
                        self.product_code = "SER-000001"

        # Auto-set GST rate from HSN/SAC code
        if self.product_type == 'product' and self.hsn_code:
            self.gst_rate = self.hsn_code.gst_rate
        elif self.product_type == 'service' and self.sac_code:
            self.gst_rate = self.sac_code.gst_rate

        super().save(*args, **kwargs)


class Customer(models.Model):
    """Customer model for Finance service with comprehensive details for invoicing"""

    CUSTOMER_TYPE_CHOICES = [
        ('individual', 'Individual'),
        ('business', 'Business'),
        ('government', 'Government'),
        ('ngo', 'NGO/Non-Profit'),
    ]

    BUSINESS_TYPE_CHOICES = [
        ('proprietorship', 'Sole Proprietorship'),
        ('partnership', 'Partnership'),
        ('llp', 'Limited Liability Partnership'),
        ('private_limited', 'Private Limited Company'),
        ('public_limited', 'Public Limited Company'),
        ('trust', 'Trust'),
        ('society', 'Society'),
        ('cooperative', 'Cooperative Society'),
        ('other', 'Other'),
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='finance_customers')
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.CASCADE, related_name='created_customers', null=True, blank=True)
    customer_code = models.CharField(max_length=20, unique=True, help_text="Auto-generated unique customer code")

    # Customer Type and Basic Details
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES, default='business')
    name = models.CharField(max_length=255, help_text="Customer/Company Name")
    display_name = models.CharField(max_length=255, blank=True, help_text="Display name for invoices")

    # Contact Information
    email = models.EmailField(validators=[EmailValidator()], blank=True)
    phone = models.CharField(max_length=15, blank=True)
    mobile = models.CharField(max_length=15, blank=True)
    website = models.URLField(blank=True)

    # Address Information
    billing_address_line1 = models.CharField(max_length=255, blank=True)
    billing_address_line2 = models.CharField(max_length=255, blank=True)
    billing_city = models.CharField(max_length=100, blank=True)
    billing_state = models.CharField(max_length=100, blank=True)
    billing_pincode = models.CharField(max_length=10, blank=True)
    billing_country = models.CharField(max_length=100, default='India')

    # Shipping Address (can be different from billing)
    shipping_same_as_billing = models.BooleanField(default=True)
    shipping_address_line1 = models.CharField(max_length=255, blank=True)
    shipping_address_line2 = models.CharField(max_length=255, blank=True)
    shipping_city = models.CharField(max_length=100, blank=True)
    shipping_state = models.CharField(max_length=100, blank=True)
    shipping_pincode = models.CharField(max_length=10, blank=True)
    shipping_country = models.CharField(max_length=100, blank=True)

    # Business Information (for business customers)
    business_type = models.CharField(max_length=20, choices=BUSINESS_TYPE_CHOICES, blank=True)
    industry = models.CharField(max_length=100, blank=True)

    # Tax Information
    gstin = models.CharField(
        max_length=15,
        blank=True,
        validators=[RegexValidator(
            regex=r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
            message='Enter a valid GSTIN number'
        )],
        help_text="15-digit GST Identification Number"
    )
    pan_number = models.CharField(
        max_length=10,
        blank=True,
        validators=[RegexValidator(
            regex=r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
            message='Enter a valid PAN number'
        )],
        help_text="10-character PAN number"
    )

    # Individual Customer Information
    aadhar_number = models.CharField(
        max_length=12,
        blank=True,
        validators=[RegexValidator(
            regex=r'^[0-9]{12}$',
            message='Enter a valid 12-digit Aadhar number'
        )],
        help_text="12-digit Aadhar number (for individuals)"
    )

    # Banking Information
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=20, blank=True)
    bank_ifsc_code = models.CharField(
        max_length=11,
        blank=True,
        validators=[RegexValidator(
            regex=r'^[A-Z]{4}0[A-Z0-9]{6}$',
            message='Enter a valid IFSC code'
        )]
    )
    bank_branch = models.CharField(max_length=100, blank=True)

    # Financial Information
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    payment_terms = models.CharField(max_length=100, blank=True, help_text="e.g., Net 30, COD, Advance")
    currency = models.CharField(max_length=3, default='INR')

    # Additional Information
    project_area = models.CharField(max_length=255, blank=True, help_text="Project area or address label for easy identification")
    notes = models.TextField(blank=True, help_text="Internal notes about the customer")
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['company', 'customer_code']
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'

    def __str__(self):
        return f"{self.customer_code} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.customer_code:
            try:
                from authentication.utils import generate_auto_code
                self.customer_code = generate_auto_code(self.company.id, 'customer')
            except Exception as e:
                # Fallback to old system if auto-code fails
                max_retries = 10
                for attempt in range(max_retries):
                    try:
                        # Get the highest customer number for this company
                        last_customer = Customer.objects.filter(
                            company=self.company,
                            customer_code__startswith='CUST-'
                        ).order_by('-customer_code').first()
                        
                        if last_customer and last_customer.customer_code:
                            try:
                                last_number = int(last_customer.customer_code.split('-')[-1])
                                new_number = last_number + 1
                            except (ValueError, IndexError):
                                new_number = 1
                        else:
                            new_number = 1
                        
                        self.customer_code = f"CUST-{new_number:06d}"
                        break  # Success, exit retry loop
                        
                    except Exception as e:
                        if 'unique constraint' in str(e).lower() or 'duplicate' in str(e).lower():
                            # If it's a uniqueness error, retry with next number
                            if attempt < max_retries - 1:
                                continue
                            else:
                                # Last attempt failed, use timestamp-based code
                                import time
                                timestamp = int(time.time() * 1000) % 1000000
                                self.customer_code = f"CUST-{timestamp:06d}"
                                break
                        else:
                            # Different error, re-raise
                            raise e
        
        if not self.display_name:
            self.display_name = self.name
        super().save(*args, **kwargs)

    @property
    def full_billing_address(self):
        """Get formatted billing address"""
        address_parts = [
            self.billing_address_line1,
            self.billing_address_line2,
            self.billing_city,
            self.billing_state,
            self.billing_pincode,
            self.billing_country
        ]
        return ', '.join([part for part in address_parts if part])

    @property
    def full_shipping_address(self):
        """Get formatted shipping address"""
        if self.shipping_same_as_billing:
            return self.full_billing_address

        address_parts = [
            self.shipping_address_line1,
            self.shipping_address_line2,
            self.shipping_city,
            self.shipping_state,
            self.shipping_pincode,
            self.shipping_country or self.billing_country
        ]
        return ', '.join([part for part in address_parts if part])


class CustomerShippingAddress(models.Model):
    """Multiple shipping addresses for customers"""

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='shipping_addresses')
    label = models.CharField(max_length=100, help_text="Address label (e.g., Warehouse, Branch Office)")

    # Address Information
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default='India')

    # Metadata
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', 'label']
        verbose_name = 'Customer Shipping Address'
        verbose_name_plural = 'Customer Shipping Addresses'

    def __str__(self):
        return f"{self.customer.name} - {self.label}"

    @property
    def full_address(self):
        """Get formatted address"""
        address_parts = [
            self.address_line1,
            self.address_line2,
            self.city,
            self.state,
            self.pincode,
            self.country
        ]
        return ', '.join([part for part in address_parts if part])

    def save(self, *args, **kwargs):
        # If this is set as default, unset other defaults for this customer
        if self.is_default:
            CustomerShippingAddress.objects.filter(
                customer=self.customer,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)


class Quotation(models.Model):
    """Quotation model for creating quotes for customers"""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('approved', 'Approved'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('converted', 'Converted to Invoice'),
    ]

    GST_TYPE_CHOICES = [
        ('igst', 'IGST (Inter-State)'),
        ('cgst_sgst', 'CGST + SGST (Intra-State)'),
        ('exempt', 'GST Exempt'),
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='quotations')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='quotations')
    quotation_number = models.CharField(max_length=50, unique=True, db_index=True)

    # Quotation Details
    quotation_date = models.DateField()
    valid_until = models.DateField()
    reference = models.CharField(max_length=100, blank=True, help_text="Customer reference or PO number")

    # Shipping Address (can be different from customer's default)
    shipping_address = models.ForeignKey(
        CustomerShippingAddress,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Selected shipping address for this quotation"
    )

    # GST Information
    gst_type = models.CharField(max_length=20, choices=GST_TYPE_CHOICES)
    customer_gstin = models.CharField(max_length=15, blank=True, help_text="Customer GSTIN at time of quotation")
    company_gstin = models.CharField(max_length=15, blank=True, help_text="Company GSTIN at time of quotation")

    # Financial Totals
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Tax Breakdown (for CGST+SGST)
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Additional Charges
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    shipping_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    other_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Status and Notes
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True, help_text="Internal notes")
    terms_and_conditions = models.TextField(blank=True)

    # Revision tracking
    is_revised = models.BooleanField(default=False, help_text="Whether this quotation has been revised")
    revision_count = models.PositiveIntegerField(default=0, help_text="Number of times this quotation has been revised")
    revised_at = models.DateTimeField(null=True, blank=True, help_text="When this quotation was last revised")
    revised_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='revised_quotations')

    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_quotations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_quotations'
        ordering = ['-created_at']
        unique_together = ['company', 'quotation_number']

    def __str__(self):
        return f"{self.quotation_number} - {self.customer.name}"

    def save(self, *args, **kwargs):
        # Auto-generate quotation number if not provided
        if not self.quotation_number:
            try:
                from authentication.utils import generate_auto_code
                self.quotation_number = generate_auto_code(self.company.id, 'quotation')
            except Exception as e:
                # Fallback to old system if auto-code fails
                from datetime import datetime
                year = datetime.now().year
                last_quotation = Quotation.objects.filter(
                    company=self.company,
                    quotation_number__startswith=f"QUO-{year}"
                ).order_by('-id').first()

                if last_quotation:
                    last_number = int(last_quotation.quotation_number.split('-')[-1])
                    self.quotation_number = f"QUO-{year}-{last_number + 1:06d}"
                else:
                    self.quotation_number = f"QUO-{year}-000001"

        # Determine GST type based on customer and company GSTIN
        if self.customer.gstin and hasattr(self.company, 'gst_number') and self.company.gst_number:
            customer_state_code = self.customer.gstin[:2]
            company_state_code = self.company.gst_number[:2]

            if customer_state_code == company_state_code:
                self.gst_type = 'cgst_sgst'  # Same state - CGST + SGST
            else:
                self.gst_type = 'igst'  # Different state - IGST
        else:
            self.gst_type = 'exempt'  # No GST if either party doesn't have GSTIN

        # Store GSTIN values at time of quotation
        self.customer_gstin = self.customer.gstin or ''
        self.company_gstin = getattr(self.company, 'gst_number', '') or ''

        super().save(*args, **kwargs)

    def calculate_totals(self):
        """Calculate quotation totals from line items"""
        from decimal import Decimal

        items = self.quotation_items.all()

        # Initialize all amounts as Decimal - be more careful with conversions
        subtotal = Decimal('0')
        for item in items:
            subtotal += item.line_total
        self.subtotal = subtotal

        # Ensure discount_amount is Decimal - handle existing values more carefully
        if not hasattr(self, 'discount_amount') or self.discount_amount is None:
            self.discount_amount = Decimal('0')
        else:
            # If it's already a Decimal, don't convert it
            if not isinstance(self.discount_amount, Decimal):
                self.discount_amount = Decimal(str(self.discount_amount))

        # Apply discount
        if not hasattr(self, 'discount_percentage') or self.discount_percentage is None:
            discount_percentage = Decimal('0')
        else:
            if not isinstance(self.discount_percentage, Decimal):
                discount_percentage = Decimal(str(self.discount_percentage))
            else:
                discount_percentage = self.discount_percentage

        if discount_percentage > 0:
            self.discount_amount = (self.subtotal * discount_percentage) / Decimal('100')

        discounted_subtotal = self.subtotal - self.discount_amount

        # Calculate tax based on GST type
        total_tax = Decimal('0')
        self.cgst_amount = Decimal('0')
        self.sgst_amount = Decimal('0')
        self.igst_amount = Decimal('0')

        if self.gst_type == 'cgst_sgst':
            # CGST + SGST (each is half of total GST rate)
            for item in items:
                item_tax = (item.line_total * item.gst_rate) / Decimal('100')
                total_tax += item_tax
                self.cgst_amount += item_tax / Decimal('2')
                self.sgst_amount += item_tax / Decimal('2')
        elif self.gst_type == 'igst':
            # IGST (full GST rate)
            for item in items:
                item_tax = (item.line_total * item.gst_rate) / Decimal('100')
                total_tax += item_tax
                self.igst_amount += item_tax

        self.total_tax = total_tax

        # Ensure shipping_charges and other_charges are Decimals - handle existing values carefully
        if not hasattr(self, 'shipping_charges') or self.shipping_charges is None:
            shipping_charges = Decimal('0')
        else:
            if not isinstance(self.shipping_charges, Decimal):
                shipping_charges = Decimal(str(self.shipping_charges))
            else:
                shipping_charges = self.shipping_charges

        if not hasattr(self, 'other_charges') or self.other_charges is None:
            other_charges = Decimal('0')
        else:
            if not isinstance(self.other_charges, Decimal):
                other_charges = Decimal(str(self.other_charges))
            else:
                other_charges = self.other_charges

        self.total_amount = discounted_subtotal + self.total_tax + shipping_charges + other_charges

        # Save without triggering calculate_totals again
        super().save(update_fields=[
            'subtotal', 'discount_amount', 'total_tax', 'cgst_amount',
            'sgst_amount', 'igst_amount', 'total_amount'
        ])


class QuotationItem(models.Model):
    """Individual line items in a quotation"""

    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='quotation_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    # Item details (captured at time of quotation)
    product_name = models.CharField(max_length=255)
    product_code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    hsn_sac_code = models.CharField(max_length=20, blank=True)

    # Pricing and quantity
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=10)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=15, decimal_places=2)

    # Tax information
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)

    # Line item order
    line_number = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'finance_quotation_items'
        ordering = ['line_number']
        unique_together = ['quotation', 'line_number']

    def __str__(self):
        return f"{self.quotation.quotation_number} - {self.product_name}"

    def save(self, *args, **kwargs):
        # Extract skip_totals_calculation before passing to parent save
        skip_totals_calculation = kwargs.pop('skip_totals_calculation', False)

        # Capture product details at time of quotation
        if self.product:
            self.product_name = self.product.name
            self.product_code = self.product.product_code
            self.description = self.product.description
            self.unit = self.product.unit
            self.gst_rate = self.product.gst_rate

            # Get HSN/SAC code
            if self.product.hsn_code:
                self.hsn_sac_code = self.product.hsn_code.code
            elif self.product.sac_code:
                self.hsn_sac_code = self.product.sac_code.code

        # Calculate line total
        self.line_total = self.quantity * self.unit_price

        super().save(*args, **kwargs)

        # Recalculate quotation totals only if not in bulk creation
        if not skip_totals_calculation:
            self.quotation.calculate_totals()


class PurchaseOrder(models.Model):
    """Purchase Order/Work Order model created from quotations"""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    CLAIM_TYPE_CHOICES = [
        ('percentage', 'Percentage-based Claiming'),
        ('quantity', 'Quantity-based Claiming'),
    ]

    PROFORMA_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('partial', 'Partially Claimed'),
        ('completed', 'Fully Claimed'),
    ]

    INVOICE_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('partial', 'Partially Invoiced'),
        ('completed', 'Fully Invoiced'),
    ]

    GST_TYPE_CHOICES = [
        ('igst', 'IGST (Inter-State)'),
        ('cgst_sgst', 'CGST + SGST (Intra-State)'),
        ('exempt', 'GST Exempt'),
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='purchase_orders')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='purchase_orders')
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='purchase_orders', help_text="Original quotation this PO is based on")

    # PO/WO Details
    po_number = models.CharField(max_length=100, help_text="Client's PO/WO number")
    po_date = models.DateField(help_text="Client's PO/WO date")
    po_file = models.FileField(upload_to='po_files/', null=True, blank=True, help_text="Client's PO/WO file attachment")

    # Internal tracking
    internal_po_number = models.CharField(max_length=50, unique=True, db_index=True, help_text="Our internal PO number")

    # Quotation Details (copied from original quotation)
    quotation_date = models.DateField()
    valid_until = models.DateField()
    reference = models.CharField(max_length=100, blank=True, help_text="Customer reference or PO number")

    # Shipping Address (can be different from customer's default)
    shipping_address = models.ForeignKey(
        CustomerShippingAddress,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Selected shipping address for this PO"
    )

    # GST Information (copied from quotation)
    gst_type = models.CharField(max_length=20, choices=GST_TYPE_CHOICES)
    customer_gstin = models.CharField(max_length=15, blank=True, help_text="Customer GSTIN at time of PO")
    company_gstin = models.CharField(max_length=15, blank=True, help_text="Company GSTIN at time of PO")

    # Financial Totals
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Tax Breakdown (for CGST+SGST)
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Additional Charges
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    shipping_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    other_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Status and Notes
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True, help_text="Internal notes")
    terms_and_conditions = models.TextField(blank=True)

    # Advanced Workflow Fields
    claim_type = models.CharField(
        max_length=20,
        choices=CLAIM_TYPE_CHOICES,
        blank=True,
        null=True,
        help_text="How proforma invoices will be claimed from this PO (set on first invoice creation)"
    )

    # Balance Tracking Fields
    proforma_claimed_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Total amount claimed through proforma invoices"
    )

    invoice_claimed_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Total amount invoiced (final invoices with tax)"
    )

    remaining_proforma_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Remaining amount available for proforma claiming"
    )

    remaining_invoice_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Remaining amount to be invoiced (with tax)"
    )

    # Workflow Status Tracking
    proforma_status = models.CharField(
        max_length=20,
        choices=PROFORMA_STATUS_CHOICES,
        default='not_started',
        help_text="Status of proforma invoice claiming"
    )

    invoice_status = models.CharField(
        max_length=20,
        choices=INVOICE_STATUS_CHOICES,
        default='not_started',
        help_text="Status of final invoicing"
    )

    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_purchase_orders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_purchase_orders'
        ordering = ['-created_at']
        unique_together = ['company', 'internal_po_number']

    def __str__(self):
        return f"{self.internal_po_number} - {self.customer.name}"

    def save(self, *args, **kwargs):
        # Generate internal PO number if not provided
        if not self.internal_po_number:
            try:
                from authentication.utils import generate_auto_code
                self.internal_po_number = generate_auto_code(self.company.id, 'purchase_order')
            except Exception as e:
                # Fallback to old system if auto-code fails
                latest_po = PurchaseOrder.objects.filter(
                    company=self.company
                ).order_by('-created_at').first()

                if latest_po and latest_po.internal_po_number:
                    # Extract number from format PO-2025-000001
                    try:
                        parts = latest_po.internal_po_number.split('-')
                        if len(parts) == 3 and parts[0] == 'PO':
                            year = parts[1]
                            number = int(parts[2])
                            current_year = timezone.now().year

                            if int(year) == current_year:
                                new_number = number + 1
                            else:
                                new_number = 1

                            self.internal_po_number = f"PO-{current_year}-{new_number:06d}"
                        else:
                            self.internal_po_number = f"PO-{timezone.now().year}-000001"
                    except (ValueError, IndexError):
                        self.internal_po_number = f"PO-{timezone.now().year}-000001"
                else:
                    self.internal_po_number = f"PO-{timezone.now().year}-000001"

        # Initialize balance tracking for new POs before saving
        is_new = self.pk is None
        if is_new:
            from decimal import Decimal
            self.proforma_claimed_amount = Decimal('0')
            self.invoice_claimed_amount = Decimal('0')
            self.proforma_status = 'not_started'
            self.invoice_status = 'not_started'
            # Note: remaining balances will be set after totals are calculated

        super().save(*args, **kwargs)

        # Set remaining balances after save (when totals are available)
        if is_new:
            self.remaining_proforma_balance = self.subtotal
            self.remaining_invoice_balance = self.total_amount
            # Use update to avoid triggering save() again
            PurchaseOrder.objects.filter(pk=self.pk).update(
                remaining_proforma_balance=self.subtotal,
                remaining_invoice_balance=self.total_amount
            )

    def calculate_totals(self):
        """Calculate all totals for this PO"""
        from decimal import Decimal

        items = self.po_items.all()

        # Calculate subtotal
        subtotal = sum(item.line_total for item in items)

        # Apply discount
        if self.discount_percentage > 0:
            self.discount_amount = (subtotal * self.discount_percentage) / Decimal('100')

        subtotal_after_discount = subtotal - self.discount_amount

        # Add other charges (ensure all values are Decimal)
        shipping_charges = Decimal(str(self.shipping_charges)) if self.shipping_charges else Decimal('0')
        other_charges = Decimal(str(self.other_charges)) if self.other_charges else Decimal('0')
        subtotal_with_charges = subtotal_after_discount + shipping_charges + other_charges

        self.subtotal = subtotal_with_charges

        # Calculate tax
        total_tax = Decimal('0')
        self.cgst_amount = Decimal('0')
        self.sgst_amount = Decimal('0')
        self.igst_amount = Decimal('0')

        if self.gst_type == 'cgst_sgst':
            # CGST + SGST (each is half of total GST rate)
            for item in items:
                item_tax = (item.line_total * item.gst_rate) / Decimal('100')
                total_tax += item_tax
                self.cgst_amount += item_tax / Decimal('2')
                self.sgst_amount += item_tax / Decimal('2')
        elif self.gst_type == 'igst':
            # IGST (full GST rate)
            for item in items:
                item_tax = (item.line_total * item.gst_rate) / Decimal('100')
                total_tax += item_tax
                self.igst_amount += item_tax

        self.total_tax = total_tax

        # Calculate final total
        self.total_amount = self.subtotal + self.total_tax

        self.save(update_fields=[
            'subtotal', 'total_tax', 'total_amount', 'discount_amount',
            'cgst_amount', 'sgst_amount', 'igst_amount'
        ])

    def update_balance_tracking(self):
        """World-Class Sophisticated Balance Tracking - Cross-impact between proforma and tax invoices"""
        from decimal import Decimal

        # Calculate total proforma claimed amount (subtotal only)
        proforma_subtotal_total = sum(
            proforma.subtotal for proforma in self.proforma_invoices.all()
        ) or Decimal('0')

        # Calculate total tax invoice claimed amount (with tax)
        invoice_total = sum(
            invoice.total_amount for invoice in self.invoices.all()
        ) or Decimal('0')

        # Calculate tax invoice subtotal impact (for cross-impact calculation)
        invoice_subtotal_total = sum(
            invoice.subtotal for invoice in self.invoices.all()
        ) or Decimal('0')

        # Update claimed amounts
        self.proforma_claimed_amount = proforma_subtotal_total
        self.invoice_claimed_amount = invoice_total

        # SOPHISTICATED LOGIC: Tax invoice claiming reduces proforma claimable base
        # Original subtotal: ₹800
        # Tax invoice claimed subtotal: ₹200 (from 25% tax invoice)
        # New proforma base: ₹800 - ₹200 = ₹600
        # Remaining proforma claimable: ₹600 - already claimed proforma subtotal

        reduced_proforma_base = self.subtotal - invoice_subtotal_total
        self.remaining_proforma_balance = max(Decimal('0'), reduced_proforma_base - proforma_subtotal_total)

        # For tax invoice: remaining from total amount (with tax) minus what's already invoiced
        self.remaining_invoice_balance = self.total_amount - invoice_total

        # Update status based on balances
        if proforma_subtotal_total == 0:
            self.proforma_status = 'not_started'
        elif self.remaining_proforma_balance <= 0 or reduced_proforma_base <= 0:
            self.proforma_status = 'completed'
        else:
            self.proforma_status = 'partial'

        # PO completion is based ONLY on tax invoices (not proforma)
        if invoice_total == 0:
            self.invoice_status = 'not_started'
        elif self.remaining_invoice_balance <= 0:
            self.invoice_status = 'completed'  # This determines PO completion
        else:
            self.invoice_status = 'partial'

        self.save(update_fields=[
            'proforma_claimed_amount', 'invoice_claimed_amount',
            'remaining_proforma_balance', 'remaining_invoice_balance',
            'proforma_status', 'invoice_status'
        ])

    def get_world_class_payment_summary(self):
        """World-Class Payment Summary - Complete payment tracking for PO"""
        from decimal import Decimal

        # Calculate proforma payments (advances)
        proforma_payments = sum(
            pf.paid_amount for pf in self.proforma_invoices.all()
        ) or Decimal('0')

        # Calculate invoice payments (direct)
        invoice_payments = sum(
            inv.paid_amount for inv in self.invoices.all()
        ) or Decimal('0')

        # Calculate outstanding amounts
        proforma_outstanding = sum(
            pf.outstanding_amount for pf in self.proforma_invoices.all()
        ) or Decimal('0')

        invoice_outstanding = sum(
            inv.outstanding_amount for inv in self.invoices.all()
        ) or Decimal('0')

        total_paid = proforma_payments + invoice_payments
        total_outstanding = proforma_outstanding + invoice_outstanding

        return {
            'po_total_amount': self.total_amount,
            'proforma_payments': proforma_payments,
            'invoice_payments': invoice_payments,
            'total_paid': total_paid,
            'proforma_outstanding': proforma_outstanding,
            'invoice_outstanding': invoice_outstanding,
            'total_outstanding': total_outstanding,
            'payment_completion_percentage': float((total_paid / self.total_amount) * 100) if self.total_amount > 0 else 0
        }

    def get_sophisticated_claiming_status(self):
        """World-Class Sophisticated Claiming Status - Shows cross-impact calculations"""
        from decimal import Decimal

        # Calculate current claimed amounts
        proforma_subtotal_claimed = sum(
            pf.subtotal for pf in self.proforma_invoices.all()
        ) or Decimal('0')

        invoice_total_claimed = sum(
            inv.total_amount for inv in self.invoices.all()
        ) or Decimal('0')

        invoice_subtotal_claimed = sum(
            inv.subtotal for inv in self.invoices.all()
        ) or Decimal('0')

        # Calculate percentages
        proforma_claimed_percentage = float((proforma_subtotal_claimed / self.subtotal) * 100) if self.subtotal > 0 else 0
        invoice_claimed_percentage = float((invoice_total_claimed / self.total_amount) * 100) if self.total_amount > 0 else 0

        # Calculate reduced proforma base due to tax invoice impact
        reduced_proforma_base = self.subtotal - invoice_subtotal_claimed
        available_proforma_percentage = float((self.remaining_proforma_balance / self.subtotal) * 100) if self.subtotal > 0 else 0

        return {
            'original_po_amount': self.total_amount,
            'original_subtotal': self.subtotal,
            'original_tax': self.total_tax,

            # Proforma claiming status
            'proforma_claimed_amount': proforma_subtotal_claimed,
            'proforma_claimed_percentage': proforma_claimed_percentage,
            'proforma_base_reduced_by_tax_invoices': invoice_subtotal_claimed,
            'current_proforma_base': reduced_proforma_base,
            'available_proforma_amount': self.remaining_proforma_balance,
            'available_proforma_percentage': available_proforma_percentage,

            # Tax invoice claiming status
            'tax_invoice_claimed_amount': invoice_total_claimed,
            'tax_invoice_claimed_percentage': invoice_claimed_percentage,
            'available_tax_invoice_amount': self.remaining_invoice_balance,
            'available_tax_invoice_percentage': float((self.remaining_invoice_balance / self.total_amount) * 100) if self.total_amount > 0 else 0,

            # Overall status
            'po_completion_percentage': invoice_claimed_percentage,  # Only tax invoices determine completion
            'is_po_completed': self.invoice_status == 'completed',
            'total_invoices_created': self.proforma_invoices.count() + self.invoices.count()
        }

    def fix_balance_tracking(self):
        """Fix balance tracking for POs that have incorrect balances"""
        from decimal import Decimal

        # Only fix if balances are zero but PO has amounts
        if (self.remaining_proforma_balance == 0 and self.remaining_invoice_balance == 0 and
            self.proforma_claimed_amount == 0 and self.invoice_claimed_amount == 0 and
            self.subtotal > 0):

            self.remaining_proforma_balance = self.subtotal
            self.remaining_invoice_balance = self.total_amount
            self.save(update_fields=['remaining_proforma_balance', 'remaining_invoice_balance'])
            return True
        return False

    @property
    def can_create_proforma(self):
        """Check if more proforma invoices can be created"""
        return self.remaining_proforma_balance > 0

    @property
    def can_create_invoice(self):
        """Check if more invoices can be created"""
        return self.remaining_invoice_balance > 0

    @property
    def proforma_completion_percentage(self):
        """Get proforma claiming completion percentage"""
        if self.subtotal == 0:
            return 0
        return float((self.proforma_claimed_amount / self.subtotal) * 100)

    @property
    def invoice_completion_percentage(self):
        """Get invoice completion percentage"""
        if self.total_amount == 0:
            return 0
        return float((self.invoice_claimed_amount / self.total_amount) * 100)


class PurchaseOrderItem(models.Model):
    """Individual items in a Purchase Order"""

    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='po_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    # Item details (captured at time of PO creation)
    product_name = models.CharField(max_length=255)
    product_code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    hsn_sac_code = models.CharField(max_length=20, blank=True)

    # Pricing and quantity
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=10)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=15, decimal_places=2)

    # Tax information
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)

    # Quantity-based Claiming Tracking
    proforma_claimed_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Quantity claimed through proforma invoices"
    )

    invoice_claimed_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Quantity invoiced through final invoices"
    )

    # Line item order
    line_number = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'finance_purchase_order_items'
        ordering = ['line_number']
        unique_together = ['purchase_order', 'line_number']

    def __str__(self):
        return f"{self.purchase_order.internal_po_number} - {self.product_name}"

    def save(self, *args, **kwargs):
        # Extract skip_totals_calculation before passing to parent save
        skip_totals_calculation = kwargs.pop('skip_totals_calculation', False)

        # Capture product details at time of PO creation
        if self.product:
            self.product_name = self.product.name
            self.product_code = self.product.product_code
            self.description = self.product.description
            self.unit = self.product.unit
            self.gst_rate = self.product.gst_rate

            # Get HSN/SAC code
            if self.product.hsn_code:
                self.hsn_sac_code = self.product.hsn_code.code
            elif self.product.sac_code:
                self.hsn_sac_code = self.product.sac_code.code

        # Calculate line total
        self.line_total = self.quantity * self.unit_price

        super().save(*args, **kwargs)

        # Recalculate PO totals only if not in bulk creation
        if not skip_totals_calculation:
            self.purchase_order.calculate_totals()

    @property
    def remaining_proforma_quantity(self):
        """Get remaining quantity available for proforma claiming"""
        return self.quantity - self.proforma_claimed_quantity

    @property
    def remaining_invoice_quantity(self):
        """Get remaining quantity available for final invoicing"""
        return self.quantity - self.invoice_claimed_quantity

    @property
    def proforma_quantity_percentage(self):
        """Get percentage of quantity claimed through proforma"""
        if self.quantity == 0:
            return 0
        return float((self.proforma_claimed_quantity / self.quantity) * 100)

    @property
    def invoice_quantity_percentage(self):
        """Get percentage of quantity invoiced"""
        if self.quantity == 0:
            return 0
        return float((self.invoice_claimed_quantity / self.quantity) * 100)


class ProformaInvoice(models.Model):
    """Proforma Invoice model - created from approved Purchase Orders"""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent to Customer'),
        ('approved', 'Approved by Customer'),
        ('paid', 'Fully Paid'),
        ('partially_paid', 'Partially Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partially_paid', 'Partially Paid'),
        ('paid', 'Fully Paid'),
        ('overdue', 'Overdue'),
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='proforma_invoices')

    # Proforma Invoice Details
    proforma_number = models.CharField(max_length=50, unique=True, db_index=True)
    proforma_date = models.DateField()
    due_date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)

    # Customer and Shipping Information
    customer_gstin = models.CharField(max_length=15, blank=True)
    company_gstin = models.CharField(max_length=15, blank=True)
    shipping_address = models.ForeignKey(CustomerShippingAddress, on_delete=models.SET_NULL, null=True, blank=True)

    # GST Information
    gst_type = models.CharField(max_length=10, choices=[
        ('igst', 'IGST'),
        ('cgst_sgst', 'CGST + SGST'),
        ('exempt', 'GST Exempt')
    ], default='igst')

    # Financial Information
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Tax Breakdown
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Additional Charges
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    shipping_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    other_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Status and Notes
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)

    # Claim Tracking Fields
    claim_type = models.CharField(
        max_length=20,
        choices=[
            ('percentage', 'Percentage-based'),
            ('quantity', 'Quantity-based'),
        ],
        help_text="Type of claim from PO"
    )

    claim_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Percentage of PO claimed (for percentage-based)"
    )

    is_advance_bill = models.BooleanField(
        default=True,
        help_text="True for proforma (advance bill without tax), False for final invoice"
    )

    # World-Class Payment Tracking Fields
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid',
        help_text="Payment status of this proforma invoice"
    )

    paid_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Total amount paid against this proforma invoice"
    )

    outstanding_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Outstanding amount for this proforma invoice"
    )

    last_payment_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of last payment received"
    )

    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_proforma_invoices')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_proforma_invoices'
        ordering = ['-created_at']
        unique_together = ['company', 'proforma_number']

    def __str__(self):
        return f"{self.proforma_number} - {self.customer.name}"

    def save(self, *args, **kwargs):
        # Generate proforma number if not provided
        if not self.proforma_number:
            try:
                from authentication.utils import generate_auto_code
                self.proforma_number = generate_auto_code(self.company.id, 'proforma_invoice')
            except Exception as e:
                # Fallback to old system if auto-code fails
                latest_proforma = ProformaInvoice.objects.filter(
                    company=self.company
                ).order_by('-created_at').first()

                if latest_proforma and latest_proforma.proforma_number:
                    # Extract number from format PI-2025-000001
                    try:
                        parts = latest_proforma.proforma_number.split('-')
                        if len(parts) == 3 and parts[0] == 'PI':
                            year = parts[1]
                            number = int(parts[2])
                            current_year = timezone.now().year

                            if int(year) == current_year:
                                new_number = number + 1
                            else:
                                new_number = 1

                            self.proforma_number = f"PI-{current_year}-{new_number:06d}"
                        else:
                            self.proforma_number = f"PI-{timezone.now().year}-000001"
                    except (ValueError, IndexError):
                        self.proforma_number = f"PI-{timezone.now().year}-000001"
                else:
                    self.proforma_number = f"PI-{timezone.now().year}-000001"

        super().save(*args, **kwargs)

        # Update PO balance tracking after save
        if self.purchase_order:
            self.purchase_order.update_balance_tracking()

    def calculate_totals(self):
        """Calculate all totals for this proforma invoice - NO TAX for proforma invoices"""
        from decimal import Decimal

        # Calculate subtotal from items
        subtotal = sum(item.line_total for item in self.proforma_items.all()) or Decimal('0')

        # Apply discount
        if self.discount_percentage > 0:
            discount_amount = subtotal * (self.discount_percentage / Decimal('100'))
        else:
            # Ensure discount_amount is Decimal
            discount_amount = Decimal(str(self.discount_amount)) if self.discount_amount else Decimal('0')

        subtotal_after_discount = subtotal - discount_amount

        # PROFORMA INVOICES DO NOT INCLUDE TAX - Set all tax amounts to zero
        total_tax = Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = Decimal('0')

        # Calculate final total (ensure all values are Decimal) - NO TAX ADDED
        shipping_charges = Decimal(str(self.shipping_charges)) if self.shipping_charges else Decimal('0')
        other_charges = Decimal(str(self.other_charges)) if self.other_charges else Decimal('0')
        total_with_charges = subtotal_after_discount + shipping_charges + other_charges
        total_amount = total_with_charges  # NO TAX ADDED FOR PROFORMA

        # Update fields
        self.subtotal = subtotal_after_discount
        self.discount_amount = discount_amount
        self.total_tax = total_tax  # Always zero for proforma
        self.cgst_amount = cgst_amount  # Always zero for proforma
        self.sgst_amount = sgst_amount  # Always zero for proforma
        self.igst_amount = igst_amount  # Always zero for proforma
        self.total_amount = total_amount  # Base amount only, no tax

        # Save without triggering calculate_totals again
        super().save(update_fields=[
            'subtotal', 'total_tax', 'total_amount', 'discount_amount',
            'cgst_amount', 'sgst_amount', 'igst_amount'
        ])

    @property
    def customer_details(self):
        """Get customer details in dictionary format for PDF generation"""
        return {
            'name': self.customer.name,
            'address': self.customer.billing_address_line1,
            'city': self.customer.billing_city,
            'state': self.customer.billing_state,
            'pincode': self.customer.billing_pincode,
            'phone': self.customer.phone,
            'email': self.customer.email,
            'gst_number': self.customer.gstin,
        }


class ProformaInvoiceItem(models.Model):
    """Individual items in a Proforma Invoice"""

    proforma_invoice = models.ForeignKey(ProformaInvoice, on_delete=models.CASCADE, related_name='proforma_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    # Item details (captured at time of proforma creation)
    product_name = models.CharField(max_length=255)
    product_code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    hsn_sac_code = models.CharField(max_length=20, blank=True)

    # Pricing and quantity
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=10)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=15, decimal_places=2)

    # Tax information
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)

    # Line item order
    line_number = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'finance_proforma_invoice_items'
        ordering = ['line_number']
        unique_together = ['proforma_invoice', 'line_number']

    def __str__(self):
        return f"{self.proforma_invoice.proforma_number} - {self.product_name}"

    @property
    def rate(self):
        """Alias for unit_price to match PDF generator expectations"""
        return self.unit_price

    @property
    def amount(self):
        """Calculate amount before tax (quantity * unit_price)"""
        return self.quantity * self.unit_price

    @property
    def tax_amount(self):
        """Calculate tax amount"""
        from decimal import Decimal
        amount = self.quantity * self.unit_price
        return amount * (self.gst_rate / Decimal('100'))

    def save(self, *args, **kwargs):
        # Extract skip_totals_calculation before passing to parent save
        skip_totals_calculation = kwargs.pop('skip_totals_calculation', False)

        # Capture product details at time of proforma creation
        if self.product:
            self.product_name = self.product.name
            self.product_code = self.product.product_code
            self.description = self.product.description
            self.unit = self.product.unit
            self.gst_rate = self.product.gst_rate

            # Get HSN/SAC code
            if self.product.hsn_code:
                self.hsn_sac_code = self.product.hsn_code.code
            elif self.product.sac_code:
                self.hsn_sac_code = self.product.sac_code.code

        # Calculate line total
        self.line_total = self.quantity * self.unit_price

        super().save(*args, **kwargs)

        # Recalculate proforma totals only if not in bulk creation
        if not skip_totals_calculation:
            self.proforma_invoice.calculate_totals()


class Invoice(models.Model):
    """World-Class Tax Invoice - Official invoice with tax, can be created simultaneously with Proforma"""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent to Customer'),
        ('paid', 'Paid'),
        ('partially_paid', 'Partially Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partially_paid', 'Partially Paid'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='invoices', null=True, blank=True)
    proforma_invoice = models.ForeignKey(ProformaInvoice, on_delete=models.CASCADE, related_name='invoices', null=True, blank=True)

    # Invoice Details
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    invoice_date = models.DateField()
    due_date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)

    # Customer and Shipping Information
    customer_gstin = models.CharField(max_length=15, blank=True)
    company_gstin = models.CharField(max_length=15, blank=True)
    shipping_address = models.ForeignKey(CustomerShippingAddress, on_delete=models.SET_NULL, null=True, blank=True)

    # GST Information
    gst_type = models.CharField(max_length=10, choices=[
        ('igst', 'IGST'),
        ('cgst_sgst', 'CGST + SGST'),
        ('exempt', 'GST Exempt')
    ], default='igst')

    # Financial Information
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Tax Breakdown
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Additional Charges
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    shipping_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    other_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # World-Class Payment Information
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    outstanding_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    last_payment_date = models.DateField(null=True, blank=True, help_text="Date of last payment received")
    payment_due_date = models.DateField(null=True, blank=True, help_text="Payment due date")

    # Advanced Invoice Tracking
    invoice_type = models.CharField(
        max_length=20,
        choices=[
            ('tax_invoice', 'Tax Invoice'),
            ('proforma', 'Proforma Invoice'),
            ('credit_note', 'Credit Note'),
            ('debit_note', 'Debit Note'),
        ],
        default='tax_invoice',
        help_text="Type of invoice"
    )

    # Status and Notes
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)

    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_invoices')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_invoices'
        ordering = ['-created_at']
        unique_together = ['company', 'invoice_number']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name}"

    def save(self, *args, **kwargs):
        # Generate invoice number if not provided
        if not self.invoice_number:
            try:
                from authentication.utils import generate_auto_code
                self.invoice_number = generate_auto_code(self.company.id, 'invoice')
            except Exception as e:
                # Fallback to old system if auto-code fails
                latest_invoice = Invoice.objects.filter(
                    company=self.company
                ).order_by('-created_at').first()

                if latest_invoice and latest_invoice.invoice_number:
                    # Extract number from format INV-2025-000001
                    try:
                        parts = latest_invoice.invoice_number.split('-')
                        if len(parts) == 3 and parts[0] == 'INV':
                            year = parts[1]
                            number = int(parts[2])
                            current_year = timezone.now().year

                            if int(year) == current_year:
                                new_number = number + 1
                            else:
                                new_number = 1

                            self.invoice_number = f"INV-{current_year}-{new_number:06d}"
                        else:
                            self.invoice_number = f"INV-{timezone.now().year}-000001"
                    except (ValueError, IndexError):
                        self.invoice_number = f"INV-{timezone.now().year}-000001"
                else:
                    self.invoice_number = f"INV-{timezone.now().year}-000001"

        # Calculate outstanding amount
        self.outstanding_amount = self.total_amount - self.paid_amount

        # Update payment status based on amounts
        if self.paid_amount == 0:
            self.payment_status = 'unpaid'
        elif self.paid_amount >= self.total_amount:
            self.payment_status = 'paid'
        else:
            self.payment_status = 'partially_paid'

        # Check if overdue
        if self.payment_status != 'paid' and self.due_date < timezone.now().date():
            self.payment_status = 'overdue'

        super().save(*args, **kwargs)

        # Update PO balance tracking after save
        if self.purchase_order:
            self.purchase_order.update_balance_tracking()

    def calculate_totals(self):
        """Calculate all totals for this invoice"""
        from decimal import Decimal

        # Calculate subtotal from items
        subtotal = sum(item.line_total for item in self.invoice_items.all()) or Decimal('0')

        # Apply discount
        if self.discount_percentage > 0:
            discount_amount = subtotal * (self.discount_percentage / Decimal('100'))
        else:
            # Ensure discount_amount is Decimal
            discount_amount = Decimal(str(self.discount_amount)) if self.discount_amount else Decimal('0')

        subtotal_after_discount = subtotal - discount_amount

        # Calculate tax
        total_tax = Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = Decimal('0')

        if self.gst_type != 'exempt':
            for item in self.invoice_items.all():
                item_total = item.line_total
                item_tax = item_total * (item.gst_rate / Decimal('100'))
                total_tax += item_tax

                if self.gst_type == 'cgst_sgst':
                    cgst_amount += item_tax / Decimal('2')
                    sgst_amount += item_tax / Decimal('2')
                else:  # igst
                    igst_amount += item_tax

        # Calculate final total (ensure all values are Decimal)
        shipping_charges = Decimal(str(self.shipping_charges)) if self.shipping_charges else Decimal('0')
        other_charges = Decimal(str(self.other_charges)) if self.other_charges else Decimal('0')
        total_with_charges = subtotal_after_discount + shipping_charges + other_charges
        total_amount = total_with_charges + total_tax

        # Update fields
        self.subtotal = subtotal_after_discount
        self.discount_amount = discount_amount
        self.total_tax = total_tax
        self.cgst_amount = cgst_amount
        self.sgst_amount = sgst_amount
        self.igst_amount = igst_amount
        self.total_amount = total_amount
        self.outstanding_amount = total_amount - Decimal(str(self.paid_amount))

        # Save without triggering calculate_totals again
        super().save(update_fields=[
            'subtotal', 'total_tax', 'total_amount', 'discount_amount',
            'cgst_amount', 'sgst_amount', 'igst_amount', 'outstanding_amount'
        ])

    @property
    def customer_details(self):
        """Get customer details in dictionary format for PDF generation"""
        return {
            'name': self.customer.name,
            'address': self.customer.billing_address_line1,
            'city': self.customer.billing_city,
            'state': self.customer.billing_state,
            'pincode': self.customer.billing_pincode,
            'phone': self.customer.phone,
            'email': self.customer.email,
            'gst_number': self.customer.gstin,
        }


class Payment(models.Model):
    """World-Class Payment Tracking System - Links payments to specific invoice numbers"""

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('upi', 'UPI'),
        ('net_banking', 'Net Banking'),
        ('rtgs', 'RTGS'),
        ('neft', 'NEFT'),
        ('imps', 'IMPS'),
        ('other', 'Other'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    # Basic Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)

    # Invoice Linking (World-Class Feature)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    proforma_invoice = models.ForeignKey(ProformaInvoice, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)

    # Payment Details
    payment_number = models.CharField(max_length=50, unique=True, db_index=True)
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)

    # World-Class TDS (Tax Deducted at Source) Fields
    tds_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, help_text="TDS amount deducted")
    tds_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="TDS percentage applied")
    tds_section = models.CharField(max_length=20, blank=True, help_text="TDS section (194C, 194J, etc.)")
    net_amount_received = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, help_text="Amount received after TDS deduction")
    tds_certificate_number = models.CharField(max_length=100, blank=True, help_text="TDS certificate number")
    tds_certificate_date = models.DateField(null=True, blank=True, help_text="TDS certificate date")
    is_tds_received = models.BooleanField(default=False, help_text="Whether TDS certificate/refund is received")

    # Payment Reference Information
    reference_number = models.CharField(max_length=100, blank=True, help_text="Bank reference, cheque number, etc.")
    transaction_id = models.CharField(max_length=100, blank=True, help_text="Transaction ID from payment gateway")
    bank_name = models.CharField(max_length=100, blank=True)

    # Status and Notes
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='completed')
    notes = models.TextField(blank=True)

    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_payments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_payments'
        ordering = ['-payment_date', '-created_at']
        unique_together = ['company', 'payment_number']

    def __str__(self):
        invoice_info = f"INV: {self.invoice.invoice_number}" if self.invoice else f"PI: {self.proforma_invoice.proforma_number}" if self.proforma_invoice else "No Invoice"
        return f"{self.payment_number} - ₹{self.amount} - {invoice_info}"

    def save(self, *args, **kwargs):
        # Generate payment number if not provided
        if not self.payment_number:
            try:
                from authentication.utils import generate_auto_code
                self.payment_number = generate_auto_code(self.company.id, 'payment')
            except Exception as e:
                # Fallback to old system if auto-code fails
                latest_payment = Payment.objects.filter(
                    company=self.company
                ).order_by('-created_at').first()

                if latest_payment and latest_payment.payment_number:
                    try:
                        parts = latest_payment.payment_number.split('-')
                        if len(parts) == 3 and parts[0] == 'PAY':
                            year = parts[1]
                            number = int(parts[2])
                            current_year = timezone.now().year

                            if int(year) == current_year:
                                new_number = number + 1
                            else:
                                new_number = 1

                            self.payment_number = f"PAY-{current_year}-{new_number:06d}"
                        else:
                            self.payment_number = f"PAY-{timezone.now().year}-000001"
                    except (ValueError, IndexError):
                        self.payment_number = f"PAY-{timezone.now().year}-000001"
                else:
                    self.payment_number = f"PAY-{timezone.now().year}-000001"

        # World-Class TDS Calculation
        if self.tds_percentage > 0 and self.amount > 0:
            self.tds_amount = (self.amount * self.tds_percentage) / 100
            self.net_amount_received = self.amount - self.tds_amount
        elif self.tds_amount > 0:
            # If TDS amount is provided directly, calculate net amount
            self.net_amount_received = self.amount - self.tds_amount
            if self.amount > 0:
                self.tds_percentage = (self.tds_amount / self.amount) * 100
        else:
            # No TDS
            self.net_amount_received = self.amount

        super().save(*args, **kwargs)

        # Update related invoice/proforma payment status
        self.update_invoice_payment_status()

    def update_invoice_payment_status(self):
        """World-Class Payment Status Update - Includes proforma advances + direct payments"""
        if self.invoice:
            # Calculate direct payments for this invoice
            direct_payments = self.invoice.payments.filter(status='completed').aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')

            # Calculate proforma advances (if invoice was created from PO with proformas)
            proforma_advances = Decimal('0')
            if self.invoice.purchase_order:
                # Get proforma invoices that were paid as advances
                proforma_advances = self.invoice.purchase_order.proforma_invoices.aggregate(
                    total=models.Sum('paid_amount')
                )['total'] or Decimal('0')

            # Total paid = Direct payments + Proforma advances
            total_paid = direct_payments + proforma_advances

            self.invoice.paid_amount = total_paid
            self.invoice.outstanding_amount = self.invoice.total_amount - total_paid

            # Update payment status
            if self.invoice.outstanding_amount <= 0:
                self.invoice.payment_status = 'paid'
            elif total_paid > 0:
                self.invoice.payment_status = 'partially_paid'
            else:
                self.invoice.payment_status = 'unpaid'

            self.invoice.last_payment_date = self.payment_date
            self.invoice.save(update_fields=['paid_amount', 'outstanding_amount', 'payment_status', 'last_payment_date'])

        elif self.proforma_invoice:
            # Calculate total payments for this proforma
            total_payments = self.proforma_invoice.payments.filter(status='completed').aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')

            self.proforma_invoice.paid_amount = total_payments
            self.proforma_invoice.outstanding_amount = self.proforma_invoice.total_amount - total_payments

            # Update payment status
            if self.proforma_invoice.outstanding_amount <= 0:
                self.proforma_invoice.payment_status = 'paid'
            elif self.proforma_invoice.outstanding_amount < self.proforma_invoice.total_amount:
                self.proforma_invoice.payment_status = 'partially_paid'
            else:
                self.proforma_invoice.payment_status = 'unpaid'

            self.proforma_invoice.last_payment_date = self.payment_date
            self.proforma_invoice.save(update_fields=['paid_amount', 'outstanding_amount', 'payment_status', 'last_payment_date'])


class InvoiceItem(models.Model):
    """Individual items in an Invoice"""

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='invoice_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    # Item details (captured at time of invoice creation)
    product_name = models.CharField(max_length=255)
    product_code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    hsn_sac_code = models.CharField(max_length=20, blank=True)

    # Pricing and quantity
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=10)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=15, decimal_places=2)

    # Tax information
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)

    # Line item order
    line_number = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'finance_invoice_items'
        ordering = ['line_number']
        unique_together = ['invoice', 'line_number']

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.product_name}"

    @property
    def rate(self):
        """Alias for unit_price to match PDF generator expectations"""
        return self.unit_price

    @property
    def amount(self):
        """Calculate amount before tax (quantity * unit_price)"""
        return self.quantity * self.unit_price

    @property
    def tax_amount(self):
        """Calculate tax amount"""
        from decimal import Decimal
        amount = self.quantity * self.unit_price
        return amount * (self.gst_rate / Decimal('100'))

    def save(self, *args, **kwargs):
        skip_totals_calculation = kwargs.pop('skip_totals_calculation', False)

        # Calculate line total
        self.line_total = self.quantity * self.unit_price

        super().save(*args, **kwargs)

        # Recalculate invoice totals only if not in bulk creation
        if not skip_totals_calculation:
            self.invoice.calculate_totals()



