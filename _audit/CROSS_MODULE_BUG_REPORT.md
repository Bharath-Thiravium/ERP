# CROSS_MODULE_BUG_REPORT.md
## Cross-Module Bug Report — Global ERP Audit
**Project:** SAP-Python Multi-Tenant ERP  
**Date:** 2026-06-26

---

## CRITICAL BUGS

---

### XBUG-C01 — Finance Views Use `AllowAny` — No Authentication Enforcement
**Severity:** CRITICAL  
**Modules:** Finance → Authentication  
**File:** `backend/finance/views.py:82–83` (and ~25 other view classes)

**Description:**  
All Finance API views use:
```python
authentication_classes = []  # Disable JWT authentication
permission_classes = [permissions.AllowAny]
```

DRF's request processing respects these settings, meaning:
- No authentication class processes the request
- DRF's `permission_classes` do not enforce any auth requirement
- The only "protection" is the manual session key validation each view does in its body

However, this manual validation in `get_queryset()` fails silently: when the session is invalid, it returns `Customer.objects.none()` (an empty queryset) rather than raising HTTP 401. A caller with no session key will receive HTTP 200 with an empty response — not HTTP 401 Unauthorized.

**Reproduction:**
```bash
curl /api/finance/customers/
# Returns: HTTP 200 {"count": 0, "results": []}
# Expected: HTTP 401 Unauthorized
```

**Business Impact:** The Finance API surface appears to have authentication but actually does not — any anonymous caller can make API requests. The HTTP 200 empty-response pattern could mask data access issues in monitoring.

---

### XBUG-C02 — Quotation → PO Creation Has No Transaction Boundary
**Severity:** CRITICAL  
**Modules:** Finance (internal)  
**File:** `backend/finance/views.py:1450–1465`

**Description:**  
When creating a Purchase Order from a Quotation, the code performs three sequential database operations outside any `transaction.atomic()` wrapper:

```python
# Step 1 — PO created
purchase_order = serializer.save(company=service_user.company, created_by=service_user)

# Step 2 — Quotation status updated (separate transaction)
if purchase_order.quotation:
    quotation.status = 'approved'
    quotation.po_created = True
    quotation.save()        # ← separate DB write, not atomic with Step 1

# Step 3 — PO status updated (third separate write)
purchase_order.status = 'active'
purchase_order.save(update_fields=['status'])  # ← another separate write
```

**Race condition scenario:**  
Two users simultaneously create a PO from the same Quotation:
- Both read `quotation.po_created = False`
- Both create their PO (two POs for one Quotation)
- Both update `quotation.po_created = True`
- Quotation's `is_editable()` check (models.py:1087) returns `False` too late

**Data integrity scenario:**  
If Step 1 succeeds but Step 2 fails (DB error, timeout), the PO exists in the database but the Quotation still shows `po_created=False`. The Quotation will appear editable and will allow creating another PO.

**Business Impact:** Duplicate Purchase Orders for the same Quotation lead to double procurement and accounting errors.

---

### XBUG-C03 — Analytics Module Exposes Cross-Tenant Financial Data
**Severity:** CRITICAL  
**Modules:** Analytics → Finance, HR, Inventory  
**Files:**  
- `backend/analytics/analytics_engine/revenue_analytics.py:11, 46, 63`
- `backend/analytics/analytics_engine/service_analytics.py:48, 61, 74`
- `backend/analytics/views.py:76` (`@permission_classes([IsAuthenticated])`)

**Description:**  
The Analytics engine contains functions that query across ALL companies without tenant isolation:

```python
# revenue_analytics.py:11 — No company filter
Payment.objects.filter(status='completed').aggregate(total=Sum('amount'))

# revenue_analytics.py:46 — No company filter  
Payment.objects.filter(status='completed', created_at__gte=...).aggregate(...)

# revenue_analytics.py:63 — No company filter
Payment.objects.filter(status='completed').count()
Invoice.objects.count()   # ALL companies

# service_analytics.py:61-75 — No company filter
Employee.objects.count()
Product.objects.count()
StockMovement.objects.count()
```

