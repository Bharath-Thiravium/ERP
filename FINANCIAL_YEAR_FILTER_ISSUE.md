# Financial Year Filter Issue - PO Details Modal

## Issue

When viewing PO details, the "Related Invoices" section shows only invoices from the current financial year, but the PO claimed amount is calculated from ALL invoices across all years.

### Example:
- **PO**: PGEL/24-25/200
- **Total Invoices**: 6 (across 2025-26 and 2026-27)
- **UI Shows**: 1 invoice (only from 2026-27)
- **Claimed Amount**: Based on all 6 invoices

This creates confusion because:
- ❌ Users see "1 invoice" but claimed percentage is 101.4%
- ❌ The math doesn't add up from user's perspective
- ❌ Users think invoices are missing or data is wrong

---

## Root Cause

The frontend likely has a **global financial year filter** that applies to all invoice queries, including the PO details modal.

**File**: `/frontend/src/pages/services/finance/components/PODetailsModal.tsx`

**Line 119-127**:
```typescript
const fetchRelatedInvoices = async () => {
  try {
    const [proformaResponse, invoiceResponse] = await Promise.all([
      apiClient.getFinanceProformaInvoices({ 
        session_key: sessionKey, 
        purchase_order_id: poId, 
        page_size: 100 
      }),
      apiClient.getFinanceInvoices({ 
        session_key: sessionKey, 
        purchase_order_id: poId, 
        page_size: 100 
      })
    ])
```

The API calls don't explicitly bypass the financial year filter.

---

## Solution Options

### Option 1: Add `all_years=true` Parameter (Recommended)

Modify the API call to fetch invoices from all years when viewing PO details:

```typescript
const fetchRelatedInvoices = async () => {
  try {
    const [proformaResponse, invoiceResponse] = await Promise.all([
      apiClient.getFinanceProformaInvoices({ 
        session_key: sessionKey, 
        purchase_order_id: poId, 
        page_size: 100,
        all_years: true  // ← Add this
      }),
      apiClient.getFinanceInvoices({ 
        session_key: sessionKey, 
        purchase_order_id: poId, 
        page_size: 100,
        all_years: true  // ← Add this
      })
    ])
```

**Backend Support**: The backend would need to recognize the `all_years` parameter and skip the financial year filter.

---

### Option 2: Show Financial Year Breakdown

Group invoices by financial year in the UI:

```
Related Invoices (6)

FY 2025-26 (5 invoices)
  - BKC/045/2526 - ₹10,79,007.93
  - BKC/048/2526 - ₹3,61,375.00
  - BKC/055/2526 - ₹5,56,263.80
  - BKC/054/2526 - ₹1,19,889.77
  - BKC/059/2526 - ₹6,80,417.50

FY 2026-27 (1 invoice)
  - BKC-INV-2627-004 - ₹1,96,393.30
```

---

### Option 3: Add Warning Message

Show a warning when filtered invoices don't match claimed amount:

```
⚠️ Showing 1 of 6 invoices (filtered by FY 2026-27)
   Click here to view all invoices
```

---

### Option 4: User Workaround (Temporary)

**For now**, users can:
1. Change the financial year dropdown to "All Years"
2. Or manually check each financial year
3. Or use the investigation script to see all invoices

---

## Recommended Fix

### Frontend Change

**File**: `/frontend/src/pages/services/finance/components/PODetailsModal.tsx`

**Change**:
```typescript
// Line 119-127
const fetchRelatedInvoices = async () => {
  try {
    const [proformaResponse, invoiceResponse] = await Promise.all([
      apiClient.getFinanceProformaInvoices({ 
        session_key: sessionKey, 
        purchase_order_id: poId, 
        page_size: 100,
        ignore_fy_filter: true  // Bypass financial year filter for PO details
      }),
      apiClient.getFinanceInvoices({ 
        session_key: sessionKey, 
        purchase_order_id: poId, 
        page_size: 100,
        ignore_fy_filter: true  // Bypass financial year filter for PO details
      })
    ])
```

### Backend Change

**File**: `/backend/finance/viewsets.py`

**Add to InvoiceViewSet.get_queryset()**:
```python
def get_queryset(self):
    queryset = super().get_queryset()...
    
    # If viewing PO details, show all invoices regardless of FY
    ignore_fy_filter = self.request.query_params.get('ignore_fy_filter', 'false').lower() == 'true'
    
    if not ignore_fy_filter:
        # Apply financial year filter as usual
        financial_year = self.request.query_params.get('financial_year')
        if financial_year:
            queryset = queryset.filter(financial_year=financial_year)
    
    return queryset
```

---

## Impact

### Before Fix:
- ❌ Users confused by invoice count mismatch
- ❌ Claimed percentage doesn't match visible invoices
- ❌ Users think data is wrong or corrupted

### After Fix:
- ✅ All invoices visible in PO details
- ✅ Claimed percentage matches visible invoices
- ✅ Clear understanding of PO status

---

## Testing

1. Open PO details for PGEL/24-25/200
2. Check "Related Invoices" section
3. Should show all 6 invoices
4. Claimed percentage should make sense

---

## Workaround (Until Fixed)

Users can use the investigation script to see all invoices:

```bash
cd /var/www/SAP-Python
./investigate_overclaimed_po.sh
```

Or change the financial year filter in the UI to "All Years".

---

## Priority

**Medium** - This is confusing but not breaking functionality. Users can still work around it.

---

## Related Issues

- Same issue affects Quotation details
- Same issue affects Customer invoice list
- Any view that shows "related invoices" may have this problem

---

**Status**: Documented  
**Fix Required**: Frontend + Backend changes  
**Workaround Available**: Yes (change FY filter or use script)
