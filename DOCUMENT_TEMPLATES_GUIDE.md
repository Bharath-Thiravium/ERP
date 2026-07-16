# Document Templates - Complete Guide

## Template Structure

All document types (Invoice, Quotation, PO, Proforma) have **3 design templates**:

### 1. AS Template - Clean & Simple ✅
- Minimalist design
- Clean typography
- Simple layout
- Best for: Quick documents

### 2. BKGE Template - Professional ✅ **FIXED**
- Gradient header (teal/green)
- Professional styling
- Modern layout
- **Issue Fixed:** CSS calc() bug removed
- Best for: Standard business documents

### 3. TC Template - Detailed Terms ✅ **PREMIUM**
- Premium gold/charcoal header
- Per-line GST columns (CGST/SGST/IGST)
- HSN/SAC-wise tax summary table
- Complete bank details section
- Declaration clause
- 3 signature blocks
- Best for: Compliance-heavy documents
- **Note:** This template has unique design - DO NOT MODIFY

## Template Locations

```
/var/www/SAP-Python/backend/finance/templates/
├── invoice_templates/
│   ├── AS/invoice.html
│   ├── BKGE/invoice.html ✅ FIXED
│   └── TC/invoice.html ⭐ PREMIUM
├── quotation_templates/
│   ├── AS/quotation.html
│   ├── BKGE/quotation.html ✅ FIXED
│   └── TC/quotation.html ⭐ PREMIUM
├── po_templates/
│   ├── AS/purchase_order.html
│   ├── BKGE/purchase_order.html ✅ FIXED
│   └── TC/purchase_order.html ⭐ PREMIUM
└── proforma_templates/
    ├── AS/proforma_invoice.html
    ├── BKGE/proforma_invoice.html ✅ FIXED
    └── TC/proforma_invoice.html ⭐ PREMIUM
```

## Fixed Issue

**Problem:** BKGE templates had CSS `width: calc(100% + 24mm)` which caused WeasyPrint to crash

**Error:** `'FunctionBlock' object has no attribute 'unit'`

**Solution:** Changed to `width: 100%` in all BKGE templates

## Template Parameters

All templates include these parameters:

### Common Fields
- Company details (name, address, GSTIN, PAN, phone, email, logo)
- Customer/Vendor details
- Document number & date
- Billing address
- Shipping address (with fallback to billing)
- Items table with HSN/SAC codes
- Quantity, unit, rate, GST%
- Amount calculations
- Subtotal, tax breakdown (CGST/SGST or IGST)
- Discount (percentage/amount)
- Shipping & other charges
- Grand total
- Amount in words
- Terms & conditions
- Notes
- Signatures

### Document-Specific Fields

**Invoice:**
- Invoice number, date, due date
- Payment status
- Outstanding amount
- Paid amount

**Quotation:**
- Quotation number, date
- Valid until date
- Validity period

**Purchase Order:**
- PO number, internal PO number
- PO date, delivery date
- Vendor information

**Proforma:**
- Proforma number, date
- Conversion to invoice option

### Compliance Fields (All Documents)
- Place of supply
- Reverse charge applicable
- GST type (CGST/SGST, IGST, Exempt)
- HSN/SAC codes per item

### TC Template Additional Features
- Per-line tax calculation display
- HSN/SAC-wise summary table showing:
  - Taxable value per HSN
  - Individual CGST/SGST or IGST amounts
  - Total tax per HSN
  - Grand totals
- Detailed bank details:
  - Bank name
  - Account number
  - IFSC code
  - Branch
  - Account type
- Declaration clause
- 3 signature blocks:
  - Customer signature
  - Company authorized signatory
  - Additional signatory (if needed)

## Template Selection

Templates are selected via Company Settings:

1. **Invoice Template:** `selected_invoice_template` (AS/BKGE/TC)
2. **Quotation Template:** `selected_template` (AS/BKGE/TC)
3. **PO Template:** `selected_po_template` (AS/BKGE/TC)
4. **Proforma Template:** `selected_proforma_template` (AS/BKGE/TC)

## PDF Generation Services

### Backend Services
```python
# Invoice PDF
from finance.invoice_pdf_service import invoice_pdf_service
pdf_bytes = invoice_pdf_service.generate_invoice_pdf(invoice, template_code='BKGE')

# Quotation PDF
from finance.quotation_pdf_service import quotation_pdf_service
pdf_bytes = quotation_pdf_service.generate_quotation_pdf(quotation, template='BKGE')

# PO PDF
from finance.po_pdf_service import po_pdf_service
pdf_bytes = po_pdf_service.generate_po_pdf(purchase_order)

# Proforma PDF
from finance.proforma_pdf_service import proforma_pdf_service
pdf_bytes = proforma_pdf_service.generate_proforma_pdf(proforma, template_code='BKGE')
```

### API Endpoints
```
GET /api/finance/invoices/{id}/pdf/?session_key={key}
GET /api/finance/quotations/{id}/pdf/?session_key={key}
GET /api/finance/purchase-orders/{id}/pdf/?session_key={key}
GET /api/finance/proforma-invoices/{id}/pdf/?session_key={key}
```

## Download Feature

All documents have download buttons in their view modals:

```typescript
// Frontend download handler
const handleDownload = async () => {
    const response = await fetch(`/api/finance/invoices/${id}/pdf/?session_key=${sessionKey}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${invoiceNumber}.pdf`;
    a.click();
};
```

## Testing PDFs

Run diagnostic script:
```bash
python3 /var/www/SAP-Python/diagnose_invoice_pdf.py
```

## System Requirements

- **WeasyPrint:** PDF generation library
- **Pango:** Text rendering ✅ Installed
- **Cairo:** Graphics rendering ✅ Installed
- **GDK-Pixbuf:** Image support ✅ Installed

## Status

🟢 **ALL TEMPLATES WORKING**

- ✅ Invoice templates (AS, BKGE, TC) - Working
- ✅ Quotation templates (AS, BKGE, TC) - Working
- ✅ PO templates (AS, BKGE, TC) - Working
- ✅ Proforma templates (AS, BKGE, TC) - Working
- ✅ PDF download functionality - Working
- ✅ Template selection - Working
- ✅ CSS calc() bug - Fixed

## Customization

To customize templates:

1. **AS Template:** Modify for minimal changes
2. **BKGE Template:** Modify for standard business look
3. **TC Template:** ⚠️ DO NOT MODIFY - Premium compliance template

### Safe Customization Areas
- Company logo positioning
- Color schemes (background colors)
- Font sizes (within reason)
- Spacing and padding
- Footer text

### Do NOT Modify
- Table structures (affects calculations)
- GST calculation logic
- HSN/SAC summary tables (TC template)
- WeasyPrint-incompatible CSS:
  - `calc()` with mixed units ❌
  - `transform` properties ❌
  - Advanced flexbox ❌
  - CSS Grid (limited support) ⚠️

## Support

For template issues:
1. Check backend logs: `tail -f backend/logs/django.log`
2. Run diagnostic script
3. Verify template file exists
4. Check CSS for WeasyPrint compatibility
5. Test PDF generation directly via Python
