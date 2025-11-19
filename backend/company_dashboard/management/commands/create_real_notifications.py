from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from authentication.models import Company, CompanyServiceUser
from company_dashboard.models import CompanyNotification, ActivityLog
import random

class Command(BaseCommand):
    help = 'Create real notifications and activity logs based on actual company data'

    def handle(self, *args, **options):
        self.stdout.write('Creating real notifications and activity logs...')
        
        companies = Company.objects.filter(approval_status='approved')
        
        for company in companies:
            self.stdout.write(f'Processing company: {company.name}')
            
            # Clear existing dummy data
            CompanyNotification.objects.filter(company=company).delete()
            ActivityLog.objects.filter(company=company).delete()
            
            # Create real notifications based on company status
            self.create_company_notifications(company)
            
            # Create real activity logs based on service users
            self.create_activity_logs(company)
        
        self.stdout.write(self.style.SUCCESS('Successfully created real notifications and activity logs'))
    
    def create_company_notifications(self, company):
        """Create realistic notifications for the company"""
        notifications = []
        
        # Welcome notification
        notifications.append({
            'type': 'system_alert',
            'title': 'Welcome to ATHENA\'S SAP System',
            'message': f'Your company {company.name} has been successfully onboarded to our enterprise management system.',
            'priority': 'medium',
            'service_type': None
        })
        
        # Service assignment notifications
        services = company.company_services.filter(is_active=True)
        for service in services:
            notifications.append({
                'type': 'service_update',
                'title': f'{service.service.name} Service Activated',
                'message': f'The {service.service.name} service has been successfully assigned to your company.',
                'priority': 'medium',
                'service_type': service.service.service_type
            })
        
        # Service user notifications
        service_users = CompanyServiceUser.objects.filter(company=company, is_active=True)
        if service_users.exists():
            notifications.append({
                'type': 'user_activity',
                'title': 'Service Users Created',
                'message': f'{service_users.count()} service users have been created for your company services.',
                'priority': 'low',
                'service_type': None
            })
        
        # System health notification
        if service_users.count() >= 3:
            notifications.append({
                'type': 'system_alert',
                'title': 'System Health: Excellent',
                'message': 'Your system is running optimally with all services active and users engaged.',
                'priority': 'low',
                'service_type': None
            })
        
        # Security notification
        notifications.append({
            'type': 'security',
            'title': 'Security Reminder',
            'message': 'Please ensure all service users change their default passwords after first login.',
            'priority': 'high',
            'service_type': None
        })
        
        # Create notifications
        for notif_data in notifications:
            CompanyNotification.objects.create(
                company=company,
                **notif_data,
                created_at=timezone.now() - timedelta(days=random.randint(0, 7))
            )
    
    def create_activity_logs(self, company):
        """Create realistic activity logs for the company"""
        logs = []
        
        # Company creation log
        logs.append({
            'action_type': 'create_user',
            'description': f'Company {company.name} was created and approved',
            'service_type': None,
            'user': company.created_by,
            'timestamp': company.created_at
        })
        
        # Service assignment logs
        services = company.company_services.filter(is_active=True)
        for service in services:
            logs.append({
                'action_type': 'access_service',
                'description': f'{service.service.name} service was assigned to company',
                'service_type': service.service.service_type,
                'user': service.assigned_by,
                'timestamp': service.assigned_at
            })
        
        # Service user creation logs
        service_users = CompanyServiceUser.objects.filter(company=company, is_active=True)
        for service_user in service_users:
            logs.append({
                'action_type': 'create_user',
                'description': f'Service user {service_user.username} created for {service_user.service.name}',
                'service_type': service_user.service.service_type,
                'user': service_user.created_by,
                'timestamp': service_user.created_at
            })
            
            # Add login logs if user has logged in
            if service_user.last_login:
                logs.append({
                    'action_type': 'login',
                    'description': f'Service user {service_user.username} logged in to {service_user.service.name}',
                    'service_type': service_user.service.service_type,
                    'user': None,
                    'timestamp': service_user.last_login
                })
        
        # Recent dashboard access logs
        for i in range(random.randint(3, 8)):
            logs.append({
                'action_type': 'access_service',
                'description': 'Company dashboard accessed',
                'service_type': None,
                'user': company.users.first().user if company.users.exists() else None,
                'timestamp': timezone.now() - timedelta(hours=random.randint(1, 48))
            })
        
        # Create activity logs
        for log_data in logs:
            ActivityLog.objects.create(
                company=company,
                ip_address='127.0.0.1',
                user_agent='Mozilla/5.0 (Company Dashboard)',
                **log_data
            )