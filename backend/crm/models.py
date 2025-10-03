from django.db import models
from django.contrib.auth.models import User
from authentication.models import Company, CompanyServiceUser
from django.utils import timezone
from decimal import Decimal
import json


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
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_leads')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_contacted = models.DateTimeField(null=True, blank=True)
    
    # Additional Info
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lead_id']),
            models.Index(fields=['email']),
            models.Index(fields=['company', 'status']),
            models.Index(fields=['assigned_to', 'priority']),
        ]

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


# Customer Support System Models
class TicketCategory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ticket_categories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Ticket Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class SLA(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='slas')
    name = models.CharField(max_length=100)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES)
    response_time_hours = models.IntegerField()  # Response time in hours
    resolution_time_hours = models.IntegerField()  # Resolution time in hours
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'SLA'
        verbose_name_plural = 'SLAs'
        unique_together = ['company', 'priority']

    def __str__(self):
        return f"{self.name} - {self.get_priority_display()}"


class Ticket(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('pending', 'Pending Customer'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    SOURCE_CHOICES = [
        ('email', 'Email'),
        ('web', 'Web Form'),
        ('phone', 'Phone'),
        ('chat', 'Live Chat'),
        ('social', 'Social Media'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='tickets')
    ticket_id = models.CharField(max_length=50, unique=True)
    
    # Basic Information
    subject = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='web')
    
    # Relationships
    category = models.ForeignKey(TicketCategory, on_delete=models.SET_NULL, null=True, blank=True)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='tickets')
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    
    # SLA Tracking
    sla = models.ForeignKey(SLA, on_delete=models.SET_NULL, null=True, blank=True)
    response_due = models.DateTimeField(null=True, blank=True)
    resolution_due = models.DateTimeField(null=True, blank=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tickets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Customer Satisfaction
    satisfaction_rating = models.IntegerField(null=True, blank=True, choices=[(i, i) for i in range(1, 6)])
    satisfaction_comment = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket_id} - {self.subject}"

    @property
    def is_overdue(self):
        if self.resolution_due and self.status not in ['resolved', 'closed']:
            return timezone.now() > self.resolution_due
        return False

    @property
    def response_overdue(self):
        if self.response_due and not self.first_response_at:
            return timezone.now() > self.response_due
        return False


class KnowledgeBase(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='knowledge_base')
    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.ForeignKey(TicketCategory, on_delete=models.SET_NULL, null=True, blank=True)
    tags = models.JSONField(default=list)
    is_published = models.BooleanField(default=True)
    view_count = models.IntegerField(default=0)
    helpful_count = models.IntegerField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_kb_articles')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


# AI Lead Scoring Models
class LeadScore(models.Model):
    lead = models.OneToOneField(Lead, on_delete=models.CASCADE, related_name='score')
    
    # Score Components (0-100 each)
    behavioral_score = models.IntegerField(default=0)  # Website visits, email opens, downloads
    demographic_score = models.IntegerField(default=0)  # Company size, industry fit, role
    engagement_score = models.IntegerField(default=0)  # Response time, meeting acceptance
    predictive_score = models.IntegerField(default=0)  # ML-based conversion probability
    
    # Total Score (0-100)
    total_score = models.IntegerField(default=0)
    
    # Score Grade
    GRADE_CHOICES = [
        ('cold', 'Cold (0-25)'),
        ('warm', 'Warm (26-50)'),
        ('hot', 'Hot (51-75)'),
        ('very_hot', 'Very Hot (76-100)'),
    ]
    grade = models.CharField(max_length=20, choices=GRADE_CHOICES, default='cold')
    
    # Tracking
    last_calculated = models.DateTimeField(auto_now=True)
    calculation_count = models.IntegerField(default=0)
    
    # AI Insights
    conversion_probability = models.FloatField(default=0.0)  # 0.0 to 1.0
    recommended_actions = models.JSONField(default=list)
    score_factors = models.JSONField(default=dict)  # Detailed breakdown

    def __str__(self):
        return f"{self.lead} - Score: {self.total_score}"

    def calculate_total_score(self):
        # Weighted calculation
        weights = {
            'behavioral': 0.3,
            'demographic': 0.25,
            'engagement': 0.25,
            'predictive': 0.2
        }
        
        total = (
            self.behavioral_score * weights['behavioral'] +
            self.demographic_score * weights['demographic'] +
            self.engagement_score * weights['engagement'] +
            self.predictive_score * weights['predictive']
        )
        
        self.total_score = min(100, max(0, int(total)))
        
        # Update grade
        if self.total_score <= 25:
            self.grade = 'cold'
        elif self.total_score <= 50:
            self.grade = 'warm'
        elif self.total_score <= 75:
            self.grade = 'hot'
        else:
            self.grade = 'very_hot'
        
        self.calculation_count += 1
        self.save()
        return self.total_score


class ScoringCriteria(models.Model):
    CRITERIA_TYPE_CHOICES = [
        ('behavioral', 'Behavioral'),
        ('demographic', 'Demographic'),
        ('engagement', 'Engagement'),
        ('predictive', 'Predictive'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='scoring_criteria')
    name = models.CharField(max_length=100)
    criteria_type = models.CharField(max_length=20, choices=CRITERIA_TYPE_CHOICES)
    weight = models.FloatField(default=1.0)  # Multiplier for this criteria
    max_points = models.IntegerField(default=25)  # Maximum points for this criteria
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Scoring Criteria'

    def __str__(self):
        return f"{self.name} ({self.get_criteria_type_display()})"


# Phase 2: Advanced Sales Pipeline Management Models
class PipelineStage(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='pipeline_stages')
    name = models.CharField(max_length=100)
    order = models.IntegerField()
    probability = models.IntegerField(default=0)  # Default probability for this stage
    is_active = models.BooleanField(default=True)
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        unique_together = ['company', 'order']

    def __str__(self):
        return f"{self.name} ({self.order})"


class Deal(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('won', 'Won'),
        ('lost', 'Lost'),
        ('on_hold', 'On Hold'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='deals')
    deal_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    
    # Relationships
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='deals')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    opportunity = models.OneToOneField(Opportunity, on_delete=models.CASCADE, null=True, blank=True, related_name='deal')
    
    # Pipeline
    current_stage = models.ForeignKey(PipelineStage, on_delete=models.CASCADE, related_name='deals')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    # Financial
    value = models.DecimalField(max_digits=12, decimal_places=2)
    probability = models.IntegerField(default=0)  # 0-100
    expected_close_date = models.DateField()
    actual_close_date = models.DateField(null=True, blank=True)
    
    # Assignment
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_deals')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_deals')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional
    description = models.TextField(blank=True)
    next_action = models.CharField(max_length=200, blank=True)
    tags = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.account.name}"

    @property
    def weighted_value(self):
        return self.value * (self.probability / 100)

    @property
    def days_in_stage(self):
        # Get the latest stage history entry
        latest_history = self.stage_history.filter(stage=self.current_stage).order_by('-changed_at').first()
        if latest_history:
            return (timezone.now().date() - latest_history.changed_at.date()).days
        return 0


