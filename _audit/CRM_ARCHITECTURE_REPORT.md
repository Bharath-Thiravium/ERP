# CRM Module — Architecture Report

**Audit date:** 2026-06-24  
**Auditor:** Automated static-analysis audit  
**Scope:** All Python source files under `backend/crm/`  
**Method:** Read-only — no code was modified

---

## 1. Module Size and File Inventory

| File | Size | Role |
|------|------|------|
| `models.py` | 42 KB | Core CRM models (Lead, Contact, Account, Opportunity, Activity, Campaign, Ticket, LeadScore, Pipeline entities, Analytics) |
| `views.py` | 38 KB | Legacy `CRMBaseViewSet` + duplicate ViewSets (imported but NOT router-registered) |
| `viewsets.py` | 22 KB | Active `CompanyScopedModelViewSet`-based ViewSets for core entities |
| `serializers.py` | 16 KB | All model serializers |
| `ai_analytics.py` | 20 KB | AI-based analytics engine |
| `analytics_views.py` | 18 KB | Customer interaction, health score, segment, and sales analytics views |
| `calendar_integration.py` | 22 KB | External calendar integration logic |
| `document_management.py` | 18 KB | Document handling |
| `email_integration.py` | 17 KB | Email provider integration |
| `error_handlers.py` | 7.9 KB | Error handling decorators/mixins |
| `integration_views.py` | 13 KB | Third-party integration and mobile device views |
| `lead_scoring.py` | 27 KB | Lead scoring engine |
| `lead_scoring_views.py` | 18 KB | Lead score and criteria ViewSets |
| `marketing_views.py` | 9.4 KB | Email template and campaign automation ViewSets |
| `phase3_models.py` | 11 KB | Marketing automation models (EmailTemplate, MarketingCampaign, AutomationWorkflow, ReportTemplate, Dashboard) |
| `phase3_serializers.py` | 4.3 KB | Phase 3 model serializers |
| `phase4_models.py` | 14 KB | Integration, mobile, security, and audit log models |
| `phase4_serializers.py` | 3.1 KB | Phase 4 model serializers |
| `pipeline_views.py` | 14 KB | Pipeline stage, deal, and sales quota ViewSets |
| `query_optimizations.py` | 11 KB | CRMQueryOptimizer class + cache management |
| `quote_models.py` | 8.5 KB | Quote/proposal models |
| `quote_views.py` | 17 KB | Quote management ViewSets |
| `rate_limiting.py` | 7.1 KB | Rate limiting utilities |
| `reporting_views.py` | 13 KB | Report template, dashboard, and business intelligence ViewSets |
| `security_utils.py` | 6.9 KB | `CRMSecurityValidator` class + request validation helpers |
| `security_views.py` | 16 KB | Audit log, compliance, retention, security alert ViewSets |
| `support_views.py` | 10 KB | Ticket, SLA, and knowledge base ViewSets |
| `urls.py` | 4.3 KB | Router configuration |

**Total:** ~350 KB of Python source across 28 files + 9 migration files.

---

## 2. Architecture Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  URL Layer  (urls.py — DefaultRouter, 30+ registered routes)     │
└──────────────────────────┬───────────────────────────────────────┘
                           │
          ┌────────────────┴─────────────────┐
          │                                  │
          ▼                                  ▼
┌──────────────────────┐         ┌───────────────────────────┐
│ viewsets.py          │         │ views.py + child files    │
│ CompanyScopedModel   │         │ CRMBaseViewSet             │
│ ViewSet (Pattern A)  │         │ (also Pattern A)           │
│ leads, contacts,     │         │ support, pipeline,         │
│ accounts, opps,      │         │ analytics, security,       │
│ activities, etc.     │         │ marketing, reporting, etc. │
└──────────┬───────────┘         └────────────┬──────────────┘
           │                                  │
           └──────────────┬───────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Serializer Layer  (serializers.py, phase3/4_serializers.py)     │
