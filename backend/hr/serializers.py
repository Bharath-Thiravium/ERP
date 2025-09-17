from rest_framework import serializers
from .models import (
    Department, Designation, Employee, SalaryStructure, 
    Attendance, LeaveType, LeaveBalance, LeaveApplication, Payroll
)

class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'head', 'employee_count', 'created_at']
        
    def get_employee_count(self, obj):
        return obj.employees.filter(status='active').count()

class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Designation
        fields = ['id', 'title', 'department', 'department_name', 'level']

class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_title = serializers.CharField(source='designation.title', read_only=True)
    reporting_manager_name = serializers.CharField(source='reporting_manager.full_name', read_only=True)
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'gender', 'date_of_birth',
            'address_line1', 'address_line2', 'city', 'state', 'pincode', 'country',
            'department', 'department_name', 'designation', 'designation_title',
            'reporting_manager', 'reporting_manager_name', 'join_date', 'confirmation_date',
            'aadhar_number', 'pan_number', 'uan_number', 'esi_number',
            'bank_name', 'bank_account_number', 'bank_ifsc_code', 'bank_branch',
            'status', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'aadhar_number': {'write_only': True},
            'pan_number': {'write_only': True},
            'bank_account_number': {'write_only': True}
        }

class SalaryStructureSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    gross_salary = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    pf_deduction = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    esi_deduction = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = SalaryStructure
        fields = [
            'id', 'employee', 'employee_name',
            'basic_salary', 'hra', 'da', 'transport_allowance', 'medical_allowance', 'other_allowances',
            'gross_salary', 'pf_applicable', 'esi_applicable', 'professional_tax',
            'pf_deduction', 'esi_deduction', 'effective_from'
        ]

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name', 'employee_id', 'department_name',
            'date', 'check_in_time', 'check_out_time', 'working_hours', 'overtime_hours',
            'status', 'check_in_location', 'check_out_location',
            'check_in_latitude', 'check_in_longitude', 'notes'
        ]

class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['id', 'name', 'annual_allocation', 'carry_forward', 'max_carry_forward', 'is_active']

class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    available = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = LeaveBalance
        fields = [
            'id', 'employee', 'employee_name', 'leave_type', 'leave_type_name',
            'year', 'allocated', 'used', 'carry_forward', 'available'
        ]

class LeaveApplicationSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    
    class Meta:
        model = LeaveApplication
        fields = [
            'id', 'employee', 'employee_name', 'leave_type', 'leave_type_name',
            'from_date', 'to_date', 'days_requested', 'reason', 'status',
            'approved_by', 'approved_by_name', 'approved_at', 'rejection_reason',
            'applied_at', 'updated_at'
        ]

class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    
    class Meta:
        model = Payroll
        fields = [
            'id', 'employee', 'employee_name', 'employee_id', 'department_name',
            'month', 'year', 'basic_salary', 'hra', 'da', 'transport_allowance',
            'medical_allowance', 'other_allowances', 'overtime_amount',
            'pf_deduction', 'esi_deduction', 'professional_tax', 'tds_deduction', 'other_deductions',
            'working_days', 'present_days', 'leave_days',
            'gross_salary', 'total_deductions', 'net_salary',
            'status', 'processed_at', 'created_at'
        ]

# Dashboard Statistics Serializers
class HRStatsSerializer(serializers.Serializer):
    total_employees = serializers.IntegerField()
    active_employees = serializers.IntegerField()
    present_today = serializers.IntegerField()
    on_leave = serializers.IntegerField()
    pending_leave_approvals = serializers.IntegerField()
    monthly_payroll = serializers.DecimalField(max_digits=15, decimal_places=2)
    attendance_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    departments_count = serializers.IntegerField()
    new_joinees = serializers.IntegerField()
    active_recruitments = serializers.IntegerField()
    recent_activity = serializers.ListField(child=serializers.DictField(), required=False)

class AttendanceSummarySerializer(serializers.Serializer):
    date = serializers.DateField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    on_leave = serializers.IntegerField()
    attendance_rate = serializers.DecimalField(max_digits=5, decimal_places=2)