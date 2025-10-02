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
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_leads')
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