│  — fields = '__all__' on most serializers                        │
│  — no FK queryset scoping                                        │
└──────────────────────────┬───────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Model Layer (models.py, phase3_models.py, phase4_models.py,    │
│  quote_models.py)                                                │
│  — All core entities have company = FK(Company)                  │
│  — All entity IDs have global unique=True (CRITICAL)             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication Pattern Analysis

The CRM module uses two base classes:

### Pattern A1: CompanyScopedModelViewSet (viewsets.py)
Used by: `LeadViewSet`, `ContactViewSet`, `AccountViewSet`, `OpportunityViewSet`, `ActivityViewSet`, `CampaignViewSet`, `SalesTargetViewSet`, `DashboardViewSet`

```python
# viewsets.py:18
class LeadViewSet(CompanyScopedModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
```

`CompanyScopedModelViewSet` (defined in `common/viewsets.py:25`) centralizes:
- `authentication_classes = [ServiceUserSessionAuthentication]`
- `permission_classes = [IsServiceUserAuthenticated]`
- `get_queryset()` that injects `company=session.company`

**Assessment: CORRECT — safe against cross-tenant enumeration.**

### Pattern A2: CRMBaseViewSet (views.py)
Used by: `TicketViewSet`, `PipelineStageViewSet`, `DealViewSet`, `DataAuditLogViewSet`, `CustomerInteractionViewSet`, `ReportTemplateViewSet`, and all other child ViewSets.

```python
# views.py:26-29
class CRMBaseViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
```

```python
# views.py:39-49
def get_queryset(self):
    session_key = self.get_session_key()
    ...
    session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
    company = session.service_user.company
    return self.queryset.filter(company=company)
```

**Assessment: Also CORRECT for tenant scoping, but re-validates session manually inside every overridden method (list, create, retrieve, update, destroy) in addition to the DRF auth class — double DB lookup per request.**

### Dead Code: Unused ViewSets in views.py
`views.py` contains `LeadViewSet`, `ContactViewSet`, `AccountViewSet`, `OpportunityViewSet`, `ActivityViewSet`, `CampaignViewSet`, `SalesTargetViewSet` — all imported in `urls.py` line 3–6 but none are registered in the router. Only `viewsets.LeadViewSet` etc. (Pattern A1) are registered.  
**These are dead code — unused but still compiled on every process start.**

---

## 4. Core Data Models

### 4.1 Lead (models.py:9–103)
| Field | Type | Notable |
|-------|------|---------|
| `company` | FK(Company, CASCADE) | Tenant anchor ✅ |
| `lead_id` | CharField(50, **unique=True**) | GLOBALLY unique ⚠️ |
| `assigned_to` | FK(User, SET_NULL) | No company scope ⚠️ |
| `created_by` | FK(User, CASCADE) | No company scope ⚠️ |
| `status` | choices: new/contacted/qualified/proposal/negotiation/won/lost | No 'converted' state |
| `estimated_value` | DecimalField(12,2) | |
| `tags` | JSONField | |

### 4.2 Contact (models.py:106–162)
| Field | Type | Notable |
|-------|------|---------|
| `company` | FK(Company, CASCADE) | Tenant anchor ✅ |
| `contact_id` | CharField(50, **unique=True**) | GLOBALLY unique ⚠️ |

### 4.3 Account (models.py:165–240)
| Field | Type | Notable |
|-------|------|---------|
| `company` | FK(Company, CASCADE) | Tenant anchor ✅ |
| `account_id` | CharField(50, **unique=True**) | GLOBALLY unique ⚠️ |
| `primary_contact` | FK(Contact, SET_NULL) | No company scope on FK ⚠️ |
| `account_manager` | FK(User, SET_NULL) | No company scope on FK ⚠️ |

