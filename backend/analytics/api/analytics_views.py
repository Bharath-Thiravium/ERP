from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone

from ..analytics_engine.revenue_analytics import RevenueAnalytics
from ..analytics_engine.user_analytics import UserAnalytics
from ..analytics_engine.service_analytics import ServiceAnalytics
from ..analytics_engine.growth_analytics import GrowthAnalytics


def _get_request_company(request):
    """
    Derive company context from the authenticated caller.

    Returns (company, is_master_admin):
      - (None, True)     if the caller is a Master Admin
      - (Company, False) if the caller is a Company User or Service User
      - raises PermissionDenied if no recognized identity is found
    """
    # Service User — set by ServiceUserSessionAuthentication
    if hasattr(request, 'service_user') and request.service_user:
        return request.service_user.company, False

    if not request.user or not request.user.is_authenticated:
        raise PermissionDenied('Authentication required.')

    # Master Admin
    if hasattr(request.user, 'master_admin'):
        try:
            _ = request.user.master_admin  # confirm the related object exists
            return None, True
        except Exception:
            pass

    # Company User
    if hasattr(request.user, 'company_user'):
        try:
            return request.user.company_user.company, False
        except Exception:
            pass

    raise PermissionDenied('User has no recognized role.')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_overview(request):
    """Get analytics overview dashboard data — tenant-scoped."""
    company, is_master_admin = _get_request_company(request)

    total_revenue = RevenueAnalytics.get_total_revenue(company=company)
    payment_breakdown = RevenueAnalytics.get_payment_status_breakdown(company=company)
    user_stats = UserAnalytics.get_user_overview(company=company)
    service_adoption = ServiceAnalytics.get_service_adoption_rates(company=company)
    growth_kpis = GrowthAnalytics.get_growth_kpis(company=company)

    return Response({
        'revenue': {
            'total_revenue': total_revenue,
            'payment_breakdown': payment_breakdown
        },
        'users': user_stats,
        'services': {
            'adoption_rates': service_adoption[:3]
        },
        'growth': growth_kpis,
        'timestamp': timezone.now()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def revenue_analytics(request):
    """Get detailed revenue analytics — tenant-scoped."""
    company, is_master_admin = _get_request_company(request)

    months = int(request.GET.get('months', 12))

    data = {
        'total_revenue': RevenueAnalytics.get_total_revenue(company=company),
        'monthly_trend': RevenueAnalytics.get_monthly_revenue_trend(months, company=company),
        'payment_breakdown': RevenueAnalytics.get_payment_status_breakdown(company=company),
        'timestamp': timezone.now()
    }

    if is_master_admin:
        # Master Admin additionally gets per-company revenue breakdown
        data['revenue_by_company'] = RevenueAnalytics.get_revenue_by_company()
    else:
        # Company/Service User gets their own company's revenue only
        data['revenue_by_company'] = []

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_analytics(request):
    """Get detailed user analytics — tenant-scoped."""
    company, is_master_admin = _get_request_company(request)

    days = int(request.GET.get('days', 30))

    data = {
        'overview': UserAnalytics.get_user_overview(company=company),
        'service_usage': UserAnalytics.get_service_usage_by_company(company=company),
        'timestamp': timezone.now()
    }

    if is_master_admin:
        data['company_breakdown'] = UserAnalytics.get_company_user_breakdown()
        data['activity_trend'] = UserAnalytics.get_user_activity_trend(days)
    else:
        # Company-scoped callers only see their own company's data
        data['company_breakdown'] = []
        data['activity_trend'] = []

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_analytics(request):
    """Get detailed service analytics — tenant-scoped."""
    company, is_master_admin = _get_request_company(request)

    days = int(request.GET.get('days', 30))

    return Response({
        'adoption_rates': ServiceAnalytics.get_service_adoption_rates(company=company),
        'performance_metrics': ServiceAnalytics.get_service_performance_metrics(company=company),
        'usage_trends': ServiceAnalytics.get_service_usage_trends(days, company=company),
        'revenue_contribution': ServiceAnalytics.get_service_revenue_contribution(company=company),
        'timestamp': timezone.now()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def growth_analytics(request):
    """Get detailed growth analytics — tenant-scoped."""
    company, is_master_admin = _get_request_company(request)

    months = int(request.GET.get('months', 12))

    data = {
        'revenue_growth': GrowthAnalytics.get_revenue_growth_trend(months, company=company),
        'user_growth': GrowthAnalytics.get_user_growth_trend(months, company=company),
        'growth_kpis': GrowthAnalytics.get_growth_kpis(company=company),
        'timestamp': timezone.now()
    }

    if is_master_admin:
        # Platform-wide company growth trend is meaningful only for Master Admin
        data['company_growth'] = GrowthAnalytics.get_company_growth_trend(months)
    else:
        data['company_growth'] = None

    return Response(data)
