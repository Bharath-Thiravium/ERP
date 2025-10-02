from rest_framework import serializers
from .models import Lead, Contact, Account, Opportunity, Activity, Campaign, CampaignMember, SalesTarget
from django.contrib.auth.models import User


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
        read_only_fields = ['lead_id', 'created_at', 'updated_at']

    def create(self, validated_data):
        company = validated_data['company']
        # Generate lead ID
        lead_count = Lead.objects.filter(company=company).count() + 1
        validated_data['lead_id'] = f"{company.company_prefix}LEAD{lead_count:04d}"
        return super().create(validated_data)


class ContactSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    full_name = serializers.CharField(source='__str__', read_only=True)

    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ['contact_id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        company = validated_data['company']
        # Generate contact ID
        contact_count = Contact.objects.filter(company=company).count() + 1
        validated_data['contact_id'] = f"{company.company_prefix}CON{contact_count:04d}"
        return super().create(validated_data)


class AccountSerializer(serializers.ModelSerializer):
    primary_contact_name = serializers.CharField(source='primary_contact.__str__', read_only=True)
    account_manager_name = serializers.CharField(source='account_manager.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    opportunities_count = serializers.IntegerField(source='opportunities.count', read_only=True)

    class Meta:
        model = Account
        fields = '__all__'
        read_only_fields = ['account_id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        company = validated_data['company']
        # Generate account ID
        account_count = Account.objects.filter(company=company).count() + 1
        validated_data['account_id'] = f"{company.company_prefix}ACC{account_count:04d}"
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
        read_only_fields = ['opportunity_id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        company = validated_data['company']
        # Generate opportunity ID
        opp_count = Opportunity.objects.filter(company=company).count() + 1
        validated_data['opportunity_id'] = f"{company.company_prefix}OPP{opp_count:04d}"
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
        read_only_fields = ['activity_id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        company = validated_data['company']
        # Generate activity ID
        activity_count = Activity.objects.filter(company=company).count() + 1
        validated_data['activity_id'] = f"{company.company_prefix}ACT{activity_count:04d}"
        return super().create(validated_data)


class CampaignSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    campaign_type_display = serializers.CharField(source='get_campaign_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    members_count = serializers.IntegerField(source='members.count', read_only=True)

    class Meta:
        model = Campaign
        fields = '__all__'
        read_only_fields = ['campaign_id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        company = validated_data['company']
        # Generate campaign ID
        campaign_count = Campaign.objects.filter(company=company).count() + 1
        validated_data['campaign_id'] = f"{company.company_prefix}CAM{campaign_count:04d}"
        return super().create(validated_data)


class CampaignMemberSerializer(serializers.ModelSerializer):
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    lead_name = serializers.CharField(source='lead.__str__', read_only=True)
    contact_name = serializers.CharField(source='contact.__str__', read_only=True)

    class Meta:
        model = CampaignMember
        fields = '__all__'


class SalesTargetSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    achievement_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    period_display = serializers.CharField(source='get_period_display', read_only=True)

    class Meta:
        model = SalesTarget
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']


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