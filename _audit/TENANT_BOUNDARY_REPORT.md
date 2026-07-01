# TENANT_BOUNDARY_REPORT.md
## Tenant Boundary & Cross-Tenant Access Audit
**Project:** SAP-Python Multi-Tenant ERP  
**Date:** 2026-06-26

---

## 1. Tenant Architecture Summary

The system uses **company-level multi-tenancy** with a shared PostgreSQL database. All tenant data is segregated by a `company` ForeignKey column present in every module's models. There is no schema-per-tenant or database-per-tenant isolation.

**Tenant identity resolution per auth type:**
- **MasterAdmin (JWT):** Global — no company scoping; accesses all companies
- **CompanyUser (JWT):** `request.user.company_user.company` — set by JWT auth
- **ServiceUser (session):** `request.service_user.company` — set at session creation

---

## 2. Module-Level Tenant Isolation Assessment

### 2.1 HR Module — PASS
**File:** `backend/hr/views.py:108–140`  
All HR views use `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated`. `get_queryset()` filters by `company=self.request.service_user.company`. `perform_create()` injects `company=service_user.company` automatically.

```python
# hr/views.py:131
return Employee.objects.filter(company=service_user.company)...
```
No cross-tenant access vectors found.

### 2.2 Inventory Module — PASS (with caveat)
**File:** `backend/inventory/views.py` (uses `CompanyScopedModelViewSet`)  
All Inventory views extend `CompanyScopedModelViewSet` which enforces company filtering in `get_queryset()` and company injection in `perform_create()`.

**Caveat:** `Warehouse.manager` FK to `hr.Employee` has no tenant cross-check — the warehouse and the employee could belong to different companies if a caller bypasses normal validation. No `validate()` method in the Inventory serializer verifies `manager.company == warehouse.company`.

### 2.3 Finance Module — PASS (with performance concern)
**File:** `backend/finance/views.py`  
Each Finance view independently validates the session and explicitly filters: `Customer.objects.filter(company=service_user.company)`. Tenant isolation is enforced manually in each view.

**Performance concern:** Every Finance request performs 1–3 `ServiceUserSession` database lookups (in `get_queryset()`, `perform_create()`, and sometimes `create()`) rather than using the centralized session established by `ServiceUserSessionAuthentication`.

**URL session key concern:** `get_session_key()` (finance/views.py:137–155) also reads from URL query param `?session_key=` and from POST body `request.data.get('session_key')` — expanding the attack surface beyond what other modules allow.

### 2.4 CRM Module — CONDITIONAL PASS
**File:** `backend/crm/views.py:39–49`  
`CRMBaseViewSet.get_queryset()` filters by company from the session:
```python
session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
company = session.service_user.company
return self.queryset.filter(company=company)
```

**Gap 1:** `CRMBaseViewSet.get_queryset()` is overridden by each subclass viewset. If a subclass doesn't call `super().get_queryset()`, the company filter is lost.

**Gap 2:** The manual session re-query in `list()`, `create()`, and `get_queryset()` (three separate `ServiceUserSession.objects.get()` calls per list/create request) creates redundant DB hits and inconsistency risk — the session could change state between calls.

### 2.5 Reports Module — PASS
**File:** `backend/reports/views.py:103–110`  
Each report viewset validates the session and filters by `company=session.service_user.company`.

**URL session key concern:** `session_key = self.request.query_params.get('session_key')` (reports/views.py:100) — same URL leakage risk as Finance.

### 2.6 Company Dashboard Module — CONDITIONAL PASS
The company_dashboard module has mixed authentication (some views use JWT CompanyUser auth, some use session auth). `is_ip_allowed()` in `geolocation_views.py` enforces company-level IP restrictions correctly, using the JWT-auth company identity.

### 2.7 Analytics Module — FAIL (Cross-Tenant Leak)
**Files:**  
- `backend/analytics/analytics_engine/revenue_analytics.py:11, 46, 63`
- `backend/analytics/analytics_engine/service_analytics.py:48, 61, 74`
- `backend/analytics/views.py:76`

**Findings:**

**`GET /api/analytics/service-metrics/`** (views.py:76-172):
```python
@permission_classes([IsAuthenticated])
def service_metrics(request):
    companies = Company.objects.filter(approval_status='approved')
    for company in companies:
        # Returns per-company Finance, HR, Inventory metrics
        companies_data.append({
            'company_id': company.id, 'company_name': company.name,
            'finance': finance_data,   # Includes: total_invoices, total_revenue, pending_payments
            'hr': hr_data,             # Includes: total_employees, on_leave, recent_hires
            'inventory': inventory_data # Includes: total_products, low_stock, out_of_stock
        })
    # Also provides totals ACROSS ALL COMPANIES
```

- `@permission_classes([IsAuthenticated])` allows any authenticated user — CompanyUser, MasterAdmin, or any JWT user
- Returns revenue figures, employee counts, and inventory data for EVERY company in the system
- This is a MasterAdmin dashboard function exposed as a CompanyUser-accessible endpoint

