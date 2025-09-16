from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import payment_views

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

    # Invoice endpoints
    path('invoices/', views.InvoiceListCreateView.as_view(), name='invoice_list_create'),
    path('invoices/<int:pk>/', views.InvoiceDetailView.as_view(), name='invoice_detail'),

    # Payment endpoints
    path('payments/', views.PaymentListCreateView.as_view(), name='payment_list_create'),
    path('payments/<int:pk>/', views.PaymentDetailView.as_view(), name='payment_detail'),
    path('payments/stats/', views.payment_stats, name='payment_stats'),

    # Customer Ledger endpoint
    path('customer-ledger/', views.customer_ledger, name='customer_ledger'),

    # PDF Generation endpoints
    path('invoices/<int:invoice_id>/pdf/', views.generate_invoice_pdf, name='generate_invoice_pdf'),
    path('proforma-invoices/<int:proforma_id>/pdf/', views.generate_proforma_pdf, name='generate_proforma_pdf'),

    # HSN/SAC code search endpoints
    path('hsn-codes/search/', views.HSNCodeSearchView.as_view(), name='hsn_code_search'),
    path('sac-codes/search/', views.SACCodeSearchView.as_view(), name='sac_code_search'),

    # Generate product/service code endpoint
    path('generate-code/', views.GenerateProductCodeView.as_view(), name='generate_product_code'),

    # World-Class Payment Management endpoints
    path('world-class-payments/', views.WorldClassPaymentListCreateView.as_view(), name='world_class_payments'),
    path('world-class-payments/summary/', views.world_class_payment_summary, name='world_class_payment_summary'),
    path('purchase-orders/<int:po_id>/world-class-dashboard/', views.world_class_po_payment_dashboard, name='world_class_po_dashboard'),
    path('purchase-orders/<int:po_id>/sophisticated-claiming/', views.sophisticated_po_claiming_status, name='sophisticated_po_claiming'),
    path('purchase-orders/<int:po_id>/payment-details/', views.purchase_order_payment_details, name='purchase_order_payment_details'),
    
    # Payment Update endpoints
    path('invoices/<int:invoice_id>/payments/', payment_views.update_invoice_payment, name='update_invoice_payment'),
    path('proforma-invoices/<int:proforma_id>/payments/', payment_views.update_proforma_payment, name='update_proforma_payment'),
]
