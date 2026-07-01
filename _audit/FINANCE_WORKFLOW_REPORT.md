# FINANCE_WORKFLOW_REPORT.md

**Scope:** `backend/finance/` · **READ-ONLY.** Each workflow checked against: Tenant Isolation,
Permission Enforcement, Data Ownership, Validation, Duplicate-Number Prevention, Race Conditions,
Data Integrity, Audit Trail, Financial Consistency. ✅ ok · ⚠️ risk · ❌ defect/absent.
(Detailed proofs in `FINANCE_BUG_REPORT.md` / `FINANCE_SECURITY_REPORT.md`.)

## Legend of cross-references
B# = bug report item · S# = security report item.

## 1. Customer Management
| Dimension | Status | Note |
|-----------|:--:|------|
| Tenant isolation | ✅ | `CustomerViewSet(CompanyScopedModelViewSet)` |
| Permissions | ✅ | session auth + `IsServiceUserAuthenticated` |
| Data ownership | ✅ | `company` injected on create |
| Validation | ✅ | `validate_gstin/pan/aadhar` |
| Duplicate prevention | ✅ | `unique_together(company, customer_code)` (models 427) |
| Race conditions | ⚠️ | `Customer.save()` racy `last+1` fallback (models 546) → B3 |
| Data integrity | ✅ | — |
| Audit trail | ⚠️ | `created_by` tracked; no update/delete audit log |
| Financial consistency | ✅ | opening_balance fields present |

## 2. Vendor Management
Same profile as Customer. Tenant ✅, dup-prevent ✅ `unique_together(company, vendor_code)` (3018),
racy fallback in `Vendor.save()` (3027) → B3. Audit ⚠️.

## 3. Quotations
| Dimension | Status | Note |
|-----------|:--:|------|
| Tenant isolation | ✅ | `QuotationViewSet` scoped |
| Permissions | ✅ | — |
| Validation | ✅ | `validate_quotation_items` (serializers 865) |
| Duplicate prevention | ✅ | `unique_together(company, quotation_number)` (824) |
| Race conditions | ⚠️ | `Quotation.save()` racy `order_by('-id').first()`+split+1 (models 848) → B2 |
| Number consistency | ⚠️ | serializer path vs save() path differ → B1 |
| GST type | ⚠️ | `gstin[:2]` state slice, no length guard (models 855) → B7 |
| Audit trail | ✅ | `revised_by`/`rejected_by`/`created_by` |

## 4. Sales Orders
❌ **No dedicated SalesOrder entity.** `PurchaseOrder` represents the **customer's** PO. If a true
sales-order stage is expected, it's missing — verify business intent (architecture report).

## 5. Purchase Orders (PO from customer)
| Dimension | Status | Note |
|-----------|:--:|------|
| Tenant isolation | ✅ | `PurchaseOrderViewSet` scoped |
| Duplicate prevention | ✅ | `unique_together(company, internal_po_number)` (1296) |
| Race conditions | ⚠️ | `PO.save()` max+1 loop + timestamp fallback, retry-on-IntegrityError (1340-1395) → B2 |
| Number consistency | ❌ | timestamp fallback yields non-sequential `PO-{yr}-T######` / `PO-FALLBACK-######` (1383, 1394) → B2 |
| Data integrity | ⚠️ | `fix_balance_tracking()`/`update_balance_tracking()` exist — signals recompute claimed amounts → B6 |
| Financial consistency | ⚠️ | claimed-amount recompute race (B6); proforma uses `subtotal`, invoice uses `total_amount` (signals 30/40) → B8 |

## 6. Proforma Invoices
Tenant ✅. Dup-prevent ✅ (1974). Racy save() fallback (2004) → B2. **FK injection:**
`purchase_order`/`quotation` serializer querysets unscoped; company set from `purchase_order.company`
(serializers 1705) → **S1 (cross-company)**. Claim-% validated vs remaining proforma balance
(serializers 1688-1700) ✅. Audit ✅.

## 7. Invoices
| Dimension | Status | Note |
|-----------|:--:|------|
| Tenant isolation | ✅ (reads) / ⚠️ (writes) | `InvoiceViewSet` scoped; serializer FK unscoped → S1 |
| Duplicate prevention | ✅ | `unique_together(company, invoice_number)` (2318) |
| Race conditions | ⚠️ | `Invoice.save()` numbering (2337) + serializer path → B1/B2; sequence gaps → B4 |
| Data integrity | ⚠️ | PO claimed-amount sync via signals (B6) |
| GST | ⚠️ | CGST/SGST vs IGST from `gstin[:2]` (B7) |
| Audit trail | ✅ | `created_by`, `revised_by`, `rejected_by`; `is_rejected` flag |
| Financial consistency | ⚠️ | overdue marking by `due_date` only, not recomputed from payments (tasks 9-19) |

## 8. Payments
| Dimension | Status | Note |
|-----------|:--:|------|
| Tenant isolation | ✅ (reads) / ⚠️ (writes) | `PaymentViewSet` scoped; `invoice`/`proforma_invoice` FK querysets unscoped → S1 |
| Permissions | ✅ | — |
| Validation | ❌ | `validate_amount` only checks `> 0` (serializers 3329) — **no cap vs invoice outstanding** → B5 |
| Duplicate prevention | ✅ | `unique_together(company, payment_number)` (2626) |
| Race conditions | ⚠️ | `Payment.save()` racy `latest+1` fallback (2649) → B2 |
| Data integrity | ⚠️ | overpayment → negative outstanding (B5); TDS net-amount fields present |
| Financial consistency | ❌ | over-allocation possible; no reconciliation of sum(payments) ≤ invoice.total → B5 |
| Audit trail | ✅ | `created_by` |

## 9. Credit Notes
❌ **Not implemented** — no `CreditNote` model/serializer/view. **Compliance impact:** GST returns
and post-invoice reductions cannot be issued as compliant credit notes. → B9.

## 10. Debit Notes
❌ **Not implemented** — no `DebitNote` model. Post-invoice upward adjustments unsupported. → B9.

## 11. GST Features
- HSN/SAC tax codes ✅ (global). CGST/SGST/IGST split computed from state codes ⚠️ `gstin[:2]`
  without validation (B7); B2C/unregistered (no customer GSTIN) branch needs verification.
- TDS on payments ✅ (fields + serializer). E-invoice/compliance modules present
  (`einvoice_service.py`, `indian_compliance*.py`) — many depend on government APIs (credentials).

## 12. Reports / Dashboard Metrics
- Aggregates in `viewsets.py` dashboards + `analytics_views.py`, `financial_reports.py`.
- ⚠️ Dashboard sums cast to `float()` (viewsets 670-672, 914-916, 1052) — display rounding risk → B10.
- Tenant ✅ (scoped querysets). Performance: per-PO `sum()` recompute in signals → O1.

## Cross-workflow summary

| Theme | Verdict |
|-------|---------|
| Tenant isolation (reads) | ✅ centralized via `CompanyScopedModelViewSet` |
| Tenant isolation (writes via FK) | ❌ cross-company FK injection (S1) |
| Duplicate numbers | ✅ DB-prevented (`unique_together`) |
| Numbering races | ⚠️ racy fallbacks → 500s + non-sequential numbers (B1/B2) |
| Payment integrity | ❌ no overpayment cap (B5) |
| PO balance consistency | ⚠️ unlocked recompute + silent failures (B6) |
| Credit/Debit notes | ❌ absent (B9) |
| Audit trail | ⚠️ create tracked; update/delete largely unlogged |
