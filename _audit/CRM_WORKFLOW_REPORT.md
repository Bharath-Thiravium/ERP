# CRM Module — Workflow Report

**Audit date:** 2026-06-24  
**Scope:** 21 workflow areas across all `backend/crm/` source files

---

## Workflow Area 1: Lead Management

| Dimension | Status | Finding |
|-----------|--------|---------|
| Create lead | ✅ | `LeadViewSet.create()` via `CRMBaseViewSet` — company injected |
| Auto-generate lead_id | ⚠️ | `Lead.save()` (models.py:83–97) generates ID; no `select_for_update()` |
| List leads | ✅ | Scoped to session company |
| Update lead | ✅ | Session company re-applied on update |
| Delete lead | ✅ | Scoped delete |
| Search/filter | ✅ | `DjangoFilterBackend`, `SearchFilter` on `first_name`, `last_name`, `email`, `company_name` |
| AI Lead Score | ✅ | `LeadViewSet.calculate_score()` (viewsets.py:29–50) |
| Smart Prioritization | ✅ | `LeadViewSet.smart_prioritization()` (viewsets.py:52–75) |

**Flow:** `POST /crm/leads/` → `CRMBaseViewSet.create()` validates session → injects company → calls serializer → `Lead.save()` auto-generates lead_id → response.

**Issue:** Lead ID fallback in `models.py:89` uses `order_by('-id').first()` — race condition on concurrent creates yields duplicate LEAD- numbers before the unique constraint catches it, causing an unhandled `IntegrityError`.

---

## Workflow Area 2: Lead Sources

| Dimension | Status | Finding |
|-----------|--------|---------|
| Source choices | ✅ | 8 hardcoded: website, referral, social_media, email_campaign, cold_call, trade_show, advertisement, other |
| Filtering by source | ✅ | `filterset_fields = ['source']` |
| Source analytics | ✅ | `_generate_lead_analysis()` in reporting_views.py:91–105 aggregates by source |
| Custom sources | ❌ | No per-company custom source configuration |

**Flow:** Source is a choice field on Lead. No custom-source model exists — source values are fixed in the codebase.

---

## Workflow Area 3: Lead Assignment

| Dimension | Status | Finding |
|-----------|--------|---------|
| Assign to user | ⚠️ | `assigned_to = FK(User)` — no company scope validation on the User FK |
| Auto-assign on create | ⚠️ | `CRMBaseViewSet.create()` (views.py:122–140): if `assigned_to` not provided, sets it to `service_user.created_by` (the superuser fallback) |
| Reassign | ✅ | PATCH /leads/{id}/ with `assigned_to` |
| Filter by assignee | ✅ | `filterset_fields = ['assigned_to']` |

**Issue:** `assigned_to` FK accepts any Django User ID — it is possible to assign a lead to a user from a different tenant company. The serializer does not restrict the `assigned_to` queryset to the current company.

---

## Workflow Area 4: Lead Status Workflow

| Dimension | Status | Finding |
|-----------|--------|---------|
| Status transitions | ⚠️ | No enforced state machine; any status can jump to any status |
| Available statuses | ✅ | new → contacted → qualified → proposal → negotiation → won / lost |
| Conversion status | ⚠️ | Lead.status is set to `'won'` on conversion (viewsets.py:141) — no dedicated `'converted'` state |
| Status filtering | ✅ | `filterset_fields = ['status']` |
| Last contacted tracking | ✅ | `last_contacted` DateTimeField |

**Gap:** There is no `'converted'` status. When a lead is converted to an opportunity via `POST /leads/{id}/convert_to_opportunity/`, the lead's status is set to `'won'` (viewsets.py:141). A lead that was converted but the resulting opportunity then closed lost cannot be semantically distinguished from a lead that was directly won.

---

## Workflow Area 5: Contact Management

