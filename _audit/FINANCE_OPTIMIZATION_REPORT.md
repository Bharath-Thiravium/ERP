# FINANCE_OPTIMIZATION_REPORT.md

**Scope:** `backend/finance/` · **READ-ONLY.** Only **real, evidence-backed** inefficiencies/risks —
no speculative refactoring. Severity reflects performance/correctness risk, not style.

---

### O1 — 🟠 PO balance recompute does full Python `sum()` over related sets on every save
- **File/Line:** `signals.py` `update_po_on_invoice_save`/`_proforma_save`/`_delete`:
  `invoice_total = sum(inv.total_amount for inv in po.invoices.all())`,
  `proforma_total = sum(pi.subtotal for pi in po.proforma_invoices.all())`.
- **Why real:** Every invoice/proforma save/delete loads **all** related invoices/proformas into Python
  and sums in app code — O(n) queries-loaded-rows per write; grows with PO history. Also unlocked
  (correctness race — see B6).
- **Impact:** Slower writes on large POs; lost-update race under concurrency.
- **Direction (not applied):** `aggregate(Sum(...))` + `select_for_update()` on the PO, or DB-level
  `F()` updates inside a transaction.

### O2 — 🟡 Money aggregated as `float` with `"nan"`-string guards
- **File/Line:** `viewsets.py:670-672, 914-916, 930, 934, 1052-1054`.
- **Why real:** Dashboard sums cast `Decimal → float`; `str(x).lower() != "nan"` indicates fragile
  float/NaN handling. Display-only, but can disagree with `Decimal` ledger by rounding.
- **Impact:** Minor reporting drift; keep `Decimal`/DB `Sum` for money.

### O3 — 🟡 Per-save `gstin[:2]` GST recomputation logic duplicated across models & serializers
- **File/Line:** `models.py:855, 1404`; `serializers.py:896, 1361, 1819`.
- **Why real:** The intra/inter-state GST decision is reimplemented in ≥5 places (drift risk + B7 bug).
- **Impact:** Inconsistent tax logic if one copy changes; a single helper would reduce risk. (Listed
  because a real correctness bug B7 rides on this duplication — not style alone.)

### O4 — 🟡 ERROR-level logging on the normal payment path
- **File/Line:** `serializers.py` `PaymentCreateSerializer.to_internal_value` logs raw payload at ERROR.
- **Why real:** Every payment create emits an ERROR log with full payload → log-volume + cost + the
  security concern S4.
- **Impact:** Noisy error dashboards, storage cost, sensitive data in logs.

### O5 — 🟡 Numbering self-heal scans existing documents on every allocation
- **File/Line:** `numbering.py` `_get_highest_sequence_number(...)` called inside `generate_number`;
  PO `save()` iterates **all** `existing_pos` (`models.py:1340-1369`).
- **Why real:** Each number allocation also queries/parses existing document numbers to compute the
  highest — extra work per create; the PO fallback loops every existing PO number in Python.
- **Impact:** Allocation cost grows with document count; acceptable now, watch at scale. The
  `select_for_update` counter already guarantees monotonicity, so the per-call max scan is partly redundant.

---

## Structural maintainability risks (real, not cosmetic)

These materially raise defect risk (they are *why* several bugs above exist), so they're reported —
not as a refactor mandate, but as risk flags:

| Item | Evidence | Risk |
|------|----------|------|
| God-files | `views.py` 5,103 · `serializers.py` 4,278 · `models.py` 3,535 | Merge conflicts; the 3 numbering paths (B1) and duplicated GST logic (O3) live in these files and drift |
| Multiple numbering subsystems | `numbering.py` + `generate_auto_code` + raw fallbacks | Source of B1/B2/B4 |
| Overlapping payment serializers | `PaymentCreateSerializer`, `WorldClassPaymentCreateSerializer`, `PaymentUpdateSerializer` (serializers.py 3292, 3436, 3464) | Validation rules (e.g. B5 overpayment) must be repeated; easy to miss one |

## Recommended priority (perf/correctness only)
1. **O1** — aggregate + lock the PO recompute (fixes both perf and the B6 race).
2. **O4/S4** — remove payload ERROR logging.
3. **O2** — keep money in `Decimal` for reported totals.
4. **O3/O5** — consolidate GST + numbering logic *only* because real bugs (B7/B2) stem from the duplication.

> No other refactoring is recommended — the centralized tenant-scoping base class and the
> `unique_together` number constraints are sound and should be preserved as-is.
