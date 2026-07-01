from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import viewsets
from .marketing_views import (
    EmailTemplateViewSet, MarketingCampaignViewSet, AutomationWorkflowViewSet
)
from .support_views import (
    TicketViewSet, TicketCategoryViewSet, SLAViewSet, KnowledgeBaseViewSet
)
from .lead_scoring_views import (
    LeadScoreViewSet, ScoringCriteriaViewSet, LeadScoringDashboardViewSet
)
from .pipeline_views import (
    PipelineStageViewSet, DealViewSet, DealStageHistoryViewSet, SalesQuotaViewSet
)
from .analytics_views import (
    CustomerInteractionViewSet, CustomerHealthScoreViewSet, CustomerSegmentViewSet, SalesAnalyticsViewSet
)
from .integration_views import (
    ThirdPartyIntegrationViewSet, IntegrationLogViewSet, MobileDeviceViewSet, MobileSyncViewSet
)
from .security_views import (
    DataAuditLogViewSet, ComplianceRuleViewSet, ComplianceViolationViewSet,
    DataRetentionPolicyViewSet, SecurityAlertViewSet, APIUsageLogViewSet
)
from .reporting_views import (
    ReportTemplateViewSet, DashboardViewSet as ReportingDashboardViewSet, BusinessIntelligenceViewSet
)

router = DefaultRouter()
# Core CRM - New ViewSets with centralized tenant enforcement
router.register(r'leads', viewsets.LeadViewSet)
router.register(r'contacts', viewsets.ContactViewSet)
router.register(r'accounts', viewsets.AccountViewSet)
router.register(r'opportunities', viewsets.OpportunityViewSet)
router.register(r'activities', viewsets.ActivityViewSet)
router.register(r'campaigns', viewsets.CampaignViewSet)
router.register(r'sales-targets', viewsets.SalesTargetViewSet)
router.register(r'dashboard', viewsets.DashboardViewSet, basename='dashboard')

# Customer Support
router.register(r'tickets', TicketViewSet)
router.register(r'ticket-categories', TicketCategoryViewSet)
router.register(r'sla', SLAViewSet)
router.register(r'knowledge-base', KnowledgeBaseViewSet)

# AI Lead Scoring
router.register(r'lead-scores', LeadScoreViewSet)
router.register(r'scoring-criteria', ScoringCriteriaViewSet)
router.register(r'lead-scoring-dashboard', LeadScoringDashboardViewSet, basename='lead-scoring-dashboard')

# Phase 2: Advanced Sales Pipeline Management
router.register(r'pipeline-stages', PipelineStageViewSet)
router.register(r'deals', DealViewSet)
router.register(r'deal-stage-history', DealStageHistoryViewSet)
router.register(r'sales-quotas', SalesQuotaViewSet)

# Phase 2: Customer Relationship Analytics
router.register(r'customer-interactions', CustomerInteractionViewSet)
router.register(r'customer-health-scores', CustomerHealthScoreViewSet)
router.register(r'customer-segments', CustomerSegmentViewSet)
router.register(r'sales-analytics', SalesAnalyticsViewSet)

# Phase 4: Integration & Mobile Optimization
router.register(r'integrations', ThirdPartyIntegrationViewSet, basename='integrations')
router.register(r'integration-logs', IntegrationLogViewSet, basename='integration-logs')
router.register(r'mobile-devices', MobileDeviceViewSet, basename='mobile-devices')
router.register(r'mobile-sync', MobileSyncViewSet, basename='mobile-sync')

# Phase 3: Marketing Automation
router.register(r'email-templates', EmailTemplateViewSet)
router.register(r'marketing-campaigns', MarketingCampaignViewSet)
router.register(r'automation-workflows', AutomationWorkflowViewSet)

# Phase 4: Advanced Security & Compliance
router.register(r'audit-logs', DataAuditLogViewSet, basename='audit-logs')
router.register(r'compliance-rules', ComplianceRuleViewSet, basename='compliance-rules')
router.register(r'compliance-violations', ComplianceViolationViewSet, basename='compliance-violations')
router.register(r'retention-policies', DataRetentionPolicyViewSet, basename='retention-policies')
router.register(r'security-alerts', SecurityAlertViewSet, basename='security-alerts')
router.register(r'api-usage-logs', APIUsageLogViewSet, basename='api-usage-logs')

# Advanced Reporting
router.register(r'reports', ReportTemplateViewSet, basename='reports')
router.register(r'dashboards', ReportingDashboardViewSet, basename='dashboards')
router.register(r'business-insights', BusinessIntelligenceViewSet, basename='business-insights')

urlpatterns = [
    path('', include(router.urls)),
]