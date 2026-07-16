from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import workflow_views
from . import payroll_views
from . import performance_views
from . import attendance_views
from . import leave_views
from . import statutory_views
from . import analytics_views
from . import advanced_views
from . import form_automation_views
from . import biometric_views
from . import government_views
from . import form_views
from . import interview_views
from . import offer_views
from . import share_analytics_views

router = DefaultRouter()
router.register(r'dashboard', views.HRDashboardViewSet, basename='hr-dashboard')
router.register(r'payroll', payroll_views.PayrollViewSet, basename='payroll')
router.register(r'payslips', payroll_views.PayslipViewSet, basename='payslips')
router.register(r'payroll-settings', payroll_views.PayrollSettingsViewSet, basename='payroll-settings')
router.register(r'performance', performance_views.PerformanceViewSet, basename='performance')
router.register(r'attendance', attendance_views.AttendanceViewSet, basename='attendance')
router.register(r'attendance-system', attendance_views.AttendanceSystemViewSet, basename='attendance-system')
router.register(r'attendance-policy', attendance_views.AttendancePolicyViewSet, basename='attendance-policy')
router.register(r'attendance-day-overrides', attendance_views.AttendanceDayOverrideViewSet, basename='attendance-day-overrides')
router.register(r'leave-applications', leave_views.LeaveApplicationViewSet, basename='leave-applications')
router.register(r'leave-types', leave_views.LeaveTypeViewSet, basename='leave-types')
router.register(r'leave-balances', leave_views.LeaveBalanceViewSet, basename='leave-balances')
router.register(r'holidays', leave_views.HolidayViewSet, basename='holidays')
router.register(r'compliance', advanced_views.ComplianceViewSet, basename='compliance')
router.register(r'advanced-reports', advanced_views.AdvancedReportsViewSet, basename='advanced-reports')
router.register(r'automation', advanced_views.AutomationViewSet, basename='automation')
router.register(r'integration', advanced_views.IntegrationViewSet, basename='integration')
router.register(r'statutory-settings', statutory_views.StatutorySettingsViewSet, basename='statutory-settings')
router.register(r'government-returns', statutory_views.GovernmentReturnViewSet, basename='government-returns')
router.register(r'statutory-alerts', statutory_views.ComplianceAlertViewSet, basename='statutory-alerts')
router.register(r'form-templates', form_automation_views.ComplianceFormTemplateViewSet, basename='form-templates')
router.register(r'monthly-forms', form_automation_views.MonthlyComplianceFormViewSet, basename='monthly-forms')
router.register(r'employee-form-entries', form_automation_views.EmployeeFormEntryViewSet, basename='employee-form-entries')
router.register(r'attendance-devices', biometric_views.BiometricDeviceViewSet, basename='attendance-devices')
router.register(r'portal-credentials', government_views.PortalCredentialsViewSet, basename='portal-credentials')
router.register(r'share-analytics', share_analytics_views.ShareAnalyticsViewSet, basename='share-analytics')
router.register(r'share-analytics/templates', share_analytics_views.MessageTemplateViewSet, basename='share-message-templates')

