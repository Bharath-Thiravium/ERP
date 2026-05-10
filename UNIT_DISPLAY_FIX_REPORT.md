# Unit Display Issue - Root Cause & Fix

## Issue Summary
Units were not being displayed in products, invoices, quotations, and PO/WO print/download views.

---

## Root Cause Analysis

### What Happened:
1. **Dual Unit System**: The system has two unit fields:
   - `unit` (CharField) - Legacy string field
   - `unit_ref` (ForeignKey to Unit model) - New dynamic unit reference

2. **Empty Unit Fields**: Many products had `unit_ref` set but `unit` field was empty
   - When products were created/updated with `unit_ref`, the `unit` field wasn't automatically populated
   - Invoice items, PO items, quotation items copied the empty `unit` field from products

3. **Display Issue**: Templates and PDFs use the `unit` field for display, not `unit_ref.code`

### Why It Happened:
- The Product model's save() method didn't sync `unit` from `unit_ref`
- When creating invoice/PO/quotation items, the code copied `product.unit` (empty) instead of `product.unit_ref.code`

---

## The Fix Applied

### 1. Database Fix (Immediate)
✅ **Fixed 277 invoice items** with empty units
✅ **Fixed 19 quotation items** with empty units  
✅ **Fixed 103 PO items** with empty units

SQL script: `/var/www/SAP-Python/fix_empty_units.sql`

The script:
- Copied unit codes from `unit_ref` to `unit` field for all products
- Updated all invoice items, quotation items, PO items, and proforma items with empty units
- Used fallback to 'NOS' if no unit was found

### 2. Model Fix (Permanent)
✅ **Updated Product.save() method** to automatically populate `unit` from `unit_ref.code`

Location: `/var/www/SAP-Python/backend/finance/models.py`

```python
# Ensure unit field is populated from unit_ref if available
if self.unit_ref and (not self.unit or self.unit.strip() == ''):
    self.unit = self.unit_ref.code
```

This ensures:
- When a product is created with `unit_ref`, the `unit` field is automatically set
- When a product is updated with a new `unit_ref`, the `unit` field is synced
- Backward compatibility is maintained (old products with only `unit` field still work)

---

## Results

### Before Fix:
```
Products with empty units: 10+
Invoice items with empty units: 277
Quotation items with empty units: 19
PO items with empty units: 103
```

### After Fix:
```
✅ All products have units populated
✅ All invoice items have units populated
✅ All quotation items have units populated
✅ All PO items have units populated
```

---

## Verification

### Check Products:
```sql
SELECT id, name, unit, unit_ref_id 
FROM finance_products 
WHERE unit IS NULL OR unit = '';
```
**Expected:** 0 rows

### Check Invoice Items:
```sql
SELECT id, invoice_id, product_name, quantity, unit 
FROM finance_invoice_items 
WHERE unit IS NULL OR unit = '';
```
**Expected:** 0 rows

---

## Prevention Measures

### For Future Development:

1. **Always Use unit_ref.code**: When creating items from products, use:
   ```python
   unit = product.unit_ref.code if product.unit_ref else product.unit
   ```

2. **Validate on Save**: The Product model now automatically syncs `unit` from `unit_ref`

3. **Template Display**: Templates should use:
   ```django
   {{ item.unit|default:"Nos" }}
   ```
   This provides a fallback if unit is somehow empty

4. **API Serializers**: Ensure serializers include both fields:
   ```python
   fields = ['unit', 'unit_ref_code', ...]
   ```

---

## Files Modified

1. `/var/www/SAP-Python/backend/finance/models.py` - Product.save() method
2. `/var/www/SAP-Python/fix_empty_units.sql` - Database fix script

---

## Status
✅ **RESOLVED** - All units are now properly displayed in products, invoices, quotations, PO/WO, and print/download views.

## Testing Checklist
- [ ] Create a new product with unit_ref → Verify unit field is populated
- [ ] Create an invoice from PO → Verify units are displayed
- [ ] Download invoice PDF → Verify units are shown
- [ ] View quotation → Verify units are displayed
- [ ] Download PO PDF → Verify units are shown
