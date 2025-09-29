from html import escape
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone
from authentication.models import Company, CompanyServiceUser
from decimal import Decimal
import json


class Category(models.Model):
    """AI-enhanced product categories"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='inventory_categories')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    parent_category = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    
    # AI Features
    ai_suggested_attributes = models.JSONField(default=list, help_text="AI-suggested product attributes for this category")
    demand_pattern = models.CharField(max_length=20, choices=[
        ('seasonal', 'Seasonal'),
        ('trending', 'Trending'),
        ('stable', 'Stable'),
        ('declining', 'Declining')
    ], default='stable')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'code']
        ordering = ['name']
        verbose_name_plural = "Categories"

    def __str__(self):
        return escape(f"{self.code} - {self.name}")

    def save(self, *args, **kwargs):
        if not self.code:
            try:
                from authentication.utils import generate_auto_code
                self.code = generate_auto_code(self.company.id, 'category')
            except Exception:
                # Fallback to old system if auto-code fails
                last_category = Category.objects.filter(
                    company=self.company,
                    code__startswith='CAT-'
                ).order_by('-id').first()
                if last_category:
                    last_number = int(last_category.code.split('-')[-1])
                    self.code = f"CAT-{last_number + 1:06d}"
                else:
                    self.code = "CAT-000001"
        super().save(*args, **kwargs)


class Supplier(models.Model):
    """Intelligent supplier management"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='suppliers')
    name = models.CharField(max_length=200)
    supplier_code = models.CharField(max_length=20, unique=True)
    
    # Contact Information
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    
    # Business Details
    gst_number = models.CharField(max_length=15, blank=True)
    pan_number = models.CharField(max_length=10, blank=True)
    
    # AI Performance Metrics
    performance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="AI-calculated supplier performance")
    reliability_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Delivery reliability score")
    quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Product quality score")
    
    # Payment Terms
    payment_terms = models.CharField(max_length=50, default='Net 30')
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_suppliers')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'supplier_code']
        ordering = ['name']

    def __str__(self):
        return escape(f"{self.supplier_code} - {self.name}")

    def save(self, *args, **kwargs):
        if not self.supplier_code:
            try:
                from authentication.utils import generate_auto_code
                self.supplier_code = generate_auto_code(self.company.id, 'supplier')
            except Exception:
                # Fallback to old system if auto-code fails
                last_supplier = Supplier.objects.filter(
                    company=self.company,
                    supplier_code__startswith='SUP-'
                ).order_by('-id').first()
                if last_supplier:
                    last_number = int(last_supplier.supplier_code.split('-')[-1])
                    self.supplier_code = f"SUP-{last_number + 1:06d}"
                else:
                    self.supplier_code = "SUP-000001"
        super().save(*args, **kwargs)


