# Generated manually to keep interview runtime models in sync with the database.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_companyuser_password_reset_by_admin'),
        ('hr', '0033_payroll_calculated_status_decimal_days'),
    ]

    operations = [
        migrations.CreateModel(
            name='Interview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('interview_date', models.DateField()),
                ('interview_time', models.TimeField()),
                ('interview_type', models.CharField(choices=[('phone', 'Phone Call'), ('video', 'Video Call'), ('in_person', 'In Person')], default='video', max_length=20)),
                ('interview_round', models.IntegerField(default=1)),
                ('location', models.CharField(blank=True, help_text='Physical location for in-person interviews', max_length=255)),
                ('meeting_link', models.URLField(blank=True, help_text='Video call link')),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('rescheduled', 'Rescheduled'), ('no_show', 'No Show')], default='scheduled', max_length=20)),
                ('notes', models.TextField(blank=True, help_text='Interview preparation notes')),
                ('email_sent', models.BooleanField(default=False, help_text='Whether invitation email was sent')),
                ('email_sent_at', models.DateTimeField(blank=True, help_text='When invitation email was sent', null=True)),
                ('feedback', models.TextField(blank=True, help_text='Interview feedback')),
                ('technical_rating', models.IntegerField(blank=True, help_text='Technical skills rating (1-10)', null=True)),
                ('communication_rating', models.IntegerField(blank=True, help_text='Communication rating (1-10)', null=True)),
                ('cultural_fit_rating', models.IntegerField(blank=True, help_text='Cultural fit rating (1-10)', null=True)),
                ('overall_rating', models.IntegerField(blank=True, help_text='Overall rating (1-10)', null=True)),
                ('recommendation', models.CharField(blank=True, choices=[('hire', 'Recommend to Hire'), ('reject', 'Reject'), ('next_round', 'Next Round'), ('hold', 'On Hold')], max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interviews', to='hr.jobapplication')),
                ('interviewer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='scheduled_interviews', to='hr.employee')),
            ],
            options={
                'ordering': ['-interview_date', '-interview_time'],
            },
        ),
        migrations.CreateModel(
            name='InterviewFeedback',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('technical_skills', models.JSONField(default=list, help_text='List of technical skills assessed')),
                ('technical_questions', models.JSONField(default=list, help_text='Technical questions asked')),
                ('technical_answers', models.JSONField(default=list, help_text='Candidate responses')),
                ('behavioral_questions', models.JSONField(default=list, help_text='Behavioral questions asked')),
                ('behavioral_responses', models.JSONField(default=list, help_text='Behavioral responses')),
                ('strengths', models.TextField(blank=True)),
                ('weaknesses', models.TextField(blank=True)),
                ('improvement_areas', models.TextField(blank=True)),
                ('hire_reasons', models.TextField(blank=True, help_text='Reasons to hire')),
                ('reject_reasons', models.TextField(blank=True, help_text='Reasons to reject')),
                ('additional_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('interview', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='detailed_feedback', to='hr.interview')),
            ],
        ),
        migrations.CreateModel(
            name='InterviewScheduleTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('default_duration_minutes', models.IntegerField(default=60)),
                ('default_interview_type', models.CharField(choices=[('phone', 'Phone Call'), ('video', 'Video Call'), ('in_person', 'In Person')], default='video', max_length=20)),
                ('invitation_email_template', models.TextField(blank=True)),
                ('reminder_email_template', models.TextField(blank=True)),
                ('feedback_email_template', models.TextField(blank=True)),
                ('technical_questions', models.JSONField(default=list)),
                ('behavioral_questions', models.JSONField(default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interview_templates', to='authentication.company')),
            ],
        ),
    ]
