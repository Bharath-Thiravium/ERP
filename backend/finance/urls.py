from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),

    # Customer endpoints
    path('customers/', views.CustomerListCreateView.as_view(), name='customer_list_create'),
    path('customers/<int:pk>/', views.CustomerDetailView.as_view(), name='customer_detail'),

    # Product endpoints
    path('products/', views.ProductListCreateView.as_view(), name='product_list_create'),
    path('products/<int:pk>/', views.ProductDetailView.as_view(), name='product_detail'),

    # Quotation endpoints
    path('quotations/', views.QuotationListCreateView.as_view(), name='quotation_list_create'),
    path('quotations/<int:pk>/', views.QuotationDetailView.as_view(), name='quotation_detail'),
    path('quotations/<int:pk>/copy/', views.QuotationCopyView.as_view(), name='quotation_copy'),

    # Purchase Order endpoints
    path('purchase-orders/', views.PurchaseOrderListCreateView.as_view(), name='purchase_order_list_create'),
    path('purchase-orders/<int:pk>/', views.PurchaseOrderDetailView.as_view(), name='purchase_order_detail'),

    # Proforma Invoice endpoints
    path('proforma-invoices/', views.ProformaInvoiceListCreateView.as_view(), name='proforma_invoice_list_create'),
    path('proforma-invoices/<int:pk>/', views.ProformaInvoiceDetailView.as_view(), name='proforma_invoice_detail'),

    # HSN/SAC code search endpoints
    path('hsn-codes/search/', views.HSNCodeSearchView.as_view(), name='hsn_code_search'),
    path('sac-codes/search/', views.SACCodeSearchView.as_view(), name='sac_code_search'),

    # Generate product/service code endpoint
    path('generate-code/', views.GenerateProductCodeView.as_view(), name='generate_product_code'),
]
