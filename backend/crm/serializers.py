from rest_framework import serializers
from .models import (
    Lead, Contact, Account, Opportunity, Activity, Campaign, CampaignMember, SalesTarget,
    Ticket, TicketCategory, SLA, KnowledgeBase, LeadScore, ScoringCriteria,
    PipelineStage, Deal, DealStageHistory, SalesQuota,
    CustomerInteraction, CustomerHealthScore, CustomerSegment, CustomerSegmentMembership, SalesAnalytics
)
from django.contrib.auth.models import User


def get_context_company(context):
    """Resolve the authenticated company from serializer context (service user or company user)."""
    request = context.get('request') if context else None
    if not request:
        return None
    service_user = getattr(request, 'service_user', None)
    if service_user:
        return service_user.company
    user = getattr(request, 'user', None)
    if user and hasattr(user, 'company_user'):
        return user.company_user.company
    return None


def validate_same_company(value, context, label):
    """Ensure a referenced FK instance belongs to the authenticated company.

    Prevents cross-tenant FK injection (e.g. a Company A user referencing a
    Company B lead/contact/account/opportunity by guessing/enumerating its ID).
    """
    if value is None:
        return value
    company = get_context_company(context)
    if company is not None and getattr(value, 'company_id', None) != company.id:
        raise serializers.ValidationError(f'{label} not found or access denied.')
    return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['lead_id', 'created_at', 'updated_at', 'created_by', 'company']

    def validate(self, attrs):
        email = attrs.get('email', getattr(self.instance, 'email', None))
        company = get_context_company(self.context)
        if email and company and not self.context.get('skip_duplicate_check'):
            qs = Lead.objects.filter(company=company, email__iexact=email)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'email': f'A lead with email "{email}" already exists for this company.'}
                )
        return attrs

    def create(self, validated_data):
        # The lead_id will be auto-generated in the model's save method
        return super().create(validated_data)


class ContactSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    full_name = serializers.CharField(source='__str__', read_only=True)

    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ['contact_id', 'created_at', 'updated_at', 'created_by', 'company']

    def validate(self, attrs):
        email = attrs.get('email', getattr(self.instance, 'email', None))
        company = get_context_company(self.context)
        if email and company and not self.context.get('skip_duplicate_check'):
            qs = Contact.objects.filter(company=company, email__iexact=email)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'email': f'A contact with email "{email}" already exists for this company.'}
                )
        return attrs

    def create(self, validated_data):
        # The contact_id will be auto-generated in the model's save method
        return super().create(validated_data)


class AccountSerializer(serializers.ModelSerializer):
    primary_contact_name = serializers.CharField(source='primary_contact.__str__', read_only=True)
    account_manager_name = serializers.CharField(source='account_manager.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    opportunities_count = serializers.IntegerField(source='opportunities.count', read_only=True)
    website = serializers.URLField(max_length=500, required=False, allow_blank=True)

    class Meta:
        model = Account
        fields = '__all__'
        read_only_fields = ['account_id', 'created_at', 'updated_at', 'created_by', 'company']

    def validate_primary_contact(self, value):
        return validate_same_company(value, self.context, 'Primary contact')

    def validate(self, attrs):
        name = attrs.get('name', getattr(self.instance, 'name', None))
        company = get_context_company(self.context)
        if name and company and not self.context.get('skip_duplicate_check'):
            qs = Account.objects.filter(company=company, name__iexact=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'name': f'An account named "{name}" already exists for this company.'}
                )
        return attrs

    def create(self, validated_data):
        # The account_id will be auto-generated in the model's save method
        return super().create(validated_data)


class OpportunitySerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    contact_name = serializers.CharField(source='contact.__str__', read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    weighted_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)

    class Meta:
        model = Opportunity
        fields = '__all__'
        read_only_fields = ['opportunity_id', 'created_at', 'updated_at', 'created_by', 'company']

    def validate_account(self, value):
        return validate_same_company(value, self.context, 'Account')

    def validate_contact(self, value):
        return validate_same_company(value, self.context, 'Contact')

    def validate(self, attrs):
        name = attrs.get('name', getattr(self.instance, 'name', None))
        account = attrs.get('account', getattr(self.instance, 'account', None))
        company = get_context_company(self.context)
        if name and account and company and not self.context.get('skip_duplicate_check'):
            qs = Opportunity.objects.filter(company=company, account=account, name__iexact=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'name': f'An opportunity named "{name}" already exists for this account.'}
                )
        return attrs

    def create(self, validated_data):
        # The opportunity_id will be auto-generated in the model's save method
        return super().create(validated_data)


class ActivitySerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    lead_name = serializers.CharField(source='lead.__str__', read_only=True)
    contact_name = serializers.CharField(source='contact.__str__', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    opportunity_name = serializers.CharField(source='opportunity.name', read_only=True)
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Activity
        fields = '__all__'
        read_only_fields = ['activity_id', 'created_at', 'updated_at', 'created_by', 'company']

    def validate_lead(self, value):
        return validate_same_company(value, self.context, 'Lead')

    def validate_contact(self, value):
        return validate_same_company(value, self.context, 'Contact')

    def validate_account(self, value):
        return validate_same_company(value, self.context, 'Account')

    def validate_opportunity(self, value):
        return validate_same_company(value, self.context, 'Opportunity')

    def create(self, validated_data):
        # The activity_id will be auto-generated in the model's save method
        return super().create(validated_data)


class CampaignSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    campaign_type_display = serializers.CharField(source='get_campaign_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    members_count = serializers.IntegerField(source='members.count', read_only=True)

    class Meta:
        model = Campaign
        fields = '__all__'
        read_only_fields = ['campaign_id', 'created_at', 'updated_at', 'created_by', 'company']

    def create(self, validated_data):
        # The campaign_id will be auto-generated in the model's save method
        return super().create(validated_data)


class CampaignMemberSerializer(serializers.ModelSerializer):
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    lead_name = serializers.CharField(source='lead.__str__', read_only=True)
    contact_name = serializers.CharField(source='contact.__str__', read_only=True)

    class Meta:
        model = CampaignMember
        fields = '__all__'

    def validate_campaign(self, value):
        return validate_same_company(value, self.context, 'Campaign')

    def validate_lead(self, value):
        return validate_same_company(value, self.context, 'Lead')

    def validate_contact(self, value):
        return validate_same_company(value, self.context, 'Contact')


class SalesTargetSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    achievement_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    period_display = serializers.CharField(source='get_period_display', read_only=True)

    class Meta:
        model = SalesTarget
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']


# Customer Support Serializers
class TicketCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketCategory
        fields = ['id', 'company', 'name', 'description', 'color', 'is_active', 'created_at']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        # Remove any created_by field if it exists
        validated_data.pop('created_by', None)
        return super().create(validated_data)


class SLASerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = SLA
        fields = '__all__'
        read_only_fields = ['created_at']


class TicketSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='contact.__str__', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    response_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ['ticket_id', 'created_by', 'created_at', 'updated_at', 'first_response_at', 'resolved_at']

    def validate_contact(self, value):
        return validate_same_company(value, self.context, 'Contact')

    def validate_account(self, value):
        return validate_same_company(value, self.context, 'Account')

    def validate_category(self, value):
        return validate_same_company(value, self.context, 'Ticket category')

    def validate_sla(self, value):
        return validate_same_company(value, self.context, 'SLA')

    def create(self, validated_data):
        from authentication.utils import generate_auto_code
        company = validated_data['company']
        try:
            validated_data['ticket_id'] = generate_auto_code(company.id, 'ticket')
        except Exception:
            from django.db import transaction
            with transaction.atomic():
                last = Ticket.objects.select_for_update().filter(company=company).order_by('-id').first()
                n = int(last.ticket_id.split('TKT')[-1]) + 1 if last and 'TKT' in last.ticket_id else 1
                validated_data['ticket_id'] = f"{company.company_prefix}TKT{n:04d}"
        return super().create(validated_data)


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = KnowledgeBase
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'view_count', 'helpful_count']

    def validate_category(self, value):
        return validate_same_company(value, self.context, 'Ticket category')


# AI Lead Scoring Serializers
class LeadScoreSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.__str__', read_only=True)
    lead_company = serializers.CharField(source='lead.company_name', read_only=True)
    lead_email = serializers.CharField(source='lead.email', read_only=True)
    lead_status = serializers.CharField(source='lead.status', read_only=True)
    grade_display = serializers.CharField(source='get_grade_display', read_only=True)

    class Meta:
        model = LeadScore
        fields = '__all__'
        read_only_fields = ['last_calculated', 'calculation_count']

    def validate_lead(self, value):
        return validate_same_company(value, self.context, 'Lead')


class ScoringCriteriaSerializer(serializers.ModelSerializer):
    criteria_type_display = serializers.CharField(source='get_criteria_type_display', read_only=True)

    class Meta:
        model = ScoringCriteria
        fields = '__all__'
        read_only_fields = ['created_at']


# Phase 2: Advanced Sales Pipeline Management Serializers
class PipelineStageSerializer(serializers.ModelSerializer):
    deals_count = serializers.IntegerField(source='deals.count', read_only=True)

    class Meta:
        model = PipelineStage
        fields = '__all__'
        read_only_fields = ['created_at']


class DealSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    contact_name = serializers.CharField(source='contact.__str__', read_only=True)
    current_stage_name = serializers.CharField(source='current_stage.name', read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    weighted_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    days_in_stage = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Deal
        fields = '__all__'
        read_only_fields = ['deal_id', 'created_at', 'updated_at']

    def validate_account(self, value):
        return validate_same_company(value, self.context, 'Account')

    def validate_contact(self, value):
        return validate_same_company(value, self.context, 'Contact')

    def validate_current_stage(self, value):
        return validate_same_company(value, self.context, 'Pipeline stage')

    def validate_opportunity(self, value):
        return validate_same_company(value, self.context, 'Opportunity')

    def create(self, validated_data):
        from authentication.utils import generate_auto_code
        company = validated_data['company']
        try:
            validated_data['deal_id'] = generate_auto_code(company.id, 'deal')
        except Exception:
            from django.db import transaction
            with transaction.atomic():
                last = Deal.objects.select_for_update().filter(company=company).order_by('-id').first()
                n = int(last.deal_id.split('DEAL')[-1]) + 1 if last and 'DEAL' in last.deal_id else 1
                validated_data['deal_id'] = f"{company.company_prefix}DEAL{n:04d}"
        return super().create(validated_data)


class DealStageHistorySerializer(serializers.ModelSerializer):
    deal_name = serializers.CharField(source='deal.name', read_only=True)
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)

    class Meta:
        model = DealStageHistory
        fields = '__all__'
        read_only_fields = ['changed_at']

    def validate_deal(self, value):
        return validate_same_company(value, self.context, 'Deal')

    def validate_stage(self, value):
        return validate_same_company(value, self.context, 'Pipeline stage')


class SalesQuotaSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    achievement_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    period_display = serializers.CharField(source='get_period_display', read_only=True)

    class Meta:
        model = SalesQuota
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']


# Phase 2: Customer Relationship Analytics Serializers
class CustomerInteractionSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='contact.__str__', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    deal_name = serializers.CharField(source='deal.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    interaction_type_display = serializers.CharField(source='get_interaction_type_display', read_only=True)

    class Meta:
        model = CustomerInteraction
        fields = '__all__'
        read_only_fields = ['interaction_id', 'created_by', 'created_at']

    def validate_contact(self, value):
        return validate_same_company(value, self.context, 'Contact')

    def validate_account(self, value):
        return validate_same_company(value, self.context, 'Account')

    def validate_deal(self, value):
        return validate_same_company(value, self.context, 'Deal')

    def create(self, validated_data):
        from authentication.utils import generate_auto_code
        company = validated_data['company']
        try:
            validated_data['interaction_id'] = generate_auto_code(company.id, 'interaction')
        except Exception:
            from django.db import transaction
            with transaction.atomic():
                last = CustomerInteraction.objects.select_for_update().filter(company=company).order_by('-id').first()
                n = int(last.interaction_id.split('INT')[-1]) + 1 if last and 'INT' in last.interaction_id else 1
                validated_data['interaction_id'] = f"{company.company_prefix}INT{n:04d}"
        return super().create(validated_data)


class CustomerHealthScoreSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_type = serializers.CharField(source='account.account_type', read_only=True)
    health_status_display = serializers.CharField(source='get_health_status_display', read_only=True)

    class Meta:
        model = CustomerHealthScore
        fields = '__all__'
        read_only_fields = ['last_calculated', 'calculation_count']

    def validate_account(self, value):
        return validate_same_company(value, self.context, 'Account')


class CustomerSegmentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    account_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CustomerSegment
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class CustomerSegmentMembershipSerializer(serializers.ModelSerializer):
    segment_name = serializers.CharField(source='segment.name', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    added_by_name = serializers.CharField(source='added_by.get_full_name', read_only=True)

    class Meta:
        model = CustomerSegmentMembership
        fields = '__all__'
        read_only_fields = ['added_at']

    def validate_segment(self, value):
        return validate_same_company(value, self.context, 'Customer segment')

    def validate_account(self, value):
        return validate_same_company(value, self.context, 'Account')


class SalesAnalyticsSerializer(serializers.ModelSerializer):
    metric_type_display = serializers.CharField(source='get_metric_type_display', read_only=True)
    period_display = serializers.CharField(source='get_period_display', read_only=True)

    class Meta:
        model = SalesAnalytics
        fields = '__all__'
        read_only_fields = ['calculated_at']


# Dashboard Serializers
class DashboardStatsSerializer(serializers.Serializer):
    total_leads = serializers.IntegerField()
    total_opportunities = serializers.IntegerField()
    total_accounts = serializers.IntegerField()
    total_contacts = serializers.IntegerField()
    pipeline_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    won_opportunities = serializers.IntegerField()
    activities_today = serializers.IntegerField()
    overdue_activities = serializers.IntegerField()


class LeadsByStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    count = serializers.IntegerField()


class OpportunitiesByStageSerializer(serializers.Serializer):
    stage = serializers.CharField()
    count = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)


