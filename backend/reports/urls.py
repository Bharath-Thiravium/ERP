from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    QuotationReportViewSet,
    PurchaseOrderReportViewSet,
    ProformaInvoiceReportViewSet,
    InvoiceReportViewSet
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'quotations', QuotationReportViewSet, basename='quotation-report')
router.register(r'purchase-orders', PurchaseOrderReportViewSet, basename='purchase-order-report')
router.register(r'proforma-invoices', ProformaInvoiceReportViewSet, basename='proforma-invoice-report')
router.register(r'invoices', InvoiceReportViewSet, basename='invoice-report')

urlpatterns = [
    path('', include(router.urls)),
]
