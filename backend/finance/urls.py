from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import payment_views
from . import indian_compliance_views
from . import government_api_views
from . import analytics_views

from . import integration_views
from . import purchase_views
from . import unit_views


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
    path('quotations/<int:quotation_id>/pdf/', views.generate_quotation_pdf, name='generate_quotation_pdf'),
    path('invoices/<int:invoice_id>/pdf/', views.generate_invoice_pdf, name='generate_invoice_pdf'),
    path('proforma-invoices/<int:proforma_id>/pdf/', views.generate_proforma_pdf, name='generate_proforma_pdf'),

    # HSN/SAC code search endpoints
    path('hsn-codes/search/', views.HSNCodeSearchView.as_view(), name='hsn_code_search'),
    path('sac-codes/search/', views.SACCodeSearchView.as_view(), name='sac_code_search'),
    
    # Product search endpoint (for quotation forms)
    path('products/search/', views.ProductSearchView.as_view(), name='product_search'),
    
    # HSN/SAC code creation endpoints
    path('hsn-codes/create/', views.HSNCodeCreateView.as_view(), name='hsn_code_create'),
    path('sac-codes/create/', views.SACCodeCreateView.as_view(), name='sac_code_create'),

    # Generate product/service code endpoint
    path('generate-code/', views.GenerateProductCodeView.as_view(), name='generate_product_code'),
    
    # Unit management endpoints
    path('units/', unit_views.UnitListCreateView.as_view(), name='unit_list_create'),

    # World-Class Payment Management endpoints
    path('world-class-payments/', views.WorldClassPaymentListCreateView.as_view(), name='world_class_payments'),
    path('world-class-payments/summary/', views.world_class_payment_summary, name='world_class_payment_summary'),
    path('purchase-orders/<int:po_id>/world-class-dashboard/', views.world_class_po_payment_dashboard, name='world_class_po_dashboard'),
    path('purchase-orders/<int:po_id>/sophisticated-claiming/', views.sophisticated_po_claiming_status, name='sophisticated_po_claiming'),
    path('purchase-orders/<int:po_id>/payment-details/', views.purchase_order_payment_details, name='purchase_order_payment_details'),
    
    # Payment Update endpoints
    path('invoices/<int:invoice_id>/payments/', payment_views.unified_payment_update, name='update_invoice_payment'),
    path('proforma-invoices/<int:proforma_id>/payments/', payment_views.update_proforma_payment, name='update_proforma_payment'),
    
    # Email endpoints
    path('quotations/<int:quotation_id>/send-email/', views.send_quotation_email_view, name='send_quotation_email'),
    path('invoices/<int:invoice_id>/send-email/', views.send_invoice_email_view, name='send_invoice_email'),
    path('proforma-invoices/<int:proforma_id>/send-email/', views.send_proforma_email_view, name='send_proforma_email'),
    path('purchase-orders/<int:purchase_order_id>/send-email/', views.send_purchase_order_email_view, name='send_purchase_order_email'),
    
    # Rejection endpoints
    path('quotations/<int:quotation_id>/reject/', views.reject_quotation, name='reject_quotation'),
    path('proforma-invoices/<int:proforma_id>/reject/', views.reject_proforma_invoice, name='reject_proforma_invoice'),
    path('invoices/<int:invoice_id>/reject/', views.reject_invoice, name='reject_invoice'),
    

    
    # Indian Compliance endpoints
    path('gst/calculate/', indian_compliance_views.GSTCalculatorView.as_view(), name='gst_calculate'),
    path('gst/validate-gstin/', indian_compliance_views.GSTINValidatorView.as_view(), name='validate_gstin'),
    path('tds/calculate/', indian_compliance_views.TDSCalculatorView.as_view(), name='tds_calculate'),
    path('indian-states/', indian_compliance_views.get_indian_states, name='indian_states'),
    path('tds-sections/', indian_compliance_views.get_tds_sections, name='tds_sections'),
    path('gstr1/generate/', indian_compliance_views.generate_gstr1_data, name='generate_gstr1'),
    path('compliance/dashboard/', indian_compliance_views.compliance_dashboard, name='compliance_dashboard'),
    path('compliance/alerts/', indian_compliance_views.compliance_alerts, name='compliance_alerts'),
    
    # Government API Integration endpoints
    path('gov-api/validate-gstin/', government_api_views.validate_gstin, name='gov_validate_gstin'),
    path('gov-api/validate-pan/', government_api_views.validate_pan, name='gov_validate_pan'),
    path('gov-api/gst-rates/', government_api_views.get_gst_rates, name='gov_gst_rates'),
    path('gov-api/tds-rates/', government_api_views.get_tds_rates, name='gov_tds_rates'),
    path('gov-api/file-gstr1/', government_api_views.file_gstr1, name='gov_file_gstr1'),
    path('gov-api/file-tds-return/', government_api_views.file_tds_return, name='gov_file_tds_return'),
    path('gov-api/generate-einvoice/', government_api_views.generate_einvoice, name='gov_generate_einvoice'),
    path('gov-api/compliance-status/', government_api_views.get_compliance_status, name='gov_compliance_status'),
    path('gov-api/bulk-validate-customers/', government_api_views.bulk_validate_customers, name='gov_bulk_validate'),
    
    # Advanced Analytics & Reporting endpoints
    path('reports/gstr1/', analytics_views.generate_gstr1_report, name='generate_gstr1_report'),
    path('reports/gstr3b/', analytics_views.generate_gstr3b_report, name='generate_gstr3b_report'),
    path('reports/tds-certificate/<int:payment_id>/', analytics_views.generate_tds_certificate, name='generate_tds_certificate'),
    path('reports/quarterly-tds/', analytics_views.generate_quarterly_tds_report, name='generate_quarterly_tds_report'),
    path('analytics/dashboard/', analytics_views.compliance_analytics_dashboard, name='compliance_analytics_dashboard'),
    path('analytics/audit-trail/', analytics_views.audit_trail_report, name='audit_trail_report'),
    path('analytics/tax-summary/', analytics_views.tax_analytics_summary, name='tax_analytics_summary'),
    path('analytics/alerts/', analytics_views.compliance_alerts, name='analytics_compliance_alerts'),
    path('analytics/reconciliation/', analytics_views.reconciliation_report, name='reconciliation_report'),
    path('export/gstr1-csv/', analytics_views.export_gstr1_csv, name='export_gstr1_csv'),
    path('export/tds-csv/', analytics_views.export_tds_csv, name='export_tds_csv'),
    path('bulk/tds-certificates/', analytics_views.bulk_generate_tds_certificates, name='bulk_generate_tds_certificates'),
    
    # Financial Reports endpoints
    path('reports/profit-loss/', analytics_views.generate_profit_loss_report, name='generate_profit_loss_report'),
    path('reports/balance-sheet/', analytics_views.generate_balance_sheet, name='generate_balance_sheet'),
    path('reports/cash-flow/', analytics_views.generate_cash_flow_statement, name='generate_cash_flow_statement'),
    
    # AI Features endpoints
    path('ai/predict-payment/', analytics_views.predict_payment_likelihood, name='predict_payment_likelihood'),
    path('ai/payment-insights/', analytics_views.generate_payment_insights, name='generate_payment_insights'),
    path('ai/fraud-detection/', analytics_views.detect_fraud_anomalies, name='detect_fraud_anomalies'),
    
    # Advanced Compliance endpoints
    path('compliance/gstr3b-complete/', analytics_views.generate_complete_gstr3b_report, name='generate_complete_gstr3b_report'),
    path('compliance/eway-bill/<int:invoice_id>/', analytics_views.generate_eway_bill_data, name='generate_eway_bill_data'),
    path('compliance/checklist/', analytics_views.generate_compliance_checklist, name='generate_compliance_checklist'),
    

    

    
    # Integration & Automation endpoints (Phase 7)
    path('integration/', include('finance.integration_urls')),
    
    # ============================================================================
    # PURCHASE & EXPENSE MANAGEMENT ENDPOINTS - NEW FUNCTIONALITY
    # ============================================================================
    
    # Vendor Management endpoints
    path('vendors/', purchase_views.VendorListCreateView.as_view(), name='vendor_list_create'),
    path('vendors/<int:pk>/', purchase_views.VendorDetailView.as_view(), name='vendor_detail'),
    path('vendors/dropdown/', purchase_views.get_vendors, name='get_vendors'),
    
    # Purchase Request endpoints
    path('purchase-requests/', purchase_views.PurchaseRequestListCreateView.as_view(), name='purchase_request_list_create'),
    path('purchase-requests/<int:pk>/', purchase_views.PurchaseRequestDetailView.as_view(), name='purchase_request_detail'),
    
    # Vendor Invoice endpoints
    path('vendor-invoices/', purchase_views.VendorInvoiceListCreateView.as_view(), name='vendor_invoice_list_create'),
    path('vendor-invoices/<int:pk>/', purchase_views.VendorInvoiceDetailView.as_view(), name='vendor_invoice_detail'),
    
    # Purchase Payment endpoints
    path('purchase-payments/', purchase_views.PurchasePaymentListCreateView.as_view(), name='purchase_payment_list_create'),
    path('purchase-payments/<int:pk>/', purchase_views.PurchasePaymentDetailView.as_view(), name='purchase_payment_detail'),
    
    # Purchase & Expense Reports
    path('vendor-ledger/', purchase_views.vendor_ledger, name='vendor_ledger'),
    path('purchase-expense-stats/', purchase_views.purchase_expense_stats, name='purchase_expense_stats'),

]
