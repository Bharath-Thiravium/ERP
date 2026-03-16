# Generated migration for ServiceUserSession field fixes

from django.db import migrations, models
from django.utils import timezone
from datetime import timedelta


def backfill_session_data(apps, schema_editor):
    """Backfill expires_at and fix login_time for existing sessions"""
    ServiceUserSession = apps.get_model('authentication', 'ServiceUserSession')
    
    for session in ServiceUserSession.objects.all():
        # Set expires_at to 7 days from created_at (or login_time if created_at is null)
        base_time = session.created_at or session.login_time or timezone.now()
        if not session.expires_at:
            session.expires_at = base_time + timedelta(days=7)
        
        # If login_time is auto_now_add, copy from created_at
        if session.created_at and not session.login_time:
            session.login_time = session.created_at
            
        session.save()


def reverse_backfill(apps, schema_editor):
    """Reverse migration - clear expires_at"""
    ServiceUserSession = apps.get_model('authentication', 'ServiceUserSession')
    ServiceUserSession.objects.update(expires_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_add_session_security_fields'),
    ]

    operations = [
        # First alter login_time to be nullable and remove auto_now_add
        migrations.AlterField(
            model_name='serviceusersession',
            name='login_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        # Run data migration to backfill expires_at and fix login_time
        migrations.RunPython(
            backfill_session_data,
            reverse_backfill,
        ),
    ]