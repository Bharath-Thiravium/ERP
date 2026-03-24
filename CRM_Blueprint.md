# CRM Module — Complete Blueprint
**Project:** SAP-Python  
**Base URL:** `https://sap.athenas.co.in/api/crm/`  
**Authentication:** All endpoints require `session_key` — pass as `Authorization: Bearer <key>` header or `?session_key=<key>` query param.

---

## Architecture Overview

```
crm/
├── models.py              — Core data models (Lead, Contact, Account, Opportunity, Activity, Campaign)
├── phase3_models.py       — Marketing automation models (EmailTemplate, MarketingCampaign, AutomationWorkflow)
├── phase4_models.py       — Security & integration models (ThirdPartyIntegration, DataAuditLog, ComplianceRule)
├── viewsets.py            — Primary ViewSets using CompanyScopedModelViewSet (tenant-enforced)
├── views.py               — Legacy ViewSets (CRMBaseViewSet) — still used for some routes
├── support_views.py       — Customer support (Ticket, TicketCategory, SLA, KnowledgeBase)
├── analytics_views.py     — Customer analytics (CustomerInteraction, CustomerHealthScore, CustomerSegment)
├── pipeline_views.py      — Sales pipeline (PipelineStage, Deal, DealStageHistory, SalesQuota)
├── lead_scoring_views.py  — AI lead scoring (LeadScore, ScoringCriteria)
├── marketing_views.py     — Marketing automation (EmailTemplate, MarketingCampaign, AutomationWorkflow)
├── reporting_views.py     — Reporting & BI (ReportTemplate, Dashboard, BusinessIntelligence)
├── integration_views.py   — Third-party integrations (ThirdPartyIntegration, IntegrationLog, MobileDevice)
├── security_views.py      — Security & compliance (DataAuditLog, ComplianceRule, SecurityAlert, APIUsageLog)
├── security_utils.py      — Input validation, SQL injection & XSS protection
├── query_optimizations.py — Cached dashboard stats, sales funnel queries
├── ai_analytics.py        — AI insights, sales forecast, customer health, conversation intelligence
├── lead_scoring.py        — AI lead scoring engine
└── urls.py                — Router registrations
```

### Tenant Isolation
Every model has a `company` FK to `authentication.Company`. Two ViewSet base classes enforce this:
- `CompanyScopedModelViewSet` (in `common/viewsets.py`) — used by `viewsets.py`, automatically filters all queries by company from session.
- `CRMBaseViewSet` (in `views.py`) — manual session extraction, used by legacy ViewSets.

---

## Data Models

### Lead
| Field | Type | Notes |
|---|---|---|
| lead_id | CharField(50) | Auto-generated: `LEAD-000001` |
| first_name, last_name | CharField(100) | Required |
| email | EmailField | Required |
| phone, company_name, job_title | CharField | Optional |
| status | CharField | new / contacted / qualified / proposal / negotiation / won / lost |
| priority | CharField | low / medium / high / urgent |
| source | CharField | website / referral / social_media / email_campaign / cold_call / trade_show / advertisement / other |
| estimated_value | DecimalField(12,2) | Optional |
| expected_close_date | DateField | Optional |
| assigned_to | FK → User | Optional |
| created_by | FK → User | Required |
| tags | JSONField | Default: [] |
| description | TextField | Optional |

**Indexes:** lead_id, email, (company, status), (assigned_to, priority)

### Contact
| Field | Type | Notes |
|---|---|---|
| contact_id | CharField(50) | Auto-generated: `CONT-000001` |
| first_name, last_name | CharField(100) | Required |
| email | EmailField | Required |
| phone, mobile | CharField(20) | Optional |
| job_title, department | CharField | Optional |
| address_line1/2, city, state, postal_code, country | CharField | Optional |
| created_by | FK → User | Required |
| tags | JSONField | Default: [] |
| is_active | BooleanField | Default: True |

