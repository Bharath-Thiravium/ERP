from django.contrib import admin
from .models import (
    Department, Designation, Employee, SalaryStructure,
    Attendance, LeaveType, LeaveBalance, LeaveApplication, Payroll
)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'head', 'created_at']
    list_filter = ['company', 'created_at']
    search_fields = ['name', 'company__name']

@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ['title', 'department', 'level', 'created_at']
    list_filter = ['department', 'level']
    search_fields = ['title', 'department__name']

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'full_name', 'email', 'department', 'designation', 'status', 'join_date']
    list_filter = ['company', 'department', 'designation', 'status', 'join_date']
    search_fields = ['employee_id', 'first_name', 'last_name', 'email']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ['employee', 'basic_salary', 'gross_salary', 'effective_from']
    list_filter = ['effective_from', 'pf_applicable', 'esi_applicable']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'check_in_time', 'check_out_time', 'working_hours', 'status']
    list_filter = ['date', 'status', 'employee__department']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']
    date_hierarchy = 'date'

@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'annual_allocation', 'carry_forward', 'is_active']
    list_filter = ['company', 'is_active', 'carry_forward']

@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'year', 'allocated', 'used', 'available']
    list_filter = ['year', 'leave_type']
    search_fields = ['employee__first_name', 'employee__last_name']

@admin.register(LeaveApplication)
class LeaveApplicationAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'from_date', 'to_date', 'days_requested', 'status', 'applied_at']
    list_filter = ['status', 'leave_type', 'applied_at']
    search_fields = ['employee__first_name', 'employee__last_name']
    date_hierarchy = 'applied_at'

@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'year', 'gross_salary', 'net_salary', 'status', 'processed_at']
    list_filter = ['month', 'year', 'status', 'processed_at']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']