### 4.4 Opportunity (models.py:243–320)
| Field | Type | Notable |
|-------|------|---------|
| `company` | FK(Company, CASCADE) | Tenant anchor ✅ |
| `opportunity_id` | CharField(50, **unique=True**) | GLOBALLY unique ⚠️ |
| `account` | FK(Account, CASCADE) | No company scope on FK ⚠️ |
| `contact` | FK(Contact, SET_NULL) | No company scope on FK ⚠️ |

### 4.5 Activity (models.py:323–377)
| Field | Type | Notable |
|-------|------|---------|
| `company` | FK(Company, CASCADE) | Tenant anchor ✅ |
| `activity_id` | CharField(50, **unique=True**) | GLOBALLY unique ⚠️ |
| Types: call, email, meeting, task, note, demo, proposal | | |

### 4.6 Deal (models.py:740–797)
| Field | Type | Notable |
|-------|------|---------|
| `company` | FK(Company, CASCADE) | Tenant anchor ✅ |
| `deal_id` | CharField(50, **unique=True**) | GLOBALLY unique ⚠️ |
| `current_stage` | FK(PipelineStage, CASCADE) | No company scope on FK ⚠️ |
| `account` | FK(Account, CASCADE) | No company scope on FK ⚠️ |

### 4.7 CustomerHealthScore (models.py:896–948)
No `company` FK — scoped via `account__company` join. `get_queryset` override in `CustomerHealthScoreViewSet` uses `filter(account__company=company)` which adds a JOIN.

---

## 5. Model ID Generation Strategies

All entity IDs use one of two patterns:

**Pattern 1 (primary — models.py `save()` fallback):**
```python
last = Lead.objects.filter(company=self.company, lead_id__startswith='LEAD-').order_by('-id').first()
self.lead_id = f"LEAD-{last_number + 1:06d}"
```
No `select_for_update()` — race condition on concurrent creates.

**Pattern 2 (serializers — count+1):**
```python
# serializers.py:180
ticket_count = Ticket.objects.filter(company=company).count() + 1
validated_data['ticket_id'] = f"{company.company_prefix}TKT{ticket_count:04d}"
```
Race condition produces duplicate IDs when two creates happen simultaneously.

---

## 6. URL Route Surface

The router registers 30 route sets (60+ endpoints with actions):

| Route Prefix | ViewSet Source | Base Class |
|---|---|---|
| `leads/` | `viewsets.LeadViewSet` | CompanyScopedModelViewSet |
| `contacts/` | `viewsets.ContactViewSet` | CompanyScopedModelViewSet |
| `accounts/` | `viewsets.AccountViewSet` | CompanyScopedModelViewSet |
| `opportunities/` | `viewsets.OpportunityViewSet` | CompanyScopedModelViewSet |
| `activities/` | `viewsets.ActivityViewSet` | CompanyScopedModelViewSet |
| `campaigns/` | `viewsets.CampaignViewSet` | CompanyScopedModelViewSet |
| `sales-targets/` | `viewsets.SalesTargetViewSet` | CompanyScopedModelViewSet |
| `dashboard/` | `viewsets.DashboardViewSet` | CompanyScopedModelViewSet |
| `tickets/` | `support_views.TicketViewSet` | CRMBaseViewSet |
| `ticket-categories/` | `support_views.TicketCategoryViewSet` | CRMBaseViewSet |
| `sla/` | `support_views.SLAViewSet` | CRMBaseViewSet |
| `knowledge-base/` | `support_views.KnowledgeBaseViewSet` | CRMBaseViewSet |
| `lead-scores/` | `lead_scoring_views.LeadScoreViewSet` | CRMBaseViewSet |
| `scoring-criteria/` | `lead_scoring_views.ScoringCriteriaViewSet` | CRMBaseViewSet |
| `pipeline-stages/` | `pipeline_views.PipelineStageViewSet` | CRMBaseViewSet |
| `deals/` | `pipeline_views.DealViewSet` | CRMBaseViewSet |
| `deal-stage-history/` | `pipeline_views.DealStageHistoryViewSet` | CRMBaseViewSet |
| `sales-quotas/` | `pipeline_views.SalesQuotaViewSet` | CRMBaseViewSet |
| `customer-interactions/` | `analytics_views.CustomerInteractionViewSet` | CRMBaseViewSet |
| `customer-health-scores/` | `analytics_views.CustomerHealthScoreViewSet` | CRMBaseViewSet |
| `customer-segments/` | `analytics_views.CustomerSegmentViewSet` | CRMBaseViewSet |
| `sales-analytics/` | `analytics_views.SalesAnalyticsViewSet` | CRMBaseViewSet |
| `integrations/` | `integration_views.ThirdPartyIntegrationViewSet` | CRMBaseViewSet |
| `email-templates/` | `marketing_views.EmailTemplateViewSet` | CRMBaseViewSet |
| `marketing-campaigns/` | `marketing_views.MarketingCampaignViewSet` | CRMBaseViewSet |
| `audit-logs/` | `security_views.DataAuditLogViewSet` | CRMBaseViewSet |
| `compliance-rules/` | `security_views.ComplianceRuleViewSet` | CRMBaseViewSet |
| `reports/` | `reporting_views.ReportTemplateViewSet` | CRMBaseViewSet |
| `dashboards/` | `reporting_views.ReportingDashboardViewSet` | CRMBaseViewSet |
| `business-insights/` | `reporting_views.BusinessIntelligenceViewSet` | CRMBaseViewSet |

