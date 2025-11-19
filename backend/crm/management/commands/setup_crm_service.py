from django.core.management.base import BaseCommand
from authentication.models import Service


class Command(BaseCommand):
    help = 'Setup CRM service in the database'

    def handle(self, *args, **options):
        # Create or update CRM service
        service, created = Service.objects.get_or_create(
            service_type='crm',
            defaults={
                'name': 'Customer Relationship Management',
                'description': 'Comprehensive CRM system for managing leads, contacts, accounts, opportunities, and sales activities',
                'is_active': True,
                'base_price': 2999.00,
                'features': [
                    'Lead Management',
                    'Contact Management', 
                    'Account Management',
                    'Opportunity Pipeline',
                    'Activity Tracking',
                    'Campaign Management',
                    'Sales Forecasting',
                    'Dashboard & Analytics',
                    'Email Integration',
                    'Mobile Access'
                ]
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created CRM service: {service.name}')
            )
        else:
            # Update existing service
            service.name = 'Customer Relationship Management'
            service.description = 'Comprehensive CRM system for managing leads, contacts, accounts, opportunities, and sales activities'
            service.is_active = True
            service.base_price = 2999.00
            service.features = [
                'Lead Management',
                'Contact Management', 
                'Account Management',
                'Opportunity Pipeline',
                'Activity Tracking',
                'Campaign Management',
                'Sales Forecasting',
                'Dashboard & Analytics',
                'Email Integration',
                'Mobile Access'
            ]
            service.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated CRM service: {service.name}')
            )
        
        self.stdout.write(
            self.style.SUCCESS('CRM service setup completed!')
        )