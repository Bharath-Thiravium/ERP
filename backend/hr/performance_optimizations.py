"""
Performance optimizations for HR compliance system
"""
from django.db import models
from django.core.cache import cache
from functools import wraps
import hashlib


def cache_compliance_data(timeout=300):
    """Cache compliance data for performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"compliance_{func.__name__}_{hashlib.md5(str(args).encode()).hexdigest()}"
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            return result
        return wrapper
    return decorator


class OptimizedQueries:
    """Optimized database queries for compliance system"""
    
    @staticmethod
    def get_employees_with_statutory_details(company):
        """Get employees with statutory details in single query"""
        return company.employees.select_related(
            'statutory_details'
        ).prefetch_related(
            'payslips__statutory_details'
        ).filter(status='active')
    
    @staticmethod
    def get_compliance_summary(company):
        """Get compliance summary with optimized queries"""
        from .statutory_models import StatutorySettings, ComplianceAlert, GovernmentReturn
        
        # Use select_related and prefetch_related for efficiency
        statutory_settings = StatutorySettings.objects.select_related('company').filter(
            company=company
        ).first()
        
        # Get alert counts in single query
        alert_counts = ComplianceAlert.objects.filter(
            company=company
        ).aggregate(
            total_alerts=models.Count('id'),
            critical_alerts=models.Count('id', filter=models.Q(priority='critical')),
            unresolved_alerts=models.Count('id', filter=models.Q(is_resolved=False))
        )
        
        # Get return status counts
        return_counts = GovernmentReturn.objects.filter(
            company=company
        ).aggregate(
            total_returns=models.Count('id'),
            pending_returns=models.Count('id', filter=models.Q(status='pending')),
            overdue_returns=models.Count('id', filter=models.Q(status='overdue'))
        )
        
        return {
            'statutory_settings': statutory_settings,
            'alert_counts': alert_counts,
            'return_counts': return_counts
        }
    
    @staticmethod
    def bulk_create_payslip_details(payslip_details_list):
        """Bulk create payslip statutory details for performance"""
        from .statutory_models import PayslipStatutoryDetails
        
        try:
            PayslipStatutoryDetails.objects.bulk_create(
                payslip_details_list,
                ignore_conflicts=True,
                batch_size=100
            )
        except Exception as e:
            # Fallback to individual creation if bulk fails
            for detail in payslip_details_list:
                try:
                    detail.save()
                except Exception:
                    continue


class ComplianceIndexes:
    """Database indexes for compliance performance"""
    
    @staticmethod
    def get_recommended_indexes():
        """Get recommended database indexes for compliance tables"""
        return [
            # StatutorySettings indexes
            "CREATE INDEX IF NOT EXISTS idx_statutory_settings_company ON hr_statutorysettings(company_id);",
            
            # ComplianceAlert indexes
            "CREATE INDEX IF NOT EXISTS idx_compliance_alert_company_status ON hr_compliancealert(company_id, is_resolved);",
            "CREATE INDEX IF NOT EXISTS idx_compliance_alert_priority ON hr_compliancealert(priority, created_at);",
            
            # GovernmentReturn indexes
            "CREATE INDEX IF NOT EXISTS idx_government_return_company_type ON hr_governmentreturn(company_id, return_type);",
            "CREATE INDEX IF NOT EXISTS idx_government_return_status_date ON hr_governmentreturn(status, due_date);",
            
            # PayslipStatutoryDetails indexes
            "CREATE INDEX IF NOT EXISTS idx_payslip_statutory_payslip ON hr_payslipstatutorydetails(payslip_id);",
            
            # EmployeeStatutoryDetails indexes
            "CREATE INDEX IF NOT EXISTS idx_employee_statutory_employee ON hr_employeestatutorydetails(employee_id);",
        ]


def optimize_compliance_queries():
    """Apply performance optimizations to compliance queries"""
    from django.db import connection
    
    indexes = ComplianceIndexes.get_recommended_indexes()
    
    with connection.cursor() as cursor:
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
            except Exception as e:
                print(f"Failed to create index: {e}")