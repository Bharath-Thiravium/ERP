# TENANT_ISOLATION_AUDIT.md

**Date:** 2026-06-23 · **Mode:** READ-ONLY. **No code modified.**
**Scope:** Cross-company data-leakage risk across CRM, Finance, HR, Inventory, Notifications,
Analytics. Tenant boundary = `authentication.Company` (row-level isolation).

## Methodology

For every `ViewSet`/`APIView`/`GenericAPIView`/function view I checked: (1) `get_queryset()`,
(2) class-level `queryset`, (3) company filtering, (4) object-ownership on retrieve/update/delete,
(5) serializer FK/field validation, (6) create/update/delete authorization. Base classes were
resolved (most scoping is centralized), then the non-centralized surface was hunted for unscoped
`.objects.all()/.get()/.filter()` and unscoped serializer `PrimaryKeyRelatedField` querysets.

## TL;DR

| App | Core CRUD | Verdict |
|-----|-----------|---------|
| CRM | `CRMBaseViewSet` / `CompanyScopedModelViewSet` | ✅ Scoped (reads). FK-injection risk in writes. |
| Finance | `CompanyScopedModelViewSet` | ⚠️ Reads scoped; **serializer FK injection = HIGH leak**. |
| HR | `CompanyScopedModelViewSet` | ⚠️ Reads scoped; **unscoped attendance lookup + reviewer FK**. |
| Inventory | `CompanyScopedModelViewSet` | ✅ Scoped. |
| Notifications | per-user (`recipient`) | ✅ Isolated by user. |
| Analytics | function views | 🔴 **Per-company financials exposed to any authenticated user**. |

---

## ✅ Verified-safe baseline (centralized enforcement) — keep as regression tests

- **`common/viewsets.py:25` `CompanyScopedModelViewSet`** — `get_queryset()` filters
  `queryset.filter(company=self.get_company())` where `get_company()=request.service_user.company`;
  `perform_create` injects company; **DEBUG guardrail** raises `AssertionError` if a model lacks a
  `company` field. Used by all core CRUD viewsets in finance/hr/inventory/crm. Because DRF
  `get_object()` calls `get_queryset()`, **retrieve/update/delete are IDOR-protected**.
- **`crm/views.py:26` `CRMBaseViewSet`** — `get_queryset()` resolves the session → company and
  returns `self.queryset.filter(company=company)`; returns `.none()` without a valid session. All
  CRM secondary viewsets (marketing/support/pipeline/security/reporting/analytics/integration)
  inherit it → scoped reads.
- **Function views in `finance/purchase_views.py`, `finance/direct_payment_views.py`** — verified
  scoped, e.g. `Payment.objects.get(id=payment_id, company=service_user.company, ...)`
  (direct_payment_views.py:230), `Vendor.objects.filter(company=session.service_user.company)`
  (purchase_views.py:509).
- **`notifications/views.py`** — `get_queryset()` filters `Notification.objects.filter(recipient=
  request.user)` → per-user isolation (appropriate for notifications).
- **Global reference models** (`HSNCode`/`SACCode`) are intentionally global (`is_global_model`) —
  `objects.all()` there is **not** a leak.

> The many class-level `queryset = X.objects.all()` lines are **not** leaks by themselves — the
> base classes above re-scope them in `get_queryset()`.

---

## 🔴 FINDINGS (cross-company leakage)

### F1 — 🔴 HIGH — Analytics exposes every company's financials to any authenticated user
- **File/Line:** `analytics/views.py:76` (`service_metrics`); also `:20` (`system_overview`),
  `performance_metrics`, `system_alerts`. Route: `analytics/urls.py:9` → `/api/analytics/service-metrics/`.
- **What:** `@permission_classes([IsAuthenticated])` only. The view loops
  `Company.objects.filter(approval_status='approved')` and returns **per-company** invoices,
  pending payments, **total revenue**, employee counts, etc. (lines 84–102). There is **no**
  `IsMasterAdmin` restriction and **no** company scoping to the caller.
