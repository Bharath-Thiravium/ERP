from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import attendance_views
from . import payroll_views
from . import analytics_views
from . import performance_views
from . import statutory_views
from . import form_views
from . import advanced_views
from . import government_views
from . import leave_views
from . import interview_views
from . import offer_views

router = DefaultRouter()
router.register(r'dashboard', views.HRDashboardViewSet, basename='hr-dashboard')
router.register(r'payroll', payroll_views.PayrollViewSet, basename='payroll')
router.register(r'payslips', payroll_views.PayslipViewSet, basename='payslips')
router.register(r'payroll-settings', payroll_views.PayrollSettingsViewSet, basename='payroll-settings')
router.register(r'performance', performance_views.PerformanceViewSet, basename='performance')

# Statutory Compliance Routes
router.register(r'statutory-settings', statutory_views.StatutorySettingsViewSet, basename='statutory-settings')
router.register(r'employee-statutory', statutory_views.EmployeeStatutoryDetailsViewSet, basename='employee-statutory')
router.register(r'government-returns', statutory_views.GovernmentReturnViewSet, basename='government-returns')
router.register(r'compliance-alerts', statutory_views.ComplianceAlertViewSet, basename='compliance-alerts')

# Advanced Compliance Routes (Phase 3)
router.register(r'compliance', advanced_views.ComplianceViewSet, basename='compliance')
router.register(r'advanced-reports', advanced_views.AdvancedReportsViewSet, basename='advanced-reports')
router.register(r'automation', advanced_views.AutomationViewSet, basename='automation')
router.register(r'integration', advanced_views.IntegrationViewSet, basename='integration')

