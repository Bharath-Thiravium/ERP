from django.core.management.base import BaseCommand
from configuration.models import SystemConfiguration, BackupSchedule
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Setup sample configuration data'

    def handle(self, *args, **options):
        # Create sample system configurations
        configs = [
            {
                'key': 'database.max_connections',
                'value': '100',
                'description': 'Maximum number of database connections',
                'category': 'database'
            },
            {
                'key': 'database.timeout',
                'value': '30',
                'description': 'Database connection timeout in seconds',
                'category': 'database'
            },
            {
                'key': 'email.smtp_host',
                'value': 'smtp.gmail.com',
                'description': 'SMTP server hostname',
                'category': 'email'
            },
            {
                'key': 'email.smtp_port',
                'value': '587',
                'description': 'SMTP server port',
                'category': 'email'
            },
            {
                'key': 'security.password_min_length',
                'value': '12',
                'description': 'Minimum password length requirement',
                'category': 'security'
            },
            {
                'key': 'security.session_timeout',
                'value': '3600',
                'description': 'User session timeout in seconds',
                'category': 'security'
            },
            {
                'key': 'api.rate_limit',
                'value': '1000',
                'description': 'API requests per hour limit',
                'category': 'api'
            },
            {
                'key': 'api.cors_origins',
                'value': 'http://localhost:3000,https://app.example.com',
                'description': 'Allowed CORS origins',
                'category': 'api'
            },
            {
                'key': 'server.debug_mode',
                'value': 'false',
                'description': 'Enable debug mode',
                'category': 'server'
            },
            {
                'key': 'server.log_level',
                'value': 'INFO',
                'description': 'Application log level',
                'category': 'server'
            }
        ]

        for config_data in configs:
            config, created = SystemConfiguration.objects.get_or_create(
                key=config_data['key'],
                defaults=config_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created configuration: {config.key}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Configuration already exists: {config.key}')
                )

        # Create sample backup schedules
        admin_user = User.objects.filter(is_superuser=True).first()
        if admin_user:
            schedules = [
                {
                    'name': 'Daily Full Backup',
                    'backup_type': 'full',
                    'frequency': 'daily',
                    'time': '02:00:00',
                    'retention_days': 7,
                    'created_by': admin_user
                },
                {
                    'name': 'Weekly Archive Backup',
                    'backup_type': 'full',
                    'frequency': 'weekly',
                    'time': '01:00:00',
                    'day_of_week': 0,  # Monday
                    'retention_days': 30,
                    'created_by': admin_user
                },
                {
                    'name': 'Monthly Long-term Backup',
                    'backup_type': 'full',
                    'frequency': 'monthly',
                    'time': '00:00:00',
                    'day_of_month': 1,
                    'retention_days': 365,
                    'created_by': admin_user
                }
            ]

            for schedule_data in schedules:
                schedule, created = BackupSchedule.objects.get_or_create(
                    name=schedule_data['name'],
                    defaults=schedule_data
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'Created backup schedule: {schedule.name}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Backup schedule already exists: {schedule.name}')
                    )

        self.stdout.write(
            self.style.SUCCESS('Sample configuration data setup completed!')
        )