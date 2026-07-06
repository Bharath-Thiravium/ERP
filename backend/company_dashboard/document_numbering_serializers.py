from rest_framework import serializers
from .document_numbering_models import DocumentNumberingConfig, DocumentNumberingHistory, FinancialYearSettings, ServiceDocumentTypes
from authentication.models import Service


class DocumentNumberingConfigSerializer(serializers.ModelSerializer):
    """Serializer for document numbering configuration"""
    
    service_name = serializers.CharField(source='service.name', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    next_number_preview = serializers.CharField(read_only=True)
    
    class Meta:
        model = DocumentNumberingConfig
        fields = [
            'id', 'service', 'service_name', 'company', 'document_type', 
            'document_type_display', 'financial_year', 'prefix', 'starting_number', 
            'current_counter', 'number_padding', 'is_active', 'allow_manual_override',
            'custom_pattern', 'include_company_prefix', 'year_format', 'separator',
            'next_number_preview', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'service', 'company', 'current_counter', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['next_number_preview'] = instance.get_next_number_preview()
        return data
    
    def validate_financial_year(self, value):
        """Validate financial year format"""
        try:
            years = value.split('-')
            if len(years) != 2:
                raise ValueError
            start_year = int(years[0])
            end_year_short = int(years[1])
            
            # Check if start year is 4 digits and end year is 2 digits
            if len(years[0]) != 4 or len(years[1]) != 2:
                raise ValueError
            
            # Convert 2-digit end year to 4-digit for comparison
            end_year_full = start_year + 1
            expected_end_year_short = end_year_full % 100
            
            if end_year_short != expected_end_year_short:
                raise ValueError
        except (ValueError, IndexError):
            raise serializers.ValidationError('Financial year must be in format YYYY-YY (e.g., 2024-25)')
        return value
    
    def validate_prefix(self, value):
        """Validate prefix format"""
        if value and not value.replace('-', '').replace('_', '').isalnum():
            raise serializers.ValidationError('Prefix can only contain letters, numbers, hyphens, and underscores')
        return value
    
    def validate_starting_number(self, value):
        """Validate starting number"""
        if value < 1:
            raise serializers.ValidationError('Starting number must be at least 1')
        return value
    
    def validate_number_padding(self, value):
        """Validate number padding"""
        if value < 1 or value > 10:
            raise serializers.ValidationError('Number padding must be between 1 and 10')
        return value
    
    def validate_custom_pattern(self, value):
        """Validate custom pattern"""
        if value:
            valid_placeholders = ['{PREFIX}', '{COMPANY}', '{YEAR}', '{FY}', '{FY_SHORT}', '{NUMBER}', '{SEP}']
            if '{NUMBER}' not in value:
                raise serializers.ValidationError('Custom pattern must include {NUMBER} placeholder')
            
            # Check for invalid placeholders
            import re
            placeholders = re.findall(r'\{[^}]+\}', value)
            invalid_placeholders = [p for p in placeholders if p not in valid_placeholders]
            if invalid_placeholders:
                raise serializers.ValidationError(f'Invalid placeholders: {invalid_placeholders}. Valid: {valid_placeholders}')
        
        return value
    
    def validate_separator(self, value):
        """Validate separator"""
        if len(value) > 5:
            raise serializers.ValidationError('Separator cannot be longer than 5 characters')
        return value


class DocumentNumberingHistorySerializer(serializers.ModelSerializer):
    """Serializer for document numbering history"""
    
    document_type = serializers.CharField(source='config.document_type', read_only=True)
    document_type_display = serializers.CharField(source='config.get_document_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = DocumentNumberingHistory
        fields = [
            'id', 'document_number', 'document_type', 'document_type_display',
            'is_manual_override', 'override_reason', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FinancialYearSettingsSerializer(serializers.ModelSerializer):
    """Serializer for financial year settings"""
    
    service_name = serializers.CharField(source='service.name', read_only=True)
    
    class Meta:
        model = FinancialYearSettings
        fields = [
            'id', 'service', 'service_name', 'company', 'financial_year',
            'start_date', 'end_date', 'is_active', 'is_current',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'service', 'company', 'created_at', 'updated_at']
    
    def validate_financial_year(self, value):
        """Validate financial year format"""
        try:
            years = value.split('-')
            if len(years) != 2:
                raise ValueError
            start_year = int(years[0])
            end_year_short = int(years[1])
            if len(years[0]) != 4 or len(years[1]) != 2:
                raise ValueError
            if end_year_short != (start_year + 1) % 100:
                raise ValueError
        except (ValueError, IndexError):
            raise serializers.ValidationError('Financial year must be in format YYYY-YY (e.g., 2024-25)')
        return value
    
    def validate(self, data):
        """Validate start and end dates"""
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] >= data['end_date']:
                raise serializers.ValidationError('Start date must be before end date')
        return data


class DocumentNumberingSetupSerializer(serializers.Serializer):
    """Serializer for bulk document numbering setup"""
    
    financial_year = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    
    # Document type configurations
    quotation_prefix = serializers.CharField(max_length=20, default='QT')
    purchase_order_prefix = serializers.CharField(max_length=20, default='PO')
    invoice_prefix = serializers.CharField(max_length=20, default='INV')
    proforma_invoice_prefix = serializers.CharField(max_length=20, default='PI')
    payment_prefix = serializers.CharField(max_length=20, default='PAY')
    customer_prefix = serializers.CharField(max_length=20, default='CUST')
    vendor_prefix = serializers.CharField(max_length=20, default='VEN')
    product_prefix = serializers.CharField(max_length=20, default='PRD')
    
    # Common settings
    starting_number = serializers.IntegerField(default=1, min_value=1)
    number_padding = serializers.IntegerField(default=3, min_value=1, max_value=10)
    allow_manual_override = serializers.BooleanField(default=False)
    
    def validate_financial_year(self, value):
        """Validate financial year format"""
        try:
            years = value.split('-')
            if len(years) != 2:
                raise ValueError
            start_year = int(years[0])
            end_year_short = int(years[1])
            
            # Check if start year is 4 digits and end year is 2 digits
            if len(years[0]) != 4 or len(years[1]) != 2:
                raise ValueError
            
            # Convert 2-digit end year to 4-digit for comparison
            end_year_full = start_year + 1
            expected_end_year_short = end_year_full % 100
            
            if end_year_short != expected_end_year_short:
                raise ValueError
        except (ValueError, IndexError):
            raise serializers.ValidationError('Financial year must be in format YYYY-YY (e.g., 2024-25)')
        return value
    
    def validate(self, data):
        """Validate start and end dates"""
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError('Start date must be before end date')
        return data


class ManualOverrideSerializer(serializers.Serializer):
    """Serializer for manual document number override"""
    
    document_number = serializers.CharField(max_length=100)
    override_reason = serializers.CharField(max_length=500)
    
    def validate_document_number(self, value):
        """Validate document number format"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('Document number is required')
        
        # Basic format validation (can be enhanced based on requirements)
        if len(value) > 100:
            raise serializers.ValidationError('Document number is too long')
        
        return value.strip()
    
    def validate_override_reason(self, value):
        """Validate override reason"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('Override reason is required')
        
        if len(value) < 10:
            raise serializers.ValidationError('Override reason must be at least 10 characters')
        
        return value.strip()


class ServiceWiseSetupSerializer(serializers.Serializer):
    """Serializer for service-wise document numbering setup"""
    
    financial_year = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    
    # Services to configure
    services = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of service types to configure (finance, hr, crm, inventory)"
    )
    
    # Global settings
    global_settings = serializers.DictField(
        required=False,
        help_text="Global settings to apply to all document types"
    )
    
    # Service-specific configurations
    service_configurations = serializers.DictField(
        child=serializers.DictField(),
        required=False,
        help_text="Service-specific configurations"
    )
    
    # Document-specific configurations
    document_configurations = serializers.DictField(
        child=serializers.DictField(),
        required=False,
        help_text="Document-specific configurations"
    )
    
    def validate_financial_year(self, value):
        """Validate financial year format"""
        try:
            years = value.split('-')
            if len(years) != 2:
                raise ValueError
            start_year = int(years[0])
            end_year_short = int(years[1])
            
            if len(years[0]) != 4 or len(years[1]) != 2:
                raise ValueError
            
            end_year_full = start_year + 1
            expected_end_year_short = end_year_full % 100
            
            if end_year_short != expected_end_year_short:
                raise ValueError
        except (ValueError, IndexError):
            raise serializers.ValidationError('Financial year must be in format YYYY-YY (e.g., 2024-25)')
        return value
    
    def validate_services(self, value):
        """Validate service types"""
        from .document_numbering_models import ServiceDocumentTypes
        
        valid_services = list(ServiceDocumentTypes.SERVICE_DOCUMENT_MAPPING.keys())
        invalid_services = [s for s in value if s not in valid_services]
        
        if invalid_services:
            raise serializers.ValidationError(f'Invalid services: {invalid_services}. Valid: {valid_services}')
        
        return value
    
    def validate(self, data):
        """Validate start and end dates"""
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError('Start date must be before end date')
        return data


class PatternPreviewSerializer(serializers.Serializer):
    """Serializer for pattern preview"""
    
    prefix = serializers.CharField(max_length=20, default='DOC')
    custom_pattern = serializers.CharField(max_length=100, required=False, allow_blank=True)
    include_company_prefix = serializers.BooleanField(default=False)
    year_format = serializers.ChoiceField(
        choices=[('YY', 'YY'), ('YYYY', 'YYYY'), ('FY', 'FY'), ('FY_SHORT', 'FY_SHORT'), ('NONE', 'NONE')],
        default='YY'
    )
    separator = serializers.CharField(max_length=5, default='-')
    number_padding = serializers.IntegerField(min_value=1, max_value=10, default=3)
    financial_year = serializers.CharField(default='2025-26')
    company_prefix = serializers.CharField(max_length=10, default='COMP')

    def validate_financial_year(self, value):
        try:
            years = value.split('-')
            if len(years) != 2:
                raise ValueError
            start_year = int(years[0])
            end_year_short = int(years[1])
            if len(years[0]) != 4 or len(years[1]) != 2:
                raise ValueError
            if end_year_short != (start_year + 1) % 100:
                raise ValueError
        except (ValueError, IndexError):
            raise serializers.ValidationError('Financial year must be in format YYYY-YY (e.g., 2026-27)')
        return value
    
    def validate_custom_pattern(self, value):
        """Validate custom pattern"""
        if value:
            valid_placeholders = ['{PREFIX}', '{COMPANY}', '{YEAR}', '{FY}', '{FY_SHORT}', '{NUMBER}', '{SEP}']
            if '{NUMBER}' not in value:
                raise serializers.ValidationError('Custom pattern must include {NUMBER} placeholder')
            
            import re
            placeholders = re.findall(r'\{[^}]+\}', value)
            invalid_placeholders = [p for p in placeholders if p not in valid_placeholders]
            if invalid_placeholders:
                raise serializers.ValidationError(f'Invalid placeholders: {invalid_placeholders}. Valid: {valid_placeholders}')
        return value


class ServiceDocumentTypesSerializer(serializers.Serializer):
    """Serializer for service document types"""
    
    service = serializers.CharField()
    service_name = serializers.CharField()
    document_types = serializers.ListField(
        child=serializers.DictField()
    )
    
    def to_representation(self, instance):
        from .document_numbering_models import ServiceDocumentTypes
        from authentication.models import Service
        
        service_type = instance
        document_types = ServiceDocumentTypes.get_service_document_types(service_type)
        
        # Get service name
        try:
            service_obj = Service.objects.get(service_type=service_type)
            service_name = service_obj.name
        except Service.DoesNotExist:
            service_name = service_type.title()
        
        # Format document types
        formatted_doc_types = []
        for doc_type in document_types:
            formatted_doc_types.append({
                'type': doc_type,
                'name': doc_type.replace('_', ' ').title(),
                'default_prefix': ServiceDocumentTypes.get_default_prefix(doc_type)
            })
        
        return {
            'service': service_type,
            'service_name': service_name,
            'document_types': formatted_doc_types
        }