| Dimension | Status | Finding |
|-----------|--------|---------|
| Create | ✅ | Company-scoped |
| Auto-generate contact_id | ⚠️ | Same race condition as lead_id (models.py:153–161) |
| Link to Account | ✅ | `Account.primary_contact = FK(Contact)` |
| Link to Activity | ✅ | `Activity.contact = FK(Contact)` |
| Soft delete | ✅ | `is_active = BooleanField` |
| Search | ✅ | `first_name`, `last_name`, `email`, `job_title`, `department` |

---

## Workflow Area 6: Account/Customer Management

| Dimension | Status | Finding |
|-----------|--------|---------|
| Create account | ✅ | Company-scoped |
| Account types | ✅ | prospect, customer, partner, vendor |
| View opportunities | ✅ | `AccountViewSet.opportunities()` action (viewsets.py:182–188) |
| View activities | ✅ | `AccountViewSet.activities()` action (viewsets.py:190–196) |
| Customer health score | ✅ | `CustomerHealthScore` OneToOne to Account |
| Annual revenue / employee count | ✅ | Fields present |

**Issue:** `AccountViewSet.opportunities()` calls `account.opportunities.all()` (viewsets.py:186) — this traverses the reverse FK without any explicit company filter. Because the account itself is already company-scoped (from `get_object()` which uses company-scoped queryset), the opportunities returned will belong to the same company. However, if the FK is ever set cross-company in another code path, this bypasses the check.

---

## Workflow Area 7: Opportunity Management

| Dimension | Status | Finding |
|-----------|--------|---------|
| Create opportunity | ✅ | Company-scoped |
| Stage progression | ✅ | `update_stage` action (viewsets.py:232–246) |
| Pipeline view | ✅ | `pipeline()` action aggregates by stage |
| Forecast | ✅ | `forecast()` action calculates weighted values |
| Link to Account | ⚠️ | Unscoped FK — can reference account from other company |
| Link to Contact | ⚠️ | Unscoped FK — can reference contact from other company |
| Weighted amount | ✅ | `opportunity.weighted_amount` property (models.py:318–320) |
| Close date tracking | ✅ | Auto-set `closed_date` when stage = closed_won/lost |

**Flow:** `POST /crm/opportunities/` → company injected → `OpportunitySerializer.create()` → `Opportunity.save()` auto-generates opportunity_id → response.

---

## Workflow Area 8: Pipeline Stages

| Dimension | Status | Finding |
|-----------|--------|---------|
| Configurable stages | ✅ | `PipelineStage` model with per-company stages |
| Default stages | ✅ | `PipelineStageViewSet.list()` auto-creates 7 default stages if none exist |
| Stage ordering | ✅ | `order` IntegerField; `unique_together = ['company', 'order']` |
| Stage probability | ✅ | `probability` field per stage |
| Stage color | ✅ | Hex color field |
| Deal-to-stage link | ⚠️ | `Deal.current_stage = FK(PipelineStage)` — no company scope on FK |

**Flow for first access:** `GET /crm/pipeline-stages/` → `PipelineStageViewSet.list()` checks if company has stages → if not, creates 7 default ones → returns list.

---

## Workflow Area 9: Activity Tracking

| Dimension | Status | Finding |
|-----------|--------|---------|
| Activity types | ✅ | call, email, meeting, task, note, demo, proposal |
| Today's activities | ✅ | `ActivityViewSet.today()` action |
| Overdue activities | ✅ | `ActivityViewSet.overdue()` action |
| Mark complete | ✅ | `ActivityViewSet.complete()` action — sets `completed_at` |
| Conversation analysis | ✅ | `analyze_conversation()` — calls AI engine |
| Link to Lead/Contact/Account/Opportunity | ✅ | Four optional FK fields |

---

## Workflow Area 10: Notes & Comments

| Dimension | Status | Finding |
|-----------|--------|---------|
| Dedicated Note model | ❌ | No standalone Note or Comment model found |
| Notes via Activity | ✅ | Activity type `'note'` exists |
| Lead description | ✅ | `Lead.description` text field |
| Ticket comments | ❌ | `Ticket` model has no comment/thread model |
| Knowledge base articles | ✅ | `KnowledgeBase` model for support articles |

