from rest_framework import serializers
from .form_automation_models import ComplianceFormTemplate, MonthlyComplianceForm, EmployeeFormEntry
from .models import Employee

class ComplianceFormTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceFormTemplate
        fields = [
            'id', 'form_type', 'template_name', 'is_monthly_auto_generate',
            'generation_day', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class EmployeeFormEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    
    class Meta:
        model = EmployeeFormEntry
        fields = [
            'id', 'employee', 'employee_name', 'employee_id',
            'fine_amount', 'fine_reason', 'fine_date',
            'designation', 'department', 'joining_date', 'basic_wage',
            'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class MonthlyComplianceFormSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.template_name', read_only=True)
    form_type = serializers.CharField(source='template.form_type', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    employee_entries = EmployeeFormEntrySerializer(many=True, read_only=True)
    
    class Meta:
        model = MonthlyComplianceForm
        fields = [
            'id', 'template', 'template_name', 'form_type', 'month',
            'status', 'total_employees', 'auto_generated',
            'generated_at', 'approved_by', 'approved_by_name', 'approved_at',
            'employee_entries'
        ]
        read_only_fields = [
            'id', 'generated_at', 'approved_by', 'approved_by_name', 'approved_at'
        ]