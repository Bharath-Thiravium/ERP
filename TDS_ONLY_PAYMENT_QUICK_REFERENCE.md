# TDS-Only Payment - Quick Reference

## What Changed?

✅ **Now you can record TDS payments separately without requiring the main payment first**

## Quick Examples

### 1. Record TDS Only (Advance Payment)

**When:** Customer pays TDS to government before making the actual payment

**How to Record:**
```
Amount Received: 0
TDS Amount: ₹5,000
TDS Rate: 5%
Net Amount: 0
Reference: TDS Challan #12345
```

**Result:** TDS payment recorded, invoice outstanding = ₹95,000

---

### 2. Record Main Payment (After TDS)

**When:** Customer pays the remaining amount after TDS

**How to Record:**
```
Amount Received: ₹95,000
TDS Amount: 0
Net Amount: ₹95,000
Reference: Bank Transfer #67890
```

**Result:** Invoice fully paid (₹5,000 TDS + ₹95,000 main = ₹1,00,000)

---

### 3. Combined Payment (Traditional)

**When:** Customer pays everything together

**How to Record:**
```
Amount Received: ₹1,00,000
TDS Amount: ₹5,000
TDS Rate: 5%
Net Amount: ₹95,000
Reference: Combined Payment
```

**Result:** Invoice fully paid in one transaction

---

## Payment Types

| Type | Amount Received | TDS Amount | Net Amount | Use Case |
|------|----------------|------------|------------|----------|
| **TDS Only** | 0 | > 0 | 0 | TDS paid in advance |
| **Main Only** | > 0 | 0 | > 0 | Main payment after TDS |
| **Combined** | > 0 | > 0 | > 0 | Everything together |

---

## API Quick Reference

### TDS-Only Payment
```bash
POST /api/finance/invoices/{invoice_id}/payment/
{
  "amount_received": 0,
  "tds_amount": 5000,
  "tds_percentage": 5,
  "net_amount": 0,
  "payment_date": "2025-01-15",
  "payment_method": "bank_transfer",
  "reference_number": "TDS Challan #12345"
}
```

### Main Payment
```bash
POST /api/finance/invoices/{invoice_id}/payment/
{
  "amount_received": 95000,
  "tds_amount": 0,
  "net_amount": 95000,
  "payment_date": "2025-02-01",
  "payment_method": "bank_transfer",
  "reference_number": "Bank Transfer #67890"
}
```

---

## Common Scenarios

### Scenario A: Customer Pays TDS Quarterly
```
Month 1: Record TDS only (₹5,000)
Month 2: Record main payment (₹95,000)
Month 3: Record TDS only (₹5,000)
Month 4: Record main payment (₹95,000)
```

### Scenario B: Customer Pays TDS Separately Same Day
```
Payment 1: TDS only (₹5,000) - Challan #123
Payment 2: Main amount (₹95,000) - NEFT #456
```

### Scenario C: Customer Pays Everything Together
```
Single Payment: ₹1,00,000 (TDS ₹5,000 + Net ₹95,000)
```

---

## Key Points

✅ TDS can be recorded **before** the main payment
✅ TDS can be recorded **separately** from the main payment
✅ TDS can be recorded **together** with the main payment
✅ Multiple TDS payments can be recorded for one invoice
✅ Outstanding is calculated correctly for all scenarios

---

## Validation Rules

| Field | TDS-Only | Main-Only | Combined |
|-------|----------|-----------|----------|
| Amount Received | 0 | > 0 | > 0 |
| TDS Amount | > 0 | 0 | > 0 |
| Net Amount | 0 | > 0 | > 0 |

---

## Response Messages

- **TDS-Only**: "TDS payment recorded successfully"
- **Regular**: "Payment updated successfully"
- **Response includes**: `is_tds_only` flag to identify payment type

---

## Outstanding Calculation

```
Outstanding = Invoice Total - (Net Payments + TDS with Certificate)
```

**Note:** TDS reduces outstanding only when certificate is received

---

## Frontend Checklist

- [ ] Allow TDS entry when amount is 0
- [ ] Validate TDS-only payments (TDS > 0, amount = 0)
- [ ] Show "TDS Payment (Advance)" label for TDS-only
- [ ] Display TDS and main payments separately in history
- [ ] Calculate outstanding correctly

---

## Testing Checklist

- [ ] Record TDS-only payment
- [ ] Record main payment after TDS
- [ ] Record combined payment
- [ ] Verify outstanding calculation
- [ ] Verify payment status updates
- [ ] Check payment history display

---

## Need Help?

See full documentation: `TDS_ONLY_PAYMENT_FEATURE.md`
