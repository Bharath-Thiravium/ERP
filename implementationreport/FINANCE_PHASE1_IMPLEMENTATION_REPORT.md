# FINANCE_PHASE1_IMPLEMENTATION_REPORT.md
## Finance Phase 1 — Critical Security Fixes
**Project:** SAP-Python Multi-Tenant ERP
**Date:** 2026-07-01
**Status:** COMPLETE — `python manage.py check` passes with 0 issues; 17/18 Finance tests pass (1 pre-existing, unrelated failure)

---

## 1. Files Modified

| File | Change Summary |
|------|-----------------|
| `backend/finance/payment_views.py` | Replaced `AllowAny` with `ServiceUserSessionAuthentication`/`IsServiceUserAuthenticated`; removed manual URL/body session-key parsing; wrapped payment+TDSDeposit writes in `transaction.atomic()` |
| `backend/finance/direct_payment_views.py` | Same permission/authentication fix across all 5 endpoints; removed manual session parsing; wrapped payment creation in `transaction.atomic()` |
| `backend/finance/views.py` | Fixed 9 routed classes/functions (TDS deposits, TDS payments list/export, mark-cert-received, customer ledger, customer ledger PDF, pending payment statement, pending statement PDF, PO consolidated report) — replaced `AllowAny`/empty auth with proper classes; replaced manual session parsing with `request.service_user` |
| `backend/finance/refactored_invoice_views.py` | `RefactoredInvoiceViewSet` (`invoices-enhanced` route) — added explicit `ServiceUserSessionAuthentication`/`IsServiceUserAuthenticated`; removed manual body/query `session_key` parsing that bypassed the centrally-fixed header-only session mechanism |
| `backend/finance/serializers.py` | Added shared `_get_context_company()`/`_validate_same_company()` helpers; added `validate_<fk>()` methods across 9 Create/Update serializers to block cross-company FK injection; fixed 11 unscoped `Product.objects.get(id=...)` lookups to filter by company; fixed missing outstanding-balance check in `WorldClassPaymentCreateSerializer`; added `@transaction.atomic` to 9 multi-step create/update methods |
| `backend/finance/tests.py` | Added `FinancePhase1SecurityTest` — 7 regression tests covering cross-tenant FK rejection and outstanding-balance enforcement |

---

## 2. Exact Fixes Implemented

### Fix 1 — Replace Inappropriate `AllowAny` Permissions

**Root cause:** Many routed Finance endpoints used `authentication_classes = []` / `permission_classes = [permissions.AllowAny]`, relying entirely on a hand-rolled `ServiceUserSession.objects.get(session_key=...)` lookup inside each view — including accepting the session key from `request.query_params.get('session_key')` or `request.data.get('session_key')` (URL/body), not just the `Authorization` header.

**Fixed endpoints (all now use `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated`, reading `request.service_user`):**

| Endpoint | File |
|----------|------|
| `update_invoice_payment`, `update_proforma_payment`, `unified_payment_update` | `payment_views.py` |
| `create_direct_payment`, `list_direct_payments`, `get_direct_payment`, `delete_direct_payment`, `customer_payment_summary` | `direct_payment_views.py` |
| `CustomerShippingAddressDetailView`, `customer_ledger`, `customer_ledger_pdf`, `TDSDepositListCreateView`, `TDSDepositDetailView`, `TDSPaymentsListView`, `TDSExportCSVView`, `MarkTDSCertReceivedView`, `PendingPaymentStatementAPIView`, `customer_pending_statement_pdf`, `po_consolidated_report` | `views.py` |
| `RefactoredInvoiceViewSet` (all 8 actions) | `refactored_invoice_views.py` |