These are called from `analytics/views.py:service_metrics` and `system_overview` endpoints, which are protected only by `@permission_classes([IsAuthenticated])`. Any CompanyUser with a valid JWT token can call:
- `/api/analytics/service-metrics/` — receives revenue, employee counts, and inventory data from ALL companies
- `/api/analytics/system-overview/` — system-wide metrics including active user counts

**Business Impact:** Company A can see Company B's total revenue, employee count, and inventory size — critical confidential business data. This violates tenant data isolation fundamentally.

---

### XBUG-C04 — CRM `created_by` Field Uses Django `User` Model — Incompatible with Service User Auth
**Severity:** CRITICAL  
**Modules:** CRM → Authentication  
**Files:**  
- `backend/crm/models.py:60, 130, 208, 278, 281, 363, 414, 468, 478, 585`
- `backend/crm/views.py:27–28`

**Description:**  
CRM models define `created_by` as a FK to Django's `User` model:
```python
# crm/models.py:60
created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_leads')
```

But `CRMBaseViewSet` uses `ServiceUserSessionAuthentication` which sets:
```python
request.user = AnonymousUser()
```

When `CRMBaseViewSet.create()` (crm/views.py:63) attempts to create a CRM record with `created_by=request.user`, one of two things happens:
1. `AnonymousUser` is passed to a `ForeignKey(User)` field → Django raises `ValueError`
2. The serializer manually assigns `created_by` from the session user — but the FK expects a Django `User`, not a `CompanyServiceUser`

Any CRM record creation that assigns `created_by=request.user` will fail or create inconsistent data.

---

### XBUG-C05 — Duplicate `CompanyDetailView` Definition
**Severity:** HIGH  
**Modules:** Authentication (internal)  
**File:** `backend/authentication/views.py:266` and `2567`

**Description:**  
`class CompanyDetailView(RetrieveUpdateDestroyAPIView)` is defined twice in the same file:
- First definition: line 266
- Second definition: line 2567

Python silently uses the last definition (line 2567), making the first definition (line 266) dead code. This means:
- Any logic in the first `CompanyDetailView` (including its `perform_destroy` at line 332) may be completely different from the second definition
- The `destroy` method with the duplicate `return` statement at line 437 is in the first (dead) definition
- Developers editing the first definition believe they're changing production behavior, but they're editing dead code

Also affects: `mobile_logout` function (defined at lines 2302 AND 4631) and `test_no_auth` (lines 31 AND 2332).

---

### XBUG-C06 — Athens Project Tables Referenced via Raw SQL Not in Django ORM
**Severity:** HIGH  
**Modules:** Authentication → Unknown "Athens" module  
**File:** `backend/authentication/views.py:347–375`

**Description:**  
The company deletion `perform_destroy()` contains raw SQL targeting tables that are not registered as Django models in any installed app:

```python
cursor.execute("UPDATE athens_project SET created_by_id = NULL WHERE created_by_id = ANY(%s)", [service_user_ids])
cursor.execute("UPDATE athens_project SET approved_by_id = NULL WHERE approved_by_id = ANY(%s)", [service_user_ids])
cursor.execute("UPDATE athens_project_admin SET created_by_id = NULL ...", [...])
cursor.execute("UPDATE athens_project_admin SET approved_by_id = NULL ...", [...])
cursor.execute("UPDATE athens_project_admin SET service_user_id = NULL ...", [...])
cursor.execute("UPDATE athens_project_user SET created_by_id = NULL ...", [...])
cursor.execute("UPDATE athens_project_user SET service_user_id = NULL ...", [...])
```

These tables (`athens_project`, `athens_project_admin`, `athens_project_user`) are not in any of the installed apps listed in `INSTALLED_APPS`. This means:
- No Django migration manages these tables
- The tables may or may not exist in all environments
- If the tables don't exist, the raw SQL will raise `ProgrammingError` inside the deletion transaction, rolling back the entire company deletion

If these tables are part of an external or legacy system, their schema changes won't be tracked by Django migrations, creating a maintenance hazard.

---

### XBUG-C07 — Service Assignment to Company Does Not Block Access When Service is Deactivated
**Severity:** HIGH  
**Modules:** Authentication → Finance/HR/Inventory/CRM  
**File:** `backend/authentication/models.py:224`

