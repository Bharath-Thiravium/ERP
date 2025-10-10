from django.db import models
from django.utils import timezone
from .models import JobApplication, Employee

class JobOffer(models.Model):
    """Job offer management"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
        ('expired', 'Expired'),
    ]
    
    application = models.OneToOneField(JobApplication, on_delete=models.CASCADE, related_name='offer')
    
    # Offer Details
    salary_offered = models.DecimalField(max_digits=12, decimal_places=2)
    joining_date = models.DateField()
    offer_valid_until = models.DateField()
    
    # Additional Details
    benefits = models.TextField(blank=True, help_text="Benefits and perks")
    terms_conditions = models.TextField(blank=True, help_text="Terms and conditions")
    notes = models.TextField(blank=True, help_text="Additional notes")
    
    # Status and Tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    sent_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    # Response Details
    candidate_response = models.TextField(blank=True, help_text="Candidate's response/feedback")
    negotiation_notes = models.TextField(blank=True, help_text="Salary negotiation notes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Offer for {self.application.full_name} - {self.status}"
    
    def send_offer(self):
        """Mark offer as sent and send email"""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save()
        
        # Send email to candidate
        return self._send_offer_email()
    
    def _send_offer_email(self):
        """Send offer email to candidate using company email service"""
        try:
            from company_dashboard.email_service import get_company_email_service
            
            company = self.application.job_posting.company
            candidate_name = self.application.full_name
            job_title = self.application.job_posting.title
            
            # Get company email service
            email_service = get_company_email_service(company)
            
            if not email_service or not email_service.can_send_email():
                print("Company email service not configured or daily limit reached")
                return False
            
            subject = f"Job Offer - {job_title} at {company.name}"
            
            # HTML email content
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Congratulations! Job Offer</h2>
                    
                    <p>Dear <strong>{candidate_name}</strong>,</p>
                    
                    <p>We are pleased to offer you the position of <strong>{job_title}</strong> at {company.name}.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #495057;">Offer Details:</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li style="margin: 8px 0;"><strong>Position:</strong> {job_title}</li>
                            <li style="margin: 8px 0;"><strong>Salary:</strong> Rs.{self.salary_offered:,.2f} per annum</li>
                            <li style="margin: 8px 0;"><strong>Joining Date:</strong> {self.joining_date.strftime('%B %d, %Y') if hasattr(self.joining_date, 'strftime') else self.joining_date}</li>
                            <li style="margin: 8px 0;"><strong>Offer Valid Until:</strong> {self.offer_valid_until.strftime('%B %d, %Y') if hasattr(self.offer_valid_until, 'strftime') else self.offer_valid_until}</li>
                        </ul>
                    </div>
                    
                    {f'<div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;"><h4 style="margin-top: 0; color: #2d5a2d;">Benefits & Perks:</h4><p>{self.benefits}</p></div>' if self.benefits else ''}
                    
                    {f'<div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;"><h4 style="margin-top: 0; color: #856404;">Terms & Conditions:</h4><p>{self.terms_conditions}</p></div>' if self.terms_conditions else ''}
                    
                    {f'<div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;"><h4 style="margin-top: 0; color: #1e3a8a;">Additional Notes:</h4><p>{self.notes}</p></div>' if self.notes else ''}
                    
                    <p>We are excited about the possibility of you joining our team! Please let us know your decision by the offer validity date.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                        <p style="margin: 0;"><strong>Best regards,</strong></p>
                        <p style="margin: 5px 0 0 0;">HR Team</p>
                        <p style="margin: 5px 0 0 0;">{company.name}</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Text content
            text_content = f"""Dear {candidate_name},

Congratulations! We are pleased to offer you the position of {job_title} at {company.name}.

Offer Details:
- Position: {job_title}
- Salary: Rs.{self.salary_offered:,.2f} per annum
- Joining Date: {self.joining_date.strftime('%B %d, %Y') if hasattr(self.joining_date, 'strftime') else self.joining_date}
- Offer Valid Until: {self.offer_valid_until.strftime('%B %d, %Y') if hasattr(self.offer_valid_until, 'strftime') else self.offer_valid_until}

{f'Benefits & Perks:\n{self.benefits}\n\n' if self.benefits else ''}{f'Terms & Conditions:\n{self.terms_conditions}\n\n' if self.terms_conditions else ''}{f'Additional Notes:\n{self.notes}\n\n' if self.notes else ''}We are excited about the possibility of you joining our team! Please let us know your decision by the offer validity date.

Best regards,
HR Team
{company.name}
            """
            
            # Send email using company email service
            print(f"Attempting to send offer email to: {self.application.email}")
            print(f"Company: {company.name}")
            print(f"Email service configured: {email_service is not None}")
            
            success = email_service.send_email(
                to_emails=[self.application.email],
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                attachments=None
            )
            
            print(f"Email send result: {success}")
            return success
            
        except Exception as e:
            print(f"Error sending offer email: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def accept_offer(self):
        """Mark offer as accepted"""
        self.status = 'accepted'
        self.responded_at = timezone.now()
        self.save()
        
        # Update application status
        self.application.status = 'selected'
        self.application.save()
    
    def reject_offer(self):
        """Mark offer as rejected"""
        self.status = 'rejected'
        self.responded_at = timezone.now()
        self.save()
        
        # Update application status
        self.application.status = 'rejected'
        self.application.save()
    
    @property
    def is_expired(self):
        """Check if offer has expired"""
        return timezone.now().date() > self.offer_valid_until and self.status == 'sent'


class OfferTemplate(models.Model):
    """Offer letter templates"""
    company = models.ForeignKey('authentication.Company', on_delete=models.CASCADE, related_name='offer_templates')
    name = models.CharField(max_length=100)
    
    # Template Content
    subject_template = models.CharField(max_length=200, default="Job Offer - {position} at {company}")
    email_template = models.TextField(help_text="Email template with placeholders")
    
    # Default Values
    default_benefits = models.TextField(blank=True)
    default_terms = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"