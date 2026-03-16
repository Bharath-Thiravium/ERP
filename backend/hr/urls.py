from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import workflow_views
router = DefaultRouter()
router.register(r'dashboard', views.HRDashboardViewSet, basename='hr-dashboard')

urlpatterns = [
    path('', include(router.urls)),
    
    # Employee Management
    path('employees/', views.EmployeeListCreateView.as_view(), name='employee-list-create'),
    path('employees/<int:pk>/', views.EmployeeDetailView.as_view(), name='employee-detail'),
    
    # Job Management
    path('job-postings/', views.JobPostingListCreateView.as_view(), name='job-posting-list-create'),
    path('job-postings/<int:pk>/', views.JobPostingDetailView.as_view(), name='job-posting-detail'),
    path('job-applications/', views.JobApplicationListCreateView.as_view(), name='job-application-list-create'),
    path('job-applications/<int:pk>/', views.JobApplicationDetailView.as_view(), name='job-application-detail'),
    
    # Department & Designation Management
    path('departments/', views.DepartmentListCreateView.as_view(), name='department-list-create'),
    path('departments/<int:pk>/', views.DepartmentDetailView.as_view(), name='department-detail'),
    path('designations/', views.DesignationListCreateView.as_view(), name='designation-list-create'),
    path('designations/<int:pk>/', views.DesignationDetailView.as_view(), name='designation-detail'),
    
    # Public Job Posting APIs (no authentication)
    path('public/jobs/', views.PublicJobListView.as_view(), name='public-job-list'),
    path('public/jobs/<int:pk>/', views.PublicJobDetailView.as_view(), name='public-job-detail'),
    path('public/jobs/<int:job_id>/apply/', views.PublicJobApplicationView.as_view(), name='public-job-apply'),
    
    # Dropdown APIs
    path('dropdown/departments/', views.get_departments, name='get-departments'),
    path('dropdown/designations/', views.get_designations, name='get-designations'),
    
    # Mobile App Authentication APIs
    path('employee-login/', views.employee_mobile_login, name='employee-mobile-login'),
    path('set-mobile-password/', views.set_mobile_password, name='set-mobile-password'),
    path('download-mobile-credentials/', views.download_mobile_credentials, name='download-mobile-credentials'),
    
    # Employee Workflow APIs
    path('workflow/create-employee/', workflow_views.create_employee_with_workflow, name='create-employee-workflow'),
    path('workflow/reset-password/', workflow_views.employee_reset_password, name='employee-reset-password'),
    path('workflow/status/', workflow_views.get_employee_workflow_status, name='employee-workflow-status'),

]