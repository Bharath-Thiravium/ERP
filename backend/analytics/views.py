import psutil
import time
from datetime import datetime, timedelta
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Avg
from django.utils import timezone

from .models import SystemMetrics, ServiceHealth, APIMetrics, SystemAlert
from finance.models import Invoice, Payment
from hr.models import Employee, Attendance
from inventory.models import Product, StockMovement

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_overview(request):
    """Get system overview metrics"""
    
    # Get current system metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Count active users (logged in last 24 hours)
    active_users = User.objects.filter(
        last_login__gte=timezone.now() - timedelta(hours=24)
    ).count()
    
    # Database connections
    db_connections = len(connection.queries)
    
    # Save current metrics
    SystemMetrics.objects.create(
        cpu_usage=cpu_percent,
        memory_usage=memory.percent,
        disk_usage=(disk.used / disk.total) * 100,
        active_users=active_users,
        database_connections=db_connections
    )
    
    # Get service health
    services = ServiceHealth.objects.all()
    
    return Response({
        'system_metrics': {
            'cpu_usage': cpu_percent,
            'memory_usage': memory.percent,
            'disk_usage': (disk.used / disk.total) * 100,
            'active_users': active_users,
            'database_connections': db_connections,
            'uptime': get_system_uptime()
        },
        'services': [{
            'name': service.service_name,
            'status': service.status,
            'response_time': service.response_time,
            'uptime_percentage': service.uptime_percentage,
            'last_check': service.last_check
        } for service in services],
        'alerts_count': SystemAlert.objects.filter(is_resolved=False).count()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_metrics(request):
    """Get detailed service metrics per company"""
    from authentication.models import Company
    
    companies_data = []
    
    # Get all companies
    companies = Company.objects.filter(approval_status='approved')
    
    for company in companies:
        # Finance service metrics for this company
        finance_data = {
            'total_invoices': Invoice.objects.filter(company=company).count(),
            'pending_payments': Payment.objects.filter(company=company, status='pending').count(),
            'total_revenue': sum(p.amount for p in Payment.objects.filter(company=company, status='completed')),
            'recent_transactions': Payment.objects.filter(
                company=company,
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count()
        }
        
        # HR service metrics for this company
        hr_data = {
            'total_employees': Employee.objects.filter(company=company).count(),
            'present_today': Attendance.objects.filter(
                employee__company=company,
                date=timezone.now().date(),
                status='present'
            ).count(),
            'on_leave': Employee.objects.filter(company=company, status='on_leave').count(),
            'recent_hires': Employee.objects.filter(
                company=company,
                date_of_joining__gte=timezone.now() - timedelta(days=30)
            ).count()
        }
        
        # Inventory service metrics for this company
        low_stock_products = 0
        out_of_stock_products = 0
        
        for product in Product.objects.filter(company=company):
            current_stock = product.current_stock
            if current_stock <= product.min_stock_level and product.min_stock_level > 0:
                low_stock_products += 1
            if current_stock == 0:
                out_of_stock_products += 1
        
        inventory_data = {
            'total_products': Product.objects.filter(company=company).count(),
            'low_stock_items': low_stock_products,
            'out_of_stock': out_of_stock_products,
            'recent_movements': StockMovement.objects.filter(
                product__company=company,
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count()
        }
        
        companies_data.append({
            'company_id': company.id,
            'company_name': company.name,
            'finance': finance_data,
            'hr': hr_data,
            'inventory': inventory_data
        })
    
    # Also provide totals across all companies
    total_finance = {
        'total_invoices': sum(c['finance']['total_invoices'] for c in companies_data),
        'pending_payments': sum(c['finance']['pending_payments'] for c in companies_data),
        'total_revenue': sum(c['finance']['total_revenue'] for c in companies_data),
        'recent_transactions': sum(c['finance']['recent_transactions'] for c in companies_data)
    }
    
    total_hr = {
        'total_employees': sum(c['hr']['total_employees'] for c in companies_data),
        'present_today': sum(c['hr']['present_today'] for c in companies_data),
        'on_leave': sum(c['hr']['on_leave'] for c in companies_data),
        'recent_hires': sum(c['hr']['recent_hires'] for c in companies_data)
    }
    
    total_inventory = {
        'total_products': sum(c['inventory']['total_products'] for c in companies_data),
        'low_stock_items': sum(c['inventory']['low_stock_items'] for c in companies_data),
        'out_of_stock': sum(c['inventory']['out_of_stock'] for c in companies_data),
        'recent_movements': sum(c['inventory']['recent_movements'] for c in companies_data)
    }
    
    return Response({
        'companies': companies_data,
        'totals': {
            'finance': total_finance,
            'hr': total_hr,
            'inventory': total_inventory
        },
        'timestamp': timezone.now()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def performance_metrics(request):
    """Get performance metrics over time"""
    
    # Get metrics from last 24 hours
    metrics = SystemMetrics.objects.filter(
        timestamp__gte=timezone.now() - timedelta(hours=24)
    ).order_by('timestamp')
    
    # API performance
    api_metrics = APIMetrics.objects.filter(
        timestamp__gte=timezone.now() - timedelta(hours=24)
    ).values('endpoint').annotate(
        avg_response_time=Avg('response_time'),
        request_count=Count('id')
    )
    
    return Response({
        'system_metrics': [{
            'timestamp': metric.timestamp,
            'cpu_usage': metric.cpu_usage,
            'memory_usage': metric.memory_usage,
            'disk_usage': metric.disk_usage,
            'active_users': metric.active_users
        } for metric in metrics],
        'api_performance': list(api_metrics),
        'service_health': [{
            'service': service.service_name,
            'status': service.status,
            'response_time': service.response_time,
            'uptime': service.uptime_percentage
        } for service in ServiceHealth.objects.all()]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_alerts(request):
    """Get system alerts"""
    
    alerts = SystemAlert.objects.filter(is_resolved=False).order_by('-created_at')
    
    return Response({
        'alerts': [{
            'id': alert.id,
            'type': alert.alert_type,
            'severity': alert.severity,
            'title': alert.title,
            'message': alert.message,
            'created_at': alert.created_at,
            'metadata': alert.metadata
        } for alert in alerts]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_alert(request, alert_id):
    """Resolve a system alert"""
    
    try:
        alert = SystemAlert.objects.get(id=alert_id)
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        
        return Response({'message': 'Alert resolved successfully'})
    except SystemAlert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=404)

def get_system_uptime():
    """Get system uptime in seconds"""
    try:
        return time.time() - psutil.boot_time()
    except:
        return 0

def check_service_health():
    """Background task to check service health"""
    services = ['finance', 'hr', 'inventory', 'authentication', 'database']
    
    for service_name in services:
        try:
            start_time = time.time()
            
            # Simple health check based on service
            if service_name == 'finance':
                Invoice.objects.count()
            elif service_name == 'hr':
                Employee.objects.count()
            elif service_name == 'inventory':
                Product.objects.count()
            elif service_name == 'authentication':
                User.objects.count()
            elif service_name == 'database':
                connection.cursor().execute('SELECT 1')
            
            response_time = (time.time() - start_time) * 1000
            
            # Update or create service health record
            service_health, created = ServiceHealth.objects.get_or_create(
                service_name=service_name,
                defaults={
                    'status': 'healthy',
                    'response_time': response_time,
                    'uptime_percentage': 100.0
                }
            )
            
            if not created:
                service_health.status = 'healthy' if response_time < 1000 else 'warning'
                service_health.response_time = response_time
                service_health.save()
                
        except Exception as e:
            # Mark service as down
            ServiceHealth.objects.update_or_create(
                service_name=service_name,
                defaults={
                    'status': 'critical',
                    'response_time': 0,
                    'error_message': str(e)
                }
            )