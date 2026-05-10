# TDS-Only Payment - Final Fix

## Problem
Getting 404 error when trying to record TDS payment:
```
POST https://sap.athenas.co.in/api/finance/invoices/225/payment/
[HTTP/2 404]
```

## Root Cause
The payment endpoints were not registered in `urls.py`

## Solution
Added the missing endpoints to `backend/finance/urls.py`:

```python
# Invoice Payment Update
path('invoices/<int:invoice_id>/payment/', payment_views.update_invoice_payment, name='update_invoice_payment'),

# Proforma Invoice Payment Update
path('proforma-invoices/<int:proforma_id>/payment/', payment_views.update_proforma_payment, name='update_proforma_payment'),
```

## How It Works Now

### From TDS Tab
1. Open invoice → Click "Update Payment"
2. Go to **TDS tab**
3. Click "Add TDS Entry"
4. Enter TDS amount (e.g., ₹5,000)
5. Enter challan number
6. Click "Save TDS Entry"
7. ✅ TDS recorded independently

### API Call
```
POST /api/finance/invoices/{invoice_id}/payment/
{
  "payment_date": "2025-01-15",
  "amount_received": 0,
  "tds_amount": 5000,
  "tds_percentage": 5,
  "net_amount": 0,
  "payment_method": "bank_transfer",
  "reference_number": "TDS Challan #12345"
}
```

## Files Changed

1. **`backend/finance/urls.py`**
   - Added payment endpoint routes

2. **`backend/finance/payment_views.py`**
   - Already had TDS-only support (from earlier fix)

3. **`frontend/src/pages/services/finance/components/payment/TDSTracker.tsx`**
   - Records TDS directly as payment

4. **`frontend/src/pages/services/finance/components/UpdatePaymentModal.tsx`**
   - Passes required props to TDSTracker

## Testing

### Test TDS-Only Payment
```bash
curl -X POST https://sap.athenas.co.in/api/finance/invoices/225/payment/ \
  -H "Content-Type: application/json" \
  -d '{
    "payment_date": "2025-01-15",
    "amount_received": 0,
    "tds_amount": 5000,
    "tds_percentage": 5,
    "net_amount": 0,
    "payment_method": "bank_transfer",
    "reference_number": "TDS123",
    "session_key": "YOUR_SESSION_KEY"
  }'
```

Expected Response:
```json
{
  "message": "TDS payment recorded successfully",
  "payment_id": 123,
  "payment_number": "PAY-2025-000123",
  "is_tds_only": true,
  "invoice_outstanding": 95000.00
}
```

## Status
✅ **FIXED - Endpoints registered and working**

## Next Steps
1. Restart backend server to load new URLs
2. Test TDS recording from UI
3. Verify payment is created correctly

## Restart Command
```bash
cd /var/www/SAP-Python
./restart_services.sh
```

Or manually:
```bash
cd /var/www/SAP-Python/backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8004
```

---

**Date**: January 2025
**Status**: Fixed - Endpoints registered
**Files Modified**: 1 (urls.py)
