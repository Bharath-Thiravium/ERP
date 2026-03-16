from django.urls import path
from . import views
from .api import analytics_views
from .simple_views import simple_system_overview

urlpatterns = [
    # System monitoring endpoints
    path('system-overview/', simple_system_overview, name='system_overview'),
    path('service-metrics/', views.service_metrics, name='service_metrics'),
    path('performance-metrics/', views.performance_metrics, name='performance_metrics'),
    path('system-alerts/', views.system_alerts, name='system_alerts'),
    path('alerts/<int:alert_id>/resolve/', views.resolve_alert, name='resolve_alert'),
    
    # Analytics endpoints
    path('overview/', analytics_views.analytics_overview, name='analytics_overview'),
    path('revenue/', analytics_views.revenue_analytics, name='revenue_analytics'),
    path('users/', analytics_views.user_analytics, name='user_analytics'),
    path('services/', analytics_views.service_analytics, name='service_analytics_detailed'),
    path('growth/', analytics_views.growth_analytics, name='growth_analytics'),
]