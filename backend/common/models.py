from html import escape

from django.db import models

from authentication.models import Company


class DataSharingPolicy(models.Model):
    """Per-company controls for cross-module master-data sharing."""

    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name='data_sharing_policy',
    )
    crm_to_finance_customers = models.BooleanField(default=False)
    finance_to_crm_customers = models.BooleanField(default=False)
    inventory_to_finance_products = models.BooleanField(default=False)
    finance_to_inventory_products = models.BooleanField(default=False)
    crm_opportunity_to_finance_quotation = models.BooleanField(default=False)
    auto_sync_enabled = models.BooleanField(default=False)
    require_manual_approval = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'common_data_sharing_policies'
        verbose_name = 'Data Sharing Policy'
        verbose_name_plural = 'Data Sharing Policies'

    def __str__(self):
        return escape(f"Data sharing - {self.company.name}")


class MasterCustomer(models.Model):
    """Company-level customer identity shared by CRM and Finance when enabled."""

    CUSTOMER_TYPE_CHOICES = [
        ('individual', 'Individual'),
        ('business', 'Business'),
        ('government', 'Government'),
        ('ngo', 'NGO/Non-Profit'),
        ('unknown', 'Unknown'),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='master_customers',
    )
    master_code = models.CharField(max_length=50, db_index=True)
    customer_type = models.CharField(
        max_length=20,
        choices=CUSTOMER_TYPE_CHOICES,
        default='unknown',
    )
    name = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    gstin = models.CharField(max_length=15, blank=True, null=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    billing_address_line1 = models.CharField(max_length=255, blank=True)
    billing_address_line2 = models.CharField(max_length=255, blank=True)
    billing_city = models.CharField(max_length=100, blank=True)
    billing_state = models.CharField(max_length=100, blank=True)
    billing_pincode = models.CharField(max_length=10, blank=True)
    billing_country = models.CharField(max_length=100, default='India')
    source_module = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'common_master_customers'
        unique_together = ['company', 'master_code']
        indexes = [
            models.Index(fields=['company', 'name']),
            models.Index(fields=['company', 'email']),
            models.Index(fields=['company', 'gstin']),
            models.Index(fields=['company', 'is_active']),
        ]
        ordering = ['name']

    def __str__(self):
        return escape(f"{self.master_code} - {self.name}")

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = self.name
        if not self.master_code:
            self.master_code = self._generate_master_code()
        super().save(*args, **kwargs)

    def _generate_master_code(self):
        prefix = getattr(self.company, 'company_prefix', 'COMP')
        last = MasterCustomer.objects.filter(
            company=self.company,
            master_code__startswith=f'{prefix}MCUS',
        ).order_by('-id').first()
        next_number = 1
        if last and last.master_code:
            try:
                next_number = int(last.master_code[-6:]) + 1
            except ValueError:
                next_number = 1
        return f'{prefix}MCUS{next_number:06d}'


class MasterProduct(models.Model):
    """Company-level product identity shared by Finance and Inventory when enabled."""

    PRODUCT_TYPE_CHOICES = [
        ('product', 'Product'),
        ('service', 'Service'),
        ('raw_material', 'Raw Material'),
        ('finished_good', 'Finished Good'),
        ('digital', 'Digital Product'),
        ('unknown', 'Unknown'),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='master_products',
    )
    master_code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=255)
    product_type = models.CharField(
        max_length=30,
        choices=PRODUCT_TYPE_CHOICES,
        default='unknown',
    )
    description = models.TextField(blank=True)
    hsn_code = models.CharField(max_length=20, blank=True)
    sac_code = models.CharField(max_length=20, blank=True)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    base_unit = models.CharField(max_length=20, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_stock_tracked = models.BooleanField(default=False)
    source_module = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'common_master_products'
        unique_together = ['company', 'master_code']
        indexes = [
            models.Index(fields=['company', 'name']),
            models.Index(fields=['company', 'master_code']),
            models.Index(fields=['company', 'is_active']),
        ]
        ordering = ['name']

    def __str__(self):
        return escape(f"{self.master_code} - {self.name}")

    def save(self, *args, **kwargs):
        if not self.master_code:
            self.master_code = self._generate_master_code()
        super().save(*args, **kwargs)

    def _generate_master_code(self):
        prefix = getattr(self.company, 'company_prefix', 'COMP')
        last = MasterProduct.objects.filter(
            company=self.company,
            master_code__startswith=f'{prefix}MPRD',
        ).order_by('-id').first()
        next_number = 1
        if last and last.master_code:
            try:
                next_number = int(last.master_code[-6:]) + 1
            except ValueError:
                next_number = 1
        return f'{prefix}MPRD{next_number:06d}'


class ServiceDataLink(models.Model):
    """Link a master record to the module-specific record that represents it."""

    SYNC_STATUS_CHOICES = [
        ('linked', 'Linked'),
        ('pending', 'Pending'),
        ('conflict', 'Conflict'),
        ('disabled', 'Disabled'),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='service_data_links',
    )
    master_customer = models.ForeignKey(
        MasterCustomer,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='service_links',
    )
    master_product = models.ForeignKey(
        MasterProduct,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='service_links',
    )
    service_type = models.CharField(max_length=30)
    object_model = models.CharField(max_length=100)
    object_id = models.PositiveBigIntegerField()
    sync_status = models.CharField(
        max_length=20,
        choices=SYNC_STATUS_CHOICES,
        default='linked',
    )
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'common_service_data_links'
        unique_together = ['service_type', 'object_model', 'object_id']
        indexes = [
            models.Index(fields=['company', 'service_type']),
            models.Index(fields=['object_model', 'object_id']),
            models.Index(fields=['sync_status']),
        ]

    def __str__(self):
        return escape(f"{self.service_type}:{self.object_model}:{self.object_id}")


class SyncApprovalRequest(models.Model):
    """Approval queue item for creating cross-module counterpart records."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('failed', 'Failed'),
    ]

    REQUEST_TYPE_CHOICES = [
        ('crm_account_to_finance_customer', 'CRM account to Finance customer'),
        ('crm_contact_to_finance_customer', 'CRM contact to Finance customer'),
        ('finance_customer_to_crm_account', 'Finance customer to CRM account'),
        ('finance_customer_to_crm_contact', 'Finance customer to CRM contact'),
        ('inventory_product_to_finance_product', 'Inventory product to Finance product'),
        ('finance_product_to_inventory_product', 'Finance product to Inventory product'),
        ('delete_shared_record', 'Delete shared record'),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='sync_approval_requests',
    )
    request_type = models.CharField(max_length=60, choices=REQUEST_TYPE_CHOICES)
    source_service = models.CharField(max_length=30)
    target_service = models.CharField(max_length=30)
    source_model = models.CharField(max_length=100)
    source_object_id = models.PositiveBigIntegerField()
    target_model = models.CharField(max_length=100, blank=True)
    target_object_id = models.PositiveBigIntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    suggested_data = models.JSONField(default=dict, blank=True)
    approval_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_sync_requests',
    )

    class Meta:
        db_table = 'common_sync_approval_requests'
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['request_type']),
            models.Index(fields=['source_model', 'source_object_id']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['request_type', 'source_model', 'source_object_id', 'status'],
                condition=models.Q(status='pending'),
                name='common_sync_one_pending_per_source',
            ),
        ]

    def __str__(self):
        return escape(f"{self.get_request_type_display()} - {self.title}")
