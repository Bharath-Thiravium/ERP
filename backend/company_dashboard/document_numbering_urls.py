from django.urls import path
from . import document_numbering_views

urlpatterns = [
    # Financial Year Management
    path('current-financial-year/', document_numbering_views.get_current_financial_year, name='current_financial_year'),
    path('financial-year-settings/', document_numbering_views.financial_year_settings, name='financial_year_settings'),
    
    # Document Numbering Configuration
    path('configs/', document_numbering_views.document_numbering_configs, name='document_numbering_configs'),
    path('configs/<int:config_id>/', document_numbering_views.document_numbering_config_detail, name='document_numbering_config_detail'),
    path('bulk-setup/', document_numbering_views.bulk_setup_numbering, name='bulk_setup_numbering'),
    
    # Number Generation
    path('generate-number/', document_numbering_views.generate_document_number, name='generate_document_number'),
    
    # History and Tracking
    path('history/', document_numbering_views.document_numbering_history, name='document_numbering_history'),
    
    # Dashboard Statistics
    path('dashboard-stats/', document_numbering_views.numbering_dashboard_stats, name='numbering_dashboard_stats'),
]