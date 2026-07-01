# FINANCE_MANUAL_TEST_CASES.md

**Source:** `FINANCE_BUG_REPORT.md` · `FINANCE_SECURITY_REPORT.md`
**Mode:** READ-ONLY audit output — no code modified.
**Scope:** Five findings: B5, S1, S2, B2, B7.
**Auth convention used throughout:**
- Service user session key: `Authorization: Bearer <session_key>`
- Master Admin JWT: `Authorization: Bearer <master_admin_jwt>`
- All finance endpoints require active session key issued to a service user of an approved company.

---

## Setup: Two-Company Test Environment

All cross-company tests (S1, S2) require two isolated tenants. Complete this once before
running TC-S1-* or TC-S2-*.

### Setup Preconditions
1. PostgreSQL running; fresh local DB with all migrations applied.
2. Redis running; backend on port 8005; frontend on port 8004.
3. Master Admin credentials available (created via `create_master_admin` management command).
4. The Finance service exists and is active in the Master Admin panel.

### Setup Steps

**Step A — Create Company Alpha**
1. Master Admin → Companies → Create Company.
   - Name: `Alpha Corp`; GSTIN: `29AABCU9603R1Z5` (Karnataka); Email: `alpha@test.com`.
2. Assign Finance service to Alpha Corp.
3. Approve Alpha Corp.
4. Create a Service User for Alpha Corp → Finance service.
   - Username: `alpha_finance`; Password: `TestPass@123`.
5. Log in as `alpha_finance` → capture session key: **SESSION_A**.

**Step B — Create Company Beta**
1. Master Admin → Companies → Create Company.
   - Name: `Beta Corp`; GSTIN: `27AABCU9603R1Z6` (Maharashtra); Email: `beta@test.com`.
2. Assign Finance service to Beta Corp.
3. Approve Beta Corp.
4. Create a Service User for Beta Corp → Finance service.
   - Username: `beta_finance`; Password: `TestPass@123`.
5. Log in as `beta_finance` → capture session key: **SESSION_B**.

**Step C — Seed Beta Corp data** (used as attack targets in S1/S2)
Authenticated as **SESSION_B**:
1. Create a Customer in Beta Corp: `Beta Customer`, GSTIN `27AABCU9603R1ZX`.
   Capture: **BETA_CUSTOMER_ID**.
2. Create a Purchase Order in Beta Corp.
   Capture: **BETA_PO_ID** and note the `id` (integer).
3. Create a Proforma Invoice against that PO in Beta Corp.
   Capture: **BETA_PROFORMA_ID**.
4. Create an Invoice against that PO in Beta Corp, amount ₹5,000.
   Capture: **BETA_INVOICE_ID**.

---

## TC-B5-01 — Single Overpayment Exceeds Invoice Total

**Finding:** B5 · **Severity:** 🔴 High
**File/Line:** `backend/finance/serializers.py:3329`

### Test Objective
Verify that the system rejects a payment whose amount exceeds the invoice's outstanding balance.

### Preconditions
- Alpha Corp service user active (SESSION_A).
- At least one customer created in Alpha Corp.
- A Purchase Order in Alpha Corp exists.

### Exact UI Steps
1. Log in as `alpha_finance` at `http://localhost:8004`.
2. Finance → Customers → Create Customer (`Alpha Customer`, any valid GSTIN).
3. Finance → Purchase Orders → Create PO against Alpha Customer. Note PO number.
4. Finance → Invoices → Create Invoice against that PO.
   - Set `Total Amount` = **₹1,000**.
   - Submit and confirm Invoice is created with status `Unpaid`.
5. Finance → Payments → Create Payment.
   - Link to the Invoice created above.
   - Set `Amount` = **₹5,000** (5× the invoice total).
   - Click Submit.

**Expected Result (correct behavior):** Form validation error — `"Payment amount cannot exceed invoice outstanding of ₹1,000.00"` (or equivalent). Payment is NOT created.

**Failure Result (current behavior):** Payment is accepted. Invoice outstanding becomes **-₹4,000**. No error shown. Customer ledger shows a credit balance that does not correspond to any real transaction.

