# Purchase Order & Invoice Template Fixes - Complete Guide

## Overview
This document covers fixes for both Purchase Order (PO) PDFs and Invoice PDFs that reference PO details.

## Part 1: Purchase Order Template Fix

### Issue
The PO templates (AS, BKGE, TC) were not fetching company details properly when generating print/download PDFs.

## Root Cause
1. **Company Model Structure**: The Company model only has a single `address` field (TextField), but templates were trying to access:
   - `company.address_line1`
   - `company.address_line2`
   - `company.city`
   - `company.state`
   - `company.pincode`

2. **Missing Field**: Templates referenced `purchase_order.delivery_date` which doesn't exist in the PurchaseOrder model.

3. **Incomplete Address Parsing**: The `po_pdf_service.py` was attempting to parse the address but wasn't properly setting `address_line1` and `address_line2`.

## Files Fixed

### 1. `/backend/finance/po_pdf_service.py`
**Changes:**
- Enhanced address parsing logic to properly extract and set all required fields
- Now correctly parses comma-separated address into:
  - `address_line1`: First part of address
  - `address_line2`: Middle parts (if any)
  - `city`: Second-to-last part
  - `state`: Last part (minus pincode)
  - `pincode`: 6-digit code extracted from last part
- All fields are initialized with empty strings if address is missing

### 2. `/backend/finance/templates/po_templates/AS/purchase_order.html`
**Changes:**
- Made `delivery_date` field optional with conditional rendering
- Template now gracefully handles missing delivery_date

### 3. `/backend/finance/templates/po_templates/BKGE/purchase_order.html`
**Changes:**
- Made `delivery_date` field optional with conditional rendering
- Template now gracefully handles missing delivery_date

### 4. `/backend/finance/templates/po_templates/TC/purchase_order.html`
**Changes:**
- Made `delivery_date` field optional with conditional rendering
- Template now gracefully handles missing delivery_date

## How It Works Now

### Address Parsing Example
If Company address is: `"123 Main Street, Building A, Mumbai, Maharashtra 400001"`

The parser will extract:
- `address_line1`: "123 Main Street"
- `address_line2`: "Building A"
- `city`: "Mumbai"
- `state`: "Maharashtra"
- `pincode`: "400001"

### Template Rendering
All three templates (AS, BKGE, TC) now:
1. Display complete company address with proper formatting
2. Handle missing delivery_date gracefully (only show if present)
3. Show all company details correctly in PDF output

## Testing
To verify the fix:
1. Generate a PO PDF using Athena Solutions template
2. Check that company address displays correctly
3. Verify all company details (name, phone, email, GSTIN) appear
4. Confirm no errors if delivery_date is missing

## Impact
- ✅ All PO templates now render correctly
- ✅ Company details display properly in PDFs
- ✅ No more missing field errors
- ✅ Backward compatible with existing data

---

## Part 2: Invoice PO Details Fix

### Issue
Purchase Order details were not showing in Invoice PDFs, specifically in the TC (Thiravium Constructions) template.

### Root Cause
The TC invoice template was missing the PO number field that exists in AS and BKGE invoice templates.

### Files Fixed

#### `/backend/finance/templates/invoice_templates/TC/invoice.html`
**Changes:**
- Added PO number field to the meta section
- Field is conditionally displayed only when invoice has a linked purchase order
- Format: `{% if invoice.purchase_order %}<div class="ms"><div class="mslbl">PO No.</div><div class="msval">{{ invoice.purchase_order.po_number }}</div></div>{% endif %}`

### How Invoice-PO Link Works

1. **Invoice Model Relationship**: Invoice has a ForeignKey to PurchaseOrder
   ```python
   purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, 
                                     related_name='invoices', null=True, blank=True)
   ```

2. **Template Access**: Templates can directly access `invoice.purchase_order.po_number`

3. **Conditional Display**: PO number only shows if invoice is linked to a PO

### Template Status After Fix

| Template | PO Number in Invoice | Status |
|----------|---------------------|--------|
| AS       | ✅ Already had it    | Working |
| BKGE     | ✅ Already had it    | Working |
| TC       | ✅ Now added         | Fixed |

### Testing Invoice PO Display

1. Create an invoice from a Purchase Order (or link manually)
2. Generate PDF using TC template
3. Check meta section - should show "PO No." with the purchase order number
4. For invoices without PO link, field won't appear (graceful handling)

### Expected Invoice PDF Output
```
INVOICE NO.     DATE          DUE DATE      PO NO.           GST TYPE
TC-INV-XXX-XXX  28/04/2026    28/05/2026    CLIENT-PO-123    IGST
```

---

## Summary of All Fixes

### Purchase Order PDFs
- ✅ Fixed company address parsing (address_line1, address_line2, city, state, pincode)
- ✅ Made delivery_date optional in all PO templates
- ✅ All 3 PO templates (AS/BKGE/TC) now work correctly

### Invoice PDFs
- ✅ Added PO number field to TC invoice template
- ✅ All 3 invoice templates (AS/BKGE/TC) now show PO details when available
- ✅ Graceful handling when invoice has no linked PO

## Files Modified

1. `/backend/finance/po_pdf_service.py` - Enhanced address parsing
2. `/backend/finance/templates/po_templates/AS/purchase_order.html` - Made delivery_date optional
3. `/backend/finance/templates/po_templates/BKGE/purchase_order.html` - Made delivery_date optional
4. `/backend/finance/templates/po_templates/TC/purchase_order.html` - Made delivery_date optional
5. `/backend/finance/templates/invoice_templates/TC/invoice.html` - Added PO number field
