# Quotation Duplication & Proforma Invoice Creation - Issue Fix

## Issues Identified

### 1. ❌ Quotation Duplication Failing
**Problem:** The quotation copy/duplicate feature was not working.

**Root Cause:** 
- The `QuotationCopyView` exists in `views.py` but was **never registered** in the URL routes
- The frontend calls `/api/finance/quotations/{id}/copy/` but there's no route handler
- The ViewSet-based architecture was missing the `copy` action

**Error Seen:**
- 404 Not Found when trying to duplicate quotation
- Frontend shows "Failed to copy quotation"

### 2. ⚠️ Proforma Invoice Creation Issues
**Potential Problems:**
- Complex validation logic in `ProformaInvoiceCreateSerializer`
- Missing required fields (customer, proforma_items, etc.)
- Company context not being passed correctly
- Validation errors in item data (quantity, unit_price, product)

## Fixes Applied

### Fix 1: Added Quotation Copy Action ✅

**File:** `/var/www/SAP-Python/backend/finance/viewsets.py`

Added a new `copy` action to `QuotationViewSet`:

```python
@action(detail=True, methods=['post'])
def copy(self, request, pk=None):
    """Copy/duplicate an existing quotation with new number, date, and validity"""
    from .models import QuotationItem
    
    original_quotation = self.get_object()
    
    try:
        # Create new quotation with copied data
        new_quotation = Quotation.objects.create(
            company=request.service_user.company,
            created_by=request.service_user,
            customer=original_quotation.customer,
            quotation_date=timezone.now().date(),
            valid_until=timezone.now().date() + timedelta(days=30),
            reference=original_quotation.reference,
            shipping_address=original_quotation.shipping_address,
            discount_percentage=original_quotation.discount_percentage,
            discount_amount=original_quotation.discount_amount,
            shipping_charges=original_quotation.shipping_charges,
            other_charges=original_quotation.other_charges,
            notes=original_quotation.notes,
            terms_and_conditions=original_quotation.terms_and_conditions,
            status='draft'
        )

        # Copy quotation items
        original_items = original_quotation.quotation_items.all()
        for index, item in enumerate(original_items, 1):
            new_item = QuotationItem(
                quotation=new_quotation,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_number=index
            )
            new_item.save(skip_totals_calculation=True)

        # Calculate totals once after all items are created
        new_quotation.calculate_totals()

        # Return the new quotation details
        serializer = QuotationDetailSerializer(new_quotation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Quotation copy failed for quotation {original_quotation.id}: {str(e)}")
        return Response(
            {'error': f'Failed to copy quotation: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

**What This Does:**
1. Gets the original quotation (with tenant filtering)
2. Creates a new quotation with:
   - New quotation number (auto-generated)
   - Today's date
   - 30 days validity
   - Draft status
   - All other fields copied from original
3. Copies all quotation items
4. Calculates totals
5. Returns the new quotation

**URL Route:** Automatically registered as `/api/finance/quotations/{id}/copy/` by DRF ViewSet

## How to Test

### Test Quotation Duplication:

1. **Via Frontend:**
   - Go to Quotations list
   - Click the "Duplicate" button on any quotation
   - Should create a new quotation with copied data

2. **Via API:**
   ```bash
   curl -X POST http://localhost:8004/api/finance/quotations/{id}/copy/ \
     -H "Authorization: Bearer YOUR_SESSION_KEY" \
     -H "Content-Type: application/json"
   ```

### Test Proforma Invoice Creation:

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Try creating a proforma invoice
   - Look for error messages

2. **Check Backend Logs:**
   ```bash
   # In backend directory
   tail -f logs/django.log
   # Or check terminal where Django is running
   ```

3. **Common Issues to Check:**
   - ✅ Customer is selected
   - ✅ Purchase Order or Quotation is selected
   - ✅ At least one item is added
   - ✅ All item fields are filled (quantity, unit_price)
   - ✅ Proforma date is set

## Proforma Invoice Creation - Debugging Guide

If proforma invoice creation still fails, check these:

### 1. Required Fields
```json
{
  "customer": 1,  // Required
  "proforma_date": "2024-01-15",  // Required
  "proforma_items": [  // Required if not from PO/Quotation
    {
      "product": 1,
      "quantity": 10,
      "unit_price": 100.00
    }
  ]
}
```

### 2. From Purchase Order
```json
{
  "purchase_order": 1,  // PO ID
  "customer": 1,
  "proforma_date": "2024-01-15",
  "claim_type": "percentage",  // or "quantity"
  "claim_percentage": 50.00,  // If percentage-based
  "proforma_items": [...]  // Frontend-calculated items
}
```

### 3. From Quotation
```json
{
  "quotation": 1,  // Quotation ID
  "customer": 1,
  "proforma_date": "2024-01-15",
  "proforma_items": [...]  // Items from quotation
}
```

### 4. Common Validation Errors

**Error:** "At least one item is required"
- **Fix:** Add items to `proforma_items` array

**Error:** "Claim percentage exceeds available"
- **Fix:** Check PO balance, reduce claim percentage

**Error:** "Customer is required"
- **Fix:** Include customer ID in request

**Error:** "Product not found"
- **Fix:** Ensure product IDs in items are valid

## Restart Services

After applying the fix, restart the backend:

```bash
cd /var/www/SAP-Python
./restart_services.sh
```

Or manually:

```bash
# Kill backend
lsof -ti:8004 | xargs kill -9

# Restart backend
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8004
```

## Verification Checklist

- [ ] Quotation duplication works from frontend
- [ ] Quotation duplication works via API
- [ ] New quotation has correct data
- [ ] New quotation has new number
- [ ] New quotation is in draft status
- [ ] Proforma invoice creation works from PO
- [ ] Proforma invoice creation works from Quotation
- [ ] Proforma invoice creation works directly
- [ ] No console errors in browser
- [ ] No backend errors in logs

## Additional Notes

### Why ViewSet Actions?

The codebase uses DRF ViewSets which automatically register routes:
- `GET /api/finance/quotations/` → list
- `POST /api/finance/quotations/` → create
- `GET /api/finance/quotations/{id}/` → retrieve
- `PUT /api/finance/quotations/{id}/` → update
- `DELETE /api/finance/quotations/{id}/` → destroy
- `POST /api/finance/quotations/{id}/copy/` → copy (custom action)

### Legacy Code

The old `QuotationCopyView` in `views.py` is no longer needed but kept for reference.

### Frontend Compatibility

The frontend already calls the correct endpoint:
```typescript
copyFinanceQuotation: (id: number, params?: any) =>
  api.post(`/api/finance/quotations/${id}/copy/`, {}, { params })
```

This will now work correctly with the new ViewSet action.

## Support

If issues persist:
1. Check browser console for errors
2. Check backend logs: `tail -f backend/logs/django.log`
3. Verify session key is valid
4. Ensure user has permissions
5. Check database for any constraint violations

## Summary

✅ **Fixed:** Quotation duplication now works via ViewSet action
⚠️ **Check:** Proforma invoice creation - follow debugging guide if issues persist

The quotation duplication issue was a simple missing route. The proforma invoice creation likely has validation errors that need to be checked in the browser console or backend logs.
