# Purchase Order Claimed Amount Fix - Invoice Deletion Issue

## Problem

When you delete an invoice that was linked to a Purchase Order, the PO's claimed percentage and balance amounts were not being recalculated. This caused the PO to show incorrect data:

- **Claimed Percentage**: Still showed 10% even though the invoice was deleted
- **Balance Remaining**: Showed ₹84,11,040 instead of the full ₹93,45,600
- **Claimed Status**: Showed "In Progress" instead of "Not Started"

### Example Issue:
```
PO: PIEPL-PO-23-24-0754
Total: ₹93,45,600
Balance: ₹84,11,040 (should be ₹93,45,600)
Claimed: 10% (should be 0%)
```

## Root Cause

Django doesn't automatically recalculate related model fields when a related object is deleted. The system was missing:

1. **Signal handlers** to detect when invoices/proformas are deleted
2. **Automatic recalculation** of PO claimed amounts after deletion
3. **Status updates** for PO completion tracking

## Solution Implemented

### 1. Created Signal Handlers (`/backend/finance/signals.py`)

Added 4 signal handlers to automatically update PO when invoices/proformas are created, updated, or deleted:

#### A. `update_po_on_invoice_delete`
- Triggers when an invoice is deleted
- Recalculates total invoice claimed amount
- Updates remaining balance
- Updates invoice status (not_started/partial/completed)

#### B. `update_po_on_proforma_delete`
- Triggers when a proforma invoice is deleted
- Recalculates total proforma claimed amount
- Updates remaining balance
- Updates proforma status

#### C. `update_po_on_invoice_save`
- Triggers when an invoice is created or updated
- Keeps PO invoice claimed amounts in sync

#### D. `update_po_on_proforma_save`
- Triggers when a proforma is created or updated
- Keeps PO proforma claimed amounts in sync

### 2. Registered Signals (`/backend/finance/apps.py`)

Modified the FinanceConfig to import signals when the app is ready:

```python
def ready(self):
    """Import signals when app is ready"""
    import finance.signals  # noqa
```

### 3. Created Management Command (`fix_po_claimed_amounts.py`)

Created a command to fix existing POs with incorrect claimed amounts:

```bash
python manage.py fix_po_claimed_amounts
```

## Files Created/Modified

### New Files:
1. `/backend/finance/signals.py` - Signal handlers for automatic PO updates
2. `/backend/finance/management/__init__.py` - Management module init
3. `/backend/finance/management/commands/__init__.py` - Commands module init
4. `/backend/finance/management/commands/fix_po_claimed_amounts.py` - Fix command

### Modified Files:
1. `/backend/finance/apps.py` - Registered signals

## How to Use

### For Future Invoices/Proformas (Automatic)

The signals are now active. When you:
- **Create** an invoice/proforma → PO automatically updates
- **Update** an invoice/proforma → PO automatically updates
- **Delete** an invoice/proforma → PO automatically recalculates

No manual action needed! ✅

### For Existing POs (Manual Fix Required)

Run the management command to fix POs with incorrect claimed amounts:

#### 1. Dry Run (Preview Changes)
```bash
cd /var/www/SAP-Python/backend
source venv/bin/activate
python manage.py fix_po_claimed_amounts --dry-run
```

This shows what would be changed without actually updating anything.

#### 2. Fix All POs
```bash
python manage.py fix_po_claimed_amounts
```

#### 3. Fix Specific PO
```bash
python manage.py fix_po_claimed_amounts --po-number PIEPL-PO-23-24-0754
```

#### 4. Fix POs for Specific Company
```bash
python manage.py fix_po_claimed_amounts --company PIEPL
```

### Command Output Example:

```
Found 1 Purchase Orders to process

PIEPL-PO-23-24-0754 (Prozeal Green Energy Ltd):
  Invoice Claimed: 9345600.00 → 0.00
  Invoice Balance: 8411040.00 → 9345600.00
  Invoice Status: partial → not_started
  Claimed Percentage: 0.0%
  ✓ Updated

============================================================
Total POs processed: 1
POs with changes: 1
Errors: 0

✓ Successfully updated 1 Purchase Orders
```

## What Gets Updated

When an invoice is deleted, the system automatically recalculates:

1. **proforma_claimed_amount** - Total claimed via proforma invoices
2. **invoice_claimed_amount** - Total claimed via tax invoices
3. **remaining_proforma_balance** - Remaining amount for proforma claiming
4. **remaining_invoice_balance** - Remaining amount for tax invoicing
5. **proforma_status** - not_started/partial/completed
6. **invoice_status** - not_started/partial/completed

