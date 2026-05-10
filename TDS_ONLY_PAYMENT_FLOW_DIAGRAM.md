# TDS-Only Payment Flow Diagram

## Scenario 1: TDS Paid in Advance

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE CREATED                              │
│                                                                 │
│  Invoice Number: INV-2025-000123                               │
│  Total Amount: ₹1,00,000                                       │
│  TDS Rate: 5%                                                  │
│  Expected TDS: ₹5,000                                          │
│  Expected Net: ₹95,000                                         │
│                                                                 │
│  Status: Unpaid                                                │
│  Outstanding: ₹1,00,000                                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 1: CUSTOMER PAYS TDS (ADVANCE)                │
│                                                                 │
│  Payment Date: 2025-01-15                                      │
│  Amount Received: ₹0                                           │
│  TDS Amount: ₹5,000                                            │
│  Net Amount: ₹0                                                │
│  Reference: TDS Challan #12345                                 │
│                                                                 │
│  ✅ TDS Payment Recorded                                       │
│  Payment Number: PAY-2025-000001                               │
│  Type: TDS-Only Payment                                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE STATUS UPDATED                       │
│                                                                 │
│  Paid Amount: ₹5,000 (TDS only, certificate pending)          │
│  Outstanding: ₹95,000 (waiting for main payment)              │
│  Status: Partially Paid                                        │
│                                                                 │
│  Payment History:                                              │
│  - PAY-2025-000001: ₹5,000 (TDS only)                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           STEP 2: CUSTOMER PAYS MAIN AMOUNT (LATER)            │
│                                                                 │
│  Payment Date: 2025-02-01                                      │
│  Amount Received: ₹95,000                                      │
│  TDS Amount: ₹0 (already paid)                                 │
│  Net Amount: ₹95,000                                           │
│  Reference: Bank Transfer #67890                               │
│                                                                 │
│  ✅ Main Payment Recorded                                      │
│  Payment Number: PAY-2025-000002                               │
│  Type: Regular Payment                                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE FULLY PAID                           │
│                                                                 │
│  Total Paid: ₹1,00,000                                         │
│  - TDS: ₹5,000                                                 │
│  - Main: ₹95,000                                               │
│  Outstanding: ₹0                                               │
│  Status: Paid                                                  │
│                                                                 │
│  Payment History:                                              │
│  - PAY-2025-000001: ₹5,000 (TDS only)                         │
│  - PAY-2025-000002: ₹95,000 (Main payment)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scenario 2: TDS Paid Separately (Same Day)

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE CREATED                              │
│  Total: ₹50,000 | TDS: ₹1,000 (2%) | Net: ₹49,000            │
└─────────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   PAYMENT 1: TDS ONLY    │  │  PAYMENT 2: MAIN AMOUNT  │
│                          │  │                          │
│  Amount: ₹0              │  │  Amount: ₹49,000         │
│  TDS: ₹1,000             │  │  TDS: ₹0                 │
│  Net: ₹0                 │  │  Net: ₹49,000            │
│  Ref: TDS Challan #ABC   │  │  Ref: NEFT #XYZ          │
└──────────────────────────┘  └──────────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE FULLY PAID                           │
│  Total Paid: ₹50,000 (₹1,000 TDS + ₹49,000 Main)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scenario 3: Combined Payment (Traditional)

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE CREATED                              │
│  Total: ₹1,00,000 | TDS: ₹5,000 (5%) | Net: ₹95,000          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              SINGLE COMBINED PAYMENT                            │
│                                                                 │
│  Amount Received: ₹1,00,000                                    │
│  TDS Amount: ₹5,000                                            │
│  Net Amount: ₹95,000                                           │
│  Reference: Combined Payment                                    │
│                                                                 │
│  ✅ Payment Recorded                                           │
│  Payment Number: PAY-2025-000001                               │
│  Type: Combined Payment                                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE FULLY PAID                           │
│  Total Paid: ₹1,00,000 (in one transaction)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Payment Type Comparison

