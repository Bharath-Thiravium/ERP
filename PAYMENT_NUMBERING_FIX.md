# Payment Numbering Fix - {FY_SHORT} Replacement

## Problem
Payment numbers were showing `{FY_SHORT}` placeholder instead of actual financial year:
- Example: `BKGE-PAY-{FY_SHORT}-003` ❌
- Expected: `BKGE-PAY-2627-003` ✅

## Root Cause
`WorldClassPaymentCreateSerializer.create()` method was NOT calling `assign_number()` function to generate payment_number. It was creating payments directly without processing the numbering template.

## What is {FY_SHORT}?
`{FY_SHORT}` is a template placeholder that should be replaced with Financial Year in short format:

**Indian Financial Year (April-March):**
- April 2026 to March 2027 → `2627`
- April 2025 to March 2026 → `2526`
- January 2026 (before April) → `2526` (belongs to FY 2025-26)

## Solution

### 1. Fixed Serializer (Backend)
**File:** `backend/finance/serializers.py`

**Before:**
```python
def create(self, validated_data):
    """Create payment with automatic status updates"""
    payment = Payment.objects.create(**validated_data)
    return payment
```

**After:**
```python
def create(self, validated_data):
    """Create payment with automatic payment number generation"""
    # Generate payment_number using numbering system
    assign_number(validated_data, self, 'customer_payment', 'payment_number', Payment)
    payment = Payment.objects.create(**validated_data)
    return payment
```

### 2. Fixed Existing Records
Created and ran `fix_payment_numbers.py` script to fix 2 existing payments:
- `BKGE-PAY-{FY_SHORT}-005` → `BKGE-PAY-2627-005` (Date: 2026-04-22)
- `BKGE-PAY-{FY_SHORT}-002` → `BKGE-PAY-2526-002` (Date: 2025-10-31)

## Verification

### All Finance Module Serializers Checked:
✅ `QuotationCreateSerializer` - calls `assign_number()`
✅ `PurchaseOrderCreateSerializer` - calls `assign_number()`
✅ `ProformaInvoiceCreateSerializer` - calls `assign_number()`
✅ `InvoiceCreateSerializer` - calls `assign_number()`
✅ `PaymentCreateSerializer` - calls `assign_number()`
✅ `WorldClassPaymentCreateSerializer` - NOW calls `assign_number()` ✅ FIXED
✅ `VendorInvoiceCreateSerializer` - calls `assign_number()`
✅ `PurchasePaymentCreateSerializer` - calls `assign_number()`

### Database Check:
```sql
-- No more broken records
SELECT COUNT(*) FROM finance_payments WHERE payment_number LIKE '%{FY_SHORT}%';
-- Result: 0
```

## Numbering Template
Current template for payments: `{COMPANY}-{PREFIX}-{FY_SHORT}-{NUMBER}`

**Available Tokens:**
- `{COMPANY}` - Company prefix (e.g., BKGE)
- `{PREFIX}` - Module prefix (e.g., PAY)
- `{FY_SHORT}` - Financial year short (e.g., 2627)
- `{FY}` - Financial year full (e.g., 2026-27)
- `{YY}` - Year 2-digit (e.g., 26)
- `{YYYY}` - Year 4-digit (e.g., 2026)
- `{MM}` - Month (e.g., 04)
- `{NUMBER}` - Sequential number with padding (e.g., 003)
- `{SEQ}` - Sequential number (same as NUMBER)
- `{SEP}` - Separator (e.g., -)

## Status
✅ **FIXED** - All new payments will have correct numbering
✅ **VERIFIED** - All existing broken records fixed
✅ **TESTED** - Backend restarted and working

## Files Modified
1. `backend/finance/serializers.py` - Added assign_number() call
2. `backend/fix_payment_numbers.py` - Script to fix existing records (one-time use)

## Date
January 2025
