from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from authentication.models import Company, CompanyServiceUser
from finance.models import Payment
from hr.models import Employee

class GrowthAnalytics:
    @staticmethod
    def get_company_growth_trend(months=12):
        """Get company registration growth trend"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)
        
        growth_data = []
        cumulative_count = 0
        
        for i in range(months):
            month_start = start_date + timedelta(days=i * 30)
            month_end = month_start + timedelta(days=30)
            
            new_companies = Company.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end,
                approval_status='approved'
            ).count()
            
            cumulative_count += new_companies
            
            growth_data.append({
                'month': month_start.strftime('%Y-%m'),
                'new_companies': new_companies,
                'total_companies': cumulative_count
            })
        
        return growth_data
    
    @staticmethod
    def get_revenue_growth_trend(months=12):
        """Get revenue growth trend"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)
        
        revenue_growth = []
        
        for i in range(months):
            month_start = start_date + timedelta(days=i * 30)
            month_end = month_start + timedelta(days=30)
            
            monthly_revenue = Payment.objects.filter(
                status='completed',
                created_at__gte=month_start,
                created_at__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            revenue_growth.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': float(monthly_revenue)
            })
        
        return revenue_growth
    
    @staticmethod
    def get_user_growth_trend(months=12):
        """Get user growth trend"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)
        
        user_growth = []
        
        for i in range(months):
            month_start = start_date + timedelta(days=i * 30)
            month_end = month_start + timedelta(days=30)
            
            new_service_users = CompanyServiceUser.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            ).count()
            
            new_employees = Employee.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            ).count()
            
            user_growth.append({
                'month': month_start.strftime('%Y-%m'),
                'service_users': new_service_users,
                'employees': new_employees,
                'total_new_users': new_service_users + new_employees
            })
        
        return user_growth
    
    @staticmethod
    def get_growth_kpis():
        """Get key growth performance indicators"""
        now = timezone.now()
        last_month = now - timedelta(days=30)
        last_week = now - timedelta(days=7)
        
        # Current month vs last month
        current_month_companies = Company.objects.filter(
            created_at__gte=last_month,
            approval_status='approved'
        ).count()
        
        previous_month_companies = Company.objects.filter(
            created_at__gte=last_month - timedelta(days=30),
            created_at__lt=last_month,
            approval_status='approved'
        ).count()
        
        company_growth_rate = ((current_month_companies - previous_month_companies) / 
                              previous_month_companies * 100) if previous_month_companies > 0 else 0
        
        # Revenue growth
        current_revenue = Payment.objects.filter(
            status='completed',
            created_at__gte=last_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        previous_revenue = Payment.objects.filter(
            status='completed',
            created_at__gte=last_month - timedelta(days=30),
            created_at__lt=last_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        revenue_growth_rate = ((current_revenue - previous_revenue) / 
                              previous_revenue * 100) if previous_revenue > 0 else 0
        
        return {
            'company_growth_rate': round(company_growth_rate, 2),
            'revenue_growth_rate': round(revenue_growth_rate, 2),
            'new_companies_this_month': current_month_companies,
            'new_companies_last_month': previous_month_companies,
            'revenue_this_month': float(current_revenue),
            'revenue_last_month': float(previous_revenue)
        }