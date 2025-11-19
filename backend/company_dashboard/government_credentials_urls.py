from django.urls import path
from . import government_credentials_views

urlpatterns = [
    # Government API Credentials Management
    path('credentials/', 
         government_credentials_views.CompanyGovernmentCredentialsListView.as_view(), 
         name='government_credentials_list'),
    
    path('credentials/<int:pk>/', 
         government_credentials_views.CompanyGovernmentCredentialsDetailView.as_view(), 
         name='government_credentials_detail'),
    
    path('credentials/<int:credential_id>/toggle-status/', 
         government_credentials_views.toggle_credential_status, 
         name='toggle_credential_status'),
    
    path('credentials/<int:credential_id>/test/', 
         government_credentials_views.test_government_api_credentials, 
         name='test_government_credentials'),
    
    path('credentials/<int:credential_id>/audit-logs/', 
         government_credentials_views.get_credential_audit_logs, 
         name='credential_audit_logs'),
    
    # Configuration and Templates
    path('api-templates/', 
         government_credentials_views.get_api_configuration_templates, 
         name='api_configuration_templates'),
    
    path('credentials-summary/', 
         government_credentials_views.get_credentials_summary, 
         name='credentials_summary'),
]