# Invoice PO Details Fix - Complete Guide

## Issue
Purchase Order (PO) details were not showing in invoice PDFs, specifically in the TC (Thiravium Constructions) template.

## Root Cause
The TC invoice template was missing the PO number field that exists in AS and BKGE templates.

## Solution Applied

### File Modified: `/backend/finance/templates/invoice_templates/TC/invoice.html`

Added PO number field to the meta section (line ~175):

```html
<div class="meta">
  <div class="ms"><div class="mslbl">Invoice No.</div><div class="msval">{{ invoice.invoice_number }}</div></div>
  <div class="ms"><div class="mslbl">Date</div><div class="msval">{{ invoice.invoice_date|date:"d/m/Y" }}</div></div>
  <div class="ms"><div class="mslbl">Due Date</div><div class="msval">{{ invoice.due_date|date:"d/m/Y" }}</div></div>
  {% if invoice.purchase_order %}<div class="ms"><div class="mslbl">PO No.</div><div class="msval">{{ invoice.purchase_order.po_number }}</div></div>{% endif %}
  <div class="ms"><div class="mslbl">GST Type</div><div class="msval">{{ invoice.gst_type|upper }}</div></div>
  <div class="ms"><div class="mslbl">Place of Supply</div><div class="msval">{{ invoice.place_of_supply|default:customer.billing_state }}</div></div>
  {% if invoice.reference %}<div class="ms"><div class="mslbl">Reference</div><div class="msval">{{ invoice.reference }}</div></div>{% endif %}
</div>
```

## How It Works

### Invoice-PO Relationship
The Invoice model has a direct ForeignKey relationship to PurchaseOrder:
```python
purchase_order = models.ForeignKey(
    PurchaseOrder, 
    on_delete=models.CASCADE, 
    related_name='invoices', 
    null=True, 
    blank=True
)
```

### Template Logic
- The PO number field is conditionally displayed: `{% if invoice.purchase_order %}`
- If an invoice is linked to a PO, it will show: **PO No.** with the value `{{ invoice.purchase_order.po_number }}`
- If no PO is linked, the field is hidden (no empty space)

## Template Comparison

### Before Fix (TC Template)
```
Invoice No. | Date | Due Date | GST Type | Place of Supply | Reference
```

### After Fix (TC Template)
```
Invoice No. | Date | Due Date | PO No. | GST Type | Place of Supply | Reference
```
(PO No. only shows if invoice has a linked purchase order)

## All Templates Status

| Template | PO Number Field | Status |
|----------|----------------|--------|
| AS       | ✅ Already had it | Working |
| BKGE     | ✅ Already had it | Working |
| TC       | ✅ Now added | Fixed |

## Testing

### To verify the fix:
1. Create or open an invoice that is linked to a Purchase Order
2. Generate PDF using TC template (Thiravium Constructions)
3. Check the meta section below the header
4. You should see "PO No." with the purchase order number

### Expected Output in PDF:
```
INVOICE NO.     DATE          DUE DATE      PO NO.           GST TYPE
TC-INV-XXX-XXX  28/04/2026    28/05/2026    CLIENT-PO-123    IGST
```

## Important Notes

1. **PO Number Only Shows When Linked**: The PO number will only appear if the invoice has a `purchase_order` relationship. If the invoice was created without a PO, this field won't show.

2. **Creating Invoice from PO**: When you create an invoice from a Purchase Order, the system automatically links them via the `invoice.purchase_order` field.

3. **Manual Invoice Creation**: If you create an invoice manually (not from a PO), you can still link it to a PO by selecting the purchase order in the invoice form.

## Related Files

- `/backend/finance/templates/invoice_templates/TC/invoice.html` - TC template (FIXED)
- `/backend/finance/templates/invoice_templates/AS/invoice.html` - AS template (already had PO field)
- `/backend/finance/templates/invoice_templates/BKGE/invoice.html` - BKGE template (already had PO field)
- `/backend/finance/models.py` - Invoice model with purchase_order ForeignKey
- `/backend/finance/invoice_pdf_service.py` - PDF generation service
- `/backend/finance/invoice_service.py` - Context preparation with reference_details

## Additional Context Available

The invoice context also includes `reference_details` which provides more PO information:
```python
reference_details = {
    'purchase_order': {
        'po_number': 'CLIENT-PO-123',
        'internal_po_number': 'PGEL-PO-24-25-384',
        'po_date': date(2024, 4, 15),
        'total_amount': Decimal('1227200.00'),
        'status': 'active',
        'remaining_invoice_balance': Decimal('500000.00')
    }
}
```

This can be used for more detailed PO information if needed in future enhancements.
