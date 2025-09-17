from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, DesignationViewSet, EmployeeViewSet,
    AttendanceViewSet, PayrollViewSet, LeaveApplicationViewSet,
    HRDashboardViewSet
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'designations', DesignationViewSet, basename='designation')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'attendances', AttendanceViewSet, basename='attendance')
router.register(r'payrolls', PayrollViewSet, basename='payroll')
router.register(r'leave-applications', LeaveApplicationViewSet, basename='leave-application')
router.register(r'dashboard', HRDashboardViewSet, basename='hr-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]