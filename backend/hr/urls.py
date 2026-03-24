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

router = DefaultRouter()
router.register(r'dashboard', views.HRDashboardViewSet, basename='hr-dashboard')
router.register(r'payroll', payroll_views.PayrollViewSet, basename='payroll')
router.register(r'payslips', payroll_views.PayslipViewSet, basename='payslips')
router.register(r'payroll-settings', payroll_views.PayrollSettingsViewSet, basename='payroll-settings')
router.register(r'performance', performance_views.PerformanceViewSet, basename='performance')
router.register(r'attendance', attendance_views.AttendanceViewSet, basename='attendance')
router.register(r'attendance-system', attendance_views.AttendanceSystemViewSet, basename='attendance-system')
router.register(r'leave-applications', leave_views.LeaveApplicationViewSet, basename='leave-applications')
router.register(r'leave-types', leave_views.LeaveTypeViewSet, basename='leave-types')
router.register(r'leave-balances', leave_views.LeaveBalanceViewSet, basename='leave-balances')
router.register(r'holidays', leave_views.HolidayViewSet, basename='holidays')
router.register(r'compliance', advanced_views.ComplianceViewSet, basename='compliance')
router.register(r'statutory-settings', statutory_views.StatutorySettingsViewSet, basename='statutory-settings')

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
    # Alias: frontend uses hyphen, router generates underscore
    path('attendance/dashboard-stats/', attendance_views.AttendanceViewSet.as_view({'get': 'dashboard_stats'}), name='attendance-dashboard-stats-alias'),

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