class DealStageHistory(models.Model):
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='stage_history')
    stage = models.ForeignKey(PipelineStage, on_delete=models.CASCADE)
    changed_by = models.ForeignKey(User, on_delete=models.CASCADE)
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    duration_days = models.IntegerField(null=True, blank=True)  # Days spent in previous stage

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.deal.name} -> {self.stage.name}"


class SalesQuota(models.Model):
    PERIOD_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sales_quotas')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales_quotas')
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    year = models.IntegerField()
    month = models.IntegerField(null=True, blank=True)
    quarter = models.IntegerField(null=True, blank=True)
    
    quota_amount = models.DecimalField(max_digits=12, decimal_places=2)
    achieved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deals_target = models.IntegerField(default=0)
    deals_achieved = models.IntegerField(default=0)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_quotas')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'user', 'period', 'year', 'month', 'quarter']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.period} {self.year}"

    @property
    def achievement_percentage(self):
        if self.quota_amount > 0:
            return (self.achieved_amount / self.quota_amount) * 100
        return 0


# Phase 2: Customer Relationship Analytics Models
class CustomerInteraction(models.Model):
    INTERACTION_TYPE_CHOICES = [
        ('email', 'Email'),
        ('call', 'Phone Call'),
        ('meeting', 'Meeting'),
        ('demo', 'Product Demo'),
        ('support', 'Support Request'),
        ('purchase', 'Purchase'),
        ('website_visit', 'Website Visit'),
        ('social_media', 'Social Media'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='customer_interactions')
    interaction_id = models.CharField(max_length=50, unique=True)
    
    # Relationships
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='interactions')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='interactions')
    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='interactions')
    
    # Interaction Details
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPE_CHOICES)
    subject = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    outcome = models.TextField(blank=True)
    
    # Timing
    interaction_date = models.DateTimeField()
    duration_minutes = models.IntegerField(null=True, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_interactions')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Metadata
    metadata = models.JSONField(default=dict)  # Store additional data like email opens, clicks, etc.

    class Meta:
        ordering = ['-interaction_date']

    def __str__(self):
        return f"{self.contact} - {self.get_interaction_type_display()}"


class CustomerHealthScore(models.Model):
    HEALTH_STATUS_CHOICES = [
        ('excellent', 'Excellent (81-100)'),
        ('good', 'Good (61-80)'),
        ('average', 'Average (41-60)'),
        ('poor', 'Poor (21-40)'),
        ('critical', 'Critical (0-20)'),
    ]

    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='health_score')
    
    # Score Components (0-100 each)
    engagement_score = models.IntegerField(default=0)  # Interaction frequency and quality
    satisfaction_score = models.IntegerField(default=0)  # Support tickets, feedback
    usage_score = models.IntegerField(default=0)  # Product usage, feature adoption
    financial_score = models.IntegerField(default=0)  # Payment history, contract value
    
    # Overall Score (0-100)
    overall_score = models.IntegerField(default=0)
    health_status = models.CharField(max_length=20, choices=HEALTH_STATUS_CHOICES, default='average')
    
    # Risk Indicators
    churn_risk = models.FloatField(default=0.0)  # 0.0 to 1.0
    upsell_opportunity = models.FloatField(default=0.0)  # 0.0 to 1.0
    
    # Tracking
    last_calculated = models.DateTimeField(auto_now=True)
    calculation_count = models.IntegerField(default=0)
    
    # Insights
    risk_factors = models.JSONField(default=list)
    recommendations = models.JSONField(default=list)

    def __str__(self):
        return f"{self.account.name} - Health: {self.overall_score}"

    def calculate_overall_score(self):
        # Weighted calculation
        weights = {
            'engagement': 0.3,
            'satisfaction': 0.25,
            'usage': 0.25,
            'financial': 0.2
        }
        
        total = (
            self.engagement_score * weights['engagement'] +
            self.satisfaction_score * weights['satisfaction'] +
            self.usage_score * weights['usage'] +
            self.financial_score * weights['financial']
        )
        
        self.overall_score = min(100, max(0, int(total)))
        
        # Update health status
        if self.overall_score >= 81:
            self.health_status = 'excellent'
        elif self.overall_score >= 61:
            self.health_status = 'good'
        elif self.overall_score >= 41:
            self.health_status = 'average'
        elif self.overall_score >= 21:
            self.health_status = 'poor'
        else:
            self.health_status = 'critical'
        
        self.calculation_count += 1
        self.save()
        return self.overall_score


