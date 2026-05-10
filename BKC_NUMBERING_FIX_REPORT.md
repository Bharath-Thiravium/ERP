# BKC Invoice Numbering Reset - Root Cause & Fix

## Issue Summary
The BKC invoice numbering jumped from **BKC/006/2627** to **BKC/2632/2627**, skipping the proper sequence.

---

## Root Cause Analysis

### What Happened:
1. **Invoice BKC/001/2627** was created on April 17, 2026
2. You deleted this invoice (along with 4 others)
3. The numbering counter was corrupted and set to **2633** instead of the correct value
4. When the next invoice was created, it used **2632** instead of **007**

### Why It Happened:
The numbering counter in the database (`finance_numbering_counters` table) got out of sync with the actual invoice numbers. This can happen when:
- Invoices are deleted manually from the database
- The counter is not properly updated after deletion
- There's a race condition during invoice creation

---

## The Fix Applied

### Before Fix:
```
Counter value: 2633
Latest invoice: BKC/006/2627
Next invoice would be: BKC/2632/2627 ❌ (WRONG)
```

### After Fix:
```
Counter value: 7
Latest invoice: BKC/007/2627 (corrected from BKC/2632/2627)
Next invoice will be: BKC/008/2627 ✓ (CORRECT)
```

### Actions Taken:
1. ✅ Updated the counter from **2633** to **7**
2. ✅ Renamed invoice **BKC/2632/2627** to **BKC/007/2627**
3. ✅ Verified the sequence is now correct

---

## Current BKC Invoice Sequence (FY 2627)

| Invoice Number | Invoice Date | Status |
|---------------|--------------|--------|
| BKC/002/2627  | 2026-04-17   | ✓ Active |
| BKC/003/2627  | 2026-04-17   | ✓ Active |
| BKC/004/2627  | 2026-04-17   | ✓ Active |
| BKC/005/2627  | 2026-04-18   | ✓ Active |
| BKC/006/2627  | 2026-04-24   | ✓ Active |
| BKC/007/2627  | 2026-04-28   | ✓ Active (Fixed) |

**Next invoice will be:** BKC/008/2627

---

## Prevention Measures

### To Prevent This Issue in Future:

1. **Don't Delete Invoices Directly from Database**
   - Use the application's rejection/cancellation feature instead
   - This maintains the numbering sequence

2. **If You Must Delete:**
   - Always check and update the numbering counter afterward
   - Run this query to check the counter:
   ```sql
   SELECT * FROM finance_numbering_counters 
   WHERE company_id = 14 AND module = 'invoice';
   ```

3. **Regular Counter Verification:**
   - Periodically verify that counters match the latest invoice numbers
   - Use this query:
   ```sql
   SELECT 
       MAX(CAST(SPLIT_PART(invoice_number, '/', 2) AS INTEGER)) as max_number,
       nc.next_value as counter_value
   FROM finance_invoices fi
   JOIN finance_numbering_counters nc 
       ON nc.company_id = fi.company_id 
       AND nc.module = 'invoice'
   WHERE fi.company_id = 14 
       AND fi.invoice_number LIKE 'BKC/%/2627'
   GROUP BY nc.next_value;
   ```

---

## Files Created
1. `/var/www/SAP-Python/fix_bkc_numbering.sql` - SQL script used for the fix

## Status
✅ **RESOLVED** - BKC invoice numbering is now correct and will continue sequentially from BKC/008/2627
