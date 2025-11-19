from django.contrib import admin
from .models import (
    Category, Supplier, Warehouse, Product, ProductVariant, ProductBundle, ProductBundleItem,
    StockLevel, StockMovement, StockAlert, InventoryAudit, InventoryAuditItem,
    PurchaseOrder, PurchaseOrderItem, CycleCount, CycleCountItem
)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'company', 'demand_pattern', 'is_active', 'created_at']
    list_filter = ['company', 'demand_pattern', 'is_active']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'supplier_code', 'company', 'performance_score', 'is_active']
    list_filter = ['company', 'is_active']
    search_fields = ['name', 'supplier_code', 'email']
    readonly_fields = ['supplier_code', 'created_at', 'updated_at']

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'company', 'city', 'capacity_utilization', 'is_active']
    list_filter = ['company', 'city', 'is_active']
    search_fields = ['name', 'code', 'address']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'product_code', 'company', 'category', 'product_type', 'current_stock', 'is_active']
    list_filter = ['company', 'category', 'product_type', 'abc_classification', 'is_active']
    search_fields = ['name', 'product_code', 'sku', 'barcode']
    readonly_fields = ['product_code', 'current_stock', 'stock_value', 'created_at', 'updated_at']
    filter_horizontal = ['alternative_suppliers']

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['variant_name', 'variant_code', 'product', 'is_active']
    list_filter = ['product__company', 'is_active']
    search_fields = ['variant_name', 'variant_code', 'sku']

@admin.register(StockLevel)
class StockLevelAdmin(admin.ModelAdmin):
    list_display = ['product', 'warehouse', 'quantity_available', 'quantity_reserved', 'last_updated']
    list_filter = ['warehouse', 'product__company']
    search_fields = ['product__name', 'warehouse__name']
    readonly_fields = ['available_stock', 'last_updated']

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'warehouse', 'movement_type', 'quantity', 'created_at']
    list_filter = ['movement_type', 'warehouse', 'created_at']
    search_fields = ['product__name', 'reference_number']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'

@admin.register(StockAlert)
class StockAlertAdmin(admin.ModelAdmin):
    list_display = ['product', 'alert_type', 'priority', 'is_resolved', 'created_at']
    list_filter = ['alert_type', 'priority', 'is_resolved', 'is_ai_generated']
    search_fields = ['product__name', 'message']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['mark_resolved']
    
    def mark_resolved(self, request, queryset):
        queryset.update(is_resolved=True)
    mark_resolved.short_description = "Mark selected alerts as resolved"

@admin.register(InventoryAudit)
class InventoryAuditAdmin(admin.ModelAdmin):
    list_display = ['audit_name', 'audit_number', 'warehouse', 'status', 'audit_date']
    list_filter = ['status', 'warehouse', 'audit_date']
    search_fields = ['audit_name', 'audit_number']
    readonly_fields = ['audit_number', 'created_at', 'completed_at']
    filter_horizontal = ['categories', 'products', 'audit_team']

@admin.register(InventoryAuditItem)
class InventoryAuditItemAdmin(admin.ModelAdmin):
    list_display = ['audit', 'product', 'expected_quantity', 'actual_quantity', 'difference']
    list_filter = ['audit__warehouse', 'audit__status']
    search_fields = ['product__name', 'audit__audit_name']
    readonly_fields = ['difference', 'value_difference', 'audited_at']

@admin.register(ProductBundle)
class ProductBundleAdmin(admin.ModelAdmin):
    list_display = ['bundle_name', 'bundle_code', 'company', 'bundle_price', 'is_active']
    list_filter = ['company', 'is_active']
    search_fields = ['bundle_name', 'bundle_code']
    readonly_fields = ['bundle_code', 'total_cost', 'profit_margin', 'created_at', 'updated_at']

@admin.register(ProductBundleItem)
class ProductBundleItemAdmin(admin.ModelAdmin):
    list_display = ['bundle', 'product', 'quantity', 'effective_price']
    list_filter = ['bundle__company']
    search_fields = ['bundle__bundle_name', 'product__name']
    readonly_fields = ['effective_price', 'line_total']

@admin.register(CycleCount)
class CycleCountAdmin(admin.ModelAdmin):
    list_display = ['count_name', 'count_number', 'warehouse', 'frequency', 'status', 'next_count_date']
    list_filter = ['company', 'warehouse', 'frequency', 'status']
    search_fields = ['count_name', 'count_number']
    readonly_fields = ['count_number', 'accuracy_percentage', 'created_at', 'completed_at']
    filter_horizontal = ['categories']

@admin.register(CycleCountItem)
class CycleCountItemAdmin(admin.ModelAdmin):
    list_display = ['cycle_count', 'product', 'expected_quantity', 'counted_quantity', 'variance']
    list_filter = ['cycle_count__warehouse', 'is_counted']
    search_fields = ['product__name', 'cycle_count__count_name']
    readonly_fields = ['variance', 'counted_at']

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'supplier', 'warehouse', 'status', 'total_amount', 'order_date']
    list_filter = ['company', 'supplier', 'warehouse', 'status']
    search_fields = ['po_number', 'supplier__name']
    readonly_fields = ['po_number', 'created_at', 'updated_at']

@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    list_display = ['purchase_order', 'product', 'quantity_ordered', 'quantity_received', 'unit_price']
    list_filter = ['purchase_order__supplier', 'purchase_order__status']
    search_fields = ['product__name', 'purchase_order__po_number']
    readonly_fields = ['total_price', 'quantity_pending', 'is_fully_received']
