from django.urls import path
from . import document_numbering_views
from . import reset_views

urlpatterns = [
    # Financial Year Management
    path('current-financial-year/', document_numbering_views.get_current_financial_year, name='current_financial_year'),
    path('financial-year-settings/', document_numbering_views.financial_year_settings, name='financial_year_settings'),
    
    # Document Numbering Configuration
    path('configs/', document_numbering_views.document_numbering_configs, name='document_numbering_configs'),
    path('configs/<int:config_id>/', document_numbering_views.document_numbering_config_detail, name='document_numbering_config_detail'),
    path('bulk-setup/', document_numbering_views.bulk_setup_numbering_legacy, name='bulk_setup_numbering_legacy'),
    
    # Enhanced Service-wise Configuration
    path('service-wise-setup/', document_numbering_views.service_wise_bulk_setup, name='service_wise_bulk_setup'),
    path('service-document-types/', document_numbering_views.get_service_document_types, name='get_service_document_types'),
    path('current-configurations/', document_numbering_views.get_company_current_configurations, name='get_company_current_configurations'),
    
    # Pattern Preview
    path('preview-pattern/', document_numbering_views.preview_numbering_pattern, name='preview_numbering_pattern'),
    
    # Number Generation
    path('generate-number/', document_numbering_views.generate_document_number, name='generate_document_number'),
    
    # History and Tracking
    path('history/', document_numbering_views.document_numbering_history, name='document_numbering_history'),
    
    # Dashboard Statistics
    path('dashboard-stats/', document_numbering_views.numbering_dashboard_stats, name='numbering_dashboard_stats'),
    
    # System Control
    path('toggle-system/', document_numbering_views.toggle_document_numbering_system, name='toggle_document_numbering_system'),
    path('system-status/', document_numbering_views.get_document_numbering_status, name='get_document_numbering_status'),
    
    # Counter Reset
    path('reset-counter/', reset_views.reset_document_counter, name='reset_document_counter'),
    path('reset-all-counters/', reset_views.reset_all_counters, name='reset_all_counters'),
    
    # Fix Company Prefix
    path('fix-company-prefix/', document_numbering_views.fix_company_prefix_configs, name='fix_company_prefix_configs'),
]