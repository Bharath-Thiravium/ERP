from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import attendance_views
from . import biometric_views
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
from . import share_analytics_views
from . import form_automation_views

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

# Share Analytics Routes (Phase 3)
router.register(r'share-analytics', share_analytics_views.ShareAnalyticsViewSet, basename='share-analytics')
router.register(r'message-templates', share_analytics_views.MessageTemplateViewSet, basename='message-templates')

# Form Automation Routes
router.register(r'form-templates', form_automation_views.ComplianceFormTemplateViewSet, basename='form-templates')
router.register(r'monthly-forms', form_automation_views.MonthlyComplianceFormViewSet, basename='monthly-forms')
router.register(r'employee-form-entries', form_automation_views.EmployeeFormEntryViewSet, basename='employee-form-entries')

urlpatterns = [
    path('', include(router.urls)),
    
    # Employee Management
    path('employees/', views.EmployeeListCreateView.as_view(), name='employee-list-create'),
    path('employees/<int:pk>/', views.EmployeeDetailView.as_view(), name='employee-detail'),
    
    # Department Management
    path('departments/', views.DepartmentListCreateView.as_view(), name='department-list-create'),
    path('departments/<int:pk>/', views.DepartmentDetailView.as_view(), name='department-detail'),
    
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
    
    # Biometric Device Management APIs
    path('attendance/biometric-devices/', biometric_views.BiometricDeviceViewSet.as_view({'get': 'list', 'post': 'create'}), name='biometric-devices'),
    path('attendance/biometric-scan/', biometric_views.biometric_scan, name='biometric-scan'),
    path('attendance/test-device/', biometric_views.test_device, name='test-device'),
    
    # Payroll Analytics
    path('payroll/analytics/', payroll_views.payroll_analytics, name='payroll-analytics'),
    
    # HR Analytics
    path('analytics/dashboard/', analytics_views.hr_analytics_dashboard, name='hr-analytics-dashboard'),
    path('analytics/attendance/', analytics_views.attendance_analytics, name='attendance-analytics'),
    path('analytics/payroll/', analytics_views.payroll_analytics, name='analytics-payroll'),
    
    # Performance Analytics
    path('performance/analytics/', performance_views.performance_analytics, name='performance-analytics'),
    path('performance/get_all_reviews/', performance_views.PerformanceViewSet.as_view({'get': 'get_all_reviews'}), name='performance-all-reviews'),
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
    path('statutory/pt-return/', statutory_views.generate_pt_return, name='generate-pt-return'),
    path('statutory/tds-24q/', statutory_views.generate_tds_24q, name='generate-tds-24q'),
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
    path('leave-types/', leave_views.LeaveTypeViewSet.as_view({'get': 'list', 'post': 'create'}), name='leave-types'),
    path('leave-types/<int:pk>/', leave_views.LeaveTypeViewSet.as_view({'delete': 'destroy'}), name='leave-type-detail'),
    path('leave-balances/', leave_views.LeaveBalanceViewSet.as_view({'get': 'list', 'post': 'create'}), name='leave-balances'),
    path('leave-balances/initialize/', leave_views.LeaveBalanceViewSet.as_view({'post': 'initialize_balances'}), name='initialize-leave-balances'),
    path('leave-balances/recalculate/', leave_views.LeaveBalanceViewSet.as_view({'post': 'recalculate_balances'}), name='recalculate-leave-balances'),
    path('leave-applications/', leave_views.LeaveApplicationViewSet.as_view({'get': 'list', 'post': 'create'}), name='leave-applications'),
    path('leave-applications/<int:pk>/approve/', leave_views.LeaveApplicationViewSet.as_view({'post': 'approve'}), name='approve-leave'),
    path('leave-applications/<int:pk>/reject/', leave_views.LeaveApplicationViewSet.as_view({'post': 'reject'}), name='reject-leave'),
    path('holidays/', leave_views.HolidayViewSet.as_view({'get': 'list', 'post': 'create'}), name='holidays'),
    
    # Share Analytics APIs
    path('share-analytics/track-share/', share_analytics_views.ShareAnalyticsViewSet.as_view({'post': 'track_share'}), name='track-share'),
    path('share-analytics/track-click/', share_analytics_views.track_click, name='track-click'),
    path('share-analytics/track-application/', share_analytics_views.track_application_from_share, name='track-application'),
    
    # Direct PDF Export (bypasses DRF)
    path('monthly-forms/<uuid:form_id>/export-pdf/', form_automation_views.export_monthly_form_pdf, name='export-monthly-form-pdf'),
]