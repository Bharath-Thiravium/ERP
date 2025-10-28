from django.db import models
from django.utils import timezone
from authentication.models import Company, CompanyServiceUser
from .models import JobPosting, JobApplication


class JobShareAnalytics(models.Model):
    """Track job sharing across different platforms"""
    PLATFORM_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('linkedin', 'LinkedIn'),
        ('gmail', 'Gmail'),
        ('outlook', 'Outlook'),
        ('email', 'Other Email'),
        ('facebook', 'Facebook'),
        ('twitter', 'Twitter'),
        ('instagram', 'Instagram'),
        ('telegram', 'Telegram'),
        ('copy_link', 'Copy Link'),
    ]
    
    job_posting = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name='share_analytics')
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    shared_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, blank=True)
    shared_at = models.DateTimeField(auto_now_add=True)
    
    # UTM tracking
    utm_source = models.CharField(max_length=50, blank=True)
    utm_medium = models.CharField(max_length=50, default='social')
    utm_campaign = models.CharField(max_length=100, default='job_sharing')
    
    # Performance metrics
    clicks_from_share = models.IntegerField(default=0)
    applications_from_share = models.IntegerField(default=0)
    
    # Additional metadata
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-shared_at']
        indexes = [
            models.Index(fields=['job_posting', 'platform']),
            models.Index(fields=['shared_at']),
            models.Index(fields=['shared_by']),
        ]
    
    def __str__(self):
        return f"{self.job_posting.title} shared on {self.platform}"


class ShareClickTracking(models.Model):
    """Track clicks on shared job links"""
    share_analytics = models.ForeignKey(JobShareAnalytics, on_delete=models.CASCADE, related_name='clicks')
    clicked_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    referrer = models.URLField(blank=True)
    
    class Meta:
        ordering = ['-clicked_at']


class MessageTemplate(models.Model):
    """Custom message templates for job sharing"""
    TEMPLATE_TYPES = [
        ('professional', 'Professional'),
        ('casual', 'Casual'),
        ('creative', 'Creative'),
        ('urgent', 'Urgent'),
        ('remote', 'Remote Work'),
        ('custom', 'Custom'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='message_templates')
    name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPES)
    template_content = models.TextField()
    
    # Platform-specific templates
    whatsapp_template = models.TextField(blank=True)
    linkedin_template = models.TextField(blank=True)
    facebook_template = models.TextField(blank=True)
    twitter_template = models.TextField(blank=True)
    instagram_template = models.TextField(blank=True)
    email_template = models.TextField(blank=True)
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'name']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.company.name}"


class BulkShareOperation(models.Model):
    """Track bulk sharing operations"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='bulk_shares')
    job_postings = models.ManyToManyField(JobPosting, related_name='bulk_shares')
    platforms = models.JSONField(default=list)  # List of platforms shared to
    
    initiated_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    initiated_at = models.DateTimeField(auto_now_add=True)
    
    # Scheduling
    scheduled_for = models.DateTimeField(null=True, blank=True)
    is_scheduled = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Results
    total_shares = models.IntegerField(default=0)
    successful_shares = models.IntegerField(default=0)
    failed_shares = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-initiated_at']
    
    def __str__(self):
        return f"Bulk share - {self.total_shares} shares"


class SharePerformanceMetrics(models.Model):
    """Aggregated performance metrics for sharing"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='share_metrics')
    job_posting = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name='performance_metrics')
    platform = models.CharField(max_length=20, choices=JobShareAnalytics.PLATFORM_CHOICES)
    
    # Date range for metrics
    date = models.DateField()
    
    # Metrics
    total_shares = models.IntegerField(default=0)
    total_clicks = models.IntegerField(default=0)
    total_applications = models.IntegerField(default=0)
    
    # Calculated rates
    click_through_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # clicks/shares
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # applications/clicks
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'job_posting', 'platform', 'date']
        ordering = ['-date']
    
    def calculate_rates(self):
        """Calculate performance rates"""
        if self.total_shares > 0:
            self.click_through_rate = (self.total_clicks / self.total_shares) * 100
        
        if self.total_clicks > 0:
            self.conversion_rate = (self.total_applications / self.total_clicks) * 100
        
        self.save()


class ShareCampaign(models.Model):
    """Organize sharing into campaigns"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='share_campaigns')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Campaign settings
    job_postings = models.ManyToManyField(JobPosting, related_name='campaigns')
    target_platforms = models.JSONField(default=list)
    message_template = models.ForeignKey(MessageTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timing
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Status
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.company.name}"
    
    @property
    def total_shares(self):
        return JobShareAnalytics.objects.filter(
            job_posting__in=self.job_postings.all(),
            shared_at__range=[self.start_date, self.end_date]
        ).count()
    
    @property
    def total_applications(self):
        return JobApplication.objects.filter(
            job_posting__in=self.job_postings.all(),
            created_at__range=[self.start_date, self.end_date]
        ).count()