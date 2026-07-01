# CRM Module — Optimization Report

**Audit date:** 2026-06-24  
**Method:** Read-only static analysis — no code was modified  
**Total optimization findings:** 13

---

## O1 — Dead Code: Seven Unused ViewSets in views.py

**File:** `backend/crm/views.py` (entire file is partially dead), `backend/crm/urls.py:3–6`  
**Severity:** HIGH  
**Category:** Code size / maintenance burden

**Evidence:**
```python
# urls.py:3–6 — imports these ViewSets from views.py:
from .views import (
    LeadViewSet, ContactViewSet, AccountViewSet, OpportunityViewSet,
    ActivityViewSet, CampaignViewSet, SalesTargetViewSet, DashboardViewSet
)

# urls.py:36–43 — BUT the router registers viewsets.* (not views.*)
router.register(r'leads', viewsets.LeadViewSet)
router.register(r'contacts', viewsets.ContactViewSet)
router.register(r'accounts', viewsets.AccountViewSet)
...
```

**Description:**  
`views.py` defines `LeadViewSet`, `ContactViewSet`, `AccountViewSet`, `OpportunityViewSet`, `ActivityViewSet`, `CampaignViewSet`, `SalesTargetViewSet` — all of which are imported in `urls.py` but never registered in the router. Only the versions in `viewsets.py` (inheriting `CompanyScopedModelViewSet`) are actually active. The `views.py` versions (inheriting `CRMBaseViewSet`) are compiled, imported, and held in memory on every process start — for zero benefit.

**Impact:**
- ~600 lines of live but unused code increasing cognitive load.
- Any bug fix applied to `viewsets.py` `LeadViewSet` is not applied to `views.py` `LeadViewSet` — divergence risk if they're ever accidentally reactivated.
- Django's URL resolution still imports both modules.

**Recommendation:** Delete the 7 unused ViewSets from `views.py`. Keep only `CRMBaseViewSet` (the base class) and `views.py`'s specializations that are actually registered: the old `views.py` file is still used indirectly as the base class for support/pipeline/analytics/security/reporting views.

---

## O2 — Double DB Session Lookup on Every Request

**File:** `backend/crm/views.py:31–49`, and every overridden action in child classes  
**Severity:** HIGH  
**Category:** Database query overhead

**Evidence:**
```python
# views.py:27–28 — DRF auth class queries ServiceUserSession:
authentication_classes = [ServiceUserSessionAuthentication]

# views.py:44–49 — get_queryset() ALSO queries ServiceUserSession:
def get_queryset(self):
    session_key = self.get_session_key()
    session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)  # 2nd query
    ...

# views.py:51–61 — list() ALSO queries ServiceUserSession:
def list(self, request, *args, **kwargs):
    session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)  # 3rd query
    ...
```

**Description:**  
For every request to a `CRMBaseViewSet` endpoint, `ServiceUserSession` is queried at minimum 3 times:
1. By `ServiceUserSessionAuthentication.authenticate()` (DRF auth class).
2. By `CRMBaseViewSet.get_queryset()`.
3. By the overridden method (`list`, `create`, `retrieve`, `update`, `destroy`).

**Impact:**  
3 redundant session table queries per request. For a sales team of 50 making 100 requests/minute, that is 300 extra `SELECT` queries per minute against the `ServiceUserSession` table. Session table becomes a hot-spot under load.

**Recommendation:**  
- Remove the manual session re-validation from `get_queryset()` and each method override.
- The `request.service_user` attribute (set by `ServiceUserSessionAuthentication`) contains the company. Use `request.service_user.company` directly.
- Example: `return self.queryset.filter(company=request.service_user.company)`.

---

## O3 — Pipeline Forecast Python Loop Over All Open Deals

**File:** `backend/crm/reporting_views.py:119`  
**Severity:** HIGH  
**Category:** N-operation Python computation

**Evidence:**
```python
# reporting_views.py:107–122
def _generate_pipeline_forecast(self, company):
    deals = Deal.objects.filter(company=company, status='open')
    stage_data = deals.values('current_stage__name').annotate(
        total_value=Sum('value'),
        weighted_value=Sum(F('value') * F('probability') / 100),  # ✅ DB aggregation
        count=Count('id')
    )
    
    return {
        'data': list(stage_data),
        'summary': {
            'total_pipeline': deals.aggregate(Sum('value'))['value__sum'] or 0,
            'weighted_pipeline': sum(deal.weighted_value for deal in deals),  # ❌ Python loop
            ...
        }
    }
```

