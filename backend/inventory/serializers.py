from rest_framework import serializers
from django.core.exceptions import ValidationError
from .security_validators import InventorySecurityValidator
from .models import (
    Category, Supplier, Warehouse, Product, ProductVariant, ProductBundle, ProductBundleItem,
    StockLevel, StockMovement, StockAlert, InventoryAudit, InventoryAuditItem,
    PurchaseOrder, PurchaseOrderItem, CycleCount, CycleCountItem
)


def get_context_company(context):
    """Resolve the authenticated company from serializer context."""
    request = context.get('request')
    service_user = getattr(request, 'service_user', None) if request else None
    return service_user.company if service_user else None


def validate_same_company(value, context, label):
    """Ensure a referenced FK instance belongs to the authenticated company."""
    if value is None:
        return value
    company = get_context_company(context)
    if company is not None and getattr(value, 'company_id', None) != company.id:
        raise serializers.ValidationError(f'{label} not found or access denied.')
    return value


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer with AI insights"""
    subcategories_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'code', 'description', 'parent_category',
            'ai_suggested_attributes', 'demand_pattern', 'is_active',
            'subcategories_count', 'products_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['code', 'created_at', 'updated_at']

    def get_subcategories_count(self, obj):
        try:
            return obj.subcategories.filter(is_active=True).count()
        except Exception as e:
            import logging
            logging.error(f"Error getting subcategories count for category {obj.id}: {e}")
            return 0

    def get_products_count(self, obj):
        try:
            return obj.products.filter(is_active=True).count()
        except Exception as e:
            import logging
            logging.error(f"Error getting products count for category {obj.id}: {e}")
            return 0
    
    def validate_name(self, value):
        return InventorySecurityValidator.sanitize_input(value)

    def validate_description(self, value):
        return InventorySecurityValidator.sanitize_input(value)

    def validate_ai_suggested_attributes(self, value):
        return InventorySecurityValidator.validate_json_field(value)

    def validate_parent_category(self, value):
        if value is None:
            return value
        # Block self-reference
        if self.instance and value.id == self.instance.id:
            raise serializers.ValidationError('A category cannot be its own parent.')
        return validate_same_company(value, self.context, 'Parent category')


class SupplierSerializer(serializers.ModelSerializer):
    """Supplier serializer with performance metrics"""
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'supplier_code', 'contact_person', 'email', 'phone',
            'address', 'gst_number', 'pan_number', 'performance_score',
            'reliability_score', 'quality_score', 'payment_terms', 'credit_limit',
            'is_active', 'products_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['supplier_code', 'created_at', 'updated_at']

    def get_products_count(self, obj):
        try:
            return obj.primary_products.filter(is_active=True).count()
        except Exception:
            return 0
    
    def validate_name(self, value):
        return InventorySecurityValidator.sanitize_input(value)
    
    def validate_contact_person(self, value):
        return InventorySecurityValidator.sanitize_input(value)
    
    def validate_address(self, value):
        return InventorySecurityValidator.sanitize_input(value)
    
    def validate_email(self, value):
        return InventorySecurityValidator.validate_email(value)
    
    def validate_phone(self, value):
        return InventorySecurityValidator.validate_phone(value)
    
    def validate_gst_number(self, value):
        return InventorySecurityValidator.validate_gst_number(value)
    
    def validate_pan_number(self, value):
        return InventorySecurityValidator.validate_pan_number(value)


class WarehouseSerializer(serializers.ModelSerializer):
    """Warehouse serializer with capacity metrics"""
    capacity_utilization = serializers.ReadOnlyField()
    products_count = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Warehouse
        fields = [
            'id', 'name', 'code', 'address', 'city', 'state', 'pincode',
            'latitude', 'longitude', 'total_capacity', 'used_capacity',
            'capacity_utilization', 'manager', 'manager_name', 'is_active',
            'products_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['code', 'created_at', 'updated_at']

    def get_products_count(self, obj):
        return obj.stock_levels.filter(quantity_available__gt=0).count()

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def validate_manager(self, value):
        return validate_same_company(value, self.context, 'Manager')


class ProductVariantSerializer(serializers.ModelSerializer):
    """Product variant serializer"""
    current_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductVariant
        fields = [
            'id', 'variant_name', 'variant_code', 'attributes',
            'cost_price', 'selling_price', 'sku', 'barcode',
            'variant_image', 'is_active', 'current_stock', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_current_stock(self, obj):
        # For variants, we'd need to implement variant-specific stock tracking
        return 0


class StockLevelSerializer(serializers.ModelSerializer):
    """Stock level serializer"""
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    available_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = StockLevel
        fields = [
            'id', 'warehouse', 'warehouse_name', 'quantity_available',
            'quantity_reserved', 'quantity_on_order', 'available_stock',
            'bin_location', 'batch_number', 'serial_numbers', 'expiry_date',
            'last_updated'
        ]
        read_only_fields = ['last_updated']


class ProductListSerializer(serializers.ModelSerializer):
    """Product list serializer for listing view"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='primary_supplier.name', read_only=True)
    current_stock = serializers.ReadOnlyField()
    stock_value = serializers.ReadOnlyField()
    is_low_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'product_code', 'sku', 'category_name', 'supplier_name',
            'product_type', 'cost_price', 'selling_price', 'current_stock',
            'stock_value', 'is_low_stock', 'abc_classification', 'is_active',
            'created_at'
        ]

    def get_is_low_stock(self, obj):
        return obj.is_low_stock()


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed product serializer"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='primary_supplier.name', read_only=True)
    current_stock = serializers.ReadOnlyField()
    stock_value = serializers.ReadOnlyField()
    is_low_stock = serializers.SerializerMethodField()
    needs_reorder = serializers.SerializerMethodField()
    stock_levels = StockLevelSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'product_code', 'sku', 'category', 'category_name',
            'product_type', 'description', 'has_variants', 'variant_attributes',
            'cost_price', 'selling_price', 'mrp', 'hsn_code', 'tax_rate',
            'tracking_method', 'min_stock_level', 'max_stock_level',
            'reorder_point', 'reorder_quantity', 'weight', 'dimensions',
            'demand_forecast', 'seasonality_factor', 'abc_classification',
            'primary_supplier', 'supplier_name', 'primary_image',
            'additional_images', 'barcode', 'qr_code', 'is_active',
            'is_discontinued', 'current_stock', 'stock_value', 'is_low_stock',
            'needs_reorder', 'stock_levels', 'variants', 'created_at', 'updated_at'
        ]
        read_only_fields = ['product_code', 'created_at', 'updated_at']

    def get_is_low_stock(self, obj):
        return obj.is_low_stock()

    def get_needs_reorder(self, obj):
        return obj.needs_reorder()