- **Attack scenario:** A Company A user (valid JWT → `IsAuthenticated=True`) calls
  `GET /api/analytics/service-metrics/` and receives **Company B/C/D's** revenue, invoice counts,
  payment status, and headcount — full cross-tenant financial disclosure.
- **Proof:**
  ```python
  # analytics/views.py
  @permission_classes([IsAuthenticated])          # :76  (NOT IsMasterAdmin)
  def service_metrics(request):
      companies = Company.objects.filter(approval_status='approved')   # :84  ALL companies
      ... 'total_revenue': sum(p.amount for p in Payment.objects.filter(company=company, status='completed'))  # :91
  ```
- **Fix direction (not applied):** restrict these endpoints to `IsMasterAdmin`, or scope to the
  caller's company.

### F2 — 🔴 HIGH — Finance serializers accept cross-company parent docs and derive company from them
- **File/Line:** `finance/serializers.py` — unscoped FK querysets at `:1615`, `:1620`, `:2406`,
  `:2411`, `:3304`, `:3310`, `:3475`, `:3481`; company derived from the FK at `:1705`, `:1709`,
  `:1878`, `:1882`.
- **What:** Invoice/ProformaInvoice/Payment serializers expose
  `purchase_order = PrimaryKeyRelatedField(queryset=PurchaseOrder.objects.all())` (and `quotation`,
  `proforma_invoice`, `invoice`) — **querysets are not company-filtered**, so any existing PK is
  accepted. Worse, `create()` then sets `validated_data['company'] = purchase_order.company` and
  copies `customer`, `customer_gstin`, **`company_gstin`** from that FK. No `validate_*` checks the
  FK belongs to the caller's company (grep found none).
- **Attack scenario:** Company A service user POSTs a new Proforma/Invoice/Payment with
  `purchase_order = <Company B's PO id>`. DRF accepts it (unscoped queryset). The created document
  inherits **Company B's** `company`, `customer`, and `company_gstin` → (a) Company B's customer +
  GSTIN data is disclosed in the response, and/or (b) a record is created bound to Company B,
  potentially corrupting B's payment/claim balances.
- **Proof:**
  ```python
  purchase_order = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrder.objects.all(), ...)  # :1615
  quotation      = serializers.PrimaryKeyRelatedField(queryset=Quotation.objects.all(), ...)      # :1620
  ...
  validated_data['company']       = purchase_order.company        # :1705  (trusts the FK's company)
  validated_data['customer']      = purchase_order.customer       # :1706
  validated_data['company_gstin'] = purchase_order.company_gstin  # :1709
  ```
- **Fix direction:** filter each related queryset to the caller's company
  (`PurchaseOrder.objects.filter(company=...)`) or add `validate()` ensuring the FK's company
  equals the authenticated company; never derive `company` from client-supplied FKs.

### F3 — 🟠 MEDIUM — HR attendance looks up Employee by `employee_id` without company scope
- **File/Line:** `hr/attendance_views.py:300` (inside `mobile_attendance`, def at `:282`; same
  pattern feeds `face_recognition_attendance` at `:418`).
- **What:** `employee = Employee.objects.get(employee_id=data['employee_id'])` — no company/session
  filter. `employee_id` is `unique=True` globally (`hr/models.py:148`) and auto-generated per
  company (`generate_auto_code`, model line 286), so it is guessable/enumerable.
- **Attack scenario:** A caller submits another company's `employee_id` and marks attendance /
  reads that employee's approved-leave status (lines 305–311) — cross-tenant write + disclosure.
- **Proof:**
  ```python
  employee = Employee.objects.get(employee_id=data['employee_id'])     # :300  no company filter
  approved_leave = LeaveApplication.objects.filter(employee=employee, status='approved', ...)  # :305
  ```
- **Caveat:** confirm the auth/session context of `mobile_attendance` (mobile app). Regardless, the
  Employee lookup must be scoped to the authenticated company/device.
