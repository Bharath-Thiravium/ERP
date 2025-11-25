from rest_framework import serializers
from .quotation_template_models import CompanyQuotationTemplateSettings

class CompanyQuotationTemplateSettingsSerializer(serializers.ModelSerializer):
    """Serializer for quotation and PO template settings"""
    
    template_choices = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanyQuotationTemplateSettings
        fields = ['selected_template', 'selected_po_template', 'template_choices', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_template_choices(self, obj):
        """Return available template choices"""
        return [
            {
                'value': choice[0],
                'label': choice[1],
                'description': self._get_template_description(choice[0])
            }
            for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES
        ]
    
    def _get_template_description(self, template_code):
        """Get detailed description for each template"""
        descriptions = {
            'AS': 'Clean and simple layout with right-aligned company info and professional styling',
            'BKGE': 'Modern professional template with centered header and structured table design',
            'TC': 'Detailed template with comprehensive terms and conditions section'
        }
        return descriptions.get(template_code, 'Professional quotation template')

class QuotationTemplatePreviewSerializer(serializers.Serializer):
    """Serializer for template preview requests"""
    
    template_name = serializers.ChoiceField(
        choices=CompanyQuotationTemplateSettings.TEMPLATE_CHOICES,
        required=True
    )
    
    def validate_template_name(self, value):
        """Validate template name"""
        valid_templates = [choice[0] for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES]
        if value not in valid_templates:
            raise serializers.ValidationError(f"Invalid template. Choose from: {', '.join(valid_templates)}")
        return value