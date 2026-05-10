# TDS in Customer Ledger - Quick Start Guide

## Summary

✅ **TDS functionality is FULLY IMPLEMENTED** in the customer ledger transaction history.

❗ **If you don't see TDS entries**, it means the payment records don't have TDS data populated in the database.

## What You'll See (When TDS Data Exists)

For each payment with TDS, you'll see TWO entries:

1. **Payment Entry** - Net amount received (cash in bank)
2. **TDS Entry** - TDS amount deducted by customer

Example:
```
Date       Document          Description                         Credit      Status
------------------------------------------------------------------------------------
09/02/25   PAY-25-000042     Payment received - bank_transfer   ₹69,120.00  COMPLETED
09/02/25   PAY-25-000042-TDS TDS deducted - 194C @ 10%         ₹7,680.00   PENDING
                             (Certificate Pending)
```

## Quick Diagnosis

Run this command to check if your payments have TDS data:

```bash
cd /var/www/SAP-Python/backend
python3 check_tds_in_payments.py
```

This will show:
- How many payments have TDS recorded
- Sample payments with/without TDS
- Recommendations

## Quick Fix - Update Payments with TDS

If payments should have TDS but don't, run:

```bash
cd /var/www/SAP-Python/backend
python3 update_payment_tds.py
```

This interactive script will help you:
1. Update payments with TDS information
2. Mark TDS certificates as received

### Example Update

If customer paid ₹69,120 after deducting 10% TDS from ₹76,800 invoice:

```python
update_payment_with_tds(
    payment_number='PAY-25-000042',
    gross_amount=76800.00,
    tds_rate=10.00,
    tds_section='194C'
)
```

## For Future Payments

When creating new payments, include TDS fields:

**Via API:**
```json
{
  "invoice": 123,
  "payment_date": "2025-02-09",
  "amount": 76800.00,
  "tds_amount": 7680.00,
  "tds_rate": 10.00,
  "tds_section": "194C",
  "net_amount_received": 69120.00,
  "tds_certificate_received": false
}
```

**Via UI:**
- Fill in TDS fields when recording payment
- System will automatically calculate net amount
- Mark certificate received when Form 16A arrives

## Files Changed

### Backend
- `/var/www/SAP-Python/backend/finance/views.py`
  - Modified `_customer_ledger_impl()` function
  - Added TDS entry generation for all payments with TDS

### Frontend
- `/var/www/SAP-Python/frontend/src/pages/services/finance/components/CustomerLedger.tsx`
  - Added TDS icon (purple rupee symbol)
  - Added status badges for TDS entries
  - Added visual hints for payments

### Utility Scripts
- `/var/www/SAP-Python/backend/check_tds_in_payments.py` - Diagnostic tool
- `/var/www/SAP-Python/backend/update_payment_tds.py` - Update tool

## Need Help?

See full documentation: `/var/www/SAP-Python/TDS_IN_CUSTOMER_LEDGER.md`

## Key Points

1. ✅ TDS tracking is implemented and working
2. 📊 TDS entries appear automatically when payment has TDS data
3. 🔍 Use diagnostic script to check existing payments
4. 🔧 Use update script to fix historical payments
5. 📝 Ensure future payments capture TDS during creation
