# Direct Customer Payment - Visual Workflow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DIRECT PAYMENT SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│   Backend    │────────▶│   Database   │
│  React UI    │  HTTP   │  Django API  │  SQL    │  PostgreSQL  │
└──────────────┘         └──────────────┘         └──────────────┘
```

## Payment Flow Comparison

### Traditional Invoice Payment Flow
```
Customer ──▶ Quotation ──▶ PO ──▶ Invoice ──▶ Payment
                                      ▲
                                      │
                                   Required
```

### Direct Payment Flow (NEW)
```
Customer ──────────────────────────────────▶ Payment
                                              ▲
                                              │
                                         No Invoice
                                          Required
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Direct Payment Form                                      │  │
│  │  • Customer Selection                                     │  │
│  │  • Payment Purpose (Memo/Penalty/Incentive/etc.)         │  │
│  │  • Amount & Date                                          │  │
│  │  • Payment Method                                         │  │
│  │  • TDS Configuration (Optional)                           │  │
│  │  • Bank Details                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  POST /api/finance/direct-payments/create/                      │
│  • Validate customer exists                                     │
│  • Calculate TDS (if applicable)                                │
│  • Generate payment number                                      │
│  • Create payment record                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Payment Table                                            │  │
│  │  • payment_type = 'direct'                                │  │
│  │  • payment_purpose = 'Penalty'                            │  │
│  │  • customer_id = 123                                      │  │
│  │  • amount = 5000.00                                       │  │
│  │  • tds_amount = 100.00                                    │  │
│  │  • net_amount_received = 4900.00                          │  │
│  │  • invoice = NULL (not required)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## TDS Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TDS AUTO-CALCULATION                          │
└─────────────────────────────────────────────────────────────────┘

Input:
  Amount: ₹5,000
  TDS Rate: 2%
  TDS Section: 194C

                    ▼

Calculation:
  TDS Amount = Amount × (TDS Rate / 100)
  TDS Amount = 5000 × (2 / 100)
  TDS Amount = ₹100

                    ▼

  Net Amount = Amount - TDS Amount
  Net Amount = 5000 - 100
  Net Amount = ₹4,900

                    ▼

Output:
  Gross Payment: ₹5,000
  TDS Deducted: ₹100
  Net Received: ₹4,900
