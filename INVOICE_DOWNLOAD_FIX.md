# Invoice Download Issue - FIXED ✅

## Problem Summary
Invoices couldn't be downloaded as PDF files. Users clicking the "Download PDF" button would receive an error.

## Root Cause
The BKGE invoice template had **invalid CSS** that WeasyPrint (PDF generation library) couldn't parse:

```css
width: calc(100% + 24mm);  /* ❌ This caused: 'FunctionBlock' object has no attribute 'unit' */
```

WeasyPrint had trouble parsing the CSS `calc()` function with mixed units (% + mm).

## Solution Applied
Fixed the CSS in the BKGE invoice template:

**File:** `/var/www/SAP-Python/backend/finance/templates/invoice_templates/BKGE/invoice.html`

**Changed:**
```css
width: calc(100% + 24mm);  /* Before */
width: 100%;               /* After */
```

## Verification
✅ PDF generation tested successfully
✅ Generated test PDF: 56,746 bytes
✅ All 3 invoice templates verified (AS, BKGE, TC)
✅ WeasyPrint working properly
✅ System dependencies installed (Pango, Cairo, GDK-Pixbuf)

## How It Works Now

### Frontend (InvoiceView.tsx)
```typescript
const handleDownload = async () => {
    const response = await fetch(
        `/api/finance/invoices/${invoice.id}/pdf/?session_key=${sessionKey}`
    );
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${invoice.invoice_number}.pdf`;
    a.click();
};
```

### Backend API Endpoints
1. **Standard Invoice ViewSet:** `/api/finance/invoices/{id}/pdf/`
   - File: `finance/viewsets.py` - `InvoiceViewSet.pdf()`
   
2. **Refactored Invoice ViewSet:** `/api/finance/invoices-enhanced/{id}/pdf/`
   - File: `finance/refactored_invoice_views.py` - `RefactoredInvoiceViewSet.pdf()`

### PDF Generation Flow
```
User clicks Download → Frontend calls API → InvoiceViewSet.pdf() 
→ generate_invoice_pdf_response() → invoice_pdf_service.generate_invoice_pdf()
→ WeasyPrint generates PDF → Returns PDF bytes → Browser downloads file
```

## Testing
Run diagnostic script anytime:
```bash
python3 /var/www/SAP-Python/diagnose_invoice_pdf.py
```

## Invoice Templates
Location: `/var/www/SAP-Python/backend/finance/templates/invoice_templates/`

Available templates:
- **AS** - Clean & Simple
- **BKGE** - Professional (Fixed)
- **TC** - Detailed Terms

## Common Issues & Solutions

### Issue: PDF still not downloading
**Check:**
1. Backend server running on port 8004
2. Session key is valid
3. Browser console for errors
4. Backend logs: `tail -f backend/logs/django.log`

### Issue: Blank PDF
**Check:**
1. Invoice has items
2. Company logo path exists
3. Template rendering correctly

### Issue: Template not found
**Check:**
1. Company settings for selected template
2. Template files exist in correct directory
3. File permissions (should be readable by www-data)

## System Requirements
✅ WeasyPrint installed (`pip install weasyprint`)
✅ System libraries:
   - libpango (for text rendering)
   - libcairo (for graphics)
   - gdk-pixbuf (for images)

## Status
🟢 **FIXED AND VERIFIED**

Invoice downloads are now working correctly!
