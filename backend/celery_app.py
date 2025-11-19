import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')

app = Celery('sap_backend')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Ensure Django is set up
import django
django.setup()

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule for automated tasks
app.conf.beat_schedule = {
    'daily-compliance-check': {
        'task': 'hr.tasks.run_compliance_checks',
        'schedule': 60.0 * 60.0 * 24.0,  # Daily at midnight
    },
    'monthly-ecr-generation': {
        'task': 'hr.tasks.generate_monthly_ecr',
        'schedule': 60.0 * 60.0 * 24.0 * 30.0,  # Monthly
    },
    'weekly-compliance-reminders': {
        'task': 'hr.tasks.send_compliance_reminders',
        'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Weekly
    },
    'daily-statutory-data-backup': {
        'task': 'hr.tasks.backup_statutory_data',
        'schedule': 60.0 * 60.0 * 24.0,  # Daily
    },
    'monthly-compliance-reports': {
        'task': 'hr.tasks.generate_compliance_reports',
        'schedule': 60.0 * 60.0 * 24.0 * 30.0,  # Monthly
    },
    'daily-employee-sync': {
        'task': 'hr.tasks.sync_employee_data',
        'schedule': 60.0 * 60.0 * 24.0,  # Daily
    },
    'hourly-calculation-validation': {
        'task': 'hr.tasks.validate_statutory_calculations',
        'schedule': 60.0 * 60.0,  # Hourly
    },
    'weekly-alert-cleanup': {
        'task': 'hr.tasks.cleanup_old_alerts',
        'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Weekly
    },
    'monthly-rate-updates': {
        'task': 'hr.tasks.update_statutory_rates',
        'schedule': 60.0 * 60.0 * 24.0 * 30.0,  # Monthly
    }
}

app.conf.timezone = 'Asia/Kolkata'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')