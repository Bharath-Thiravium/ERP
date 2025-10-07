from rest_framework import serializers
from .multicompany_models import (
    Branch, TDSSection, ReverseChargeTransaction,
    ImportExportTransaction, InterStateTransaction, AdvancedTDSDeductee
)

class BranchListSerializer(serializers.ModelSerializer):
    """Serializer for branch list view"""
    
    class Meta:
        model = Branch
        fields = [
            'id', 'branch_code', 'branch_name', 'city', 'state', 'state_code',
            'gstin', 'is_active', 'is_head_office', 'phone', 'email'
        ]

class BranchDetailSerializer(serializers.ModelSerializer):
    """Serializer for branch detail view"""
    
    class Meta:
        model = Branch
        fields = [
            'id', 'branch_code', 'branch_name', 'address_line1', 'address_line2',
            'city', 'state', 'state_code', 'pincode', 'country', 'gstin',
            'phone', 'email', 'is_active', 'is_head_office', 'created_at', 'updated_at'
        ]

class BranchCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating branches"""
    
    class Meta:
        model = Branch
        fields = [
            'branch_code', 'branch_name', 'address_line1', 'address_line2',
            'city', 'state', 'state_code', 'pincode', 'country', 'gstin',
            'phone', 'email', 'is_active', 'is_head_office'
        ]
    
    def validate_gstin(self, value):
        """Validate GSTIN format"""
        if value and len(value) != 15:
            raise serializers.ValidationError("GSTIN must be exactly 15 characters")
        return value
    
    def validate_state_code(self, value):
        """Validate state code format"""
        if value and len(value) != 2:
            raise serializers.ValidationError("State code must be exactly 2 characters")
        return value

class TDSSectionSerializer(serializers.ModelSerializer):
    """Serializer for TDS sections"""
    
    class Meta:
        model = TDSSection
        fields = [
            'id', 'section_code', 'section_name', 'description',
            'individual_rate', 'company_rate', 'non_resident_rate',
            'threshold_limit', 'exemption_limit',
            'applicable_to_individuals', 'applicable_to_companies', 'applicable_to_non_residents'
        ]

class ReverseChargeTransactionSerializer(serializers.ModelSerializer):
    """Serializer for reverse charge transactions"""
    
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True)
    
    class Meta:
        model = ReverseChargeTransaction
        fields = [
            'id', 'transaction_type', 'supplier_name', 'supplier_gstin',
            'invoice_number', 'invoice_date', 'taxable_value',
            'cgst_rate', 'sgst_rate', 'igst_rate',
            'cgst_amount', 'sgst_amount', 'igst_amount',
            'total_tax', 'total_amount', 'branch', 'branch_name',
            'is_filed_in_gstr2', 'gstr2_filing_date', 'created_at'
        ]
        read_only_fields = ['cgst_amount', 'sgst_amount', 'igst_amount', 'total_tax', 'total_amount']

class ImportExportTransactionSerializer(serializers.ModelSerializer):
    """Serializer for import/export transactions"""
    
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True)
    
    class Meta:
        model = ImportExportTransaction
        fields = [
            'id', 'transaction_type', 'counterparty_name', 'counterparty_country',
            'counterparty_address', 'counterparty_tax_id', 'invoice_number', 'invoice_date',
            'foreign_currency', 'foreign_amount', 'exchange_rate', 'inr_amount',
            'bill_of_entry_number', 'bill_of_entry_date', 'port_code', 'shipping_bill_number',
            'igst_rate', 'igst_amount', 'customs_duty', 'branch', 'branch_name',
            'is_filed_in_gstr1', 'is_filed_in_gstr2', 'created_at'
        ]
        read_only_fields = ['inr_amount', 'igst_amount']

class InterStateTransactionSerializer(serializers.ModelSerializer):
    """Serializer for inter-state transactions"""
    
    source_branch_name = serializers.CharField(source='source_branch.branch_name', read_only=True)
    destination_branch_name = serializers.CharField(source='destination_branch.branch_name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    
    class Meta:
        model = InterStateTransaction
        fields = [
            'id', 'source_branch', 'source_branch_name', 'destination_branch', 'destination_branch_name',
            'customer', 'customer_name', 'supplier_name', 'supplier_gstin',
            'invoice', 'transaction_date', 'taxable_value', 'igst_rate', 'igst_amount',
            'eway_bill_number', 'eway_bill_date', 'vehicle_number',
            'is_filed_in_gstr1', 'gstr1_filing_date', 'created_at'
        ]
        read_only_fields = ['igst_amount']

class AdvancedTDSDeducteeSerializer(serializers.ModelSerializer):
    """Serializer for advanced TDS deductees"""
    
    tds_section_name = serializers.CharField(source='default_tds_section.section_name', read_only=True)
    applicable_tds_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = AdvancedTDSDeductee
        fields = [
            'id', 'deductee_name', 'deductee_type', 'pan_number',
            'address', 'city', 'state', 'pincode',
            'default_tds_section', 'tds_section_name',
            'is_lower_deduction_certificate', 'lower_deduction_rate',
            'certificate_number', 'certificate_valid_from', 'certificate_valid_to',
            'annual_threshold', 'current_year_payments', 'applicable_tds_rate',
            'is_active', 'created_at', 'updated_at'
        ]
    
    def get_applicable_tds_rate(self, obj):
        """Get the applicable TDS rate for this deductee"""
        return float(obj.get_applicable_tds_rate())
    
    def validate_pan_number(self, value):
        """Validate PAN number format"""
        import re
        if value and not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', value):
            raise serializers.ValidationError("Invalid PAN number format")
        return value

class BranchDropdownSerializer(serializers.ModelSerializer):
    """Simplified serializer for branch dropdown"""
    
    class Meta:
        model = Branch
        fields = ['id', 'branch_code', 'branch_name', 'gstin', 'state_code']

class TDSSectionDropdownSerializer(serializers.ModelSerializer):
    """Simplified serializer for TDS section dropdown"""
    
    class Meta:
        model = TDSSection
        fields = ['id', 'section_code', 'section_name', 'company_rate']