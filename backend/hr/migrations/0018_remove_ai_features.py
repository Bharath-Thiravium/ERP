# Generated migration to remove AI/ML features

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0017_update_portal_credentials_encryption'),
    ]

    operations = [
        # Remove AI fields from Employee model
        migrations.RemoveField(
            model_name='employee',
            name='performance_score',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='engagement_score',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='retention_risk',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='face_photo',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='face_encoding',
        ),
        
        # Remove AI fields from JobPosting model
        migrations.RemoveField(
            model_name='jobposting',
            name='ai_screening_enabled',
        ),
        
        # Remove AI fields from JobApplication model
        migrations.RemoveField(
            model_name='jobapplication',
            name='ai_score',
        ),
        migrations.RemoveField(
            model_name='jobapplication',
            name='skill_match_percentage',
        ),
        migrations.RemoveField(
            model_name='jobapplication',
            name='ai_screening_notes',
        ),
        
        # Remove AI fields from PerformanceReview model
        migrations.RemoveField(
            model_name='performancereview',
            name='ai_performance_prediction',
        ),
        migrations.RemoveField(
            model_name='performancereview',
            name='improvement_suggestions',
        ),
        
        # Remove face recognition fields from Attendance model
        migrations.RemoveField(
            model_name='attendance',
            name='check_in_face_image',
        ),
        migrations.RemoveField(
            model_name='attendance',
            name='check_out_face_image',
        ),
        migrations.RemoveField(
            model_name='attendance',
            name='face_match_score',
        ),
        migrations.RemoveField(
            model_name='attendance',
            name='is_valid_face_match',
        ),
        
        # Remove face recognition from AttendanceSystem
        migrations.RemoveField(
            model_name='attendancesystem',
            name='enable_face_recognition',
        ),
        migrations.RemoveField(
            model_name='attendancesystem',
            name='face_match_threshold',
        ),
        migrations.RemoveField(
            model_name='attendancesystem',
            name='require_face_for_checkin',
        ),
        migrations.RemoveField(
            model_name='attendancesystem',
            name='require_face_for_checkout',
        ),
    ]