class ProductCreateSerializer(serializers.ModelSerializer):
    """Product creation serializer"""
    
    class Meta:
        model = Product
        fields = [
            'name', 'category', 'product_type', 'description', 'has_variants',
            'variant_attributes', 'cost_price', 'selling_price', 'mrp',
            'hsn_code', 'tax_rate', 'tracking_method', 'min_stock_level',
            'max_stock_level', 'reorder_point', 'reorder_quantity',
            'weight', 'dimensions', 'primary_supplier', 'primary_image',
            'additional_images', 'barcode', 'qr_code', 'is_active'
        ]

    def validate_barcode(self, value):
        if value:
            try:
                validated_barcode = InventorySecurityValidator.validate_barcode(value)
                if Product.objects.filter(barcode=validated_barcode).exists():
                    raise serializers.ValidationError("Barcode must be unique.")
                return validated_barcode
            except ValidationError as e:
                raise serializers.ValidationError(str(e))
        return value
    
    def validate_name(self, value):
        return InventorySecurityValidator.sanitize_input(value)

    def validate_description(self, value):
        return InventorySecurityValidator.sanitize_input(value)

    def validate_hsn_code(self, value):
        return InventorySecurityValidator.validate_hsn_code(value)

    def validate_category(self, value):
        return validate_same_company(value, self.context, 'Category')

    def validate_primary_supplier(self, value):
        return validate_same_company(value, self.context, 'Supplier')
    
    def validate_variant_attributes(self, value):
        return InventorySecurityValidator.validate_json_field(value)
    
    def validate_dimensions(self, value):
        return InventorySecurityValidator.validate_json_field(value)
    
    def validate_additional_images(self, value):
        if not value:
            return []
        
        validated_images = []
        for img_url in value:
            try:
                validated_url = InventorySecurityValidator.validate_image_url(img_url)
                validated_images.append(validated_url)
            except ValidationError as e:
                import logging
                logging.warning(f"Invalid image URL skipped: {img_url} - {e}")
                continue
        return validated_images