**Description:**  
`stage_data` correctly uses `Sum(F('value') * F('probability') / 100)` for per-stage aggregation. But the summary `weighted_pipeline` uses a Python `sum()` generator over all open deals, loading every Deal ORM object into memory. `deal.weighted_value` is a Python property doing simple arithmetic — there is no reason this can't be done in SQL.

**Impact:**  
- At 1,000 open deals: fetches 1,000 Deal rows + 1,000 property evaluations in Python.
- At 10,000 open deals: 10,000 rows × (value + probability fields) loaded in RAM.

**Recommendation:**  
```python
# Replace:
'weighted_pipeline': sum(deal.weighted_value for deal in deals)

# With (already used above in stage_data):
'weighted_pipeline': deals.aggregate(
    weighted=Sum(F('value') * F('probability') / 100)
)['weighted'] or 0
```

---

## O4 — Deprecated `.extra()` SQL in Sales Performance Report

**File:** `backend/crm/reporting_views.py:75–80`  
**Severity:** MEDIUM  
**Category:** Deprecated API / portability

**Evidence:**
```python
# reporting_views.py:75–80
deals = Deal.objects.filter(company=company, status='won')
monthly_data = deals.extra(
    select={'month': 'EXTRACT(month FROM created_at)'}
).values('month').annotate(
    total_value=Sum('value'),
    count=Count('id')
).order_by('month')
```

**Description:**  
`.extra()` is a deprecated Django ORM method that injects raw SQL fragments. It was deprecated in Django 2.x and is scheduled for removal. It also bypasses Django's SQL parameterization for the injected fragments (though in this case the SQL is hardcoded, so there is no injection risk currently).

**Impact:**  
Will break when the project upgrades to a Django version that removes `.extra()`. Also incompatible with some database backends.

**Recommendation:**  
```python
from django.db.models.functions import ExtractMonth
monthly_data = deals.annotate(month=ExtractMonth('created_at')).values('month').annotate(...)
```

---

## O5 — `count() + 1` ID Generation Pattern Is Both a Race Condition and Produces Gaps

**File:** `backend/crm/serializers.py:180, 246, 290`  
**Severity:** MEDIUM  
**Category:** Data integrity + ID space management

**Evidence:**
```python
# serializers.py:180–181
ticket_count = Ticket.objects.filter(company=company).count() + 1
validated_data['ticket_id'] = f"{company.company_prefix}TKT{ticket_count:04d}"
```

**Description:**  
When a record is deleted, the count decreases — the next create reuses the same ID number that existed before the deletion. For example: delete TKT0005, then create a new ticket → `count()` = 4, new ticket_id = `TKT0005`. Two different tickets over time share the same ID.

**Impact:**  
- Ticket ID collisions on re-creation after deletion.
- Support history for a closed ticket (TKT0005) becomes mixed with a new ticket (also TKT0005).

**Recommendation:** Use a monotonically increasing sequence counter (Django `Sequence`, `SELECT MAX(id)` with locking, or UUID). The company-prefix approach is fine; just replace count with `select max(id) + 1`.

---

## O6 — No `select_related` in Core ViewSet Querysets

**File:** `backend/crm/viewsets.py:20–25`, `backend/crm/support_views.py:16–21`, and all other ViewSets  
**Severity:** MEDIUM  
**Category:** N+1 queries

**Evidence:**
```python
# viewsets.py:20
class LeadViewSet(CompanyScopedModelViewSet):
    queryset = Lead.objects.all()  # No select_related
    serializer_class = LeadSerializer
```

```python
# serializers.py:17–24 — LeadSerializer accesses:
assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
```

**Description:**  
`LeadSerializer` accesses `assigned_to.get_full_name` and `created_by.get_full_name` — two related User objects. For a list of 50 leads, this triggers 100 additional `SELECT` queries (2 per lead) unless `select_related('assigned_to', 'created_by')` is on the queryset.

The same issue affects:
- `ContactSerializer` → `created_by`
- `AccountSerializer` → `primary_contact`, `account_manager`, `created_by`
- `OpportunitySerializer` → `account`, `contact`, `owner`, `created_by`
- `TicketSerializer` → `contact`, `account`, `category`, `assigned_to`, `created_by`

