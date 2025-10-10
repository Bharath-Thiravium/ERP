from rest_framework import serializers
from .statutory_models import (
    StatutorySettings,
    EmployeeStatutoryDetails,
    GovernmentReturn,
    ComplianceAlert,
    PayslipStatutoryDetails,
    MinimumWageRate,
    LaborLawCompliance
)
from .models import Employee, Payslip


class StatutorySettingsSerializer(serializers.ModelSerializer):
    """Serializer for company statutory settings"""
    
    class Meta:
        model = StatutorySettings
        fields = [
            'id', 'pf_establishment_code', 'pf_extension_code', 'pf_enabled',
            'pf_employee_rate', 'pf_employer_rate', 'pf_ceiling',
            'esi_employer_code', 'esi_local_office', 'esi_enabled',
            'esi_employee_rate', 'esi_employer_rate', 'esi_ceiling',
            'pt_registration_number', 'pt_state', 'pt_enabled',
            'tan_number', 'tds_circle', 'tds_enabled',
            'working_hours_per_day', 'working_days_per_week', 'overtime_rate_multiplier',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmployeeStatutoryDetailsSerializer(serializers.ModelSerializer):
    """Serializer for employee statutory details"""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    
    class Meta:
        model = EmployeeStatutoryDetails
        fields = [
            'id', 'employee', 'employee_name', 'employee_id',
            'uan_number', 'pf_account_number', 'pf_nomination_submitted',
            'esi_ip_number', 'esi_dispensary',
            'aadhaar_pan_linked', 'bank_verified', 'kyc_completed',
            'wage_category', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'employee_name', 'employee_id', 'created_at', 'updated_at']


class GovernmentReturnSerializer(serializers.ModelSerializer):
    """Serializer for government returns"""
    return_type_display = serializers.CharField(source='get_return_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = GovernmentReturn
        fields = [
            'id', 'return_type', 'return_type_display', 'period_month', 'period_year',
            'generated_date', 'filed_date', 'due_date', 'status', 'status_display',
            'return_data', 'file_path', 'acknowledgment_number',
            'total_employees', 'total_wages', 'total_contribution',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'return_type_display', 'status_display', 'created_by_name', 'created_at', 'updated_at']


class ComplianceAlertSerializer(serializers.ModelSerializer):
    """Serializer for compliance alerts"""
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.username', read_only=True)
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceAlert
        fields = [
            'id', 'alert_type', 'alert_type_display', 'title', 'message',
            'due_date', 'priority', 'priority_display', 'is_resolved',
            'resolved_date', 'resolved_by', 'resolved_by_name',
            'days_until_due', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'alert_type_display', 'priority_display', 'resolved_by_name', 'days_until_due', 'created_at', 'updated_at']
    
    def get_days_until_due(self, obj):
        if obj.due_date and not obj.is_resolved:
            from datetime import date
            delta = obj.due_date - date.today()
            return delta.days
        return None


class PayslipStatutoryDetailsSerializer(serializers.ModelSerializer):
    """Serializer for payslip statutory details"""
    payslip_info = serializers.SerializerMethodField()
    
    class Meta:
        model = PayslipStatutoryDetails
        fields = [
            'id', 'payslip', 'payslip_info',
            'pf_wages', 'pf_ceiling_applied', 'eps_contribution',
            'esi_wages', 'esi_ceiling_applied', 'esi_days',
            'hra_exemption', 'standard_deduction', 'taxable_income', 'tax_slab',
            'pt_state', 'pt_slab', 'pt_exemption_applied',
            'working_days_in_month', 'overtime_hours_calculated', 'overtime_rate_applied',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'payslip_info', 'created_at', 'updated_at']
    
    def get_payslip_info(self, obj):
        return {
            'employee_name': obj.payslip.emp_name,
            'payroll_cycle': obj.payslip.payroll_cycle.name,
            'gross_salary': obj.payslip.gross_salary,
            'net_salary': obj.payslip.net_salary
        }


class MinimumWageRateSerializer(serializers.ModelSerializer):
    """Serializer for minimum wage rates"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = MinimumWageRate
        fields = [
            'id', 'state', 'category', 'category_display',
            'daily_rate', 'monthly_rate', 'effective_from', 'effective_to',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'category_display', 'created_at']


class LaborLawComplianceSerializer(serializers.ModelSerializer):
    """Serializer for labor law compliance"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    compliance_status = serializers.SerializerMethodField()
    
    class Meta:
        model = LaborLawCompliance
        fields = [
            'id', 'company', 'company_name',
            'shops_establishment_license', 'license_expiry_date',
            'contract_labor_license', 'contract_license_expiry',
            'factory_license', 'factory_license_expiry',
            'working_hours_compliant', 'overtime_compliant', 'minimum_wage_compliant',
            'last_audit_date', 'next_audit_due', 'compliance_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_name', 'compliance_status', 'created_at', 'updated_at']
    
    def get_compliance_status(self, obj):
        total_checks = 3
        compliant_checks = sum([
            obj.working_hours_compliant,
            obj.overtime_compliant,
            obj.minimum_wage_compliant
        ])
        
        compliance_percentage = (compliant_checks / total_checks) * 100
        
        if compliance_percentage == 100:
            return {'status': 'Fully Compliant', 'percentage': compliance_percentage}
        elif compliance_percentage >= 75:
            return {'status': 'Mostly Compliant', 'percentage': compliance_percentage}
        elif compliance_percentage >= 50:
            return {'status': 'Partially Compliant', 'percentage': compliance_percentage}
        else:
            return {'status': 'Non-Compliant', 'percentage': compliance_percentage}


class StatutoryComplianceDashboardSerializer(serializers.Serializer):
    """Serializer for statutory compliance dashboard data"""
    pf_compliance = serializers.DictField()
    esi_compliance = serializers.DictField()
    pt_compliance = serializers.DictField()
    tds_compliance = serializers.DictField()
    pending_returns = serializers.ListField()
    overdue_returns = serializers.ListField()
    recent_alerts = serializers.ListField()
    compliance_summary = serializers.DictField()


class PFECRSerializer(serializers.Serializer):
    """Serializer for PF ECR generation"""
    period_month = serializers.IntegerField(min_value=1, max_value=12)
    period_year = serializers.IntegerField(min_value=2020, max_value=2030)
    include_employees = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of employee IDs to include. If empty, includes all eligible employees"
    )


class ESIReturnSerializer(serializers.Serializer):
    """Serializer for ESI return generation"""
    period_month = serializers.IntegerField(min_value=1, max_value=12)
    period_year = serializers.IntegerField(min_value=2020, max_value=2030)
    include_employees = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of employee IDs to include. If empty, includes all eligible employees"
    )


