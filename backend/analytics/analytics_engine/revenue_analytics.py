from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta, datetime
from finance.models import Invoice, Payment
from authentication.models import Company

class RevenueAnalytics:
    @staticmethod
    def get_total_revenue():
        """Get total revenue across all companies"""
        return Payment.objects.filter(status='completed').aggregate(
            total=Sum('amount')
        )['total'] or 0
    
    @staticmethod
    def get_revenue_by_company():
        """Get revenue breakdown by company"""
        companies = Company.objects.filter(approval_status='approved')
        revenue_data = []
        
        for company in companies:
            revenue = Payment.objects.filter(
                company=company, 
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            revenue_data.append({
                'company_id': company.id,
                'company_name': company.name,
                'revenue': float(revenue)
            })
        
        return revenue_data
    
    @staticmethod
    def get_monthly_revenue_trend(months=12):
        """Get monthly revenue trend"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)
        
        monthly_data = []
        for i in range(months):
            month_start = start_date + timedelta(days=i * 30)
            month_end = month_start + timedelta(days=30)
            
            revenue = Payment.objects.filter(
                status='completed',
                created_at__gte=month_start,
                created_at__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_data.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': float(revenue)
            })
        
        return monthly_data
    
    @staticmethod
    def get_payment_status_breakdown():
        """Get payment status analytics"""
        return {
            'completed': Payment.objects.filter(status='completed').count(),
            'pending': Payment.objects.filter(status='pending').count(),
            'failed': Payment.objects.filter(status='failed').count(),
            'total_invoices': Invoice.objects.count()
        }