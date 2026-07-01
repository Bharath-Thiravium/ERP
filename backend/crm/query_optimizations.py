"""
Database query optimizations for CRM module
"""
from django.db import models
from django.db.models import Prefetch, Q, Count, Sum, Avg
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger('crm_performance')

class CRMQueryOptimizer:
    """Query optimization utilities for CRM"""
    
    @staticmethod
    def get_optimized_leads_queryset(company):
        """Get optimized queryset for leads"""
        return company.leads.select_related(
            'assigned_to',
            'created_by'
        ).prefetch_related(
            'activities',
            'campaign_memberships__campaign'
        ).annotate(
            activities_count=Count('activities'),
            last_activity_date=models.Max('activities__created_at')
        )
    
    @staticmethod
    def get_optimized_opportunities_queryset(company):
        """Get optimized queryset for opportunities"""
        return company.opportunities.select_related(
            'account',
            'contact',
            'owner',
            'created_by'
        ).prefetch_related(
            'activities',
            'account__opportunities'
        ).annotate(
            activities_count=Count('activities'),
            account_total_value=Sum('account__opportunities__amount')
        )
    
    @staticmethod
    def get_optimized_accounts_queryset(company):
        """Get optimized queryset for accounts"""
        from .models import Opportunity
        return company.accounts.select_related(
            'primary_contact',
            'account_manager',
            'created_by'
        ).prefetch_related(
            Prefetch(
                'opportunities',
                queryset=Opportunity.objects.select_related('owner')
            ),
            'contacts',
            'activities'
        ).annotate(
            opportunities_count=Count('opportunities'),
            total_opportunity_value=Sum('opportunities__amount'),
            contacts_count=Count('contacts'),
            activities_count=Count('activities')
        )
    
    @staticmethod
    def get_optimized_contacts_queryset(company):
        """Get optimized queryset for contacts"""
        return company.contacts.select_related(
            'created_by'
        ).prefetch_related(
            'opportunities',
            'activities',
            'primary_accounts'
        ).annotate(
            opportunities_count=Count('opportunities'),
            activities_count=Count('activities')
        )
    
    @staticmethod
    def get_dashboard_stats_optimized(company):
        """Get dashboard statistics with optimized queries"""
        cache_key = f"crm_dashboard_stats_{company.id}"
        cached_stats = cache.get(cache_key)
        
        if cached_stats:
            return cached_stats
        
        # Use single queries with aggregation
        today = timezone.now().date()
        
        # Get all counts in single queries
        leads_stats = company.leads.aggregate(
            total=Count('id'),
            new=Count('id', filter=Q(status='new')),
            qualified=Count('id', filter=Q(status='qualified')),
            won=Count('id', filter=Q(status='won'))
        )
        
        opportunities_stats = company.opportunities.aggregate(
            total=Count('id'),
            pipeline_value=Sum('amount', filter=Q(stage__in=[
                'prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation'
            ])),
            won_count=Count('id', filter=Q(stage='closed_won')),
            avg_deal_size=Avg('amount')
        )
        
        activities_stats = company.activities.aggregate(
            today=Count('id', filter=Q(due_date__date=today)),
            overdue=Count('id', filter=Q(
                due_date__lt=timezone.now(),
                status__in=['planned', 'in_progress']
            ))
        )
        
        stats = {
            'total_leads': leads_stats['total'] or 0,
            'new_leads': leads_stats['new'] or 0,
            'qualified_leads': leads_stats['qualified'] or 0,
            'won_leads': leads_stats['won'] or 0,
            'total_opportunities': opportunities_stats['total'] or 0,
            'pipeline_value': opportunities_stats['pipeline_value'] or 0,
            'won_opportunities': opportunities_stats['won_count'] or 0,
            'avg_deal_size': opportunities_stats['avg_deal_size'] or 0,
            'total_accounts': company.accounts.count(),
            'total_contacts': company.contacts.count(),
            'activities_today': activities_stats['today'] or 0,
            'overdue_activities': activities_stats['overdue'] or 0,
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, stats, 300)
        return stats
    
    @staticmethod
    def get_sales_funnel_optimized(company):
        """Get sales funnel data with optimized queries"""
        cache_key = f"crm_sales_funnel_{company.id}"
        cached_funnel = cache.get(cache_key)
        
        if cached_funnel:
            return cached_funnel
        
        # Single query for lead stats
        lead_stats = list(company.leads.values('status').annotate(
            count=Count('id')
        ).order_by('status'))
        
        # Single query for opportunity stats
        opp_stats = list(company.opportunities.values('stage').annotate(
            count=Count('id'),
            total_value=Sum('amount')
        ).order_by('stage'))
        
        funnel_data = []
        
        # Process lead stats
        for stat in lead_stats:
            funnel_data.append({
                'stage': f"Leads - {stat['status'].title()}",
                'count': stat['count'],
                'value': 0,
                'type': 'lead'
            })
        
        # Process opportunity stats
        for stat in opp_stats:
            funnel_data.append({
                'stage': f"Opportunities - {stat['stage'].replace('_', ' ').title()}",
                'count': stat['count'],
                'value': stat['total_value'] or 0,
                'type': 'opportunity'
            })
        
        # Cache for 10 minutes
        cache.set(cache_key, funnel_data, 600)
        return funnel_data

