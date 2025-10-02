# ============================================================================
# CRM BACKEND COMPLETE IMPLEMENTATION
# ============================================================================

# ============================================================================
# backend/crm/models.py
# ============================================================================

from django.db import models
from django.contrib.auth.models import User
from authentication.models import Company, CompanyServiceUser
from django.utils import timezone
from decimal import Decimal


class Lead(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('proposal', 'Proposal Sent'),
        ('negotiation', 'Negotiation'),
        ('won', 'Won'),
        ('lost', 'Lost'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    SOURCE_CHOICES = [
        ('website', 'Website'),
        ('referral', 'Referral'),
        ('social_media', 'Social Media'),
        ('email_campaign', 'Email Campaign'),
        ('cold_call', 'Cold Call'),
        ('trade_show', 'Trade Show'),
        ('advertisement', 'Advertisement'),
        ('other', 'Other'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='leads')
    lead_id = models.CharField(max_length=50, unique=True)
    
    # Contact Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    company_name = models.CharField(max_length=200, blank=True)
    job_title = models.CharField(max_length=100, blank=True)
    
    # Lead Details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='website')
    estimated_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_close_date = models.DateField(null=True, blank=True)
    
    # Assignment
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')
    
    # Tracking
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.CASCADE, related_name='created_leads')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_contacted = models.DateTimeField(null=True, blank=True)
    
    # Additional Info
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.company_name}"


class Contact(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='contacts')
    contact_id = models.CharField(max_length=50, unique=True)
    
    # Personal Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    
    # Professional Information
    job_title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    
    # Address
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_contacts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional Info
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Account(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('prospect', 'Prospect'),
        ('customer', 'Customer'),
        ('partner', 'Partner'),
        ('vendor', 'Vendor'),
    ]
    
    INDUSTRY_CHOICES = [
        ('technology', 'Technology'),
        ('healthcare', 'Healthcare'),
        ('finance', 'Finance'),
        ('manufacturing', 'Manufacturing'),
        ('retail', 'Retail'),
        ('education', 'Education'),
        ('government', 'Government'),
        ('other', 'Other'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='accounts')
    account_id = models.CharField(max_length=50, unique=True)
    
    # Company Information
    name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES, default='prospect')
    industry = models.CharField(max_length=20, choices=INDUSTRY_CHOICES, default='other')
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    # Business Details
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    employee_count = models.IntegerField(null=True, blank=True)
    
    # Address
    billing_address = models.TextField(blank=True)
    shipping_address = models.TextField(blank=True)
    
    # Relationship
    primary_contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='primary_accounts')
    account_manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_accounts')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_accounts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional Info
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Opportunity(models.Model):
    STAGE_CHOICES = [
        ('prospecting', 'Prospecting'),
        ('qualification', 'Qualification'),
        ('needs_analysis', 'Needs Analysis'),
        ('proposal', 'Proposal/Price Quote'),
        ('negotiation', 'Negotiation/Review'),
        ('closed_won', 'Closed Won'),
        ('closed_lost', 'Closed Lost'),
    ]
    
    PROBABILITY_CHOICES = [
        (10, '10%'),
        (25, '25%'),
        (50, '50%'),
        (75, '75%'),
        (90, '90%'),
        (100, '100%'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='opportunities')
    opportunity_id = models.CharField(max_length=50, unique=True)
    
    # Basic Information
    name = models.CharField(max_length=200)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='opportunities')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='opportunities')
    
    # Sales Information
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='prospecting')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    probability = models.IntegerField(choices=PROBABILITY_CHOICES, default=25)
    expected_close_date = models.DateField()
    
    # Assignment
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_opportunities')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_opportunities')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_date = models.DateField(null=True, blank=True)
    
    # Additional Info
    description = models.TextField(blank=True)
    next_step = models.CharField(max_length=200, blank=True)
    tags = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Opportunities'

    def __str__(self):
        return f"{self.name} - {self.account.name}"

    @property
    def weighted_amount(self):
        return self.amount * (self.probability / 100)