```
┌──────────────┬─────────────┬─────────────┬─────────────┬──────────────────┐
│ Payment Type │   Amount    │     TDS     │     Net     │    Use Case      │
│              │  Received   │   Amount    │   Amount    │                  │
├──────────────┼─────────────┼─────────────┼─────────────┼──────────────────┤
│              │             │             │             │                  │
│  TDS ONLY    │      0      │    > 0      │      0      │  TDS in advance  │
│              │             │             │             │                  │
├──────────────┼─────────────┼─────────────┼─────────────┼──────────────────┤
│              │             │             │             │                  │
│  MAIN ONLY   │    > 0      │      0      │    > 0      │  After TDS paid  │
│              │             │             │             │                  │
├──────────────┼─────────────┼─────────────┼─────────────┼──────────────────┤
│              │             │             │             │                  │
│  COMBINED    │    > 0      │    > 0      │    > 0      │  Everything      │
│              │             │             │             │  together        │
│              │             │             │             │                  │
└──────────────┴─────────────┴─────────────┴─────────────┴──────────────────┘
```

---

## Outstanding Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE TOTAL: ₹1,00,000                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              TDS PAYMENT: ₹5,000 (Certificate Pending)         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Outstanding Calculation:                                       │
│  = Invoice Total - (Net Payments + TDS with Certificate)       │
│  = ₹1,00,000 - (₹0 + ₹0)                                       │
│  = ₹1,00,000                                                    │
│                                                                 │
│  Note: TDS doesn't reduce outstanding until certificate         │
│        is received                                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              MAIN PAYMENT: ₹95,000                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Outstanding Calculation:                                       │
│  = Invoice Total - (Net Payments + TDS with Certificate)       │
│  = ₹1,00,000 - (₹95,000 + ₹0)                                  │
│  = ₹5,000                                                       │
│                                                                 │
│  Note: Still waiting for TDS certificate                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              TDS CERTIFICATE RECEIVED                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Outstanding Calculation:                                       │
│  = Invoice Total - (Net Payments + TDS with Certificate)       │
│  = ₹1,00,000 - (₹95,000 + ₹5,000)                              │
│  = ₹0                                                           │
│                                                                 │
│  ✅ Invoice Fully Paid                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  Payment Form    │  │  Payment History │                   │
│  │                  │  │                  │                   │
│  │  - Amount        │  │  - TDS Payments  │                   │
│  │  - TDS Amount    │  │  - Main Payments │                   │
│  │  - Net Amount    │  │  - Combined      │                   │
│  └──────────────────┘  └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ENDPOINT                               │
│                                                                 │
│  POST /api/finance/invoices/{id}/payment/                      │
│                                                                 │
│  Request Body:                                                  │
│  {                                                              │
│    \"amount_received\": 0,                                       │
│    \"tds_amount\": 5000,                                         │
│    \"tds_percentage\": 5,                                        │
│    \"net_amount\": 0,                                            │
│    \"payment_date\": \"2025-01-15\",                              │
│    \"payment_method\": \"bank_transfer\",                         │
│    \"reference_number\": \"TDS Challan #12345\"                   │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT VIEWS                                │
│                                                                 │
│  update_invoice_payment()                                       │
│  ├─ Detect TDS-only payment                                    │
│  ├─ Set payment data                                           │
│  ├─ Create payment record                                      │
│  └─ Update invoice status                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT MODEL                                │
│                                                                 │
│  Payment Record:                                                │
│  - payment_number: PAY-2025-000001                             │
│  - amount: ₹5,000                                              │
│  - gross_payment_amount: ₹5,000                                │
│  - tds_applicable: True                                        │
│  - tds_amount: ₹5,000                                          │
│  - tds_rate: 5%                                                │
│  - net_amount_received: ₹0                                     │
│  - notes: \"TDS payment (advance)\"                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE MODEL                                │
│                                                                 │
│  Invoice Updated:                                               │
│  - paid_amount: ₹5,000                                         │
│  - outstanding_amount: ₹95,000                                 │
│  - payment_status: \"partially_paid\"                           │
│  - last_payment_date: 2025-01-15                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Points

✅ **TDS can be recorded independently**
✅ **No main payment required first**
✅ **Outstanding calculated correctly**
✅ **Multiple payment types supported**
✅ **Real-world business compliance**
✅ **Backward compatible**

---

## Documentation References

- **Full Guide**: `TDS_ONLY_PAYMENT_FEATURE.md`
- **Quick Reference**: `TDS_ONLY_PAYMENT_QUICK_REFERENCE.md`
- **Fix Summary**: `TDS_ONLY_PAYMENT_FIX_SUMMARY.md`
