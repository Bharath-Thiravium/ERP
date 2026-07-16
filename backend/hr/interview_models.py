from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from .models import JobApplication, Employee

class Interview(models.Model):
    """Interview scheduling and management"""
    INTERVIEW_TYPES = [
        ('phone', 'Phone Call'),
        ('video', 'Video Call'),
        ('in_person', 'In Person'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rescheduled', 'Rescheduled'),
        ('no_show', 'No Show'),
    ]
    
    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name='interviews')
    interviewer = models.ForeignKey(Employee, on_delete=models.SET_NULL, related_name='scheduled_interviews', null=True, blank=True)
    
    # Interview Details
    interview_date = models.DateField()
    interview_time = models.TimeField()
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPES, default='video')
    interview_round = models.IntegerField(default=1)
    
    # Location/Meeting Details
    location = models.CharField(max_length=255, blank=True, help_text="Physical location for in-person interviews")
    meeting_link = models.URLField(blank=True, help_text="Video call link")
    
    # Status and Notes
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(blank=True, help_text="Interview preparation notes")
    email_sent = models.BooleanField(default=False, help_text="Whether invitation email was sent")
    email_sent_at = models.DateTimeField(null=True, blank=True, help_text="When invitation email was sent")
    
    # Feedback and Results
    feedback = models.TextField(blank=True, help_text="Interview feedback")
    technical_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)], help_text="Technical skills rating (1-10)")
    communication_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)], help_text="Communication rating (1-10)")
    cultural_fit_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)], help_text="Cultural fit rating (1-10)")
    overall_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)], help_text="Overall rating (1-10)")
    
    # Recommendations
    recommendation = models.CharField(max_length=20, choices=[
        ('hire', 'Recommend to Hire'),
        ('reject', 'Reject'),
        ('next_round', 'Next Round'),
        ('hold', 'On Hold'),
    ], blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-interview_date', '-interview_time']
        
    def __str__(self):
        return f"{self.application.full_name} - {self.interview_date} {self.interview_time}"
    
    @property
    def interview_datetime(self):
        from datetime import datetime
        value = datetime.combine(self.interview_date, self.interview_time)
        return timezone.make_aware(value, timezone.get_current_timezone())
    
    def mark_completed(self):
        """Mark interview as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    def is_upcoming(self):
        """Check if interview is upcoming"""
        return self.interview_datetime > timezone.now() and self.status == 'scheduled'
    
    def send_interview_invitation(self):
        """Send interview invitation email to candidate"""
        try:
            from company_dashboard.email_service import get_company_email_service
            
            company = self.application.job_posting.company
            candidate_name = self.application.full_name
            candidate_email = self.application.email
            job_title = self.application.job_posting.title
            
            # Get company email service
            email_service = get_company_email_service(company)
            
            if not email_service:
                return {'success': False, 'error': 'No email settings configured for company'}
            
            if not email_service.can_send_email():
                return {'success': False, 'error': 'Email service not available - check settings or daily limit'}
            
            subject = f"Interview Scheduled - {job_title} at {company.name}"
            
            # Generate email content based on interview type
            html_content, text_content = self._generate_interview_email_content(
                candidate_name, job_title, company
            )
            
            # Send email
            success = email_service.send_email(
                to_emails=[candidate_email],
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            # Update email status
            if success:
                self.email_sent = True
                self.email_sent_at = timezone.now()
                self.save(update_fields=['email_sent', 'email_sent_at'])
                return {'success': True, 'message': 'Interview invitation sent successfully'}
            else:
                return {'success': False, 'error': 'Failed to send email - check SMTP/API settings'}
            
        except Exception as e:
            return {'success': False, 'error': f'Email error: {str(e)}'}
    
    def _generate_interview_email_content(self, candidate_name, job_title, company):
        """Generate email content based on interview type"""
        
        # Format date and time
        interview_date_str = self.interview_date.strftime('%A, %B %d, %Y')
        interview_time_str = self.interview_time.strftime('%I:%M %p')
        interviewer_name = self.interviewer.full_name if self.interviewer else 'HR Team'
        
        # Base HTML template
        html_base = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Interview Invitation</h2>
                
                <p>Dear <strong>{candidate_name}</strong>,</p>
                
                <p>We are pleased to invite you for an interview for the position of <strong>{job_title}</strong> at {company.name}.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">Interview Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin: 8px 0;"><strong>Position:</strong> {job_title}</li>
                        <li style="margin: 8px 0;"><strong>Date:</strong> {interview_date_str}</li>
                        <li style="margin: 8px 0;"><strong>Time:</strong> {interview_time_str}</li>
                        <li style="margin: 8px 0;"><strong>Interviewer:</strong> {interviewer_name}</li>
                        <li style="margin: 8px 0;"><strong>Type:</strong> {self.get_interview_type_display()}</li>
        """
        
        # Add type-specific content
        if self.interview_type == 'phone':
            html_content = html_base + f"""
                        <li style="margin: 8px 0;"><strong>Phone:</strong> We will call you at {self.application.phone}</li>
                    </ul>
                </div>
                
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #1565c0;">📞 Phone Interview Instructions:</h4>
                    <ul>
                        <li>Please ensure you are in a quiet location</li>
                        <li>Keep your resume handy for reference</li>
                        <li>We will call you at the scheduled time</li>
                        <li>If you don't receive our call within 5 minutes, please call us back</li>
                    </ul>
                </div>
            """
            
            text_content = f"""Dear {candidate_name},

We are pleased to invite you for a phone interview for the position of {job_title} at {company.name}.

Interview Details:
- Position: {job_title}
- Date: {interview_date_str}
- Time: {interview_time_str}
- Interviewer: {interviewer_name}
- Type: Phone Interview
- Phone: We will call you at {self.application.phone}

Phone Interview Instructions:
- Please ensure you are in a quiet location
- Keep your resume handy for reference
- We will call you at the scheduled time
- If you don't receive our call within 5 minutes, please call us back
            """
            
        elif self.interview_type == 'video':
            html_content = html_base + f"""
                        <li style="margin: 8px 0;"><strong>Meeting Link:</strong> <a href="{self.meeting_link}" style="color: #007bff;">{self.meeting_link}</a></li>
                    </ul>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #2d5a2d;">💻 Video Interview Instructions:</h4>
                    <ul>
                        <li>Test your camera and microphone beforehand</li>
                        <li>Ensure stable internet connection</li>
                        <li>Join the meeting 5 minutes early</li>
                        <li>Choose a well-lit, quiet location</li>
                        <li>Keep your resume and notepad ready</li>
                    </ul>
                </div>
            """
            
            text_content = f"""Dear {candidate_name},

We are pleased to invite you for a video interview for the position of {job_title} at {company.name}.

Interview Details:
- Position: {job_title}
- Date: {interview_date_str}
- Time: {interview_time_str}
- Interviewer: {interviewer_name}
- Type: Video Interview
- Meeting Link: {self.meeting_link}

Video Interview Instructions:
- Test your camera and microphone beforehand
- Ensure stable internet connection
- Join the meeting 5 minutes early
- Choose a well-lit, quiet location
- Keep your resume and notepad ready
            """
            
        else:  # in_person
            html_content = html_base + f"""
                        <li style="margin: 8px 0;"><strong>Location:</strong> {self.location}</li>
                    </ul>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #856404;">🏢 In-Person Interview Instructions:</h4>
                    <ul>
                        <li>Please arrive 10 minutes early</li>
                        <li>Bring a printed copy of your resume</li>
                        <li>Carry a valid photo ID</li>
                        <li>Ask for {interviewer_name} at reception</li>
                        <li>Dress professionally</li>
                    </ul>
                </div>
            """
            
            text_content = f"""Dear {candidate_name},

We are pleased to invite you for an in-person interview for the position of {job_title} at {company.name}.

Interview Details:
- Position: {job_title}
- Date: {interview_date_str}
- Time: {interview_time_str}
- Interviewer: {interviewer_name}
- Type: In-Person Interview
- Location: {self.location}

In-Person Interview Instructions:
- Please arrive 10 minutes early
- Bring a printed copy of your resume
- Carry a valid photo ID
- Ask for {interviewer_name} at reception
- Dress professionally
            """
        
        # Add common footer
        html_footer = f"""
                {f'<div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;"><h4 style="margin-top: 0; color: #1e3a8a;">Additional Notes:</h4><p>{self.notes}</p></div>' if self.notes else ''}
                
                <p>We look forward to meeting you! If you have any questions or need to reschedule, please contact us immediately.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="margin: 0;"><strong>Best regards,</strong></p>
                    <p style="margin: 5px 0 0 0;">HR Team</p>
                    <p style="margin: 5px 0 0 0;">{company.name}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_footer = f"""
{f'\nAdditional Notes:\n{self.notes}\n' if self.notes else ''}
We look forward to meeting you! If you have any questions or need to reschedule, please contact us immediately.

Best regards,
HR Team
{company.name}
        """
        
        return html_content + html_footer, text_content + text_footer


class InterviewFeedback(models.Model):
    """Detailed interview feedback and assessment"""
    interview = models.OneToOneField(Interview, on_delete=models.CASCADE, related_name='detailed_feedback')
    
    # Technical Assessment
    technical_skills = models.JSONField(default=list, help_text="List of technical skills assessed")
    technical_questions = models.JSONField(default=list, help_text="Technical questions asked")
    technical_answers = models.JSONField(default=list, help_text="Candidate responses")
    
    # Behavioral Assessment
    behavioral_questions = models.JSONField(default=list, help_text="Behavioral questions asked")
    behavioral_responses = models.JSONField(default=list, help_text="Behavioral responses")
    
    # Strengths and Weaknesses
    strengths = models.TextField(blank=True)
    weaknesses = models.TextField(blank=True)
    improvement_areas = models.TextField(blank=True)
    
    # Decision Factors
    hire_reasons = models.TextField(blank=True, help_text="Reasons to hire")
    reject_reasons = models.TextField(blank=True, help_text="Reasons to reject")
    
    # Additional Notes
    additional_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Feedback for {self.interview}"


class InterviewScheduleTemplate(models.Model):
    """Template for interview scheduling"""
    company = models.ForeignKey('authentication.Company', on_delete=models.CASCADE, related_name='interview_templates')
    name = models.CharField(max_length=100)
    
    # Default Settings
    default_duration_minutes = models.IntegerField(default=60)
    default_interview_type = models.CharField(max_length=20, choices=Interview.INTERVIEW_TYPES, default='video')
    
    # Email Templates
    invitation_email_template = models.TextField(blank=True)
    reminder_email_template = models.TextField(blank=True)
    feedback_email_template = models.TextField(blank=True)
    
    # Question Banks
    technical_questions = models.JSONField(default=list)
    behavioral_questions = models.JSONField(default=list)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"
