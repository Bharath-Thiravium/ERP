from rest_framework import serializers
from .models import PayrollCycle, Payslip, PayrollSettings, SalaryComponent, PayrollReport
from .models import Employee, Attendance
from datetime import datetime, timedelta
from decimal import Decimal


class PayrollSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollSettings
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']


class PayrollCycleSerializer(serializers.ModelSerializer):
    total_payslips = serializers.SerializerMethodField()
    calculated_by_name = serializers.CharField(source='calculated_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.username', read_only=True)
    
    class Meta:
        model = PayrollCycle
        fields = [
            'id', 'name', 'period_type', 'start_date', 'end_date', 'pay_date',
            'status', 'total_employees', 'total_gross', 'total_deductions', 'total_net',
            'calculated_by', 'calculated_by_name', 'approved_by', 'approved_by_name',
            'processed_by', 'processed_by_name', 'calculated_at', 'approved_at',
            'processed_at', 'total_payslips', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company', 'total_payslips', 'created_at', 'updated_at']
    
    def get_total_payslips(self, obj):
        return obj.payslips.count()


class PayslipSerializer(serializers.ModelSerializer):
    employee_full_name = serializers.CharField(source='employee.full_name', read_only=True)
    payroll_cycle_name = serializers.CharField(source='payroll_cycle.name', read_only=True)
    
    class Meta:
        model = Payslip
        fields = [
            'id', 'payroll_cycle', 'payroll_cycle_name', 'employee', 'employee_full_name',
            'emp_id', 'emp_name', 'emp_department', 'emp_designation',
            'working_days', 'present_days', 'absent_days', 'overtime_hours',
            'basic_salary', 'hra', 'conveyance_allowance', 'medical_allowance',
            'special_allowance', 'overtime_amount', 'bonus', 'incentive',
            'other_earnings', 'gross_salary', 'pf_employee', 'esi_employee',
            'professional_tax', 'tds', 'loan_deduction', 'advance_deduction',
            'other_deductions', 'total_deductions', 'pf_employer', 'esi_employer',
            'net_salary', 'ctc', 'status', 'payment_method', 'payment_reference',
            'paid_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PayrollReportSerializer(serializers.ModelSerializer):
    payroll_cycle_name = serializers.CharField(source='payroll_cycle.name', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.username', read_only=True)
    
    class Meta:
        model = PayrollReport
        fields = [
            'id', 'payroll_cycle', 'payroll_cycle_name', 'report_type',
            'file_path', 'generated_by', 'generated_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'company', 'created_at']


class PayrollCalculationSerializer(serializers.Serializer):
    payroll_cycle_id = serializers.IntegerField()
    include_employees = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of employee IDs to include. If empty, includes all active employees"
    )
    override_attendance = serializers.BooleanField(default=False)
    working_days = serializers.IntegerField(required=False)


class PayslipBulkUpdateSerializer(serializers.Serializer):
    payslip_ids = serializers.ListField(child=serializers.IntegerField())
    action = serializers.ChoiceField(choices=[
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('hold', 'Put on Hold'),
        ('process_payment', 'Process Payment')
    ])
    notes = serializers.CharField(max_length=500, required=False)


class PayrollDashboardSerializer(serializers.Serializer):
    current_cycle = PayrollCycleSerializer(read_only=True)
    total_employees = serializers.IntegerField()
    pending_payslips = serializers.IntegerField()
    approved_payslips = serializers.IntegerField()
    total_gross_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_net_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    statutory_deductions = serializers.DictField()
    recent_cycles = PayrollCycleSerializer(many=True, read_only=True)