### Account
| Field | Type | Notes |
|---|---|---|
| account_id | CharField(50) | Auto-generated: `ACC-000001` |
| name | CharField(200) | Required |
| account_type | CharField | prospect / customer / partner / vendor |
| industry | CharField | technology / healthcare / finance / manufacturing / retail / education / government / other |
| website | URLField(500) | Optional |
| phone, email | CharField/EmailField | Optional |
| annual_revenue | DecimalField(15,2) | Optional |
| employee_count | IntegerField | Optional |
| billing_address, shipping_address | TextField | Optional |
| primary_contact | FK → Contact | Optional |
| account_manager | FK → User | Optional |
| created_by | FK → User | Required |
| tags | JSONField | Default: [] |
| is_active | BooleanField | Default: True |

### Opportunity
| Field | Type | Notes |
|---|---|---|
| opportunity_id | CharField(50) | Auto-generated: `OPP-000001` |
| name | CharField(200) | Required |
| account | FK → Account | Required |
| contact | FK → Contact | Optional |
| stage | CharField | prospecting / qualification / needs_analysis / proposal / negotiation / closed_won / closed_lost |
| amount | DecimalField(12,2) | Required |
| probability | IntegerField | 10 / 25 / 50 / 75 / 90 / 100 |
| expected_close_date | DateField | Required |
| owner | FK → User | Required |
| created_by | FK → User | Required |
| closed_date | DateField | Auto-set on close |
| tags | JSONField | Default: [] |

**Computed:** `weighted_amount` = amount × (probability / 100)

### Activity
| Field | Type | Notes |
|---|---|---|
| activity_id | CharField(50) | Auto-generated |
| subject | CharField(200) | Required |
| activity_type | CharField | call / email / meeting / task / note / demo / proposal |
| status | CharField | planned / in_progress / completed / cancelled |
| lead | FK → Lead | Optional |
| contact | FK → Contact | Optional |
| account | FK → Account | Optional |
| opportunity | FK → Opportunity | Optional |
| due_date | DateTimeField | Required |
| duration_minutes | IntegerField | Default: 30 |
| assigned_to | FK → User | Required |
| created_by | FK → User | Required |
| completed_at | DateTimeField | Optional |
| description, outcome | TextField | Optional |

### Campaign
| Field | Type | Notes |
|---|---|---|
| campaign_id | CharField(50) | Auto-generated |
| name | CharField(200) | Required |
| campaign_type | CharField | email / social / webinar / event / advertisement / direct_mail / telemarketing |
| status | CharField | planning / active / paused / completed / cancelled |
| start_date, end_date | DateField | Required |
| budget | DecimalField(12,2) | Optional |
| target_audience | TextField | Optional |
| created_by | FK → User | Required |
| leads_generated, opportunities_created | IntegerField | Metrics |
| revenue_generated | DecimalField(12,2) | Metric |
| tags | JSONField | Default: [] |

### Deal (Advanced Pipeline)
| Field | Type | Notes |
|---|---|---|
| deal_id | CharField(50) | Auto-generated |
| name | CharField(200) | Required |
| account | FK → Account | Required |
| contact | FK → Contact | Optional |
| opportunity | OneToOneField → Opportunity | Optional |
| current_stage | FK → PipelineStage | Required |
| status | CharField | open / won / lost / on_hold |
| value | DecimalField(12,2) | Required |
| probability | IntegerField(0-100) | Required |
| expected_close_date | DateField | Required |
| owner | FK → User | Required |
| created_by | FK → User | Required |

**Computed:** `weighted_value`, `days_in_stage`

### CustomerInteraction
| Field | Type | Notes |
|---|---|---|
| interaction_id | CharField(50) | Auto-generated |
| contact | FK → Contact | Optional (nullable) |
| account | FK → Account | Optional (nullable) |
| deal | FK → Deal | Optional |
| interaction_type | CharField | email / call / meeting / demo / support / purchase / website_visit / social_media |
| subject | CharField(200) | Required |
| interaction_date | DateTimeField | Required |
| duration_minutes | IntegerField | Optional |
| created_by | FK → User | Required |
| metadata | JSONField | Default: {} |

