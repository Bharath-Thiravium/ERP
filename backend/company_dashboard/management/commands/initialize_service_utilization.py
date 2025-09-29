from django.core.management.base import BaseCommand
from django.utils import timezone
from authentication.models import Company, CompanyService, CompanyServiceUser
from company_dashboard.models import ServiceUtilization, ServiceUserActivity
import random

class Command(BaseCommand):
    help = 'Initialize ServiceUtilization data for existing companies'

    def handle(self, *args, **options):
        self.stdout.write('Initializing ServiceUtilization data...')
        
        companies = Company.objects.filter(is_approved=True, is_active=True)
        
        for company in companies:
            self.stdout.write(f'Processing company: {company.name}')
            
            # Get company services
            company_services = CompanyService.objects.filter(company=company, is_active=True)
            
            for company_service in company_services:
                service = company_service.service
                
                # Get or create ServiceUtilization
                utilization, created = ServiceUtilization.objects.get_or_create(
                    company=company,
                    service=service,
                    defaults={
                        'total_users': 0,
                        'active_users': 0,
                        'usage_percentage': 0.0,
                        'data_volume': 0,
                        'last_activity': timezone.now()
                    }
                )
                
                # Count actual service users for this service
                service_users = CompanyServiceUser.objects.filter(
                    company=company,
                    service_type=service.service_type,
                    is_active=True
                )
                
                total_users = service_users.count()
                active_users = service_users.filter(last_login__isnull=False).count()
                
                # Calculate usage percentage
                if total_users > 0:
                    usage_percentage = (active_users / total_users) * 100
                else:
                    usage_percentage = 0
                
                # Generate realistic data volume based on service type
                data_volume = self.generate_data_volume(service.service_type, total_users)
                
                # Update utilization
                utilization.total_users = total_users
                utilization.active_users = active_users
                utilization.usage_percentage = usage_percentage
                utilization.data_volume = data_volume
                utilization.last_activity = timezone.now()
                utilization.save()
                
                # Create ServiceUserActivity records for service users
                for service_user in service_users:
                    activity, created = ServiceUserActivity.objects.get_or_create(
                        service_user=service_user,
                        service_type=service.service_type,
                        defaults={
                            'last_login': service_user.last_login,
                            'total_sessions': random.randint(1, 50),
                            'actions_performed': random.randint(10, 500),
                            'status': 'active' if service_user.last_login else 'inactive'
                        }
                    )
                
                action = 'Created' if created else 'Updated'
                self.stdout.write(f'  {action} utilization for {service.name}: {total_users} users, {usage_percentage:.1f}% usage')
        
        self.stdout.write(self.style.SUCCESS('Successfully initialized ServiceUtilization data'))
    
    def generate_data_volume(self, service_type, user_count):
        """Generate realistic data volume based on service type and user count"""
        base_multiplier = {
            'finance': 1000,
            'hr': 500,
            'inventory': 2000,
            'orders': 1500,
            'analytics': 300,
            'crm': 800,
            'procurement': 600,
            'manufacturing': 1200,
            'quality': 400,
            'maintenance': 350
        }
        
        multiplier = base_multiplier.get(service_type.lower(), 500)
        return user_count * multiplier * random.randint(1, 10)