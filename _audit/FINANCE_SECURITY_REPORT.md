# FINANCE_SECURITY_REPORT.md

**Scope:** `backend/finance/` · **READ-ONLY.** Focus: tenant isolation, permission enforcement,
data ownership in the finance module. Severity: 🔴 High · 🟠 Medium · 🟡 Low.

## Baseline (verified secure)

- **All finance CRUD ViewSets** (`Customer/Product/Quotation/PurchaseOrder/ProformaInvoice/Invoice/
  Payment`) extend `CompanyScopedModelViewSet` (`common/viewsets.py:25`):
  - `authentication_classes=[ServiceUserSessionAuthentication]`, `permission_classes=[IsServiceUserAuthenticated]`.
  - `get_queryset()` filters by `request.service_user.company`; `perform_create` injects company.
  - DRF `get_object()` uses `get_queryset()` → **retrieve/update/delete are company-scoped** (IDOR-safe).
- Function views in `purchase_views.py`, `direct_payment_views.py` scope by
  `company=session.service_user.company` (e.g. direct_payment_views.py:230, purchase_views.py:509). ✅

## 🔴 S1 — Cross-company FK injection via unscoped serializer querysets (+ company derived from FK)
- **Severity:** 🔴 High
- **File/Line:** `serializers.py` unscoped FK querysets at `:1615, 1620` (PO Proforma), `:2406, 2411`
  (Invoice), `:3304, 3310` (Payment `proforma_invoice`/`invoice`), `:3475, 3481`. Company copied from
  the FK at `:1705, 1709` and `:1878, 1882`.
- **Proof:**
  ```python
  purchase_order = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrder.objects.all(), …)  # :1615
  quotation      = serializers.PrimaryKeyRelatedField(queryset=Quotation.objects.all(), …)       # :1620
  ...
  validated_data['company']       = purchase_order.company        # :1705 (trusts client-supplied FK)
  validated_data['customer']      = purchase_order.customer       # :1706
  validated_data['company_gstin'] = purchase_order.company_gstin  # :1709
  ```
  The querysets are **not** filtered to the caller's company, and there is no `validate()` asserting the
  FK belongs to the caller's company.
- **Reproduction:** Company A service user POSTs a Proforma/Invoice/Payment with
  `purchase_order` (or `invoice`/`quotation`/`proforma_invoice`) = **Company B's** document id. DRF
  accepts it; the new record inherits B's `company`, `customer`, and `company_gstin`.
- **Business impact:** (a) Disclosure of Company B's customer + GSTIN into A's response; (b) a record
  bound to Company B, and (c) Payment attached to B's invoice corrupting B's outstanding/ledger.
  Cross-tenant data + financial-integrity breach.
- **Fix direction:** scope each related queryset to the caller's company, or `validate()` the FK's
  company == authenticated company; never derive `company` from a client-supplied FK.

## 🟠 S2 — Payment `invoice`/`proforma_invoice` not ownership-validated
- **Severity:** 🟠 Medium (subset/companion of S1, payment-specific)
- **File/Line:** `serializers.py:3292` `PaymentCreateSerializer` — `invoice`/`proforma_invoice`
  `PrimaryKeyRelatedField` (3304-3310) unscoped; no check the invoice belongs to caller's company.
- **Proof:** No `validate_invoice`/`validate()` scoping the target invoice to the session company.
- **Reproduction:** Service user A records a payment against Company B's invoice id.
- **Business impact:** Cross-company payment posting; combined with B5 (no overpayment cap) enables
  corrupting another tenant's receivables.

## 🟠 S3 — `is_global_model` guard for missing `company` field only enforced in DEBUG
- **Severity:** 🟠 Medium
- **File/Line:** `common/viewsets.py` `get_queryset()` — `if settings.DEBUG: raise AssertionError(...)`.
- **Proof:** When a scoped viewset's model lacks a `company` field, the assertion fires **only in
  DEBUG**; in production the guard branch does not hard-fail, risking an unfiltered queryset.
- **Reproduction:** Add/route a model without a `company` field through a scoped viewset in prod.
- **Business impact:** Potential silent un-scoped listing in production. Today all finance models are
  company-scoped, so latent — but the guard should fail closed.

## 🟡 S4 — Verbose logging of full payment payloads
- **Severity:** 🟡 Low
- **File/Line:** `serializers.py` `PaymentCreateSerializer.to_internal_value` →
  `logger.error(f"[PaymentCreateSerializer] raw incoming data: {dict(data)}")`.
- **Proof:** Logs the entire incoming payment payload at ERROR level on every create.
- **Reproduction:** Create any payment; inspect logs.
- **Business impact:** Financial payment data (amounts, bank refs, TDS) written to logs/aggregators —
  data-exposure + log-noise; also misuses ERROR level for normal flow.

## 🟡 S5 — Audit trail covers create only
- **Severity:** 🟡 Low
- **Observation:** Models track `created_by` (and `revised_by`/`rejected_by` on docs), but there is no
  systematic update/delete audit log for finance records; destructive ops exist as management commands
  (`delete_invoice`, `delete_invoices`) and one-off scripts.
- **Business impact:** Limited forensic trail for edits/deletions of financial documents — weak for
  dispute/audit scenarios. (Pairs with B9: corrections done by editing/deleting rather than credit notes.)

## Permission-enforcement matrix (finance)

| Action | Enforced by | Tenant-safe? |
|--------|-------------|:---:|
| List/Retrieve any finance resource | `CompanyScopedModelViewSet.get_queryset` | ✅ |
| Create (company binding) | `perform_create` injects company | ✅ for own fields; ❌ when company derived from FK (S1) |
| Update/Delete by id | `get_object()` scoped | ✅ |
| Reference parent doc (PO/Quote/Invoice) on create | serializer FK queryset | ❌ unscoped (S1/S2) |
| Record payment | `PaymentCreateSerializer` | ❌ no ownership + no amount cap (S2 + B5) |

## Priority
1. **S1/S2** — scope all finance serializer FK querysets to the caller's company; stop deriving
   `company` from client FKs. Add cross-company-FK tests.
2. **B5** (from bug report) — cap payment to outstanding (financial + cross-tenant impact with S2).
3. **S3** — make the missing-`company` guard fail closed in production.
4. **S4** — drop full-payload ERROR logging.