- **Fix direction:** `Employee.objects.get(employee_id=..., company=<session company>)`.

### F4 — 🟠 MEDIUM — PerformanceReview reviewer can be any company's employee
- **File/Line:** `hr/serializers.py:212`.
- **What:** `reviewer = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all(), ...)` —
  unscoped; a review can reference an Employee from another company as reviewer.
- **Attack scenario:** Company A creates a `PerformanceReview` with `reviewer = <Company B employee
  id>`, linking/exposing B's employee across the tenant boundary.
- **Proof:** `reviewer = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all(), required=False, allow_null=True)  # :212`
- **Fix direction:** scope the queryset to the caller's company in the serializer.

---

## Secondary observations (not direct leaks, but weaken isolation)

| # | File/Line | Severity | Note |
|---|-----------|----------|------|
| S1 | `crm/views.py` `CRMBaseViewSet.get_session_key` (~:33) | 🟠 | Reads `session_key` from query params **and request body**, not just `Authorization` — broadens session exposure (see PERMISSION_LEAK_CHECKLIST.md L1). Isolation still holds (company filter present). |
| S2 | `common/viewsets.py` guardrail | 🟡 | The "model lacks company field" `AssertionError` only fires in **DEBUG**; in production a mis-modeled viewset would silently skip company filtering. Verify every scoped model truly has a `company` field. |
| S3 | `notifications/views.py` `NotificationBulkCreateView` | 🟡 | Verify a company user cannot create notifications targeting users of another company (recipient validation). |
| S4 | Analytics detailed endpoints `analytics/api/analytics_views.py` (`revenue/`, `users/`, `growth/`) | 🟠 | Same exposure pattern as F1 — confirm they are master-admin-only, not `IsAuthenticated`. |

---

## Per-app coverage summary

| App | Scoped base | Confirmed-safe | Leak findings |
|-----|-------------|----------------|---------------|
| **CRM** | `CRMBaseViewSet`, `CompanyScopedModelViewSet` | core + secondary viewsets (reads) | (FK-injection class risk; verify CRM child serializers similarly) |
| **Finance** | `CompanyScopedModelViewSet` | CRUD reads, purchase/direct-payment fn views | **F2** |
| **HR** | `CompanyScopedModelViewSet` | CRUD reads, payroll/leave fn views (session-scoped) | **F3, F4** |
| **Inventory** | `CompanyScopedModelViewSet` | all CRUD | none found |
| **Notifications** | per-user | list/detail | (S3 to verify) |
| **Analytics** | none | system health (intended global) | **F1, S4** |

## Prioritized remediation (do NOT apply here — analysis only)

1. **F1/S4** — gate analytics aggregation endpoints with `IsMasterAdmin` (or scope to caller).
2. **F2** — company-scope all finance serializer FK querysets; never set `company` from a
   client-supplied FK. Add backend tests: "create invoice referencing another company's PO → 400".
3. **F3/F4** — scope `Employee` lookups/querysets by the authenticated company.
4. **S2** — make the missing-`company`-field guard fail closed in production too.
5. Add the AGENTS.md-mandated **scope-enforcement tests** (cross-company id enumeration) for every
   app, using the attack scenarios above as fixtures.

## Verification commands used (reproducible, read-only)
```bash
cd backend
grep -rnE "queryset *= *[A-Za-z_]+\.objects\.all\(\)" crm finance hr inventory --include=*.py
grep -rnE "class .*ViewSet\(" crm/viewsets.py finance/viewsets.py hr/viewsets.py inventory/viewsets.py   # base classes
sed -n '25,90p' common/viewsets.py                       # CompanyScopedModelViewSet
grep -n "PrimaryKeyRelatedField" finance/serializers.py hr/serializers.py | grep objects.all   # F2/F4
grep -n "permission_classes" analytics/views.py          # F1
grep -n "Employee.objects.get(employee_id" hr/attendance_views.py   # F3
```
