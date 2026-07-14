from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import viewsets

router = DefaultRouter()
router.register(r'dashboard', views.InventoryDashboardViewSet, basename='inventory-dashboard')
router.register(r'categories', viewsets.CategoryViewSet)
router.register(r'suppliers', viewsets.SupplierViewSet)
router.register(r'warehouses', viewsets.WarehouseViewSet)
router.register(r'products', viewsets.ProductViewSet)
router.register(r'stock-movements', viewsets.StockMovementViewSet)
router.register(r'stock-alerts', viewsets.StockAlertViewSet)
router.register(r'purchase-orders', viewsets.PurchaseOrderViewSet)
router.register(r'audits', viewsets.InventoryAuditViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Product Bundles
    path('bundles/', views.ProductBundleListCreateView.as_view(), name='product-bundle-list-create'),
    path('bundles/<int:pk>/', views.ProductBundleDetailView.as_view(), name='product-bundle-detail'),
    
    # Cycle Counts
    path('cycle-counts/', views.CycleCountListCreateView.as_view(), name='cycle-count-list-create'),
    path('cycle-counts/<int:pk>/', views.CycleCountDetailView.as_view(), name='cycle-count-detail'),
    path('cycle-counts/<int:count_id>/start/', views.start_cycle_count, name='start-cycle-count'),
    path('cycle-counts/<int:count_id>/pause/', views.pause_cycle_count, name='pause-cycle-count'),
    
    # Dropdown APIs
    path('api/categories/', views.get_categories, name='get-categories'),
    path('api/suppliers/', views.get_suppliers, name='get-suppliers'),
    path('api/warehouses/', views.get_warehouses, name='get-warehouses'),
    
    # Reports
    path('reports/low-stock/', views.low_stock_report, name='low-stock-report'),
    path('reports/stock-valuation/', views.stock_valuation_report, name='stock-valuation-report'),
    path('reports/abc-analysis/', views.abc_analysis_report, name='abc-analysis-report'),
    path('reports/aging-analysis/', views.inventory_aging_report, name='aging-analysis-report'),
    path('reports/dead-stock/', views.dead_stock_report, name='dead-stock-report'),
    
    # File Upload
    path('products/<int:product_id>/upload-image/', views.upload_product_image, name='upload-product-image'),
    
    # Alert Actions
    path('alerts/<int:alert_id>/resolve/', views.resolve_stock_alert, name='resolve-stock-alert'),
]
