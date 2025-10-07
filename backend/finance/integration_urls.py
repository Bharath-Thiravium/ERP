from django.urls import path
from . import integration_views
from . import bank_integration_views
from . import erp_connector_views
from . import payment_gateway_views

urlpatterns = [
    # Customer Bank Integration
    path('customers/', bank_integration_views.get_customers_for_bank_integration, name='bank-customers'),
    path('verify-bank/', bank_integration_views.verify_customer_bank_details, name='verify-bank'),
    path('import-statement/', bank_integration_views.import_bank_statement, name='import-statement'),
    path('reconciliation/', bank_integration_views.get_reconciliation_data, name='reconciliation'),
    path('manual-match/', bank_integration_views.manual_match_payment, name='manual-match'),
    path('bank-dashboard/', bank_integration_views.bank_integration_dashboard, name='bank-dashboard'),
    
    # ERP Connectors (New Enhanced System)
    path('erp-connectors/', erp_connector_views.erp_connector_list, name='erp-connector-list'),
    path('erp-connectors/create/', erp_connector_views.erp_connector_create, name='erp-connector-create'),
    path('erp-connectors/<int:erp_id>/', erp_connector_views.erp_connector_detail, name='erp-connector-detail'),
    path('erp-connectors/<int:erp_id>/test/', erp_connector_views.erp_connector_test, name='erp-connector-test'),
    path('erp-connectors/<int:erp_id>/sync/', erp_connector_views.erp_connector_sync, name='erp-connector-sync'),
    path('erp-connectors/<int:erp_id>/logs/', erp_connector_views.erp_connector_logs, name='erp-connector-logs'),
    path('erp-connectors/dashboard/', erp_connector_views.erp_connector_dashboard, name='erp-connector-dashboard'),
    
    # Enhanced Payment Gateway
    path('payment-gateways/', payment_gateway_views.EnhancedPaymentGatewayListCreateView.as_view(), name='payment-gateway-list-create'),
    path('payment-gateways/<int:pk>/', payment_gateway_views.PaymentGatewayDetailView.as_view(), name='payment-gateway-detail'),
    path('payment-gateways/<int:gateway_id>/test/', payment_gateway_views.test_payment_gateway, name='test-payment-gateway'),
    path('process-payment/', payment_gateway_views.process_invoice_payment, name='process-invoice-payment'),
    path('generate-payment-link/', payment_gateway_views.generate_payment_link, name='generate-payment-link'),
    path('payment-gateway-dashboard/', payment_gateway_views.payment_gateway_dashboard, name='payment-gateway-dashboard'),
    path('invoices-for-payment/', payment_gateway_views.get_invoices_for_payment, name='invoices-for-payment'),
    path('automated-tax-payment/', integration_views.AutomatedTaxPaymentView.as_view(), name='automated-tax-payment'),
    
    # Email Automation
    path('email-automations/', integration_views.EmailAutomationListCreateView.as_view(), name='email-automation-list-create'),
    
    # Mobile App
    path('mobile-config/', integration_views.MobileAppConfigView.as_view(), name='mobile-app-config'),
    path('mobile-sync/', integration_views.MobileSyncView.as_view(), name='mobile-sync'),
    
    # Dashboard
    path('dashboard/', integration_views.integration_dashboard, name='integration-dashboard'),
]