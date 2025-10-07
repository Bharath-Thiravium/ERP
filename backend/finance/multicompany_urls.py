from django.urls import path
from . import multicompany_views

urlpatterns = [
    # Branch Management
    path('branches/', multicompany_views.BranchListCreateView.as_view(), name='branch-list-create'),
    path('branches/<int:pk>/', multicompany_views.BranchDetailView.as_view(), name='branch-detail'),
    
    # TDS Section Management
    path('tds-sections/', multicompany_views.TDSSectionListView.as_view(), name='tds-section-list'),
    
    # Reverse Charge Transactions
    path('reverse-charge/', multicompany_views.ReverseChargeTransactionListCreateView.as_view(), name='reverse-charge-list-create'),
    
    # Import/Export Transactions
    path('import-export/', multicompany_views.ImportExportTransactionListCreateView.as_view(), name='import-export-list-create'),
    
    # Advanced TDS Deductees
    path('tds-deductees/', multicompany_views.AdvancedTDSDeducteeListCreateView.as_view(), name='tds-deductee-list-create'),
    
    # Analytics and Calculations
    path('dashboard/', multicompany_views.multi_company_dashboard, name='multi-company-dashboard'),
    path('calculate-reverse-charge/', multicompany_views.calculate_reverse_charge_gst, name='calculate-reverse-charge'),
    path('calculate-tds/', multicompany_views.calculate_tds_amount, name='calculate-tds'),
]