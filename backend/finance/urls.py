from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import viewsets
from . import payment_views
from . import direct_payment_views
from . import indian_compliance_views
from . import government_api_views
from . import analytics_views
from .test_auth import test_session_auth

from . import integration_views
from . import purchase_views
from . import unit_views
from . import hsn_sac_views
from . import refactored_invoice_views
from . import financial_year_views


# Create router for ViewSets
router = DefaultRouter()
router.register(r'customers', viewsets.CustomerViewSet)
router.register(r'products', viewsets.ProductViewSet)
router.register(r'quotations', viewsets.QuotationViewSet)
router.register(r'purchase-orders', viewsets.PurchaseOrderViewSet)
router.register(r'proforma-invoices', viewsets.ProformaInvoiceViewSet)
router.register(r'invoices', viewsets.InvoiceViewSet)
router.register(r'invoices-enhanced', refactored_invoice_views.RefactoredInvoiceViewSet, basename='invoices-enhanced')
router.register(r'payments', viewsets.PaymentViewSet)

urlpatterns = [
    # Financial Year Management
    path('financial-years/', financial_year_views.get_financial_years, name='get_financial_years'),
    path('financial-years/info/', financial_year_views.get_financial_year_info, name='get_financial_year_info'),
    path('financial-years/summary/', financial_year_views.get_finance_summary_by_fy, name='get_finance_summary_by_fy'),
    
    path('customer-pending-statement/', views.PendingPaymentStatementAPIView.as_view(), name='customer_pending_statement'),
    path('customer-pending-statement/pdf/', views.customer_pending_statement_pdf, name='customer_pending_statement_pdf'),
    path('customer-ledger/pdf/', views.customer_ledger_pdf, name='customer_ledger_pdf'),
    
    path('', include(router.urls)),
    
    # Test endpoint
    path('test-session/', test_session_auth, name='test_session_auth'),

    # Customer Shipping Address endpoint
    path('customers/shipping-addresses/<int:address_id>/', views.CustomerShippingAddressDetailView.as_view(), name='customer_shipping_address_detail'),

    path('customer-ledger/', views.customer_ledger, name='customer_ledger'),

    # Customer Ledger endpoint - SECURE: Uses new auth via viewset action
    # Moved to CustomerViewSet.ledger action

    # PDF Generation endpoints - SECURE: Now handled by ViewSet actions
    # quotations/{id}/pdf/ -> QuotationViewSet.pdf action
    # purchase-orders/{id}/pdf/ -> PurchaseOrderViewSet.pdf action  
    # invoices/{id}/pdf/ -> InvoiceViewSet.pdf action
    # proforma-invoices/{id}/pdf/ -> ProformaInvoiceViewSet.pdf action

    # Email endpoints - SECURE: Now handled by ViewSet actions
    # quotations/{id}/send-email/ -> QuotationViewSet.send_email action
    # invoices/{id}/send-email/ -> InvoiceViewSet.send_email action
    # proforma-invoices/{id}/send-email/ -> ProformaInvoiceViewSet.send_email action
    # purchase-orders/{id}/send-email/ -> PurchaseOrderViewSet.send_email action
    
    # Rejection endpoints - SECURE: Now handled by ViewSet actions
    # quotations/{id}/reject/ -> QuotationViewSet.reject action
    # proforma-invoices/{id}/reject/ -> ProformaInvoiceViewSet.reject action
    # invoices/{id}/reject/ -> InvoiceViewSet.reject action
    

    
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
    path('payment-tds/<int:payment_id>/deposits/', views.TDSDepositListCreateView.as_view(), name='tds_deposit_list_create'),
    path('payment-tds/<int:payment_id>/deposits/<int:pk>/', views.TDSDepositDetailView.as_view(), name='tds_deposit_detail'),
    path('payment-tds/<int:payment_id>/mark-cert-received/', views.MarkTDSCertReceivedView.as_view(), name='tds_mark_cert_received'),
    
    # Global TDS Management
    path('tds/', views.TDSPaymentsListView.as_view(), name='tds_list'),
    path('tds/export/', views.TDSExportCSVView.as_view(), name='tds_export'),
    
    # Purchase & Expense Reports
    path('vendor-ledger/', purchase_views.vendor_ledger, name='vendor_ledger'),
    path('purchase-expense-stats/', purchase_views.purchase_expense_stats, name='purchase_expense_stats'),


    # PO Consolidated Report
    path('purchase-orders/<int:po_id>/consolidated-report/', views.po_consolidated_report, name='po_consolidated_report'),

    # Finance numbering rule management
    path('numbering/finance/', views.FinanceNumberingRuleView.as_view(), name='finance_numbering_rules'),
    path('numbering/finance/<str:module>/', views.FinanceNumberingRuleView.as_view(), name='finance_numbering_rule_detail'),
    path('numbering/finance/<str:module>/preview/', views.FinanceNumberingPreviewView.as_view(), name='finance_numbering_preview'),

    # Unit Management endpoints
    path('units/', unit_views.UnitListCreateView.as_view(), name='unit_list_create'),

    # HSN/SAC Code Search endpoints
    path('hsn-codes/search/', hsn_sac_views.HSNCodeSearchView.as_view(), name='hsn_code_search'),
    path('sac-codes/search/', hsn_sac_views.SACCodeSearchView.as_view(), name='sac_code_search'),

    # ============================================================================
    # DIRECT CUSTOMER PAYMENT ENDPOINTS - NEW FUNCTIONALITY
    # ============================================================================
    
    # Direct Payment Management
    path('direct-payments/', direct_payment_views.list_direct_payments, name='list_direct_payments'),
    path('direct-payments/create/', direct_payment_views.create_direct_payment, name='create_direct_payment'),
    path('direct-payments/<int:payment_id>/', direct_payment_views.get_direct_payment, name='get_direct_payment'),
    path('direct-payments/<int:payment_id>/delete/', direct_payment_views.delete_direct_payment, name='delete_direct_payment'),
    
    # Customer Payment Summary
    path('customers/<int:customer_id>/payment-summary/', direct_payment_views.customer_payment_summary, name='customer_payment_summary'),

    # ============================================================================
    # PAYMENT UPDATE ENDPOINTS
    # ============================================================================
    
    # Invoice Payment Update
    path('invoices/<int:invoice_id>/payment/', payment_views.update_invoice_payment, name='update_invoice_payment'),
    
    # Proforma Invoice Payment Update
    path('proforma-invoices/<int:proforma_id>/payment/', payment_views.update_proforma_payment, name='update_proforma_payment'),
    
    # Unified Payment Update (supports both invoice types)
    path('unified-payment/<int:invoice_id>/', payment_views.unified_payment_update, name='unified_payment_update'),

]
