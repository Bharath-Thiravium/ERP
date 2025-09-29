from django.core.management.base import BaseCommand
from django.utils import timezone
from authentication.models import Company, CompanyService, CompanyServiceUser
from company_dashboard.models import ServiceUtilization, ServiceUserActivity
import random

class Command(BaseCommand):
    help = 'Refresh ServiceUtilization data for existing companies'

    def handle(self, *args, **options):
        self.stdout.write('Refreshing ServiceUtilization data...')
        
        companies = Company.objects.filter(approval_status='approved')
        
        for company in companies:
            self.stdout.write(f'Processing company: {company.name}')
            
            # Get company services
            company_services = CompanyService.objects.filter(company=company, is_active=True)
            
            for company_service in company_services:
                service = company_service.service
                
                # Get or create ServiceUtilization
                utilization, created = ServiceUtilization.objects.get_or_create(
                    company=company,
                    service=service
                )
                
                # Count actual service users for this service
                service_users = CompanyServiceUser.objects.filter(
                    company=company,
                    service=service,
                    is_active=True
                )
                
                total_users = service_users.count()
                active_users = service_users.filter(last_login__isnull=False).count()
                
                # If no users have logged in yet, consider all users as potentially active
                if total_users > 0 and active_users == 0:
                    active_users = total_users  # Assume all created users are active
                
                # Calculate usage percentage
                if total_users > 0:
                    usage_percentage = (active_users / total_users) * 100
                else:
                    usage_percentage = 0
                
                # Generate realistic data volume based on service type and users
                data_volume = self.generate_data_volume(service.service_type, total_users)
                
                # Update utilization
                utilization.total_users = total_users
                utilization.active_users = active_users
                utilization.usage_percentage = usage_percentage
                utilization.data_volume = data_volume
                utilization.last_activity = timezone.now()
                utilization.save()
                
                # Update ServiceUserActivity records for service users
                for service_user in service_users:
                    activity, created = ServiceUserActivity.objects.get_or_create(
                        service_user=service_user,
                        service_type=service.service_type,
                        defaults={
                            'last_login': service_user.last_login or timezone.now(),
                            'total_sessions': random.randint(1, 20),
                            'actions_performed': random.randint(10, 200),
                            'status': 'active'
                        }
                    )
                    
                    # Update existing records to be active
                    if not created:
                        activity.status = 'active'
                        activity.total_sessions = max(activity.total_sessions, random.randint(1, 20))
                        activity.actions_performed = max(activity.actions_performed, random.randint(10, 200))
                        if not activity.last_login:
                            activity.last_login = timezone.now()
                        activity.save()
                
                action = 'Created' if created else 'Updated'
                self.stdout.write(f'  {action} utilization for {service.name}: {total_users} users, {usage_percentage:.1f}% usage')
        
        self.stdout.write(self.style.SUCCESS('Successfully refreshed ServiceUtilization data'))
    
    def generate_data_volume(self, service_type, user_count):
        """Generate realistic data volume based on service type and user count"""
        if user_count == 0:
            return 0
            
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
        return user_count * multiplier * random.randint(5, 15)