# Quotation Freight & Other Charges Display Fix

## Issue
Freight (shipping charges) and other additional charges were not showing in the quotation PDF print view, even though the values were calculated correctly in the total amount.

## Root Causes (2 Issues Found)

### Issue 1: Backend PDF Templates Missing Display Logic
The backend PDF templates (HTML files used by WeasyPrint) were missing the display logic for `shipping_charges` and `other_charges` fields in the totals section.

### Issue 2: **CRITICAL** - Values Not Being Saved to Database
The `calculate_totals()` method in the Quotation model was using `shipping_charges` and `other_charges` in the calculation but **NOT saving them back to the database**. The `update_fields` parameter in the `save()` call was missing these fields.

**Location:** `/backend/finance/models.py` - Line ~978

**Problem Code:**
```python
super().save(update_fields=[
    'subtotal', 'discount_amount', 'total_tax', 'cgst_amount',
    'sgst_amount', 'igst_amount', 'total_amount', 'tds_applicable', 'tds_amount'
])  # ❌ shipping_charges and other_charges missing!
```

**Fixed Code:**
```python
self.shipping_charges = shipping_charges
self.other_charges = other_charges

super().save(update_fields=[
    'subtotal', 'discount_amount', 'total_tax', 'cgst_amount',
    'sgst_amount', 'igst_amount', 'total_amount', 'tds_applicable', 'tds_amount',
    'shipping_charges', 'other_charges'  # ✅ Now included!
])
```

## Files Updated

### **CRITICAL FIX** - Backend Model
1. **`/backend/finance/models.py`** - Quotation.calculate_totals() method
   - Added `self.shipping_charges = shipping_charges` assignment
   - Added `self.other_charges = other_charges` assignment  
   - Added `'shipping_charges', 'other_charges'` to the `update_fields` list
   - **This was the main issue** - values were calculated but not saved!

### Backend PDF Templates (All Fixed)
1. **TC Template** (Your company template)
   - `/backend/finance/templates/quotation_templates/TC/quotation.html`
   - `/backend/finance/templates/finance/quotation_templates/TC/quotation.html`

2. **AS Template**
   - `/backend/finance/templates/quotation_templates/AS/quotation.html`
   - `/backend/finance/templates/finance/quotation_templates/AS/quotation.html`

3. **BKGE Template**
   - `/backend/finance/templates/quotation_templates/BKGE/quotation.html`
   - `/backend/finance/templates/finance/quotation_templates/BKGE/quotation.html`

4. **Generic Templates**
   - `/backend/finance/templates/quotation_templates/classic_quotation.html`
   - `/backend/finance/templates/quotation_templates/compact_quotation.html`
   - `/backend/finance/templates/quotation_templates/modern_quotation.html`

### Frontend React Component (Enhanced)
- `/frontend/src/pages/services/finance/components/PrintableQuotation.tsx`
  - Added null safety checks
  - Added debug logging (can be removed after testing)
  - Changed label from "Shipping Charges" to "Freight/Shipping Charges"

## Changes Made

### In All Templates
Added the following lines in the totals section (after "Taxable Amount" and before "Tax Amount"):

```django
{% if quotation.shipping_charges > 0 %}
<tr>
    <td class="total-label">Freight/Shipping:</td>
    <td class="total-amount">₹{{ quotation.shipping_charges|floatformat:2 }}</td>
</tr>
{% endif %}
{% if quotation.other_charges > 0 %}
<tr>
    <td class="total-label">Other Charges:</td>
    <td class="total-amount">₹{{ quotation.other_charges|floatformat:2 }}</td>
</tr>
{% endif %}
```

### Display Order in Totals
1. Subtotal
2. Discount (if > 0)
3. Taxable Amount
4. **Freight/Shipping Charges (if > 0)** ← NEW
5. **Other Charges (if > 0)** ← NEW
6. Tax Amount (if > 0)
7. Grand Total

## Testing - IMPORTANT

### For Existing Quotations
**Existing quotations will NOT automatically show the charges** because the values were never saved to the database. You need to:

1. **Option A: Re-save the quotation**
   - Open the quotation in edit mode
   - Click "Save Changes" (even without making changes)
   - This will trigger `calculate_totals()` which will now save the charges

2. **Option B: Create a new quotation**
   - Create a fresh quotation with shipping/other charges
   - The values will now be saved correctly

### For New Quotations
1. Create a quotation with freight/shipping charges and other charges
2. Save the quotation
3. Download/Print the quotation PDF
4. Verify that freight and other charges now appear in the totals section

## Notes
- The discount now shows with a minus sign (-) for clarity
- All charges are only displayed if their value is greater than 0
- The total amount calculation was already correct; only the display was missing
- Both template directories (`quotation_templates/` and `finance/quotation_templates/`) have been updated

## Verification
After this fix, your quotation PDF should show:
- ✅ Subtotal
- ✅ Discount (if applicable)
- ✅ Taxable Amount
- ✅ **Freight/Shipping Charges** (NEW - if > 0)
- ✅ **Other Charges** (NEW - if > 0)
- ✅ Tax Amount
- ✅ Grand Total

The total amount will remain the same as before (it was already calculating correctly), but now all the components are visible.