**Gap:** There is no dedicated Note/Comment thread model in the CRM. Notes are recorded as Activity records with `activity_type='note'`. Ticket conversations/replies are not modeled.

---

## Workflow Area 11: Follow-up Management

| Dimension | Status | Finding |
|-----------|--------|---------|
| Follow-up activities | ✅ | Activity of type 'task' or 'call' with `due_date` |
| Calendar integration | Partial | `CalendarIntegrationManager.create_followup_event()` called from `Lead.save()` when status='contacted' (models.py:101–103) |
| Overdue follow-ups | ✅ | `ActivityViewSet.overdue()` |
| Reminders | Partial | `AutomationWorkflow` model in phase3_models.py; actual scheduling not verified |

---

## Workflow Area 12: Task Management

| Dimension | Status | Finding |
|-----------|--------|---------|
| Task creation | ✅ | Activity with `activity_type='task'` |
| Task assignment | ✅ | `Activity.assigned_to = FK(User)` |
| Due dates | ✅ | `Activity.due_date = DateTimeField` |
| Task duration | ✅ | `duration_minutes = IntegerField` |
| Task completion | ✅ | `ActivityViewSet.complete()` marks completed_at |
| Task status | ✅ | planned / in_progress / completed / cancelled |

---

## Workflow Area 13: Reminders & Notifications

| Dimension | Status | Finding |
|-----------|--------|---------|
| Push notifications | Partial | `MobileDevice.push_token` field; actual notification dispatch not verified |
| Email automation | Partial | `AutomationWorkflow` model with trigger types; execution not verified |
| SLA breach alerts | Partial | `Ticket.is_overdue` property; no alert dispatch code found |
| Calendar follow-ups | Partial | `CalendarIntegrationManager` called from model save |

**Gap:** While the data model supports reminders and notifications, the actual dispatch code (task queue, signal handlers) was not found in the files reviewed. No Django signals or Celery tasks were found in CRM source files.

---

## Workflow Area 14: Sales Dashboard

| Dimension | Status | Finding |
|-----------|--------|---------|
| Dashboard stats | ✅ | `CRMQueryOptimizer.get_dashboard_stats_optimized()` |
| 5-minute cache | ✅ | `cache.set(cache_key, stats, 300)` (query_optimizations.py:134) |
| Total leads | ✅ | Aggregated |
| Pipeline value | ✅ | Aggregated (open stages only) |
| Activities today | ✅ | Aggregated |
| Overdue activities | ✅ | Aggregated |
| is_global_model flag | ⚠️ | `DashboardViewSet.is_global_model = True` (viewsets.py:428) — intent is to bypass queryset, but may bypass security checks in parent class |

---

## Workflow Area 15: CRM Reports

| Dimension | Status | Finding |
|-----------|--------|---------|
| Report templates | ✅ | `ReportTemplate` model (phase3_models.py) |
| Sales performance | ✅ | `_generate_sales_performance()` — DB aggregation |
| Lead analysis | ✅ | `_generate_lead_analysis()` — by status and source |
| Pipeline forecast | ✅ | `_generate_pipeline_forecast()` — by stage with weighted values |
| Export formats | Partial | CSV implemented; PDF/Excel mentioned but not verified |
| Session key in export URL | ❌ | `export_url` embeds session_key in query string (reporting_views.py:55) |
| Download action | ⚠️ | `download()` reads session_key from GET param (reporting_views.py:127) |

---

## Workflow Area 16: Tenant Isolation

| Dimension | Status | Finding |
|-----------|--------|---------|
| Company FK on all models | ✅ | Present on all core models |
| QuerySet scoping | ✅ | Both `CompanyScopedModelViewSet` and `CRMBaseViewSet` filter by company |
| CustomerHealthScore scoping | ⚠️ | Uses `filter(account__company=company)` join — no direct company FK |
| FK cross-tenant references | ⚠️ | `Opportunity.account`, `Opportunity.contact`, `Deal.current_stage`, `Deal.account` — no company constraint at DB or serializer level |