class StockMovementSerializer(serializers.ModelSerializer):
    """Stock movement serializer"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'warehouse', 'warehouse_name',
            'movement_type', 'quantity', 'unit_cost', 'reference_number',
            'quantity_before', 'quantity_after', 'notes', 'batch_number',
            'expiry_date', 'destination_warehouse', 'adjustment_reason',
            'damage_reason', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['created_at']

    def validate_product(self, value):
        return validate_same_company(value, self.context, 'Product')

    def validate_warehouse(self, value):
        return validate_same_company(value, self.context, 'Warehouse')

    def validate_destination_warehouse(self, value):
        return validate_same_company(value, self.context, 'Destination warehouse')


class StockAlertSerializer(serializers.ModelSerializer):
    """Stock alert serializer"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.sku', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True)
    threshold_value = serializers.IntegerField(source='product.min_stock_level', read_only=True)

    class Meta:
        model = StockAlert
        fields = [
            'id', 'product', 'product_name', 'product_code', 'warehouse', 'warehouse_name',
            'alert_type', 'priority', 'message', 'current_stock', 'threshold_value',
            'suggested_action', 'is_resolved', 'resolved_at', 'resolved_by_name',
            'is_ai_generated', 'ai_confidence', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_product(self, value):
        return validate_same_company(value, self.context, 'Product')

    def validate_warehouse(self, value):
        return validate_same_company(value, self.context, 'Warehouse')


class InventoryAuditItemSerializer(serializers.ModelSerializer):
    """Inventory audit item serializer"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    audited_by_name = serializers.CharField(source='audited_by.full_name', read_only=True)
    
    class Meta:
        model = InventoryAuditItem
        fields = [
            'id', 'product', 'product_name', 'expected_quantity',
            'actual_quantity', 'difference', 'unit_cost', 'value_difference',
            'notes', 'reason_for_difference', 'audited_by', 'audited_by_name',
            'audited_at'
        ]
        read_only_fields = ['difference', 'value_difference', 'audited_at']

    def validate_product(self, value):
        return validate_same_company(value, self.context, 'Product')


class InventoryAuditSerializer(serializers.ModelSerializer):
    """Inventory audit serializer"""
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    audit_items = InventoryAuditItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = InventoryAudit
        fields = [
            'id', 'audit_name', 'audit_number', 'warehouse', 'warehouse_name',
            'categories', 'products', 'audit_date', 'status',
            'total_products_audited', 'discrepancies_found', 'total_value_difference',
            'audit_team', 'supervisor', 'supervisor_name', 'audit_items',
            'created_at', 'completed_at'
        ]
        read_only_fields = ['audit_number', 'created_at', 'completed_at']

    def validate_warehouse(self, value):
        return validate_same_company(value, self.context, 'Warehouse')

    def validate_supervisor(self, value):
        return validate_same_company(value, self.context, 'Supervisor')

    def validate_categories(self, value):
        company = get_context_company(self.context)
        if company is not None:
            for category in value:
                if category.company_id != company.id:
                    raise serializers.ValidationError('One or more categories not found or access denied.')
        return value

    def validate_products(self, value):
        company = get_context_company(self.context)
        if company is not None:
            for product in value:
                if product.company_id != company.id:
                    raise serializers.ValidationError('One or more products not found or access denied.')
        return value

    def validate_audit_team(self, value):
        company = get_context_company(self.context)
        if company is not None:
            for employee in value:
                if employee.company_id != company.id:
                    raise serializers.ValidationError('One or more audit team members not found or access denied.')
        return value


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Purchase order item serializer"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    quantity_pending = serializers.ReadOnlyField()
    is_fully_received = serializers.ReadOnlyField()
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'quantity_ordered',
            'quantity_received', 'quantity_pending', 'unit_price',
            'total_price', 'notes', 'is_fully_received', 'created_at'
        ]
        read_only_fields = ['total_price', 'created_at']

    def validate_product(self, value):
        return validate_same_company(value, self.context, 'Product')


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Purchase order serializer"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'supplier', 'supplier_name', 'warehouse',
            'warehouse_name', 'order_date', 'expected_delivery_date',
            'actual_delivery_date', 'status', 'subtotal', 'tax_amount',
            'total_amount', 'notes', 'terms_conditions', 'created_by_name',
            'approved_by_name', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['po_number', 'created_at', 'updated_at']

    def validate_supplier(self, value):
        return validate_same_company(value, self.context, 'Supplier')

    def validate_warehouse(self, value):
        return validate_same_company(value, self.context, 'Warehouse')


class ProductBundleItemSerializer(serializers.ModelSerializer):
    """Product bundle item serializer"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    effective_price = serializers.ReadOnlyField()
    line_total = serializers.ReadOnlyField()

    class Meta:
        model = ProductBundleItem
        fields = [
            'id', 'product', 'product_name', 'quantity',
            'unit_price_override', 'effective_price', 'line_total',
            'created_at'
        ]
        read_only_fields = ['created_at']

    def validate_product(self, value):
        return validate_same_company(value, self.context, 'Product')


class ProductBundleSerializer(serializers.ModelSerializer):
    """Product bundle serializer"""
    bundle_items = ProductBundleItemSerializer(many=True, read_only=True)
    total_cost = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    
    class Meta:
        model = ProductBundle
        fields = [
            'id', 'bundle_name', 'bundle_code', 'description',
            'bundle_price', 'discount_percentage', 'bundle_image',
            'is_active', 'bundle_items', 'total_cost', 'profit_margin',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['bundle_code', 'created_at', 'updated_at']


class CycleCountItemSerializer(serializers.ModelSerializer):
    """Cycle count item serializer"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    counted_by_name = serializers.CharField(source='counted_by.full_name', read_only=True)
    
    class Meta:
        model = CycleCountItem
        fields = [
            'id', 'product', 'product_name', 'expected_quantity',
            'counted_quantity', 'variance', 'is_counted', 'notes',
            'counted_by', 'counted_by_name', 'counted_at'
        ]
        read_only_fields = ['variance', 'counted_at']

    def validate_product(self, value):
        return validate_same_company(value, self.context, 'Product')


class CycleCountSerializer(serializers.ModelSerializer):
    """Cycle count serializer"""
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    count_items = CycleCountItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = CycleCount
        fields = [
            'id', 'count_name', 'count_number', 'warehouse', 'warehouse_name',
            'frequency', 'next_count_date', 'last_count_date', 'abc_classes',
            'categories', 'status', 'items_counted', 'discrepancies_found',
            'accuracy_percentage', 'count_items', 'created_at', 'completed_at'
        ]
        read_only_fields = ['count_number', 'created_at', 'completed_at']

    def validate_warehouse(self, value):
        return validate_same_company(value, self.context, 'Warehouse')

    def validate_categories(self, value):
        company = get_context_company(self.context)
        if company is not None:
            for category in value:
                if category.company_id != company.id:
                    raise serializers.ValidationError('One or more categories not found or access denied.')
        return value


class InventoryDashboardSerializer(serializers.Serializer):
    """Dashboard statistics serializer"""
    total_products = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    total_suppliers = serializers.IntegerField()
    total_warehouses = serializers.IntegerField()
    total_stock_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    low_stock_products = serializers.IntegerField()
    out_of_stock_products = serializers.IntegerField()
    pending_alerts = serializers.IntegerField()
    recent_movements = serializers.ListField()
    top_products = serializers.ListField()
    warehouse_utilization = serializers.ListField()