`CRMQueryOptimizer` has `get_optimized_leads_queryset()` with `select_related` but it is only used by the Dashboard — not by `LeadViewSet.get_queryset()`.

**Recommendation:**  
Override `get_queryset()` in each ViewSet to apply `select_related`:
```python
class LeadViewSet(CompanyScopedModelViewSet):
    def get_queryset(self):
        return super().get_queryset().select_related('assigned_to', 'created_by')
```

---

## O7 — CustomerHealthScore Scoped via JOIN Instead of Direct company FK

**File:** `backend/crm/analytics_views.py:77–87`, `backend/crm/models.py:896–948`  
**Severity:** MEDIUM  
**Category:** Query performance

**Evidence:**
```python
# analytics_views.py:77–87
def get_queryset(self):
    session_key = self.get_session_key()
    ...
    return self.queryset.filter(account__company=company)  # JOIN needed
```

**Description:**  
`CustomerHealthScore` has no direct `company` FK. Every queryset lookup requires a JOIN from `CustomerHealthScore` → `Account` → `company`. For a list operation with 200 accounts, this is a 3-table query every time.

**Impact:**  
Slightly slower queries for health score reads. Query plan cannot use the `company_id` index on `crm_account` unless the optimizer decides on a nested loop join.

**Recommendation:**  
Add `company = models.ForeignKey(Company, on_delete=models.CASCADE)` to `CustomerHealthScore` and populate it via a data migration. Then filter directly by `company`.

---

## O8 — Dashboard Cache Does Not Invalidate on Data Changes

**File:** `backend/crm/query_optimizations.py:84–134`  
**Severity:** MEDIUM  
**Category:** Stale data / cache consistency

**Evidence:**
```python
# query_optimizations.py:84–134
cache_key = f"crm_dashboard_stats_{company.id}"
cached_stats = cache.get(cache_key)
if cached_stats:
    return cached_stats
...
cache.set(cache_key, stats, 300)  # 5-minute TTL
```

**Description:**  
Dashboard stats are cached for 5 minutes with no cache invalidation on data changes. A salesperson who creates 5 leads in 30 seconds sees the same total_leads count until the 5-minute TTL expires. More critically, if the cache backend is shared across workers and a worker restarts, the cache may be lost mid-TTL, causing a cache miss burst.

**Impact:**  
- Salespeople see stale dashboard data during active selling periods.
- A new deal closed won is not reflected in the dashboard for up to 5 minutes.

**Recommendation:**  
Invalidate the cache key on Lead/Opportunity/Account create/update/delete via a Django signal or by calling `cache.delete(f"crm_dashboard_stats_{company.id}")` at the end of each write ViewSet action.

---

## O9 — `Deal.days_in_stage` Property Triggers N Queries in Lists

**File:** `backend/crm/models.py:792–797`  
**Severity:** MEDIUM  
**Category:** N queries per object

**Evidence:**
```python
# models.py:792–797
@property
def days_in_stage(self):
    latest_history = self.stage_history.filter(
        stage=self.current_stage
    ).order_by('-changed_at').first()
    if latest_history:
        return (timezone.now().date() - latest_history.changed_at.date()).days
    return 0
```

**Description:**  
`DealSerializer` includes `days_in_stage = serializers.IntegerField(read_only=True)`. Accessing this property triggers one DB query per Deal in a list view. For a pipeline list of 100 deals, this generates 100 additional queries for `DealStageHistory`.

**Impact:**  
`GET /crm/deals/` with 100 results: 1 query for deals + 100 queries for stage history = 101 total queries.

**Recommendation:**  
Annotate `days_in_stage` in the queryset using a subquery:
```python
from django.db.models import OuterRef, Subquery
latest_history = DealStageHistory.objects.filter(
    deal=OuterRef('pk'),
    stage=OuterRef('current_stage')
).order_by('-changed_at').values('changed_at')[:1]

deals = Deal.objects.annotate(stage_entry_date=Subquery(latest_history))
```

---

## O10 — `ActivityViewSet.complete()` Calls AI Engine Synchronously

**File:** `backend/crm/viewsets.py:309–318`  
**Severity:** MEDIUM  
**Category:** Response latency

**Evidence:**
```python
# viewsets.py:309–318
activity.save()

if activity.description or activity.outcome:
    from .lead_scoring import AIAnalyticsEngine
    ai_engine = AIAnalyticsEngine(activity.company)
    analysis = ai_engine.analyze_conversation_intelligence(activity)
    if analysis:
        pass  # Result is discarded
```