class CRMCacheManager:
    """Cache management for CRM data"""
    
    CACHE_TIMEOUTS = {
        'dashboard_stats': 300,      # 5 minutes
        'sales_funnel': 600,         # 10 minutes
        'lead_scores': 1800,         # 30 minutes
        'customer_health': 3600,     # 1 hour
        'analytics_data': 7200,      # 2 hours
    }
    
    @classmethod
    def get_cache_key(cls, data_type, company_id, **kwargs):
        """Generate cache key"""
        key_parts = [f"crm_{data_type}", str(company_id)]
        for k, v in kwargs.items():
            key_parts.append(f"{k}_{v}")
        return "_".join(key_parts)
    
    @classmethod
    def get_cached_data(cls, data_type, company_id, **kwargs):
        """Get cached data"""
        cache_key = cls.get_cache_key(data_type, company_id, **kwargs)
        return cache.get(cache_key)
    
    @classmethod
    def set_cached_data(cls, data_type, company_id, data, **kwargs):
        """Set cached data"""
        cache_key = cls.get_cache_key(data_type, company_id, **kwargs)
        timeout = cls.CACHE_TIMEOUTS.get(data_type, 300)
        cache.set(cache_key, data, timeout)
    
    @classmethod
    def invalidate_cache(cls, data_type, company_id, **kwargs):
        """Invalidate cached data"""
        cache_key = cls.get_cache_key(data_type, company_id, **kwargs)
        cache.delete(cache_key)
    
    @classmethod
    def invalidate_company_cache(cls, company_id):
        """Invalidate all cache for a company"""
        # This would require a more sophisticated cache backend
        # For now, we'll invalidate known cache types
        for data_type in cls.CACHE_TIMEOUTS.keys():
            cache_key = cls.get_cache_key(data_type, company_id)
            cache.delete(cache_key)

class DatabaseIndexOptimizer:
    """Database index optimization suggestions"""
    
    RECOMMENDED_INDEXES = [
        # Lead indexes
        ('crm_lead', ['company_id', 'status']),
        ('crm_lead', ['company_id', 'created_at']),
        ('crm_lead', ['company_id', 'assigned_to_id']),
        ('crm_lead', ['email']),
        
        # Opportunity indexes
        ('crm_opportunity', ['company_id', 'stage']),
        ('crm_opportunity', ['company_id', 'created_at']),
        ('crm_opportunity', ['company_id', 'owner_id']),
        ('crm_opportunity', ['account_id', 'stage']),
        
        # Account indexes
        ('crm_account', ['company_id', 'account_type']),
        ('crm_account', ['company_id', 'is_active']),
        ('crm_account', ['company_id', 'created_at']),
        
        # Contact indexes
        ('crm_contact', ['company_id', 'is_active']),
        ('crm_contact', ['company_id', 'created_at']),
        ('crm_contact', ['email']),
        
        # Activity indexes
        ('crm_activity', ['company_id', 'due_date']),
        ('crm_activity', ['company_id', 'status']),
        ('crm_activity', ['assigned_to_id', 'status']),
        
        # Campaign indexes
        ('crm_campaign', ['company_id', 'status']),
        ('crm_campaign', ['company_id', 'campaign_type']),
    ]
    
    @classmethod
    def generate_index_sql(cls):
        """Generate SQL for creating recommended indexes"""
        sql_statements = []
        
        for table, columns in cls.RECOMMENDED_INDEXES:
            index_name = f"idx_{table}_{'_'.join(columns)}"
            columns_str = ', '.join(columns)
            sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table} ({columns_str});"
            sql_statements.append(sql)
        
        return sql_statements

# Performance monitoring
class CRMPerformanceMonitor:
    """Monitor CRM performance metrics"""
    
    @staticmethod
    def log_slow_query(query_time, query_type, company_id):
        """Log slow queries for analysis"""
        if query_time > 1.0:  # Log queries taking more than 1 second
            logger.warning(f"Slow CRM query detected", extra={
                'query_time': query_time,
                'query_type': query_type,
                'company_id': company_id
            })
    
    @staticmethod
    def get_performance_stats():
        """Get performance statistics"""
        # This would integrate with monitoring tools
        return {
            'avg_response_time': 0.5,
            'slow_queries_count': 0,
            'cache_hit_rate': 0.85
        }