### CustomerHealthScore
| Field | Type | Notes |
|---|---|---|
| account | OneToOneField → Account | Required |
| engagement_score | IntegerField(0-100) | Interaction frequency |
| satisfaction_score | IntegerField(0-100) | Support tickets, feedback |
| usage_score | IntegerField(0-100) | Product usage |
| financial_score | IntegerField(0-100) | Payment history |
| overall_score | IntegerField(0-100) | Weighted composite |
| health_status | CharField | excellent / good / average / poor / critical |
| churn_risk | FloatField(0-1) | ML-derived |
| upsell_opportunity | FloatField(0-1) | ML-derived |

**Weights:** engagement 30%, satisfaction 25%, usage 25%, financial 20%

### LeadScore (AI Scoring)
| Field | Type | Notes |
|---|---|---|
| lead | OneToOneField → Lead | Required |
| behavioral_score | IntegerField(0-100) | Website visits, email opens |
| demographic_score | IntegerField(0-100) | Company size, industry fit |
| engagement_score | IntegerField(0-100) | Response time, meeting acceptance |
| predictive_score | IntegerField(0-100) | ML conversion probability |
| total_score | IntegerField(0-100) | Weighted composite |
| grade | CharField | cold(0-25) / warm(26-50) / hot(51-75) / very_hot(76-100) |
| conversion_probability | FloatField(0-1) | |
| recommended_actions | JSONField | List of action strings |
| score_factors | JSONField | Detailed breakdown dict |

**Weights:** behavioral 30%, demographic 25%, engagement 25%, predictive 20%