---

## Workflow Area 17: Permission Enforcement

| Dimension | Status | Finding |
|-----------|--------|---------|
| Authentication | ✅ | `ServiceUserSessionAuthentication` on all ViewSets |
| Authorization | ✅ | `IsServiceUserAuthenticated` on all ViewSets |
| Role-based access | ❌ | No role/permission checks beyond "is authenticated" |
| Action-level permissions | ❌ | No per-action permission differentiation |

---

## Workflow Area 18: Data Ownership

| Dimension | Status | Finding |
|-----------|--------|---------|
| created_by tracking | ✅ | Present on all core models |
| created_by accuracy | ⚠️ | Falls back to Django superuser when `service_user.created_by` unset (views.py:106–112) |
| owner field | ✅ | `Opportunity.owner`, `Deal.owner` track responsible sales user |
| Audit log | Partial | `DataAuditLog` model exists but write path not verified |

---

## Workflow Area 19: Lead Conversion Workflow

**Flow (viewsets.py:77–150 and views.py:310–400):**

```
POST /crm/leads/{id}/convert_to_opportunity/
    │
    ├── Validate session
    ├── Get lead (company-scoped)
    ├── Check lead.status != 'won'
    │
    ├── Create Account
    │   AccountSerializer.create()
    │   account.company = lead.company  ✅
    │
    ├── Create Contact
    │   ContactSerializer.create()
    │   contact.company = lead.company  ✅
    │
    ├── Create Opportunity
    │   OpportunitySerializer.create()
    │   opportunity.company = lead.company  ✅
    │   opportunity.amount = lead.estimated_value or 0
    │
    └── lead.status = 'won'  ⚠️ (no 'converted' status)
        lead.save()
```

| Dimension | Status | Finding |
|-----------|--------|---------|
| Atomic transaction | ❌ | No `transaction.atomic()` — partial creates possible if Opportunity creation fails after Account creation |
| Company scope | ✅ | Company is set from lead.company on all created objects |
| created_by | ⚠️ | Uses superuser fallback (views.py:333–338) |
| Duplicate account/contact | ❌ | No check for existing account/contact with same email — creates duplicates |
| Post-conversion status | ⚠️ | 'won' is semantically wrong for conversion |

---

## Workflow Area 20: Duplicate Detection

| Dimension | Status | Finding |
|-----------|--------|---------|
| Lead duplicate check | ❌ | No duplicate detection code found |
| Contact duplicate check | ❌ | No duplicate detection code found |
| Account duplicate check | ❌ | No duplicate detection code found |
| Email uniqueness per company | ❌ | No `unique_together = ['company', 'email']` on Lead or Contact |
| Name uniqueness | ❌ | Not enforced |

**Gap:** Duplicate detection is entirely absent from the CRM module. No model constraint, no pre-save check, no API endpoint. Two identical leads with the same email can be created in the same company.

---

## Workflow Area 21: Audit Logging

| Dimension | Status | Finding |
|-----------|--------|---------|
| DataAuditLog model | ✅ | Exists in phase4_models.py |
| Audit log ViewSet | ✅ | `DataAuditLogViewSet` — company-scoped via `CRMBaseViewSet` |
| Audit log write path | ❌ | No Django signal, model `save()` hook, or explicit `DataAuditLog.objects.create()` call found in any CRM view code |
| Audit log dashboard | ✅ | `DataAuditLogViewSet.dashboard()` action aggregates existing logs |

**Gap:** The `DataAuditLog` model and ViewSet exist but there is no code that writes to it. No Django signal (post_save, post_delete) was found connected to `DataAuditLog.objects.create()`. The audit log is present in the schema but non-functional as an audit trail.
