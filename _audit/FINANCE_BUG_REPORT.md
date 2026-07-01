# FINANCE_BUG_REPORT.md

**Scope:** `backend/finance/` · **READ-ONLY.** Actual defects only. Severity: 🔴 High · 🟠 Medium · 🟡 Low.
Each: File · Line · Proof · Reproduction · Business impact.

---

### B1 — 🟠 Three coexisting numbering systems → inconsistent number formats
- **File/Line:** `numbering.py:153` (`generate_number`, called only at `serializers.py:124`) vs
  `models.py` `save()` using `generate_auto_code` (837, 1987, 2337, 2643) **and** raw fallbacks (848, 2004, 2649).
- **Proof:** Serializer path sets `validated_data[field]=generate_number(...)` (template-based);
  model `save()` sets `QUO-{year}-{n}` / `PI-{year}-{n}` / `PAY-{year}-{n}` when number is empty.
- **Reproduction:** Create a quotation via the API (serializer → `generate_number` template) vs via
  Django admin/script/management command (→ `save()` fallback). Compare formats.
- **Business impact:** Same company ends up with **mixed document-number formats/sequences**,
  breaking auditor expectations and sequence continuity reporting.

### B2 — 🟠 Racy "find last + 1" numbering fallback → IntegrityError/500 + non-sequential numbers
- **File/Line:** `models.py:848` (Quotation), `2004` (Proforma), `546` (Customer), `2649` (Payment),
  `1355-1394` (PO: max+1 loop + `time.time()` timestamp fallback at 1383/1394).
- **Proof:** `last = Quotation.objects.filter(...).order_by('-id').first(); n = int(last.split('-')[-1])+1`
  with **no `select_for_update`/lock**. PO path explicitly retries on `'unique constraint'` (1387).
- **Reproduction:** Two concurrent creates of the same module/company via the fallback path: both read
  the same "last", compute the same next number → one save hits `unique_together` → **IntegrityError → 500**.
  Under load the PO path falls back to `PO-{yr}-T{timestamp}` / `PO-FALLBACK-{ts}` → **non-sequential**.
- **Business impact:** User-facing 500s on document creation; non-sequential invoice/PO numbers
  (GST sequence-continuity concern); the existing `fix_*_numbering` scripts confirm recurring incidents.
- **Note:** Duplicates are **not persisted** (DB `unique_together` blocks them) — the symptom is failed
  saves + ugly fallback numbers, not duplicate records. The canonical `generate_number` (B-safe) is correct.

### B3 — 🟡 Customer/Vendor code fallback shares the same racy pattern
- **File/Line:** `models.py:546` (Customer), `3027` (Vendor).
- **Proof/Repro/Impact:** As B2 but for master codes; concurrent master creation → 500. Lower
  frequency than transactional docs.

### B4 — 🟠 `generate_number` advances the counter in its own transaction → sequence gaps
- **File/Line:** `numbering.py` `with transaction.atomic(): counter.next_value = seq+1; counter.save()`
  (inside `generate_number`), separate from the document INSERT.
- **Proof:** The counter commits when `generate_number` returns (serializers.py:124), before/independent
  of the document save. If the surrounding create fails/validation errors after number allocation, the
  counter is **not rolled back**.
- **Reproduction:** Call the create endpoint with data that passes numbering but fails a later
  validation/DB error → number consumed, no document → gap in the sequence.
- **Business impact:** Gaps in GST invoice sequences (auditors require continuous numbering);
  reconciliation queries report "missing" numbers.

### B5 — 🔴 Payments are not capped to invoice outstanding → overpayment / negative balance
- **File/Line:** `serializers.py:3329` `PaymentCreateSerializer.validate_amount`.
- **Proof:**
  ```python
  def validate_amount(self, value):
      if value is not None and value <= 0:
          raise serializers.ValidationError("Payment amount must be greater than 0")
      return value          # no check against invoice/proforma outstanding
  ```
  No `validate()` compares `amount` (or `sum(existing payments)+amount`) to the invoice total/outstanding.
- **Reproduction:** Create an invoice of ₹1,000; POST a Payment of ₹5,000 (or several payments summing
  beyond ₹1,000). All succeed.
- **Business impact:** Over-allocated payments, **negative outstanding**, wrong customer ledger and
  revenue/receivables — direct financial-integrity defect.