### Support Models
| Model | Key Fields |
|---|---|
| TicketCategory | company, name, code, color(#hex), is_active |
| SLA | company, name, priority, response_time_hours, resolution_time_hours — unique_together: (company, priority) |
| Ticket | ticket_id, subject, description, status(open/in_progress/pending/resolved/closed), priority, source, category FK, contact FK (required), account FK, sla FK, response_due, resolution_due, satisfaction_rating(1-5) |
| KnowledgeBase | title, content, category FK, tags, is_published, view_count, helpful_count |

---

## API Endpoints

### Dashboard — `GET /api/crm/dashboard/`
Returns aggregated stats for the authenticated company.

**Response:**
```json
{
  "total_leads": 42,
  "total_opportunities": 18,
  "total_accounts": 15,
  "total_contacts": 67,
  "pipeline_value": "485000.00",
  "won_opportunities": 5,
  "activities_today": 3,
  "overdue_activities": 2
}
```

**Additional dashboard actions:**
| Endpoint | Description |
|---|---|
| `GET /api/crm/dashboard/stats/` | Same as list — dashboard stats |
| `GET /api/crm/dashboard/recent_activities/` | Last 10 activities |
| `GET /api/crm/dashboard/sales_funnel/` | Funnel data by stage (cached) |
| `GET /api/crm/dashboard/ai_insights/` | AI-generated daily insights |
| `GET /api/crm/dashboard/lead_intelligence/` | AI lead intelligence dashboard |
| `GET /api/crm/dashboard/sales_forecast/?period_days=90` | AI sales forecast |
| `GET /api/crm/dashboard/customer_health/` | Customer health & churn risk |
| `GET /api/crm/dashboard/conversation_intelligence/` | Conversation analysis insights |
| `GET /api/crm/dashboard/performance_analytics/` | Team performance analytics |
| `GET /api/crm/dashboard/weekly_report/` | Comprehensive weekly AI report |

---

### Leads — `/api/crm/leads/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/leads/` | List all leads (company-scoped) |
| POST | `/api/crm/leads/` | Create lead |
| GET | `/api/crm/leads/{id}/` | Retrieve lead |
| PUT/PATCH | `/api/crm/leads/{id}/` | Update lead |
| DELETE | `/api/crm/leads/{id}/` | Delete lead |
| POST | `/api/crm/leads/{id}/calculate_score/` | Trigger AI score calculation |
| GET | `/api/crm/leads/smart_prioritization/` | AI-prioritized top 20 leads |
| POST | `/api/crm/leads/{id}/convert_to_opportunity/` | Convert lead → Account + Contact + Opportunity |
| GET | `/api/crm/leads/by_status/` | Count of leads grouped by status |

**Filters:** `status`, `priority`, `source`, `assigned_to`  
**Search:** `first_name`, `last_name`, `email`, `company_name`  
**Ordering:** `created_at`, `updated_at`, `last_contacted`, `estimated_value`

**Create payload:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "company_name": "Acme Corp",
  "job_title": "CTO",
  "status": "new",
  "priority": "high",
  "source": "website",
  "estimated_value": "50000.00",
  "description": "Interested in enterprise plan"
}
```

---

### Contacts — `/api/crm/contacts/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/contacts/` | List contacts |
| POST | `/api/crm/contacts/` | Create contact |
| GET/PUT/PATCH/DELETE | `/api/crm/contacts/{id}/` | CRUD |

**Filters:** `is_active`, `department`  
**Search:** `first_name`, `last_name`, `email`, `job_title`, `department`  
**Ordering:** `first_name`, `last_name`, `created_at`

---

### Accounts — `/api/crm/accounts/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/accounts/` | List accounts |
| POST | `/api/crm/accounts/` | Create account |
| GET/PUT/PATCH/DELETE | `/api/crm/accounts/{id}/` | CRUD |
| GET | `/api/crm/accounts/{id}/opportunities/` | All opportunities for account |
| GET | `/api/crm/accounts/{id}/activities/` | All activities for account |

**Filters:** `account_type`, `industry`, `is_active`  
**Search:** `name`, `email`, `website`  
**Ordering:** `name`, `created_at`, `annual_revenue`

---

### Opportunities — `/api/crm/opportunities/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/opportunities/` | List opportunities |
| POST | `/api/crm/opportunities/` | Create opportunity |
| GET/PUT/PATCH/DELETE | `/api/crm/opportunities/{id}/` | CRUD |
| GET | `/api/crm/opportunities/pipeline/` | Count & total value by stage |
| GET | `/api/crm/opportunities/forecast/` | Pipeline forecast (total, weighted, avg deal size) |
| POST | `/api/crm/opportunities/{id}/update_stage/` | Update stage `{"stage": "negotiation"}` |

**Filters:** `stage`, `probability`, `owner`  
**Search:** `name`, `account__name`, `description`  
**Ordering:** `created_at`, `expected_close_date`, `amount`, `probability`

---

### Activities — `/api/crm/activities/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/activities/` | List activities |
| POST | `/api/crm/activities/` | Create activity |
| GET/PUT/PATCH/DELETE | `/api/crm/activities/{id}/` | CRUD |
| GET | `/api/crm/activities/today/` | Activities due today |
| GET | `/api/crm/activities/overdue/` | Overdue activities |
| POST | `/api/crm/activities/{id}/complete/` | Mark complete `{"outcome": "..."}` |
| POST | `/api/crm/activities/{id}/analyze_conversation/` | AI conversation analysis |

**Filters:** `activity_type`, `status`, `assigned_to`  
**Search:** `subject`, `description`  
**Ordering:** `due_date`, `created_at`

---

### Campaigns — `/api/crm/campaigns/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/campaigns/` | List campaigns |
| POST | `/api/crm/campaigns/` | Create campaign |
| GET/PUT/PATCH/DELETE | `/api/crm/campaigns/{id}/` | CRUD |
| GET | `/api/crm/campaigns/{id}/members/` | List campaign members |
| POST | `/api/crm/campaigns/{id}/add_members/` | Add leads/contacts `{"lead_ids": [], "contact_ids": []}` |

**Filters:** `campaign_type`, `status`  
**Search:** `name`, `description`  
**Ordering:** `created_at`, `start_date`, `end_date`

---

### Sales Targets — `/api/crm/sales-targets/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/sales-targets/` | List targets |
| POST | `/api/crm/sales-targets/` | Create target |
| GET/PUT/PATCH/DELETE | `/api/crm/sales-targets/{id}/` | CRUD |
| GET | `/api/crm/sales-targets/current_performance/` | Current month/quarter/year performance |

**Filters:** `period`, `year`, `user`  
**Ordering:** `year`, `month`, `quarter`, `target_amount`

---

### Customer Support

#### Tickets — `/api/crm/tickets/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/tickets/` | List tickets |
| POST | `/api/crm/tickets/` | Create ticket |
| GET/PUT/PATCH/DELETE | `/api/crm/tickets/{id}/` | CRUD |
| POST | `/api/crm/tickets/{id}/assign/` | Assign ticket `{"user_id": 1}` |
| POST | `/api/crm/tickets/{id}/resolve/` | Resolve ticket `{"resolution": "..."}` |
| POST | `/api/crm/tickets/{id}/close/` | Close ticket |
| GET | `/api/crm/tickets/overdue/` | Overdue tickets |
| GET | `/api/crm/tickets/stats/` | Ticket statistics |

#### Ticket Categories — `/api/crm/ticket-categories/`
Standard CRUD. Fields: `name`, `description`, `color` (hex e.g. `#3B82F6`), `is_active`.

