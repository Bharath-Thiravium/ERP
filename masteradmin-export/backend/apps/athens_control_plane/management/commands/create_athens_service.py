from django.core.management.base import BaseCommand
from authentication.models import Service


class Command(BaseCommand):
    help = 'Create Athens Sustainability service in the database'

    def handle(self, *args, **options):
        service, created = Service.objects.get_or_create(
            service_type='athens_sustainability',
            defaults={
                'name': 'Athens Sustainability',
                'description': 'Comprehensive sustainability management platform for ESG, environmental compliance, and green finance',
                'is_active': True,
                'base_price': 999.00,
                'features': [
                    'ESG Reporting',
                    'Environmental Compliance',
                    'Carbon Footprint Tracking',
                    'Energy Management',
                    'Waste Management',
                    'Water Usage Monitoring',
                    'Sustainability Metrics',
                    'Green Finance Tools',
                    'Compliance Dashboard',
                    'Automated Reporting'
                ]
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created Athens Sustainability service')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Athens Sustainability service already exists')
            )