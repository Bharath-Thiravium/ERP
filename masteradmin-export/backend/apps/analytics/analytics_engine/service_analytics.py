from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from authentication.models import Company, Service, CompanyServiceUser
from finance.models import Invoice, Payment
from hr.models import Employee
from inventory.models import Product, StockMovement

class ServiceAnalytics:
    @staticmethod
    def get_service_adoption_rates():
        """Get service adoption rates across companies"""
        services = Service.objects.all()
        adoption_data = []
        
        total_companies = Company.objects.filter(approval_status='approved').count()
        
        for service in services:
            companies_using = Company.objects.filter(
                company_services__service=service,
                approval_status='approved'
            ).count()
            
            adoption_rate = (companies_using / total_companies * 100) if total_companies > 0 else 0
            
            adoption_data.append({
                'service_id': service.id,
                'service_name': service.name,
                'companies_using': companies_using,
                'adoption_rate': round(adoption_rate, 2)
            })
        
        return adoption_data
    
    @staticmethod
    def get_service_performance_metrics():
        """Get performance metrics for each service"""
        metrics = {}
        
        # Finance Service Metrics
        finance_companies = Company.objects.filter(
            company_services__service__name='Finance',
            approval_status='approved'
        ).count()
        
        metrics['finance'] = {
            'active_companies': finance_companies,
            'total_invoices': Invoice.objects.count(),
            'total_payments': Payment.objects.count(),
            'success_rate': Payment.objects.filter(status='completed').count()
        }
        
        # HR Service Metrics
        hr_companies = Company.objects.filter(
            company_services__service__name='HR',
            approval_status='approved'
        ).count()
        
        metrics['hr'] = {
            'active_companies': hr_companies,
            'total_employees': Employee.objects.count(),
            'avg_employees_per_company': Employee.objects.count() / hr_companies if hr_companies > 0 else 0
        }
        
        # Inventory Service Metrics
        inventory_companies = Company.objects.filter(
            company_services__service__name='Inventory',
            approval_status='approved'
        ).count()
        
        metrics['inventory'] = {
            'active_companies': inventory_companies,
            'total_products': Product.objects.count(),
            'total_movements': StockMovement.objects.count(),
            'avg_products_per_company': Product.objects.count() / inventory_companies if inventory_companies > 0 else 0
        }
        
        return metrics
    
    @staticmethod
    def get_service_usage_trends(days=30):
        """Get service usage trends over time"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        trends = {}
        services = Service.objects.all()
        
        for service in services:
            daily_usage = []
            
            for i in range(days):
                day = start_date + timedelta(days=i)
                day_end = day + timedelta(days=1)
                
                # Count active users for this service on this day
                active_users = CompanyServiceUser.objects.filter(
                    service=service,
                    last_login__gte=day,
                    last_login__lt=day_end
                ).count()
                
                daily_usage.append({
                    'date': day.strftime('%Y-%m-%d'),
                    'active_users': active_users
                })
            
            trends[service.name.lower()] = daily_usage
        
        return trends
    
    @staticmethod
    def get_service_revenue_contribution():
        """Get revenue contribution by service"""
        services = Service.objects.all()
        revenue_data = []
        
        for service in services:
            # Get companies using this service
            companies_with_service = Company.objects.filter(
                company_services__service=service,
                approval_status='approved'
            )
            
            # Calculate revenue from these companies (if Payment model has company field)
            try:
                service_revenue = Payment.objects.filter(
                    status='completed'
                ).aggregate(total=Sum('amount'))['total'] or 0
            except:
                service_revenue = 0
            
            revenue_data.append({
                'service_name': service.name,
                'revenue': float(service_revenue),
                'companies_count': companies_with_service.count()
            })
        
        return revenue_data