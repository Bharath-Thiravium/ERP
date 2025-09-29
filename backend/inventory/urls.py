from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'dashboard', views.InventoryDashboardViewSet, basename='inventory-dashboard')

urlpatterns = [
    path('', include(router.urls)),
    
    # Category Management
    path('categories/', views.CategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view(), name='category-detail'),
    
    # Supplier Management
    path('suppliers/', views.SupplierListCreateView.as_view(), name='supplier-list-create'),
    path('suppliers/<int:pk>/', views.SupplierDetailView.as_view(), name='supplier-detail'),
    
    # Warehouse Management
    path('warehouses/', views.WarehouseListCreateView.as_view(), name='warehouse-list-create'),
    path('warehouses/<int:pk>/', views.WarehouseDetailView.as_view(), name='warehouse-detail'),
    
    # Product Management
    path('products/', views.ProductListCreateView.as_view(), name='product-list-create'),
    path('products/<int:pk>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('products/<int:pk>/generate-barcode/', views.ProductBarcodeGenerateView.as_view(), name='product-generate-barcode'),
    
    # Stock Management
    path('stock-movements/', views.StockMovementListCreateView.as_view(), name='stock-movement-list-create'),
    path('stock-alerts/', views.StockAlertListView.as_view(), name='stock-alert-list'),
    
    # Purchase Orders
    path('purchase-orders/', views.PurchaseOrderListCreateView.as_view(), name='purchase-order-list-create'),
    
    # Inventory Audits
    path('audits/', views.InventoryAuditListCreateView.as_view(), name='inventory-audit-list-create'),
    
    # Dropdown APIs
    path('api/categories/', views.get_categories, name='get-categories'),
    path('api/suppliers/', views.get_suppliers, name='get-suppliers'),
    path('api/warehouses/', views.get_warehouses, name='get-warehouses'),
    
    # Reports
    path('reports/low-stock/', views.low_stock_report, name='low-stock-report'),
    path('reports/stock-valuation/', views.stock_valuation_report, name='stock-valuation-report'),
    path('reports/abc-analysis/', views.abc_analysis_report, name='abc-analysis-report'),
    
    # Alert Actions
    path('alerts/<int:alert_id>/resolve/', views.resolve_stock_alert, name='resolve-stock-alert'),
]