**Not fixed — confirmed unreachable dead code:** `views.py` still contains ~20 additional classes (`CustomerListCreateView`, `CustomerDetailView`, `ProductListCreateView`, `ProductDetailView`, `QuotationListCreateView`, `QuotationDetailView`, `PurchaseOrderListCreateView`, `PurchaseOrderDetailView`, `ProformaInvoiceListCreateView`, `ProformaInvoiceDetailView`, `InvoiceListCreateView`, `InvoiceDetailView`, `PaymentListCreateView`, `PaymentDetailView`, `HSNCodeSearchView`, `SACCodeSearchView`, `HSNCodeCreateView`, `SACCodeCreateView`, `ProductSearchView`, `GenerateProductCodeView`, `QuotationCopyView`) with `AllowAny`. Verified via `finance/urls.py` and a project-wide grep that **none of these are referenced by any URL router** — the actual CRUD routes for these models go through `viewsets.py`'s `CompanyScopedModelViewSet`-based classes, which were already secure. Left untouched per the "minimal changes" constraint since modifying unreachable code carries risk with zero runtime benefit.

**Not fixed — deferred to Phase 2 (see Section 5):** `indian_compliance_views.py`, `government_api_views.py`, `hsn_sac_views.py`, `unit_views.py`, `financial_year_views.py`, `integration_views.py`, `bank_integration_views.py`, `payment_gateway_views.py` follow the identical `AllowAny` + manual-session-lookup pattern (~30 more endpoints). Every one of these was individually inspected and **all correctly validate the session and scope every query by `session.service_user.company`** — so there is no active cross-tenant data leak, only the weaker header-vs-URL-param session acceptance and non-standard permission class usage. Given the volume (30+ endpoints across 8 files) and that this is explicitly a "Phase 1 critical fixes" pass, this was assessed as **lower severity, hardening-only** work and intentionally deferred rather than risking a rushed, under-tested rewrite of external-integration and payment-gateway code.

---

### Fix 2 — Cross-Company ForeignKey Injection

**Root cause:** Several serializers' `PrimaryKeyRelatedField`s (both explicit and ModelSerializer auto-generated) used unscoped `Model.objects.all()` querysets. A ViewSet's `get_queryset()` filtering by company has **no effect** on what a serializer field will accept as a valid FK on create/update — that is governed independently by the field's own queryset. This meant a Company A service user could submit a Company B `customer_id`, `invoice_id`, `purchase_order_id`, `quotation_id`, `vendor_id`, etc., and the serializer would silently accept and use it.

**Concrete confirmed exploit path (most severe):** In `ProformaInvoiceCreateSerializer._create_from_po()`, the code executed `validated_data['company'] = purchase_order.company` — meaning if a cross-tenant `purchase_order` was accepted, the resulting `ProformaInvoice` would be created **under the foreign company**, with `customer` and GST fields also copied from the foreign company's data. The same pattern existed in `InvoiceCreateSerializer`.

**Fix:** Added a shared helper in `serializers.py`:
```python
def _get_context_company(context):
    """Resolve the authenticated company from serializer context (service user or company user)."""
    ...

def _validate_same_company(value, context, label):
    """Ensure a referenced FK instance belongs to the authenticated company."""
    if value is None:
        return value
    company = _get_context_company(context)
    if company is not None and getattr(value, 'company_id', None) != company.id:
        raise serializers.ValidationError(f'{label} not found or access denied.')
    return value
```

Added `validate_<field>()` methods (DRF field-level validators run **before** `validate()`/`create()`, so cross-tenant objects are rejected before any downstream logic — including the previously-vulnerable `company = purchase_order.company` overwrite — can execute):

