from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from authentication.models import Company, CompanyServiceUser
from hr.models import Employee

class UserAnalytics:
    @staticmethod
    def get_user_overview():
        """Get overall user statistics"""
        return {
            'total_companies': Company.objects.filter(approval_status='approved').count(),
            'total_service_users': CompanyServiceUser.objects.count(),
            'total_employees': Employee.objects.count(),
            'active_users_24h': User.objects.filter(
                last_login__gte=timezone.now() - timedelta(hours=24)
            ).count()
        }
    
    @staticmethod
    def get_company_user_breakdown():
        """Get user count per company"""
        companies = Company.objects.filter(approval_status='approved')
        user_data = []
        
        for company in companies:
            service_users = CompanyServiceUser.objects.filter(company=company).count()
            employees = Employee.objects.filter(company=company).count()
            
            user_data.append({
                'company_id': company.id,
                'company_name': company.name,
                'service_users': service_users,
                'employees': employees,
                'total_users': service_users + employees
            })
        
        return user_data
    
    @staticmethod
    def get_user_activity_trend(days=30):
        """Get daily user activity trend"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        activity_data = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            day_end = day + timedelta(days=1)
            
            active_users = User.objects.filter(
                last_login__gte=day,
                last_login__lt=day_end
            ).count()
            
            activity_data.append({
                'date': day.strftime('%Y-%m-%d'),
                'active_users': active_users
            })
        
        return activity_data
    
    @staticmethod
    def get_service_usage_by_company():
        """Get service usage statistics per company"""
        companies = Company.objects.filter(approval_status='approved')
        usage_data = []
        
        for company in companies:
            services = [cs.service for cs in company.company_services.all()]
            service_list = []
            
            for service in services:
                service_users = CompanyServiceUser.objects.filter(
                    company=company
                ).count()
                
                service_list.append({
                    'service_name': service.name,
                    'users_count': service_users
                })
            
            usage_data.append({
                'company_id': company.id,
                'company_name': company.name,
                'services': service_list
            })
        
        return usage_data