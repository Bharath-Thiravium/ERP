# FINANCE_ARCHITECTURE_REPORT.md

**Scope:** `backend/finance/` · **Mode:** READ-ONLY (no code modified).

## Module size

| Layer | File | Lines |
|-------|------|------:|
| Views (APIViews/function views) | `views.py` | 5,103 |
| Serializers | `serializers.py` | 4,278 |
| Models | `models.py` | 3,535 |
| Email | `email_utils.py` | 1,162 |
| **Core CRUD ViewSets** | `viewsets.py` | 1,059 |
| + 30 more view/service modules | analytics, purchase, payment, government_api, pdf, compliance… | ~9k |
| Numbering subsystem | `numbering.py` | (canonical generator) |
| Signals | `signals.py` | 218 |
| Celery tasks | `tasks.py` | (3 tasks) |
| Mgmt commands | `management/commands/*` | 18 |

## Layered overview

```
URLs (finance/urls.py, 88 routes)
  → ViewSets (viewsets.py)  — Customer/Product/Quotation/PurchaseOrder/ProformaInvoice/Invoice/Payment
      all extend common.viewsets.CompanyScopedModelViewSet  → session-auth + company-scoped reads
  → APIViews/function views (payment_views, purchase_views, direct_payment_views, analytics_views,
      hsn_sac_views, financial_year_views, government_api_views, indian_compliance_views, …)
  → Serializers (serializers.py)  — validation, number assignment (generate_number), GST calc
  → Models (models.py)  — 23 models; save() overrides assign numbers + GST type
  → Signals (signals.py)  — recompute PO claimed amounts on Invoice/Proforma save/delete
  → Celery (tasks.py)  — overdue invoice marking, email automation
  → PDF services (quotation/po/proforma/invoice _pdf_service.py + pdf_utils, WeasyPrint/ReportLab)
```

## Data model (23 models, all `company`-scoped except global tax codes)

- **Masters:** `Customer` (+`CustomerShippingAddress`), `Product`, `Vendor`.
- **Global reference:** `HSNCode`, `SACCode` (GST tax codes — not company-scoped, correct).
- **Numbering:** `NumberingRule`, `NumberingCounter` (per company+module+scope).
- **Sales chain:** `Quotation`(+Item) → `PurchaseOrder`(+Item) → `ProformaInvoice`(+Item) →
  `Invoice`(+Item) → `Payment`. Each links optionally to earlier docs.
- **Procurement:** `PurchaseRequest`(+Item) → `VendorInvoice`(+Item) → `PurchasePayment`; `TDSDeposit`.

**Document-number integrity (verified):** every number field has a DB-level
`unique_together = ['company', '<number>']` (quotation 824, internal_po 1296, proforma 1974,
invoice 2318, payment 2626, vendor_code 3018, request 3101, customer_code 427, product_code 182).
→ **Duplicate numbers cannot be persisted** (DB rejects). This is a strong control. The weaknesses
are in *how* numbers are generated (see below + BUG report).

## ⚠️ Three coexisting numbering mechanisms (architectural inconsistency)

| # | Mechanism | Where | Concurrency-safe? |
|---|-----------|-------|-------------------|
| 1 | `numbering.generate_number()` — `NumberingRule`/`NumberingCounter` + `select_for_update()` | `numbering.py:153`; called by `serializers.py:124` | ✅ Yes (row lock, sequential) |
| 2 | `authentication.utils.generate_auto_code(company.id, module)` | model `save()` (models.py:837, 1987, 2337, 2643, …) | depends on that subsystem |
| 3 | **Raw "find last + 1" fallback** inside `save()` | Quotation 848, Proforma 2004, Customer 546, PO 1355-1394, Payment 2649 | ❌ **No locking — racy** |

A document's number depends on **which creation path** runs (DRF serializer vs direct ORM/admin/
script). Path 1 yields template-driven sequential numbers; path 3 yields `QUO-{year}-{n}` /
`PO-{year}-T{timestamp}` formats. → **format/sequence inconsistency** across documents of the same
company. Detail + severity in `FINANCE_BUG_REPORT.md` (B1–B3).

## Permissions / tenant baseline (verified)

- All `finance/viewsets.py` ViewSets extend `CompanyScopedModelViewSet`
  (`common/viewsets.py:25`): `authentication_classes=[ServiceUserSessionAuthentication]`,
  `permission_classes=[IsServiceUserAuthenticated]`, `get_queryset().filter(company=…)`,
  `perform_create` injects company. Reads/`get_object()` are company-scoped (IDOR-safe).
- **Gap:** several serializers expose **unscoped** FK querysets (`PurchaseOrder.objects.all()` etc.)
  and derive `company` from the FK — cross-company write vector (see `FINANCE_SECURITY_REPORT.md`).

## Signals (data consistency)

Wired in `apps.py ready()`. `signals.py` keeps `PurchaseOrder` claimed amounts/status in sync on
`Invoice`/`ProformaInvoice` `post_save`/`post_delete` by **recomputing Python `sum()`** over related
sets. Functionally central, but unlocked + swallows exceptions → consistency risk (BUG B6).

## Celery tasks (`tasks.py`)

- `update_overdue_invoice_statuses` — daily bulk `update()` of past-due unpaid/partial invoices → overdue. (Efficient, system-wide.)
- `process_email_automations_task`, `process_company_email_automations_task(company_id)` — email automation.

## Functional coverage vs requested workflows

| Requested workflow | Status in code |
|--------------------|----------------|
| Customer / Vendor mgmt | ✅ `Customer`, `Vendor` |
| Quotations | ✅ `Quotation` |
| Sales Orders | ⚠️ No distinct `SalesOrder` — `PurchaseOrder` models the **customer's** PO |
| Purchase Orders (procurement) | ✅ `PurchaseRequest`/`VendorInvoice` (vendor side) |
| Invoices / Proforma | ✅ |
| Payments | ✅ `Payment` (+ `PurchasePayment`, TDS) |
| **Credit Notes** | ❌ **Not implemented** (no model) |
| **Debit Notes** | ❌ **Not implemented** (no model) |
| GST features | ✅ HSN/SAC, CGST/SGST/IGST calc, TDS, e-invoice/compliance modules |
| Reports / Dashboard | ✅ analytics_views, financial_reports, viewsets dashboard aggregates |

> The **absence of Credit/Debit Notes** is a functional + compliance gap (GST adjustments for
> returns/rate-differences) — see `FINANCE_WORKFLOW_REPORT.md`.