urlpatterns = [
    # Statutory function-based views (must be before router include to avoid pk conflict)
    path('statutory/dashboard/', statutory_views.statutory_compliance_dashboard, name='statutory-dashboard'),
    path('statutory/generate-pf-ecr/', statutory_views.generate_pf_ecr, name='generate-pf-ecr'),
    path('statutory/generate-esi-return/', statutory_views.generate_esi_return, name='generate-esi-return'),
    path('statutory/generate-pt-return/', statutory_views.generate_pt_return, name='generate-pt-return'),
    path('statutory/generate-tds-24q/', statutory_views.generate_tds_24q, name='generate-tds-24q'),
    path('statutory/validate-compliance/', statutory_views.validate_compliance, name='validate-compliance'),

    # HR Analytics
    path('analytics/dashboard/', analytics_views.hr_analytics_dashboard, name='hr-analytics-dashboard'),
    path('analytics/attendance/', analytics_views.attendance_analytics, name='attendance-analytics'),
    path('analytics/payroll/', analytics_views.payroll_analytics, name='payroll-analytics'),

    # Payroll Analytics
    path('payroll/analytics/', payroll_views.payroll_analytics, name='payroll-analytics-detail'),

    # Attendance function-based views (must be before router include)
    path('attendance/mobile/', attendance_views.mobile_attendance, name='mobile-attendance'),
    path('attendance/biometric-sync/', attendance_views.biometric_sync, name='biometric-sync'),
    path('attendance/validate-location/', attendance_views.validate_location, name='validate-location'),
    path('attendance/system/', attendance_views.AttendanceSystemViewSet.as_view({'get': 'list', 'post': 'create'}), name='attendance-system-list'),
    path('attendance/policy/', attendance_views.AttendancePolicyViewSet.as_view({'get': 'list', 'post': 'create'}), name='attendance-policy-list'),
    path('attendance/day-overrides/', attendance_views.AttendanceDayOverrideViewSet.as_view({'get': 'list', 'post': 'create'}), name='attendance-day-overrides-list'),
    # Alias: frontend uses hyphen, router generates underscore
    path('attendance/dashboard-stats/', attendance_views.AttendanceViewSet.as_view({'get': 'dashboard_stats'}), name='attendance-dashboard-stats-alias'),
    path('attendance/records/', attendance_views.AttendanceViewSet.as_view({'get': 'list'}), name='attendance-records-alias'),
    path('attendance/manual-entry/', attendance_views.AttendanceViewSet.as_view({'post': 'manual_entry'}), name='attendance-manual-entry-alias'),
    path('attendance/biometric-devices/', biometric_views.BiometricDeviceViewSet.as_view({'get': 'list', 'post': 'create'}), name='attendance-biometric-devices-alias'),
    path('attendance/biometric-scan/', biometric_views.biometric_scan, name='attendance-biometric-scan'),
    path('attendance/test-device/', biometric_views.test_device, name='attendance-test-device'),

    # Employee mobile app self-service APIs
    path('mobile/me/', attendance_views.mobile_employee_profile, name='mobile-employee-profile'),
    path('mobile/attendance/settings/', attendance_views.mobile_attendance_settings, name='mobile-attendance-settings'),
    path('mobile/attendance/today/', attendance_views.mobile_today_attendance, name='mobile-today-attendance'),
    path('mobile/attendance/history/', attendance_views.mobile_attendance_history, name='mobile-attendance-history'),
    path('mobile/attendance/validate-location/', attendance_views.mobile_validate_location, name='mobile-validate-location'),
    path('mobile/attendance/mark/', attendance_views.mobile_mark_attendance, name='mobile-mark-attendance'),
    path('mobile/leave/types/', leave_views.mobile_leave_types, name='mobile-leave-types'),
    path('mobile/leave/balances/', leave_views.mobile_leave_balances, name='mobile-leave-balances'),
    path('mobile/leave/applications/', leave_views.mobile_leave_applications, name='mobile-leave-applications'),
    path('notifications/', leave_views.hr_notifications, name='hr-notifications'),
    path('notifications/<int:notification_id>/read/', leave_views.mark_hr_notification_read, name='hr-notification-read'),
    path('mobile/payslips/', payroll_views.mobile_payslips, name='mobile-payslips'),

    # Frontend-compatible statutory and government aliases
    path('statutory/pf-ecr/', statutory_views.generate_pf_ecr, name='statutory-pf-ecr-alias'),
    path('statutory/esi-return/', statutory_views.generate_esi_return, name='statutory-esi-return-alias'),
    path('statutory/pt-return/', statutory_views.generate_pt_return, name='statutory-pt-return-alias'),
    path('statutory/tds-24q/', statutory_views.generate_tds_24q, name='statutory-tds-24q-alias'),
    path('forms/pf-challan/', form_views.generate_pf_challan, name='forms-pf-challan'),
    path('forms/esi-challan/', form_views.generate_esi_challan, name='forms-esi-challan'),
    path('government/submit/', government_views.submit_to_government_portal, name='government-submit'),
    path('government/check-status/', government_views.check_submission_status, name='government-check-status'),
    path('government/generate-challan/', government_views.generate_challan, name='government-generate-challan'),
    path('government/submission-history/', government_views.get_submission_history, name='government-submission-history'),
    path('government/challans/', government_views.get_challans, name='government-challans'),

    # Keep the public API spelling used by the recruitment frontend. DRF's
    # default action route uses track_share, so this explicit alias prevents
    # copy/share actions from producing a false 404 after succeeding locally.
    path(
        'share-analytics/track-share/',
        share_analytics_views.ShareAnalyticsViewSet.as_view({'post': 'track_share'}),
        name='share-analytics-track-share-hyphen',
    ),

    # Router URLs (after explicit paths to avoid pk conflict)
    path('', include(router.urls)),

    # Employee Management
    path('employees/', views.EmployeeListCreateView.as_view(), name='employee-list-create'),
    path('employees/<int:pk>/', views.EmployeeDetailView.as_view(), name='employee-detail'),

    # Job Management
    path('job-postings/', views.JobPostingListCreateView.as_view(), name='job-posting-list-create'),
    path('job-postings/<int:pk>/', views.JobPostingDetailView.as_view(), name='job-posting-detail'),
    path('job-applications/', views.JobApplicationListCreateView.as_view(), name='job-application-list-create'),
    path('job-applications/<int:pk>/', views.JobApplicationDetailView.as_view(), name='job-application-detail'),
    path('recruitment/analytics/', views.recruitment_analytics, name='recruitment-analytics'),
    path('interviews/', interview_views.InterviewListCreateView.as_view(), name='interview-list-create'),
    path('interviews/<int:pk>/', interview_views.InterviewDetailView.as_view(), name='interview-detail'),
    path('offers/', offer_views.OfferListCreateView.as_view(), name='offer-list-create'),
    path('offers/<int:pk>/', offer_views.OfferDetailView.as_view(), name='offer-detail'),

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
    path('bank/ifsc/<str:ifsc_code>/', views.lookup_ifsc, name='lookup-ifsc'),

    # Mobile App Authentication APIs
    path('employee-login/', views.employee_mobile_login, name='employee-mobile-login'),
    path('set-mobile-password/', views.set_mobile_password, name='set-mobile-password'),
    path('download-mobile-credentials/', views.download_mobile_credentials, name='download-mobile-credentials'),

    # Employee Workflow APIs
    path('workflow/create-employee/', workflow_views.create_employee_with_workflow, name='create-employee-workflow'),
    path('workflow/reset-password/', workflow_views.employee_reset_password, name='employee-reset-password'),
    path('workflow/status/', workflow_views.get_employee_workflow_status, name='employee-workflow-status'),
]