urlpatterns = [
    path('', include(router.urls)),
    
    # Employee Management
    path('employees/', views.EmployeeListCreateView.as_view(), name='employee-list-create'),
    path('employees/<int:pk>/', views.EmployeeDetailView.as_view(), name='employee-detail'),
    
    # Department Management
    path('departments/', views.DepartmentListCreateView.as_view(), name='department-list-create'),
    
    # Designation Management
    path('designations/', views.DesignationListCreateView.as_view(), name='designation-list-create'),
    path('designations/<int:pk>/', views.DesignationDetailView.as_view(), name='designation-detail'),
    
    # Recruitment Management
    path('job-postings/', views.JobPostingListCreateView.as_view(), name='job-posting-list-create'),
    path('job-postings/<int:pk>/', views.JobPostingDetailView.as_view(), name='job-posting-detail'),
    path('job-applications/', views.JobApplicationListCreateView.as_view(), name='job-application-list-create'),
    path('job-applications/<int:pk>/', views.JobApplicationDetailView.as_view(), name='job-application-detail'),
    
    # Interview Management
    path('interviews/', interview_views.InterviewListCreateView.as_view(), name='interview-list-create'),
    path('interviews/<int:pk>/', interview_views.InterviewDetailView.as_view(), name='interview-detail'),
    
    # Offer Management
    path('offers/', offer_views.OfferListCreateView.as_view(), name='offer-list-create'),
    path('offers/<int:pk>/', offer_views.OfferDetailView.as_view(), name='offer-detail'),
    
    # Public Job Posting APIs (no authentication)
    path('public/jobs/', views.PublicJobListView.as_view(), name='public-job-list'),
    path('public/jobs/<int:pk>/', views.PublicJobDetailView.as_view(), name='public-job-detail'),
    path('public/jobs/<int:job_id>/apply/', views.PublicJobApplicationView.as_view(), name='public-job-apply'),
    
    # Attendance Management
    path('attendance/system/', attendance_views.AttendanceSystemViewSet.as_view({'get': 'list', 'post': 'create'}), name='attendance-system'),
    path('attendance/system/<int:pk>/', attendance_views.AttendanceSystemViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'}), name='attendance-system-detail'),
    path('attendance/records/', attendance_views.AttendanceViewSet.as_view({'get': 'list', 'post': 'create'}), name='attendance-records'),
    path('attendance/records/<int:pk>/', attendance_views.AttendanceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='attendance-record-detail'),
    path('attendance/dashboard-stats/', attendance_views.AttendanceViewSet.as_view({'get': 'dashboard_stats'}), name='attendance-dashboard-stats'),
    path('attendance/manual-entry/', attendance_views.AttendanceViewSet.as_view({'post': 'manual_entry'}), name='attendance-manual-entry'),
    
    # Mobile & Device Attendance APIs (no authentication)
    path('attendance/mobile/', attendance_views.mobile_attendance, name='mobile-attendance'),
    path('attendance/face-recognition/', attendance_views.face_recognition_attendance, name='face-recognition-attendance'),
    path('attendance/validate-location/', attendance_views.validate_location, name='validate-location'),
    path('attendance/biometric-sync/', attendance_views.biometric_sync, name='biometric-sync'),
    
    # Payroll Analytics
    path('payroll/analytics/', payroll_views.payroll_analytics, name='payroll-analytics'),
    
    # HR Analytics
    path('analytics/dashboard/', analytics_views.hr_analytics_dashboard, name='hr-analytics-dashboard'),
    path('analytics/attendance/', analytics_views.attendance_analytics, name='attendance-analytics'),
    path('analytics/payroll/', analytics_views.payroll_analytics, name='analytics-payroll'),
    
    # Performance Analytics
    path('performance/analytics/', performance_views.performance_analytics, name='performance-analytics'),
    path('performance/employee/<int:employee_id>/', performance_views.employee_performance_report, name='employee-performance'),
    
    # Dropdown APIs
    path('dropdown/departments/', views.get_departments, name='get-departments'),
    path('dropdown/designations/', views.get_designations, name='get-designations'),
    
    # Mobile App Authentication APIs
    path('employee-login/', views.employee_mobile_login, name='employee-mobile-login'),
    path('set-mobile-password/', views.set_mobile_password, name='set-mobile-password'),
    path('download-mobile-credentials/', views.download_mobile_credentials, name='download-mobile-credentials'),
    
    # Statutory Compliance APIs
    path('statutory/dashboard/', statutory_views.statutory_compliance_dashboard, name='statutory-dashboard'),
    path('statutory/pf-ecr/', statutory_views.generate_pf_ecr, name='generate-pf-ecr'),
    path('statutory/esi-return/', statutory_views.generate_esi_return, name='generate-esi-return'),
    path('statutory/validate-compliance/', statutory_views.validate_compliance, name='validate-compliance'),
    
    # Government Portal Integration APIs (Phase 4)
    path('government/credentials/', government_views.PortalCredentialsViewSet.as_view({'get': 'list', 'post': 'create'}), name='portal-credentials'),
    path('government/submit/', government_views.submit_to_government_portal, name='submit-to-portal'),
    path('government/check-status/', government_views.check_submission_status, name='check-status'),
    path('government/generate-challan/', government_views.generate_challan, name='generate-challan'),
    path('government/submission-history/', government_views.get_submission_history, name='submission-history'),
    path('government/challans/', government_views.get_challans, name='get-challans'),
    
    # Form Generation APIs
    path('forms/form16/', form_views.generate_form16, name='generate-form16'),
    path('forms/payroll-register/', form_views.generate_payroll_register, name='generate-payroll-register'),
    path('forms/bank-advice/', form_views.generate_bank_advice, name='generate-bank-advice'),
    path('forms/pf-challan/', form_views.generate_pf_challan, name='generate-pf-challan'),
    path('forms/esi-challan/', form_views.generate_esi_challan, name='generate-esi-challan'),
    
    # Leave Management APIs
    path('leave-balances/', leave_views.LeaveBalanceViewSet.as_view({'get': 'list', 'post': 'create'}), name='leave-balances'),
    path('leave-applications/', leave_views.LeaveApplicationViewSet.as_view({'get': 'list', 'post': 'create'}), name='leave-applications'),
    path('leave-applications/<int:pk>/approve/', leave_views.LeaveApplicationViewSet.as_view({'post': 'approve'}), name='approve-leave'),
    path('leave-applications/<int:pk>/reject/', leave_views.LeaveApplicationViewSet.as_view({'post': 'reject'}), name='reject-leave'),
    path('holidays/', leave_views.HolidayViewSet.as_view({'get': 'list', 'post': 'create'}), name='holidays'),
]