| Serializer | Fields validated |
|------------|-------------------|
| `QuotationCreateSerializer` | `customer`, `shipping_address` |
| `QuotationUpdateSerializer` | `customer`, `shipping_address` |
| `PurchaseOrderCreateSerializer` | `customer`, `quotation`, `shipping_address` |
| `PurchaseOrderUpdateSerializer` | `customer`, `shipping_address` |
| `ProformaInvoiceCreateSerializer` | `customer`, `purchase_order`, `quotation`, `shipping_address` |
| `InvoiceCreateSerializer` | `customer`, `purchase_order`, `quotation`, `shipping_address` |
| `InvoiceUpdateSerializer` | `customer`, `shipping_address` |
| `PaymentCreateSerializer` | `invoice`, `proforma_invoice` |
| `WorldClassPaymentCreateSerializer` | `customer`, `purchase_order`, `invoice`, `proforma_invoice` (simplified from a fragile per-field manual session lookup to the shared helper) |
| `PurchaseRequestCreateSerializer` | `vendor` |
| `VendorInvoiceCreateSerializer` | `vendor`, `purchase_request` |
| `PurchasePaymentCreateSerializer` | `vendor`, `vendor_invoice` |

`shipping_address` is validated against `value.customer.company_id` since `CustomerShippingAddress` has no direct `company` FK (only `customer`).

**Also fixed — unscoped `Product` lookups inside item-creation loops:** Line-item dictionaries (`quotation_items`, `po_items`, `proforma_items`, `invoice_items`, `request_items`) are plain `DictField()`s, not DRF related fields, so the `product` ID inside each item was being resolved via `Product.objects.get(id=product_id)` with **no company filter at all** — 11 occurrences across Quotation/PurchaseOrder/ProformaInvoice/Invoice/PurchaseRequest/VendorInvoice create and update paths. All 11 now filter by the already-verified company of the parent document (e.g. `Product.objects.get(id=product_id, company=invoice.company)`).

---

### Fix 3 — Ownership Validation on Create/Update

Covered by Fix 2 above — every FK reference (Customer, Invoice, Proforma Invoice, Purchase Order, Quotation, Vendor, Vendor Invoice, Shipping Address) used in a Finance create/update operation is now validated against the authenticated caller's company before the object is used.

---

### Fix 4 — `transaction.atomic()` on Multi-Step Workflows

Added `@transaction.atomic` to methods that perform a parent-object write followed by dependent item/relation writes, where a failure partway through would leave an inconsistent record (e.g. a Quotation with no items, or a PO left in `active` status with no corresponding Proforma):