class Warehouse(models.Model):
    """Multi-location warehouse management"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='warehouses')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    
    # Location Details
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    
    # Geo-location for AR/GPS features
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    # Warehouse Details
    total_capacity = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total storage capacity")
    used_capacity = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Currently used capacity")
    
    # Manager
    manager = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_warehouses')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'code']
        ordering = ['name']

    def __str__(self):
        return escape(f"{self.code} - {self.name}")

    def save(self, *args, **kwargs):
        if not self.code:
            try:
                from authentication.utils import generate_auto_code
                self.code = generate_auto_code(self.company.id, 'warehouse')
            except Exception:
                # Fallback to old system if auto-code fails
                last_warehouse = Warehouse.objects.filter(
                    company=self.company,
                    code__startswith='WH-'
                ).order_by('-id').first()
                if last_warehouse:
                    last_number = int(last_warehouse.code.split('-')[-1])
                    self.code = f"WH-{last_number + 1:06d}"
                else:
                    self.code = "WH-000001"
        super().save(*args, **kwargs)

    @property
    def capacity_utilization(self):
        """Calculate capacity utilization percentage"""
        if self.total_capacity > 0:
            return (self.used_capacity / self.total_capacity) * 100
        return 0


class Product(models.Model):
    """AI-enhanced product management"""
    PRODUCT_TYPES = [
        ('finished_good', 'Finished Good'),
        ('raw_material', 'Raw Material'),
        ('semi_finished', 'Semi-Finished'),
        ('consumable', 'Consumable'),
        ('service', 'Service'),
        ('digital', 'Digital Product')
    ]

    TRACKING_METHODS = [
        ('none', 'No Tracking'),
        ('serial', 'Serial Number'),
        ('batch', 'Batch/Lot'),
        ('expiry', 'Expiry Date'),
        ('fifo', 'FIFO'),
        ('lifo', 'LIFO')
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='inventory_products')
    name = models.CharField(max_length=200)
    product_code = models.CharField(max_length=50, unique=True)
    sku = models.CharField(max_length=50, unique=True, help_text="Stock Keeping Unit")
    
    # Product Details
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES, default='finished_good')
    description = models.TextField(blank=True)
    
    # Variants Support
    has_variants = models.BooleanField(default=False)
    variant_attributes = models.JSONField(default=list, help_text="List of variant attributes like size, color")
    
    # Pricing
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    mrp = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Maximum Retail Price")
    
    # Tax Information
    hsn_code = models.CharField(max_length=10, blank=True, help_text="HSN/SAC Code")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="GST Rate %")
    
    # Inventory Tracking
    tracking_method = models.CharField(max_length=20, choices=TRACKING_METHODS, default='none')
    min_stock_level = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Minimum stock alert level")
    max_stock_level = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Maximum stock level")
    reorder_point = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Auto-reorder trigger point")
    reorder_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Quantity to reorder")
    
    # Physical Properties
    weight = models.DecimalField(max_digits=10, decimal_places=3, default=0, help_text="Weight in KG")
    dimensions = models.JSONField(default=dict, help_text="Length, Width, Height in CM")
    
    # AI Features
    demand_forecast = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="AI-predicted demand")
    seasonality_factor = models.DecimalField(max_digits=5, decimal_places=2, default=1.0, help_text="Seasonal demand multiplier")
    abc_classification = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C')], default='C')
    
    # Supplier Information
    primary_supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='primary_products')
    alternative_suppliers = models.ManyToManyField(Supplier, blank=True, related_name='alternative_products')
    
    # Product Images
    primary_image = models.ImageField(upload_to='product_images/', null=True, blank=True)
    additional_images = models.JSONField(default=list, help_text="List of additional image URLs")
    
    # Barcode
    barcode = models.CharField(max_length=50, blank=True, unique=True)
    qr_code = models.TextField(blank=True, help_text="QR code data")
    
    # Status
    is_active = models.BooleanField(default=True)
    is_discontinued = models.BooleanField(default=False)
    
    # Audit
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_inventory_products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'product_code']
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.product_code} - {self.name}")

    def save(self, *args, **kwargs):
        if not self.product_code:
            try:
                from authentication.utils import generate_auto_code
                self.product_code = generate_auto_code(self.company.id, 'product')
            except Exception:
                # Fallback to old system if auto-code fails
                last_product = Product.objects.filter(
                    company=self.company,
                    product_code__startswith='PRD-'
                ).order_by('-id').first()
                if last_product:
                    last_number = int(last_product.product_code.split('-')[-1])
                    self.product_code = f"PRD-{last_number + 1:06d}"
                else:
                    self.product_code = "PRD-000001"
        
        if not self.sku:
            self.sku = self.product_code
            
        super().save(*args, **kwargs)

    @property
    def current_stock(self):
        """Get current total stock across all warehouses"""
        return self.stock_levels.aggregate(
            total=models.Sum('quantity_available')
        )['total'] or 0

    @property
    def stock_value(self):
        """Calculate total stock value"""
        return self.current_stock * self.cost_price

    def is_low_stock(self):
        """Check if product is below minimum stock level"""
        return self.current_stock <= self.min_stock_level

    def needs_reorder(self):
        """Check if product needs reordering"""
        return self.current_stock <= self.reorder_point


class ProductVariant(models.Model):
    """Product variants (size, color, etc.)"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    variant_name = models.CharField(max_length=100)
    variant_code = models.CharField(max_length=50, unique=True)
    
    # Variant Attributes
    attributes = models.JSONField(default=dict, help_text="Variant attributes like {'size': 'L', 'color': 'Red'}")
    
    # Pricing (can override parent product)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Inventory
    sku = models.CharField(max_length=50, unique=True)
    barcode = models.CharField(max_length=50, blank=True, unique=True)
    
    # Images
    variant_image = models.ImageField(upload_to='product_variants/', null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['product', 'variant_code']

    def __str__(self):
        return escape(f"{self.product.name} - {self.variant_name}")


class StockLevel(models.Model):
    """Real-time stock levels per warehouse"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_levels')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock_levels')
    
    # Stock Quantities
    quantity_available = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity_reserved = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Reserved for orders")
    quantity_on_order = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Incoming stock")
    
    # Location within warehouse
    bin_location = models.CharField(max_length=50, blank=True, help_text="Specific location within warehouse")
    
    # Batch/Serial tracking
    batch_number = models.CharField(max_length=50, blank=True)
    serial_numbers = models.JSONField(default=list, help_text="List of serial numbers")
    expiry_date = models.DateField(null=True, blank=True)
    
    # Last updated
    last_updated = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)

    class Meta:
        unique_together = ['product', 'warehouse']
        ordering = ['-last_updated']

    def __str__(self):
        return escape(f"{self.product.name} @ {self.warehouse.name}: {self.quantity_available}")

    @property
    def available_stock(self):
        """Available stock (total - reserved)"""
        return self.quantity_available - self.quantity_reserved


class StockMovement(models.Model):
    """Track all stock movements for audit trail"""
    MOVEMENT_TYPES = [
        ('in', 'Stock In - Initial inventory entry'),
        ('out', 'Stock Out - General removal'),
        ('purchase', 'Purchase - From supplier'),
        ('sale', 'Sale - To customer'),
        ('return', 'Return - Customer/Supplier return'),
        ('transfer', 'Transfer - Between warehouses'),
        ('adjustment', 'Adjustment - Stock correction'),
        ('damage', 'Damage/Loss - Damaged items'),
        ('production', 'Production - Manufacturing output')
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    
    # Movement Details
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reference_number = models.CharField(max_length=50, blank=True, help_text="PO, SO, or other reference")
    
    # Before/After quantities for audit
    quantity_before = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity_after = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Additional Details
    notes = models.TextField(blank=True)
    batch_number = models.CharField(max_length=50, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    # Movement Type Specific Fields
    adjustment_reason = models.CharField(max_length=50, blank=True, choices=[
        ('cycle_count', 'Cycle Count'),
        ('physical_audit', 'Physical Audit'),
        ('system_error', 'System Error'),
        ('damaged_found', 'Damaged Items Found'),
        ('expired_items', 'Expired Items'),
        ('other', 'Other')
    ])
    damage_reason = models.CharField(max_length=50, blank=True, choices=[
        ('physical_damage', 'Physical Damage'),
        ('expired', 'Expired'),
        ('theft', 'Theft'),
        ('lost', 'Lost'),
        ('quality_issue', 'Quality Issue'),
        ('other', 'Other')
    ])
    
    # Transfer details (if movement_type is 'transfer')
    destination_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, null=True, blank=True, related_name='incoming_transfers')
    
    # Audit
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.movement_type.title()}: {self.product.name} ({self.quantity})")


class StockAlert(models.Model):
    """AI-powered stock alerts"""
    ALERT_TYPES = [
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
        ('overstock', 'Overstock'),
        ('expiry_warning', 'Expiry Warning'),
        ('reorder_suggestion', 'Reorder Suggestion'),
        ('demand_spike', 'Demand Spike'),
        ('slow_moving', 'Slow Moving')
    ]

    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical')
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='stock_alerts')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_alerts')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock_alerts', null=True, blank=True)
    
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    
    # Alert Details
    message = models.TextField()
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    suggested_action = models.TextField(blank=True, help_text="AI-suggested action")
    
    # Status
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    
    # Auto-generated by AI
    is_ai_generated = models.BooleanField(default=True)
    ai_confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="AI confidence score")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.get_alert_type_display()}: {self.product.name}")


class InventoryAudit(models.Model):
    """Physical inventory audits"""
    AUDIT_STATUS = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='inventory_audits')
    audit_name = models.CharField(max_length=100)
    audit_number = models.CharField(max_length=50, unique=True)
    
    # Audit Scope
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='audits')
    categories = models.ManyToManyField(Category, blank=True, help_text="Categories to audit")
    products = models.ManyToManyField(Product, blank=True, help_text="Specific products to audit")
    
    # Audit Details
    audit_date = models.DateField()
    status = models.CharField(max_length=20, choices=AUDIT_STATUS, default='planned')
    
    # Results
    total_products_audited = models.IntegerField(default=0)
    discrepancies_found = models.IntegerField(default=0)
    total_value_difference = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Team
    audit_team = models.ManyToManyField('hr.Employee', blank=True, related_name='inventory_audits')
    supervisor = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_audits')
    
    # Audit
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.audit_number} - {self.audit_name}")

    def save(self, *args, **kwargs):
        if not self.audit_number:
            try:
                from authentication.utils import generate_auto_code
                self.audit_number = generate_auto_code(self.company.id, 'audit')
            except Exception:
                # Fallback to old system if auto-code fails
                last_audit = InventoryAudit.objects.filter(
                    company=self.company,
                    audit_number__startswith='AUD-'
                ).order_by('-id').first()
                if last_audit:
                    last_number = int(last_audit.audit_number.split('-')[-1])
                    self.audit_number = f"AUD-{last_number + 1:06d}"
                else:
                    self.audit_number = "AUD-000001"
        super().save(*args, **kwargs)


class InventoryAuditItem(models.Model):
    """Individual audit items"""
    audit = models.ForeignKey(InventoryAudit, on_delete=models.CASCADE, related_name='audit_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    
    # Expected vs Actual
    expected_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    difference = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Value Impact
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    value_difference = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Notes
    notes = models.TextField(blank=True)
    reason_for_difference = models.CharField(max_length=200, blank=True)
    
    # Audit Details
    audited_by = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True)
    audited_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.difference = self.actual_quantity - self.expected_quantity
        self.value_difference = self.difference * self.unit_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return escape(f"{self.audit.audit_number} - {self.product.name}")


class PurchaseOrder(models.Model):
    """Purchase Order Management"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('ordered', 'Ordered'),
        ('partial', 'Partially Received'),
        ('received', 'Fully Received'),
        ('cancelled', 'Cancelled')
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='inventory_purchase_orders')
    po_number = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='purchase_orders')
    
    # Order Details
    order_date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Financial
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Notes
    notes = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    
    # Audit
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    approved_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_purchase_orders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return escape(f"{self.po_number} - {self.supplier.name}")

    def save(self, *args, **kwargs):
        if not self.po_number:
            try:
                from authentication.utils import generate_auto_code
                self.po_number = generate_auto_code(self.company.id, 'inventory_purchase_order')
            except Exception:
                # Fallback to old system if auto-code fails
                last_po = PurchaseOrder.objects.filter(
                    company=self.company,
                    po_number__startswith='PO-'
                ).order_by('-id').first()
                if last_po:
                    last_number = int(last_po.po_number.split('-')[-1])
                    self.po_number = f"PO-{last_number + 1:06d}"
                else:
                    self.po_number = "PO-000001"
        super().save(*args, **kwargs)


class PurchaseOrderItem(models.Model):
    """Purchase Order Line Items"""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    
    # Quantities
    quantity_ordered = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Pricing
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Notes
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity_ordered * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return escape(f"{self.purchase_order.po_number} - {self.product.name}")

    @property
    def quantity_pending(self):
        return self.quantity_ordered - self.quantity_received

    @property
    def is_fully_received(self):
        return self.quantity_received >= self.quantity_ordered