class CustomerSegment(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='customer_segments')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Segmentation Criteria
    criteria = models.JSONField(default=dict)  # Store segmentation rules
    
    # Segment Properties
    color = models.CharField(max_length=7, default='#3B82F6')
    is_active = models.BooleanField(default=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_segments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def account_count(self):
        return self.memberships.count()


class CustomerSegmentMembership(models.Model):
    segment = models.ForeignKey(CustomerSegment, on_delete=models.CASCADE, related_name='memberships')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='segment_memberships')
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        unique_together = ['segment', 'account']

    def __str__(self):
        return f"{self.account.name} in {self.segment.name}"


class SalesAnalytics(models.Model):
    METRIC_TYPE_CHOICES = [
        ('conversion_rate', 'Conversion Rate'),
        ('avg_deal_size', 'Average Deal Size'),
        ('sales_cycle_length', 'Sales Cycle Length'),
        ('win_rate', 'Win Rate'),
        ('pipeline_velocity', 'Pipeline Velocity'),
        ('customer_acquisition_cost', 'Customer Acquisition Cost'),
        ('customer_lifetime_value', 'Customer Lifetime Value'),
    ]
    
    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sales_analytics')
    metric_type = models.CharField(max_length=30, choices=METRIC_TYPE_CHOICES)
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    
    # Time Period
    date = models.DateField()
    year = models.IntegerField()
    month = models.IntegerField(null=True, blank=True)
    week = models.IntegerField(null=True, blank=True)
    quarter = models.IntegerField(null=True, blank=True)
    
    # Metric Values
    value = models.DecimalField(max_digits=15, decimal_places=4)
    count = models.IntegerField(default=0)  # Supporting count data
    
    # Metadata
    metadata = models.JSONField(default=dict)  # Additional metric details
    
    # Tracking
    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['company', 'metric_type', 'period', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.get_metric_type_display()} - {self.date}"


# Import Phase 3 models
from .phase3_models import (
    EmailTemplate, MarketingCampaign, EmailSend, AutomationWorkflow,
    ReportTemplate, Dashboard, BusinessIntelligence
)

# Import Phase 4 models
from .phase4_models import (
    ThirdPartyIntegration, IntegrationLog, MobileDevice, MobileSync,
    DataAuditLog, ComplianceRule, ComplianceViolation, DataRetentionPolicy,
    SecurityAlert, APIUsageLog
)