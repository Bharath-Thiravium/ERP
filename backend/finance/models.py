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
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.CASCADE, related_name='created_customers')
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
            # Auto-generate customer code
            last_customer = Customer.objects.filter(company=self.company).order_by('-id').first()
            if last_customer:
                last_number = int(last_customer.customer_code.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1
            self.customer_code = f"CUST-{new_number:06d}"

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
            # Get the latest PO number for this company
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

        super().save(*args, **kwargs)

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

        # Add other charges
        subtotal_with_charges = subtotal_after_discount + self.shipping_charges + self.other_charges

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


class ProformaInvoice(models.Model):
    """Proforma Invoice model - created from approved Purchase Orders"""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent to Customer'),
        ('approved', 'Approved by Customer'),
        ('converted', 'Converted to Invoice'),
        ('cancelled', 'Cancelled'),
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
            # Get the latest proforma number for this company
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

    def calculate_totals(self):
        """Calculate all totals for this proforma invoice"""
        from decimal import Decimal

        # Calculate subtotal from items
        subtotal = sum(item.line_total for item in self.proforma_items.all())

        # Apply discount
        if self.discount_percentage > 0:
            discount_amount = subtotal * (self.discount_percentage / 100)
        else:
            discount_amount = self.discount_amount

        subtotal_after_discount = subtotal - discount_amount

        # Calculate tax
        total_tax = Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = Decimal('0')

        if self.gst_type != 'exempt':
            for item in self.proforma_items.all():
                item_total = item.line_total
                item_tax = item_total * (item.gst_rate / 100)
                total_tax += item_tax

                if self.gst_type == 'cgst_sgst':
                    cgst_amount += item_tax / 2
                    sgst_amount += item_tax / 2
                else:  # igst
                    igst_amount += item_tax

        # Calculate final total
        total_with_charges = subtotal_after_discount + self.shipping_charges + self.other_charges
        total_amount = total_with_charges + total_tax

        # Update fields
        self.subtotal = subtotal_after_discount
        self.discount_amount = discount_amount
        self.total_tax = total_tax
        self.cgst_amount = cgst_amount
        self.sgst_amount = sgst_amount
        self.igst_amount = igst_amount
        self.total_amount = total_amount

        # Save without triggering calculate_totals again
        super().save(update_fields=[
            'subtotal', 'total_tax', 'total_amount', 'discount_amount',
            'cgst_amount', 'sgst_amount', 'igst_amount'
        ])


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