class Activity(models.Model):
    ACTIVITY_TYPE_CHOICES = [
        ('call', 'Phone Call'),
        ('email', 'Email'),
        ('meeting', 'Meeting'),
        ('task', 'Task'),
        ('note', 'Note'),
        ('demo', 'Demo'),
        ('proposal', 'Proposal'),
    ]
    
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='activities')
    activity_id = models.CharField(max_length=50, unique=True)
    
    # Basic Information
    subject = models.CharField(max_length=200)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    
    # Relationships
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    
    # Scheduling
    due_date = models.DateTimeField()
    duration_minutes = models.IntegerField(default=30)
    
    # Assignment
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_activities')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_activities')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Content
    description = models.TextField(blank=True)
    outcome = models.TextField(blank=True)

    class Meta:
        ordering = ['due_date']
        verbose_name_plural = 'Activities'

    def __str__(self):
        return f"{self.subject} - {self.get_activity_type_display()}"


class Campaign(models.Model):
    CAMPAIGN_TYPE_CHOICES = [
        ('email', 'Email Campaign'),
        ('social', 'Social Media'),
        ('webinar', 'Webinar'),
        ('event', 'Event'),
        ('advertisement', 'Advertisement'),
        ('direct_mail', 'Direct Mail'),
        ('telemarketing', 'Telemarketing'),
    ]
    
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='campaigns')
    campaign_id = models.CharField(max_length=50, unique=True)
    
    # Basic Information
    name = models.CharField(max_length=200)
    campaign_type = models.CharField(max_length=20, choices=CAMPAIGN_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    
    # Campaign Details
    start_date = models.DateField()
    end_date = models.DateField()
    budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    target_audience = models.TextField(blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_campaigns')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Metrics
    leads_generated = models.IntegerField(default=0)
    opportunities_created = models.IntegerField(default=0)
    revenue_generated = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Content
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class CampaignMember(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('responded', 'Responded'),
        ('bounced', 'Bounced'),
        ('unsubscribed', 'Unsubscribed'),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='members')
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, null=True, blank=True, related_name='campaign_memberships')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, null=True, blank=True, related_name='campaign_memberships')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    sent_date = models.DateTimeField(null=True, blank=True)
    response_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['campaign', 'lead'], ['campaign', 'contact']]

    def __str__(self):
        target = self.lead or self.contact
        return f"{self.campaign.name} - {target}"


class SalesTarget(models.Model):
    PERIOD_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sales_targets')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales_targets')
    
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    year = models.IntegerField()
    month = models.IntegerField(null=True, blank=True)  # For monthly targets
    quarter = models.IntegerField(null=True, blank=True)  # For quarterly targets
    
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    achieved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_sales_targets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'user', 'period', 'year', 'month', 'quarter']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.period} {self.year}"

    @property
    def achievement_percentage(self):
        if self.target_amount > 0:
            return (self.achieved_amount / self.target_amount) * 100
        return 0


# ============================================================================
# backend/crm/serializers.py
# ============================================================================

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


# ============================================================================
# backend/crm/views.py
# ============================================================================

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Lead, Contact, Account, Opportunity, Activity, Campaign, CampaignMember, SalesTarget
from .serializers import (
    LeadSerializer, ContactSerializer, AccountSerializer, OpportunitySerializer,
    ActivitySerializer, CampaignSerializer, CampaignMemberSerializer, SalesTargetSerializer,
    DashboardStatsSerializer, LeadsByStatusSerializer, OpportunitiesByStageSerializer
)
from authentication.models import Company, ServiceUserSession


class CRMBaseViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return self.queryset.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            return self.queryset.filter(company=company)
        except ServiceUserSession.DoesNotExist:
            return self.queryset.none()

    def list(self, request, *args, **kwargs):
        """Override list to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return super().list(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Add company and created_by to request data before serialization
            data = request.data.copy()
            data['company'] = service_user.company.id
            data['created_by'] = service_user.id  # Use CompanyServiceUser directly
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            instance = serializer.save()
            
            return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return super().retrieve(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return super().update(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return super().destroy(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class LeadViewSet(CRMBaseViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    filterset_fields = ['status', 'priority', 'source', 'assigned_to']
    search_fields = ['first_name', 'last_name', 'email', 'company_name']
    ordering_fields = ['created_at', 'updated_at', 'last_contacted', 'estimated_value']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def convert_to_opportunity(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        lead = self.get_object()
        
        # Create or get account
        account, created = Account.objects.get_or_create(
            company=lead.company,
            name=lead.company_name or f"{lead.first_name} {lead.last_name}",
            defaults={
                'account_type': 'prospect',
                'email': lead.email,
                'created_by': service_user
            }
        )
        
        # Create contact
        contact = Contact.objects.create(
            company=lead.company,
            first_name=lead.first_name,
            last_name=lead.last_name,
            email=lead.email,
            phone=lead.phone,
            job_title=lead.job_title,
            created_by=service_user
        )
        
        # Create opportunity
        opportunity = Opportunity.objects.create(
            company=lead.company,
            name=f"{lead.first_name} {lead.last_name} - Opportunity",
            account=account,
            contact=contact,
            amount=lead.estimated_value or 0,
            expected_close_date=lead.expected_close_date or timezone.now().date() + timedelta(days=30),
            owner=lead.assigned_to or service_user,
            created_by=service_user,
            description=lead.description
        )
        
        # Update lead status
        lead.status = 'won'
        lead.save()
        
        return Response({
            'message': 'Lead converted successfully',
            'opportunity_id': opportunity.opportunity_id,
            'account_id': account.account_id,
            'contact_id': contact.contact_id
        })

    @action(detail=False)
    def by_status(self, request):
        queryset = self.get_queryset()
        stats = queryset.values('status').annotate(count=Count('id')).order_by('status')
        serializer = LeadsByStatusSerializer(stats, many=True)
        return Response(serializer.data)


class ContactViewSet(CRMBaseViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filterset_fields = ['is_active', 'department']
    search_fields = ['first_name', 'last_name', 'email', 'job_title', 'department']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['first_name', 'last_name']


class AccountViewSet(CRMBaseViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    filterset_fields = ['account_type', 'industry', 'is_active']
    search_fields = ['name', 'email', 'website']
    ordering_fields = ['name', 'created_at', 'annual_revenue']
    ordering = ['name']

    @action(detail=True)
    def opportunities(self, request, pk=None):
        account = self.get_object()
        opportunities = account.opportunities.all()
        serializer = OpportunitySerializer(opportunities, many=True)
        return Response(serializer.data)

    @action(detail=True)
    def activities(self, request, pk=None):
        account = self.get_object()
        activities = account.activities.all()
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)


class OpportunityViewSet(CRMBaseViewSet):
    queryset = Opportunity.objects.all()
    serializer_class = OpportunitySerializer
    filterset_fields = ['stage', 'probability', 'owner']
    search_fields = ['name', 'account__name', 'description']
    ordering_fields = ['created_at', 'expected_close_date', 'amount', 'probability']
    ordering = ['-created_at']

    @action(detail=False)
    def pipeline(self, request):
        queryset = self.get_queryset()
        pipeline = queryset.values('stage').annotate(
            count=Count('id'),
            total_value=Sum('amount')
        ).order_by('stage')
        serializer = OpportunitiesByStageSerializer(pipeline, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def forecast(self, request):
        queryset = self.get_queryset().exclude(stage__in=['closed_won', 'closed_lost'])
        forecast_data = {
            'total_pipeline_value': queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
            'weighted_pipeline_value': sum(opp.weighted_amount for opp in queryset),
            'opportunities_count': queryset.count(),
            'avg_deal_size': queryset.aggregate(Avg('amount'))['amount__avg'] or 0,
        }
        return Response(forecast_data)

    @action(detail=True, methods=['post'])
    def update_stage(self, request, pk=None):
        opportunity = self.get_object()
        new_stage = request.data.get('stage')
        
        if new_stage in dict(Opportunity.STAGE_CHOICES):
            opportunity.stage = new_stage
            if new_stage in ['closed_won', 'closed_lost']:
                opportunity.closed_date = timezone.now().date()
            opportunity.save()
            
            serializer = self.get_serializer(opportunity)
            return Response(serializer.data)
        
        return Response({'error': 'Invalid stage'}, status=status.HTTP_400_BAD_REQUEST)


class ActivityViewSet(CRMBaseViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    filterset_fields = ['activity_type', 'status', 'assigned_to']
    search_fields = ['subject', 'description']
    ordering_fields = ['due_date', 'created_at']
    ordering = ['due_date']

    @action(detail=False)
    def today(self, request):
        today = timezone.now().date()
        queryset = self.get_queryset().filter(due_date__date=today)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def overdue(self, request):
        now = timezone.now()
        queryset = self.get_queryset().filter(
            due_date__lt=now,
            status__in=['planned', 'in_progress']
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        activity = self.get_object()
        activity.status = 'completed'
        activity.completed_at = timezone.now()
        activity.outcome = request.data.get('outcome', '')
        activity.save()
        
        serializer = self.get_serializer(activity)
        return Response(serializer.data)


class CampaignViewSet(CRMBaseViewSet):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    filterset_fields = ['campaign_type', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']

    @action(detail=True)
    def members(self, request, pk=None):
        campaign = self.get_object()
        members = campaign.members.all()
        serializer = CampaignMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        campaign = self.get_object()
        lead_ids = request.data.get('lead_ids', [])
        contact_ids = request.data.get('contact_ids', [])
        
        added_count = 0
        
        # Add leads
        for lead_id in lead_ids:
            try:
                lead = Lead.objects.get(id=lead_id, company=campaign.company)
                CampaignMember.objects.get_or_create(
                    campaign=campaign,
                    lead=lead,
                    defaults={'sent_date': timezone.now()}
                )
                added_count += 1
            except Lead.DoesNotExist:
                continue
        
        # Add contacts
        for contact_id in contact_ids:
            try:
                contact = Contact.objects.get(id=contact_id, company=campaign.company)
                CampaignMember.objects.get_or_create(
                    campaign=campaign,
                    contact=contact,
                    defaults={'sent_date': timezone.now()}
                )
                added_count += 1
            except Contact.DoesNotExist:
                continue
        
        return Response({'message': f'{added_count} members added to campaign'})


class SalesTargetViewSet(CRMBaseViewSet):
    queryset = SalesTarget.objects.all()
    serializer_class = SalesTargetSerializer
    filterset_fields = ['period', 'year', 'user']
    ordering_fields = ['year', 'month', 'quarter', 'target_amount']
    ordering = ['-year', '-month', '-quarter']

    @action(detail=False)
    def current_performance(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        current_year = timezone.now().year
        current_month = timezone.now().month
        current_quarter = (current_month - 1) // 3 + 1
        
        # Get current targets
        monthly_target = SalesTarget.objects.filter(
            user=service_user,
            period='monthly',
            year=current_year,
            month=current_month
        ).first()
        
        quarterly_target = SalesTarget.objects.filter(
            user=service_user,
            period='quarterly',
            year=current_year,
            quarter=current_quarter
        ).first()
        
        yearly_target = SalesTarget.objects.filter(
            user=service_user,
            period='yearly',
            year=current_year
        ).first()
        
        performance_data = {
            'monthly': SalesTargetSerializer(monthly_target).data if monthly_target else None,
            'quarterly': SalesTargetSerializer(quarterly_target).data if quarterly_target else None,
            'yearly': SalesTargetSerializer(yearly_target).data if yearly_target else None,
        }
        
        return Response(performance_data)


class DashboardViewSet(viewsets.ViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get_session_key(self, request):
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')
        return session_key

    def list(self, request):
        """Override list to handle session authentication"""
        session_key = self.get_session_key(request)
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        # Get dashboard statistics
        today = timezone.now().date()
        
        stats = {
            'total_leads': Lead.objects.filter(company=company).count(),
            'total_opportunities': Opportunity.objects.filter(company=company).count(),
            'total_accounts': Account.objects.filter(company=company).count(),
            'total_contacts': Contact.objects.filter(company=company).count(),
            'pipeline_value': Opportunity.objects.filter(
                company=company,
                stage__in=['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation']
            ).aggregate(Sum('amount'))['amount__sum'] or 0,
            'won_opportunities': Opportunity.objects.filter(
                company=company,
                stage='closed_won'
            ).count(),
            'activities_today': Activity.objects.filter(
                company=company,
                due_date__date=today
            ).count(),
            'overdue_activities': Activity.objects.filter(
                company=company,
                due_date__lt=timezone.now(),
                status__in=['planned', 'in_progress']
            ).count(),
        }
        
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=False)
    def recent_activities(self, request):
        session_key = self.get_session_key(request)
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        activities = Activity.objects.filter(company=company).order_by('-created_at')[:10]
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def sales_funnel(self, request):
        session_key = self.get_session_key(request)
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        funnel_data = []
        
        # Leads by status
        lead_stats = Lead.objects.filter(company=company).values('status').annotate(count=Count('id'))
        for stat in lead_stats:
            funnel_data.append({
                'stage': f"Leads - {stat['status'].title()}",
                'count': stat['count'],
                'type': 'lead'
            })
        
        # Opportunities by stage
        opp_stats = Opportunity.objects.filter(company=company).values('stage').annotate(count=Count('id'))
        for stat in opp_stats:
            funnel_data.append({
                'stage': f"Opportunities - {stat['stage'].replace('_', ' ').title()}",
                'count': stat['count'],
                'type': 'opportunity'
            })
        
        return Response(funnel_data)


# ============================================================================
# backend/crm/urls.py
# ============================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeadViewSet, ContactViewSet, AccountViewSet, OpportunityViewSet,
    ActivityViewSet, CampaignViewSet, SalesTargetViewSet, DashboardViewSet
)

router = DefaultRouter()
router.register(r'leads', LeadViewSet)
router.register(r'contacts', ContactViewSet)
router.register(r'accounts', AccountViewSet)
router.register(r'opportunities', OpportunityViewSet)
router.register(r'activities', ActivityViewSet)
router.register(r'campaigns', CampaignViewSet)
router.register(r'sales-targets', SalesTargetViewSet)
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]


# ============================================================================
# backend/crm/admin.py
# ============================================================================

from django.contrib import admin
from .models import Lead, Contact, Account, Opportunity, Activity, Campaign, CampaignMember, SalesTarget


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['lead_id', 'first_name', 'last_name', 'email', 'company_name', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'source', 'created_at', 'company']
    search_fields = ['first_name', 'last_name', 'email', 'company_name', 'lead_id']
    readonly_fields = ['lead_id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['contact_id', 'first_name', 'last_name', 'email', 'job_title', 'is_active', 'created_at']
    list_filter = ['is_active', 'department', 'created_at', 'company']
    search_fields = ['first_name', 'last_name', 'email', 'job_title', 'contact_id']
    readonly_fields = ['contact_id', 'created_at', 'updated_at']
    ordering = ['first_name', 'last_name']


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['account_id', 'name', 'account_type', 'industry', 'is_active', 'created_at']
    list_filter = ['account_type', 'industry', 'is_active', 'created_at', 'company']
    search_fields = ['name', 'email', 'website', 'account_id']
    readonly_fields = ['account_id', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ['opportunity_id', 'name', 'account', 'stage', 'amount', 'probability', 'expected_close_date']
    list_filter = ['stage', 'probability', 'created_at', 'company']
    search_fields = ['name', 'account__name', 'opportunity_id']
    readonly_fields = ['opportunity_id', 'created_at', 'updated_at', 'weighted_amount']
    ordering = ['-created_at']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['activity_id', 'subject', 'activity_type', 'status', 'due_date', 'assigned_to']
    list_filter = ['activity_type', 'status', 'due_date', 'created_at', 'company']
    search_fields = ['subject', 'description', 'activity_id']
    readonly_fields = ['activity_id', 'created_at', 'updated_at']
    ordering = ['due_date']


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['campaign_id', 'name', 'campaign_type', 'status', 'start_date', 'end_date']
    list_filter = ['campaign_type', 'status', 'start_date', 'created_at', 'company']
    search_fields = ['name', 'description', 'campaign_id']
    readonly_fields = ['campaign_id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(CampaignMember)
class CampaignMemberAdmin(admin.ModelAdmin):
    list_display = ['campaign', 'lead', 'contact', 'status', 'sent_date']
    list_filter = ['status', 'sent_date', 'created_at']
    search_fields = ['campaign__name', 'lead__email', 'contact__email']
    ordering = ['-created_at']


@admin.register(SalesTarget)
class SalesTargetAdmin(admin.ModelAdmin):
    list_display = ['user', 'period', 'year', 'month', 'quarter', 'target_amount', 'achieved_amount', 'achievement_percentage']
    list_filter = ['period', 'year', 'month', 'quarter', 'company']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'achievement_percentage']
    ordering = ['-year', '-month', '-quarter']


# ============================================================================
# backend/crm/apps.py
# ============================================================================

from django.apps import AppConfig


class CrmConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'crm'
    verbose_name = 'Customer Relationship Management'