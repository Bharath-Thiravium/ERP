# GST Rate Display Fix - CGST/SGST Showing as "18%/2" Instead of "9%"

## Issue
In the HSN/SAC Wise Tax Summary table, CGST and SGST rates were displaying as "18%/2" instead of the clearer "9%".

### Example of Issue:
```
HSN/SAC  TAXABLE VALUE  CGST RATE  CGST     SGST RATE  SGST     TOTAL TAX
995459   206200.00      18%/2      18558    18%/2      18558    37116
```

### Expected Display:
```
HSN/SAC  TAXABLE VALUE  CGST RATE  CGST     SGST RATE  SGST     TOTAL TAX
995459   206200.00      9%         18558    9%         18558    37116
```

## Root Cause
The templates were displaying the full GST rate (e.g., 18%) with "/2" appended, rather than calculating and showing the actual CGST/SGST rate (9%).

## Solution
Changed the template logic to use Django's `widthratio` filter to divide the GST rate by 2 before displaying.

### Before:
```django
<td>{{ item.gst_rate|floatformat:0 }}%/2</td>
```

### After:
```django
<td>{% widthratio item.gst_rate 2 1 %}%</td>
```

## Files Fixed

### 1. Invoice Template - TC
**File**: `/backend/finance/templates/invoice_templates/TC/invoice.html`

**Line ~260** (HSN Summary Table):
```django
{% if invoice.gst_type == "cgst_sgst" %}
<td>{% widthratio item.gst_rate 2 1 %}%</td><td>{% widthratio item.line_total 200 item.gst_rate %}</td>
<td>{% widthratio item.gst_rate 2 1 %}%</td><td>{% widthratio item.line_total 200 item.gst_rate %}</td>
{% else %}
<td>{{ item.gst_rate|floatformat:0 }}%</td><td>{% widthratio item.line_total 100 item.gst_rate %}</td>
{% endif %}
```

### 2. Purchase Order Template - TC
**File**: `/backend/finance/templates/po_templates/TC/purchase_order.html`

**Line ~234** (HSN Summary Table):
```django
{% if purchase_order.gst_type == "cgst_sgst" %}
<td class="c">{% widthratio item.gst_rate 2 1 %}%</td><td class="r">{% widthratio item.line_total 200 item.gst_rate %}</td>
<td class="c">{% widthratio item.gst_rate 2 1 %}%</td><td class="r">{% widthratio item.line_total 200 item.gst_rate %}</td>
{% else %}
<td class="c">{{ item.gst_rate|floatformat:0 }}%</td><td class="r">{% widthratio item.line_total 100 item.gst_rate %}</td>
{% endif %}
```

## How widthratio Works

The `widthratio` filter performs division:
```django
{% widthratio item.gst_rate 2 1 %}
```

This means: `(item.gst_rate / 2) * 1`

**Examples:**
- If `item.gst_rate = 18`, result = `(18 / 2) * 1 = 9`
- If `item.gst_rate = 12`, result = `(12 / 2) * 1 = 6`
- If `item.gst_rate = 28`, result = `(28 / 2) * 1 = 14`

## Template Status

| Template | Document Type | GST Rate Display | Status |
|----------|--------------|------------------|--------|
| AS       | Invoice      | ✅ Already correct | Working |
| BKGE     | Invoice      | ✅ Already correct | Working |
| TC       | Invoice      | ✅ Now fixed (9%)  | Fixed |
| AS       | PO           | ✅ Already correct | Working |
| BKGE     | PO           | ✅ Already correct | Working |
| TC       | PO           | ✅ Now fixed (9%)  | Fixed |

## Testing

### To verify the fix:

1. **For Invoices:**
   - Create/open an invoice with CGST+SGST (intra-state)
   - Use TC template (Thiravium Constructions)
   - Generate PDF
   - Check HSN/SAC Wise Tax Summary table
   - CGST Rate and SGST Rate should show "9%" (not "18%/2")

2. **For Purchase Orders:**
   - Create/open a PO with CGST+SGST (intra-state)
   - Use TC template
   - Generate PDF
   - Check HSN/SAC Tax Summary table
   - CGST Rate and SGST Rate should show "9%" (not "18%/2")

### Expected Output:

**For 18% GST (CGST+SGST):**
```
HSN/SAC  TAXABLE VALUE  CGST RATE  CGST      SGST RATE  SGST      TOTAL TAX
995459   206200.00      9%         18558.00  9%         18558.00  37116.00
```

**For 12% GST (CGST+SGST):**
```
HSN/SAC  TAXABLE VALUE  CGST RATE  CGST      SGST RATE  SGST      TOTAL TAX
998311   100000.00      6%         6000.00   6%         6000.00   12000.00
```

## Why This Matters

1. **Clarity**: "9%" is immediately clear, while "18%/2" requires mental calculation
2. **Professional**: Standard GST invoices show the actual CGST/SGST rate (9%), not the total rate divided
3. **Compliance**: GST regulations expect CGST and SGST to be shown as separate rates
4. **User Experience**: Reduces confusion for customers and accountants

## Technical Notes

- The tax calculation remains unchanged (still divides by 200 for CGST/SGST amounts)
- Only the display format changed
- IGST rate display remains as-is (shows full rate like "18%")
- No database changes required
- Backward compatible with all existing data

## Related Files

- `/backend/finance/templates/invoice_templates/TC/invoice.html` - TC Invoice template (FIXED)
- `/backend/finance/templates/po_templates/TC/purchase_order.html` - TC PO template (FIXED)
- `/backend/finance/templates/invoice_templates/AS/invoice.html` - AS Invoice (already correct)
- `/backend/finance/templates/invoice_templates/BKGE/invoice.html` - BKGE Invoice (already correct)
- `/backend/finance/templates/po_templates/AS/purchase_order.html` - AS PO (already correct)
- `/backend/finance/templates/po_templates/BKGE/purchase_order.html` - BKGE PO (already correct)
