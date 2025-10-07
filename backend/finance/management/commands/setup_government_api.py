"""
Django management command to setup government API integration
Usage: python manage.py setup_government_api
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Setup government API integration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--environment',
            type=str,
            choices=['sandbox', 'production'],
            default='sandbox',
            help='API environment to setup'
        )

    def handle(self, *args, **options):
        environment = options['environment']
        
        self.stdout.write(
            self.style.SUCCESS(f'Setting up Government API Integration for {environment} environment...')
        )

        # Check required settings
        required_settings = [
            'GST_CLIENT_ID',
            'GST_CLIENT_SECRET', 
            'GST_USERNAME',
            'GST_PASSWORD',
            'TDS_USERNAME',
            'TDS_PASSWORD',
            'COMPANY_GSTIN',
            'COMPANY_PAN',
            'COMPANY_TAN'
        ]

        missing_settings = []
        for setting in required_settings:
            if not hasattr(settings, setting) or not getattr(settings, setting):
                missing_settings.append(setting)

        if missing_settings:
            self.stdout.write(
                self.style.WARNING(
                    f'Missing required settings: {", ".join(missing_settings)}'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    'Please add these settings to your Django settings.py file'
                )
            )

        # Test API connections
        self.test_api_connections(environment)

        # Setup cache
        self.setup_cache()

        # Create log directory
        self.setup_logging()

        self.stdout.write(
            self.style.SUCCESS('Government API Integration setup completed!')
        )

    def test_api_connections(self, environment):
        """Test API connections"""
        self.stdout.write('Testing API connections...')
        
        try:
            from ..government_api import gst_service, tds_service, einvoice_service
            
            # Test GST API
            try:
                token = gst_service.get_auth_token()
                if token:
                    self.stdout.write(
                        self.style.SUCCESS('✓ GST API connection successful')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR('✗ GST API connection failed')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ GST API error: {str(e)}')
                )

            # Test TDS API
            try:
                token = tds_service.get_auth_token()
                if token:
                    self.stdout.write(
                        self.style.SUCCESS('✓ TDS API connection successful')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR('✗ TDS API connection failed')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ TDS API error: {str(e)}')
                )

            # Test E-Invoice API
            try:
                token = einvoice_service.get_auth_token()
                if token:
                    self.stdout.write(
                        self.style.SUCCESS('✓ E-Invoice API connection successful')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR('✗ E-Invoice API connection failed')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ E-Invoice API error: {str(e)}')
                )

        except ImportError as e:
            self.stdout.write(
                self.style.ERROR(f'Import error: {str(e)}')
            )

    def setup_cache(self):
        """Setup cache for API tokens"""
        self.stdout.write('Setting up cache...')
        
        try:
            from django.core.cache import cache
            cache.set('test_key', 'test_value', 60)
            if cache.get('test_key') == 'test_value':
                self.stdout.write(
                    self.style.SUCCESS('✓ Cache setup successful')
                )
                cache.delete('test_key')
            else:
                self.stdout.write(
                    self.style.ERROR('✗ Cache setup failed')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Cache error: {str(e)}')
            )

    def setup_logging(self):
        """Setup logging directory"""
        self.stdout.write('Setting up logging...')
        
        try:
            log_dir = os.path.join(settings.BASE_DIR, 'logs')
            if not os.path.exists(log_dir):
                os.makedirs(log_dir)
                self.stdout.write(
                    self.style.SUCCESS('✓ Log directory created')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('✓ Log directory exists')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Logging setup error: {str(e)}')
            )