# Proforma Invoice Form - Matched with Tax Invoice Form

## Issue
Proforma Invoice creation form was missing fields that exist in Tax Invoice form:
- No Proforma Invoice Number field (should be optional, auto-generated)
- No Shipping Address dropdown
- Generic "Reference" label instead of "Customer PO / Reference"

## Solution
Updated `DirectCreateProformaInvoiceModal.tsx` to match `DirectCreateTaxInvoiceModal.tsx`:

### Added Fields
1. **Proforma Invoice Number** - Optional field, auto-generated if empty
2. **Shipping Address Dropdown** - Shows billing address and all customer shipping addresses
3. **Customer PO / Reference** - More descriptive label

### Changes Made
- Added `proforma_number` to form state
- Added `shipping_address` to form state
- Added `shippingAddresses` state array
- Added `fetchShippingAddresses()` function
- Added `handleCustomerChange()` function to fetch addresses when customer selected
- Updated form layout to include new fields in same order as Tax Invoice

### Backend Support
Both fields already exist in ProformaInvoice model:
- `proforma_number` - CharField
- `shipping_address` - ForeignKey to ShippingAddress

## Result
✅ Proforma Invoice form now matches Tax Invoice form exactly
✅ Users can select shipping addresses
✅ Users can optionally specify proforma number
✅ Better UX consistency across invoice types

## Files Modified
- `/var/www/SAP-Python/frontend/src/pages/services/finance/components/DirectCreateProformaInvoiceModal.tsx`