**Screenshots Required:**
- [ ] Invoice detail page showing `Total Amount = ₹1,000`, status = `Unpaid`.
- [ ] Payment creation form with `Amount = ₹5,000` filled in.
- [ ] Response after submit: either success (fail) or validation error (pass).
- [ ] Invoice detail after payment showing `Outstanding` field (negative = fail).

### Exact API Steps
```bash
# 1. Authenticate — get SESSION_A
curl -s -X POST http://localhost:8005/api/auth/service-user/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alpha_finance", "password": "TestPass@123"}' \
  | python3 -m json.tool
# Capture: session_key → SESSION_A

# 2. Create a Customer
curl -s -X POST http://localhost:8005/api/finance/customers/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alpha Customer",
    "gstin": "29AABCU9603R1Z5",
    "email": "customer@alpha.com",
    "phone": "9999999999"
  }' | python3 -m json.tool
# Capture: id → CUSTOMER_ID

# 3. Create a Purchase Order
curl -s -X POST http://localhost:8005/api/finance/purchase-orders/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": CUSTOMER_ID,
    "total_amount": "1000.00",
    "items": [{"description": "Service", "quantity": 1, "unit_price": "1000.00", "amount": "1000.00"}]
  }' | python3 -m json.tool
# Capture: id → PO_ID

# 4. Create an Invoice (total ₹1,000)
curl -s -X POST http://localhost:8005/api/finance/invoices/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "purchase_order": PO_ID,
    "total_amount": "1000.00",
    "items": [{"description": "Service", "quantity": 1, "unit_price": "1000.00", "amount": "1000.00"}]
  }' | python3 -m json.tool
# Capture: id → INVOICE_ID

# 5. Attempt overpayment of ₹5,000 — SHOULD FAIL
curl -s -X POST http://localhost:8005/api/finance/payments/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": INVOICE_ID,
    "amount": "5000.00",
    "payment_date": "2026-06-24",
    "payment_method": "bank_transfer"
  }' | python3 -m json.tool
# PASS: HTTP 400 with validation error message about outstanding
# FAIL: HTTP 201 — payment accepted with amount > invoice total
```

---

## TC-B5-02 — Cumulative Overpayment via Multiple Payments

**Finding:** B5 · **Severity:** 🔴 High

### Test Objective
Verify that the sum of all payments against an invoice cannot exceed the invoice total,
even when each individual payment is within range.

### Preconditions
- Invoice created in Alpha Corp with `Total Amount = ₹1,000` (use INVOICE_ID from TC-B5-01 if unpaid, or create a new one).
- Invoice has zero payments recorded.

### Exact API Steps
```bash
# Payment 1 — ₹700 (within outstanding, should succeed)
curl -s -X POST http://localhost:8005/api/finance/payments/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{"invoice": INVOICE_ID, "amount": "700.00", "payment_date": "2026-06-24", "payment_method": "bank_transfer"}' \
  | python3 -m json.tool
# Expect: 201

# Payment 2 — ₹500 (would bring total to ₹1,200 — exceeds invoice)
curl -s -X POST http://localhost:8005/api/finance/payments/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{"invoice": INVOICE_ID, "amount": "500.00", "payment_date": "2026-06-24", "payment_method": "bank_transfer"}' \
  | python3 -m json.tool
# PASS: HTTP 400 — "Payment amount exceeds outstanding balance of ₹300.00"
# FAIL: HTTP 201 — second payment accepted, total payments now ₹1,200
```

**Expected Result:** Second payment rejected with outstanding-balance error.

**Failure Result:** Both payments accepted; invoice outstanding = -₹200.

**Screenshots Required:**
- [ ] Invoice detail before payments showing `Outstanding = ₹1,000`.
- [ ] Payment 1 success response.
- [ ] Payment 2 response (should be 400; 201 = fail).
- [ ] Invoice detail after both payments showing `Outstanding` field.

---

## TC-S1-01 — Cross-Company Proforma Invoice via Injected PO ID

**Finding:** S1 · **Severity:** 🔴 High
**File/Line:** `backend/finance/serializers.py:1615, 1705`

### Test Objective
Verify that Company A's service user cannot create a Proforma Invoice by referencing
Company B's Purchase Order ID. The system should reject the request with a permission or
validation error; Company A should not inherit Company B's customer/GSTIN.