### B6 — 🟠 PO claimed-amount recompute is unlocked + swallows exceptions (lost updates / stale balances)
- **File/Line:** `signals.py` `update_po_on_invoice_save` (~:140), `_save`/`_delete` handlers; recompute
  `invoice_total = sum(inv.total_amount for inv in po.invoices.all())`; `except Exception: logger.error(...)`.
- **Proof:** No `select_for_update` on the `PurchaseOrder`; full Python `sum()` then `po.save(update_fields=…)`.
  The entire handler is wrapped in `try/except Exception` that only logs.
- **Reproduction:** (a) Two invoices for the same PO committed nearly simultaneously → interleaved
  recompute → PO `invoice_claimed_amount`/`remaining_invoice_balance` reflects only one (lost update).
  (b) Any error in the handler → invoice is saved but **PO balance silently not updated** → stale.
- **Business impact:** Incorrect PO claimed/remaining balances and invoice/proforma status; explains the
  `fix_po_claimed_amounts.sh` / `fix_po_balance_tracking` remediation scripts in the repo.

### B7 — 🟠 GST CGST/SGST-vs-IGST derived from `gstin[:2]` without validation
- **File/Line:** `models.py:855-856`, `1404-1405`; `serializers.py:896-897, 1361-1362, 1819-1820`.
- **Proof:** `customer_state_code = self.customer.gstin[:2]; company_state_code = self.company.gst_number[:2]`
  with no length/format validation; intra vs inter-state tax chosen on equality.
- **Reproduction:** Customer with malformed/empty/short GSTIN, or a B2C customer with no GSTIN, or
  mismatched state code → wrong `gst_type` (CGST+SGST vs IGST) → **incorrect tax computed on the invoice**.
- **Business impact:** Wrong GST split on tax invoices = compliance error, incorrect tax liability,
  potential penalties on filing.

### B8 — 🟡 PO balance mixes pre-tax (proforma `subtotal`) and tax-inclusive (invoice `total_amount`)
- **File/Line:** `signals.py` — `proforma_total = sum(pi.subtotal …)` vs `invoice_total = sum(inv.total_amount …)`;
  `remaining_proforma_balance = po.subtotal - proforma_total`, `remaining_invoice_balance = po.total_amount - invoice_total`.
- **Proof:** Proforma claimed tracked on **subtotal** (ex-tax) against `po.subtotal`; invoice claimed on
  **total_amount** (inc-tax) against `po.total_amount`.
- **Reproduction:** Compare proforma vs invoice claimed/remaining on a PO with tax — the two scales differ.
- **Business impact:** If any logic compares the two (or users read them as the same "claimed" basis),
  claim percentages mislead. Verify intended; if intentional, document the two bases.

### B9 — 🟠 Credit Notes and Debit Notes are not implemented
- **File/Line:** entire `finance/` — `grep -i "class .*(CreditNote|DebitNote)" → NONE`.
- **Proof:** No model/serializer/view/URL for credit or debit notes.
- **Reproduction:** No endpoint to issue a credit note against an invoice (returns, rate diff, cancellation).
- **Business impact:** GST adjustments after invoicing cannot be issued compliantly; revenue
  corrections handled ad hoc (e.g., direct invoice edits/deletes via management commands) — audit-trail gap.

### B10 — 🟡 Money cast to `float` in dashboard/report aggregations
- **File/Line:** `viewsets.py:670-672, 914-916, 930, 934, 1052-1054`.
- **Proof:** `'total_amount': float(agg['total_amount'] or 0)`, plus `str(x).lower() != "nan"` guards.
- **Reproduction:** Aggregations with many rows accumulate float rounding; the `"nan"` string checks
  indicate fragile float/NaN handling.
- **Business impact:** Display-only (not persisted), but dashboard totals can disagree with `Decimal`
  ledger by rounding paise. Keep `Decimal` end-to-end for reported money.

---

## Severity roll-up
| Severity | Items |
|----------|-------|
| 🔴 High | B5 (overpayment) |
| 🟠 Medium | B1, B2, B4, B6, B7, B9 |
| 🟡 Low | B3, B8, B10 |

## Reproducible audit commands
```bash
cd backend/finance
grep -n "def validate_amount" serializers.py            # B5
grep -n "order_by('-id').first()\|max_number + 1\|latest_payment" models.py   # B2/B3
grep -n "select_for_update" numbering.py signals.py     # B4/B6 (present in numbering, absent in signals)
grep -ni "class .*CreditNote\|class .*DebitNote" *.py    # B9 (none)
grep -n "gstin\[:2\]" models.py serializers.py          # B7
```
