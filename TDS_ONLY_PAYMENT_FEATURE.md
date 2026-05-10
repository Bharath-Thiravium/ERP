# TDS-Only Payment Feature

## Overview

This feature allows you to record TDS (Tax Deducted at Source) payments separately and in advance, without requiring the main payment to be recorded first. This reflects real-world business scenarios where customers pay TDS directly to the government before making the actual payment.

## Problem Solved

**Before:** You had to record the full payment first before you could record TDS separately.

**Now:** You can record TDS payments independently, even in advance of the main payment.

## Real-World Use Cases

1. **Advance TDS Payment**: Customer pays TDS to government before making the actual payment
2. **Split Payments**: Customer pays TDS separately from the main invoice amount
3. **Quarterly TDS**: Customer pays TDS quarterly while making payments monthly
4. **TDS Compliance**: Record TDS payments as they happen for accurate tax tracking

## How It Works

### TDS-Only Payment

When you record a payment with:
- **TDS Amount**: > 0 (e.g., ₹5,000)
- **Amount Received**: 0
- **Net Amount**: 0

The system automatically recognizes this as a **TDS-only payment** and:
- Sets `gross_payment_amount` = TDS amount
- Sets `net_amount_received` = 0
- Marks `tds_applicable` = True
- Adds note: "TDS payment (advance)"

### Regular Payment with TDS

When you record a payment with:
- **Amount Received**: > 0 (e.g., ₹95,000)
- **TDS Amount**: > 0 (e.g., ₹5,000)
- **Net Amount**: > 0 (e.g., ₹95,000)

The system treats this as a **regular payment with TDS deduction**.

## Example Scenarios

### Scenario 1: TDS Paid in Advance

**Invoice Amount**: ₹1,00,000 (with 5% TDS = ₹5,000)

**Step 1 - Record TDS Payment (Advance)**
```
Payment Date: 2025-01-15
Amount Received: 0
TDS Amount: ₹5,000
TDS Rate: 5%
Net Amount: 0
Reference: TDS Challan #12345
```

**Result:**
- Payment recorded: ₹5,000 (TDS only)
- Invoice Outstanding: ₹95,000 (waiting for main payment)
- TDS Status: Deposited (advance)

**Step 2 - Record Main Payment (Later)**
```
Payment Date: 2025-02-01
Amount Received: ₹95,000
TDS Amount: 0 (already paid)
Net Amount: ₹95,000
Reference: Bank Transfer #67890
```

**Result:**
- Total Paid: ₹1,00,000 (₹5,000 TDS + ₹95,000 main)
- Invoice Outstanding: ₹0
- Invoice Status: Fully Paid

### Scenario 2: TDS Paid Separately (Same Day)

**Invoice Amount**: ₹50,000 (with 2% TDS = ₹1,000)

**Payment 1 - TDS Only**
```
Payment Date: 2025-01-20
Amount Received: 0
TDS Amount: ₹1,000
TDS Rate: 2%
Reference: TDS Challan #ABC123
```

**Payment 2 - Main Amount**
```
Payment Date: 2025-01-20
Amount Received: ₹49,000
TDS Amount: 0
Reference: NEFT #XYZ789
```

**Result:**
- Total Paid: ₹50,000
- Invoice Status: Fully Paid
- TDS Tracked Separately

### Scenario 3: Combined Payment (Traditional)

**Invoice Amount**: ₹1,00,000 (with 5% TDS = ₹5,000)

**Single Payment**
```
Payment Date: 2025-01-25
Amount Received: ₹1,00,000
TDS Amount: ₹5,000
TDS Rate: 5%
Net Amount: ₹95,000
Reference: Combined Payment
```

**Result:**
- Gross Payment: ₹1,00,000
- TDS Deducted: ₹5,000
- Net Received: ₹95,000
- Invoice Status: Fully Paid

## API Usage

### Record TDS-Only Payment

**Endpoint:** `POST /api/finance/invoices/{invoice_id}/payment/`

**Request Body:**
```json
{
  "payment_date": "2025-01-15",
  "amount_received": 0,
  "tds_amount": 5000,
  "tds_percentage": 5,
  "net_amount": 0,
  "payment_method": "bank_transfer",
  "reference_number": "TDS Challan #12345",
  "notes": "TDS paid in advance"
}
```