#### SLA — `/api/crm/sla/`
Standard CRUD. Fields: `name`, `priority`, `response_time_hours`, `resolution_time_hours`.  
Unique constraint: one SLA per priority per company.

#### Knowledge Base — `/api/crm/knowledge-base/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/knowledge-base/` | List articles |
| POST | `/api/crm/knowledge-base/` | Create article |
| GET/PUT/PATCH/DELETE | `/api/crm/knowledge-base/{id}/` | CRUD |
| POST | `/api/crm/knowledge-base/{id}/mark_helpful/` | Increment helpful count |
| GET | `/api/crm/knowledge-base/search/?q=keyword` | Full-text search |

---

### AI Lead Scoring

#### Lead Scores — `/api/crm/lead-scores/`
Standard CRUD. Scores are auto-calculated by the AI engine.

#### Scoring Criteria — `/api/crm/scoring-criteria/`
Standard CRUD. Fields: `name`, `criteria_type` (behavioral/demographic/engagement/predictive), `weight`, `max_points`, `is_active`.

#### Lead Scoring Dashboard — `/api/crm/lead-scoring-dashboard/`
| Endpoint | Description |
|---|---|
| `GET /api/crm/lead-scoring-dashboard/overview/` | Score distribution, top leads |
| `GET /api/crm/lead-scoring-dashboard/batch_score/` | Trigger batch scoring for all leads |

---

### Advanced Sales Pipeline

#### Pipeline Stages — `/api/crm/pipeline-stages/`
Standard CRUD. Fields: `name`, `order`, `probability`, `is_active`, `color` (hex).  
Unique constraint: (company, order).

#### Deals — `/api/crm/deals/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/deals/` | List deals |
| POST | `/api/crm/deals/` | Create deal |
| GET/PUT/PATCH/DELETE | `/api/crm/deals/{id}/` | CRUD |
| POST | `/api/crm/deals/{id}/move_stage/` | Move to stage `{"stage_id": 2, "notes": "..."}` |
| GET | `/api/crm/deals/pipeline_view/` | Kanban-style pipeline data |
| GET | `/api/crm/deals/forecast/` | Weighted deal forecast |

#### Deal Stage History — `/api/crm/deal-stage-history/`
Read-only audit trail of stage changes.

#### Sales Quotas — `/api/crm/sales-quotas/`
Standard CRUD. Fields: `user`, `period`, `year`, `month`, `quarter`, `quota_amount`, `achieved_amount`, `deals_target`, `deals_achieved`.

---

### Customer Analytics

#### Customer Interactions — `/api/crm/customer-interactions/`
Standard CRUD. `contact` and `account` are optional (nullable).

#### Customer Health Scores — `/api/crm/customer-health-scores/`
| Endpoint | Description |
|---|---|
| `GET /api/crm/customer-health-scores/` | List all health scores |
| `POST /api/crm/customer-health-scores/{id}/recalculate/` | Trigger recalculation |
| `GET /api/crm/customer-health-scores/at_risk/` | Accounts with churn_risk > 0.7 |

#### Customer Segments — `/api/crm/customer-segments/`
Standard CRUD. Fields: `name`, `description`, `criteria` (JSON rules), `color`, `is_active`.

#### Sales Analytics — `/api/crm/sales-analytics/`
Read-only time-series metrics. Types: conversion_rate, avg_deal_size, sales_cycle_length, win_rate, pipeline_velocity, customer_acquisition_cost, customer_lifetime_value.

