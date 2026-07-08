# Phase 3: Marketing Automation & Email Campaigns Models
from django.db import models
from django.contrib.auth.models import User
from authentication.models import Company
from django.utils import timezone
from .models import Campaign, _generate_configured_number


class EmailTemplate(models.Model):
    TEMPLATE_TYPE_CHOICES = [
        ('welcome', 'Welcome Email'),
        ('follow_up', 'Follow Up'),
        ('newsletter', 'Newsletter'),
        ('promotion', 'Promotional'),
        ('nurture', 'Lead Nurture'),
        ('event', 'Event Invitation'),
        ('survey', 'Survey'),
        ('custom', 'Custom'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='email_templates')
    name = models.CharField(max_length=200)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES)
    subject = models.CharField(max_length=300)
    html_content = models.TextField()
    text_content = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class MarketingCampaign(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('running', 'Running'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    CAMPAIGN_TYPE_CHOICES = [
        ('email_blast', 'Email Blast'),
        ('drip_campaign', 'Drip Campaign'),
        ('lead_nurture', 'Lead Nurture'),
        ('event_promotion', 'Event Promotion'),
        ('product_launch', 'Product Launch'),
        ('re_engagement', 'Re-engagement'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='marketing_campaigns')
    campaign_id = models.CharField(max_length=50, db_index=True)
    crm_campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='email_runs'
    )
    name = models.CharField(max_length=200)
    campaign_type = models.CharField(max_length=20, choices=CAMPAIGN_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Campaign Details
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Templates
    email_template = models.ForeignKey(EmailTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_marketing_campaigns')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Metrics
    total_sent = models.IntegerField(default=0)
    total_delivered = models.IntegerField(default=0)
    total_opened = models.IntegerField(default=0)
    total_clicked = models.IntegerField(default=0)
    total_unsubscribed = models.IntegerField(default=0)
    total_bounced = models.IntegerField(default=0)

    class Meta:
        unique_together = ['company', 'campaign_id']
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.campaign_id:
            try:
                self.campaign_id = _generate_configured_number(self.company, 'marketing_campaign')
            except Exception:
                if getattr(self.company, 'use_document_numbering', False):
                    raise
                campaign_count = MarketingCampaign.objects.filter(company=self.company).count() + 1
                self.campaign_id = f"{self.company.company_prefix}CAMP{campaign_count:04d}"
        super().save(*args, **kwargs)

    @property
    def open_rate(self):
        if self.total_delivered > 0:
            return (self.total_opened / self.total_delivered) * 100
        return 0

    @property
    def click_rate(self):
        if self.total_delivered > 0:
            return (self.total_clicked / self.total_delivered) * 100
        return 0


class EmailSend(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('bounced', 'Bounced'),
        ('failed', 'Failed'),
        ('unsubscribed', 'Unsubscribed'),
    ]

    campaign = models.ForeignKey(MarketingCampaign, on_delete=models.CASCADE, related_name='email_sends')
    email_address = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    
    # Timestamps
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    bounced_at = models.DateTimeField(null=True, blank=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    open_count = models.IntegerField(default=0)
    click_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.campaign.name} - {self.email_address}"


class AutomationWorkflow(models.Model):
    TRIGGER_TYPE_CHOICES = [
        ('lead_created', 'Lead Created'),
        ('lead_status_change', 'Lead Status Change'),
        ('deal_stage_change', 'Deal Stage Change'),
        ('email_opened', 'Email Opened'),
        ('email_clicked', 'Email Clicked'),
        ('form_submitted', 'Form Submitted'),
        ('date_based', 'Date Based'),
        ('score_threshold', 'Score Threshold'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('draft', 'Draft'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='automation_workflows')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Trigger Configuration
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_TYPE_CHOICES)
    trigger_conditions = models.JSONField(default=dict)  # Store trigger conditions
    
    # Workflow Configuration
    actions = models.JSONField(default=list)  # Store workflow actions
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_workflows')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Metrics
    total_triggered = models.IntegerField(default=0)
    total_completed = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


# Phase 3: Advanced Reporting & Business Intelligence Models
class ReportTemplate(models.Model):
    REPORT_TYPE_CHOICES = [
        ('sales_performance', 'Sales Performance'),
        ('lead_analysis', 'Lead Analysis'),
        ('pipeline_forecast', 'Pipeline Forecast'),
        ('customer_health', 'Customer Health'),
        ('marketing_roi', 'Marketing ROI'),
        ('activity_summary', 'Activity Summary'),
        ('custom', 'Custom Report'),
    ]
    
    CHART_TYPE_CHOICES = [
        ('bar', 'Modern Bar'),
        ('line', 'Trend Line'),
        ('area', 'Area Trend'),
        ('pie', 'Donut Share'),
        ('funnel', 'Sales Funnel'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='report_templates')
    name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    description = models.TextField(blank=True)
    
    # Report Configuration
    chart_type = models.CharField(max_length=20, choices=CHART_TYPE_CHOICES)
    data_source = models.CharField(max_length=100)  # Model or API endpoint
    filters = models.JSONField(default=dict)  # Report filters
    grouping = models.JSONField(default=list)  # Group by fields
    metrics = models.JSONField(default=list)  # Metrics to calculate
    
    # Display Settings
    chart_config = models.JSONField(default=dict)  # Chart configuration
    
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_report_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Dashboard(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='dashboards')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Dashboard Configuration
    layout = models.JSONField(default=dict)  # Dashboard layout configuration
    widgets = models.JSONField(default=list)  # Widget configurations
    
    # Access Control
    is_public = models.BooleanField(default=False)
    shared_with = models.ManyToManyField(User, blank=True, related_name='shared_dashboards')
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_dashboards')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class BusinessIntelligence(models.Model):
    INSIGHT_TYPE_CHOICES = [
        ('trend', 'Trend Analysis'),
        ('anomaly', 'Anomaly Detection'),
        ('forecast', 'Forecast'),
        ('recommendation', 'Recommendation'),
        ('alert', 'Alert'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='bi_insights')
    insight_type = models.CharField(max_length=20, choices=INSIGHT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Insight Data
    data = models.JSONField(default=dict)  # Insight data and metrics
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Actions
    recommended_actions = models.JSONField(default=list)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_insights')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
