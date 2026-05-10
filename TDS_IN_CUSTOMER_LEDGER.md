# TDS in Customer Ledger - Implementation & Troubleshooting

## What Was Implemented

The customer ledger transaction history now includes TDS (Tax Deducted at Source) entries to provide a complete audit trail of all financial transactions.

### Backend Changes (`backend/finance/views.py`)

Modified the `_customer_ledger_impl` function to:

1. **Split payment entries into two parts:**
   - **Payment Entry**: Shows net amount received (payment minus TDS)
   - **TDS Entry**: Shows TDS amount deducted by customer

2. **Always show TDS when it exists:**
   - TDS entries are created whenever `payment.tds_amount > 0`
   - Status shows "completed" if certificate received, "pending" if not
   - Description includes TDS section and rate

3. **Example:**
   ```
   Payment of ₹10,000 with 10% TDS (₹1,000) creates:
   
   Entry 1: Payment - Credit ₹9,000 (net received)
   Entry 2: TDS - Credit ₹1,000 (TDS deducted)
   ```

### Frontend Changes (`frontend/src/pages/services/finance/components/CustomerLedger.tsx`)

1. Added purple Indian Rupee icon for TDS entries
2. Status badges show green for "completed" and yellow for "pending"
3. Added visual hint on payment entries to check if TDS was deducted

## Why TDS Entries May Not Appear

### Root Cause
TDS entries will ONLY appear if the payment records in the database have TDS information populated. If you're not seeing TDS entries, it means:

1. **Payments were created without TDS fields populated**
   - `tds_amount` = 0 or NULL
   - `tds_rate` = 0 or NULL
   - `tds_section` = empty or NULL

2. **TDS was deducted but not recorded in the system**
   - Customer deducted TDS when making payment
   - But the payment record doesn't reflect this

## How to Diagnose

Run the diagnostic script:

```bash
cd /var/www/SAP-Python/backend
python3 check_tds_in_payments.py
```

This will show:
- Total payments with/without TDS
- Sample payments and their TDS information
- Recommendations for fixing the issue

## How to Fix Missing TDS Data

### Option 1: Update Existing Payments (Bulk Update)

If you know which payments should have TDS, you can update them:

```python
# Example: Update a payment with TDS information
from finance.models import Payment
from decimal import Decimal

payment = Payment.objects.get(payment_number='PAY-25-000042')

# If gross amount was ₹76,800 and 10% TDS (₹7,680) was deducted
# Net received = ₹69,120

payment.amount = Decimal('76800.00')  # Gross amount
payment.tds_amount = Decimal('7680.00')  # 10% TDS
payment.tds_rate = Decimal('10.00')  # 10%
payment.tds_section = '194C'  # Or appropriate section
payment.tds_applicable = True
payment.net_amount_received = Decimal('69120.00')  # Net received
payment.tds_certificate_received = False  # Update when certificate received
payment.save()
```

### Option 2: Ensure Future Payments Capture TDS

When creating new payments through the UI or API, make sure to:

1. **Specify TDS fields:**
   - `tds_amount`: Amount deducted as TDS
   - `tds_rate`: Percentage rate (e.g., 10.00 for 10%)
   - `tds_section`: Tax section (e.g., '194C', '194J')
   - `net_amount_received`: Actual cash received

2. **Mark certificate receipt:**
   - Set `tds_certificate_received = True` when Form 16A is received
   - This changes TDS entry status from "pending" to "completed"

## Expected Ledger Display

### With TDS Recorded:
```
Date       Document          Description                              Credit      Status
----------------------------------------------------------------------------------
09/02/25   PAY-25-000042     Payment received - bank_transfer        ₹69,120.00  COMPLETED
09/02/25   PAY-25-000042-TDS TDS deducted - 194C @ 10%              ₹7,680.00   PENDING
                             (Certificate Pending)
```

### After Certificate Received:
```
Date       Document          Description                              Credit      Status
----------------------------------------------------------------------------------
09/02/25   PAY-25-000042     Payment received - bank_transfer        ₹69,120.00  COMPLETED
09/02/25   PAY-25-000042-TDS TDS deducted - 194C @ 10%              ₹7,680.00   COMPLETED
                             (Certificate Received)
```

## Benefits of TDS Tracking in Ledger

1. **Complete Audit Trail**: Shows all money movements including TDS
2. **Reconciliation**: Easy to match with Form 26AS
3. **Certificate Tracking**: Know which TDS certificates are pending
4. **Accurate Balances**: Customer balance reflects both cash and TDS
5. **Compliance**: Better record-keeping for tax purposes

## API Fields for Payment Creation

When creating payments via API, include these TDS fields:

```json
{
  "invoice": 123,
  "payment_date": "2025-02-09",
  "amount": 76800.00,
  "payment_method": "bank_transfer",
  "tds_amount": 7680.00,
  "tds_rate": 10.00,
  "tds_section": "194C",
  "net_amount_received": 69120.00,
  "tds_certificate_received": false,
  "reference_number": "TXN123456"
}
```

## Summary

The TDS functionality is **fully implemented** in the customer ledger. If TDS entries are not appearing, it's because the payment records don't have TDS data populated. Use the diagnostic script to identify which payments need updating, then either:

1. Update historical payments with correct TDS information
2. Ensure future payments capture TDS details during creation

Once TDS data is in the database, it will automatically appear in the customer ledger transaction history.
