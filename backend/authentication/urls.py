from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),

    # Master Admin endpoints
    path('master-admin/login/', views.MasterAdminLoginView.as_view(), name='master_admin_login'),
    path('master-admin/change-password/', views.MasterAdminPasswordChangeView.as_view(), name='master_admin_password_change'),
    path('master-admin/profile/', views.MasterAdminProfileView.as_view(), name='master_admin_profile'),

    # Company User endpoints
    path('company/login/', views.CompanyUserLoginView.as_view(), name='company_user_login'),
    path('company/change-password/', views.CompanyUserPasswordChangeView.as_view(), name='company_user_password_change'),
    path('company/update-logo/', views.CompanyLogoUpdateView.as_view(), name='company_logo_update'),

    # Service User endpoints
    path('service-user/login/', views.ServiceUserLoginView.as_view(), name='service_user_login'),
    path('service-user/logout/', views.ServiceUserLogoutView.as_view(), name='service_user_logout'),
    path('service-user/change-password/', views.ServiceUserPasswordChangeView.as_view(), name='service_user_password_change'),
    path('service-user/company/<int:company_id>/', views.ServiceUserCompanyView.as_view(), name='service_user_company'),
    path('company-profile/', views.CompanyProfileView.as_view(), name='company_profile'),

    # Company Service Users (for company admins)
    path('company/service-users/', views.CompanyServiceUserListCreateView.as_view(), name='company_service_users'),
    path('company/service-users/<int:pk>/', views.CompanyServiceUserDetailView.as_view(), name='company_service_user_detail'),

    # Services
    path('services/', views.ServiceListView.as_view(), name='service_list'),

    # Companies (Master Admin)
    path('companies/', views.CompanyListCreateView.as_view(), name='company_list_create'),
    path('companies/<int:pk>/', views.CompanyDetailView.as_view(), name='company_detail'),
    path('companies/<int:company_id>/detailed-info/', views.CompanyDetailedInfoView.as_view(), name='company_detailed_info'),
    path('companies/<int:company_id>/approve/', views.CompanyApprovalView.as_view(), name='company_approval'),
    path('companies/<int:company_id>/service-credentials/', views.CompanyServiceCredentialsView.as_view(), name='company_service_credentials'),

    # Company Services
    path('company/services/', views.CompanyServicesView.as_view(), name='company_services'),
    path('company/assigned-services/', views.CompanyAssignedServicesView.as_view(), name='company_assigned_services'),
    path('company/request-services/', views.RequestServiceAccessView.as_view(), name='request_service_access'),
    path('services/<int:service_id>/access/', views.ServiceAccessView.as_view(), name='service_access'),
    path('services/<int:service_id>/change-password/', views.ServicePasswordChangeView.as_view(), name='service_password_change'),

    # Security
    path('security-logs/', views.SecurityLogView.as_view(), name='security_logs'),

    # Token validation
    path('validate-token/', views.ValidateTokenView.as_view(), name='validate_token'),
    
    # Auto-code generation (testing)
    path('generate-auto-code/', views.GenerateAutoCodeView.as_view(), name='generate_auto_code'),
]