**`GET /api/analytics/system-overview/`** (views.py:20):
```python
@permission_classes([IsAuthenticated])
def system_overview(request):
    active_users = User.objects.filter(last_login__gte=...).count()  # All users
    return Response({'active_users': active_users, ...})
```
- Returns system-wide metrics (total active users, CPU, memory) to any authenticated user

**`RevenueAnalytics` class** (revenue_analytics.py):
- `get_total_revenue()` → aggregate across all companies
- `get_revenue_by_company()` → per-company breakdown (all companies)
- `get_monthly_revenue_trend()` → global trend (no company filter)
- `get_payment_status_breakdown()` → global payment counts

---

## 3. Cross-Tenant Foreign Key Ownership Analysis

### 3.1 Company Ownership Verification in `get_object()`

`CompanyScopedModelViewSet.get_object()` (common/viewsets.py:170-190) verifies:
```python
if obj_company != user_company:
    raise Http404("Object not found")
```

This is correct and prevents cross-tenant object access for modules using `CompanyScopedModelViewSet`. However:

**Modules NOT using `CompanyScopedModelViewSet`:**
- Finance (uses manual validation)
- CRM (uses `CRMBaseViewSet` with manual validation)
- HR (uses manual validation in each view)
- Reports (uses manual validation)

For Finance, each `get_queryset()` correctly filters by company, so object retrieval by URL ID will only return objects within the company's queryset. This is correct but requires discipline per view.

### 3.2 Nested Object Cross-Tenant Risk

**Finance Invoice → Customer FK:**  
`Invoice.customer = ForeignKey(Customer, on_delete=CASCADE)`.  
Finance views validate the session company but do NOT validate that `customer.company == service_user.company`. A specially crafted POST request could create an Invoice linking to a Customer from a different company.

**Reproduction (theoretical):**
```bash
POST /api/finance/invoices/
Authorization: Bearer <CompanyA_session_key>
{"customer_id": <customer_id_from_CompanyB>, "company": <CompanyA_id>, ...}
```
If the Finance serializer doesn't validate `customer.company == service_user.company`, this creates a cross-tenant Invoice.

**CRM Activity → Lead/Contact/Account:**  
`Activity` has FKs to `Lead`, `Contact`, `Account`, `Opportunity` — all from the same company. `CRMBaseViewSet.get_queryset()` filters at the top-level model, but nested FK targets are not cross-validated.

---

## 4. Privilege Escalation via Analytics

**Scenario:** CompanyUser from Company A (Revenue: ₹100,000) wants to know Company B's financials.

1. Company A user logs into the main dashboard
2. Calls `GET /api/analytics/service-metrics/` with their JWT
3. Receives a JSON response containing:
   - Company B's total invoices, revenue, pending payments
   - Company B's employee count
   - Company B's inventory and stock alerts
4. No 403 or 404 is raised — full data returned

This is achievable without any exploitation — it is a design flaw in the analytics endpoint access control.

---

## 5. Service-Level Access Control Gap

### Current Flow When Service is Revoked:

```
MasterAdmin → Sets CompanyService.is_active = False
Service users → Still have active ServiceUserSession records
Service users → Still pass IsServiceUserAuthenticated (checks company.approval_status, not service.is_active)
Service users → Still access Finance/HR/Inventory endpoints
```

**No revocation mechanism:**
- `ServiceUserSessionAuthentication` (authentication.py) only checks `session.is_active` and session expiry
- `IsServiceUserAuthenticated` (permissions.py) only checks `service_user.is_active` and `company.approval_status`
- Neither checks if the company's subscription to that specific service is still active

### Correct Flow (Not Implemented):
Should check `CompanyService.objects.filter(company=service_user.company, service=service_user.service, is_active=True).exists()` on every request.

---

## 6. MasterAdmin Cross-Tenant Access (By Design, with Risks)

MasterAdmin has no company scope filter — this is by design. All analytics endpoints, company management endpoints, and security log endpoints are accessible by MasterAdmin.

**Concern:** MasterAdmin can call any service endpoint (Finance, HR, Inventory, CRM) without a `ServiceUserSession`. However, these endpoints require a valid session key, so MasterAdmin without a service user session CANNOT access Finance/HR/Inventory data through the service APIs. The MasterAdmin CAN access all data through the `CompanyDetailView`, `CompanyServiceCredentialsView`, and other admin-only endpoints.

---

## 7. Summary: Tenant Boundary Scorecard

| Module | Isolation Method | Status | Notes |
|--------|-----------------|--------|-------|
| HR | Centralized (`CompanyScopedModelViewSet`) | ✅ PASS | |
| Inventory | Centralized | ✅ PASS | HR FK cross-validation missing |
| Finance | Manual per-view | ✅ PASS | Performance concern; URL key leakage |
| CRM | Semi-centralized (`CRMBaseViewSet`) | ⚠️ CONDITIONAL | Nested FK cross-validation missing |
| Reports | Manual per-view | ✅ PASS | URL key leakage |
| Company Dashboard | Mixed | ⚠️ CONDITIONAL | Multiple auth patterns |
| **Analytics** | None | ❌ **FAIL** | All-company data to any auth user |
| Authentication | N/A (authority) | — | |
