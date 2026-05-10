# Quick Fix Summary - Quotation & Proforma Issues

## Problem 1: Quotation Duplication Not Working ❌

**Cause:** Missing URL route for copy action

**Fix Applied:** ✅ Added `copy` action to `QuotationViewSet`

**File Changed:** `backend/finance/viewsets.py`

## Problem 2: Proforma Invoice Creation Failing ⚠️

**Likely Causes:**
1. Missing required fields (customer, items, date)
2. Validation errors in item data
3. PO balance validation failing
4. Company context not passed

**How to Debug:**

### Step 1: Check Browser Console
```
F12 → Console tab → Look for red errors
```

### Step 2: Check Backend Logs
```bash
cd /var/www/SAP-Python/backend
tail -f logs/django.log
# Or check terminal where Django runs
```

### Step 3: Common Fixes

**Missing Customer:**
```
Error: "customer is required"
Fix: Select customer before creating proforma
```

**Missing Items:**
```
Error: "At least one item is required"
Fix: Add products to the proforma items list
```

**Claim Percentage Too High:**
```
Error: "Claim percentage exceeds available"
Fix: Reduce percentage or check PO balance
```

**Invalid Product:**
```
Error: "Product not found"
Fix: Ensure products exist and are active
```

## Quick Test

### Test Quotation Duplication:
1. Go to Finance → Quotations
2. Click "Duplicate" on any quotation
3. Should create new quotation with copied data

### Test Proforma Creation:
1. Go to Finance → Purchase Orders
2. Open a PO
3. Click "Create Proforma Invoice"
4. Fill in details and submit
5. Check console/logs if it fails

## Restart Backend

```bash
cd /var/www/SAP-Python
./restart_services.sh
```

## Need More Help?

Read the full guide: `QUOTATION_PROFORMA_FIX.md`

## Status

✅ Quotation duplication - FIXED
⚠️ Proforma creation - Check console/logs for specific error
