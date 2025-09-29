from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import attendance_views
from . import payroll_views
from . import analytics_views
from . import performance_views

router = DefaultRouter()
router.register(r'dashboard', views.HRDashboardViewSet, basename='hr-dashboard')
router.register(r'payroll', payroll_views.PayrollViewSet, basename='payroll')
router.register(r'payslips', payroll_views.PayslipViewSet, basename='payslips')
router.register(r'payroll-settings', payroll_views.PayrollSettingsViewSet, basename='payroll-settings')
router.register(r'performance', performance_views.PerformanceViewSet, basename='performance')

urlpatterns = [
    path('', include(router.urls)),
    
    # Employee Management
    path('employees/', views.EmployeeListCreateView.as_view(), name='employee-list-create'),
    path('employees/<int:pk>/', views.EmployeeDetailView.as_view(), name='employee-detail'),
    
    # Department Management
    path('departments/', views.DepartmentListCreateView.as_view(), name='department-list-create'),
    
    # Recruitment Management
    path('job-postings/', views.JobPostingListCreateView.as_view(), name='job-posting-list-create'),
    path('job-postings/<int:pk>/', views.JobPostingDetailView.as_view(), name='job-posting-detail'),
    path('job-applications/', views.JobApplicationListCreateView.as_view(), name='job-application-list-create'),
    
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
    path('api/departments/', views.get_departments, name='get-departments'),
    path('api/designations/', views.get_designations, name='get-designations'),
    
    # Mobile App Authentication APIs
    path('employee-login/', views.employee_mobile_login, name='employee-mobile-login'),
    path('set-mobile-password/', views.set_mobile_password, name='set-mobile-password'),
    path('download-mobile-credentials/', views.download_mobile_credentials, name='download-mobile-credentials'),
]