**Response:**
```json
{
  "message": "TDS payment recorded successfully",
  "payment_id": 123,
  "payment_number": "PAY-2025-000123",
  "is_tds_only": true,
  "invoice_outstanding": 95000.00
}
```

### Record Regular Payment

**Endpoint:** `POST /api/finance/invoices/{invoice_id}/payment/`

**Request Body:**
```json
{
  "payment_date": "2025-02-01",
  "amount_received": 95000,
  "tds_amount": 0,
  "tds_percentage": 0,
  "net_amount": 95000,
  "payment_method": "bank_transfer",
  "reference_number": "Bank Transfer #67890",
  "notes": "Main payment"
}
```

**Response:**
```json
{
  "message": "Payment updated successfully",
  "payment_id": 124,
  "payment_number": "PAY-2025-000124",
  "is_tds_only": false,
  "invoice_outstanding": 0.00
}
```

## Benefits

1. **Accurate Tracking**: Record TDS payments as they happen
2. **Compliance**: Better TDS compliance and audit trail
3. **Flexibility**: Handle various payment scenarios
4. **Real-World**: Matches actual business practices
5. **Transparency**: Clear separation of TDS and main payments

## Payment Calculation Logic

### TDS-Only Payment
```
Gross Payment Amount = TDS Amount
Net Amount Received = 0
TDS Applicable = True
```

### Regular Payment with TDS
```
Gross Payment Amount = Amount Received
TDS Amount = Calculated or Provided
Net Amount Received = Amount Received - TDS Amount
TDS Applicable = True (if TDS > 0)
```

### Regular Payment without TDS
```
Gross Payment Amount = Amount Received
TDS Amount = 0
Net Amount Received = Amount Received
TDS Applicable = False
```

## Outstanding Calculation

The invoice outstanding is calculated as:
```
Outstanding = Total Invoice Amount - (Sum of Net Amounts + Sum of TDS with Certificate)
```

**Important:** TDS amounts only reduce outstanding when TDS certificate is received.

## Frontend Integration

The payment form should:

1. **Allow TDS-only entry**: Enable TDS fields even when amount is 0
2. **Validate TDS-only**: Accept payment when TDS > 0 and amount = 0
3. **Show clear labels**: Indicate "TDS Payment (Advance)" for TDS-only
4. **Track separately**: Display TDS and main payments separately in payment history

## Database Fields

### Payment Model
- `amount`: Gross payment amount (backward compatible)
- `gross_payment_amount`: Gross amount customer is paying
- `tds_applicable`: Whether TDS applies
- `tds_amount`: TDS amount deducted
- `tds_rate`: TDS rate percentage
- `net_amount_received`: Amount received after TDS
- `tds_deposited`: Whether TDS deposited to government
- `tds_certificate_received`: Whether Form 16A received

## Testing

### Test Case 1: TDS-Only Payment
```python
# Record TDS-only payment
payment = Payment.objects.create(
    invoice=invoice,
    customer=customer,
    payment_date='2025-01-15',
    amount=5000,
    gross_payment_amount=5000,
    tds_applicable=True,
    tds_amount=5000,
    tds_rate=5,
    net_amount_received=0,
    payment_method='bank_transfer',
    notes='TDS payment (advance)'
)

# Verify
assert payment.tds_amount == 5000
assert payment.net_amount_received == 0
assert invoice.outstanding_amount == 95000
```

### Test Case 2: Main Payment After TDS
```python
# Record main payment
payment2 = Payment.objects.create(
    invoice=invoice,
    customer=customer,
    payment_date='2025-02-01',
    amount=95000,
    gross_payment_amount=95000,
    tds_applicable=False,
    tds_amount=0,
    net_amount_received=95000,
    payment_method='bank_transfer'
)

# Verify
assert invoice.paid_amount == 100000
assert invoice.outstanding_amount == 0
assert invoice.payment_status == 'paid'
```

## Migration Notes

This feature is **backward compatible**. Existing payments will continue to work as before. The system automatically detects TDS-only payments based on the amounts provided.

## Support

For questions or issues, refer to:
- `TDS_QUICK_START.md` - Quick reference guide
- `TDS_ROOT_CAUSE_AND_FIX.md` - Technical implementation details
- `TDS_IN_CUSTOMER_LEDGER.md` - Ledger integration

## Summary

The TDS-only payment feature provides the flexibility to record TDS payments independently, matching real-world business practices where customers pay TDS separately and often in advance. This improves accuracy, compliance, and transparency in financial tracking.
