from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AthensTenantsViewSet, AthensMastersViewSet, AthensSubscriptionsViewSet,
    AthensAuditLogsViewSet, AthensSettingsViewSet, AthensMetricsViewSet,
    AthensModulesViewSet, AthensModuleAccessViewSet
)

router = DefaultRouter()
router.register(r'tenants', AthensTenantsViewSet, basename='athens-tenants')
router.register(r'masters', AthensMastersViewSet, basename='athens-masters')
router.register(r'subscriptions', AthensSubscriptionsViewSet, basename='athens-subscriptions')
router.register(r'audit-logs', AthensAuditLogsViewSet, basename='athens-audit-logs')
router.register(r'settings', AthensSettingsViewSet, basename='athens-settings')
router.register(r'metrics', AthensMetricsViewSet, basename='athens-metrics')
router.register(r'modules', AthensModulesViewSet, basename='athens-modules')
router.register(r'module-access', AthensModuleAccessViewSet, basename='athens-module-access')

urlpatterns = [
    path('', include(router.urls)),
]