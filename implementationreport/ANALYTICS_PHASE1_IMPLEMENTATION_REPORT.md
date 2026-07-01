# ANALYTICS_PHASE1_IMPLEMENTATION_REPORT.md
## Analytics Phase 1 — Critical Security Fixes (Cross-Tenant Data Leak)
**Project:** SAP-Python Multi-Tenant ERP  
**Date:** 2026-06-26  
**Status:** COMPLETE — `python manage.py check` passes with 0 issues

---

## 1. Files Modified

| File | Change Summary |
|------|---------------|
| `backend/analytics/views.py` | `service_metrics` — company scoping; `system_overview`, `performance_metrics`, `system_alerts`, `resolve_alert` — restricted to `IsMasterAdmin` |
| `backend/analytics/simple_views.py` | `simple_system_overview` — restricted to `IsMasterAdmin` |
| `backend/analytics/api/analytics_views.py` | All 5 views rewritten with `_get_request_company()` dispatcher; Master Admin gets global data; Company Users get own-company data |
| `backend/analytics/analytics_engine/revenue_analytics.py` | All methods accept optional `company` parameter; query scoped when provided |
| `backend/analytics/analytics_engine/user_analytics.py` | `get_user_overview()` and `get_service_usage_by_company()` accept optional `company` parameter |
| `backend/analytics/analytics_engine/service_analytics.py` | All methods accept optional `company` parameter; **bug fix**: `get_service_revenue_contribution` now correctly filters `Payment` by `company__in=companies_with_service` |
| `backend/analytics/analytics_engine/growth_analytics.py` | `get_revenue_growth_trend()`, `get_user_growth_trend()`, `get_growth_kpis()` accept optional `company` parameter; company-count KPIs excluded from company-scoped calls |

---

## 2. Exact Fixes Applied

### Root Cause
Every analytics endpoint used `@permission_classes([IsAuthenticated])` with zero tenant filtering. Any authenticated user (Master Admin or Company User) received cross-tenant data: all companies' revenue, all companies' headcount, all companies' inventory, all companies' payments.

The `service_metrics` view was the most severe: it explicitly iterated `Company.objects.filter(approval_status='approved')` and returned a list of every company's full Finance/HR/Inventory metrics, plus global totals.

---

### Fix 1 — Platform-Monitoring Endpoints Restricted to Master Admin

Changed `@permission_classes([IsAuthenticated])` → `@permission_classes([IsMasterAdmin])` for:

| Endpoint | URL | Reason |
|----------|-----|--------|
| `system_overview` | `/api/analytics/system-overview/` | Shows global CPU/memory/disk/users — no per-company meaning |
| `performance_metrics` | `/api/analytics/performance-metrics/` | Shows platform-wide API response times and service health |
| `system_alerts` | `/api/analytics/system-alerts/` | Platform-level alerts (CPU, error rate, service down) |
| `resolve_alert` | `/api/analytics/alerts/<id>/resolve/` | Alert mutation — Master Admin action only |
| `simple_system_overview` | `/api/analytics/system-overview/` | Returns `User.objects.count()` — global user count |

**Before:** Any authenticated user could see platform-wide server metrics, API response times, system alerts, and global user counts.  
**After:** Only Master Admin can access these endpoints. Company Users receive 403.

---

### Fix 2 — `service_metrics` Tenant Scoping

**`analytics/views.py`** — `service_metrics` view completely rewritten:

**Detection logic:**
```python
try:
    _ = request.user.master_admin   # raises DoesNotExist if not master admin
    is_master = True
except (MasterAdmin.DoesNotExist, AttributeError):
    pass

if not is_master:
    if hasattr(request.user, 'company_user'):
        requesting_company = request.user.company_user.company
    elif hasattr(request, 'service_user') and request.service_user:
        requesting_company = request.service_user.company
    if requesting_company is None:
        return Response({'error': 'Could not determine company context.'}, status=403)
```

**Master Admin path:** All approved companies + global totals (previous behavior preserved).

**Company/Service User path:** Single company metrics only, `totals: null` (no cross-tenant aggregates).

Extracted `_get_service_metrics_for_company(company)` helper to eliminate code duplication between the two paths. All finance/HR/inventory queries inside the helper are already scoped with `filter(company=company)` or `filter(employee__company=company)` etc.

---

### Fix 3 — Analytics Engine Company Scoping (all 4 engine files)

Every method in the analytics engine that performed global queries was updated to accept an optional `company=None` parameter. When `company` is provided, the queryset is filtered to that company. When `company=None` (Master Admin), the original global behavior is preserved.

