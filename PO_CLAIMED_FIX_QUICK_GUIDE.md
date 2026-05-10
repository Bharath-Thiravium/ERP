# Quick Fix Guide - PO Claimed Amount After Invoice Deletion

## Problem
After deleting an invoice, the PO still shows the old claimed percentage (e.g., 10% instead of 0%).

## Quick Solution

### Option 1: Use the Fix Script (Easiest)
```bash
./fix_po_claimed_amounts.sh
```

Then choose:
- **Option 1**: Preview changes (dry run)
- **Option 2**: Fix all POs
- **Option 3**: Fix specific PO
- **Option 4**: Fix POs for a company

### Option 2: Use Django Command Directly
```bash
cd backend
source venv/bin/activate

# Preview changes
python manage.py fix_po_claimed_amounts --dry-run

# Fix specific PO
python manage.py fix_po_claimed_amounts --po-number PIEPL-PO-23-24-0754

# Fix all POs
python manage.py fix_po_claimed_amounts
```

## What Was Fixed

1. ✅ **Signals Added**: Automatic PO updates when invoices are deleted
2. ✅ **Management Command**: Fix existing POs with wrong claimed amounts
3. ✅ **Future-Proof**: All future deletions will auto-update POs

## After Running the Fix

Your PO will show:
- ✅ Correct claimed percentage (0% if all invoices deleted)
- ✅ Correct balance remaining (full amount if all invoices deleted)
- ✅ Correct status (not_started if all invoices deleted)

## Example

**Before Fix:**
```
PO: PIEPL-PO-23-24-0754
Total: ₹93,45,600
Balance: ₹84,11,040
Claimed: 10%
Status: PARTIALLY_COMPLETED
```

**After Fix:**
```
PO: PIEPL-PO-23-24-0754
Total: ₹93,45,600
Balance: ₹93,45,600
Claimed: 0%
Status: NOT_STARTED
```

## Need Help?

See full documentation: `PO_CLAIMED_AMOUNT_FIX.md`

## Restart Required?

Yes, restart the backend after applying the fix:
```bash
./restart_services.sh
```

This ensures the signals are loaded and active.