| Serializer.method |
|---|
| `QuotationCreateSerializer.create` |
| `QuotationUpdateSerializer.update` |
| `PurchaseOrderCreateSerializer.create` |
| `PurchaseOrderUpdateSerializer.update` |
| `ProformaInvoiceCreateSerializer.create` (covers `_create_from_po`/`_create_direct_proforma`/`_create_from_quotation` since they're called within the same atomic block) |
| `InvoiceCreateSerializer.create` (covers `_create_from_purchase_order`/`_create_from_quotation`/`_create_direct_invoice`) |
| `InvoiceUpdateSerializer.update` |
| `PurchaseRequestCreateSerializer.create` |
| `VendorInvoiceCreateSerializer.create` |

Also wrapped the Payment+TDSDeposit multi-object writes in `payment_views.py`'s `update_invoice_payment` and `update_proforma_payment` in `with transaction.atomic():` blocks (payment creation followed by a conditional `TDSDeposit.objects.create()` for TDS-only payments).

Single-object creates (`PaymentCreateSerializer.create`, `WorldClassPaymentCreateSerializer.create`, `PurchasePaymentCreateSerializer.create`) were left unwrapped — a single `Model.objects.create()` call has no intermediate state to corrupt.

---

### Fix 5 — Payment Amount vs. Outstanding Balance

**`PaymentCreateSerializer`** already had this check (`amount > invoice.outstanding_amount + 1`), but it ran *before* any company-ownership check on the `invoice`/`proforma_invoice` FK — meaning the outstanding-amount comparison itself could previously be run against another company's invoice. This is now moot: `validate_invoice`/`validate_proforma_invoice` (added in Fix 2) reject cross-tenant references at the field level, before `validate()` ever compares against `outstanding_amount`.

**`WorldClassPaymentCreateSerializer` — genuine gap found and fixed:** its `validate()` method checked only that `invoice` and `proforma_invoice` weren't both provided; it had **no check at all** against `outstanding_amount`. This is the serializer used by the direct-payment and TDS-payment-update endpoints. Added:
```python
if amount is not None:
    if invoice and amount > invoice.outstanding_amount + 1:
        raise serializers.ValidationError(...)
    elif proforma_invoice and amount > proforma_invoice.outstanding_amount + 1:
        raise serializers.ValidationError(...)
```
(1-rupee tolerance preserved for rounding, matching the existing `PaymentCreateSerializer` convention.) TDS-only payments (`amount=0`) are unaffected since `0` never exceeds a positive outstanding balance.

---

### Fix 6 — Tenant-Scoped Queryset Review

Reviewed all 7 `viewsets.py` ViewSets (`CustomerViewSet`, `ProductViewSet`, `QuotationViewSet`, `PurchaseOrderViewSet`, `ProformaInvoiceViewSet`, `InvoiceViewSet`, `PaymentViewSet`) — all inherit `CompanyScopedModelViewSet` (`common/viewsets.py`, **not modified** — shared with HR/Inventory/CRM, out of scope), whose `get_queryset()` already filters by `company=self.get_company()` and whose `get_object()` returns 404 (not 403, to avoid confirming existence) for cross-tenant object access. No changes needed there.

`RefactoredInvoiceViewSet` (`invoices-enhanced`) was the one exception — see Fix 1.

---

### Fix 7 — API Contract Preservation

- All endpoint URLs, HTTP methods, and response shapes are unchanged.
- Clients that were already sending the session key via the `Authorization: Bearer <key>` header (the documented/correct usage) see no behavior change.
- Clients relying on the `?session_key=` URL parameter or `session_key` in the POST body for the fixed endpoints will now receive `401 Unauthorized` instead of being silently authenticated — this is an intentional security-driven contract change, consistent with the Authentication Phase 1 fix that already removed URL-param session key acceptance from the shared `ServiceUserSessionAuthentication` class. Endpoints in Phase 2's deferred list (Section 5) still accept the URL/body session key for now.
- Error response for a rejected cross-tenant FK reference is a standard DRF `400` validation error: `{"invoice": ["Invoice not found or access denied."]}` (or `customer`/`purchase_order`/`quotation`/`vendor`/etc. as applicable) — this did not previously exist as a possible response since these requests previously succeeded.

---

## 3. Security Issues Resolved

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Cross-tenant `purchase_order`/`quotation` FK injection could create a Proforma Invoice or Invoice **under a foreign company** by copying `purchase_order.company` | **Critical** | Fixed |
| 2 | Cross-tenant `invoice`/`proforma_invoice` FK injection in payment creation — a Company A user could attach a payment to a Company B invoice | **Critical** | Fixed |
| 3 | Cross-tenant `customer` FK injection across Quotation/PO/Proforma/Invoice creation | **High** | Fixed |
| 4 | Cross-tenant `product` FK injection in 11 line-item creation paths — cross-tenant product data (pricing, HSN codes) could leak into another company's documents | **High** | Fixed |
| 5 | `WorldClassPaymentCreateSerializer` had no outstanding-balance cap — payments could be recorded for any amount regardless of invoice balance | **High** | Fixed |
| 6 | Debug/legacy endpoints (payment update, direct payment, TDS management, customer ledger, pending statement) accepted session keys via URL/body params, bypassing the Auth Phase 1 header-only fix | **Medium** | Fixed |
| 7 | Multi-step create/update flows (Quotation/PO/Proforma/Invoice + items) had no transaction wrapping — partial failures could leave orphaned parent records with no items | **Medium** | Fixed |
| 8 | ~30 endpoints across 8 auxiliary Finance files use the same weaker session pattern | **Low** (session-validated + company-scoped in every case; no active leak) | Deferred to Phase 2 |

---

## 4. Regression Tests Performed

### `python manage.py check`
```
System check identified no issues (0 silenced)
```

### Module import sanity check
```python
from finance import serializers, views, payment_views, direct_payment_views, refactored_invoice_views, viewsets
# All finance modules imported successfully
```

### `python manage.py test finance` (full suite)
```
Ran 18 tests
17 passed
1 pre-existing failure (unrelated — see below)
```

**Pre-existing failure (NOT caused by this work):** `ProformaPDFShippingFallbackTest.test_proforma_pdf_uses_po_shipping_address_when_proforma_shipping_is_missing` fails with `TypeError: unsupported operand type(s) for -: 'float' and 'decimal.Decimal'` in `finance/models.py:1522` (`PurchaseOrder.update_balance_tracking()`). Confirmed via `git diff --stat backend/finance/models.py` (no output — file untouched by this work) and file mtime (last modified ~8 days before this session started). This is a pre-existing business-logic type-coercion bug, out of scope per the "do not change business logic" constraint.

### New: `FinancePhase1SecurityTest` (7 tests added to `finance/tests.py`)

| Test | Verifies |
|------|----------|
| `test_payment_create_serializer_rejects_cross_company_invoice` | `PaymentCreateSerializer` rejects a Company B invoice when submitted by a Company A caller |
| `test_payment_create_serializer_accepts_same_company_invoice` | Same-company payment creation still succeeds (no false positive) |
| `test_payment_create_serializer_rejects_amount_exceeding_outstanding` | Payment amount capped at invoice outstanding balance |
| `test_world_class_payment_serializer_rejects_cross_company_invoice` | `WorldClassPaymentCreateSerializer` rejects cross-tenant invoice |
| `test_world_class_payment_serializer_rejects_amount_exceeding_outstanding` | Newly-added outstanding-balance check works in `WorldClassPaymentCreateSerializer` |
| `test_world_class_payment_serializer_rejects_cross_company_customer` | Rejects cross-tenant `customer` FK (direct payment path) |
| `test_quotation_create_serializer_rejects_cross_company_customer` | Rejects cross-tenant `customer` FK in quotation creation |

```
Ran 7 tests in 1.888s
OK
```

---

## 5. Manual Verification Checklist

Run these against a running dev/staging environment with two distinct approved companies (Company A, Company B), each with a Service User session key.

### Customer Creation
```bash
curl -X POST /api/finance/customers/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Customer", "email": "test@example.com", ...}'
# Expected: 201, customer created under Company A
```

### Invoice Creation (direct + cross-tenant rejection)
```bash
# Valid: direct invoice for own customer
curl -X POST /api/finance/invoices/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"customer": <company_a_customer_id>, "invoice_items": [...], ...}'
# Expected: 201

# Invalid: attempt to reference Company B's customer
curl -X POST /api/finance/invoices/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"customer": <company_b_customer_id>, "invoice_items": [...], ...}'
# Expected: 400 {"customer": ["Customer not found or access denied."]}

# Invalid: attempt to reference Company B's purchase order
curl -X POST /api/finance/invoices/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"purchase_order": <company_b_po_id>, "claim_type": "percentage", ...}'
# Expected: 400 {"purchase_order": ["Purchase order not found or access denied."]}
```

### Payment Creation (outstanding balance + cross-tenant rejection)
```bash
# Invalid: amount exceeds outstanding
curl -X POST /api/finance/payments/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"invoice": <company_a_invoice_id>, "amount": 999999, "payment_method": "bank_transfer", "payment_date": "2026-07-01"}'
# Expected: 400 "Payment amount (...) cannot exceed outstanding amount (...)"

# Invalid: cross-tenant invoice reference
curl -X POST /api/finance/payments/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"invoice": <company_b_invoice_id>, "amount": 100, "payment_method": "bank_transfer", "payment_date": "2026-07-01"}'
# Expected: 400 {"invoice": ["Invoice not found or access denied."]}

# Valid: own-company payment within outstanding balance
curl -X POST /api/finance/payments/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"invoice": <company_a_invoice_id>, "amount": 100, "payment_method": "bank_transfer", "payment_date": "2026-07-01"}'
# Expected: 201
```

### Purchase Order Workflow
```bash
# Create PO
curl -X POST /api/finance/purchase-orders/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"customer": <company_a_customer_id>, "po_items": [...], ...}'
# Expected: 201

# Create Proforma from that PO (own company)
curl -X POST /api/finance/proforma-invoices/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"purchase_order": <company_a_po_id>, ...}'
# Expected: 201, proforma.company == Company A

# Attempt Proforma creation referencing Company B's PO
curl -X POST /api/finance/proforma-invoices/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"purchase_order": <company_b_po_id>, ...}'
# Expected: 400 {"purchase_order": ["Purchase order not found or access denied."]}
```

### Multi-Tenant Isolation (direct API confirmation)
```bash
# Company A lists its own invoices
curl /api/finance/invoices/ -H "Authorization: Bearer <company_a_session_key>"
# Expected: only Company A invoices

# Company B lists its own invoices
curl /api/finance/invoices/ -H "Authorization: Bearer <company_b_session_key>"
# Expected: only Company B invoices, no overlap with Company A's list

# Company A attempts to retrieve Company B's invoice by ID directly
curl /api/finance/invoices/<company_b_invoice_id>/ -H "Authorization: Bearer <company_a_session_key>"
# Expected: 404 Not Found (CompanyScopedModelViewSet.get_object() — unchanged, already correct)
```

### Session Key No Longer Accepted via URL for Fixed Endpoints
```bash
curl "/api/finance/direct-payments/?session_key=<company_a_session_key>"
# Expected: 401 (session key not accepted from query param)

curl "/api/finance/direct-payments/" -H "Authorization: Bearer <company_a_session_key>"
# Expected: 200 (header-based auth works)
```

---

## 6. Remaining Finance Phase 2 Work

| Item | Description | Priority |
|------|-------------|----------|
| Remaining `AllowAny` + URL-session-key endpoints | `indian_compliance_views.py` (3 classes + `generate_gstr1_data`, `compliance_dashboard`, `compliance_alerts`), `government_api_views.py` (9 endpoints), `hsn_sac_views.py` (2 classes), `unit_views.py` (1 class), `financial_year_views.py` (3 endpoints), `integration_views.py`/`bank_integration_views.py`/`payment_gateway_views.py` (~15 endpoints). All already validate session + scope by company; needs the same `ServiceUserSessionAuthentication`/`IsServiceUserAuthenticated` migration for defense-in-depth and Authorization-header-only consistency. | HIGH |
| `PaymentUpdateSerializer` outstanding-balance check | Update path allows changing a payment's `amount` with no cap against the invoice's outstanding balance (create path is now fixed; update was not in the original audit scope and touches `update_invoice_payment_status()` business logic — recommend dedicated review) | MEDIUM |
| `CompanyUser`-authenticated Finance access | `FinanceNumberingRuleView`/`FinanceNumberingPreviewView` use `request.user.company_user.company` (JWT path) — confirm no equivalent FK-injection surface exists on the Company Dashboard side of Finance | MEDIUM |
| Dead code cleanup | `views.py` still contains ~20 unrouted, unreachable `AllowAny` classes (`CustomerListCreateView`, `ProductListCreateView`, etc.) — safe to delete in a dedicated cleanup pass once confirmed no other code path references them | LOW |
| Pre-existing `update_balance_tracking()` bug | `float - Decimal` `TypeError` in `finance/models.py:1522` causes `ProformaPDFShippingFallbackTest` to fail; unrelated to security but should be fixed in a standard bug-fix pass | LOW (functional bug, not security) |