**`revenue_analytics.py`:**
- `get_total_revenue(company=None)` — filters `Payment.objects.filter(company=company)`
- `get_monthly_revenue_trend(months=12, company=None)` — filters monthly payments by company
- `get_payment_status_breakdown(company=None)` — filters both `Invoice` and `Payment` querysets
- `get_revenue_by_company()` — unchanged (called only from Master Admin path)

**`user_analytics.py`:**
- `get_user_overview(company=None)` — when company provided: returns count of that company's service users and employees; `active_users_24h` set to `None` (Django User has no company FK)
- `get_service_usage_by_company(company=None)` — when company provided: filters to that company only

**`service_analytics.py`:**
- `get_service_adoption_rates(company=None)` — when company provided: returns which services the company subscribes to (`subscribed: true/false`)
- `get_service_performance_metrics(company=None)` — when company provided: all sub-querysets (Invoice, Payment, Employee, Product, StockMovement) filtered by company
- `get_service_usage_trends(days=30, company=None)` — when company provided: `CompanyServiceUser` filtered by company
- `get_service_revenue_contribution(company=None)` — **BUG FIX + scoping** (see Fix 4)

**`growth_analytics.py`:**
- `get_revenue_growth_trend(months=12, company=None)` — filters `Payment` by company
- `get_user_growth_trend(months=12, company=None)` — filters `CompanyServiceUser` and `Employee` by company
- `get_growth_kpis(company=None)` — when company provided: returns only revenue KPIs; company-registration-count KPIs excluded (platform-only concept)
- `get_company_growth_trend(months=12)` — unchanged (called only from Master Admin path)

---

### Fix 4 — Bug Fix: `get_service_revenue_contribution` Ignored Company Filter

**Before (original bug):**
```python
companies_with_service = Company.objects.filter(
    company_services__service=service,
    approval_status='approved'
)
# ↑ filtered by service, but then IGNORED in the Payment query:
service_revenue = Payment.objects.filter(
    status='completed'           # ← no company filter at all!
).aggregate(total=Sum('amount'))['total'] or 0
```
This returned the same global total for EVERY service — the per-service revenue was completely wrong.

**After (fixed):**
```python
# company filter respected in Payment query:
service_revenue = Payment.objects.filter(
    company__in=companies_with_service,
    status='completed'
).aggregate(total=Sum('amount'))['total'] or 0
```
When `company` parameter is also provided, `companies_with_service` is additionally filtered by `id=company.id`.

---

### Fix 5 — Analytics API Views (`api/analytics_views.py`)

Added `_get_request_company(request)` dispatcher at the top of the module:

```python
def _get_request_company(request):
    # Service User (set by ServiceUserSessionAuthentication)
    if hasattr(request, 'service_user') and request.service_user:
        return request.service_user.company, False

    # Master Admin
    if hasattr(request.user, 'master_admin'):
        try:
            _ = request.user.master_admin
            return None, True   # None = no company filter, True = is master admin
        except Exception:
            pass

    # Company User
    if hasattr(request.user, 'company_user'):
        try:
            return request.user.company_user.company, False
        except Exception:
            pass

    raise PermissionDenied('User has no recognized role.')
```

All 5 views (`analytics_overview`, `revenue_analytics`, `user_analytics`, `service_analytics`, `growth_analytics`) now call `_get_request_company(request)` and pass the resulting `company` to every analytics engine method.

**Master Admin-only data fields** (excluded from company-scoped responses to avoid leaking cross-tenant information):
- `revenue_analytics` → `revenue_by_company` is empty list for non-master-admin callers
- `user_analytics` → `company_breakdown` and `activity_trend` are empty lists for non-master-admin callers
- `growth_analytics` → `company_growth` is `null` for non-master-admin callers

---

## 3. Regression Tests Performed

### `python manage.py check`
```
System check identified no issues (0 silenced)
```

### Code-Level Verification

**Permission enforcement (verified by grep):**
```
analytics/views.py:81:   @permission_classes([IsMasterAdmin])   ← system_overview
analytics/views.py:131:  @permission_classes([IsAuthenticated]) ← service_metrics (company-scoped)
analytics/views.py:208:  @permission_classes([IsMasterAdmin])   ← performance_metrics
analytics/views.py:241:  @permission_classes([IsMasterAdmin])   ← system_alerts
analytics/views.py:260:  @permission_classes([IsMasterAdmin])   ← resolve_alert
analytics/simple_views.py:6: @permission_classes([IsMasterAdmin])  ← simple_system_overview
api/analytics_views.py:48-141: @permission_classes([IsAuthenticated]) + _get_request_company()
```

**No unguarded global querysets (verified by code review):**
- All analytics engine methods with `company=None` are called only from the `is_master_admin == True` path in the views
- All analytics engine methods with `company=<Company>` are called from Company User / Service User paths