## Claimed Percentage Calculation

The claimed percentage shown in the UI is calculated as:

```python
claimed_percentage = (invoice_claimed_amount / total_amount) * 100
```

For your example:
- Before deletion: (₹9,34,560 / ₹93,45,600) × 100 = 10%
- After deletion: (₹0 / ₹93,45,600) × 100 = 0%

## Testing

### Test Case 1: Delete Invoice
1. Create a PO with total ₹100,000
2. Create an invoice for ₹30,000
3. Verify PO shows: Claimed 30%, Balance ₹70,000
4. Delete the invoice
5. Verify PO shows: Claimed 0%, Balance ₹100,000 ✅

### Test Case 2: Delete Proforma
1. Create a PO with total ₹100,000
2. Create a proforma for ₹40,000
3. Verify PO shows: Proforma claimed 40%
4. Delete the proforma
5. Verify PO shows: Proforma claimed 0% ✅

### Test Case 3: Multiple Invoices
1. Create a PO with total ₹100,000
2. Create invoice 1 for ₹30,000
3. Create invoice 2 for ₹20,000
4. Verify PO shows: Claimed 50%, Balance ₹50,000
5. Delete invoice 1
6. Verify PO shows: Claimed 20%, Balance ₹80,000 ✅

## Status Transitions

### Invoice Status:
- **not_started**: No invoices created (remaining_invoice_balance = total_amount)
- **partial**: Some invoices created (0 < remaining_invoice_balance < total_amount)
- **completed**: Fully invoiced (remaining_invoice_balance ≤ 0)

### Proforma Status:
- **not_started**: No proformas created (remaining_proforma_balance = subtotal)
- **partial**: Some proformas created (0 < remaining_proforma_balance < subtotal)
- **completed**: Fully claimed via proformas (remaining_proforma_balance ≤ 0)

## Benefits

1. ✅ **Automatic Updates**: No manual recalculation needed
2. ✅ **Data Consistency**: PO always reflects actual claimed amounts
3. ✅ **Accurate Reporting**: Claimed percentages are always correct
4. ✅ **Audit Trail**: Logs all updates for debugging
5. ✅ **Backward Compatible**: Doesn't break existing functionality
6. ✅ **Easy Fix**: Management command fixes historical data

## Troubleshooting

### Issue: Signals not working after deployment

**Solution**: Restart the Django server
```bash
./restart_services.sh
```

### Issue: PO still shows wrong claimed amount

**Solution**: Run the fix command
```bash
python manage.py fix_po_claimed_amounts --po-number YOUR-PO-NUMBER
```

### Issue: Error "No module named 'finance.signals'"

**Solution**: Ensure signals.py is created and apps.py is updated, then restart

### Issue: Command not found

**Solution**: Ensure you're in the backend directory and virtual environment is activated
```bash
cd /var/www/SAP-Python/backend
source venv/bin/activate
python manage.py fix_po_claimed_amounts
```

## Performance Considerations

- Signals run synchronously during invoice/proforma save/delete
- For bulk operations, consider disabling signals temporarily
- The fix command processes POs one at a time (safe for large datasets)
- Uses `select_related` and `aggregate` for efficient queries

## Logging

All signal operations are logged:

```python
logger.info(f"Recalculating PO {po.internal_po_number} after invoice {invoice.invoice_number} deletion")
logger.info(f"Successfully updated PO {po.internal_po_number}: Invoice claimed: {invoice_total}")
logger.error(f"Error updating PO after invoice deletion: {str(e)}")
```

Check logs at: `/var/www/SAP-Python/backend/logs/` (if configured)

## Related Documentation

- `TEMPLATE_FIXES_SUMMARY.md` - Invoice and PO template fixes
- `INVOICE_PO_DETAILS_FIX.md` - Invoice PO number display
- Django Signals: https://docs.djangoproject.com/en/stable/topics/signals/

## Support

If you encounter issues:
1. Check Django logs for signal errors
2. Run the fix command with `--dry-run` first
3. Verify the PO has the correct total_amount set
4. Ensure invoices are properly linked to the PO

---

**Status**: ✅ Implemented and Ready to Use  
**Impact**: All future invoice/proforma deletions will automatically update PO claimed amounts  
**Action Required**: Run `fix_po_claimed_amounts` command to fix existing POs
