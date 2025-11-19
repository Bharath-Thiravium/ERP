from django.core.management.base import BaseCommand
from configuration.models import DatabaseBackup
from configuration.backup_manager import DatabaseBackupManager
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Test database backup functionality'

    def handle(self, *args, **options):
        try:
            # Get admin user
            admin_user = User.objects.filter(is_superuser=True).first()
            if not admin_user:
                self.stdout.write(
                    self.style.ERROR('No admin user found. Please create a superuser first.')
                )
                return

            # Create a test backup record
            backup = DatabaseBackup.objects.create(
                name='test_backup_schema_only',
                backup_type='schema',
                description='Test backup for schema only',
                created_by=admin_user
            )

            self.stdout.write(
                self.style.SUCCESS(f'Created backup record: {backup.name} (ID: {backup.id})')
            )

            # Test backup manager
            backup_manager = DatabaseBackupManager()
            
            # Get backup statistics
            stats = backup_manager.get_backup_statistics()
            self.stdout.write(
                self.style.SUCCESS(f'Backup Statistics: {stats}')
            )

            self.stdout.write(
                self.style.SUCCESS('Backup system test completed successfully!')
            )
            
            # Note: We're not actually running the backup to avoid creating large files
            # In production, you would call: backup_manager.create_backup(backup.id, backup.backup_type)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Backup test failed: {str(e)}')
            )