class ProfessionalTaxReturnSerializer(serializers.Serializer):
    """Serializer for Professional Tax return generation"""
    period_month = serializers.IntegerField(min_value=1, max_value=12)
    period_year = serializers.IntegerField(min_value=2020, max_value=2030)
    state = serializers.CharField(max_length=50)
    include_employees = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of employee IDs to include. If empty, includes all eligible employees"
    )


class TDS24QSerializer(serializers.Serializer):
    """Serializer for TDS 24Q return generation"""
    quarter = serializers.IntegerField(min_value=1, max_value=4)
    financial_year = serializers.CharField(max_length=10, help_text="Format: 2023-24")
    include_employees = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of employee IDs to include. If empty, includes all eligible employees"
    )


class Form16Serializer(serializers.Serializer):
    """Serializer for Form 16 generation"""
    employee_id = serializers.IntegerField()
    financial_year = serializers.CharField(max_length=10, help_text="Format: 2023-24")
    include_perquisites = serializers.BooleanField(default=False)
    include_investments = serializers.BooleanField(default=True)


class BankAdviceSerializer(serializers.Serializer):
    """Serializer for bank advice generation"""
    payroll_cycle_id = serializers.IntegerField()
    bank_name = serializers.CharField(max_length=100, required=False)
    payment_date = serializers.DateField()
    include_employees = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of employee IDs to include. If empty, includes all employees"
    )


class ComplianceValidationSerializer(serializers.Serializer):
    """Serializer for compliance validation"""
    validation_type = serializers.ChoiceField(choices=[
        ('pf_calculation', 'PF Calculation'),
        ('esi_calculation', 'ESI Calculation'),
        ('pt_calculation', 'Professional Tax Calculation'),
        ('tds_calculation', 'TDS Calculation'),
        ('minimum_wage', 'Minimum Wage Compliance'),
        ('working_hours', 'Working Hours Compliance'),
    ])
    employee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of employee IDs to validate. If empty, validates all employees"
    )
    period_month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    period_year = serializers.IntegerField(min_value=2020, max_value=2030, required=False)