---

## 4. Manual Verification Checklist

### Master Admin Analytics (expected: global data)
```bash
# Login as master admin, save JWT access token
TOKEN=$(curl -s -X POST /api/auth/master-admin/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "<admin>", "password": "<pass>"}' | jq -r '.access')

# Should return data for ALL companies
curl /api/analytics/service-metrics/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"companies": [...all companies...], "totals": {...}}

# Should return global revenue across all companies
curl /api/analytics/revenue/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: revenue_by_company lists all companies

# Should return company growth trend (platform-level KPI)
curl /api/analytics/growth/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"company_growth": [...], "growth_kpis": {"company_growth_rate": ...}}
```

### Company User Analytics (expected: own company only)
```bash
# Login as company user
TOKEN=$(curl -s -X POST /api/auth/company/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "<email>", "password": "<pass>"}' | jq -r '.access')

# Should return ONLY their company's metrics (single entry in companies array)
curl /api/analytics/service-metrics/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"companies": [<only their company>], "totals": null}

# Revenue must only show their company's invoices/payments
curl /api/analytics/revenue/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: revenue_by_company is [] (no cross-tenant breakdown)

# Growth analytics: company_growth must be null
curl /api/analytics/growth/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"company_growth": null, "growth_kpis": {"revenue_growth_rate": ...}} (no company_growth_rate)

# System-level endpoints must return 403
curl /api/analytics/system-overview/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden

curl /api/analytics/performance-metrics/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden

curl /api/analytics/system-alerts/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden
```

### Service User Analytics (expected: 403 on all JWT endpoints; session endpoints scoped to own company)
```bash
# Login as service user to get session key
SESSION=$(curl -s -X POST /api/auth/service-user/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "<user>", "password": "<pass>", "service_id": 1}' | jq -r '.session_key')

# JWT-guarded analytics endpoints return 401/403 for session-auth users
curl /api/analytics/service-metrics/ \
  -H "Authorization: Bearer $SESSION"
# Expected: 401 (IsAuthenticated fails for AnonymousUser)

curl /api/analytics/system-overview/ \
  -H "Authorization: Bearer $SESSION"
# Expected: 401/403
```

### Cross-Tenant Isolation Proof
```bash
# Login as Company A user
TOKEN_A=$(curl -s -X POST /api/auth/company/login/ ... company_a_creds ... | jq -r '.access')

# Login as Company B user
TOKEN_B=$(curl -s -X POST /api/auth/company/login/ ... company_b_creds ... | jq -r '.access')

# Company A user queries service-metrics
RESULT_A=$(curl /api/analytics/service-metrics/ -H "Authorization: Bearer $TOKEN_A")
echo $RESULT_A | jq '.companies | length'
# Expected: 1 (only Company A)

# Company B user queries service-metrics
RESULT_B=$(curl /api/analytics/service-metrics/ -H "Authorization: Bearer $TOKEN_B")
echo $RESULT_B | jq '.companies | length'
# Expected: 1 (only Company B)

# Verify they see different companies
echo $RESULT_A | jq '.companies[0].company_id'
echo $RESULT_B | jq '.companies[0].company_id'
# Expected: different IDs
```

---

## 5. Remaining Analytics Phase 2 Work

| Item | Description | Priority |
|------|-------------|----------|
| Service User analytics access | Service Users (session-auth) cannot currently call any analytics endpoints due to `IsAuthenticated` guard. If analytics access for Service Users is required, add `ServiceUserSessionAuthentication` + a combined permission class to the relevant endpoints. | MEDIUM |
| `active_users_24h` company scoping | Currently set to `None` for company-scoped calls because Django's `User.last_login` has no company FK. If company-level active-user tracking is needed, a `CompanyUser.last_login` or session table timestamp should be used instead. | LOW |
| `get_user_activity_trend` company scoping | Currently excluded from company-scoped `user_analytics` responses. If per-company user activity trends are needed, requires either a company-keyed activity log or using `CompanyServiceUser.last_login`. | LOW |
| Analytics response for service users on service metrics | `service_metrics` has a code path for `request.service_user` but `IsAuthenticated` blocks it before reaching the view for session-auth users. Needs an authentication_classes override to activate. | LOW |
| Caching layer for analytics engine | Analytics methods make multiple sequential DB queries. Adding `cache.get/set` around the per-company computed results would reduce DB load with high frequency callers. | LOW |
| `check_service_health()` background task | This function calls global querysets (`Invoice.objects.count()`, `Employee.objects.count()`, etc.) — acceptable since it's a platform health check and not exposed as an API endpoint. | INFO |