---

## 7. Query Optimization Infrastructure

`CRMQueryOptimizer` (`query_optimizations.py`) provides:
- `get_optimized_leads_queryset()` — `select_related` + `prefetch_related` + `annotate`
- `get_optimized_opportunities_queryset()` — similar
- `get_optimized_accounts_queryset()` — similar
- `get_dashboard_stats_optimized()` — aggregation queries + 5-minute cache (`cache.set(key, stats, 300)`)
- `get_sales_funnel_optimized()` — similar with caching

**Note:** These optimized methods are used only in `DashboardViewSet`. Other ViewSets use `self.get_queryset()` without `select_related` — N+1 risk exists when serializers access related fields.

---

## 8. Functional Coverage by Audit Scope Area

| Scope Area | Implemented | Notes |
|------------|------------|-------|
| Lead Management | ✅ Full | Lead CRUD + scoring + conversion |
| Lead Sources | ✅ | 8 source choices hardcoded in model |
| Lead Assignment | ✅ | `assigned_to` FK(User) — unscoped |
| Lead Status Workflow | ✅ | 7 statuses; no 'converted' state |
| Contact Management | ✅ | Full CRUD |
| Account/Customer Management | ✅ | Full CRUD |
| Opportunity Management | ✅ | Full CRUD + pipeline + forecast |
| Pipeline Stages | ✅ | Configurable per company |
| Activity Tracking | ✅ | 7 activity types |
| Notes & Comments | Partial | Notes via Activity(type='note') only |
| Follow-up Management | Partial | Calendar integration present; actual reminders not verified |
| Task Management | Partial | Activities of type='task' |
| Reminders & Notifications | Partial | Push notification via MobileDevice model |
| Sales Dashboard | ✅ | Cached aggregation queries |
| CRM Reports | ✅ | Report template + export |
| Tenant Isolation | ✅ | Company FK on all models; both base classes scope queries |
| Permission Enforcement | ✅ | ServiceUserSessionAuthentication + IsServiceUserAuthenticated |
| Data Ownership | Partial | `created_by` falls back to superuser |
| Lead Conversion Workflow | ✅ | Converts lead → account + contact + opportunity |
| Duplicate Detection | ❌ | No duplicate detection logic found in any CRM file |
| Audit Logging | Partial | `DataAuditLog` model exists; actual write-on-change not verified via Django signals |