```

## Use Case Scenarios

### Scenario 1: Late Payment Penalty
```
┌──────────────────────────────────────────────────────────────┐
│ Customer: ABC Corporation                                    │
│ Purpose: Late payment penalty as per contract clause 5.2     │
│ Amount: ₹5,000                                               │
│ TDS: Not applicable                                          │
│ Method: Bank Transfer                                        │
│ Reference: REF123456                                         │
└──────────────────────────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ Payment Created: PAY-2025-000123                             │
│ Status: Completed                                            │
│ Net Received: ₹5,000                                         │
└──────────────────────────────────────────────────────────────┘
```

### Scenario 2: Early Payment Incentive
```
┌──────────────────────────────────────────────────────────────┐
│ Customer: XYZ Limited                                        │
│ Purpose: Early payment discount                              │
│ Amount: ₹10,000                                              │
│ TDS: 2% (₹200)                                               │
│ Method: NEFT                                                 │
│ Reference: NEFT789012                                        │
└──────────────────────────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ Payment Created: PAY-2025-000124                             │
│ Status: Completed                                            │
│ Gross Amount: ₹10,000                                        │
│ TDS Deducted: ₹200                                           │
│ Net Received: ₹9,800                                         │
└──────────────────────────────────────────────────────────────┘
```

## Customer Payment Summary

```
┌─────────────────────────────────────────────────────────────────┐
│              CUSTOMER PAYMENT SUMMARY                            │
│              Customer: ABC Corporation                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────────┐
│   INVOICE PAYMENTS       │        DIRECT PAYMENTS               │
├──────────────────────────┼──────────────────────────────────────┤
│ Count: 5                 │ Count: 2                             │
│ Total: ₹150,000          │ Total: ₹10,000                       │
│                          │                                      │
│ INV-2025-001: ₹30,000    │ PAY-2025-123: ₹5,000 (Penalty)      │
│ INV-2025-002: ₹40,000    │ PAY-2025-124: ₹5,000 (Incentive)    │
│ INV-2025-003: ₹25,000    │                                      │
│ INV-2025-004: ₹35,000    │                                      │
│ INV-2025-005: ₹20,000    │                                      │
└──────────────────────────┴──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      COMBINED SUMMARY                            │
├─────────────────────────────────────────────────────────────────┤
│ Total Payments: 7                                               │
│ Total Amount: ₹160,000                                          │
│ Total TDS Deducted: ₹3,200                                      │
│ Net Amount Received: ₹156,800                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                        Payment Table                             │
├─────────────────────────────────────────────────────────────────┤
│ id                    INTEGER PRIMARY KEY                        │
│ company_id            INTEGER FK → Company                       │
│ customer_id           INTEGER FK → Customer                      │
│ payment_type          VARCHAR(20) ['invoice', 'direct']         │
│ payment_purpose       VARCHAR(100) [NEW]                        │
│ invoice_id            INTEGER FK → Invoice (NULLABLE)           │
│ proforma_invoice_id   INTEGER FK → ProformaInvoice (NULLABLE)  │
│ purchase_order_id     INTEGER FK → PurchaseOrder (NULLABLE)    │
│ payment_number        VARCHAR(50) UNIQUE                        │
│ payment_date          DATE                                      │
│ amount                DECIMAL(15,2)                             │
│ gross_payment_amount  DECIMAL(15,2)                             │
│ tds_applicable        BOOLEAN                                   │
│ tds_rate              DECIMAL(5,2)                              │
│ tds_amount            DECIMAL(15,2)                             │
│ net_amount_received   DECIMAL(15,2)                             │
│ payment_method        VARCHAR(20)                               │
│ reference_number      VARCHAR(100)                              │
│ transaction_id        VARCHAR(100)                              │
│ bank_name             VARCHAR(100)                              │
│ status                VARCHAR(20)                               │
│ notes                 TEXT                                      │
│ created_by_id         INTEGER FK → CompanyServiceUser          │
│ created_at            TIMESTAMP                                 │
│ updated_at            TIMESTAMP                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Request/Response Flow

### Create Direct Payment

**Request:**
```json
POST /api/finance/direct-payments/create/
Authorization: Bearer <session_key>
Content-Type: application/json

{
  "customer_id": 123,
  "payment_purpose": "Late payment penalty",
  "payment_date": "2025-01-15",
  "amount": 5000.00,
  "payment_method": "bank_transfer",
  "reference_number": "REF123456",
  "tds_applicable": true,
  "tds_rate": 2.0,
  "tds_section": "194C"
}
```

**Response:**
```json
HTTP 201 Created

{
  "message": "Direct payment created successfully",
  "payment_id": 456,
  "payment_number": "PAY-2025-000123",
  "amount": 5000.00,
  "net_amount_received": 4900.00
}
```

## Security & Validation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
└─────────────────────────────────────────────────────────────────┘

1. Authentication
   ├─ Session key validation
   └─ User must be logged in

2. Authorization
   ├─ Company-scoped data access
   └─ User must belong to company

3. Validation
   ├─ Customer must exist
   ├─ Amount must be positive
   ├─ Date must be valid
   └─ TDS rate must be 0-100%

4. Audit Trail
   ├─ created_by field tracks user
   ├─ created_at timestamp
   └─ updated_at timestamp
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM INTEGRATION                            │
└─────────────────────────────────────────────────────────────────┘

Direct Payment System
        │
        ├──▶ Customer Module
        │    └─ Customer validation
        │    └─ Customer ledger
        │
        ├──▶ Finance Module
        │    └─ Payment tracking
        │    └─ TDS management
        │
        ├──▶ Reporting Module
        │    └─ Payment reports
        │    └─ TDS reports
        │
        └──▶ Audit Module
             └─ Activity logging
             └─ User tracking
```

---

**Legend:**
- ──▶ : Data flow
- ├── : Branch/Option
- └── : End of branch
- FK  : Foreign Key
- [NEW] : New field added