**Description:**  
The `complete()` action:
1. Saves the activity (fast).
2. Initializes the AI analytics engine.
3. Calls `analyze_conversation_intelligence()` synchronously.
4. Discards the result (`pass`).

The AI call is blocking, potentially expensive (NLP or LLM call), and the result is thrown away. The API response is held until the AI call completes.

**Impact:**  
`POST /crm/activities/{id}/complete/` response time is dominated by the AI call. The AI result is unused.

**Recommendation:**  
Either (a) remove the call entirely if the result is discarded, or (b) dispatch to a Celery task: `analyze_conversation_task.delay(activity.id)`.

---

## O11 — No Indexes on High-Cardinality Filter Fields in CRM Models

**File:** `backend/crm/models.py` (meta indexes section)  
**Severity:** MEDIUM  
**Category:** Query performance

**Evidence — Lead model:**
```python
# models.py:70–76
class Meta:
    indexes = [
        models.Index(fields=['lead_id']),
        models.Index(fields=['email']),
        models.Index(fields=['company', 'status']),
        models.Index(fields=['assigned_to', 'priority']),
    ]
```

Lead has indexes. But checking other models:
- `Contact`: No `Meta.indexes` defined — no index on `email`, `is_active`, `company`.
- `Account`: No `Meta.indexes` — no index on `account_type`, `is_active`, `company`.
- `Opportunity`: No `Meta.indexes` — no index on `stage`, `expected_close_date`, `company`.
- `Activity`: No `Meta.indexes` — no index on `due_date`, `status`, `company`.
- `Ticket`: No `Meta.indexes` — no index on `status`, `priority`, `company`.

**Impact:**  
The most common CRM queries (`GET /crm/opportunities/?stage=prospecting`, `GET /crm/activities/?status=planned&due_date__lt=now`) trigger full table scans on large datasets. At 100,000 records these scans are slow (seconds, not milliseconds).

**Recommendation:**  
Add indexes to the most-queried filter fields on each model. Minimum:
- `Opportunity`: `[company, stage]`, `[owner, stage]`, `[expected_close_date]`
- `Activity`: `[company, status]`, `[due_date, status]`
- `Contact`: `[company, is_active]`
- `Ticket`: `[company, status]`, `[company, priority]`

---

## O12 — `EmailTemplate.html_content` TextField Not Compressed

**File:** `backend/crm/phase3_models.py:24`  
**Severity:** LOW  
**Category:** Storage / bandwidth

**Evidence:**
```python
html_content = models.TextField()
```

**Description:**  
Email template HTML content is stored as an uncompressed TextField. Rich HTML email templates can be 50–200 KB each. For a company with 100 email templates, this is 5–20 MB of uncompressed HTML in the database, fetched in its entirety on every template list or detail view.

**Recommendation:**  
Apply gzip compression before storage (using `django-compress-field` or a custom compress-on-save) or use object storage (S3/GCS) for large template bodies. Return a pre-signed URL from the list endpoint and only fetch full content on individual detail retrieval.

---

## O13 — Duplicate Audit/Session Lookup Pattern Repeated Across 6 View Files

**File:** `views.py`, `support_views.py`, `pipeline_views.py`, `analytics_views.py`, `security_views.py`, `reporting_views.py`  
**Severity:** LOW  
**Category:** Code duplication / maintainability

**Pattern found in 6+ files:**
```python
session_key = self.get_session_key()
if not session_key:
    return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
try:
    session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
    company = session.service_user.company
except ServiceUserSession.DoesNotExist:
    return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
```

This 8-line block is copy-pasted into ~40 individual action methods across 6 files.

**Impact:**  
- 320+ lines of duplicated boilerplate.
- If the session authentication logic needs to change (e.g., add expiry check), it must be updated in 40 places.

**Recommendation:**  
Extract into a helper method or decorator on `CRMBaseViewSet`:
```python
def get_session_company(self):
    """Returns (session, company) or raises NotAuthenticated."""
    session_key = self.get_session_key()
    if not session_key:
        raise NotAuthenticated('Session key required')
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        return session, session.service_user.company
    except ServiceUserSession.DoesNotExist:
        raise NotAuthenticated('Invalid session')
```
