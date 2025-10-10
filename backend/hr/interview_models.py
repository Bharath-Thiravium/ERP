from django.db import models
from django.utils import timezone
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
    interviewer = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='scheduled_interviews', null=True, blank=True)
    
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
    
    # Feedback and Results
    feedback = models.TextField(blank=True, help_text="Interview feedback")
    technical_rating = models.IntegerField(null=True, blank=True, help_text="Technical skills rating (1-10)")
    communication_rating = models.IntegerField(null=True, blank=True, help_text="Communication rating (1-10)")
    cultural_fit_rating = models.IntegerField(null=True, blank=True, help_text="Cultural fit rating (1-10)")
    overall_rating = models.IntegerField(null=True, blank=True, help_text="Overall rating (1-10)")
    
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
        from datetime import datetime, time
        return datetime.combine(self.interview_date, self.interview_time)
    
    def mark_completed(self):
        """Mark interview as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    def is_upcoming(self):
        """Check if interview is upcoming"""
        return self.interview_datetime > timezone.now() and self.status == 'scheduled'


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