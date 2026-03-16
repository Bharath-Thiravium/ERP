from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from ..analytics_engine.revenue_analytics import RevenueAnalytics
from ..analytics_engine.user_analytics import UserAnalytics
from ..analytics_engine.service_analytics import ServiceAnalytics
from ..analytics_engine.growth_analytics import GrowthAnalytics

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_overview(request):
    """Get analytics overview dashboard data"""
    
    # Revenue overview
    total_revenue = RevenueAnalytics.get_total_revenue()
    payment_breakdown = RevenueAnalytics.get_payment_status_breakdown()
    
    # User overview
    user_stats = UserAnalytics.get_user_overview()
    
    # Service overview
    service_adoption = ServiceAnalytics.get_service_adoption_rates()
    
    # Growth KPIs
    growth_kpis = GrowthAnalytics.get_growth_kpis()
    
    return Response({
        'revenue': {
            'total_revenue': total_revenue,
            'payment_breakdown': payment_breakdown
        },
        'users': user_stats,
        'services': {
            'adoption_rates': service_adoption[:3]  # Top 3 services
        },
        'growth': growth_kpis,
        'timestamp': timezone.now()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def revenue_analytics(request):
    """Get detailed revenue analytics"""
    
    months = int(request.GET.get('months', 12))
    
    return Response({
        'total_revenue': RevenueAnalytics.get_total_revenue(),
        'revenue_by_company': RevenueAnalytics.get_revenue_by_company(),
        'monthly_trend': RevenueAnalytics.get_monthly_revenue_trend(months),
        'payment_breakdown': RevenueAnalytics.get_payment_status_breakdown(),
        'timestamp': timezone.now()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_analytics(request):
    """Get detailed user analytics"""
    
    days = int(request.GET.get('days', 30))
    
    return Response({
        'overview': UserAnalytics.get_user_overview(),
        'company_breakdown': UserAnalytics.get_company_user_breakdown(),
        'activity_trend': UserAnalytics.get_user_activity_trend(days),
        'service_usage': UserAnalytics.get_service_usage_by_company(),
        'timestamp': timezone.now()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_analytics(request):
    """Get detailed service analytics"""
    
    days = int(request.GET.get('days', 30))
    
    return Response({
        'adoption_rates': ServiceAnalytics.get_service_adoption_rates(),
        'performance_metrics': ServiceAnalytics.get_service_performance_metrics(),
        'usage_trends': ServiceAnalytics.get_service_usage_trends(days),
        'revenue_contribution': ServiceAnalytics.get_service_revenue_contribution(),
        'timestamp': timezone.now()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def growth_analytics(request):
    """Get detailed growth analytics"""
    
    months = int(request.GET.get('months', 12))
    
    return Response({
        'company_growth': GrowthAnalytics.get_company_growth_trend(months),
        'revenue_growth': GrowthAnalytics.get_revenue_growth_trend(months),
        'user_growth': GrowthAnalytics.get_user_growth_trend(months),
        'growth_kpis': GrowthAnalytics.get_growth_kpis(),
        'timestamp': timezone.now()
    })