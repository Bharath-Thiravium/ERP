from django.contrib import admin
from .models import Lead, Contact, Account, Opportunity, Activity, Campaign, CampaignMember, SalesTarget


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['lead_id', 'first_name', 'last_name', 'company_name', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'source', 'company']
    search_fields = ['first_name', 'last_name', 'email', 'company_name']
    readonly_fields = ['lead_id', 'created_at', 'updated_at']


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['contact_id', 'first_name', 'last_name', 'email', 'job_title', 'is_active']
    list_filter = ['is_active', 'company']
    search_fields = ['first_name', 'last_name', 'email', 'job_title']
    readonly_fields = ['contact_id', 'created_at', 'updated_at']


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['account_id', 'name', 'account_type', 'industry', 'is_active']
    list_filter = ['account_type', 'industry', 'is_active', 'company']
    search_fields = ['name', 'email', 'website']
    readonly_fields = ['account_id', 'created_at', 'updated_at']


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ['opportunity_id', 'name', 'account', 'stage', 'amount', 'probability', 'expected_close_date']
    list_filter = ['stage', 'probability', 'company']
    search_fields = ['name', 'account__name']
    readonly_fields = ['opportunity_id', 'created_at', 'updated_at']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['activity_id', 'subject', 'activity_type', 'status', 'due_date', 'assigned_to']
    list_filter = ['activity_type', 'status', 'company']
    search_fields = ['subject', 'description']
    readonly_fields = ['activity_id', 'created_at', 'updated_at']


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['campaign_id', 'name', 'campaign_type', 'status', 'start_date', 'end_date']
    list_filter = ['campaign_type', 'status', 'company']
    search_fields = ['name', 'description']
    readonly_fields = ['campaign_id', 'created_at', 'updated_at']


@admin.register(CampaignMember)
class CampaignMemberAdmin(admin.ModelAdmin):
    list_display = ['campaign', 'lead', 'contact', 'status', 'sent_date']
    list_filter = ['status', 'campaign']


@admin.register(SalesTarget)
class SalesTargetAdmin(admin.ModelAdmin):
    list_display = ['user', 'period', 'year', 'month', 'quarter', 'target_amount', 'achieved_amount']
    list_filter = ['period', 'year', 'company']
    search_fields = ['user__first_name', 'user__last_name']