### Preconditions
- Two-company environment set up (see Setup above).
- BETA_PO_ID is known (an integer PO `id` from Beta Corp's database).
- Authenticated as SESSION_A (Alpha Corp service user).

### Exact UI Steps
1. Log in as `alpha_finance`.
2. Finance → Proforma Invoices → Create New.
3. In the `Purchase Order` dropdown/field, manually enter or intercept the request and
   substitute **BETA_PO_ID** (Beta Corp's PO id).
   *(If the UI dropdown only shows Alpha Corp POs, use the API steps below to bypass UI.)*
4. Fill remaining required fields. Submit.

**Expected Result:** HTTP 400 / form error — `"Purchase Order not found"` or `"You do not have permission to access this Purchase Order."` No record is created.

**Failure Result:** Proforma Invoice is created. The response includes `"company": <Beta's company id>`, `"customer": <Beta's customer>`, `"company_gstin": "<Beta's GSTIN>"` — Alpha's service user now owns a record scoped to Beta Corp.

### Exact API Steps
```bash
# Attack: Alpha service user creates a Proforma Invoice referencing Beta Corp's PO
curl -s -X POST http://localhost:8005/api/finance/proforma-invoices/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "purchase_order": BETA_PO_ID,
    "items": [{"description": "Injected item", "quantity": 1, "unit_price": "100.00", "amount": "100.00"}]
  }' | python3 -m json.tool

# PASS: HTTP 400 — {"purchase_order": ["Invalid pk ... - object does not exist."]} or similar
# FAIL: HTTP 201 — inspect response for:
#   "company": <Beta's company id>   ← cross-tenant write
#   "customer": <Beta's customer id> ← data disclosure
#   "company_gstin": "27..."         ← Beta's GSTIN disclosed to Alpha
```

**Post-check if FAIL (to confirm cross-tenant write):**
```bash
# Log in as SESSION_B and list proforma invoices — the injected record may appear there too
curl -s http://localhost:8005/api/finance/proforma-invoices/ \
  -H "Authorization: Bearer SESSION_B" | python3 -m json.tool
# If the created proforma_invoice appears in Beta's list → confirmed cross-tenant write
```

**Screenshots Required:**
- [ ] Beta Corp PO detail page (to capture BETA_PO_ID and confirm it belongs to Beta).
- [ ] API response body of the POST — full JSON including `company`, `customer`, `company_gstin`.
- [ ] If 201 returned: Alpha's proforma invoice list showing the record.
- [ ] If 201 returned: Beta's proforma invoice list showing the same record.

---

## TC-S1-02 — Cross-Company Invoice via Injected PO ID

**Finding:** S1 · **Severity:** 🔴 High
**File/Line:** `backend/finance/serializers.py:2406, 2411, 1878`

### Test Objective
Same injection attack path as TC-S1-01 but targeting the Invoice endpoint.

### Preconditions
Same two-company environment. BETA_PO_ID known. SESSION_A active.

### Exact API Steps
```bash
# Attack: Alpha service user creates an Invoice referencing Beta Corp's PO
curl -s -X POST http://localhost:8005/api/finance/invoices/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "purchase_order": BETA_PO_ID,
    "total_amount": "500.00",
    "items": [{"description": "Cross-tenant item", "quantity": 1, "unit_price": "500.00", "amount": "500.00"}]
  }' | python3 -m json.tool

# PASS: HTTP 400 — purchase_order id not found for this company
# FAIL: HTTP 201 — response contains Beta's company/customer/GSTIN;
#        AND Beta Corp's PO claimed amounts are now corrupted
```

**Post-check if FAIL:**
```bash
# Check Beta Corp's PO — its invoice_claimed_amount should have increased
# because signals.py recomputes PO balance on Invoice post_save
curl -s http://localhost:8005/api/finance/purchase-orders/BETA_PO_ID/ \
  -H "Authorization: Bearer SESSION_B" | python3 -m json.tool
# If invoice_claimed_amount changed → Beta's financial records corrupted by Alpha's action
```

**Expected Result:** HTTP 400, no record created.

**Failure Result:** HTTP 201 with Beta's data in response; Beta's PO balance mutated by a foreign service user.

**Screenshots Required:**
- [ ] API POST body and full response JSON.
- [ ] Beta Corp PO detail before and after attack (to show claimed amount change if exploited).
- [ ] HTTP status code clearly visible.

---

## TC-S1-03 — Cross-Company Quotation Reference Injection

**Finding:** S1 · **Severity:** 🔴 High
**File/Line:** `backend/finance/serializers.py:1620, 3475, 3481`

### Test Objective
Verify that the `quotation` FK field on Proforma Invoice creation also enforces company scoping.

### Preconditions
- SESSION_B creates a Quotation in Beta Corp. Capture: **BETA_QUOTATION_ID**.

**Seed (run as SESSION_B):**
```bash
curl -s -X POST http://localhost:8005/api/finance/quotations/ \
  -H "Authorization: Bearer SESSION_B" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": BETA_CUSTOMER_ID,
    "items": [{"description": "Beta item", "quantity": 1, "unit_price": "200.00", "amount": "200.00"}]
  }' | python3 -m json.tool
# Capture: id → BETA_QUOTATION_ID
```

### Exact API Steps
```bash
# Attack: Alpha creates a Proforma referencing Beta's Quotation
curl -s -X POST http://localhost:8005/api/finance/proforma-invoices/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "quotation": BETA_QUOTATION_ID,
    "items": [{"description": "Item", "quantity": 1, "unit_price": "200.00", "amount": "200.00"}]
  }' | python3 -m json.tool

# PASS: HTTP 400
# FAIL: HTTP 201 with Beta's quotation data copied into Alpha's proforma
```

**Screenshots Required:**
- [ ] Full response JSON showing `quotation`, `company`, `customer` fields.

---

## TC-S2-01 — Cross-Company Payment Posted to Beta's Invoice

**Finding:** S2 · **Severity:** 🟠 Medium (compounds with B5 to 🔴 High impact)
**File/Line:** `backend/finance/serializers.py:3292, 3304–3310`

### Test Objective
Verify that a payment cannot be posted against an invoice belonging to a different company.
An attacker from Company A should not be able to reduce Company B's invoice outstanding.

### Preconditions
- Two-company environment. BETA_INVOICE_ID known (Beta's invoice, total ₹5,000).
- SESSION_A active (Alpha Corp).

### Exact UI Steps
1. Log in as `alpha_finance`.
2. Finance → Payments → Create Payment.
3. In the `Invoice` field, manually enter **BETA_INVOICE_ID**.
4. Set Amount = ₹500. Submit.

**Expected Result:** HTTP 400 — `"Invoice not found"` or ownership validation error.

**Failure Result:** HTTP 201 — payment created. Beta's invoice outstanding reduces by ₹500 — a foreign service user has posted a financial transaction against another company's ledger.

### Exact API Steps
```bash
# Attack: Alpha's service user posts a payment against Beta's invoice
curl -s -X POST http://localhost:8005/api/finance/payments/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": BETA_INVOICE_ID,
    "amount": "500.00",
    "payment_date": "2026-06-24",
    "payment_method": "bank_transfer"
  }' | python3 -m json.tool

# PASS: HTTP 400 — invoice id not accessible
# FAIL: HTTP 201 — payment created; inspect Beta's invoice outstanding:

curl -s http://localhost:8005/api/finance/invoices/BETA_INVOICE_ID/ \
  -H "Authorization: Bearer SESSION_B" | python3 -m json.tool
# If outstanding changed from ₹5,000 → ₹4,500 → confirmed cross-tenant financial corruption
```

**Screenshots Required:**
- [ ] Beta's invoice detail BEFORE attack (outstanding = ₹5,000).
- [ ] API POST response from Alpha's session (body + HTTP status).
- [ ] Beta's invoice detail AFTER attack (outstanding field — change = fail).

---

## TC-S2-02 — Cross-Company Payment Against Beta's Proforma Invoice

**Finding:** S2 · **Severity:** 🟠 Medium
**File/Line:** `backend/finance/serializers.py:3304–3310`

### Test Objective
Same as TC-S2-01 but targeting the `proforma_invoice` FK on the payment serializer.

### Preconditions
BETA_PROFORMA_ID known (from Setup Step C). SESSION_A active.

### Exact API Steps
```bash
curl -s -X POST http://localhost:8005/api/finance/payments/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "proforma_invoice": BETA_PROFORMA_ID,
    "amount": "250.00",
    "payment_date": "2026-06-24",
    "payment_method": "bank_transfer"
  }' | python3 -m json.tool

# PASS: HTTP 400
# FAIL: HTTP 201 — Beta's proforma outstanding has been reduced by an unauthorized payment
```

**Screenshots Required:**
- [ ] API response body + HTTP status.
- [ ] Beta's proforma invoice outstanding before and after.

---

## TC-S1S2-03 — Compound: Cross-Company Payment + Overpayment (B5 + S2)

**Finding:** B5 + S2 combined · **Severity:** 🔴 High (compound)

### Test Objective
Verify that both B5 and S2 must be fixed together: even if a payment is correctly rejected
by the company-scope check (S2 fixed), the overpayment cap (B5) must also be enforced to
prevent financial abuse within the same company.

### Test Steps
1. As Alpha, create an invoice for ₹500 (ALPHA_INVOICE_ID).
2. POST a payment of ₹500 to ALPHA_INVOICE_ID → expect success (within company, within amount).
3. POST a second payment of ₹1 to ALPHA_INVOICE_ID → expect rejection (outstanding = ₹0).

```bash
# Payment 1 — full invoice (should succeed)
curl -s -X POST http://localhost:8005/api/finance/payments/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{"invoice": ALPHA_INVOICE_ID, "amount": "500.00", "payment_date": "2026-06-24", "payment_method": "bank_transfer"}' \
  | python3 -m json.tool

# Payment 2 — 1 rupee after full payment (should fail with B5 fix)
curl -s -X POST http://localhost:8005/api/finance/payments/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{"invoice": ALPHA_INVOICE_ID, "amount": "1.00", "payment_date": "2026-06-24", "payment_method": "bank_transfer"}' \
  | python3 -m json.tool
# PASS: HTTP 400 — "Invoice is fully paid."
# FAIL: HTTP 201 — invoice outstanding goes to -₹1
```

---

## TC-B2-01 — Concurrent Quotation Creation Race Condition

**Finding:** B2 · **Severity:** 🟠 Medium
**File/Line:** `backend/finance/models.py:848`

### Test Objective
Verify that concurrent creation of two quotations for the same company does not result in
a 500 error (IntegrityError from duplicate quotation number) or a non-sequential fallback
number format such as `QUO-2026-T1719220000`.

### Preconditions
- Alpha Corp service user active (SESSION_A).
- A customer exists in Alpha Corp (CUSTOMER_ID).
- `ab` (Apache Bench) or `curl` parallel invocation available on test machine.

### Setup — Save Payload to File
```bash
cat > /tmp/quotation_payload.json << 'EOF'
{
  "customer": CUSTOMER_ID,
  "valid_until": "2026-07-24",
  "items": [
    {
      "description": "Concurrent test item",
      "quantity": 1,
      "unit_price": "100.00",
      "amount": "100.00"
    }
  ]
}
EOF
```

### Exact API Steps — Two Concurrent Requests
```bash
# Method A: parallel curl (background processes)
curl -s -X POST http://localhost:8005/api/finance/quotations/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d @/tmp/quotation_payload.json > /tmp/response_A.json &

curl -s -X POST http://localhost:8005/api/finance/quotations/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d @/tmp/quotation_payload.json > /tmp/response_B.json &

wait

cat /tmp/response_A.json | python3 -m json.tool
cat /tmp/response_B.json | python3 -m json.tool
```

```bash
# Method B: Apache Bench (10 concurrent requests)
# Install: sudo apt install apache2-utils
ab -n 10 -c 10 -p /tmp/quotation_payload.json -T "application/json" \
  -H "Authorization: Bearer SESSION_A" \
  http://localhost:8005/api/finance/quotations/
```

### Exact UI Steps
1. Open two browser tabs, both logged in as `alpha_finance`.
2. In both tabs: Finance → Quotations → Create New. Fill in identical details.
3. Click Submit on both tabs simultaneously (within 200ms of each other).

**Expected Result (correct behavior):** Both quotations are created with unique, sequential numbers (e.g., `QUO-2026-0001` and `QUO-2026-0002`). No 500 errors.

**Failure Result — Type 1 (500 error):** One or both requests return HTTP 500 with an IntegrityError (unique constraint violation). Shown in browser as error page.

**Failure Result — Type 2 (non-sequential fallback):** Both requests return 201 but one quotation number contains a timestamp: `QUO-2026-T1719220000` or `QUO-FALLBACK-1719220000`. Indicates the racy fallback at `models.py:1383/1394` was triggered.

### Post-Check
```bash
# List quotations and check number formats
curl -s http://localhost:8005/api/finance/quotations/ \
  -H "Authorization: Bearer SESSION_A" \
  | python3 -c "import json,sys; [print(q['quotation_number']) for q in json.load(sys.stdin)['results']]"
# PASS: All numbers match pattern QUO-YYYY-NNNN (sequential)
# FAIL: Any number contains T + timestamp or FALLBACK
```

**Screenshots Required:**
- [ ] Response body of both concurrent requests (show quotation_number field in each).
- [ ] Any 500 error page if IntegrityError occurs.
- [ ] List of all quotation numbers after the test run.

---

## TC-B2-02 — Concurrent Purchase Order Creation Race Condition

**Finding:** B2 · **Severity:** 🟠 Medium
**File/Line:** `backend/finance/models.py:1355–1394`

### Test Objective
PO has a more complex fallback (max+1 loop → timestamp → FALLBACK) — verify that concurrent
PO creation does not produce non-sequential PO numbers or 500s.

### Preconditions
- Alpha Corp has at least 5 existing POs (to ensure the `max+1` scan path is exercised).
  Create them serially first if needed.

### Exact API Steps
```bash
cat > /tmp/po_payload.json << 'EOF'
{
  "customer": CUSTOMER_ID,
  "total_amount": "1000.00",
  "items": [{"description": "PO item", "quantity": 1, "unit_price": "1000.00", "amount": "1000.00"}]
}
EOF

# Fire 5 concurrent PO creates
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost:8005/api/finance/purchase-orders/ \
    -H "Authorization: Bearer SESSION_A" \
    -H "Content-Type: application/json" \
    -d @/tmp/po_payload.json > /tmp/po_resp_${i}.json &
done
wait

for i in 1 2 3 4 5; do
  echo "=== Response $i ==="
  python3 -c "import json; d=json.load(open('/tmp/po_resp_${i}.json')); print(d.get('internal_po_number','ERROR:'), d.get('detail',''))"
done
```

**Expected Result:** All 5 POs created with sequential `PO-2026-NNNN` numbers, no duplicates, no 500s.

**Failure Result — Watch for:**
- Any response with `"internal_po_number": "PO-2026-T1719..."` — timestamp fallback at `models.py:1383`.
- Any response with `"internal_po_number": "PO-FALLBACK-1719..."` — last-resort fallback at `models.py:1394`.
- Any HTTP 500 with `unique constraint` in error body.

**Screenshots Required:**
- [ ] Terminal output showing all 5 `internal_po_number` values (highlight any containing `T` or `FALLBACK`).
- [ ] Any 500 error response body.

---

## TC-B7-01 — Wrong GST Type for Customer with Missing/Short GSTIN

**Finding:** B7 · **Severity:** 🟠 Medium
**File/Line:** `backend/finance/models.py:855–856`; `serializers.py:896–897`

### Test Objective
Verify that creating a quotation/invoice for a customer with an empty or malformed GSTIN
(e.g., B2C unregistered customer) does not cause a server error or silently compute the
wrong GST type (CGST+SGST vs IGST).

### Preconditions
- Alpha Corp registered in Karnataka (state code `29`, GSTIN `29AABCU9603R1Z5`).
- SESSION_A active.

### Exact UI Steps — Part A: Empty GSTIN Customer
1. Finance → Customers → Create Customer.
   - Name: `B2C Unregistered`; GSTIN: leave blank (unregistered consumer).
   - Save. Note CUSTOMER_ID_B2C.
2. Finance → Quotations → Create Quotation for `B2C Unregistered`.
   - Add one line item: ₹1,000.
   - Submit.
3. Open the created quotation. Check the GST breakdown:
   - Does it show CGST + SGST? Or IGST? Or a server error?

**Expected Result:** System handles missing GSTIN gracefully. Either:
- (a) Defaults to IGST for B2C or shows a validation prompt asking for state; OR
- (b) Shows a clear error: "Customer GSTIN is required for GST computation."
No 500 error. GST type is NOT determined by `""[:2]` (which returns `""` and would compare unequal to any state code, potentially computing IGST incorrectly).

**Failure Result:** HTTP 500 — `IndexError`/`AttributeError` slicing empty string; OR silent wrong GST type (IGST computed when CGST+SGST expected or vice versa).

### Exact API Steps — Part A
```bash
# Create unregistered customer (no GSTIN)
curl -s -X POST http://localhost:8005/api/finance/customers/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "B2C Unregistered",
    "gstin": "",
    "email": "b2c@test.com",
    "phone": "8888888888"
  }' | python3 -m json.tool
# Capture: id → CUSTOMER_B2C_ID

# Create quotation for unregistered customer
curl -s -X POST http://localhost:8005/api/finance/quotations/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": CUSTOMER_B2C_ID,
    "valid_until": "2026-07-24",
    "items": [{"description": "Service", "quantity": 1, "unit_price": "1000.00", "amount": "1000.00", "tax_rate": "18.00"}]
  }' | python3 -m json.tool
# Check response for: "gst_type", "cgst", "sgst", "igst" fields
# FAIL: HTTP 500 / IndexError / AttributeError
# AMBIGUOUS: HTTP 201 but gst_type wrong (requires visual verification)
```

### Exact UI Steps — Part B: Wrong State GSTIN (Cross-State)
1. Finance → Customers → Create Customer.
   - Name: `Maharashtra Customer`; GSTIN: `27AABCU9603R1Z6` (state code `27` = Maharashtra).
   - Save. Note CUSTOMER_ID_MH.
2. Finance → Quotations → Create Quotation for `Maharashtra Customer` (cross-state from Karnataka Alpha Corp).
   - Add a line item: ₹1,000 + 18% GST.
   - Submit and check GST breakdown.

**Expected Result:** `gst_type = IGST` (inter-state: Alpha=Karnataka 29, Customer=Maharashtra 27 → different states).

**Failure Result:** `gst_type = CGST+SGST` (wrong — would mean incorrect intra-state tax computation on an inter-state transaction).

### Exact API Steps — Part B
```bash
# Create Maharashtra customer (state code 27)
curl -s -X POST http://localhost:8005/api/finance/customers/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maharashtra Customer",
    "gstin": "27AABCU9603R1Z6",
    "email": "mh@test.com",
    "phone": "7777777777"
  }' | python3 -m json.tool
# Capture: id → CUSTOMER_MH_ID

# Create quotation — check GST type in response
curl -s -X POST http://localhost:8005/api/finance/quotations/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": CUSTOMER_MH_ID,
    "valid_until": "2026-07-24",
    "items": [{"description": "Inter-state service", "quantity": 1, "unit_price": "1000.00", "amount": "1000.00", "tax_rate": "18.00"}]
  }' | python3 -m json.tool
# Check response: "gst_type" field
# PASS: "gst_type": "IGST" (state 27 ≠ state 29 → inter-state)
# FAIL: "gst_type": "CGST_SGST" (wrong — intra-state misidentification)
```

### Exact UI Steps — Part C: Truncated/Short GSTIN (7 chars)
1. Create a customer with GSTIN = `29AABC` (6 characters — too short to slice `[:2]` safely for state logic but not necessarily rejected at model level).
2. Create a quotation for this customer.
3. Note: `gstin[:2]` on `"29AABC"` = `"29"` (coincidentally same state) — this must not crash.

```bash
# Short GSTIN — does it cause 500?
curl -s -X POST http://localhost:8005/api/finance/customers/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{"name": "Short GSTIN Corp", "gstin": "29AA", "email": "short@test.com", "phone": "6666666666"}' \
  | python3 -m json.tool
# If customer is accepted (no GSTIN format validation), create a quotation and observe GST type.
# An empty GSTIN (len < 2) will cause gstin[:2] to return < 2 chars → state-code comparison unreliable.
```

**Screenshots Required:**
- [ ] Quotation/Invoice detail showing `gst_type`, `cgst`, `sgst`, `igst` fields for each scenario.
- [ ] Any 500 error page with the stack trace (to confirm `gstin[:2]` is the source).
- [ ] Customer form with empty GSTIN submitted (to confirm whether validation rejects it).

---

## TC-B7-02 — GST Type on Invoice Matches Quotation GST Type

**Finding:** B7 · **Severity:** 🟠 Medium (consistency check)

### Test Objective
Verify that the GST type computed at Invoice creation time matches the type set at Quotation
creation time for the same customer. Since the GST logic is duplicated in 5+ places (O3),
a discrepancy between quotation and invoice stage would confirm drift from the duplication.

### Exact Steps
```bash
# 1. Create quotation for Maharashtra customer (from TC-B7-01 Part B)
#    Note gst_type in quotation response → EXPECTED_TYPE

# 2. Convert quotation to PO (or create PO linked to same customer)
curl -s -X POST http://localhost:8005/api/finance/purchase-orders/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{"customer": CUSTOMER_MH_ID, "total_amount": "1180.00", "items": [...]}' \
  | python3 -m json.tool
# Note gst_type on PO response

# 3. Create Invoice linked to PO
curl -s -X POST http://localhost:8005/api/finance/invoices/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{"purchase_order": PO_ID, "total_amount": "1180.00", "items": [...]}' \
  | python3 -m json.tool
# Note gst_type on Invoice response

# Compare: Quotation gst_type == PO gst_type == Invoice gst_type?
# PASS: All three return "IGST"
# FAIL: Any mismatch — e.g., Quotation=IGST but Invoice=CGST_SGST → duplication drift (O3)
```

**Screenshots Required:**
- [ ] Quotation response with `gst_type` field visible.
- [ ] Invoice response with `gst_type` field visible (same customer/company).

---

## Pass/Fail Summary Template

Use this table after completing all test cases to record results.

| Test Case | Finding | Severity | Result | Notes |
|-----------|---------|----------|--------|-------|
| TC-B5-01 | B5 Overpayment (single) | 🔴 High | PASS / **FAIL** | |
| TC-B5-02 | B5 Overpayment (cumulative) | 🔴 High | PASS / **FAIL** | |
| TC-S1-01 | S1 Proforma cross-company PO | 🔴 High | PASS / **FAIL** | |
| TC-S1-02 | S1 Invoice cross-company PO | 🔴 High | PASS / **FAIL** | |
| TC-S1-03 | S1 Quotation reference injection | 🔴 High | PASS / **FAIL** | |
| TC-S2-01 | S2 Payment → Beta Invoice | 🟠 Medium | PASS / **FAIL** | |
| TC-S2-02 | S2 Payment → Beta Proforma | 🟠 Medium | PASS / **FAIL** | |
| TC-S1S2-03 | B5+S2 compound | 🔴 High | PASS / **FAIL** | |
| TC-B2-01 | B2 Concurrent Quotations | 🟠 Medium | PASS / **FAIL** | |
| TC-B2-02 | B2 Concurrent POs | 🟠 Medium | PASS / **FAIL** | |
| TC-B7-01A | B7 Empty GSTIN | 🟠 Medium | PASS / **FAIL** | |
| TC-B7-01B | B7 Cross-state GST type | 🟠 Medium | PASS / **FAIL** | |
| TC-B7-01C | B7 Short GSTIN | 🟠 Medium | PASS / **FAIL** | |
| TC-B7-02 | B7 GST type consistency | 🟠 Medium | PASS / **FAIL** | |

**Recommended execution order:** TC-S1-01/02 → TC-S2-01/02 (security critical, fail fast) →
TC-B5-01/02 (financial integrity) → TC-B7-01A/B (GST correctness) → TC-B2-01/02 (concurrency,
requires load).
