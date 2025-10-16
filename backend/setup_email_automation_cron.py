#!/usr/bin/env python3
"""
Setup script for email automation cron jobs
Run this script to set up automated email processing
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).parent
sys.path.insert(0, str(project_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

def setup_cron_jobs():
    """Setup cron jobs for email automation"""
    
    # Get the project directory
    manage_py_path = project_dir / 'manage.py'
    
    # Cron job commands
    cron_jobs = [
        # Process email automations every hour
        f"0 * * * * cd {project_dir} && python {manage_py_path} process_email_automations >> /var/log/email_automation.log 2>&1",
        
        # Process email automations every 6 hours (backup)
        f"0 */6 * * * cd {project_dir} && python {manage_py_path} process_email_automations >> /var/log/email_automation_backup.log 2>&1"
    ]
    
    print("Email Automation Cron Jobs Setup")
    print("=" * 40)
    print("\nAdd the following lines to your crontab (run 'crontab -e'):")
    print()
    
    for job in cron_jobs:
        print(job)
    
    print()
    print("Or run the following command to add them automatically:")
    print()
    print("(crontab -l 2>/dev/null; echo '# Email Automation Jobs'; echo '" + "'; echo '".join(cron_jobs) + "') | crontab -")
    print()
    
    # Create log directory if it doesn't exist
    log_dir = Path('/var/log')
    if log_dir.exists() and log_dir.is_dir():
        print("Log files will be created at:")
        print("- /var/log/email_automation.log")
        print("- /var/log/email_automation_backup.log")
    else:
        print("Note: Make sure /var/log directory exists and is writable")
    
    print()
    print("Manual execution:")
    print(f"cd {project_dir} && python {manage_py_path} process_email_automations")
    print()
    print("For specific company:")
    print(f"cd {project_dir} && python {manage_py_path} process_email_automations --company-id=1")

if __name__ == '__main__':
    setup_cron_jobs()