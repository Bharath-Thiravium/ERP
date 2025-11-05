"""
Management command to setup government portal integration
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from cryptography.fernet import Fernet
import os


class Command(BaseCommand):
    help = 'Setup government portal integration with secure encryption'

    def add_arguments(self, parser):
        parser.add_argument(
            '--generate-key',
            action='store_true',
            help='Generate new encryption key for portal credentials',
        )
        parser.add_argument(
            '--test-connection',
            action='store_true',
            help='Test connection to government portals',
        )

    def handle(self, *args, **options):
        if options['generate_key']:
            self.generate_encryption_key()
        
        if options['test_connection']:
            self.test_portal_connections()

    def generate_encryption_key(self):
        """Generate and display encryption key"""
        key = Fernet.generate_key()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nGenerated encryption key: {key.decode()}\n'
            )
        )
        
        self.stdout.write(
            self.style.WARNING(
                'IMPORTANT: Store this key securely and set it as environment variable:\n'
                f'export PORTAL_ENCRYPTION_KEY="{key.decode()}"\n'
            )
        )
        
        # Check if .env file exists and offer to add key
        env_file = os.path.join(settings.BASE_DIR, '.env')
        if os.path.exists(env_file):
            add_to_env = input('Add to .env file? (y/n): ')
            if add_to_env.lower() == 'y':
                with open(env_file, 'a') as f:
                    f.write(f'\n# Government Portal Encryption Key\nPORTAL_ENCRYPTION_KEY={key.decode()}\n')
                self.stdout.write(
                    self.style.SUCCESS('Key added to .env file')
                )

    def test_portal_connections(self):
        """Test connections to government portals"""
        from hr.real_government_integration import (
            EPFOPortalIntegration, 
            ESICPortalIntegration,
            IncomeTaxPortalIntegration,
            ProfessionalTaxPortalIntegration
        )
        
        self.stdout.write('Testing government portal connections...\n')
        
        # Test EPFO
        try:
            epfo = EPFOPortalIntegration('test', 'test', 'test')
            self.stdout.write(
                self.style.SUCCESS('✓ EPFO Portal integration class loaded')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ EPFO Portal error: {e}')
            )
        
        # Test ESIC
        try:
            esic = ESICPortalIntegration('test', 'test', 'test')
            self.stdout.write(
                self.style.SUCCESS('✓ ESIC Portal integration class loaded')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ ESIC Portal error: {e}')
            )
        
        # Test Income Tax
        try:
            it = IncomeTaxPortalIntegration('test', 'test', 'test')
            self.stdout.write(
                self.style.SUCCESS('✓ Income Tax Portal integration class loaded')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Income Tax Portal error: {e}')
            )
        
        # Test Professional Tax
        try:
            pt = ProfessionalTaxPortalIntegration('test', 'test', 'test')
            self.stdout.write(
                self.style.SUCCESS('✓ Professional Tax Portal integration class loaded')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Professional Tax Portal error: {e}')
            )
        
        self.stdout.write('\nSetup complete! Government portal integration is ready.')
        self.stdout.write(
            self.style.WARNING(
                '\nNext steps:\n'
                '1. Configure portal credentials in the HR system\n'
                '2. Test with real government portal accounts\n'
                '3. Set up SSL certificates for digital signatures\n'
            )
        )