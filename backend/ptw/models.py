from django.db import models


class PermitToWork(models.Model):
    PERMIT_TYPE_CHOICES = [
        ('hot_work', 'Hot Work'),
        ('cold_work', 'Cold Work'),
        ('confined_space', 'Confined Space Entry'),
        ('electrical', 'Electrical Work'),
        ('height', 'Work at Height'),
        ('excavation', 'Excavation'),
        ('chemical', 'Chemical Handling'),
        ('general', 'General Work'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    # Core identification
    permit_number = models.CharField(max_length=100, blank=True)
    permit_type = models.CharField(max_length=50, choices=PERMIT_TYPE_CHOICES, default='general')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Project / Location
    project_name = models.CharField(max_length=255, blank=True)
    work_location = models.CharField(max_length=255, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    contractor_name = models.CharField(max_length=255, blank=True)

    # Work details
    work_description = models.TextField(blank=True)
    risk_assessment_details = models.TextField(blank=True)
    ppe_requirements = models.TextField(blank=True)
    safety_precautions = models.TextField(blank=True)

    # Validity
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    # Personnel
    supervisor_name = models.CharField(max_length=255, blank=True)
    issuer_name = models.CharField(max_length=255, blank=True)
    authorized_signatures = models.TextField(blank=True)

    # Source image
    source_image = models.ImageField(upload_to='ptw_images/', null=True, blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PTW-{self.permit_number or self.pk}"