---

### Marketing Automation

#### Email Templates — `/api/crm/email-templates/`
Standard CRUD. Fields: `name`, `subject`, `body_html`, `body_text`, `template_type`, `is_active`.

#### Marketing Campaigns — `/api/crm/marketing-campaigns/`
Standard CRUD with additional actions for sending and tracking.

#### Automation Workflows — `/api/crm/automation-workflows/`
Standard CRUD. Fields: `name`, `trigger_type`, `conditions` (JSON), `actions` (JSON), `is_active`.

---

### Reporting & BI

#### Reports — `/api/crm/reports/`
Standard CRUD for report templates.

#### Dashboards — `/api/crm/dashboards/`
Standard CRUD for saved dashboard configurations.

#### Business Insights — `/api/crm/business-insights/`
Read-only AI-generated business intelligence records.

---

### Integrations

#### Third-Party Integrations — `/api/crm/integrations/`
Standard CRUD. Fields: `integration_type`, `credentials` (JSON), `is_active`, `last_sync`.

#### Integration Logs — `/api/crm/integration-logs/`
Read-only audit log of integration sync events.

#### Mobile Devices — `/api/crm/mobile-devices/`
Standard CRUD for registered mobile devices.

#### Mobile Sync — `/api/crm/mobile-sync/`
Sync endpoints for mobile app data.

---

### Security & Compliance

#### Audit Logs — `/api/crm/audit-logs/`
Read-only. Records all create/update/delete operations.

#### Compliance Rules — `/api/crm/compliance-rules/`
Standard CRUD. Define data retention and compliance policies.

#### Compliance Violations — `/api/crm/compliance-violations/`
Read-only. Auto-generated when rules are breached.

#### Retention Policies — `/api/crm/retention-policies/`
Standard CRUD. Define how long data is retained per model.

#### Security Alerts — `/api/crm/security-alerts/`
Read-only. Auto-generated on suspicious activity.

#### API Usage Logs — `/api/crm/api-usage-logs/`
Read-only. Per-session API call tracking.

---

## Security Layer

All string inputs pass through `CRMSecurityValidator` in `security_utils.py`:

| Check | Pattern | Action |
|---|---|---|
| SQL Injection | SELECT/INSERT/UPDATE/DELETE/DROP/UNION keywords, `--`, `/*`, `*/` | Returns 400 |
| XSS | `<script>`, `javascript:`, `on*=`, `<iframe>`, `<object>`, `<embed>` | Returns 400 |
| Email format | Django's `validate_email` | Returns 400 |
| Phone format | 10-15 digits, optional `+` prefix | Returns 400 |
| Input sanitization | `strip_tags` + `html.escape` + null byte removal | Applied on all string fields |

Note: `#` is intentionally NOT flagged (valid in hex color codes like `#3B82F6`).

---

## Query Optimizations & Caching

`query_optimizations.py` provides:

- `CRMQueryOptimizer.get_dashboard_stats_optimized(company)` — single DB round-trip using aggregations, cached.
- `CRMQueryOptimizer.get_sales_funnel_optimized(company)` — funnel data with caching.
- `CRMCacheManager` — Redis-backed cache invalidation per company.

Cache keys are namespaced by `company.id` to ensure tenant isolation.

---

## Known Issues Fixed (as of 2026-03-23)

| Issue | Root Cause | Fix |
|---|---|---|
| `GET /api/crm/dashboard/` → 500 | `viewsets.DashboardViewSet` extended `CompanyScopedModelViewSet` with no `serializer_class` and no `list()` override | Added `serializer_class = DashboardStatsSerializer` and `list()` override in `viewsets.py` |
| Color field 400 "Invalid characters" | `#` in hex colors matched SQL injection pattern `(--|#|/\*|\*/)` | Removed `#` from SQL injection regex |
| Account website 400 | `URLField` default `max_length=200` too short | Increased to `max_length=500` |
| CustomerInteraction 400 "may not be null" | `contact` and `account` were non-null FKs | Made both `null=True, blank=True` |
