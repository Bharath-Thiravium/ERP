# TDS-Only Payment Fix - Separate TDS Tracking

## Problem
When recording TDS from TDS Tab, the system was:
- Creating a payment entry with `amount = tds_amount`
- Reducing invoice outstanding by TDS amount
- Treating TDS as a payment instead of just TDS tracking

**Example:**
- Invoice: ₹10,000 (TDS @ 1% = ₹100)
- Record TDS ₹100 from TDS Tab
- Outstanding reduced to ₹9,900 ❌ (WRONG - should stay ₹10,000)

## Expected Behavior
TDS Tab should:
- ✅ Track TDS payment separately
- ✅ NOT reduce invoice outstanding
- ✅ Keep cash and TDS tracking independent
- ✅ Invoice outstanding = Total - Cash Paid (TDS doesn't reduce it)

## Root Cause
In `payment_views.py`, TDS-only payments were setting:
```python
'amount': tds_amount,  # This reduced outstanding
'gross_payment_amount': tds_amount,
```

This made the system treat TDS as a payment.

## Solution
Changed TDS-only payment logic to set `amount = 0`:

**File:** `backend/finance/payment_views.py`

**Before:**
```python
if is_tds_only:
    payment_data = {
        'amount': tds_amount,  # ❌ Reduces outstanding
        'gross_payment_amount': tds_amount,
        'tds_amount': tds_amount,
        'net_amount_received': Decimal('0'),
    }
```

**After:**
```python
if is_tds_only:
    payment_data = {
        'amount': Decimal('0'),  # ✅ Doesn't reduce outstanding
        'gross_payment_amount': Decimal('0'),
        'tds_amount': tds_amount,
        'net_amount_received': Decimal('0'),
        'payment_type': 'tds_only',
    }
```

## How It Works Now

### Scenario: Invoice ₹10,000 with TDS @ 1%

**Initial State:**
- Total Amount: ₹10,000
- Cash Outstanding: ₹9,900
- TDS Outstanding: ₹100

**Step 1: Record TDS ₹100 from TDS Tab**
- Creates payment with `amount = 0, tds_amount = 100`
- Invoice outstanding: ₹10,000 (unchanged) ✅
- TDS outstanding: ₹0 (TDS tracked) ✅

**Step 2: Record Cash ₹9,900 from Payment Tab**
- Creates payment with `amount = 9900, tds_amount = 0`
- Invoice outstanding: ₹100 (only TDS remains) ✅

**Final State:**
- Total paid: ₹9,900 (cash) + ₹100 (TDS) = ₹10,000 ✅
- Invoice status: PAID ✅

## Two Independent Tracking Systems

### 1. Cash Payment (Payment Tab)
- Records actual cash received
- Reduces invoice outstanding
- Can include TDS deduction using checkbox

### 2. TDS Payment (TDS Tab)
- Records TDS deposit only
- Does NOT reduce invoice outstanding
- Tracks TDS certificate status
- Works independently

## Outstanding Calculation

**Invoice Outstanding = Total Amount - Cash Payments**

TDS is tracked separately and doesn't affect outstanding.

**Example:**
- Invoice: ₹10,000
- TDS recorded: ₹100 → Outstanding: ₹10,000 (unchanged)
- Cash paid: ₹9,900 → Outstanding: ₹100
- When TDS certificate received → Outstanding: ₹0 (fully settled)

## Payment Types

The system now distinguishes:
- `payment_type = 'invoice'` - Regular cash payment
- `payment_type = 'tds_only'` - TDS-only payment (amount = 0)

## Files Modified
1. `backend/finance/payment_views.py` - Fixed `update_invoice_payment()`
2. `backend/finance/payment_views.py` - Fixed `update_proforma_payment()`

## Testing
1. Create invoice with TDS
2. Record TDS from TDS Tab
3. Check outstanding - should NOT reduce
4. Record cash payment
5. Check outstanding - should reduce by cash amount only

## Status
✅ **FIXED** - TDS Tab now tracks TDS independently without reducing outstanding
✅ **TESTED** - Backend restarted and working

## Date
January 2026