**Description:**  
`CompanyService.is_active` field allows marking a service as inactive for a company. However:
1. Existing `ServiceUserSession` records for that service are NOT invalidated when `CompanyService.is_active` is set to `False`
2. `IsServiceUserAuthenticated` (permissions.py:34-54) does NOT check `company_service.is_active`
3. Views in Finance/HR/Inventory/CRM do NOT check the `CompanyService.is_active` flag

Result: If MasterAdmin revokes a service from a company (`CompanyService.is_active = False`), existing logged-in service users continue to have full access until they log out or their session is manually invalidated.

---

### XBUG-C08 — Inventory → HR Cross-Module FK Without Service Subscription Enforcement
**Severity:** HIGH  
**Modules:** Inventory → HR  
**File:** `backend/inventory/models.py:203, 794, 795, 928, 958`

**Description:**  
`Warehouse.manager = ForeignKey('hr.Employee', on_delete=SET_NULL)` requires HR employees to exist. But:
1. A company may subscribe to Inventory but NOT to HR
2. In that case, no `hr.Employee` records exist for the company
3. The `manager` field will always be NULL — no enforcement or warning
4. If a company has HR employees, assigns one as warehouse manager, then unsubscribes from HR and the employees are deleted, the warehouse loses its manager silently

No view, serializer, or model validates that the referenced HR employee belongs to the same company as the Warehouse.

---

### XBUG-C09 — Finance `get_session_key()` Accepts Session from POST Body
**Severity:** MEDIUM  
**Modules:** Finance  
**File:** `backend/finance/views.py:140–155`

**Description:**  
Finance views' `get_session_key()` implementation accepts the session key from three sources:
1. `Authorization` header (correct)
2. URL query parameter `?session_key=` (URL leakage)
3. POST request body `request.data.get('session_key')` (body leakage)

Session keys in POST body are:
- Stored in application logs if request logging is enabled
- Logged by Django's debug logging (DEBUG=True in development)
- Potentially captured by WAF/proxy body inspection

Other modules (HR, CRM, Inventory) do NOT accept session keys in POST body — this is Finance-specific.

---

### XBUG-C10 — Orchestrator Middleware Writes to DB on Every Request
**Severity:** MEDIUM  
**Modules:** Orchestrator (global middleware)  
**File:** `backend/orchestrator/middleware.py:6–21`  
**Settings:** `backend/sap_backend/settings.py:142`

**Description:**  
`OrchestratorMiddleware.process_request()` creates an `OrchestratorAgent()` and calls `start_workflow()` on every single HTTP request. `OrchestratorAgent.start_workflow()` creates a `WorkflowExecution` record in the database. `process_response()` updates it. This means every API call generates at least 2 additional DB writes to the orchestrator tables.

At scale (1000 req/sec), this generates 2000+ additional DB write operations per second, creating a potentially unrelated table as a write-amplification bottleneck.

**Note:** The `OrchestratorMiddleware` is listed AFTER `RateLimitMiddleware` in MIDDLEWARE stack, so rate-limited requests still pass through orchestrator before being rejected.

---

## BUG SUMMARY TABLE

| ID | Title | Severity | Modules |
|----|-------|----------|---------|
| XBUG-C01 | Finance `AllowAny` returns 200 on no-auth requests | CRITICAL | Finance |
| XBUG-C02 | Quotation→PO not in transaction (race condition) | CRITICAL | Finance |
| XBUG-C03 | Analytics exposes cross-tenant financial data | CRITICAL | Analytics→Finance/HR/Inventory |
| XBUG-C04 | CRM `created_by` incompatible with service user auth | CRITICAL | CRM→Auth |
| XBUG-C05 | Duplicate `CompanyDetailView` definition | HIGH | Authentication |
| XBUG-C06 | Athens project raw SQL tables not in Django ORM | HIGH | Authentication |
| XBUG-C07 | Service deactivation doesn't invalidate sessions | HIGH | Auth→All modules |
| XBUG-C08 | Inventory→HR FK without subscription enforcement | HIGH | Inventory→HR |
| XBUG-C09 | Finance accepts session key in POST body | MEDIUM | Finance |
| XBUG-C10 | Orchestrator writes DB on every request | MEDIUM | Orchestrator |
