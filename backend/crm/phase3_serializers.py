from rest_framework import serializers
from .phase3_models import (
    EmailTemplate, MarketingCampaign, EmailSend, AutomationWorkflow,
    ReportTemplate, Dashboard, BusinessIntelligence
)


# Marketing Automation Serializers
class EmailTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    template_type_display = serializers.CharField(source='get_template_type_display', read_only=True)

    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class MarketingCampaignSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    campaign_type_display = serializers.CharField(source='get_campaign_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    email_template_name = serializers.CharField(source='email_template.name', read_only=True)
    open_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    click_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = MarketingCampaign
        fields = '__all__'
        read_only_fields = ['campaign_id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        company = validated_data['company']
        # Generate campaign ID
        campaign_count = MarketingCampaign.objects.filter(company=company).count() + 1
        validated_data['campaign_id'] = f"{company.company_prefix}CAMP{campaign_count:04d}"
        return super().create(validated_data)


class EmailSendSerializer(serializers.ModelSerializer):
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmailSend
        fields = '__all__'
        read_only_fields = ['created_at']


class AutomationWorkflowSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    trigger_type_display = serializers.CharField(source='get_trigger_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    completion_rate = serializers.SerializerMethodField()

    class Meta:
        model = AutomationWorkflow
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_completion_rate(self, obj):
        if obj.total_triggered > 0:
            return (obj.total_completed / obj.total_triggered) * 100
        return 0


# Advanced Reporting Serializers
class ReportTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    chart_type_display = serializers.CharField(source='get_chart_type_display', read_only=True)

    class Meta:
        model = ReportTemplate
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class DashboardSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    shared_with_names = serializers.SerializerMethodField()

    class Meta:
        model = Dashboard
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_shared_with_names(self, obj):
        return [user.get_full_name() for user in obj.shared_with.all()]


class BusinessIntelligenceSerializer(serializers.ModelSerializer):
    insight_type_display = serializers.CharField(source='get_insight_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True)

    class Meta:
        model = BusinessIntelligence
        fields = '__all__'
        read_only_fields = ['created_at', 'acknowledged_by', 'acknowledged_at']